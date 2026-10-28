use crate::domain::MigrationStatus;
use crate::storage::{Db, MigrationManager};
use tauri::State;

#[tauri::command]
pub async fn get_migration_status(db: State<'_, Db>) -> Result<MigrationStatus, String> {
    MigrationManager::check_status(Some(&db)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_migration(app: tauri::AppHandle) -> Result<MigrationStatus, String> {
    MigrationManager::run_migration(Some(&app)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn dismiss_migration_prompt(db: State<'_, Db>) -> Result<(), String> {
    db.set_preference("migration_prompt_dismissed", "true")
        .map_err(|e| e.to_string())
}
