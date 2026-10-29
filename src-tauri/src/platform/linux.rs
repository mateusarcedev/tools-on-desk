//! Linux-specific platform support module.
//! Integrates with WebKitGTK 4.1, XDG Base Directory specification, FreeDesktop Secret Service, and system package locations.

use std::path::PathBuf;

pub struct LinuxPlatform;

impl LinuxPlatform {
    /// Returns the standard system binary search paths for Linux distributions.
    pub fn get_system_binary_dirs() -> Vec<PathBuf> {
        vec![
            PathBuf::from("/usr/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/bin"),
            PathBuf::from("/opt/bin"),
            PathBuf::from("/snap/bin"),
            PathBuf::from("/var/lib/flatpak/exports/bin"),
        ]
    }

    /// Standard known LibreOffice binary locations on Linux (Debian, Ubuntu, Fedora, Arch, Flatpak, Snap).
    pub fn get_libreoffice_candidates() -> Vec<PathBuf> {
        vec![
            PathBuf::from("/usr/bin/soffice"),
            PathBuf::from("/usr/bin/libreoffice"),
            PathBuf::from("/usr/local/bin/soffice"),
            PathBuf::from("/usr/local/bin/libreoffice"),
            PathBuf::from("/snap/bin/libreoffice"),
            PathBuf::from("/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice"),
        ]
    }

    /// Checks if a Wayland display server session is active.
    pub fn is_wayland() -> bool {
        std::env::var("WAYLAND_DISPLAY").is_ok()
            || std::env::var("XDG_SESSION_TYPE")
                .map(|v| v.eq_ignore_ascii_case("wayland"))
                .unwrap_or(false)
    }

    /// Checks if an X11 display server session is active.
    pub fn is_x11() -> bool {
        std::env::var("DISPLAY").is_ok()
    }
}
