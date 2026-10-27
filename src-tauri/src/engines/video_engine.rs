use crate::domain::{VideoCompressOptions, VideoConvertOptions, VideoExtractFrameOptions, VideoTrimOptions};
use crate::engines::{ExternalToolManager, MediaEngine};
use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct VideoEngine;

impl VideoEngine {
    pub async fn convert<F>(
        options: &VideoConvertOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let input_path = Path::new(&options.input_path);
        if !input_path.is_file() {
            return Err(AppError::InvalidInput(format!("Arquivo de vídeo não encontrado: {}", options.input_path)));
        }

        let media_info = MediaEngine::probe(&options.input_path).await.ok();
        let total_duration = media_info.as_ref().map(|m| m.duration_seconds).unwrap_or(0.0);

        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        let target_ext = options.format.to_lowercase().replace('.', "");
        let output_dir = match &options.output_dir {
            Some(dir) => PathBuf::from(dir),
            None => input_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
        };

        let file_stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
        let target_path = Self::resolve_unique_path(&output_dir, file_stem, &target_ext);

        let mut args: Vec<String> = vec![
            "-y".to_string(),
            "-i".to_string(),
            options.input_path.clone(),
        ];

        // Video Codec
        let v_codec = options.video_codec.as_deref().unwrap_or("h264");
        match v_codec {
            "h265" | "hevc" => {
                args.push("-c:v".to_string());
                args.push("libx265".to_string());
            }
            "vp9" => {
                args.push("-c:v".to_string());
                args.push("libvpx-vp9".to_string());
            }
            "copy" => {
                args.push("-c:v".to_string());
                args.push("copy".to_string());
            }
            _ => {
                args.push("-c:v".to_string());
                args.push("libx264".to_string());
                args.push("-pix_fmt".to_string());
                args.push("yuv420p".to_string());
            }
        }

        // CRF
        if let Some(crf_val) = options.crf {
            args.push("-crf".to_string());
            args.push(crf_val.to_string());
        }

        // Resolution
        if let Some(res) = &options.resolution {
            match res.as_str() {
                "1080p" => {
                    args.push("-vf".to_string());
                    args.push("scale=-2:1080".to_string());
                }
                "720p" => {
                    args.push("-vf".to_string());
                    args.push("scale=-2:720".to_string());
                }
                "480p" => {
                    args.push("-vf".to_string());
                    args.push("scale=-2:480".to_string());
                }
                _ => {}
            }
        }

        // Audio Handling
        if options.mute_audio {
            args.push("-an".to_string());
        } else {
            let a_codec = options.audio_codec.as_deref().unwrap_or("aac");
            match a_codec {
                "opus" => {
                    args.push("-c:a".to_string());
                    args.push("libopus".to_string());
                }
                "mp3" => {
                    args.push("-c:a".to_string());
                    args.push("libmp3lame".to_string());
                }
                "copy" => {
                    args.push("-c:a".to_string());
                    args.push("copy".to_string());
                }
                _ => {
                    args.push("-c:a".to_string());
                    args.push("aac".to_string());
                    args.push("-b:a".to_string());
                    args.push("192k".to_string());
                }
            }
        }

        args.push("-progress".to_string());
        args.push("pipe:1".to_string());
        args.push("-nostats".to_string());
        args.push(target_path.to_string_lossy().to_string());

        let progress_arc = Arc::new(progress_cb);
        let progress_clone = progress_arc.clone();

        let res = ExternalToolManager::run_with_cancellation(
            &ffmpeg_path,
            &args,
            cancel_token,
            move |line| {
                if let Some(stripped) = line.strip_prefix("out_time_us=") {
                    if let Ok(us) = stripped.trim().parse::<f64>() {
                        let sec = us / 1_000_000.0;
                        if total_duration > 0.0 {
                            let p = (sec / total_duration).clamp(0.0, 0.99);
                            progress_clone(p);
                        }
                    }
                } else if line == "progress=end" {
                    progress_clone(1.0);
                }
            },
        )
        .await;

        match res {
            Ok(_) => Ok(target_path.to_string_lossy().to_string()),
            Err(e) => {
                if target_path.exists() {
                    let _ = std::fs::remove_file(&target_path);
                }
                Err(e)
            }
        }
    }

    pub async fn compress<F>(
        options: &VideoCompressOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let crf = match options.preset.as_str() {
            "high" => 18,
            "balanced" => 23,
            "small" => 28,
            _ => options.crf,
        };

        let convert_opts = VideoConvertOptions {
            input_path: options.input_path.clone(),
            output_dir: options.output_dir.clone(),
            format: "mp4".to_string(),
            video_codec: Some("h264".to_string()),
            audio_codec: Some("aac".to_string()),
            resolution: options.target_resolution.clone(),
            crf: Some(crf),
            mute_audio: false,
        };

        Self::convert(&convert_opts, cancel_token, progress_cb).await
    }

    pub async fn trim<F>(
        options: &VideoTrimOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let input_path = Path::new(&options.input_path);
        if !input_path.is_file() {
            return Err(AppError::InvalidInput(format!("Arquivo de vídeo não encontrado: {}", options.input_path)));
        }

        let total_duration = (options.end_seconds - options.start_seconds).max(0.1);
        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        let ext = input_path.extension().and_then(|s| s.to_str()).unwrap_or("mp4").to_lowercase();
        let output_dir = match &options.output_dir {
            Some(dir) => PathBuf::from(dir),
            None => input_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
        };

        let file_stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
        let target_stem = format!("{}_corte", file_stem);
        let target_path = Self::resolve_unique_path(&output_dir, &target_stem, &ext);

        let mut args: Vec<String> = vec![
            "-y".to_string(),
            "-ss".to_string(),
            format!("{:.3}", options.start_seconds),
            "-to".to_string(),
            format!("{:.3}", options.end_seconds),
            "-i".to_string(),
            options.input_path.clone(),
        ];

        if options.fast_copy {
            args.push("-c".to_string());
            args.push("copy".to_string());
        } else {
            args.push("-c:v".to_string());
            args.push("libx264".to_string());
            args.push("-c:a".to_string());
            args.push("aac".to_string());
        }

        args.push("-progress".to_string());
        args.push("pipe:1".to_string());
        args.push("-nostats".to_string());
        args.push(target_path.to_string_lossy().to_string());

        let progress_arc = Arc::new(progress_cb);
        let progress_clone = progress_arc.clone();

        let res = ExternalToolManager::run_with_cancellation(
            &ffmpeg_path,
            &args,
            cancel_token,
            move |line| {
                if let Some(stripped) = line.strip_prefix("out_time_us=") {
                    if let Ok(us) = stripped.trim().parse::<f64>() {
                        let sec = us / 1_000_000.0;
                        let p = (sec / total_duration).clamp(0.0, 0.99);
                        progress_clone(p);
                    }
                } else if line == "progress=end" {
                    progress_clone(1.0);
                }
            },
        )
        .await;

        match res {
            Ok(_) => Ok(target_path.to_string_lossy().to_string()),
            Err(e) => {
                if target_path.exists() {
                    let _ = std::fs::remove_file(&target_path);
                }
                Err(e)
            }
        }
    }

    pub async fn extract_frame(options: &VideoExtractFrameOptions) -> AppResult<String> {
        let input_path = Path::new(&options.input_path);
        if !input_path.is_file() {
            return Err(AppError::InvalidInput(format!("Arquivo de vídeo não encontrado: {}", options.input_path)));
        }

        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        let ext = if options.format.to_lowercase().contains("png") {
            "png"
        } else {
            "jpg"
        };

        let output_dir = match &options.output_dir {
            Some(dir) => PathBuf::from(dir),
            None => input_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
        };

        let file_stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
        let target_stem = format!("{}_frame_{:.1}s", file_stem, options.timestamp_seconds);
        let target_path = Self::resolve_unique_path(&output_dir, &target_stem, ext);

        let args = vec![
            "-y".to_string(),
            "-ss".to_string(),
            format!("{:.3}", options.timestamp_seconds),
            "-i".to_string(),
            options.input_path.clone(),
            "-vframes".to_string(),
            "1".to_string(),
            "-q:v".to_string(),
            "2".to_string(),
            target_path.to_string_lossy().to_string(),
        ];

        let cancel_token = Arc::new(AtomicBool::new(false));
        ExternalToolManager::run_with_cancellation(&ffmpeg_path, &args, cancel_token, |_| {}).await?;

        Ok(target_path.to_string_lossy().to_string())
    }

    fn resolve_unique_path(dir: &Path, stem: &str, ext: &str) -> PathBuf {
        let initial = dir.join(format!("{}.{}", stem, ext));
        if !initial.exists() {
            return initial;
        }

        let mut counter = 1;
        loop {
            let candidate = dir.join(format!("{} ({}).{}", stem, counter, ext));
            if !candidate.exists() {
                return candidate;
            }
            counter += 1;
        }
    }
}
