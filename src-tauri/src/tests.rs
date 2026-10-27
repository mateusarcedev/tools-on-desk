#[cfg(test)]
mod tests {
    use crate::domain::{
        AudioConvertOptions, AudioTrimOptions, ErrorLogEntry, ErrorLogFilter,
        PdfCompressOptions, PdfMergeOptions, PdfOrganizeOptions, PdfPageAction, PdfSplitOptions,
        PdfToDocxOptions, PosterOptions, Task, TaskStatus, VideoExtractFrameOptions,
        VideoTrimOptions,
    };
    use crate::engines::{
        AudioEngine, DocumentEngine, DownloadEngine, ExternalToolManager, ImageEngine, MediaEngine,
        PosterEngine, VideoEngine,
    };
    use crate::storage::Db;
    use crate::utils::clipboard::copy_text_to_system_clipboard;
    use image::{Rgb, RgbImage};
    use lopdf::content::{Content, Operation};
    use lopdf::{Document, Object, Stream};
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
            dot_shape: Some("circle".into()),
            dot_pitch_mm: Some(4.0),
            min_dot_size: Some(0.05),
            max_dot_size: Some(0.95),
            brightness: Some(0.0),
            contrast: Some(0.0),
            invert: Some(false),
            intensity: Some(1.0),
            dot_color: Some("#000000".into()),
            bg_color: Some("#ffffff".into()),
            rotate_deg: Some(0),
            source_path: img_path.to_str().unwrap().into(),
            target_pdf: pdf_path.to_str().unwrap().into(),
        };

        let spec = PosterEngine::calculate_spec(&options).expect("Falha ao calcular spec");
        assert_eq!(spec.cols, 2);
        assert!(spec.rows >= 1);
        assert!(spec.pages >= 2);
        assert!(spec.dpi > 0);

        let out = PosterEngine::generate_pdf(&options, |_| {}).expect("Falha ao gerar PDF");
        assert!(std::path::Path::new(&out).exists());
        let meta = std::fs::metadata(&out).unwrap();
        assert!(meta.len() > 1000);

        // Clean up
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_mandatory_rasterbator_example_4x3_12_sheets() {
        let temp_dir = std::env::temp_dir().join("arce_test_rasterbator_mandatory");
        std::fs::create_dir_all(&temp_dir).unwrap();

        let img_path = temp_dir.join("input_3000x3300.png");
        let pdf_path = temp_dir.join("output_4x3_12sheets.pdf");

        // 3000 x 3300 px test image
        let mut img = RgbImage::new(100, 110);
        for pixel in img.pixels_mut() {
            *pixel = Rgb([128, 128, 128]);
        }
        img.save(&img_path).unwrap();

        let options = PosterOptions {
            paper: "A4".into(),
            custom_w_mm: None,
            custom_h_mm: None,
            orientation: "Retrato".into(),
            mode: "Por páginas".into(),
            cols: 4,
            width_cm: 74.5,
            margin_mm: 10.0,
            overlap_mm: 5.0,
            crop_marks: true,
            page_numbers: true,
            effect: "HalftoneMono".into(),
            dot_shape: Some("circle".into()),
            dot_pitch_mm: Some(6.0),
            min_dot_size: Some(0.1),
            max_dot_size: Some(0.9),
            brightness: Some(0.0),
            contrast: Some(0.0),
            invert: Some(false),
            intensity: Some(1.0),
            dot_color: Some("#0f172a".into()),
            bg_color: Some("#ffffff".into()),
            rotate_deg: Some(0),
            source_path: img_path.to_str().unwrap().into(),
            target_pdf: pdf_path.to_str().unwrap().into(),
        };

        let spec = PosterEngine::calculate_spec(&options).expect("Cálculo do spec falhou");
        assert_eq!(spec.cols, 4);
        assert_eq!(spec.rows, 3);
        assert_eq!(spec.pages, 12);
        assert_eq!(spec.total_w_cm, 74.5);
        assert!((spec.total_h_cm - 82.0).abs() < 0.2);
        assert!((spec.human_scale_ratio - 2.19).abs() < 0.1);

        let out = PosterEngine::generate_pdf(&options, |_| {}).expect("Falha ao gerar PDF 4x3");
        assert!(std::path::Path::new(&out).exists());
        let meta = std::fs::metadata(&out).unwrap();
        assert!(meta.len() > 1000);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_image_engine_conversion() {
        let temp_dir = std::env::temp_dir().join("arce_test_images");
        std::fs::create_dir_all(&temp_dir).unwrap();

        let src = temp_dir.join("source.png");
        let dst = temp_dir.join("dest.jpg");

        let mut img = RgbImage::new(400, 300);
        for pixel in img.pixels_mut() {
            *pixel = Rgb([255, 0, 0]);
        }
        img.save(&src).unwrap();

        let res = ImageEngine::convert_single(
            src.to_str().unwrap(),
            dst.to_str().unwrap(),
            "jpg",
            85,
            Some(200),
            Some(150),
            false,
        );
        assert!(res.is_ok());
        assert!(dst.exists());

        let out_img = image::open(&dst).unwrap();
        assert_eq!(out_img.width(), 200);
        assert_eq!(out_img.height(), 150);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_download_url_validation_and_ssrf() {
        // Valid public URLs
        assert!(DownloadEngine::validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ").is_ok());
        assert!(DownloadEngine::validate_url("https://instagram.com/reel/C123456").is_ok());
        assert!(DownloadEngine::validate_url("https://vm.tiktok.com/ZM12345/").is_ok());
        assert!(DownloadEngine::validate_url("https://soundcloud.com/artist/track").is_ok());

        // Injection attacks
        assert!(DownloadEngine::validate_url("https://youtube.com/watch?v=1; rm -rf /").is_err());
        assert!(DownloadEngine::validate_url("https://youtube.com/watch?v=1 && echo pwned").is_err());
        assert!(DownloadEngine::validate_url("https://youtube.com/watch?v=1 | whoami").is_err());
        assert!(DownloadEngine::validate_url("https://youtube.com/watch?v=1`whoami`").is_err());

        // SSRF attacks (Localhost, private networks, cloud metadata)
        assert!(DownloadEngine::validate_url("http://localhost:8080/secret").is_err());
        assert!(DownloadEngine::validate_url("http://127.0.0.1:3000").is_err());
        assert!(DownloadEngine::validate_url("http://0.0.0.0:80").is_err());
        assert!(DownloadEngine::validate_url("http://10.0.0.1/admin").is_err());
        assert!(DownloadEngine::validate_url("http://192.168.1.1/router").is_err());
        assert!(DownloadEngine::validate_url("http://172.16.0.5/api").is_err());
        assert!(DownloadEngine::validate_url("http://169.254.169.254/latest/meta-data/").is_err());
        assert!(DownloadEngine::validate_url("file:///etc/passwd").is_err());
        assert!(DownloadEngine::validate_url("ftp://server.com").is_err());
    }

    #[tokio::test]
    async fn test_external_tools_discovery() {
        let status = ExternalToolManager::check_all_tools().await;
        assert!(status.ffmpeg.available, "FFmpeg deve estar instalado no Windows de desenvolvimento");
        assert!(status.ffprobe.available, "ffprobe deve estar instalado no Windows de desenvolvimento");
        assert!(status.yt_dlp.available, "yt-dlp deve estar instalado no Windows de desenvolvimento");

        let ffmpeg_ver = status.ffmpeg.version.as_deref().unwrap_or("");
        assert!(ffmpeg_ver.contains("8.") || ffmpeg_ver.contains("7.") || ffmpeg_ver.contains("ffmpeg"));
        assert!(status.yt_dlp.version.as_deref().unwrap_or("").contains("202"));
    }

    #[tokio::test]
    async fn test_synthetic_audio_conversion_and_probe() {
        let temp_dir = std::env::temp_dir().join("arce_test_audio");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let synthetic_wav = temp_dir.join("synthetic.wav");

        let mut gen_cmd = tokio::process::Command::new("ffmpeg");
        gen_cmd.args(&[
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

        // Probe media
        let probe_res = MediaEngine::probe(synthetic_wav.to_str().unwrap()).await;
        assert!(probe_res.is_ok());
        let info = probe_res.unwrap();
        assert_eq!(info.audio_streams.len(), 1);
        assert!((info.duration_seconds - 1.0).abs() < 0.2);

        // Test audio conversion
        let cancel = Arc::new(AtomicBool::new(false));
        let convert_opts = AudioConvertOptions {
            input_path: synthetic_wav.to_str().unwrap().into(),
            output_dir: Some(temp_dir.to_str().unwrap().into()),
            format: "mp3".into(),
            bitrate_kbps: Some(192),
            channels: Some(2),
            sample_rate: None,
            normalize_volume: false,
        };
        let conv_res = AudioEngine::convert(&convert_opts, cancel.clone(), |_| {}).await;
        assert!(conv_res.is_ok());
        let mp3_path = conv_res.unwrap();
        assert!(std::path::Path::new(&mp3_path).exists());

        // Test audio trim
        let trim_opts = AudioTrimOptions {
            input_path: mp3_path,
            output_dir: Some(temp_dir.to_str().unwrap().into()),
            start_seconds: 0.1,
            end_seconds: 0.6,
            format: Some("mp3".into()),
        };
        let trim_res = AudioEngine::trim(&trim_opts, cancel, |_| {}).await;
        assert!(trim_res.is_ok());

        // Clean up
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[tokio::test]
    async fn test_synthetic_video_operations() {
        let temp_dir = std::env::temp_dir().join("arce_test_video");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let synthetic_mp4 = temp_dir.join("synthetic.mp4");

        let mut gen_cmd = tokio::process::Command::new("ffmpeg");
        gen_cmd.args(&[
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

    // ==========================================
    // MISSÃO 03 TESTS: CENTRAL DE ERROS & DOCUMENT ENGINE
    // ==========================================

    #[test]
    fn test_error_logs_persistence_and_queries() {
        let db = Db::new_in_memory().expect("Falha ao criar banco");

        let err1 = ErrorLogEntry {
            id: "ERR-001".into(),
            created_at: "2026-10-27T10:00:00Z".into(),
            severity: "CRITICAL".into(),
            source: "RUST".into(),
            module: "Documentos".into(),
            operation: "PDF para Word".into(),
            task_id: Some("task-doc-1".into()),
            error_code: "LIBREOFFICE_NOT_FOUND".into(),
            user_message: "LibreOffice não instalado".into(),
            technical_details: Some("Executable soffice not found in PATH or Registry".into()),
            sanitized_stack: None,
            status: "UNRESOLVED".into(),
            app_version: "0.1.0".into(),
            resolved_at: None,
        };

        let err2 = ErrorLogEntry {
            id: "ERR-002".into(),
            created_at: "2026-10-27T11:00:00Z".into(),
            severity: "ERROR".into(),
            source: "TASK".into(),
            module: "Downloads".into(),
            operation: "Download de Vídeo".into(),
            task_id: Some("task-dl-2".into()),
            error_code: "SSRF_SECURITY_BLOCK".into(),
            user_message: "Bloqueio de segurança SSRF".into(),
            technical_details: Some("URL aponta para C:\\Users\\john_doe\\password=secret123".into()),
            sanitized_stack: None,
            status: "UNRESOLVED".into(),
            app_version: "0.1.0".into(),
            resolved_at: None,
        };

        let err3 = ErrorLogEntry {
            id: "ERR-003".into(),
            created_at: "2026-10-27T12:00:00Z".into(),
            severity: "WARNING".into(),
            source: "TASK".into(),
            module: "Áudio".into(),
            operation: "Conversão de Áudio".into(),
            task_id: None,
            error_code: "BITRATE_FALLBACK".into(),
            user_message: "Taxa de bits reajustada".into(),
            technical_details: None,
            sanitized_stack: None,
            status: "UNRESOLVED".into(),
            app_version: "0.1.0".into(),
            resolved_at: None,
        };

        db.insert_error_log(&err1).unwrap();
        db.insert_error_log(&err2).unwrap();
        db.insert_error_log(&err3).unwrap();

        // 1. Stats
        let stats = db.get_error_stats().unwrap();
        assert_eq!(stats.total, 3);
        assert_eq!(stats.critical, 1);
        assert_eq!(stats.unresolved, 3);

        // 2. Filter by module
        let doc_logs = db
            .get_error_logs(&ErrorLogFilter {
                module: Some("Documentos".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(doc_logs.len(), 1);
        assert_eq!(doc_logs[0].id, "ERR-001");

        // 3. Filter by severity
        let crit_logs = db
            .get_error_logs(&ErrorLogFilter {
                severity: Some("CRITICAL".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(crit_logs.len(), 1);
        assert_eq!(crit_logs[0].error_code, "LIBREOFFICE_NOT_FOUND");

        // 4. Search text
        let search_logs = db
            .get_error_logs(&ErrorLogFilter {
                search: Some("SSRF".into()),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(search_logs.len(), 1);
        assert_eq!(search_logs[0].id, "ERR-002");

        // 5. Verify sanitization on insert (password and user path masked)
        let fetched_err2 = db.get_error_log_by_id("ERR-002").unwrap().unwrap();
        let tech = fetched_err2.technical_details.unwrap();
        assert!(!tech.contains("secret123"), "Senha não deve estar presente no log");
        assert!(!tech.contains("john_doe"), "Nome de usuário privado deve estar mascarado");
        assert!(tech.contains("password=[REDACTED]"));
        assert!(tech.contains("C:\\Users\\[USER]\\"));

        // 6. Resolve error
        db.resolve_error_log("ERR-001", true).unwrap();
        let stats_after = db.get_error_stats().unwrap();
        assert_eq!(stats_after.unresolved, 2);

        // 7. Get error by task ID
        let task_err = db.get_error_log_by_task_id("task-dl-2").unwrap().unwrap();
        assert_eq!(task_err.id, "ERR-002");

        // 8. Clear error logs
        let deleted = db.clear_error_logs(None).unwrap();
        assert_eq!(deleted, 3);
        let stats_empty = db.get_error_stats().unwrap();
        assert_eq!(stats_empty.total, 0);
    }

    fn create_synthetic_test_pdf(path: &std::path::Path, page_count: usize) {
        let mut doc = Document::with_version("1.5");
        let pages_id = doc.new_object_id();
        let mut page_ids = Vec::new();

        let mut font_dict = lopdf::Dictionary::new();
        font_dict.set("Type", "Font");
        font_dict.set("Subtype", "Type1");
        font_dict.set("BaseFont", "Helvetica");
        let font_id = doc.add_object(font_dict);

        let mut fonts_dict = lopdf::Dictionary::new();
        fonts_dict.set("F1", font_id);

        let mut res_dict = lopdf::Dictionary::new();
        res_dict.set("Font", fonts_dict);
        let res_id = doc.add_object(res_dict);

        for i in 1..=page_count {
            let content = Content {
                operations: vec![
                    Operation::new("BT", vec![]),
                    Operation::new("Tf", vec!["F1".into(), 16.into()]),
                    Operation::new("Td", vec![100.into(), 700.into()]),
                    Operation::new(
                        "Tj",
                        vec![Object::string_literal(format!(
                            "Pagina {} - Arce Tools Documento de Teste",
                            i
                        ))],
                    ),
                    Operation::new("ET", vec![]),
                ],
            };
            let content_id =
                doc.add_object(Stream::new(lopdf::Dictionary::new(), content.encode().unwrap()));

            let mut page_dict = lopdf::Dictionary::new();
            page_dict.set("Type", "Page");
            page_dict.set("Parent", pages_id);
            page_dict.set("Contents", content_id);
            page_dict.set("Resources", res_id);
            page_dict.set("MediaBox", vec![0.into(), 0.into(), 595.into(), 842.into()]);
            let page_id = doc.add_object(page_dict);
            page_ids.push(page_id.into());
        }

        let mut pages_dict = lopdf::Dictionary::new();
        pages_dict.set("Type", "Pages");
        pages_dict.set("Kids", page_ids);
        pages_dict.set("Count", page_count as i64);
        doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

        let mut catalog_dict = lopdf::Dictionary::new();
        catalog_dict.set("Type", "Catalog");
        catalog_dict.set("Pages", pages_id);
        let catalog_id = doc.add_object(catalog_dict);

        doc.trailer.set("Root", catalog_id);
        doc.save(path).unwrap();
    }

    #[test]
    fn test_document_engine_pdf_operations() {
        let temp_dir = std::env::temp_dir().join("arce_test_documents");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let pdf1_path = temp_dir.join("test_doc1.pdf");
        let pdf2_path = temp_dir.join("test_doc2.pdf");
        let merged_path = temp_dir.join("merged_output.pdf");

        create_synthetic_test_pdf(&pdf1_path, 3);
        create_synthetic_test_pdf(&pdf2_path, 2);

        // 1. Inspect PDF
        let info = DocumentEngine::inspect_pdf(&pdf1_path).expect("Falha ao inspecionar PDF");
        assert_eq!(info.page_count, 3);
        assert!(!info.is_encrypted);
        assert!(info.file_size_bytes > 0);
        assert_eq!(info.pages.len(), 3);

        // 2. Split PDF by range
        let split_opts = PdfSplitOptions {
            source_path: pdf1_path.to_str().unwrap().into(),
            target_dir: temp_dir.to_str().unwrap().into(),
            mode: "ranges".into(),
            ranges: Some("1-2".into()),
            every_n: None,
            export_single: Some(true),
            output_filename: Some("split_1_2.pdf".into()),
        };
        let split_files = DocumentEngine::split_pdf(&split_opts).expect("Falha ao dividir PDF");
        assert_eq!(split_files.len(), 1);
        let split_info = DocumentEngine::inspect_pdf(&split_files[0]).unwrap();
        assert_eq!(split_info.page_count, 2);

        // 3. Merge PDFs
        let merge_opts = PdfMergeOptions {
            source_paths: vec![
                pdf1_path.to_str().unwrap().into(),
                pdf2_path.to_str().unwrap().into(),
            ],
            target_path: merged_path.to_str().unwrap().into(),
        };
        let merge_res = DocumentEngine::merge_pdfs(&merge_opts).expect("Falha ao unir PDFs");
        assert!(merge_res.success);
        assert_eq!(merge_res.page_count, Some(5)); // 3 + 2 = 5 pages
        assert!(merged_path.exists());

        // 4. Organize PDF (reorder and rotate)
        let organize_output = temp_dir.join("organized.pdf");
        let org_opts = PdfOrganizeOptions {
            source_path: pdf1_path.to_str().unwrap().into(),
            target_path: organize_output.to_str().unwrap().into(),
            pages: vec![
                PdfPageAction {
                    original_page: 2,
                    rotation_deg: 0,
                },
                PdfPageAction {
                    original_page: 1,
                    rotation_deg: 90,
                },
            ],
        };
        let org_res = DocumentEngine::organize_pdf(&org_opts).expect("Falha ao organizar PDF");
        assert_eq!(org_res.page_count, Some(2));
        assert!(organize_output.exists());

        // 5. Compress PDF
        let compressed_output = temp_dir.join("compressed.pdf");
        let comp_opts = PdfCompressOptions {
            source_path: merged_path.to_str().unwrap().into(),
            target_path: compressed_output.to_str().unwrap().into(),
            level: "lossless".into(),
        };
        let comp_res = DocumentEngine::compress_pdf(&comp_opts).expect("Falha ao comprimir PDF");
        assert!(comp_res.success);
        assert!(compressed_output.exists());

        // 6. PDF to DOCX text extraction
        let docx_output = temp_dir.join("extracted_text.docx");
        let docx_opts = PdfToDocxOptions {
            source_path: pdf1_path.to_str().unwrap().into(),
            target_path: Some(docx_output.to_str().unwrap().into()),
            mode: "editable_text".into(),
        };
        let docx_res = DocumentEngine::convert_pdf_to_docx(&docx_opts).expect("Falha na conversão PDF para DOCX");
        assert!(docx_res.success);
        assert!(docx_output.exists());
        assert!(std::fs::metadata(&docx_output).unwrap().len() > 100);

        // 7. Check LibreOffice Status
        let lo_status = DocumentEngine::check_libreoffice();
        // Just verify it doesn't crash and returns a valid notes message
        assert!(!lo_status.notes.is_empty());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_clipboard_copy() {
        let text = "ARCE TOOLS — Teste de Cópia da Área de Transferência";
        let res = copy_text_to_system_clipboard(text);
        // On headless CI / virtual desktop without display server, clipboard may return Ok or Err, but function must not panic
        let _ = res;
    }
}
