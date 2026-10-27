use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioConvertOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub format: String,
    pub bitrate_kbps: Option<u32>,
    pub channels: Option<u32>,
    pub sample_rate: Option<u32>,
    pub normalize_volume: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioTrimOptions {
    pub input_path: String,
    pub output_dir: Option<String>,
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub format: Option<String>,
}
