//! Windows-specific platform support module.
//! Integrates with Windows 11 MSVC toolchain, WebView2, Windows DPAPI, and NSIS packaging.

use std::path::{Path, PathBuf};

pub struct WindowsPlatform;

impl WindowsPlatform {
    /// Discovers known WinGet package and links directories in %LOCALAPPDATA%
    pub fn get_winget_dirs() -> Vec<PathBuf> {
        let mut dirs = Vec::new();
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            let p = Path::new(&local).join("Microsoft").join("WinGet");
            dirs.push(p.join("Links"));
            dirs.push(p.join("Packages"));
        }
        dirs
    }

    /// Discovers standard Windows Program Files directories for tools like LibreOffice
    pub fn get_program_files_dirs() -> Vec<PathBuf> {
        let mut dirs = Vec::new();
        if let Ok(pf) = std::env::var("ProgramFiles") {
            dirs.push(PathBuf::from(pf));
        }
        if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
            dirs.push(PathBuf::from(pf86));
        }
        dirs
    }
}
