use crate::domain::Task;
use crate::storage::Db;
use crate::tasks::TaskManager;
use tauri::State;

#[tauri::command]
pub async fn get_tasks(db: State<'_, Db>) -> Result<Vec<Task>, String> {
    db.list_tasks().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_task(id: String, task_mgr: State<'_, TaskManager>) -> Result<(), String> {
    task_mgr.cancel_task(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn retry_task(id: String, task_mgr: State<'_, TaskManager>) -> Result<(), String> {
    task_mgr.retry_task(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_task(id: String, db: State<'_, Db>) -> Result<(), String> {
    db.remove_task(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_completed_tasks(db: State<'_, Db>) -> Result<(), String> {
    db.clear_completed_tasks().map_err(|e| e.to_string())
}
