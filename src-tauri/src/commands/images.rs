use crate::domain::{ImageConvertOptions, ImagesToPdfOptions, Task, TaskStatus};
use crate::tasks::{TaskJob, TaskManager};
use chrono::Local;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn start_image_conversion_task(
    options: ImageConvertOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let count = options.files.len();

    let task_name = if count == 1 {
        std::path::Path::new(&options.files[0])
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("imagem")
            .to_string()
    } else {
        format!("{} imagens", count)
    };

    let op = format!("Converter → {} · {}%", options.format, options.quality);
    let options_json = serde_json::to_string(&options).unwrap_or_default();
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name: task_name,
        op,
        mod_name: "images".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: options.files.first().cloned(),
        target_path: Some(options.output_folder.clone()),
        options_json: Some(options_json),
        error: None,
        size_mb: Some(count as f64 * 0.8),
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_mgr
        .submit_task(task, TaskJob::ConvertImages(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_images_to_pdf_task(
    options: ImagesToPdfOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let count = options.files.len();

    let task_name = std::path::Path::new(&options.output_pdf)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("imagens.pdf")
        .to_string();

    let op = format!("Imagens → PDF · {} páginas · {}", count, options.page_size);
    let options_json = serde_json::to_string(&options).unwrap_or_default();
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name: task_name,
        op,
        mod_name: "images".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: options.files.first().cloned(),
        target_path: Some(options.output_pdf.clone()),
        options_json: Some(options_json),
        error: None,
        size_mb: Some(count as f64 * 0.5),
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_mgr
        .submit_task(task, TaskJob::ImagesToPdf(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}
