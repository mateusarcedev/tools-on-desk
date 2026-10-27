use crate::domain::HistoryEntry;
use crate::storage::Db;
use tauri::State;

#[tauri::command]
pub async fn get_history(db: State<'_, Db>) -> Result<Vec<HistoryEntry>, String> {
    db.list_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_history(db: State<'_, Db>) -> Result<(), String> {
    db.clear_history().map_err(|e| e.to_string())
}
