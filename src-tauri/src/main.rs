// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("Panic no Arce Tools: {}\n", info);
        eprintln!("{}", msg);
        if let Ok(temp) = std::env::var("TEMP") {
            let log_path = std::path::Path::new(&temp).join("arce_tools_panic.log");
            let _ = std::fs::write(log_path, &msg);
        }
    }));

    arce_tools_lib::run()
}
