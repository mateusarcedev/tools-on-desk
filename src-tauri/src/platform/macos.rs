//! macOS-specific platform support module.
//! Integrates with Apple Silicon (arm64) and Intel (x86_64), WKWebView, Apple Keychain, and Homebrew search paths.

use std::path::PathBuf;

pub struct MacOSPlatform;

impl MacOSPlatform {
    /// Returns the standard binary locations on macOS (Homebrew Apple Silicon, Homebrew Intel, MacPorts, System).
    pub fn get_system_binary_dirs() -> Vec<PathBuf> {
        vec![
            PathBuf::from("/opt/homebrew/bin"),  // Apple Silicon Homebrew
            PathBuf::from("/usr/local/bin"),     // Intel Homebrew / MacPorts
            PathBuf::from("/opt/local/bin"),     // MacPorts alternative
            PathBuf::from("/usr/bin"),
            PathBuf::from("/bin"),
        ]
    }

    /// Known LibreOffice application bundle locations on macOS.
    pub fn get_libreoffice_candidates() -> Vec<PathBuf> {
        vec![
            PathBuf::from("/Applications/LibreOffice.app/Contents/MacOS/soffice"),
            PathBuf::from("/opt/homebrew/bin/soffice"),
            PathBuf::from("/usr/local/bin/soffice"),
        ]
    }

    /// Checks if running on Apple Silicon architecture.
    pub fn is_apple_silicon() -> bool {
        cfg!(target_arch = "aarch64")
    }
}
