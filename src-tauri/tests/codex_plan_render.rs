use toolsondesk_lib::engines::{WebRenderer, MotionDirector};
use toolsondesk_lib::engines::motion_director::MotionDirectorPlan;
use toolsondesk_lib::domain::RenderMotionOptions;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[tokio::test]
async fn test_codex_promotional_video() -> Result<(), Box<dyn std::error::Error>> {
    println!(">>> Etapa 8: Homologação com Agente Real Codex (Promo 20s, 600 frames)...");

    // Locate codex_promo_plan.json
    let plan_path = if Path::new("test_assets/codex_promo_plan.json").exists() {
        PathBuf::from("test_assets/codex_promo_plan.json")
    } else if Path::new("../test_assets/codex_promo_plan.json").exists() {
        PathBuf::from("../test_assets/codex_promo_plan.json")
    } else {
        panic!("test_assets/codex_promo_plan.json not found!");
    };

    let plan_content = std::fs::read_to_string(&plan_path)?;
    let plan: MotionDirectorPlan = serde_json::from_str(&plan_content)?;

    assert_eq!(plan.scenes.len(), 4, "Codex plan must have 4 distinct scenes");
    assert_eq!(plan.project.duration_sec, 20.0, "Codex plan must be 20.0s");

    let director = MotionDirector::new();
    let composition = director.plan_to_composition(&plan);

    println!("Plano Codex convertido para MotionComposition:");
    println!("- Título: {}", composition.title);
    println!("- Resolução: {}x{}", composition.width, composition.height);
    println!("- FPS: {}", composition.fps);
    println!("- Cenas: {}", composition.scenes.len());
    let total_layers: usize = composition.scenes.iter().map(|s| s.layers.len()).sum();
    println!("- Total de Camadas: {}", total_layers);
    assert!(total_layers >= 15, "Codex plan must have rich multi-layer composition");

    // Output directory in workspace
    let export_dir = Path::new("exports/mission_10_3/promo");
    std::fs::create_dir_all(export_dir)?;

    // Also persist plan and composition JSON
    std::fs::write(export_dir.join("toolsondesk_promo_plan.json"), &plan_content)?;
    let comp_json = serde_json::to_string_pretty(&composition)?;
    std::fs::write(export_dir.join("toolsondesk_promo_composition.json"), &comp_json)?;

    let cancel_token = Arc::new(AtomicBool::new(false));
    let render_opts = RenderMotionOptions {
        project_id: None,
        composition_json: comp_json,
        output_filename: "toolsondesk_promo_20s.mp4".to_string(),
        format: "mp4".to_string(),
        quality: "high".to_string(),
    };

    let output_mp4 = WebRenderer::render_to_mp4(
        &render_opts,
        export_dir,
        cancel_token,
        |p| {
            let pct = (p * 100.0) as u32;
            if pct % 20 == 0 || pct == 100 {
                println!("Progresso da renderização promo: {:.1}%", p * 100.0);
            }
        },
    ).await?;

    println!("Vídeo renderizado com sucesso em: {}", output_mp4);
    let meta = std::fs::metadata(&output_mp4)?;
    assert!(meta.len() > 100_000, "MP4 file size must be > 100KB, got {}", meta.len());
    println!("Tamanho do MP4 promo gerado: {} bytes", meta.len());

    // FFprobe verification
    let probe = std::process::Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,nb_frames:format=duration",
            "-of", "json",
            &output_mp4,
        ])
        .output()?;
    let probe_stdout = String::from_utf8_lossy(&probe.stdout);
    println!("FFprobe Resultado Promo:\n{}", probe_stdout);

    let probe_val: serde_json::Value = serde_json::from_str(&probe_stdout)?;
    let stream = &probe_val["streams"][0];
    assert_eq!(stream["width"], 1920, "Largura deve ser 1920");
    assert_eq!(stream["height"], 1080, "Altura deve ser 1080");
    assert_eq!(stream["r_frame_rate"], "30/1", "FPS deve ser 30");

    let dur: f64 = probe_val["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);
    assert!((dur - 20.0).abs() <= 0.2, "Duração deve ser ~20s, obtido {:.2}s", dur);

    // Extract stills for the 4 scenes
    let stills_dir = export_dir.join("stills");
    std::fs::create_dir_all(&stills_dir)?;

    let scene_timestamps = [
        ("scene_01_hook.png", "2.0"),
        ("scene_02_interface.png", "7.5"),
        ("scene_03_studios.png", "12.5"),
        ("scene_04_cta.png", "17.5"),
    ];

    for (name, ts) in scene_timestamps {
        let still_path = stills_dir.join(name);
        let status = std::process::Command::new("ffmpeg")
            .args([
                "-y",
                "-ss", ts,
                "-i", &output_mp4,
                "-vframes", "1",
                "-q:v", "2",
                still_path.to_str().unwrap(),
            ])
            .status()?;
        assert!(status.success(), "Falha ao extrair still para {}", name);
        let still_meta = std::fs::metadata(&still_path)?;
        assert!(still_meta.len() > 20_000, "Still {} deve conter conteúdo visual real (>20KB), obtido {}", name, still_meta.len());
        println!("Still salvo: {:?} ({} bytes)", still_path, still_meta.len());
    }

    // Generate contact sheet (2x2 grid)
    let contact_sheet_path = export_dir.join("contact_sheet_promo_4_scenes.png");
    let status = std::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i", stills_dir.join("scene_01_hook.png").to_str().unwrap(),
            "-i", stills_dir.join("scene_02_interface.png").to_str().unwrap(),
            "-i", stills_dir.join("scene_03_studios.png").to_str().unwrap(),
            "-i", stills_dir.join("scene_04_cta.png").to_str().unwrap(),
            "-filter_complex",
            "[0:v][1:v]hstack=inputs=2[top];[2:v][3:v]hstack=inputs=2[bottom];[top][bottom]vstack=inputs=2,scale=1920:1080",
            "-q:v", "2",
            contact_sheet_path.to_str().unwrap(),
        ])
        .status()?;
    assert!(status.success(), "Falha ao gerar contact sheet do vídeo promocional");
    println!("Contact sheet promo gerada com sucesso em: {:?}", contact_sheet_path);

    // Mirror artifacts to persistent directory ~/.local/share/ToolsOnDesk/exports/mission_10_3/promo
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let persistent_promo_dir = PathBuf::from(home)
        .join(".local/share/ToolsOnDesk/exports/mission_10_3/promo");
    std::fs::create_dir_all(&persistent_promo_dir)?;
    std::fs::create_dir_all(persistent_promo_dir.join("stills"))?;

    let copy_file = |src: &Path, dst: &Path| -> std::io::Result<()> {
        if src.exists() {
            std::fs::copy(src, dst)?;
        }
        Ok(())
    };

    copy_file(Path::new(&output_mp4), &persistent_promo_dir.join("toolsondesk_promo_20s.mp4"))?;
    copy_file(&export_dir.join("toolsondesk_promo_plan.json"), &persistent_promo_dir.join("toolsondesk_promo_plan.json"))?;
    copy_file(&export_dir.join("toolsondesk_promo_composition.json"), &persistent_promo_dir.join("toolsondesk_promo_composition.json"))?;
    copy_file(&contact_sheet_path, &persistent_promo_dir.join("contact_sheet_promo_4_scenes.png"))?;

    for (name, _) in scene_timestamps {
        copy_file(&stills_dir.join(name), &persistent_promo_dir.join("stills").join(name))?;
    }
    println!("Artefatos persistidos com sucesso em: {:?}", persistent_promo_dir);

    Ok(())
}
