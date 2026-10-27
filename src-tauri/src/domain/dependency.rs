use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyStatus {
    Ready,
    NotInstalled,
    UpdateAvailable,
    Incompatible,
    CheckFailed,
    Optional,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyOrigin {
    Managed,
    Bundled,
    WinGet,
    SystemPath,
    CustomPath,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String, // "audio_video", "download", "documents", "system"
    pub status: DependencyStatus,
    pub version: Option<String>,
    pub latest_version: Option<String>,
    pub origin: DependencyOrigin,
    pub path: Option<String>,
    pub is_managed: bool,
    pub can_install: bool,
    pub can_update: bool,
    pub can_remove: bool,
    pub download_size_bytes: Option<u64>,
    pub installed_size_bytes: Option<u64>,
    pub last_checked_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDiagnostics {
    pub os_version: String,
    pub arch: String,
    pub webview2_available: bool,
    pub webview2_version: Option<String>,
    pub app_data_path: String,
    pub binaries_path: String,
    pub has_write_permission: bool,
    pub available_disk_space_mb: u64,
    pub internet_connected: bool,
    pub dependencies: Vec<DependencyInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyInstallProgress {
    pub dependency_id: String,
    pub phase: String, // "downloading", "verifying_hash", "extracting", "validating", "completed", "failed"
    pub bytes_downloaded: u64,
    pub total_bytes: Option<u64>,
    pub percentage: f64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirstRunStatus {
    pub is_first_run: bool,
    pub completed: bool,
    pub dismissed: bool,
    pub all_essential_ready: bool,
}
