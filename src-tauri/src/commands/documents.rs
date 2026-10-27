use crate::domain::{
    LibreOfficeStatus, PdfCompressOptions, PdfInfo, PdfMergeOptions, PdfOrganizeOptions,
    PdfSplitOptions, PdfToDocxOptions, Task, TaskStatus, WordToPdfOptions,
};
use crate::engines::DocumentEngine;
use crate::tasks::{TaskJob, TaskManager};
use chrono::Local;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn inspect_pdf(path: String) -> Result<PdfInfo, String> {
    DocumentEngine::inspect_pdf(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_libreoffice_status() -> Result<LibreOfficeStatus, String> {
    Ok(DocumentEngine::check_libreoffice())
}

#[tauri::command]
pub async fn start_pdf_merge(
    options: PdfMergeOptions,
    task_manager: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let name = format!("Unir {} PDFs", options.source_paths.len());
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name,
        op: "Unir PDFs".to_string(),
        mod_name: "documents".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: options.source_paths.first().cloned(),
        target_path: Some(options.target_path.clone()),
        options_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        error: None,
        size_mb: None,
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_manager
        .enqueue_task(task, TaskJob::PdfMerge(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_pdf_split(
    options: PdfSplitOptions,
    task_manager: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let source_name = Path::new(&options.source_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let name = format!("Dividir: {}", source_name);
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name,
        op: "Dividir PDF".to_string(),
        mod_name: "documents".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.source_path.clone()),
        target_path: Some(options.target_dir.clone()),
        options_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        error: None,
        size_mb: None,
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_manager
        .enqueue_task(task, TaskJob::PdfSplit(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_pdf_organize(
    options: PdfOrganizeOptions,
    task_manager: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let source_name = Path::new(&options.source_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let name = format!("Organizar páginas: {}", source_name);
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name,
        op: "Organizar páginas".to_string(),
        mod_name: "documents".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.source_path.clone()),
        target_path: Some(options.target_path.clone()),
        options_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        error: None,
        size_mb: None,
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_manager
        .enqueue_task(task, TaskJob::PdfOrganize(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_pdf_compress(
    options: PdfCompressOptions,
    task_manager: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let source_name = Path::new(&options.source_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let name = format!("Comprimir: {}", source_name);
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name,
        op: "Comprimir PDF".to_string(),
        mod_name: "documents".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.source_path.clone()),
        target_path: Some(options.target_path.clone()),
        options_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        error: None,
        size_mb: None,
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_manager
        .enqueue_task(task, TaskJob::PdfCompress(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_word_to_pdf(
    options: WordToPdfOptions,
    task_manager: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let source_name = Path::new(&options.source_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let name = format!("Word → PDF: {}", source_name);
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name,
        op: "Word para PDF".to_string(),
        mod_name: "documents".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.source_path.clone()),
        target_path: options.target_path.clone(),
        options_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        error: None,
        size_mb: None,
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_manager
        .enqueue_task(task, TaskJob::WordToPdf(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub async fn start_pdf_to_docx(
    options: PdfToDocxOptions,
    task_manager: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let source_name = Path::new(&options.source_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();
    let name = format!("PDF → Word: {}", source_name);
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name,
        op: "PDF para Word".to_string(),
        mod_name: "documents".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.source_path.clone()),
        target_path: options.target_path.clone(),
        options_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        error: None,
        size_mb: None,
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_manager
        .enqueue_task(task, TaskJob::PdfToDocx(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}
