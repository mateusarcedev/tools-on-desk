use toolsondesk_lib::engines::motion_director::{MotionDirector, MotionBriefing, ReferenceInput, MotionDirectorPlan, ScenePlan, LayerPlan, TransformPlan, StylePlan, LayerType, AnimationPlan, AnimationTrack, Keyframe, TransitionPlan};
use toolsondesk_lib::domain::creative::{GradientPlan, GradientStopPlan, ShadowPlan, RenderMotionOptions};
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[tokio::test]
async fn test_manual_plan_with_asset() {
    // Create a manual plan with one scene and one image asset
    let asset_path = "/home/mateusarcedev/projetos/arce-tools/src-tauri/icons/icon.png";
    assert!(Path::new(asset_path).exists(), "Test asset not found");
    
    let plan = toolsondesk_lib::engines::motion_director::MotionDirectorPlan {
        project: toolsondesk_lib::engines::motion_director::MotionProjectPlan {
            title: "Logo Test".to_string(),
            concept: "Show logo".to_string(),
            style: "Publicitário".to_string(),
            width: 1920,
            height: 1080,
            fps: 30,
            duration_sec: 5.0,
            background_color: "#0B0F10".to_string(),
            color_palette: vec!["#0B0F10".to_string(), "#141A1C".to_string(), "#15F5BA".to_string(), "#F3F4F6".to_string()],
            typography: toolsondesk_lib::engines::motion_director::TypographyPlan {
                primary_font: "Geist".to_string(),
                secondary_font: "Geist Mono".to_string(),
                heading_size: 72.0,
                body_size: 38.0,
                accent_color: "#15F5BA".to_string(),
            },
        },
        scenes: vec![
            toolsondesk_lib::engines::motion_director::ScenePlan {
                id: "scene-1".to_string(),
                order: 1,
                title: "Logo".to_string(),
                duration_sec: 5.0,
                start_time: 0.0,
                description: "Logo display".to_string(),
                visual_cue: "Logo display".to_string(),
                camera_movement: None,
                layers: vec![
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "bg".to_string(),
                        layer_type: toolsondesk_lib::engines::motion_director::LayerType::Gradient,
                        name: "Background".to_string(),
                        content: "".to_string(),
                        asset_id: None,
                        start_time: 0.0,
                        duration_sec: 5.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.0, y: 0.0, width: 1.0, height: 1.0, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "transparent".to_string(),
                            background_color: None,
                            font_size: None,
                            font_family: None,
                            font_weight: None,
                            text_align: None,
                            line_height: None,
                            letter_spacing: None,
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: Some(toolsondesk_lib::domain::creative::GradientPlan {
                                type_: "radial".to_string(),
                                stops: vec![
                                    toolsondesk_lib::domain::creative::GradientStopPlan { color: "#15F5BA".to_string(), position: 0.0 },
                                    toolsondesk_lib::domain::creative::GradientStopPlan { color: "#0B0F10".to_string(), position: 1.0 },
                                ],
                                angle: 0.0,
                            }),
                        },
                        animation: None,
                        z_index: -100,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "logo".to_string(),
                        layer_type: toolsondesk_lib::engines::motion_director::LayerType::Image,
                        name: "Logo".to_string(),
                        content: "/home/mateusarcedev/projetos/arce-tools/src-tauri/icons/icon.png".to_string(),
                        asset_id: Some("logo-1".to_string()),
                        start_time: 0.5,
                        duration_sec: 4.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.3, y: 0.3, width: 0.4, height: 0.4, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#FFFFFF".to_string(),
                            background_color: None,
                            font_size: None,
                            font_family: None,
                            font_weight: None,
                            text_align: None,
                            line_height: None,
                            letter_spacing: None,
                            border_radius: Some(12.0),
                            border_width: Some(2.0),
                            border_color: Some("#15F5BA".to_string()),
                            shadow: Some(toolsondesk_lib::domain::creative::ShadowPlan {
                                offset_x: 0.0, offset_y: 20.0, blur: 40.0, color: "#000000".to_string(),
                            }),
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.85) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.5, value: serde_json::json!(1.0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 1.0, value: serde_json::json!(1.02) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("zoom_in".to_string()),
                        }),
                        z_index: 10,
                    },
                ],
                transition_in: None,
                transition_out: None,
            },
        ],
        audio: None,
        metadata: toolsondesk_lib::engines::motion_director::PlanMetadata {
            created_at: "2026-10-30T00:00:00Z".to_string(),
            generator: "manual_test".to_string(),
            skills_used: vec![],
            references_used: vec!["/home/mateusarcedev/projetos/arce-tools/src-tauri/icons/icon.png".to_string()],
            version: "1.0".to_string(),
        },
    };
    
    let director = toolsondesk_lib::engines::MotionDirector::new();
    let composition = director.plan_to_composition(&plan);
    println!("Composition: {} scenes, {} layers total", 
        composition.scenes.len(),
        composition.scenes.iter().flat_map(|s| &s.layers).count()
    );
    
    let export_dir = std::path::Path::new("/tmp/manual_asset_export");
    std::fs::create_dir_all(export_dir).unwrap();
    
    let cancel_token = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let output_path = toolsondesk_lib::engines::MotionEngine::render_to_mp4(
        &toolsondesk_lib::domain::RenderMotionOptions {
            project_id: None,
            composition_json: serde_json::to_string(&composition).unwrap(),
            output_filename: "manual_asset.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "high".to_string(),
        },
        std::path::Path::new("/tmp/manual_asset_export"),
        std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
        |_| {},
    ).await.unwrap();
    
    println!("Video rendered to: {}", output_path);
    let meta = std::fs::metadata(&output_path).unwrap();
    assert!(meta.len() > 0);
    println!("Video size: {} bytes", meta.len());
    
    let probe = std::process::Command::new("ffprobe")
        .args(["-v", "error", "-select_streams", "v:0", 
               "-show_entries", "stream=width,height,r_frame_rate,duration",
               "-of", "json", &output_path])
        .output().unwrap();
    println!("FFprobe: {}", String::from_utf8_lossy(&probe.stdout));
}