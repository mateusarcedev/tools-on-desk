use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoConvertOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub format: String,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub resolution: Option<String>,
    pub crf: Option<u32>,
    pub mute_audio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoCompressOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub preset: String,
    pub crf: u32,
    pub target_resolution: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoTrimOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub fast_copy: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoExtractAudioOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub format: String,
    pub bitrate_kbps: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoExtractFrameOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub timestamp_seconds: f64,
    pub format: String,
}
