#![allow(dead_code, clippy::collapsible_if, clippy::should_implement_trait, clippy::large_enum_variant)]

pub mod commands;
pub mod domain;
pub mod engines;
pub mod error;
pub mod storage;
pub mod tasks;
pub mod utils;

#[cfg(test)]
mod tests;

use storage::Db;
use tauri::Manager;
use tasks::TaskManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Ensure all ToolsOnDesk directories exist
            let _ = crate::utils::PathManager::ensure_all_dirs();
            let db_path = crate::utils::PathManager::database_file();

            // Automatic seamless migration if legacy data exists and target DB is not yet created
            if crate::utils::PathManager::has_legacy_data() && !db_path.exists() {
                let _ = crate::storage::MigrationManager::run_migration(Some(app.handle()));
            }

            let db = Db::new(&db_path).expect("Falha ao inicializar o banco de dados SQLite do ToolsOnDesk");
            let mut task_mgr = TaskManager::new(db.clone(), Some(app.handle().clone()));
            task_mgr.set_app_handle(app.handle().clone());

            app.manage(db);
            app.manage(task_mgr);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::cancel_task,
            commands::retry_task,
            commands::remove_task,
            commands::clear_completed_tasks,
            commands::get_history,
            commands::clear_history,
            commands::calculate_poster_spec,
            commands::render_poster_preview,
            commands::start_poster_task,
            commands::start_image_conversion_task,
            commands::start_images_to_pdf_task,
            commands::get_system_info,
            commands::open_path_in_explorer,
            commands::get_preference,
            commands::set_preference,
            commands::probe_media,
            commands::start_audio_convert,
            commands::start_audio_trim,
            commands::start_video_convert,
            commands::start_video_compress,
            commands::start_video_trim,
            commands::start_video_extract_audio,
            commands::start_video_extract_frame,
            commands::get_ytdlp_status,
            commands::fetch_download_info,
            commands::start_download,
            commands::check_external_tools,
            commands::inspect_pdf,
            commands::check_libreoffice_status,
            commands::start_pdf_merge,
            commands::start_pdf_split,
            commands::start_pdf_organize,
            commands::start_pdf_compress,
            commands::start_word_to_pdf,
            commands::start_pdf_to_docx,
            commands::get_error_logs,
            commands::get_all_error_logs_for_export,
            commands::get_error_stats,
            commands::get_error_log_by_id,
            commands::get_error_log_by_task_id,
            commands::resolve_error_log,
            commands::clear_error_logs,
            commands::log_frontend_error,
            commands::copy_to_clipboard,
            commands::get_system_diagnostics,
            commands::get_dependencies_status,
            commands::install_dependency,
            commands::update_dependency,
            commands::remove_managed_dependency,
            commands::verify_dependency,
            commands::set_custom_libreoffice_path,
            commands::get_first_run_status,
            commands::complete_first_run,
            commands::save_nvidia_key,
            commands::get_nvidia_key_status,
            commands::validate_nvidia_key,
            commands::list_nvidia_models,
            commands::generate_ai_image,
            commands::generate_ai_video,
            commands::generate_creative_plan,
            commands::get_creative_skills,
            commands::get_creative_skill_by_id,
            commands::toggle_creative_skill,
            commands::get_opencode_status,
            commands::create_creative_project,
            commands::get_creative_project,
            commands::list_creative_projects,
            commands::update_creative_project,
            commands::delete_creative_project,
            commands::list_creative_assets,
            commands::import_creative_asset,
            commands::delete_creative_asset,
            commands::render_motion_project,
            commands::export_remotion_project,
            commands::list_creative_templates,
            commands::get_migration_status,
            commands::run_migration,
            commands::dismiss_migration_prompt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
