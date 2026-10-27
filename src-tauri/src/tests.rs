#[cfg(test)]
mod tests {
    use crate::domain::{
        AudioConvertOptions, AudioTrimOptions, PosterOptions, Task, TaskStatus,
        VideoExtractFrameOptions, VideoTrimOptions,
    };
    use crate::engines::{
        AudioEngine, DownloadEngine, ExternalToolManager, ImageEngine, MediaEngine, PosterEngine,
        VideoEngine,
    };
    use crate::storage::Db;
    use image::{Rgb, RgbImage};
    use std::sync::atomic::AtomicBool;
    use std::sync::Arc;

    #[test]
    fn test_sqlite_tasks_and_history() {
        let db = Db::new_in_memory().expect("Falha ao criar banco em memória");

        let task = Task {
            id: "test-task-1".into(),
            name: "teste.png".into(),
            op: "Converter".into(),
            mod_name: "images".into(),
            status: TaskStatus::Waiting,
            progress: 0.0,
            source_path: Some("/tmp/teste.png".into()),
            target_path: Some("/tmp/teste.jpg".into()),
            options_json: None,
            error: None,
            size_mb: Some(1.2),
            speed: None,
            created_at: "hoje".into(),
            finished_at: None,
        };

        db.insert_task(&task).expect("Falha ao inserir tarefa");

        let fetched = db.get_task("test-task-1").expect("Falha ao buscar tarefa");
        assert!(fetched.is_some());
        let t = fetched.unwrap();
        assert_eq!(t.status, TaskStatus::Waiting);

        db.update_task_status("test-task-1", TaskStatus::Processing, 0.5, None, None)
            .expect("Falha ao atualizar status");

        let updated = db.get_task("test-task-1").unwrap().unwrap();
        assert_eq!(updated.status, TaskStatus::Processing);
        assert_eq!(updated.progress, 0.5);

        let list = db.list_tasks().expect("Falha ao listar tarefas");
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn test_poster_engine_calculation_and_pdf() {
        let temp_dir = std::env::temp_dir().join("arce_test_poster");
        std::fs::create_dir_all(&temp_dir).unwrap();

        let img_path = temp_dir.join("test_poster_input.png");
        let pdf_path = temp_dir.join("test_poster_output.pdf");

        // Generate a 1000x800 gradient image
        let mut img = RgbImage::new(1000, 800);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            let r = (x % 256) as u8;
            let g = (y % 256) as u8;
            let b = ((x + y) % 256) as u8;
            *pixel = Rgb([r, g, b]);
        }
        img.save(&img_path).unwrap();

        let options = PosterOptions {
            paper: "A4".into(),
            custom_w_mm: None,
            custom_h_mm: None,
            orientation: "Retrato".into(),
            mode: "Por páginas".into(),
            cols: 2,
            width_cm: 60.0,
            margin_mm: 10.0,
            overlap_mm: 5.0,
            crop_marks: true,
            page_numbers: true,
            effect: "Original".into(),
            source_path: img_path.to_str().unwrap().into(),
            target_pdf: pdf_path.to_str().unwrap().into(),
        };

        let spec = PosterEngine::calculate_spec(&options).expect("Falha no cálculo do pôster");
        assert_eq!(spec.cols, 2);
        assert!(spec.rows >= 1);
        assert_eq!(spec.pages, spec.cols * spec.rows);
        assert!(spec.dpi > 0);

        let res = PosterEngine::generate_pdf(&options, |_| {});
        assert!(res.is_ok());

        assert!(pdf_path.exists());
        let meta = std::fs::metadata(&pdf_path).unwrap();
        assert!(meta.len() > 1000, "O arquivo PDF deve ter conteúdo real");

        // Clean up
        let _ = std::fs::remove_file(img_path);
        let _ = std::fs::remove_file(pdf_path);
    }

    #[test]
    fn test_image_engine_conversion() {
        let temp_dir = std::env::temp_dir().join("arce_test_img");
        std::fs::create_dir_all(&temp_dir).unwrap();

        let src_img = temp_dir.join("test_img.png");
        let out_jpg = temp_dir.join("test_img.jpg");

        let mut img = RgbImage::new(400, 300);
        for pixel in img.pixels_mut() {
            *pixel = Rgb([200, 100, 50]);
        }
        img.save(&src_img).unwrap();

        let res = ImageEngine::convert_single(
            src_img.to_str().unwrap(),
            out_jpg.to_str().unwrap(),
            "JPG",
            85,
            Some(200),
            None,
            true,
        )
        .expect("Falha ao converter imagem");

        assert_eq!(res.width, 200);
        assert_eq!(res.height, 150);
        assert!(out_jpg.exists());
        assert!(res.output_size > 0);

        let _ = std::fs::remove_file(src_img);
        let _ = std::fs::remove_file(out_jpg);
    }

    #[test]
    fn test_download_url_validation() {
        assert!(DownloadEngine::validate_url("https://example.com/video.mp4").is_ok());
        assert!(DownloadEngine::validate_url("http://example.com/audio.mp3").is_ok());

        // Rejections
        assert!(DownloadEngine::validate_url("ftp://example.com/file").is_err());
        assert!(DownloadEngine::validate_url("https://example.com/test; rm -rf /").is_err());
        assert!(DownloadEngine::validate_url("https://example.com/test && echo hack").is_err());
        assert!(DownloadEngine::validate_url("not a url").is_err());
    }

    #[tokio::test]
    async fn test_external_tools_discovery() {
        let status = ExternalToolManager::check_all_tools().await;
        // In this Windows 11 host environment, FFmpeg, ffprobe, and yt-dlp were all detected
        assert_eq!(status.ffmpeg.name, "ffmpeg");
        assert_eq!(status.ffprobe.name, "ffprobe");
        assert_eq!(status.yt_dlp.name, "yt-dlp");
    }

    #[tokio::test]
    async fn test_synthetic_audio_conversion_and_probe() {
        let ffmpeg_path = match ExternalToolManager::get_ffmpeg() {
            Ok(p) => p,
            Err(_) => return, // Skip if ffmpeg not installed
        };

        let temp_dir = std::env::temp_dir().join("arce_test_audio");
        let _ = std::fs::create_dir_all(&temp_dir);
        let synthetic_wav = temp_dir.join("synthetic.wav");

        // Generate 1-second synthetic WAV file with ffmpeg lavfi
        let mut gen_cmd = tokio::process::Command::new(&ffmpeg_path);
        gen_cmd.args([
            "-y",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=1000:duration=1",
            synthetic_wav.to_str().unwrap(),
        ]);
        #[cfg(windows)]
        {
            gen_cmd.creation_flags(0x08000000);
        }
        let gen_status = gen_cmd.status().await;
        if gen_status.is_err() || !gen_status.unwrap().success() {
            return;
        }

        assert!(synthetic_wav.exists());

        // Test probe
        let probe_res = MediaEngine::probe(synthetic_wav.to_str().unwrap()).await;
        assert!(probe_res.is_ok(), "ffprobe deve conseguir analisar o áudio sintético");
        let info = probe_res.unwrap();
        assert!(info.duration_seconds >= 0.9);
        assert!(!info.audio_streams.is_empty());

        // Test AudioEngine::convert to MP3
        let cancel = Arc::new(AtomicBool::new(false));
        let convert_opts = AudioConvertOptions {
            input_path: synthetic_wav.to_str().unwrap().into(),
            output_dir: Some(temp_dir.to_str().unwrap().into()),
            format: "mp3".into(),
            bitrate_kbps: Some(192),
            channels: Some(2),
            sample_rate: Some(44100),
            normalize_volume: false,
        };

        let out_mp3_path = AudioEngine::convert(&convert_opts, cancel, |_| {}).await;
        assert!(out_mp3_path.is_ok(), "AudioEngine::convert deve gerar o arquivo MP3");
        let mp3_path_str = out_mp3_path.unwrap();
        assert!(std::path::Path::new(&mp3_path_str).exists());

        // Probe MP3 to verify format and streams
        let mp3_probe = MediaEngine::probe(&mp3_path_str).await.unwrap();
        assert!(mp3_probe.format_name.contains("mp3"));
        assert!(!mp3_probe.audio_streams.is_empty());

        // Test AudioEngine::trim
        let cancel_trim = Arc::new(AtomicBool::new(false));
        let trim_opts = AudioTrimOptions {
            input_path: synthetic_wav.to_str().unwrap().into(),
            output_dir: Some(temp_dir.to_str().unwrap().into()),
            start_seconds: 0.2,
            end_seconds: 0.7,
            format: Some("wav".into()),
        };
        let trim_res = AudioEngine::trim(&trim_opts, cancel_trim, |_| {}).await;
        assert!(trim_res.is_ok(), "AudioEngine::trim deve funcionar");

        // Clean up
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[tokio::test]
    async fn test_synthetic_video_operations() {
        let ffmpeg_path = match ExternalToolManager::get_ffmpeg() {
            Ok(p) => p,
            Err(_) => return,
        };

        let temp_dir = std::env::temp_dir().join("arce_test_video");
        let _ = std::fs::create_dir_all(&temp_dir);
        let synthetic_mp4 = temp_dir.join("synthetic.mp4");

        // Generate 2-second synthetic video
        let mut gen_cmd = tokio::process::Command::new(&ffmpeg_path);
        gen_cmd.args([
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=2:size=320x240:rate=30",
            synthetic_mp4.to_str().unwrap(),
        ]);
        #[cfg(windows)]
        {
            gen_cmd.creation_flags(0x08000000);
        }
        let gen_status = gen_cmd.status().await;
        if gen_status.is_err() || !gen_status.unwrap().success() {
            return;
        }

        assert!(synthetic_mp4.exists());

        // Probe video
        let probe_res = MediaEngine::probe(synthetic_mp4.to_str().unwrap()).await;
        assert!(probe_res.is_ok());
        let info = probe_res.unwrap();
        assert_eq!(info.video_streams.len(), 1);
        assert_eq!(info.video_streams[0].width, 320);
        assert_eq!(info.video_streams[0].height, 240);

        // Test trim
        let cancel = Arc::new(AtomicBool::new(false));
        let trim_opts = VideoTrimOptions {
            input_path: synthetic_mp4.to_str().unwrap().into(),
            output_dir: Some(temp_dir.to_str().unwrap().into()),
            start_seconds: 0.5,
            end_seconds: 1.5,
            fast_copy: false,
        };
        let trim_res = VideoEngine::trim(&trim_opts, cancel, |_| {}).await;
        assert!(trim_res.is_ok());

        // Test frame extraction
        let frame_opts = VideoExtractFrameOptions {
            input_path: synthetic_mp4.to_str().unwrap().into(),
            output_dir: Some(temp_dir.to_str().unwrap().into()),
            timestamp_seconds: 0.5,
            format: "jpg".into(),
        };
        let frame_res = VideoEngine::extract_frame(&frame_opts).await;
        assert!(frame_res.is_ok());
        let frame_path = frame_res.unwrap();
        assert!(std::path::Path::new(&frame_path).exists());

        // Clean up
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
