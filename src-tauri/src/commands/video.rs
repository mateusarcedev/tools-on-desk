use crate::domain::{
    Task, TaskStatus, VideoCompressOptions, VideoConvertOptions, VideoExtractAudioOptions,
    VideoExtractFrameOptions, VideoTrimOptions,
};
use crate::tasks::{TaskJob, TaskManager};
use chrono::Local;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn start_video_convert(
    options: VideoConvertOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vídeo")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Converter para {}", options.format.to_uppercase()),
        mod_name: "video".to_string(),
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
        .submit_task(task, TaskJob::VideoConvert(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_video_compress(
    options: VideoCompressOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vídeo")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let preset_label = match options.preset.as_str() {
        "high" => "Qualidade alta",
        "balanced" => "Equilibrado",
        "small" => "Arquivo menor",
        _ => "Personalizado",
    };

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Comprimir ({})", preset_label),
        mod_name: "video".to_string(),
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
        .submit_task(task, TaskJob::VideoCompress(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_video_trim(
    options: VideoTrimOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vídeo")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let mode_str = if options.fast_copy { "Rápido" } else { "Preciso" };

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Corte {} ({:.1}s - {:.1}s)", mode_str, options.start_seconds, options.end_seconds),
        mod_name: "video".to_string(),
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
        .submit_task(task, TaskJob::VideoTrim(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_video_extract_audio(
    options: VideoExtractAudioOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vídeo")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Extrair áudio ({})", options.format.to_uppercase()),
        mod_name: "video".to_string(),
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
        .submit_task(task, TaskJob::VideoExtractAudio(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_video_extract_frame(
    options: VideoExtractFrameOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let file_name = Path::new(&options.input_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vídeo")
        .to_string();

    let size_mb = std::fs::metadata(&options.input_path)
        .map(|m| (m.len() as f64) / (1024.0 * 1024.0))
        .ok();

    let options_json = serde_json::to_string(&options).ok();

    let task = Task {
        id: task_id.clone(),
        name: file_name,
        op: format!("Extrair frame ({:.1}s)", options.timestamp_seconds),
        mod_name: "video".to_string(),
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
        .submit_task(task, TaskJob::VideoExtractFrame(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}
