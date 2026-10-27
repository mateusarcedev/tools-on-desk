use crate::domain::{AudioConvertOptions, AudioTrimOptions, MediaInfo, Task, TaskStatus};
use crate::engines::MediaEngine;
use crate::tasks::{TaskJob, TaskManager};
use chrono::Local;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn probe_media(file_path: String) -> Result<MediaInfo, String> {
    MediaEngine::probe(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_audio_convert(
    options: AudioConvertOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("áudio")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Converter para {}", options.format.to_uppercase()),
        mod_name: "audio".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.input_path.clone()),
        target_path: None,
        options_json,
        error: None,
        size_mb,
        speed: None,
        created_at: Local::now().format("%d %b, %H:%M").to_string(),
        finished_at: None,
    };

    task_mgr
        .submit_task(task, TaskJob::AudioConvert(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_audio_trim(
    options: AudioTrimOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("áudio")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Corte ({:.1}s - {:.1}s)", options.start_seconds, options.end_seconds),
        mod_name: "audio".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.input_path.clone()),
        target_path: None,
        options_json,
        error: None,
        size_mb,
        speed: None,
        created_at: Local::now().format("%d %b, %H:%M").to_string(),
        finished_at: None,
    };

    task_mgr
        .submit_task(task, TaskJob::AudioTrim(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}
