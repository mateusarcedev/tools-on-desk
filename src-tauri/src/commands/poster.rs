use crate::domain::{PosterOptions, PosterSpec, Task, TaskStatus};
use crate::engines::PosterEngine;
use crate::tasks::{TaskJob, TaskManager};
use chrono::Local;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn calculate_poster_spec(options: PosterOptions) -> Result<PosterSpec, String> {
    PosterEngine::calculate_spec(&options).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_poster_task(
    options: PosterOptions,
    task_mgr: State<'_, TaskManager>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let spec = PosterEngine::calculate_spec(&options).map_err(|e| e.to_string())?;

    let file_stem = std::path::Path::new(&options.source_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("poster");

    let task_name = format!("poster_{}_{}x{}.pdf", file_stem, spec.cols, spec.rows);
    let op = format!(
        "Poster Studio · {} páginas {} · {}",
        spec.pages, options.paper, options.effect
    );

    let options_json = serde_json::to_string(&options).unwrap_or_default();
    let now = Local::now().format("%d %b, %H:%M").to_string();

    let task = Task {
        id: task_id.clone(),
        name: task_name,
        op,
        mod_name: "posters".to_string(),
        status: TaskStatus::Waiting,
        progress: 0.0,
        source_path: Some(options.source_path.clone()),
        target_path: Some(options.target_pdf.clone()),
        options_json: Some(options_json),
        error: None,
        size_mb: Some((spec.pages as f64 * 1.5).max(0.5)),
        speed: None,
        created_at: now,
        finished_at: None,
    };

    task_mgr
        .submit_task(task, TaskJob::Poster(options))
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}
