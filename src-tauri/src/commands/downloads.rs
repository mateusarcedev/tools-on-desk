use crate::domain::{DownloadOptions, MediaDownloadInfo, Task, TaskStatus, YtDlpStatus};
use crate::engines::DownloadEngine;
use crate::tasks::{TaskJob, TaskManager};
use chrono::Local;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_ytdlp_status() -> Result<YtDlpStatus, String> {
    DownloadEngine::get_ytdlp_status()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_download_info(url: String) -> Result<MediaDownloadInfo, String> {
    DownloadEngine::fetch_info(&url)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_download(
    options: DownloadOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();

    let op_label = if options.audio_only {
        format!("Download Áudio ({})", options.audio_format.as_deref().unwrap_or("MP3"))
    } else {
        format!("Download Vídeo ({})", options.quality.as_deref().unwrap_or("Melhor"))
    };

    let options_json = serde_json::to_string(&options).ok();

    let task = Task {
        id: task_id.clone(),
        name: options.url.clone(),
        op: op_label,
        mod_name: "downloads".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.url.clone()),
        target_path: options.output_dir.clone(),
        options_json,
        error: None,
        size_mb: None,
        speed: None,
        created_at: Local::now().format("%d %b, %H:%M").to_string(),
        finished_at: None,
    };

    task_mgr
        .submit_task(task, TaskJob::DownloadMedia(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}
