use crate::engines::{ExternalToolManager, ExternalToolsStatus};
use crate::storage::Db;
use serde::Serialize;
use std::path::Path;
use tauri::State;
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os: String,
    pub default_download_folder: String,
    pub default_export_folder: String,
}

#[tauri::command]
pub async fn check_external_tools() -> Result<ExternalToolsStatus, String> {
    Ok(ExternalToolManager::check_all_tools().await)
}

#[tauri::command]
pub async fn get_system_info(app: tauri::AppHandle) -> Result<SystemInfo, String> {
    let download_dir = crate::utils::PathManager::default_download_folder(&app);
    let doc_dir = crate::utils::PathManager::default_export_folder(&app);

    let _ = std::fs::create_dir_all(&download_dir);
    let _ = std::fs::create_dir_all(&doc_dir);

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        default_download_folder: download_dir.to_string_lossy().to_string(),
        default_export_folder: doc_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn open_path_in_explorer(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        if let Some(parent) = p.parent() {
            if parent.exists() {
                let _ = app.opener().open_path(parent.to_str().unwrap_or(""), None::<&str>);
                return Ok(());
            }
        }
        return Err(format!("Caminho não encontrado: {}", path));
    }

    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_preference(key: String, db: State<'_, Db>) -> Result<Option<String>, String> {
    db.get_preference(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_preference(key: String, value: String, db: State<'_, Db>) -> Result<(), String> {
    db.set_preference(&key, &value).map_err(|e| e.to_string())
}
