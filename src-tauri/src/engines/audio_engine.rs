use crate::domain::{AudioConvertOptions, AudioTrimOptions, VideoExtractAudioOptions};
use crate::engines::{ExternalToolManager, MediaEngine};
use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct AudioEngine;

impl AudioEngine {
    pub async fn convert<F>(
        options: &AudioConvertOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let input_path = Path::new(&options.input_path);
        if !input_path.is_file() {
            return Err(AppError::InvalidInput(format!("Arquivo de áudio não encontrado: {}", options.input_path)));
        }

        // Probe duration for real progress
        let media_info = MediaEngine::probe(&options.input_path).await.ok();
        let total_duration = media_info.as_ref().map(|m| m.duration_seconds).unwrap_or(0.0);

        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        // Resolve output path
        let target_ext = options.format.to_lowercase().replace('.', "");
        let output_dir = match &options.output_dir {
            Some(dir) => PathBuf::from(dir),
            None => input_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
        };

        let file_stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("audio");
        let target_path = Self::resolve_unique_path(&output_dir, file_stem, &target_ext);

        let mut args: Vec<String> = vec![
            "-y".to_string(),
            "-i".to_string(),
            options.input_path.clone(),
            "-vn".to_string(), // Disable video
        ];

        // Codec selection
        match target_ext.as_str() {
            "mp3" => {
                args.push("-c:a".to_string());
                args.push("libmp3lame".to_string());
            }
            "wav" => {
                args.push("-c:a".to_string());
                args.push("pcm_s16le".to_string());
            }
            "flac" => {
                args.push("-c:a".to_string());
                args.push("flac".to_string());
            }
            "m4a" | "aac" => {
                args.push("-c:a".to_string());
                args.push("aac".to_string());
            }
            "ogg" => {
                args.push("-c:a".to_string());
                args.push("libvorbis".to_string());
            }
            "opus" => {
                args.push("-c:a".to_string());
                args.push("libopus".to_string());
            }
            _ => {
                args.push("-c:a".to_string());
                args.push("copy".to_string());
            }
        }

        // Bitrate
        if let Some(br) = options.bitrate_kbps {
            if target_ext != "wav" && target_ext != "flac" {
                args.push("-b:a".to_string());
                args.push(format!("{}k", br));
            }
        }

        // Channels
        if let Some(ch) = options.channels {
            args.push("-ac".to_string());
            args.push(ch.to_string());
        }

        // Sample rate
        if let Some(sr) = options.sample_rate {
            args.push("-ar".to_string());
            args.push(sr.to_string());
        }

        // Normalization
        if options.normalize_volume {
            args.push("-filter:a".to_string());
            args.push("loudnorm=I=-14:LRA=11:TP=-1.5".to_string());
        }

        // Structured progress output
        args.push("-progress".to_string());
        args.push("pipe:1".to_string());
        args.push("-nostats".to_string());
        args.push(target_path.to_string_lossy().to_string());

        let progress_arc = Arc::new(progress_cb);
        let progress_clone = progress_arc.clone();

        let res = ExternalToolManager::run_with_cancellation(
            &ffmpeg_path,
            &args,
            cancel_token.clone(),
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
                // If failed or canceled, clean up partial output
                if target_path.exists() {
                    let _ = std::fs::remove_file(&target_path);
                }
                Err(e)
            }
        }
    }

    pub async fn trim<F>(
        options: &AudioTrimOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let input_path = Path::new(&options.input_path);
        if !input_path.is_file() {
            return Err(AppError::InvalidInput(format!("Arquivo de áudio não encontrado: {}", options.input_path)));
        }

        let total_duration = (options.end_seconds - options.start_seconds).max(0.1);
        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        let ext = options
            .format
            .as_deref()
            .unwrap_or_else(|| input_path.extension().and_then(|s| s.to_str()).unwrap_or("mp3"))
            .to_lowercase()
            .replace('.', "");

        let output_dir = match &options.output_dir {
            Some(dir) => PathBuf::from(dir),
            None => input_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
        };

        let file_stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("audio");
        let target_stem = format!("{}_corte", file_stem);
        let target_path = Self::resolve_unique_path(&output_dir, &target_stem, &ext);

        let args: Vec<String> = vec![
            "-y".to_string(),
            "-ss".to_string(),
            format!("{:.3}", options.start_seconds),
            "-to".to_string(),
            format!("{:.3}", options.end_seconds),
            "-i".to_string(),
            options.input_path.clone(),
            "-vn".to_string(),
            "-progress".to_string(),
            "pipe:1".to_string(),
            "-nostats".to_string(),
            target_path.to_string_lossy().to_string(),
        ];

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

    pub async fn extract_audio_from_video<F>(
        options: &VideoExtractAudioOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let convert_opts = AudioConvertOptions {
            input_path: options.input_path.clone(),
            output_dir: options.output_dir.clone(),
            format: options.format.clone(),
            bitrate_kbps: options.bitrate_kbps,
            channels: Some(2),
            sample_rate: Some(44100),
            normalize_volume: false,
        };

        Self::convert(&convert_opts, cancel_token, progress_cb).await
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
