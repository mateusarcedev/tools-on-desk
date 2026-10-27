use crate::domain::{
    DownloadFormatOption, DownloadOptions, MediaDownloadInfo, PlaylistItemInfo, YtDlpStatus,
};
use crate::engines::ExternalToolManager;
use crate::error::{AppError, AppResult};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tokio::process::Command;

pub struct DownloadEngine;

impl DownloadEngine {
    pub fn detect_platform(url: &str) -> (&'static str, &'static str) {
        let lower = url.to_lowercase();
        if lower.contains("youtube.com/shorts") || (lower.contains("youtu.be/") && lower.contains("shorts")) {
            ("youtube_shorts", "YouTube Shorts")
        } else if lower.contains("youtube.com") || lower.contains("youtu.be") {
            ("youtube", "YouTube")
        } else if lower.contains("instagram.com/reels") || lower.contains("instagram.com/reel") {
            ("instagram_reels", "Instagram Reels")
        } else if lower.contains("instagram.com") {
            ("instagram", "Instagram")
        } else if lower.contains("tiktok.com") {
            ("tiktok", "TikTok")
        } else if lower.contains("facebook.com") || lower.contains("fb.watch") {
            ("facebook", "Facebook")
        } else if lower.contains("twitter.com") || lower.contains("x.com") {
            ("twitter", "X / Twitter")
        } else if lower.contains("reddit.com") || lower.contains("v.redd.it") {
            ("reddit", "Reddit")
        } else if lower.contains("pinterest.com") || lower.contains("pin.it") {
            ("pinterest", "Pinterest")
        } else if lower.contains("vimeo.com") {
            ("vimeo", "Vimeo")
        } else if lower.contains("twitch.tv") {
            ("twitch", "Twitch")
        } else if lower.contains("soundcloud.com") {
            ("soundcloud", "SoundCloud")
        } else if lower.contains("dailymotion.com") || lower.contains("dai.ly") {
            ("dailymotion", "Dailymotion")
        } else {
            ("generic", "Plataforma Compatível")
        }
    }

    pub fn validate_url(url: &str) -> AppResult<()> {
        let trimmed = url.trim();
        if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
            return Err(AppError::InvalidInput("A URL deve iniciar com http:// ou https://".into()));
        }

        // Prevent shell metacharacters and suspicious control characters
        if trimmed.contains(['\n', '\r', ';', '&', '|', '`', '$', '<', '>', '"', '\'', '\\']) {
            return Err(AppError::InvalidInput("A URL contém caracteres inválidos ou suspeitos".into()));
        }

        // SSRF protection: parse host
        let without_proto = if let Some(stripped) = trimmed.strip_prefix("https://") {
            stripped
        } else if let Some(stripped) = trimmed.strip_prefix("http://") {
            stripped
        } else {
            trimmed
        };

        let host = without_proto
            .split(&['/', ':', '?', '#'][..])
            .next()
            .unwrap_or("")
            .trim()
            .to_lowercase();

        if host.is_empty() {
            return Err(AppError::InvalidInput("URL sem domínio ou endereço válido".into()));
        }

        // Block loopback, localhost, and local network destinations
        if host == "localhost"
            || host.ends_with(".localhost")
            || host == "0.0.0.0"
            || host == "[::1]"
            || host == "::1"
        {
            return Err(AppError::InvalidInput(
                "Acesso a endereços locais (localhost/loopback) é bloqueado por segurança".into(),
            ));
        }

        // If IP address, ensure not private/link-local/loopback
        let clean_ip_str = host.trim_matches('[').trim_matches(']');
        if let Ok(ip) = clean_ip_str.parse::<std::net::IpAddr>() {
            match ip {
                std::net::IpAddr::V4(ipv4) => {
                    if ipv4.is_loopback()
                        || ipv4.is_private()
                        || ipv4.is_link_local()
                        || ipv4.is_broadcast()
                        || ipv4.is_unspecified()
                    {
                        return Err(AppError::InvalidInput(
                            "Acesso a redes locais ou privadas é bloqueado por segurança".into(),
                        ));
                    }
                }
                std::net::IpAddr::V6(ipv6) => {
                    if ipv6.is_loopback() || ipv6.is_unspecified() {
                        return Err(AppError::InvalidInput(
                            "Acesso a endereços IPv6 de loopback é bloqueado por segurança".into(),
                        ));
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn fetch_info(url: &str) -> AppResult<MediaDownloadInfo> {
        Self::validate_url(url)?;

        let (platform, platform_name) = Self::detect_platform(url);
        let ytdlp_path = ExternalToolManager::get_ytdlp()?;

        let mut cmd = Command::new(&ytdlp_path);
        cmd.args([
            "--dump-single-json",
            "--flat-playlist",
            "--no-warnings",
            "--skip-download",
            url,
        ]);

        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000);
        }

        let output = cmd.output().await.map_err(|e| {
            AppError::Internal(format!("Falha ao executar yt-dlp: {}", e))
        })?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::Internal(format!("yt-dlp não conseguiu obter informações da mídia: {}", err)));
        }

        let json_str = String::from_utf8_lossy(&output.stdout);
        let val: Value = serde_json::from_str(&json_str).map_err(|e| {
            AppError::Internal(format!("Falha ao processar metadados do yt-dlp: {}", e))
        })?;

        let is_playlist = val.get("_type").and_then(|v| v.as_str()) == Some("playlist");
        let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("Sem título").to_string();
        let uploader = val.get("uploader").and_then(|v| v.as_str()).map(|s| s.to_string());
        let duration_seconds = val.get("duration").and_then(|v| v.as_f64());
        let thumbnail_url = val.get("thumbnail").and_then(|v| v.as_str()).map(|s| s.to_string());

        let mut playlist_items = None;
        let mut formats = Vec::new();

        if is_playlist {
            if let Some(entries) = val.get("entries").and_then(|v| v.as_array()) {
                let mut items = Vec::new();
                for entry in entries {
                    let id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let item_title = entry.get("title").and_then(|v| v.as_str()).unwrap_or("Item").to_string();
                    let item_url = entry.get("url").and_then(|v| v.as_str())
                        .or_else(|| entry.get("webpage_url").and_then(|v| v.as_str()))
                        .unwrap_or(url)
                        .to_string();
                    let item_duration = entry.get("duration").and_then(|v| v.as_f64());
                    let item_uploader = entry.get("uploader").and_then(|v| v.as_str()).map(|s| s.to_string());

                    if !id.is_empty() || !item_title.is_empty() {
                        items.push(PlaylistItemInfo {
                            id,
                            title: item_title,
                            url: item_url,
                            duration_seconds: item_duration,
                            uploader: item_uploader,
                        });
                    }
                }
                playlist_items = Some(items);
            }
        } else if let Some(arr) = val.get("formats").and_then(|v| v.as_array()) {
            for f in arr {
                let format_id = match f.get("format_id").and_then(|v| v.as_str()) {
                    Some(id) => id.to_string(),
                    None => continue,
                };

                let extension = f.get("ext").and_then(|v| v.as_str()).unwrap_or("mp4").to_string();
                let resolution = f.get("resolution").and_then(|v| v.as_str()).map(|s| s.to_string());
                let note = f.get("format_note").and_then(|v| v.as_str()).map(|s| s.to_string());
                let filesize_approx = f.get("filesize_approx").and_then(|v| v.as_u64())
                    .or_else(|| f.get("filesize").and_then(|v| v.as_u64()));

                let vcodec = f.get("vcodec").and_then(|v| v.as_str()).unwrap_or("none");
                let acodec = f.get("acodec").and_then(|v| v.as_str()).unwrap_or("none");

                let has_video = vcodec != "none" && !vcodec.is_empty();
                let has_audio = acodec != "none" && !acodec.is_empty();

                formats.push(DownloadFormatOption {
                    format_id,
                    extension,
                    resolution,
                    note,
                    filesize_approx,
                    has_video,
                    has_audio,
                });
            }
        }

        Ok(MediaDownloadInfo {
            url: url.to_string(),
            title,
            uploader,
            duration_seconds,
            thumbnail_url,
            formats,
            is_playlist,
            playlist_items,
            platform: platform.to_string(),
            platform_name: platform_name.to_string(),
        })
    }

    pub async fn get_ytdlp_status() -> AppResult<YtDlpStatus> {
        let path_res = ExternalToolManager::get_ytdlp();
        match path_res {
            Ok(p) => {
                let mut cmd = Command::new(&p);
                cmd.arg("--version");
                #[cfg(windows)]
                {
                    cmd.creation_flags(0x08000000);
                }
                let out = cmd.output().await;
                let version = match out {
                    Ok(o) if o.status.success() => {
                        String::from_utf8_lossy(&o.stdout).trim().to_string()
                    }
                    _ => "Versão desconhecida".to_string(),
                };

                let origin = if p.to_string_lossy().contains("binaries") {
                    "Empacotado / Local (binaries/)"
                } else if p.to_string_lossy().contains("WinGet") {
                    "WinGet (Oficial Microsoft)"
                } else {
                    "Sistema (PATH)"
                };

                Ok(YtDlpStatus {
                    version,
                    path: p.to_string_lossy().to_string(),
                    origin: origin.to_string(),
                    is_available: true,
                })
            }
            Err(e) => Ok(YtDlpStatus {
                version: "Não instalado".to_string(),
                path: "".to_string(),
                origin: format!("Não localizado: {}", e),
                is_available: false,
            }),
        }
    }

    pub async fn download<F>(
        options: &DownloadOptions,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        Self::validate_url(&options.url)?;

        let ytdlp_path = ExternalToolManager::get_ytdlp()?;

        let output_dir = match &options.output_dir {
            Some(dir) => PathBuf::from(dir),
            None => {
                if let Ok(user_profile) = std::env::var("USERPROFILE") {
                    Path::new(&user_profile).join("Downloads")
                } else {
                    PathBuf::from("downloads")
                }
            }
        };

        if !output_dir.exists() {
            let _ = std::fs::create_dir_all(&output_dir);
        }

        let out_template = output_dir.join("%(title)s.%(ext)s").to_string_lossy().to_string();

        let mut args: Vec<String> = vec![
            "--newline".to_string(),
            "--no-playlist".to_string(),
            "--progress-template".to_string(),
            "%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.status)s".to_string(),
            "-o".to_string(),
            out_template,
        ];

        // Pass ffmpeg location if available
        if let Ok(ffmpeg_path) = ExternalToolManager::get_ffmpeg() {
            if let Some(parent) = ffmpeg_path.parent() {
                args.push("--ffmpeg-location".to_string());
                args.push(parent.to_string_lossy().to_string());
            }
        }

        if options.audio_only {
            args.push("-x".to_string());
            let fmt = options.audio_format.as_deref().unwrap_or("mp3");
            args.push("--audio-format".to_string());
            args.push(fmt.to_string());
        } else if let Some(fid) = &options.format_id {
            args.push("-f".to_string());
            args.push(format!("{}+bestaudio/best", fid));
        } else if let Some(q) = &options.quality {
            args.push("-f".to_string());
            match q.as_str() {
                "1080p" => args.push("bestvideo[height<=1080]+bestaudio/best[height<=1080]/best".to_string()),
                "720p" => args.push("bestvideo[height<=720]+bestaudio/best[height<=720]/best".to_string()),
                "480p" => args.push("bestvideo[height<=480]+bestaudio/best[height<=480]/best".to_string()),
                _ => args.push("bestvideo+bestaudio/best".to_string()),
            }
        }

        args.push(options.url.clone());

        let progress_arc = Arc::new(progress_cb);
        let progress_clone = progress_arc.clone();

        let res = ExternalToolManager::run_with_cancellation(
            &ytdlp_path,
            &args,
            cancel_token,
            move |line| {
                if line.contains('|') {
                    let parts: Vec<&str> = line.split('|').collect();
                    if let Some(pct_str) = parts.first() {
                        let clean_pct = pct_str.replace('%', "").trim().to_string();
                        if let Ok(val) = clean_pct.parse::<f64>() {
                            progress_clone((val / 100.0).clamp(0.0, 0.99));
                        }
                    }
                } else if line.contains("100%") {
                    progress_clone(1.0);
                }
            },
        )
        .await;

        match res {
            Ok(_) => {
                progress_arc(1.0);
                Ok(output_dir.to_string_lossy().to_string())
            }
            Err(e) => {
                if let AppError::Canceled = e {
                    // Clean up incomplete .part / .ytdl / .temp files left in output_dir
                    if let Ok(entries) = std::fs::read_dir(&output_dir) {
                        for entry in entries.flatten() {
                            let p = entry.path();
                            if p.is_file() {
                                let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("");
                                if ext == "part" || ext == "ytdl" || ext == "temp" {
                                    let _ = std::fs::remove_file(p);
                                }
                            }
                        }
                    }
                }
                Err(e)
            }
        }
    }
}
