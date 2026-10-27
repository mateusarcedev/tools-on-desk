use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadFormatOption {
    pub format_id: String,
    pub extension: String,
    pub resolution: Option<String>,
    pub note: Option<String>,
    pub filesize_approx: Option<u64>,
    pub has_video: bool,
    pub has_audio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDownloadInfo {
    pub url: String,
    pub title: String,
    pub uploader: Option<String>,
    pub duration_seconds: Option<f64>,
    pub thumbnail_url: Option<String>,
    pub formats: Vec<DownloadFormatOption>,
    pub is_playlist: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadOptions {
    pub url: String,
    pub output_dir: Option<String>,
    pub audio_only: bool,
    pub audio_format: Option<String>,
    pub quality: Option<String>,
    pub format_id: Option<String>,
}
