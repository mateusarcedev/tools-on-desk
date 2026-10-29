use crate::error::{AppError, AppResult};
use std::env;
use std::fs;
use std::path::PathBuf;

/// Centralized cross-platform path resolution layer for ToolsOnDesk.
/// Adheres strictly to OS conventions:
/// - Windows: %LOCALAPPDATA%\ToolsOnDesk
/// - Linux: XDG Base Directory specification ($XDG_DATA_HOME, $XDG_CONFIG_HOME, $XDG_CACHE_HOME)
/// - macOS: ~/Library/Application Support/ToolsOnDesk, ~/Library/Caches/ToolsOnDesk
#[derive(Debug, Clone)]
pub struct PathManager;

impl PathManager {
    /// Returns the primary application data root directory.
    /// - Windows: %LOCALAPPDATA%\ToolsOnDesk (or %USERPROFILE%\AppData\Local\ToolsOnDesk)
    /// - Linux: $XDG_DATA_HOME/ToolsOnDesk (or ~/.local/share/ToolsOnDesk)
    /// - macOS: ~/Library/Application Support/ToolsOnDesk
    /// - Universal Fallback: ./data/toolsondesk
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

        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home)
                    .join("Library")
                    .join("Application Support")
                    .join("ToolsOnDesk");
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Ok(xdg_data) = env::var("XDG_DATA_HOME") {
                if !xdg_data.trim().is_empty() {
                    return PathBuf::from(xdg_data).join("ToolsOnDesk");
                }
            }
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("ToolsOnDesk");
            }
        }

        // Generic unix/fallback
        if let Ok(home) = env::var("HOME") {
            return PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("ToolsOnDesk");
        }

        PathBuf::from("data").join("toolsondesk")
    }

    /// Configuration directory.
    /// - Windows: %LOCALAPPDATA%\ToolsOnDesk (or app_root_dir)
    /// - Linux: $XDG_CONFIG_HOME/ToolsOnDesk (or ~/.config/ToolsOnDesk)
    /// - macOS: ~/Library/Application Support/ToolsOnDesk
    pub fn config_dir() -> PathBuf {
        #[cfg(target_os = "linux")]
        {
            if let Ok(xdg_config) = env::var("XDG_CONFIG_HOME") {
                if !xdg_config.trim().is_empty() {
                    return PathBuf::from(xdg_config).join("ToolsOnDesk");
                }
            }
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home).join(".config").join("ToolsOnDesk");
            }
        }

        Self::app_root_dir()
    }

    /// Cache directory.
    /// - Windows: %LOCALAPPDATA%\ToolsOnDesk\cache
    /// - Linux: $XDG_CACHE_HOME/ToolsOnDesk (or ~/.cache/ToolsOnDesk)
    /// - macOS: ~/Library/Caches/ToolsOnDesk
    pub fn cache_dir() -> PathBuf {
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home).join("Library").join("Caches").join("ToolsOnDesk");
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Ok(xdg_cache) = env::var("XDG_CACHE_HOME") {
                if !xdg_cache.trim().is_empty() {
                    return PathBuf::from(xdg_cache).join("ToolsOnDesk");
                }
            }
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home).join(".cache").join("ToolsOnDesk");
            }
        }

        Self::app_root_dir().join("cache")
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

    /// Path to the credentials vault file
    pub fn vault_file() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            Self::vault_dir().join(".vault_dpapi.enc")
        }
        #[cfg(not(target_os = "windows"))]
        {
            Self::vault_dir().join(".vault_secure.enc")
        }
    }

    /// Subdirectory for creative skills and extensions
    pub fn skills_dir() -> PathBuf {
        Self::app_root_dir().join("skills")
    }

    /// Subdirectory for system and migration backups
    pub fn backups_dir() -> PathBuf {
        Self::app_root_dir().join("backups")
    }

    /// Subdirectory for persistent logs
    pub fn logs_dir() -> PathBuf {
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = env::var("HOME") {
                return PathBuf::from(home).join("Library").join("Logs").join("ToolsOnDesk");
            }
        }

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
    // Legacy Paths Discovery (Windows Historical Migration from Arce Tools)
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

    /// Checks if any legacy Arce Tools data exists on the current machine.
    /// Strictly restricted to scenarios where legacy data actually exists.
    pub fn has_legacy_data() -> bool {
        #[cfg(target_os = "windows")]
        {
            Self::legacy_database_file().exists()
                || Self::legacy_vault_file().exists()
                || Self::legacy_binaries_dir().exists()
                || Self::legacy_workspace_dir().exists()
        }
        #[cfg(not(target_os = "windows"))]
        {
            // Historical migration is only relevant on Windows where Arce Tools was distributed
            false
        }
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
