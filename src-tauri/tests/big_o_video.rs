use toolsondesk_lib::domain::RenderMotionOptions;
use toolsondesk_lib::engines::motion_director::{
    AnimationPlan, AnimationTrack, Keyframe, LayerPlan, LayerType, MotionDirectorPlan,
    MotionProjectPlan, ScenePlan, StylePlan, TransformPlan, TransitionPlan, TypographyPlan,
};
use toolsondesk_lib::engines::{MotionDirector, WebRenderer};
use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

#[tokio::test]
async fn test_big_o_educational_video() {
    let plan = MotionDirectorPlan {
        project: MotionProjectPlan {
            title: "Big O Notation Explained".to_string(),
            concept: "Guia visual completo sobre complexidade algorítmica com animações determinísticas em Canvas".to_string(),
            style: "educational".to_string(),
            width: 1080,
            height: 1920,
            fps: 30,
            duration_sec: 60.0,
            background_color: "#0B0F10".to_string(),
            color_palette: vec![
                "#0B0F10".to_string(),
                "#141A1C".to_string(),
                "#15F5BA".to_string(),
                "#F3F4F6".to_string(),
                "#9AA6A8".to_string(),
            ],
            typography: TypographyPlan {
                primary_font: "Geist".to_string(),
                secondary_font: "Geist Mono".to_string(),
                heading_size: 72.0,
                body_size: 32.0,
                accent_color: "#15F5BA".to_string(),
            },
        },
        audio: None,
        metadata: toolsondesk_lib::engines::motion_director::PlanMetadata {
            created_at: "2026-10-31T00:00:00Z".to_string(),
            generator: "local_director".to_string(),
            skills_used: vec!["motion_design".to_string()],
            references_used: vec![],
            version: "1.0".to_string(),
        },
        scenes: vec![
            // Cena 1: Introdução (0.0s - 10.0s)
            ScenePlan {
                id: "scene-01-intro".to_string(),
                order: 1,
                title: "Introdução: O que é Big O?".to_string(),
                duration_sec: 10.0,
                start_time: 0.0,
                description: "Abertura impactante com matriz de dados e definição de complexidade assintótica".to_string(),
                visual_cue: "Grid cibernético pulsando, título centralizado e selo ToolsOnDesk".to_string(),
                camera_movement: None,
                transition_in: None,
                transition_out: Some(TransitionPlan {
                    type_: "wipe".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
                layers: vec![
                    create_layer("s1-grid", LayerType::Text, "animatedgrid", "", 0.0, 10.0, 0.05, 0.05, 0.9, 0.9, 0.3, "#1F292B", 1),
                    create_layer("s1-title", LayerType::Text, "Big O Notation", "Big O Notation", 0.0, 10.0, 0.08, 0.18, 0.84, 0.08, 1.0, "#F3F4F6", 2),
                    create_layer("s1-sub", LayerType::Text, "Complexidade Algorítmica", "Medindo a eficiência de tempo e espaço", 0.5, 9.5, 0.08, 0.26, 0.84, 0.05, 1.0, "#9AA6A8", 3),
                    create_layer("s1-counter", LayerType::Text, "progresscounter", "Análise: 100", 1.0, 9.0, 0.25, 0.42, 0.5, 0.1, 1.0, "#15F5BA", 4),
                    create_layer("s1-logo", LayerType::Text, "logoreveal", "", 1.5, 8.5, 0.25, 0.58, 0.5, 0.28, 1.0, "#15F5BA", 5),
                ],
            },

            // Cena 2: O(1) - Tempo Constante (10.0s - 20.0s)
            ScenePlan {
                id: "scene-02-o1".to_string(),
                order: 2,
                title: "O(1) - Tempo Constante".to_string(),
                duration_sec: 10.0,
                start_time: 10.0,
                description: "Acesso direto por índice em array independente do tamanho dos dados".to_string(),
                visual_cue: "Vetor com ponteiro fixo arr[3] destacando acesso em tempo constante".to_string(),
                camera_movement: None,
                transition_in: None,
                transition_out: Some(TransitionPlan {
                    type_: "slide".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
                layers: vec![
                    create_layer("s2-title", LayerType::Text, "O(1) - Tempo Constante", "O(1) — Acesso Constante", 0.0, 10.0, 0.08, 0.15, 0.84, 0.08, 1.0, "#15F5BA", 1),
                    create_layer("s2-desc", LayerType::Text, "Desc", "Acesso direto à memória por índice: 1 operação", 0.0, 10.0, 0.08, 0.23, 0.84, 0.05, 1.0, "#9AA6A8", 2),
                    create_layer("s2-array", LayerType::Text, "animatedarray", "[4, 12, 28, 42, 65, 88, 99]", 0.0, 10.0, 0.08, 0.36, 0.84, 0.16, 1.0, "#15F5BA", 3),
                    create_layer("s2-counter", LayerType::Text, "progresscounter", "Operações: 1", 0.0, 10.0, 0.25, 0.58, 0.5, 0.1, 1.0, "#15F5BA", 4),
                    create_layer("s2-bar", LayerType::Text, "animatedbar", "Tempo de Execução O(1)", 0.5, 9.5, 0.1, 0.72, 0.8, 0.08, 1.0, "#15F5BA", 5),
                ],
            },

            // Cena 3: O(log n) - Tempo Logarítmico (20.0s - 30.0s)
            ScenePlan {
                id: "scene-03-ologn".to_string(),
                order: 3,
                title: "O(log n) - Tempo Logarítmico".to_string(),
                duration_sec: 10.0,
                start_time: 20.0,
                description: "Busca binária reduzindo o espaço de busca pela metade a cada etapa".to_string(),
                visual_cue: "Vetor ordenado com subdivisão recursiva rápida".to_string(),
                camera_movement: None,
                transition_in: None,
                transition_out: Some(TransitionPlan {
                    type_: "slide".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
                layers: vec![
                    create_layer("s3-title", LayerType::Text, "O(log n)", "O(log n) — Busca Binária", 0.0, 10.0, 0.08, 0.15, 0.84, 0.08, 1.0, "#00D2FF", 1),
                    create_layer("s3-desc", LayerType::Text, "Desc", "A cada comparação o espaço restante cai pela metade", 0.0, 10.0, 0.08, 0.23, 0.84, 0.05, 1.0, "#9AA6A8", 2),
                    create_layer("s3-array", LayerType::Text, "animatedarray", "[1, 3, 7, 15, 23, 38, 55, 72]", 0.0, 10.0, 0.08, 0.36, 0.84, 0.16, 1.0, "#00D2FF", 3),
                    create_layer("s3-counter", LayerType::Text, "progresscounter", "Passos (N=1024): 10", 0.0, 10.0, 0.2, 0.58, 0.6, 0.1, 1.0, "#00D2FF", 4),
                    create_layer("s3-bar", LayerType::Text, "animatedbar", "Eficiência Logarítmica", 0.5, 9.5, 0.1, 0.72, 0.8, 0.08, 1.0, "#00D2FF", 5),
                ],
            },

            // Cena 4: O(n) - Tempo Linear (30.0s - 40.0s)
            ScenePlan {
                id: "scene-04-on".to_string(),
                order: 4,
                title: "O(n) - Tempo Linear".to_string(),
                duration_sec: 10.0,
                start_time: 30.0,
                description: "Busca linear percorrendo cada um dos N elementos da lista".to_string(),
                visual_cue: "Ponteiro varrendo sequencialmente todos os índices de 0 a N".to_string(),
                camera_movement: None,
                transition_in: None,
                transition_out: Some(TransitionPlan {
                    type_: "slide".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
                layers: vec![
                    create_layer("s4-title", LayerType::Text, "O(n) Linear", "O(n) — Varredura Linear", 0.0, 10.0, 0.08, 0.15, 0.84, 0.08, 1.0, "#FFC107", 1),
                    create_layer("s4-desc", LayerType::Text, "Desc", "O tempo cresce proporcionalmente ao tamanho da entrada", 0.0, 10.0, 0.08, 0.23, 0.84, 0.05, 1.0, "#9AA6A8", 2),
                    create_layer("s4-array", LayerType::Text, "animatedarray", "[5, 12, 19, 31, 44, 58, 70, 89]", 0.0, 10.0, 0.08, 0.36, 0.84, 0.16, 1.0, "#FFC107", 3),
                    create_layer("s4-counter", LayerType::Text, "progresscounter", "Iterações: 100", 0.0, 10.0, 0.2, 0.58, 0.6, 0.1, 1.0, "#FFC107", 4),
                    create_layer("s4-bar", LayerType::Text, "animatedbar", "Crescimento Linear Proporcional", 0.0, 10.0, 0.1, 0.72, 0.8, 0.08, 1.0, "#FFC107", 5),
                ],
            },

            // Cena 5: O(n²) - Tempo Quadrático (40.0s - 50.0s)
            ScenePlan {
                id: "scene-05-on2".to_string(),
                order: 5,
                title: "O(n²) - Tempo Quadrático".to_string(),
                duration_sec: 10.0,
                start_time: 40.0,
                description: "Laços aninhados executando operações em matriz bidimensional N x N".to_string(),
                visual_cue: "Grid matricial com iterações em cascata e alta sobrecarga".to_string(),
                camera_movement: None,
                transition_in: None,
                transition_out: Some(TransitionPlan {
                    type_: "slide".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
                layers: vec![
                    create_layer("s5-title", LayerType::Text, "O(n²)", "O(n²) — Laços Aninhados", 0.0, 10.0, 0.08, 0.15, 0.84, 0.08, 1.0, "#FF4D4D", 1),
                    create_layer("s5-desc", LayerType::Text, "Desc", "Dois laços for aninhados: N x N operações", 0.0, 10.0, 0.08, 0.23, 0.84, 0.05, 1.0, "#9AA6A8", 2),
                    create_layer("s5-grid", LayerType::Text, "animatedgrid", "", 0.0, 10.0, 0.1, 0.32, 0.8, 0.25, 0.7, "#FF4D4D", 3),
                    create_layer("s5-counter", LayerType::Text, "progresscounter", "Operações: 10000", 0.0, 10.0, 0.2, 0.62, 0.6, 0.1, 1.0, "#FF4D4D", 4),
                    create_layer("s5-node", LayerType::Text, "diagramnode", "Alerta de Desempenho: Evitar para N grande", 0.0, 10.0, 0.1, 0.75, 0.8, 0.12, 1.0, "#FF4D4D", 5),
                ],
            },

            // Cena 6: Resumo e Comparativo (50.0s - 60.0s)
            ScenePlan {
                id: "scene-06-summary".to_string(),
                order: 6,
                title: "Comparativo de Desempenho".to_string(),
                duration_sec: 10.0,
                start_time: 50.0,
                description: "Gráfico geral de curvas de complexidade e ranking lado a lado".to_string(),
                visual_cue: "Gráfico animado com todas as curvas e barras de comparação completas".to_string(),
                camera_movement: None,
                transition_in: None,
                transition_out: None,
                layers: vec![
                    create_layer("s6-title", LayerType::Text, "Resumo", "Big O: Comparativo Geral", 0.0, 10.0, 0.08, 0.08, 0.84, 0.06, 1.0, "#F3F4F6", 1),
                    create_layer("s6-chart", LayerType::Text, "animatedchart", "", 0.0, 10.0, 0.08, 0.16, 0.84, 0.38, 1.0, "#15F5BA", 2),
                    create_layer("s6-comp", LayerType::Text, "comparisonchart", "", 0.0, 10.0, 0.08, 0.58, 0.84, 0.28, 1.0, "#15F5BA", 3),
                    create_layer("s6-seal", LayerType::Text, "shapereveal", "ToolsOnDesk Creative Studio", 0.5, 9.5, 0.15, 0.88, 0.7, 0.06, 1.0, "#15F5BA", 4),
                ],
            },
        ],
    };

    let composition = MotionDirector::new().plan_to_composition(&plan);
    let output_dir = Path::new("exports/mission_10_3/big_o");
    std::fs::create_dir_all(output_dir).unwrap();
    std::fs::write(output_dir.join("big_o_plan.json"), serde_json::to_string_pretty(&plan).unwrap()).unwrap();
    std::fs::write(output_dir.join("big_o_composition.json"), serde_json::to_string_pretty(&composition).unwrap()).unwrap();

    let persistent_dir = Path::new("/home/mateusarcedev/.local/share/ToolsOnDesk/exports/mission_10_3/big_o");
    let _ = std::fs::create_dir_all(persistent_dir);
    let _ = std::fs::write(persistent_dir.join("big_o_plan.json"), serde_json::to_string_pretty(&plan).unwrap());
    let _ = std::fs::write(persistent_dir.join("big_o_composition.json"), serde_json::to_string_pretty(&composition).unwrap());

    let output_filename = "big_o_educational_60s.mp4".to_string();
    let target_video_path = output_dir.join(&output_filename);

    let render_options = RenderMotionOptions {
        project_id: None,
        composition_json: serde_json::to_string(&composition).unwrap(),
        output_filename: output_filename.clone(),
        format: "mp4".to_string(),
        quality: "high".to_string(),
    };

    let cancel_token = Arc::new(AtomicBool::new(false));

    println!(">>> Iniciando renderização real do vídeo educativo Big O (60s, 1800 frames)...");
    let result_path = WebRenderer::render_to_mp4(
        &render_options,
        output_dir,
        cancel_token,
        |p| {
            if (p * 100.0) as u32 % 20 == 0 {
                println!("Progresso da renderização: {:.1}%", p * 100.0);
            }
        },
    ).await.expect("Falha ao renderizar Big O educativo via WebRenderer");

    println!("Vídeo renderizado com sucesso em: {}", result_path);
    assert!(target_video_path.is_file(), "Arquivo MP4 não foi gerado no destino!");

    let meta = std::fs::metadata(&target_video_path).unwrap();
    println!("Tamanho do MP4 gerado: {} bytes", meta.len());
    assert!(meta.len() > 100_000, "Vídeo muito pequeno ou vazio!");

    // Validar via ffprobe
    let probe = std::process::Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,nb_frames:format=duration",
            "-of", "json",
            &target_video_path.to_string_lossy(),
        ])
        .output()
        .expect("ffprobe falhou");

    let probe_json: serde_json::Value = serde_json::from_slice(&probe.stdout).expect("Probe JSON inválido");
    println!("FFprobe Resultado:\n{}", serde_json::to_string_pretty(&probe_json).unwrap());

    let stream = &probe_json["streams"][0];
    let width = stream["width"].as_u64().unwrap();
    let height = stream["height"].as_u64().unwrap();
    let nb_frames: u64 = stream["nb_frames"].as_str().unwrap().parse().unwrap();
    let duration: f64 = probe_json["format"]["duration"].as_str().unwrap().parse().unwrap();

    assert_eq!(width, 1080, "Largura esperada: 1080");
    assert_eq!(height, 1920, "Altura esperada: 1920");
    assert_eq!(nb_frames, 1800, "Esperado exatamente 1800 frames (60s @ 30fps)!");
    assert!((duration - 60.0).abs() < 0.1, "Duração deve ser ~60.0 segundos, obtido: {:.2}", duration);

    // Gerar contact sheet de validação visual com 6 cenas representativas
    let contact_sheet_path = output_dir.join("contact_sheet_big_o_6_scenes.png");
    let _ = std::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i", &target_video_path.to_string_lossy(),
            "-vf", "select='eq(n\\,120)+eq(n\\,420)+eq(n\\,720)+eq(n\\,1020)+eq(n\\,1320)+eq(n\\,1620)',scale=360:640,tile=3x2",
            contact_sheet_path.to_str().unwrap(),
        ])
        .output();

    assert!(contact_sheet_path.is_file(), "Contact sheet não gerada!");
    println!("Contact sheet gerada com sucesso em: {}", contact_sheet_path.display());

    // Copy to persistent directory
    let persistent_mp4 = persistent_dir.join(&output_filename);
    let persistent_sheet = persistent_dir.join("contact_sheet_big_o_6_scenes.png");
    let _ = std::fs::copy(&target_video_path, &persistent_mp4);
    let _ = std::fs::copy(&contact_sheet_path, &persistent_sheet);

    // Extract individual scene stills
    let stills_dir = output_dir.join("stills");
    let _ = std::fs::create_dir_all(&stills_dir);
    let persistent_stills = persistent_dir.join("stills");
    let _ = std::fs::create_dir_all(&persistent_stills);

    let stills = [
        (120, "scene_01_intro.png"),
        (420, "scene_02_o1.png"),
        (720, "scene_03_ologn.png"),
        (1020, "scene_04_on.png"),
        (1320, "scene_05_on2.png"),
        (1620, "scene_06_summary.png"),
    ];

    for (fn_idx, fname) in stills {
        let still_path = stills_dir.join(fname);
        let _ = std::process::Command::new("ffmpeg")
            .args([
                "-y",
                "-i", &target_video_path.to_string_lossy(),
                "-vf", &format!("select='eq(n\\,{})'", fn_idx),
                "-vframes", "1",
                still_path.to_str().unwrap(),
            ])
            .output();
        let _ = std::fs::copy(&still_path, persistent_stills.join(fname));
    }
}

fn create_layer(
    id: &str,
    layer_type: LayerType,
    name: &str,
    content: &str,
    start_time: f32,
    duration_sec: f32,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    opacity: f32,
    color: &str,
    z_index: i32,
) -> LayerPlan {
    LayerPlan {
        id: id.to_string(),
        layer_type,
        name: name.to_string(),
        content: content.to_string(),
        asset_id: None,
        start_time,
        duration_sec,
        transform: TransformPlan {
            x,
            y,
            width,
            height,
            rotation: 0.0,
            scale: 1.0,
            opacity,
            anchor_x: 0.5,
            anchor_y: 0.5,
        },
        style: StylePlan {
            color: color.to_string(),
            background_color: Some("#141A1C".to_string()),
            font_size: Some(36.0),
            font_family: Some("Geist".to_string()),
            font_weight: Some("600".to_string()),
            text_align: Some("left".to_string()),
            line_height: None,
            letter_spacing: None,
            border_radius: Some(10.0),
            border_width: Some(1.5),
            border_color: Some(color.to_string()),
            shadow: None,
            gradient: None,
        },
        animation: Some(AnimationPlan {
            tracks: vec![AnimationTrack {
                property: "opacity".to_string(),
                keyframes: vec![
                    Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                    Keyframe { time: 0.2, value: serde_json::json!(1.0) },
                ],
                easing: "ease_out".to_string(),
            }],
            preset: Some("fade_in".to_string()),
        }),
        z_index,
        component_type: {
            let known = [
                "animatedgrid", "animatedarray", "animatedchart", "progresscounter",
                "animatedbar", "diagramnode", "animatedconnector", "featurecard",
                "screenshotshowcase", "logoreveal", "shapereveal", "comparisonchart",
            ];
            let n = name.to_lowercase();
            if known.iter().any(|k| n.contains(k)) {
                Some(name.to_string())
            } else {
                None
            }
        },
    }
}
