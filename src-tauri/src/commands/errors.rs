use crate::domain::{CreateErrorLogPayload, ErrorLogEntry, ErrorLogFilter, ErrorLogStats};
use crate::storage::Db;
use crate::utils::clipboard::copy_text_to_system_clipboard;
use chrono::Utc;
use tauri::{Emitter, State};
use uuid::Uuid;

#[tauri::command]
pub async fn get_error_logs(
    filter: ErrorLogFilter,
    db: State<'_, Db>,
) -> Result<Vec<ErrorLogEntry>, String> {
    db.get_error_logs(&filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_error_logs_for_export(
    filter: Option<ErrorLogFilter>,
    db: State<'_, Db>,
) -> Result<Vec<ErrorLogEntry>, String> {
    db.get_all_error_logs_for_export(filter.as_ref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_error_stats(db: State<'_, Db>) -> Result<ErrorLogStats, String> {
    db.get_error_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_error_log_by_id(
    id: String,
    db: State<'_, Db>,
) -> Result<Option<ErrorLogEntry>, String> {
    db.get_error_log_by_id(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_error_log_by_task_id(
    task_id: String,
    db: State<'_, Db>,
) -> Result<Option<ErrorLogEntry>, String> {
    db.get_error_log_by_task_id(&task_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resolve_error_log(
    id: String,
    resolved: bool,
    db: State<'_, Db>,
) -> Result<(), String> {
    db.resolve_error_log(&id, resolved)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_error_logs(
    retention_days: Option<i64>,
    db: State<'_, Db>,
) -> Result<usize, String> {
    db.clear_error_logs(retention_days)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn log_frontend_error(
    payload: CreateErrorLogPayload,
    db: State<'_, Db>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let error_id = format!("ERR-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let entry = ErrorLogEntry {
        id: error_id.clone(),
        created_at: Utc::now().to_rfc3339(),
        severity: payload.severity.unwrap_or_else(|| "ERROR".to_string()),
        source: payload.source.unwrap_or_else(|| "FRONTEND".to_string()),
        module: payload.module,
        operation: payload.operation,
        task_id: payload.task_id,
        error_code: payload.error_code,
        user_message: payload.user_message,
        technical_details: payload.technical_details,
        sanitized_stack: payload.sanitized_stack,
        status: "UNRESOLVED".to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        resolved_at: None,
    };

    db.insert_error_log(&entry).map_err(|e| e.to_string())?;

    let _ = app_handle.emit("error-log-created", &entry);

    Ok(error_id)
}

#[tauri::command]
pub async fn copy_to_clipboard(text: String) -> Result<(), String> {
    copy_text_to_system_clipboard(&text).map_err(|e| e.to_string())
}
