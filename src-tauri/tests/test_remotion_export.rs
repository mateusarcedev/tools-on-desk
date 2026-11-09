use toolsondesk_lib::engines::MotionDirector;
use toolsondesk_lib::engines::motion_director::{
    MotionDirectorPlan, MotionProjectPlan, ScenePlan, LayerPlan, TransformPlan, StylePlan,
    AnimationPlan, AnimationTrack, Keyframe, TransitionPlan, PlanMetadata, TypographyPlan,
    LayerType,
};
use toolsondesk_lib::domain::creative::{GradientPlan, GradientStopPlan, ShadowPlan};
use toolsondesk_lib::domain::RenderMotionOptions;

#[test]
fn test_remotion_export() {
    // Use an inline plan similar to codex_plan_render
    let plan = MotionDirectorPlan {
        project: MotionProjectPlan {
            title: "Remotion Export Test".to_string(),
            concept: "Test Remotion TSX export".to_string(),
            style: "Test style".to_string(),
            width: 1920,
            height: 1080,
            fps: 30,
            duration_sec: 20.0,
            background_color: "#0B0F10".to_string(),
            color_palette: vec![
                "#0B0F10".to_string(), "#141A1C".to_string(), "#1F292B".to_string(),
                "#15F5BA".to_string(), "#F3F4F6".to_string(), "#9AA6A8".to_string()
            ],
            typography: TypographyPlan {
                primary_font: "Geist".to_string(),
                secondary_font: "Geist Mono".to_string(),
                heading_size: 88.0,
                body_size: 32.0,
                accent_color: "#15F5BA".to_string(),
            },
        },
        scenes: vec![
            ScenePlan {
                id: "scene-01".to_string(),
                order: 1,
                title: "Test Scene".to_string(),
                duration_sec: 5.0,
                start_time: 0.0,
                description: "Test".to_string(),
                visual_cue: "Test".to_string(),
                camera_movement: None,
                layers: vec![
                    LayerPlan {
                        id: "layer-1".to_string(),
                        layer_type: LayerType::Text,
                        name: "Test Text".to_string(),
                        content: "Hello Remotion".to_string(),
                        asset_id: None,
                        start_time: 0.0,
                        duration_sec: 5.0,
                        transform: TransformPlan { x: 0.1, y: 0.1, width: 0.8, height: 0.2, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: None,
                            font_size: Some(48.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("700".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.0),
                            letter_spacing: Some(0.0),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: None,
                        z_index: 1,
                        component_type: None,
                    },
                ],
                transition_in: None,
                transition_out: None,
            },
        ],
        audio: None,
        metadata: PlanMetadata {
            created_at: "2026-10-31T00:00:00Z".to_string(),
            generator: "test".to_string(),
            skills_used: vec![],
            references_used: vec![],
            version: "1.0".to_string(),
        },
    };

    // Convert to composition
    let director = MotionDirector::new();
    let composition = director.plan_to_composition(&plan);

    // Export to Remotion TSX
    let tsx = toolsondesk_lib::engines::MotionEngine::export_to_remotion_tsx(&composition);
    println!("TSX length: {}", tsx.len());
    println!("TSX preview: {}", &tsx[..500.min(tsx.len())]);
    assert!(tsx.contains("ArceMotionComposition"));
    assert!(tsx.contains("RemotionRoot"));
    assert!(tsx.contains("1920"));
    assert!(tsx.contains("1080"));
    assert!(tsx.contains("30"));
}