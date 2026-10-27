#[cfg(test)]
mod tests {
    use crate::domain::{PosterOptions, Task, TaskStatus};
    use crate::engines::{ImageEngine, PosterEngine};
    use crate::storage::Db;
    use image::{Rgb, RgbImage};

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
        assert_eq!(res.height, 150); // Preserved aspect ratio 4:3 -> 200:150
        assert!(out_jpg.exists());
        assert!(res.output_size > 0);

        let _ = std::fs::remove_file(src_img);
        let _ = std::fs::remove_file(out_jpg);
    }
}
