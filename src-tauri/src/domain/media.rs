use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoStreamInfo {
    pub index: usize,
    pub codec_name: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub bit_rate: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioStreamInfo {
    pub index: usize,
    pub codec_name: String,
    pub sample_rate: u32,
    pub channels: u32,
    pub bit_rate: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub file_path: String,
    pub format_name: String,
    pub duration_seconds: f64,
    pub size_bytes: u64,
    pub bit_rate: Option<u64>,
    pub video_streams: Vec<VideoStreamInfo>,
    pub audio_streams: Vec<AudioStreamInfo>,
}
