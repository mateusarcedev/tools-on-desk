use crate::error::{AppError, AppResult};
use std::env;
use std::fs;
use std::path::PathBuf;

/// Centralized path resolution layer for ToolsOnDesk.
/// Guarantees that no persistent paths are hardcoded as loose strings across modules.
#[derive(Debug, Clone)]
pub struct PathManager;

impl PathManager {
    /// Returns the root ToolsOnDesk application data directory.
    /// Windows: %LOCALAPPDATA%\ToolsOnDesk
    /// Linux/macOS/fallback: ~/.local/share/toolsondesk or ./data
    pub fn app_root_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            if let Ok(local) = env::var("LOCALAPPDATA") {
                return PathBuf::from(local).join("ToolsOnDesk");
            }
            if let Ok(user_profile) = env::var("USERPROFILE") {
                return PathBuf::from(user_profile)
                    .join("AppData")
                    .join("Local")
                    .join("ToolsOnDesk");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("toolsondesk");
            }
        }

        // Universal fallback
        PathBuf::from("data").join("toolsondesk")
    }

    /// Subdirectory for SQLite database files
    pub fn database_dir() -> PathBuf {
        Self::app_root_dir().join("database")
    }

    /// Path to the primary SQLite database
    pub fn database_file() -> PathBuf {
        Self::database_dir().join("toolsondesk.db")
    }

    /// Subdirectory for application-managed external binaries (FFmpeg, ffprobe, yt-dlp)
    pub fn binaries_dir() -> PathBuf {
        Self::app_root_dir().join("binaries")
    }

    /// Subdirectory for sandboxed workspace execution (OpenCode, temporary processing)
    pub fn workspace_dir() -> PathBuf {
        Self::app_root_dir().join("workspace")
    }

    /// Subdirectory for creative projects data
    pub fn projects_dir() -> PathBuf {
        Self::app_root_dir().join("projects")
    }

    /// Subdirectory for creative assets
    pub fn assets_dir() -> PathBuf {
        Self::app_root_dir().join("assets")
    }

    /// Subdirectory for secure credentials vault
    pub fn vault_dir() -> PathBuf {
        Self::app_root_dir().join("vault")
    }

    /// Path to the DPAPI encrypted vault file
    pub fn vault_file() -> PathBuf {
        Self::vault_dir().join(".vault_dpapi.enc")
    }

    /// Subdirectory for creative skills and extensions
    pub fn skills_dir() -> PathBuf {
        Self::app_root_dir().join("skills")
    }

    /// Subdirectory for system and migration backups
    pub fn backups_dir() -> PathBuf {
        Self::app_root_dir().join("backups")
    }

    /// Subdirectory for temporary caches
    pub fn cache_dir() -> PathBuf {
        Self::app_root_dir().join("cache")
    }

    /// Subdirectory for persistent logs
    pub fn logs_dir() -> PathBuf {
        Self::app_root_dir().join("logs")
    }

    /// Ensures that all required application directories exist on disk
    pub fn ensure_all_dirs() -> AppResult<()> {
        let dirs = [
            Self::app_root_dir(),
            Self::database_dir(),
            Self::binaries_dir(),
            Self::workspace_dir(),
            Self::projects_dir(),
            Self::assets_dir(),
            Self::vault_dir(),
            Self::skills_dir(),
            Self::backups_dir(),
            Self::cache_dir(),
            Self::logs_dir(),
        ];

        for dir in &dirs {
            fs::create_dir_all(dir).map_err(|e| {
                AppError::Io(std::io::Error::new(
                    e.kind(),
                    format!("Falha ao criar diretório {:?}: {}", dir, e),
                ))
            })?;
        }

        Ok(())
    }

    // =========================================================================
    // Legacy Paths Discovery (Arce Tools)
    // =========================================================================

    /// Legacy Tauri 2 app_data_dir for com.mateusarcedev.arce-tools
    pub fn legacy_app_data_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            if let Ok(local) = env::var("LOCALAPPDATA") {
                return PathBuf::from(local).join("com.mateusarcedev.arce-tools");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("com.mateusarcedev.arce-tools");
            }
        }

        PathBuf::from("data")
    }

    /// Legacy managed root directory (%LOCALAPPDATA%\ArceTools)
    pub fn legacy_arce_tools_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            if let Ok(local) = env::var("LOCALAPPDATA") {
                return PathBuf::from(local).join("ArceTools");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("arce-tools");
            }
        }

        PathBuf::from("data")
    }

    /// Legacy SQLite database path
    pub fn legacy_database_file() -> PathBuf {
        Self::legacy_app_data_dir().join("arce_tools.db")
    }

    /// Legacy vault credentials file
    pub fn legacy_vault_file() -> PathBuf {
        Self::legacy_app_data_dir().join(".vault_keys.enc")
    }

    /// Legacy managed binaries folder
    pub fn legacy_binaries_dir() -> PathBuf {
        Self::legacy_arce_tools_dir().join("binaries")
    }

    /// Legacy workspace folder
    pub fn legacy_workspace_dir() -> PathBuf {
        Self::legacy_arce_tools_dir().join("workspace")
    }

    /// Checks if any legacy Arce Tools data exists on the current machine
    pub fn has_legacy_data() -> bool {
        Self::legacy_database_file().exists()
            || Self::legacy_vault_file().exists()
            || Self::legacy_binaries_dir().exists()
            || Self::legacy_workspace_dir().exists()
    }

    // =========================================================================
    // User Folders Resolution (No Personal Names Hardcoded)
    // =========================================================================

    /// Resolves the default download folder for ToolsOnDesk
    pub fn default_download_folder(app: &tauri::AppHandle) -> PathBuf {
        use tauri::Manager;
        let base = app.path().download_dir().unwrap_or_else(|_| {
            #[cfg(target_os = "windows")]
            {
                if let Ok(user_profile) = env::var("USERPROFILE") {
                    return PathBuf::from(user_profile).join("Downloads");
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                if let Ok(home) = env::var("HOME") {
                    return PathBuf::from(home).join("Downloads");
                }
            }
            PathBuf::from("Downloads")
        });

        base.join("ToolsOnDesk")
    }

    /// Resolves the default export folder for ToolsOnDesk
    pub fn default_export_folder(app: &tauri::AppHandle) -> PathBuf {
        use tauri::Manager;
        let base = app.path().document_dir().unwrap_or_else(|_| {
            #[cfg(target_os = "windows")]
            {
                if let Ok(user_profile) = env::var("USERPROFILE") {
                    return PathBuf::from(user_profile).join("Documents");
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                if let Ok(home) = env::var("HOME") {
                    return PathBuf::from(home).join("Documents");
                }
            }
            PathBuf::from("Documents")
        });

        base.join("ToolsOnDesk").join("Exportados")
    }
}
