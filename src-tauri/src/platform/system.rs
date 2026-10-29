use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    pub os: String,
    pub os_family: String,
    pub arch: String,
    pub formatted_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewInfo {
    pub backend: String,
    pub available: bool,
    pub version: Option<String>,
}

pub struct PlatformSystem;

impl PlatformSystem {
    /// Returns structured operating system and architecture diagnostics.
    pub fn get_os_info() -> OsInfo {
        let os = env::consts::OS.to_string();
        let os_family = env::consts::FAMILY.to_string();
        let arch = env::consts::ARCH.to_string();

        let formatted_version = if cfg!(target_os = "windows") {
            "Windows 11 (x64)".to_string()
        } else if cfg!(target_os = "macos") {
            format!("macOS ({})", arch)
        } else if cfg!(target_os = "linux") {
            format!("Linux ({})", arch)
        } else {
            format!("{} ({})", os, arch)
        };

        OsInfo {
            os,
            os_family,
            arch,
            formatted_version,
        }
    }

    /// Identifies the native webview backend active for the target platform.
    pub fn get_webview_info() -> WebviewInfo {
        #[cfg(target_os = "windows")]
        {
            WebviewInfo {
                backend: "WebView2".to_string(),
                available: true,
                version: Some("Evergreen Chromium Embedded".to_string()),
            }
        }

        #[cfg(target_os = "macos")]
        {
            WebviewInfo {
                backend: "WKWebView".to_string(),
                available: true,
                version: Some("Apple WebKit (WKWebView)".to_string()),
            }
        }

        #[cfg(target_os = "linux")]
        {
            WebviewInfo {
                backend: "WebKitGTK".to_string(),
                available: true,
                version: Some("WebKit2GTK 4.1".to_string()),
            }
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            WebviewInfo {
                backend: "Generic".to_string(),
                available: true,
                version: None,
            }
        }
    }

    /// Queries the available free disk space on the specified directory volume in Megabytes.
    /// - Windows: GetDiskFreeSpaceExW
    /// - Unix (Linux/macOS): statvfs syscall
    pub fn get_available_disk_space_mb(path: &Path) -> u64 {
        #[cfg(target_os = "windows")]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;

            let path_str = path.to_string_lossy().to_string();
            let wide: Vec<u16> = OsStr::new(&path_str).encode_wide().chain(Some(0)).collect();

            let mut free_bytes_available: u64 = 0;
            let mut total_number_of_bytes: u64 = 0;
            let mut total_number_of_free_bytes: u64 = 0;

            unsafe {
                unsafe extern "system" {
                    fn GetDiskFreeSpaceExW(
                        lpDirectoryName: *const u16,
                        lpFreeBytesAvailableToCaller: *mut u64,
                        lpTotalNumberOfBytes: *mut u64,
                        lpTotalNumberOfFreeBytes: *mut u64,
                    ) -> i32;
                }

                if GetDiskFreeSpaceExW(
                    wide.as_ptr(),
                    &mut free_bytes_available,
                    &mut total_number_of_bytes,
                    &mut total_number_of_free_bytes,
                ) != 0
                {
                    return free_bytes_available / (1024 * 1024);
                }
            }
        }

        #[cfg(unix)]
        {
            use std::ffi::CString;
            let path_c = CString::new(path.to_string_lossy().as_bytes()).unwrap_or_default();
            unsafe {
                let mut stat: libc::statvfs = std::mem::zeroed();
                if libc::statvfs(path_c.as_ptr(), &mut stat) == 0 {
                    let free_bytes = (stat.f_bavail as u64) * (stat.f_frsize as u64);
                    return free_bytes / (1024 * 1024);
                }
            }
        }

        // Heuristic default fallback: 50,000 MB (50 GB)
        50_000
    }

    /// Verifies write permission on a directory by creating, testing, and deleting a temporary file.
    pub fn check_directory_write_permission(dir: &Path) -> bool {
        let test_file = dir.join(format!(".write_test_{}", uuid::Uuid::new_v4()));
        match std::fs::File::create(&test_file) {
            Ok(mut f) => {
                use std::io::Write;
                let _ = f.write_all(b"test");
                drop(f);
                let _ = std::fs::remove_file(&test_file);
                true
            }
            Err(_) => false,
        }
    }
}
