use toolsondesk_lib::engines::{MotionEngine, MotionDirector};
use toolsondesk_lib::domain::{MotionComposition, RenderMotionOptions};
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[tokio::test]
async fn test_codex_plan_render() -> Result<(), Box<dyn std::error::Error>> {
    // Use the Codex-generated plan directly (from Codex agent execution above)
    let plan = toolsondesk_lib::engines::motion_director::MotionDirectorPlan {
        project: toolsondesk_lib::engines::motion_director::MotionProjectPlan {
            title: "ToolsOnDesk — Your Creative Toolkit".to_string(),
            concept: "A fast-paced promotional video introducing ToolsOnDesk as one home for creative tools, AI workflows, and desktop productivity.".to_string(),
            style: "Premium dark product promo with crisp typography, mint accents, restrained motion, and clean interface framing.".to_string(),
            width: 1920,
            height: 1080,
            fps: 30,
            duration_sec: 20.0,
            background_color: "#0B0F10".to_string(),
            color_palette: vec!["#0B0F10".to_string(), "#141A1C".to_string(), "#1F292B".to_string(), "#15F5BA".to_string(), "#F3F4F6".to_string(), "#9AA6A8".to_string()],
            typography: toolsondesk_lib::engines::motion_director::TypographyPlan {
                primary_font: "Geist".to_string(),
                secondary_font: "Geist Mono".to_string(),
                heading_size: 88.0,
                body_size: 32.0,
                accent_color: "#15F5BA".to_string(),
            },
        },
        scenes: vec![
            toolsondesk_lib::engines::motion_director::ScenePlan {
                id: "scene-01-hook".to_string(),
                order: 1,
                title: "Your creative toolkit".to_string(),
                duration_sec: 4.0,
                start_time: 0.0,
                description: "Open with a bold title reveal and a mint accent that draws the eye into the ToolsOnDesk brand.".to_string(),
                visual_cue: "Oversized title scales up and fades in over a dark canvas; mint line sweeps beneath the headline.".to_string(),
                camera_movement: None,
                layers: vec![
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "hook-accent-line".to_string(),
                        layer_type: "shape".to_string(),
                        name: "Mint accent line".to_string(),
                        content: "Rounded horizontal accent line".to_string(),
                        asset_id: None,
                        start_time: 0.0,
                        duration_sec: 4.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.12, y: 0.67, width: 0.12, height: 0.008, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#15F5BA".to_string(),
                            background_color: Some("#15F5BA".to_string()),
                            font_size: None,
                            font_family: None,
                            font_weight: None,
                            text_align: None,
                            line_height: None,
                            letter_spacing: None,
                            border_radius: Some(8.0),
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.1) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 1.0, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("slide_in".to_string()),
                        }),
                        z_index: 1,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "hook-title".to_string(),
                        layer_type: "text".to_string(),
                        name: "Hook headline".to_string(),
                        content: "Your creative toolkit.".to_string(),
                        asset_id: None,
                        start_time: 0.0,
                        duration_sec: 3.6,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.12, y: 0.34, width: 0.78, height: 0.25, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: None,
                            font_size: Some(96.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("700".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.0),
                            letter_spacing: Some(-2.0),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.28, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.94) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.5, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                            ],
                            preset: Some("zoom_in".to_string()),
                        }),
                        z_index: 2,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "hook-subtitle".to_string(),
                        layer_type: "text".to_string(),
                        name: "Hook subtitle".to_string(),
                        content: "One desk. More ways to make.".to_string(),
                        asset_id: None,
                        start_time: 0.7,
                        duration_sec: 3.1,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.12, y: 0.59, width: 0.65, height: 0.08, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#9AA6A8".to_string(),
                            background_color: None,
                            font_size: Some(34.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("400".to_string()),
                            text_align: Some("left".to_string()),
                            line_height: Some(1.2),
                            letter_spacing: Some(0.0),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.4, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.y".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.63) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.4, value: serde_json::json!(0.59) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                            ],
                            preset: Some("slide_up".to_string()),
                        }),
                        z_index: 3,
                    },
                ],
                transition_in: None,
                transition_out: Some(toolsondesk_lib::engines::motion_director::TransitionPlan {
                    type_: "wipe".to_string(),
                    duration_sec: 0.35,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
            },
            toolsondesk_lib::engines::motion_director::ScenePlan {
                id: "scene-02-product-demo".to_string(),
                order: 2,
                title: "A workspace built for making".to_string(),
                duration_sec: 6.0,
                start_time: 4.0,
                description: "Show the product in context with a framed dashboard screenshot placeholder and a concise product promise.".to_string(),
                visual_cue: "A product window glides into view; dashboard screenshot placeholder sits inside a rounded dark frame with a mint outline.".to_string(),
                camera_movement: None,
                layers: vec![
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "demo-heading".to_string(),
                        layer_type: "text".to_string(),
                        name: "Demo headline".to_string(),
                        content: "Make more. Switch less.".to_string(),
                        asset_id: None,
                        start_time: 0.0,
                        duration_sec: 5.8,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.08, y: 0.08, width: 0.84, height: 0.1, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: None,
                            font_size: Some(52.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("650".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.1),
                            letter_spacing: Some(-1.0),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.18, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                            ],
                            preset: Some("fade_in".to_string()),
                        }),
                        z_index: 2,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "demo-window-frame".to_string(),
                        layer_type: "shape".to_string(),
                        name: "Product window frame".to_string(),
                        content: "Rounded dashboard screenshot frame".to_string(),
                        asset_id: None,
                        start_time: 0.3,
                        duration_sec: 5.5,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.1, y: 0.23, width: 0.8, height: 0.66, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#15F5BA".to_string(),
                            background_color: Some("#141A1C".to_string()),
                            font_size: None,
                            font_family: None,
                            font_weight: None,
                            text_align: None,
                            line_height: None,
                            letter_spacing: None,
                            border_radius: Some(18.0),
                            border_width: Some(2.0),
                            border_color: Some("#1F292B".to_string()),
                            shadow: Some(toolsondesk_lib::domain::creative::ShadowPlan {
                                offset_x: 0.0,
                                offset_y: 18.0,
                                blur: 48.0,
                                color: "#00000066".to_string(),
                            }),
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.y".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.28) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(0.23) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                            ],
                            preset: Some("slide_up".to_string()),
                        }),
                        z_index: 1,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "demo-screenshot-placeholder".to_string(),
                        layer_type: "screenshot".to_string(),
                        name: "ToolsOnDesk dashboard screenshot placeholder".to_string(),
                        content: "SCREENSHOT_PLACEHOLDER: replace with a real ToolsOnDesk dashboard capture".to_string(),
                        asset_id: Some("toolsondesk-dashboard-screenshot-placeholder".to_string()),
                        start_time: 0.45,
                        duration_sec: 5.3,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.115, y: 0.25, width: 0.77, height: 0.62, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: Some("#0B0F10".to_string()),
                            font_size: None,
                            font_family: None,
                            font_weight: None,
                            text_align: None,
                            line_height: None,
                            letter_spacing: None,
                            border_radius: Some(12.0),
                            border_width: Some(1.0),
                            border_color: Some("#1F292B".to_string()),
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.2, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_out".to_string(),
                                },
                            ],
                            preset: Some("fade_in".to_string()),
                        }),
                        z_index: 2,
                    },
                ],
                transition_in: Some(toolsondesk_lib::engines::motion_director::TransitionPlan {
                    type_: "wipe".to_string(),
                    duration_sec: 0.35,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
                transition_out: Some(toolsondesk_lib::engines::motion_director::TransitionPlan {
                    type_: "fade".to_string(),
                    duration_sec: 0.35,
                    easing: "ease_in_out".to_string(),
                    direction: None,
                }),
            },
            toolsondesk_lib::engines::motion_director::ScenePlan {
                id: "scene-03-features".to_string(),
                order: 3,
                title: "Everything in your flow".to_string(),
                duration_sec: 5.0,
                start_time: 10.0,
                description: "Present four core benefits in a balanced two-by-two feature grid.".to_string(),
                visual_cue: "Dark cards enter in sequence under a clear title.".to_string(),
                camera_movement: None,
                layers: vec![
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "features-heading".to_string(),
                        layer_type: "text".to_string(),
                        name: "Features headline".to_string(),
                        content: "Your tools. One place.".to_string(),
                        asset_id: None,
                        start_time: 0.2,
                        duration_sec: 4.8,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.1, y: 0.17, width: 0.8, height: 0.14, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: None,
                            font_size: Some(76.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("700".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.1),
                            letter_spacing: Some(-1.0),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.18, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("slide_up".to_string()),
                        }),
                        z_index: 2,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "feat-cards-bg".to_string(),
                        layer_type: "shape".to_string(),
                        name: "Feature cards background".to_string(),
                        content: "Four cards background".to_string(),
                        asset_id: None,
                        start_time: 0.7,
                        duration_sec: 4.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.1, y: 0.35, width: 0.8, height: 0.55, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#141A1C".to_string(),
                            background_color: Some("#141A1C".to_string()),
                            font_size: None,
                            font_family: None,
                            font_weight: None,
                            text_align: None,
                            line_height: None,
                            letter_spacing: None,
                            border_radius: Some(16.0),
                            border_width: Some(1.0),
                            border_color: Some("#15F5BA".to_string()),
                            shadow: Some(toolsondesk_lib::domain::creative::ShadowPlan {
                                offset_x: 0.0,
                                offset_y: 8.0,
                                blur: 24.0,
                                color: "#000000".to_string(),
                            }),
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.9) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.2, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("pop_in".to_string()),
                        }),
                        z_index: 1,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "feat-1-icon".to_string(),
                        layer_type: "shape".to_string(),
                        name: "Icon 1".to_string(),
                        content: "🎨".to_string(),
                        asset_id: None,
                        start_time: 0.5,
                        duration_sec: 3.5,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.15, y: 0.4, width: 0.35, height: 0.25, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#15F5BA".to_string(),
                            background_color: Some("#141A1C".to_string()),
                            font_size: Some(48.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: None,
                            text_align: Some("center".to_string()),
                            line_height: None,
                            letter_spacing: None,
                            border_radius: Some(16.0),
                            border_width: Some(1.0),
                            border_color: Some("#1F292B".to_string()),
                            shadow: Some(toolsondesk_lib::domain::creative::ShadowPlan {
                                offset_x: 0.0,
                                offset_y: 8.0,
                                blur: 20.0,
                                color: "#00000080".to_string(),
                            }),
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.8) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.4, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "spring".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.2, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("pop_in".to_string()),
                        }),
                        z_index: 5,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "feat-1-title".to_string(),
                        layer_type: "text".to_string(),
                        name: "Feature 1 Title".to_string(),
                        content: "Creative tools".to_string(),
                        asset_id: None,
                        start_time: 1.0,
                        duration_sec: 3.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.15, y: 0.42, width: 0.3, height: 0.08, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: None,
                            font_size: Some(28.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("600".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.2),
                            letter_spacing: None,
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![toolsondesk_lib::engines::motion_director::AnimationTrack {
                                property: "opacity".to_string(),
                                keyframes: vec![
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                ],
                                easing: "ease_in_out".to_string(),
                            }],
                            preset: Some("fade_in".to_string()),
                        }),
                        z_index: 5,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "feat-1-desc".to_string(),
                        layer_type: "text".to_string(),
                        name: "Feature 1 Description".to_string(),
                        content: "Design, edit, animate".to_string(),
                        asset_id: None,
                        start_time: 1.2,
                        duration_sec: 2.5,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.2, y: 0.5, width: 0.25, height: 0.1, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#9AA6A8".to_string(),
                            background_color: None,
                            font_size: Some(20.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("400".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.2),
                            letter_spacing: None,
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![toolsondesk_lib::engines::motion_director::AnimationTrack {
                                property: "opacity".to_string(),
                                keyframes: vec![
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 0.5, value: serde_json::json!(1.0) },
                                ],
                                easing: "ease_in_out".to_string(),
                            }],
                            preset: Some("fade_in".to_string()),
                        }),
                        z_index: 5,
                    },
                ],
                transition_in: Some(toolsondesk_lib::engines::motion_director::TransitionPlan {
                    type_: "fade".to_string(),
                    duration_sec: 0.35,
                    easing: "ease_in_out".to_string(),
                    direction: None,
                }),
                transition_out: Some(toolsondesk_lib::engines::motion_director::TransitionPlan {
                    type_: "wipe".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                }),
            },
            toolsondesk_lib::engines::motion_director::ScenePlan {
                id: "scene-04-cta".to_string(),
                order: 4,
                title: "CTA".to_string(),
                duration_sec: 5.0,
                start_time: 15.0,
                description: "Call to action with logo and tagline".to_string(),
                visual_cue: "Logo with spring animation, tagline, and CTA button".to_string(),
                camera_movement: None,
                layers: vec![
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "cta-bg".to_string(),
                        layer_type: "gradient".to_string(),
                        name: "CTA Background".to_string(),
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
                            gradient: Some(toolsondesk_lib::engines::motion_director::GradientPlan {
                                type_: "radial".to_string(),
                                stops: vec![
                                    toolsondesk_lib::domain::creative::GradientStopPlan { color: "#15F5BA".to_string(), position: 0.0 },
                                    toolsondesk_lib::domain::creative::GradientStopPlan { color: "#0B0F10".to_string(), position: 1.0 },
                                ],
                                angle: 0.0,
                            }),
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![toolsondesk_lib::engines::motion_director::AnimationTrack {
                                property: "opacity".to_string(),
                                keyframes: vec![
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(0.4) },
                                    toolsondesk_lib::engines::motion_director::Keyframe { time: 1.0, value: serde_json::json!(0.2) },
                                ],
                                easing: "ease_in_out".to_string(),
                            }],
                            preset: None,
                        }),
                        z_index: 0,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "cta-title".to_string(),
                        layer_type: "text".to_string(),
                        name: "CTA Title".to_string(),
                        content: "ToolsOnDesk".to_string(),
                        asset_id: None,
                        start_time: 0.5,
                        duration_sec: 4.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.15, y: 0.35, width: 0.7, height: 0.15, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#F3F4F6".to_string(),
                            background_color: None,
                            font_size: Some(96.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("700".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.0),
                            letter_spacing: Some(-2.0),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.9) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.4, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "spring".to_string(),
                                },
                            ],
                            preset: None,
                        }),
                        z_index: 2,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "cta-tagline".to_string(),
                        layer_type: "text".to_string(),
                        name: "CTA Tagline".to_string(),
                        content: "Make room for what's next".to_string(),
                        asset_id: None,
                        start_time: 1.5,
                        duration_sec: 3.0,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.15, y: 0.6, width: 0.7, height: 0.1, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#15F5BA".to_string(),
                            background_color: None,
                            font_size: Some(42.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("500".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.2),
                            letter_spacing: Some(0.5),
                            border_radius: None,
                            border_width: None,
                            border_color: None,
                            shadow: None,
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("fade_in".to_string()),
                        }),
                        z_index: 3,
                    },
                    toolsondesk_lib::engines::motion_director::LayerPlan {
                        id: "cta-button".to_string(),
                        layer_type: "shape".to_string(),
                        name: "CTA Button".to_string(),
                        content: "Download".to_string(),
                        asset_id: None,
                        start_time: 2.5,
                        duration_sec: 2.5,
                        transform: toolsondesk_lib::engines::motion_director::TransformPlan { x: 0.35, y: 0.75, width: 0.3, height: 0.12, rotation: 0.0, scale: 1.0, opacity: 1.0, anchor_x: 0.5, anchor_y: 0.5 },
                        style: toolsondesk_lib::engines::motion_director::StylePlan {
                            color: "#0B0F10".to_string(),
                            background_color: Some("#15F5BA".to_string()),
                            font_size: Some(36.0),
                            font_family: Some("Geist".to_string()),
                            font_weight: Some("700".to_string()),
                            text_align: Some("center".to_string()),
                            line_height: Some(1.0),
                            letter_spacing: Some(0.5),
                            border_radius: Some(50.0),
                            border_width: None,
                            border_color: None,
                            shadow: Some(toolsondesk_lib::domain::creative::ShadowPlan {
                                offset_x: 0.0,
                                offset_y: 8.0,
                                blur: 24.0,
                                color: "#15F5BA".to_string(),
                            }),
                            gradient: None,
                        },
                        animation: Some(toolsondesk_lib::engines::motion_director::AnimationPlan {
                            tracks: vec![
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "transform.scale".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0.8) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.5, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "spring".to_string(),
                                },
                                toolsondesk_lib::engines::motion_director::AnimationTrack {
                                    property: "opacity".to_string(),
                                    keyframes: vec![
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.0, value: serde_json::json!(0) },
                                        toolsondesk_lib::engines::motion_director::Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                    ],
                                    easing: "ease_in_out".to_string(),
                                },
                            ],
                            preset: Some("pop_in".to_string()),
                        }),
                        z_index: 4,
                    },
                ],
                transition_in: Some(toolsondesk_lib::engines::motion_director::TransitionPlan {
                    type_: "zoom".to_string(),
                    duration_sec: 0.35,
                    easing: "ease_in_out".to_string(),
                    direction: None,
                }),
                transition_out: None,
            },
        ],
        audio: None,
        metadata: toolsondesk_lib::engines::motion_director::PlanMetadata {
            created_at: "2026-10-31T00:00:00Z".to_string(),
            generator: "codex".to_string(),
            skills_used: vec!["advertising-design".to_string(), "brand-identity".to_string(), "kinetic-typography".to_string()],
            references_used: vec![],
            version: "1.0".to_string(),
        },
    };
    
    let director = MotionDirector::new();
    let composition = director.plan_to_composition(&plan);
    println!("Composition: {} scenes, {} layers total", 
        composition.scenes.len(),
        composition.scenes.iter().flat_map(|s| &s.layers).count());

    let export_dir = Path::new("/tmp/codex_export");
    std::fs::create_dir_all(export_dir).unwrap();

    let cancel_token = Arc::new(AtomicBool::new(false));
    let output_path = MotionEngine::render_to_mp4(
        &RenderMotionOptions {
            project_id: None,
            composition_json: serde_json::to_string(&composition).unwrap(),
            output_filename: "toolsondesk_codex_promo.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "high".to_string(),
        },
        export_dir,
        cancel_token,
        |p| if (p * 100.0) as u32 % 10 == 0 { println!("Progress: {:.1}%", p * 100.0); },
    ).await.unwrap();

    println!("Video rendered to: {}", output_path);
    let meta = std::fs::metadata(&output_path).unwrap();
    assert!(meta.len() > 10000);
    println!("Size: {} bytes", meta.len());

    let probe = std::process::Command::new("ffprobe")
        .args(["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,duration", "-of", "json", &output_path])
        .output().unwrap();
    println!("FFprobe: {}", String::from_utf8_lossy(&probe.stdout));

    let frames_dir = Path::new("/tmp/codex_frames");
    std::fs::create_dir_all(frames_dir).unwrap();
    let _ = std::process::Command::new("ffmpeg")
        .args(["-y", "-i", &output_path, "-vf", "fps=1", frames_dir.join("frame_%03d.png").to_str().unwrap()])
        .output().unwrap();

    let frames: Vec<_> = std::fs::read_dir(frames_dir).unwrap().filter_map(|e| e.ok()).map(|e| e.path()).collect();
    println!("Frames: {}", frames.len());

    let duration_out = std::process::Command::new("ffprobe")
        .args(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", &output_path])
        .output().unwrap();
    let dur: f64 = String::from_utf8_lossy(&duration_out.stdout).trim().parse().unwrap_or(0.0);
    println!("Duration: {:.2}s", dur);
    assert!(dur >= 19.0 && dur <= 21.0, "Duration should be ~20s, got {:.2}s", dur);
}