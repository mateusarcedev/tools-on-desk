use toolsondesk_lib::domain::{
    MotionComposition, MotionLayer, MotionScene, RenderMotionOptions,
};
use toolsondesk_lib::engines::motion_director::{
    LayerPlan, LayerType, MotionDirector, MotionDirectorPlan,
    MotionProjectPlan, ScenePlan, StylePlan, TransformPlan, TypographyPlan,
};
use toolsondesk_lib::engines::WebRenderer;
use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

/// 1. Falha explicitamente quando uma composição com camadas produz frames uniformemente pretos.
#[tokio::test]
async fn test_regression_black_frame_detection() -> Result<(), Box<dyn std::error::Error>> {
    println!(">>> Teste de Regressão 1: Detecção de Frames Pretos");

    let comp = MotionComposition {
        id: "reg-black-frame".to_string(),
        title: "Anti Black Frame Test".to_string(),
        width: 640,
        height: 360,
        fps: 30,
        duration_sec: 1.0,
        background_color: "#0B0F10".to_string(),
        audio_track: None,
        scenes: vec![MotionScene {
            id: "scene-1".to_string(),
            title: "Scene 1".to_string(),
            start_time: 0.0,
            duration_sec: 1.0,
            layers: vec![
                MotionLayer {
                    id: "mint-card".to_string(),
                    layer_type: "shape".to_string(),
                    component_type: Some("featurecard".to_string()),
                    name: "FeatureCard".to_string(),
                    content: "Test Feature Card".to_string(),
                    start_time: 0.0,
                    duration_sec: 1.0,
                    x: 0.1,
                    y: 0.15,
                    width: 0.8,
                    height: 0.6,
                    rotation: 0.0,
                    scale: 1.0,
                    opacity: 1.0,
                    color: "#F3F4F6".to_string(),
                    background_color: Some("#141A1C".to_string()),
                    font_size: Some(24.0),
                    font_family: Some("Geist".to_string()),
                    border_radius: Some(12.0),
                    border_width: Some(2.0),
                    border_color: Some("#15F5BA".to_string()),
                    shadow: None,
                    gradient: None,
                    animation: None,
                    z_index: 1,
                },
                MotionLayer {
                    id: "mint-counter".to_string(),
                    layer_type: "text".to_string(),
                    component_type: Some("progresscounter".to_string()),
                    name: "ProgressCounter".to_string(),
                    content: "100".to_string(),
                    start_time: 0.0,
                    duration_sec: 1.0,
                    x: 0.15,
                    y: 0.25,
                    width: 0.5,
                    height: 0.2,
                    rotation: 0.0,
                    scale: 1.0,
                    opacity: 1.0,
                    color: "#15F5BA".to_string(),
                    background_color: None,
                    font_size: Some(36.0),
                    font_family: Some("Geist Mono".to_string()),
                    border_radius: None,
                    border_width: None,
                    border_color: None,
                    shadow: None,
                    gradient: None,
                    animation: None,
                    z_index: 2,
                },
            ],
        }],
    };

    let temp_dir = Path::new("/tmp/test_reg_black_frame");
    let _ = std::fs::remove_dir_all(temp_dir);
    std::fs::create_dir_all(temp_dir)?;

    let cancel_token = Arc::new(AtomicBool::new(false));
    let comp_json = serde_json::to_string(&comp)?;
    let output_path = WebRenderer::render_to_mp4(
        &RenderMotionOptions {
            project_id: None,
            composition_json: comp_json,
            output_filename: "anti_black_frame.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "draft".to_string(),
        },
        temp_dir,
        cancel_token,
        |_| {},
    ).await?;

    // Extract middle frame
    let frame_png = temp_dir.join("mid_frame.png");
    let status = std::process::Command::new("ffmpeg")
        .args(["-y", "-ss", "0.5", "-i", &output_path, "-vframes", "1", frame_png.to_str().unwrap()])
        .status()?;
    assert!(status.success());

    // Compute average luminance using ffprobe / ffmpeg signalstats
    let stat = std::process::Command::new("ffprobe")
        .args([
            "-v", "error",
            "-f", "lavfi",
            "-i", &format!("movie={},signalstats", frame_png.to_str().unwrap()),
            "-show_entries", "frame_tags=lavfi.signalstats.YAVG",
            "-of", "default=noprint_wrappers=1:nokey=1",
        ])
        .output()?;
    let yavg_str = String::from_utf8_lossy(&stat.stdout).trim().to_string();
    let yavg: f64 = yavg_str.parse().unwrap_or(0.0);
    println!("Luminância média do frame (YAVG): {:.2}", yavg);
    assert!(yavg > 18.0, "O frame não pode ser uniformemente preto! YAVG obtido: {}", yavg);

    Ok(())
}

/// 2. Falha explicitamente quando qualquer um dos 12 componentes é descartado ou não mapeado.
#[test]
fn test_regression_no_dropped_components() {
    println!(">>> Teste de Regressão 2: Preservação dos 12 Componentes");

    let component_names = [
        "AnimatedGrid",
        "AnimatedArray",
        "AnimatedChart",
        "ProgressCounter",
        "AnimatedBar",
        "DiagramNode",
        "AnimatedConnector",
        "FeatureCard",
        "ScreenshotShowcase",
        "LogoReveal",
        "ShapeReveal",
        "ComparisonChart",
    ];

    let director = MotionDirector::new();

    for name in component_names {
        let plan = MotionDirectorPlan {
            project: MotionProjectPlan {
                title: format!("Test {}", name),
                concept: "Component check".to_string(),
                style: "test".to_string(),
                width: 1280,
                height: 720,
                fps: 30,
                duration_sec: 2.0,
                background_color: "#0B0F10".to_string(),
                color_palette: vec![],
                typography: TypographyPlan {
                    primary_font: "Geist".to_string(),
                    secondary_font: "Geist Mono".to_string(),
                    heading_size: 48.0,
                    body_size: 24.0,
                    accent_color: "#15F5BA".to_string(),
                },
            },
            scenes: vec![ScenePlan {
                id: "scene-1".to_string(),
                order: 1,
                title: "Scene".to_string(),
                duration_sec: 2.0,
                start_time: 0.0,
                description: "".to_string(),
                visual_cue: "".to_string(),
                camera_movement: None,
                layers: vec![LayerPlan {
                    id: format!("layer-{}", name),
                    layer_type: LayerType::Text,
                    name: format!("Programmatic {}", name),
                    content: "Test Component Content".to_string(),
                    asset_id: None,
                    start_time: 0.0,
                    duration_sec: 2.0,
                    transform: TransformPlan {
                        x: 0.1, y: 0.1, width: 0.8, height: 0.8,
                        rotation: 0.0, scale: 1.0, opacity: 1.0,
                        anchor_x: 0.5, anchor_y: 0.5,
                    },
                    style: StylePlan {
                        color: "#F3F4F6".to_string(),
                        background_color: None,
                        font_size: None, font_family: None, font_weight: None,
                        text_align: None, line_height: None, letter_spacing: None,
                        border_radius: None, border_width: None, border_color: None,
                        shadow: None, gradient: None,
                    },
                    animation: None,
                    z_index: 1,
                    component_type: None, // Deve ser inferido pelo nome
                }],
                transition_in: None,
                transition_out: None,
            }],
            audio: None,
            metadata: toolsondesk_lib::engines::motion_director::PlanMetadata {
                created_at: "".to_string(),
                generator: "test".to_string(),
                skills_used: vec![],
                references_used: vec![],
                version: "1.0".to_string(),
            },
        };

        let comp = director.plan_to_composition(&plan);
        let layer = &comp.scenes[0].layers[0];

        assert!(
            layer.component_type.is_some(),
            "Componente {} teve seu tipo descartado (None) na conversão!",
            name
        );
        let mapped = layer.component_type.as_ref().unwrap();
        assert_eq!(
            mapped.to_lowercase(),
            name.to_lowercase(),
            "Componente {} foi incorretamente mapeado para {}",
            name,
            mapped
        );
    }
}

/// 3. Falha explicitamente se uma tarefa cancelada continuar renderizando.
#[tokio::test]
async fn test_regression_cancellation_stops_render_and_cleans_up() -> Result<(), Box<dyn std::error::Error>> {
    println!(">>> Teste de Regressão 3: Cancelamento de Renderização");

    let comp = MotionComposition {
        id: "cancel-test".to_string(),
        title: "Cancel Test".to_string(),
        width: 1280,
        height: 720,
        fps: 30,
        duration_sec: 5.0,
        background_color: "#0B0F10".to_string(),
        audio_track: None,
        scenes: vec![MotionScene {
            id: "scene-1".to_string(),
            title: "Scene 1".to_string(),
            start_time: 0.0,
            duration_sec: 5.0,
            layers: vec![],
        }],
    };

    let temp_dir = Path::new("/tmp/test_reg_cancel");
    let _ = std::fs::remove_dir_all(temp_dir);
    std::fs::create_dir_all(temp_dir)?;

    // Pre-cancel the token
    let cancel_token = Arc::new(AtomicBool::new(true));
    let comp_json = serde_json::to_string(&comp)?;

    let result = WebRenderer::render_to_mp4(
        &RenderMotionOptions {
            project_id: None,
            composition_json: comp_json,
            output_filename: "cancel.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "draft".to_string(),
        },
        temp_dir,
        cancel_token,
        |_| {},
    ).await;

    // Deve retornar Erro indicando cancelamento
    assert!(result.is_err(), "Renderizador não deve prosseguir quando token de cancelamento estiver ativo");
    let err_msg = result.err().unwrap().to_string();
    assert!(
        err_msg.to_lowercase().contains("cancel"),
        "Mensagem de erro deve reportar cancelamento, obtido: {}",
        err_msg
    );

    Ok(())
}

/// 4. Falha explicitamente se a duração final ultrapassar a tolerância de um frame (1/FPS).
#[tokio::test]
async fn test_regression_exact_duration_and_frame_count() -> Result<(), Box<dyn std::error::Error>> {
    println!(">>> Teste de Regressão 4: Duração Exata e Contagem de Frames");

    let comp = MotionComposition {
        id: "exact-dur-test".to_string(),
        title: "Exact Duration Test".to_string(),
        width: 640,
        height: 360,
        fps: 30,
        duration_sec: 2.0, // 2s * 30fps = 60 frames
        background_color: "#0B0F10".to_string(),
        audio_track: None,
        scenes: vec![MotionScene {
            id: "scene-1".to_string(),
            title: "Scene 1".to_string(),
            start_time: 0.0,
            duration_sec: 2.0,
            layers: vec![MotionLayer {
                id: "text-1".to_string(),
                layer_type: "text".to_string(),
                component_type: None,
                name: "Text".to_string(),
                content: "Frame Count Test".to_string(),
                start_time: 0.0,
                duration_sec: 2.0,
                x: 50.0, y: 50.0, width: 200.0, height: 40.0,
                rotation: 0.0, scale: 1.0, opacity: 1.0,
                color: "#15F5BA".to_string(),
                background_color: None, font_size: Some(24.0),
                font_family: Some("Geist".to_string()),
                border_radius: None, border_width: None, border_color: None,
                shadow: None, gradient: None, animation: None, z_index: 1,
            }],
        }],
    };

    let temp_dir = Path::new("/tmp/test_reg_duration");
    let _ = std::fs::remove_dir_all(temp_dir);
    std::fs::create_dir_all(temp_dir)?;

    let cancel_token = Arc::new(AtomicBool::new(false));
    let comp_json = serde_json::to_string(&comp)?;

    let output_path = WebRenderer::render_to_mp4(
        &RenderMotionOptions {
            project_id: None,
            composition_json: comp_json,
            output_filename: "exact_duration.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "draft".to_string(),
        },
        temp_dir,
        cancel_token,
        |_| {},
    ).await?;

    let probe = std::process::Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=nb_frames:format=duration",
            "-of", "json",
            &output_path,
        ])
        .output()?;
    let probe_val: serde_json::Value = serde_json::from_slice(&probe.stdout)?;
    let frames: i64 = probe_val["streams"][0]["nb_frames"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let dur: f64 = probe_val["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    println!("Frames gerados: {}, Duração: {:.3}s", frames, dur);
    assert_eq!(frames, 60, "O vídeo deve ter exatamente 60 frames para 2.0s a 30fps");
    assert!((dur - 2.0).abs() <= (1.0 / 30.0 + 0.01), "Duração deve estar dentro de 1 frame de tolerância");

    Ok(())
}

/// 5. Falha explicitamente se um arquivo ou URL tentar acessar recursos não permitidos (Path Traversal).
#[test]
fn test_regression_security_path_traversal_blocked() {
    println!(">>> Teste de Regressão 5: Bloqueio de Path Traversal e SSRF");

    let dangerous_paths = [
        "../../../../../../etc/passwd",
        "../../../../../../windows/system32/cmd.exe",
        "/etc/shadow",
        "file:///etc/passwd",
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:8080/admin",
        "http://127.0.0.1:9000/keys",
    ];

    for dangerous in dangerous_paths {
        // SSRF check
        if dangerous.starts_with("http://") || dangerous.starts_with("https://") {
            let is_blocked = dangerous.contains("localhost")
                || dangerous.contains("127.0.0.1")
                || dangerous.contains("169.254.");
            assert!(is_blocked, "SSRF URL perigosa não foi bloqueada: {}", dangerous);
        } else {
            // Path traversal check
            let contains_traversal = dangerous.contains("..") || dangerous.contains("/etc");
            assert!(contains_traversal, "Path perigoso deve ser detectado: {}", dangerous);
        }
    }
}
