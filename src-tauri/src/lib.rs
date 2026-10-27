pub mod commands;
pub mod domain;
pub mod engines;
pub mod error;
pub mod storage;
pub mod tasks;

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
            // Determine database directory
            let app_data = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."))
                    .join("data")
            });

            let _ = std::fs::create_dir_all(&app_data);
            let db_path = app_data.join("arce_tools.db");

            let db = Db::new(&db_path).expect("Falha ao inicializar o banco de dados SQLite");
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
            commands::start_poster_task,
            commands::start_image_conversion_task,
            commands::start_images_to_pdf_task,
            commands::get_system_info,
            commands::open_path_in_explorer,
            commands::get_preference,
            commands::set_preference,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
