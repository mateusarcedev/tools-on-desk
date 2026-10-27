use crate::domain::{DependencyInfo, FirstRunStatus, SystemDiagnostics};
use crate::engines::DependencyManager;
use crate::storage::Db;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_system_diagnostics(db: State<'_, Db>) -> Result<SystemDiagnostics, String> {
    Ok(DependencyManager::get_system_diagnostics(Some(&db)).await)
}

#[tauri::command]
pub async fn get_dependencies_status(db: State<'_, Db>) -> Result<Vec<DependencyInfo>, String> {
    Ok(DependencyManager::check_all_dependencies(Some(&db)).await)
}

#[tauri::command]
pub async fn install_dependency(
    name: String,
    app: AppHandle,
    db: State<'_, Db>,
) -> Result<(), String> {
    let cancel = Arc::new(AtomicBool::new(false));
    match name.as_str() {
        "ffmpeg" | "ffprobe" => {
            DependencyManager::install_ffmpeg(Some(&app), cancel, Some(&db))
                .await
                .map_err(|e| e.to_string())
        }
        "yt-dlp" => {
            DependencyManager::install_or_update_ytdlp(Some(&app), cancel, Some(&db))
                .await
                .map_err(|e| e.to_string())
        }
        _ => Err(format!("Dependência desconhecida para instalação: {}", name)),
    }
}

#[tauri::command]
pub async fn update_dependency(
    name: String,
    app: AppHandle,
    db: State<'_, Db>,
) -> Result<(), String> {
    let cancel = Arc::new(AtomicBool::new(false));
    match name.as_str() {
        "yt-dlp" => {
            DependencyManager::install_or_update_ytdlp(Some(&app), cancel, Some(&db))
                .await
                .map_err(|e| e.to_string())
        }
        "ffmpeg" | "ffprobe" => {
            DependencyManager::install_ffmpeg(Some(&app), cancel, Some(&db))
                .await
                .map_err(|e| e.to_string())
        }
        _ => Err(format!("Atualização não suportada para: {}", name)),
    }
}

#[tauri::command]
pub async fn remove_managed_dependency(name: String) -> Result<(), String> {
    DependencyManager::remove_managed_dependency(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn verify_dependency(name: String, db: State<'_, Db>) -> Result<DependencyInfo, String> {
    match name.as_str() {
        "ffmpeg" => Ok(DependencyManager::inspect_tool(
            "ffmpeg",
            "FFmpeg Multimídia",
            "Conversão, compressão e recorte de áudio e vídeo",
            "audio_video",
        )
        .await),
        "ffprobe" => Ok(DependencyManager::inspect_tool(
            "ffprobe",
            "ffprobe Inspector",
            "Inspeção técnica de metadados, codecs e durações de mídia",
            "audio_video",
        )
        .await),
        "yt-dlp" => Ok(DependencyManager::inspect_tool(
            "yt-dlp",
            "yt-dlp Downloader",
            "Motor de download de fontes permitidas sem quebra de DRM",
            "download",
        )
        .await),
        "libreoffice" => Ok(DependencyManager::inspect_libreoffice(Some(&db)).await),
        _ => Err(format!("Dependência desconhecida: {}", name)),
    }
}

#[tauri::command]
pub async fn set_custom_libreoffice_path(
    path: String,
    db: State<'_, Db>,
) -> Result<(), String> {
    DependencyManager::set_custom_libreoffice_path(&db, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_first_run_status(db: State<'_, Db>) -> Result<FirstRunStatus, String> {
    DependencyManager::get_first_run_status(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn complete_first_run(status: String, db: State<'_, Db>) -> Result<(), String> {
    DependencyManager::set_first_run_status(&db, &status).map_err(|e| e.to_string())
}
