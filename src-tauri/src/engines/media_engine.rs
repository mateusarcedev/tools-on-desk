use crate::domain::{AudioStreamInfo, MediaInfo, VideoStreamInfo};
use crate::engines::ExternalToolManager;
use crate::error::{AppError, AppResult};
use serde_json::Value;
use std::path::Path;
use tokio::process::Command;

pub struct MediaEngine;

impl MediaEngine {
    pub async fn probe(file_path: &str) -> AppResult<MediaInfo> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(AppError::InvalidInput(format!("Arquivo não encontrado: {}", file_path)));
        }

        let ffprobe_path = ExternalToolManager::get_ffprobe()?;

        let mut cmd = Command::new(&ffprobe_path);
        cmd.args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            file_path,
        ]);

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000);
        }

        let output = cmd.output().await.map_err(|e| {
            AppError::Internal(format!("Falha ao executar ffprobe: {}", e))
        })?;

        if !output.status.success() {
            let err_text = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::Internal(format!("ffprobe retornou erro: {}", err_text)));
        }

        let json_str = String::from_utf8_lossy(&output.stdout);
        let val: Value = serde_json::from_str(&json_str).map_err(|e| {
            AppError::Internal(format!("Falha ao interpretar saída do ffprobe: {}", e))
        })?;

        let format_obj = val.get("format").cloned().unwrap_or(Value::Null);
        let format_name = format_obj
            .get("format_name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let duration_seconds = format_obj
            .get("duration")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);

        let size_bytes = format_obj
            .get("size")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or_else(|| {
                std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
            });

        let bit_rate = format_obj
            .get("bit_rate")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok());

        let mut video_streams = Vec::new();
        let mut audio_streams = Vec::new();

        if let Some(streams) = val.get("streams").and_then(|v| v.as_array()) {
            for (i, stream) in streams.iter().enumerate() {
                let codec_type = stream.get("codec_type").and_then(|v| v.as_str()).unwrap_or("");
                let codec_name = stream
                    .get("codec_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();

                let stream_bitrate = stream
                    .get("bit_rate")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse::<u64>().ok());

                if codec_type == "video" {
                    let width = stream.get("width").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                    let height = stream.get("height").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

                    let fps = stream
                        .get("r_frame_rate")
                        .and_then(|v| v.as_str())
                        .and_then(|s| {
                            let parts: Vec<&str> = s.split('/').collect();
                            if parts.len() == 2 {
                                let num: f64 = parts[0].parse().ok()?;
                                let den: f64 = parts[1].parse().ok()?;
                                if den > 0.0 {
                                    Some(num / den)
                                } else {
                                    None
                                }
                            } else {
                                s.parse::<f64>().ok()
                            }
                        })
                        .unwrap_or(30.0);

                    video_streams.push(VideoStreamInfo {
                        index: i,
                        codec_name,
                        width,
                        height,
                        fps,
                        bit_rate: stream_bitrate,
                    });
                } else if codec_type == "audio" {
                    let sample_rate = stream
                        .get("sample_rate")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(44100);

                    let channels = stream.get("channels").and_then(|v| v.as_u64()).unwrap_or(2) as u32;

                    audio_streams.push(AudioStreamInfo {
                        index: i,
                        codec_name,
                        sample_rate,
                        channels,
                        bit_rate: stream_bitrate,
                    });
                }
            }
        }

        Ok(MediaInfo {
            file_path: file_path.to_string(),
            format_name,
            duration_seconds,
            size_bytes,
            bit_rate,
            video_streams,
            audio_streams,
        })
    }
}
