use crate::domain::{
    CreativeSkill, MotionAnimation, MotionAudioTrack, MotionComposition, MotionLayer, MotionScene,
};
use crate::engines::nvidia::{NVIDIA_CHAT_BASE_URL, NVIDIA_KEY_SECRET_NAME};
use crate::engines::{SkillManager};
use crate::utils::vault::SecureVault;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Structured output from the Motion Director - the creative plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionDirectorPlan {
    pub project: MotionProjectPlan,
    pub scenes: Vec<ScenePlan>,
    pub audio: Option<AudioPlan>,
    pub metadata: PlanMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionProjectPlan {
    pub title: String,
    pub concept: String,
    pub style: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub duration_sec: f32,
    pub background_color: String,
    pub color_palette: Vec<String>,
    pub typography: TypographyPlan,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypographyPlan {
    pub primary_font: String,
    pub secondary_font: String,
    pub heading_size: f32,
    pub body_size: f32,
    pub accent_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenePlan {
    pub id: String,
    pub order: u32,
    pub title: String,
    pub duration_sec: f32,
    pub start_time: f32,
    pub description: String,
    pub visual_cue: String,
    pub camera_movement: Option<String>,
    pub layers: Vec<LayerPlan>,
    pub transition_in: Option<TransitionPlan>,
    pub transition_out: Option<TransitionPlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerPlan {
    pub id: String,
    pub layer_type: LayerType,
    pub name: String,
    pub content: String, // text content or asset path
    pub asset_id: Option<String>,
    pub start_time: f32,
    pub duration_sec: f32,
    pub transform: TransformPlan,
    pub style: StylePlan,
    pub animation: Option<AnimationPlan>,
    pub z_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LayerType {
    Text,
    Image,
    Video,
    Shape,
    Gradient,
    Svg,
    Icon,
    Screenshot,
    Chart,
    Group,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformPlan {
    pub x: f32,      // 0.0 - 1.0 (relative to width)
    pub y: f32,      // 0.0 - 1.0 (relative to height)
    pub width: f32,  // 0.0 - 1.0
    pub height: f32, // 0.0 - 1.0
    pub rotation: f32, // degrees
    pub scale: f32,
    pub opacity: f32,
    pub anchor_x: f32, // 0.0 - 1.0
    pub anchor_y: f32, // 0.0 - 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StylePlan {
    pub color: String,
    pub background_color: Option<String>,
    pub font_size: Option<f32>,
    pub font_family: Option<String>,
    pub font_weight: Option<String>,
    pub text_align: Option<String>,
    pub line_height: Option<f32>,
    pub letter_spacing: Option<f32>,
    pub border_radius: Option<f32>,
    pub border_width: Option<f32>,
    pub border_color: Option<String>,
    pub shadow: Option<ShadowPlan>,
    pub gradient: Option<GradientPlan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShadowPlan {
    pub offset_x: f32,
    pub offset_y: f32,
    pub blur: f32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradientPlan {
    pub type_: String, // "linear" | "radial"
    pub stops: Vec<GradientStop>,
    pub angle: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradientStop {
    pub color: String,
    pub position: f32, // 0.0 - 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationPlan {
    pub tracks: Vec<AnimationTrack>,
    pub preset: Option<String>, // "fade_in", "slide_up", "zoom_in", "bounce", "typewriter", etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationTrack {
    pub property: String, // "opacity", "transform.x", "transform.y", "transform.scale", "transform.rotation", "color", etc.
    pub keyframes: Vec<Keyframe>,
    pub easing: String, // "linear", "ease_in_out", "spring", "bounce", "cubic_bezier(0.25,0.1,0.25,1)"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyframe {
    pub time: f32, // 0.0 - 1.0 (relative to layer duration)
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionPlan {
    pub type_: String, // "wipe", "fade", "zoom", "slide", "none"
    pub duration_sec: f32,
    pub easing: String,
    pub direction: Option<String>, // for wipe/slide: "left", "right", "up", "down"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPlan {
    pub tracks: Vec<AudioTrackPlan>,
    pub master_volume: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioTrackPlan {
    pub id: String,
    pub name: String,
    pub asset_path: String,
    pub start_time: f32,
    pub duration_sec: Option<f32>, // None = full asset duration
    pub volume: f32,
    pub fade_in_sec: f32,
    pub fade_out_sec: f32,
    pub loop_audio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanMetadata {
    pub created_at: String,
    pub generator: String, // "nvidia_llm" | "local_fallback"
    pub skills_used: Vec<String>,
    pub references_used: Vec<String>,
    pub version: String,
}

/// Motion Director - The AI Creative Director for Motion Design
pub struct MotionDirector {
    skill_manager: SkillManager,
}

impl MotionDirector {
    pub fn new() -> Self {
        Self {
            skill_manager: SkillManager::new(),
        }
    }

    /// Generate a complete motion design plan from a briefing
    pub async fn generate_plan(
        &self,
        app_data_dir: &Path,
        briefing: &MotionBriefing,
    ) -> AppResult<MotionDirectorPlan> {
        // Get enabled skills
        let skills = self.skill_manager.list_skills(None, None);
        let enabled_skills: Vec<&CreativeSkill> = skills.iter().filter(|s| s.enabled).collect();

        // Try NVIDIA LLM first
        let key_opt = SecureVault::get_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?;
        if let Some(key) = key_opt {
            let trimmed_key = key.trim();
            if !trimmed_key.is_empty() {
                match self.generate_with_llm(app_data_dir, briefing, &enabled_skills, trimmed_key).await {
                    Ok(plan) => return Ok(plan),
                    Err(e) => {
                        eprintln!("[MotionDirector] LLM generation failed: {}, using local fallback", e);
                    }
                }
            }
        }

        // Fallback to local generator
        self.generate_local_plan(briefing, &enabled_skills)
    }

    async fn generate_with_llm(
        &self,
        _app_data_dir: &Path,
        briefing: &MotionBriefing,
        skills: &[&CreativeSkill],
        api_key: &str,
    ) -> AppResult<MotionDirectorPlan> {
        let skills_summary: String = skills
            .iter()
            .map(|s| format!("- **{}**: {}", s.name, s.description))
            .collect::<Vec<_>>()
            .join("\n");

        let references_summary = if briefing.references.is_empty() {
            "Nenhuma referência anexada.".to_string()
        } else {
            briefing
                .references
                .iter()
                .map(|r| format!("- {} ({}): {}", r.file_name, r.file_type, r.purpose))
                .collect::<Vec<_>>()
                .join("\n")
        };

        let system_prompt = format!(
            r#"You are the Motion Director for ToolsOnDesk Creative Studio.
Your job is to create a complete, structured motion design plan from a user briefing.

OUTPUT FORMAT: You MUST return ONLY valid JSON matching this exact schema:
{{
  "project": {{
    "title": "string",
    "concept": "string",
    "style": "string",
    "width": number,
    "height": number,
    "fps": number,
    "duration_sec": number,
    "background_color": "string (hex)",
    "color_palette": ["string (hex)", ...],
    "typography": {{
      "primary_font": "string",
      "secondary_font": "string",
      "heading_size": number,
      "body_size": number,
      "accent_color": "string (hex)"
    }}
  }},
  "scenes": [
    {{
      "id": "string",
      "order": number,
      "title": "string",
      "duration_sec": number,
      "start_time": number,
      "description": "string",
      "visual_cue": "string",
      "camera_movement": "string|null",
      "layers": [
        {{
          "id": "string",
          "layer_type": "text|image|video|shape|gradient|svg|icon|screenshot|chart|group|audio",
          "name": "string",
          "content": "string",
          "asset_id": "string|null",
          "start_time": number,
          "duration_sec": number,
          "transform": {{
            "x": number, "y": number, "width": number, "height": number,
            "rotation": number, "scale": number, "opacity": number,
            "anchor_x": number, "anchor_y": number
          }},
          "style": {{
            "color": "string (hex)",
            "background_color": "string (hex)|null",
            "font_size": number|null,
            "font_family": "string|null",
            "font_weight": "string|null",
            "text_align": "string|null",
            "line_height": number|null,
            "letter_spacing": number|null,
            "border_radius": number|null,
            "border_width": number|null,
            "border_color": "string (hex)|null",
            "shadow": {{"offset_x": number, "offset_y": number, "blur": number, "color": "string (hex)"}}|null,
            "gradient": {{"type": "linear|radial", "stops": [{{"color": "string (hex)", "position": number}}, ...], "angle": number}}|null
          }},
          "animation": {{
            "tracks": [
              {{"property": "string", "keyframes": [{{"time": number, "value": number|string}}, ...], "easing": "string"}}, ...
            ],
            "preset": "string|null"
          }}|null,
          "z_index": number
        }}, ...
      ],
      "transition_in": {{"type": "string", "duration_sec": number, "easing": "string", "direction": "string|null"}}|null,
      "transition_out": {{"type": "string", "duration_sec": number, "easing": "string", "direction": "string|null"}}|null
    }}, ...
  ],
  "audio": {{
    "tracks": [
      {{"id": "string", "name": "string", "asset_path": "string", "start_time": number, "duration_sec": number|null, "volume": number, "fade_in_sec": number, "fade_out_sec": number, "loop_audio": boolean}}, ...
    ],
    "master_volume": number
  }}|null,
  "metadata": {{
    "created_at": "ISO8601",
    "generator": "nvidia_llm",
    "skills_used": ["string", ...],
    "references_used": ["string", ...],
    "version": "1.0"
  }}
}}

CONSTRAINTS:
1. ALL numeric values must be valid numbers (not strings)
2. ALL colors must be hex strings (e.g., "15F5BA" with leading #)
3. Transform values (x,y,width,height) are 0.0-1.0 relative
4. Layer start_time and duration_sec are in seconds
5. Animation keyframe time is 0.0-1.0 relative to layer duration
6. Use Geist for primary_font, Geist Mono for secondary_font
7. Mint accent color: #15F5BA
8. Dark background: #0B0F10
9. Surface: #141A1C
10. Create MULTIPLE scenes (minimum 3, maximum 8)
11. Each scene must have 2+ layers with different types
12. Use skills knowledge for creative decisions
13. Incorporate user references as actual layers (images, screenshots, etc.)
14. NO markdown, NO explanation - ONLY the JSON object

BRIEFING:
- User Prompt: {prompt}
- Project Type: {project_type}
- Style: {style}
- Target Duration: {duration_sec}s
- Aspect Ratio: {aspect_ratio}
- Platform: {platform}
- Target Audience: {audience}
- Brand Identity: {brand}

SKILLS AVAILABLE:
{skills_summary}

REFERENCES:
{references_summary}

Generate a professional motion design plan now."#,
            prompt = briefing.prompt,
            project_type = briefing.project_type,
            style = briefing.style,
            duration_sec = briefing.duration_sec.unwrap_or(15.0),
            aspect_ratio = briefing.aspect_ratio,
            platform = briefing.platform.clone().unwrap_or_default(),
            audience = briefing.audience.clone().unwrap_or_default(),
            brand = briefing.brand_identity.clone().unwrap_or_default(),
            skills_summary = skills_summary,
            references_summary = references_summary,
        );

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| AppError::Internal(format!("HTTP client error: {}", e)))?;

        let candidate_models = [
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "nvidia/nemotron-4-340b-instruct",
            "mistralai/mistral-large-2-instruct",
            "meta/llama-3.2-90b-vision-instruct",
        ];

        let endpoint = format!("{}/chat/completions", NVIDIA_CHAT_BASE_URL);

        for model_id in candidate_models {
            let payload = serde_json::json!({
                "model": model_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate the motion design plan as JSON only."}
                ],
                "temperature": 0.3,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"},
            });

            let resp = client
                .post(&endpoint)
                .header(reqwest::header::AUTHORIZATION, format!("Bearer {}", api_key))
                .header(reqwest::header::CONTENT_TYPE, "application/json")
                .json(&payload)
                .send()
                .await;

            match resp {
                Ok(r) => {
                    let status = r.status();
                    if status.is_success() {
                        let body: serde_json::Value = r.json().await
                            .map_err(|e| AppError::Nvidia(format!("Invalid JSON response: {}", e)))?;

                        if let Some(content) = body
                            .get("choices")
                            .and_then(|c| c.get(0))
                            .and_then(|c| c.get("message"))
                            .and_then(|m| m.get("content"))
                            .and_then(|v| v.as_str())
                        {
                            if let Ok(plan) = serde_json::from_str::<MotionDirectorPlan>(content) {
                                return Ok(plan);
                            } else {
                                eprintln!("[MotionDirector] Failed to parse LLM JSON response");
                            }
                        }
                    } else if status.as_u16() == 410 || status.as_u16() == 404 {
                        continue;
                    } else if status.as_u16() == 401 {
                        return Err(AppError::Nvidia("Invalid NVIDIA API key".into()));
                    }
                }
                Err(e) => {
                    eprintln!("[MotionDirector] Connection error with {}: {}", model_id, e);
                }
            }
        }

        Err(AppError::Nvidia("All LLM models unavailable".into()))
    }

    fn parse_aspect_ratio(ratio: &str, width: Option<u32>, height: Option<u32>) -> (u32, u32) {
        if let (Some(w), Some(h)) = (width, height) {
            return (w, h);
        }
        match ratio {
            "16:9" => (1920, 1080),
            "9:16" => (1080, 1920),
            "1:1" => (1080, 1080),
            "4:3" => (1440, 1080),
            "3:4" => (1080, 1440),
            "21:9" => (2560, 1080),
            _ => (1080, 1920), // Default to vertical
        }
    }

    fn generate_local_plan(
        &self,
        briefing: &MotionBriefing,
        skills: &[&CreativeSkill],
    ) -> AppResult<MotionDirectorPlan> {
        let (width, height) = Self::parse_aspect_ratio(&briefing.aspect_ratio, briefing.width, briefing.height);
        let duration = briefing.duration_sec.unwrap_or(15.0);
        let fps = briefing.fps.unwrap_or(30);
        let now = chrono::Utc::now().to_rfc3339();

        // Create a structured multi-scene plan based on briefing and skills
        let scenes = self.build_scenes_from_briefing(briefing, width, height, duration, skills);
        let total_duration: f32 = scenes.iter().map(|s| s.duration_sec).sum();

        let project = MotionProjectPlan {
            title: briefing.title.clone().unwrap_or_else(|| "Motion Project".to_string()),
            concept: briefing.prompt.clone(),
            style: briefing.style.clone(),
            width,
            height,
            fps,
            duration_sec: total_duration,
            background_color: "#0B0F10".to_string(),
            color_palette: vec!["#0B0F10".to_string(), "#141A1C".to_string(), "#15F5BA".to_string(), "#F3F4F6".to_string()],
            typography: TypographyPlan {
                primary_font: "Geist".to_string(),
                secondary_font: "Geist Mono".to_string(),
                heading_size: 72.0,
                body_size: 24.0,
                accent_color: "#15F5BA".to_string(),
            },
        };

        Ok(MotionDirectorPlan {
            project,
            scenes,
            audio: None,
            metadata: PlanMetadata {
                created_at: now,
                generator: "local_fallback".to_string(),
                skills_used: skills.iter().map(|s| s.name.clone()).collect(),
                references_used: briefing.references.iter().map(|r| r.file_path.clone()).collect(),
                version: "1.0".to_string(),
            },
        })
    }

    fn build_scenes_from_briefing(
        &self,
        briefing: &MotionBriefing,
        width: u32,
        height: u32,
        duration: f32,
        skills: &[&CreativeSkill],
    ) -> Vec<ScenePlan> {
        let mut scenes = Vec::new();
        let mut current_time = 0.0;

        // Determine scene structure based on project type and duration
        let scene_configs = self.determine_scene_structure(briefing, duration, skills);

        for (idx, config) in scene_configs.iter().enumerate() {
            let scene_duration = config.duration;
            let layers = self.build_layers_for_scene(briefing, config, width, height, idx, skills);

            let scene = ScenePlan {
                id: format!("scene-{}", idx + 1),
                order: (idx + 1) as u32,
                title: config.title.clone(),
                duration_sec: scene_duration,
                start_time: current_time,
                description: config.description.clone(),
                visual_cue: config.visual_cue.clone(),
                camera_movement: config.camera_movement.clone(),
                layers,
                transition_in: if idx == 0 { None } else { Some(TransitionPlan {
                    type_: "fade".to_string(),
                    duration_sec: 0.5,
                    easing: "ease_in_out".to_string(),
                    direction: None,
                })},
                transition_out: if idx == scene_configs.len() - 1 { None } else { Some(TransitionPlan {
                    type_: "wipe".to_string(),
                    duration_sec: 0.6,
                    easing: "ease_in_out".to_string(),
                    direction: Some("left".to_string()),
                })},
            };

            current_time += scene_duration;
            scenes.push(scene);
        }

        scenes
    }

    fn determine_scene_structure(
        &self,
        briefing: &MotionBriefing,
        duration: f32,
        skills: &[&CreativeSkill],
    ) -> Vec<SceneConfig> {
        let _has_storyboard_skill = skills.iter().any(|s| s.name == "storyboard-creation");
        let _has_shortform_skill = skills.iter().any(|s| s.name == "short-form-storytelling");
        let _has_advertising_skill = skills.iter().any(|s| s.name == "advertising-design");
        let _has_brand_skill = skills.iter().any(|s| s.name == "brand-identity");
        let _has_logo_anim_skill = skills.iter().any(|s| s.name == "logo-animation");
        let _has_kinetic_type_skill = skills.iter().any(|s| s.name == "kinetic-typography");
        let _has_transitions_skill = skills.iter().any(|s| s.name == "motion-transitions");
        let has_camera_skill = skills.iter().any(|s| s.name == "camera-animation");
        let has_3d_skill = skills.iter().any(|s| s.name == "procedural-3d-scenes");

        let num_scenes = if duration <= 8.0 { 3 } else if duration <= 20.0 { 4 } else { 5 };
        let scene_duration = duration / num_scenes as f32;

        match briefing.project_type.as_str() {
            "advertising" | "promo" | "commercial" => {
                vec![
                    SceneConfig {
                        title: "Hook / Gancho".to_string(),
                        duration: scene_duration.min(3.0),
                        description: "Abertura impactante com gancho visual e textual".to_string(),
                        visual_cue: "Entrada cinética do título principal com partículas ou brilho mint".to_string(),
                        camera_movement: if has_camera_skill { Some("Dolly In Suave".to_string()) } else { None },
                    },
                    SceneConfig {
                        title: "Produto / Valor".to_string(),
                        duration: scene_duration * 1.5,
                        description: "Apresentação do produto/serviço com benefícios visuais".to_string(),
                        visual_cue: "Screenshot real da aplicação com zoom e pan simulado (Ken Burns)".to_string(),
                        camera_movement: if has_camera_skill { Some("Pan Lateral + Zoom".to_string()) } else { None },
                    },
                    SceneConfig {
                        title: "Funcionalidades / Prova".to_string(),
                        duration: scene_duration * 1.2,
                        description: "Destaque de 3+ funcionalidades com animações independentes".to_string(),
                        visual_cue: "Cards animados em cascade/stagger com ícones e métricas".to_string(),
                        camera_movement: if has_3d_skill { Some("Parallax em camadas".to_string()) } else { None },
                    },
                    SceneConfig {
                        title: "CTA / Encerramento".to_string(),
                        duration: scene_duration,
                        description: "Logotipo, chamada para ação e saída animada".to_string(),
                        visual_cue: "Logo com animação spring + brilho sweep + botão CTA pulsante".to_string(),
                        camera_movement: None,
                    },
                ]
            }
            "reels" | "shorts" | "tiktok" | "vertical" => {
                vec![
                    SceneConfig {
                        title: "Gancho (0-3s)".to_string(),
                        duration: 3.0,
                        description: "Pergunta instigante ou visual surpreendente".to_string(),
                        visual_cue: "Texto cinético palavra-por-palavra com máscara de revelação".to_string(),
                        camera_movement: None,
                    },
                    SceneConfig {
                        title: "Entrega de Valor (3-10s)".to_string(),
                        duration: 7.0,
                        description: "Demonstração rápida do produto em ação".to_string(),
                        visual_cue: "Screen recording ou mockup animado com setas indicativas".to_string(),
                        camera_movement: if has_camera_skill { Some("Pan Rápido".to_string()) } else { None },
                    },
                    SceneConfig {
                        title: "CTA Final (10-15s)".to_string(),
                        duration: 5.0,
                        description: "Oferta + seta para botão de ação".to_string(),
                        visual_cue: "Botão animado com pulse + texto 'Baixe Agora'".to_string(),
                        camera_movement: None,
                    },
                ]
            }
            "brand" | "logo" | "identity" => {
                vec![
                    SceneConfig {
                        title: "Abertura Atmosférica".to_string(),
                        duration: scene_duration,
                        description: "Construção do ambiente da marca".to_string(),
                        visual_cue: "Gradiente animado + partículas sutis + silhueta do logo".to_string(),
                        camera_movement: if has_camera_skill { Some("Slow Dolly".to_string()) } else { None },
                    },
                    SceneConfig {
                        title: "Revelação do Logo".to_string(),
                        duration: scene_duration,
                        description: "Animação principal da marca".to_string(),
                        visual_cue: "Logo com escala elástica (spring) + sweep de luz mint 45°".to_string(),
                        camera_movement: None,
                    },
                    SceneConfig {
                        title: "Tagline & Identidade".to_string(),
                        duration: scene_duration,
                        description: "Slogan e elementos de identidade visual".to_string(),
                        visual_cue: "Tipografia cinética escalonada + paleta de cores da marca".to_string(),
                        camera_movement: None,
                    },
                ]
            }
            "explainer" | "educational" | "demo" => {
                vec![
                    SceneConfig {
                        title: "Problema / Contexto".to_string(),
                        duration: scene_duration,
                        description: "Apresentação do problema que resolve".to_string(),
                        visual_cue: "Ilustração ou screenshot do 'antes' com destaque na dor".to_string(),
                        camera_movement: None,
                    },
                    SceneConfig {
                        title: "Solução / Demonstração".to_string(),
                        duration: scene_duration * 1.5,
                        description: "Walkthrough da solução passo a passo".to_string(),
                        visual_cue: "Interface real animada com callouts e setas".to_string(),
                        camera_movement: if has_camera_skill { Some("Pan Guiado".to_string()) } else { None },
                    },
                    SceneConfig {
                        title: "Benefícios / Resultados".to_string(),
                        duration: scene_duration,
                        description: "Métricas e transformação (antes vs depois)".to_string(),
                        visual_cue: "Contadores animados + gráfico comparativo + depoimento visual".to_string(),
                        camera_movement: None,
                    },
                    SceneConfig {
                        title: "Próximos Passos".to_string(),
                        duration: scene_duration,
                        description: "CTA claro para próxima ação".to_string(),
                        visual_cue: "Botão CTA + QR code ou link curto + logo".to_string(),
                        camera_movement: None,
                    },
                ]
            }
            _ => {
                // Generic fallback
                vec![
                    SceneConfig {
                        title: "Introdução".to_string(),
                        duration: scene_duration,
                        description: "Abertura com título principal".to_string(),
                        visual_cue: "Título animado com entrada slide-up + fundo gradiente".to_string(),
                        camera_movement: None,
                    },
                    SceneConfig {
                        title: "Desenvolvimento".to_string(),
                        duration: scene_duration * 1.5,
                        description: "Conteúdo principal em múltiplas camadas".to_string(),
                        visual_cue: "Elementos visuais (imagens/ícones) + textos de apoio animados".to_string(),
                        camera_movement: None,
                    },
                    SceneConfig {
                        title: "Conclusão".to_string(),
                        duration: scene_duration,
                        description: "Fechamento com CTA".to_string(),
                        visual_cue: "Logo + chamada para ação + saída fade".to_string(),
                        camera_movement: None,
                    },
                ]
            }
        }
    }

    fn build_layers_for_scene(
        &self,
        briefing: &MotionBriefing,
        config: &SceneConfig,
        _width: u32,
        _height: u32,
        scene_idx: usize,
        skills: &[&CreativeSkill],
    ) -> Vec<LayerPlan> {
        let mut layers = Vec::new();
        let has_kinetic_type = skills.iter().any(|s| s.name == "kinetic-typography");
        let has_logo_anim = skills.iter().any(|s| s.name == "logo-animation");
        let has_brand = skills.iter().any(|s| s.name == "brand-identity");
        let _has_3d = skills.iter().any(|s| s.name == "procedural-3d-scenes");
        let has_advertising = skills.iter().any(|s| s.name == "advertising-design");

        // Background layer (always first)
        layers.push(LayerPlan {
            id: format!("bg-{}", scene_idx),
            layer_type: LayerType::Gradient,
            name: "Background".to_string(),
            content: "".to_string(),
            asset_id: None,
            start_time: 0.0,
            duration_sec: config.duration,
            transform: TransformPlan {
                x: 0.0, y: 0.0, width: 1.0, height: 1.0,
                rotation: 0.0, scale: 1.0, opacity: 1.0,
                anchor_x: 0.0, anchor_y: 0.0,
            },
            style: StylePlan {
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
                gradient: Some(GradientPlan {
                    type_: "linear".to_string(),
                    stops: vec![
                        GradientStop { color: "#0B0F10".to_string(), position: 0.0 },
                        GradientStop { color: "#141A1C".to_string(), position: 1.0 },
                    ],
                    angle: 135.0,
                }),
            },
            animation: None,
            z_index: -100,
        });

        // Reference images as layers
        for (ref_idx, reference) in briefing.references.iter().enumerate() {
            if matches!(reference.file_type.as_str(), "image" | "screenshot") {
                let layer_start = (ref_idx as f32 * 0.3).min(config.duration * 0.5);
                layers.push(LayerPlan {
                    id: format!("ref-{}-{}", scene_idx, ref_idx),
                    layer_type: LayerType::Image,
                    name: reference.file_name.clone(),
                    content: reference.file_path.clone(),
                    asset_id: Some(reference.id.clone()),
                    start_time: layer_start,
                    duration_sec: config.duration - layer_start,
                    transform: TransformPlan {
                        x: 0.1, y: 0.15, width: 0.8, height: 0.6,
                        rotation: 0.0, scale: 1.0, opacity: 1.0,
                        anchor_x: 0.5, anchor_y: 0.5,
                    },
                    style: StylePlan {
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
                        shadow: Some(ShadowPlan {
                            offset_x: 0.0, offset_y: 20.0, blur: 40.0, color: "#000000".to_string(),
                        }),
                        gradient: None,
                    },
                    animation: Some(AnimationPlan {
                        tracks: vec![
                            AnimationTrack {
                                property: "transform.scale".to_string(),
                                keyframes: vec![
                                    Keyframe { time: 0.0, value: serde_json::json!(0.85) },
                                    Keyframe { time: 0.5, value: serde_json::json!(1.0) },
                                    Keyframe { time: 1.0, value: serde_json::json!(1.02) },
                                ],
                                easing: "ease_in_out".to_string(),
                            },
                            AnimationTrack {
                                property: "opacity".to_string(),
                                keyframes: vec![
                                    Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                                    Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                                ],
                                easing: "ease_in_out".to_string(),
                            },
                        ],
                        preset: Some("zoom_in".to_string()),
                    }),
                    z_index: 10 + ref_idx as i32,
                });
            }
        }

        // Text layers based on scene type
        let headline = self.extract_headline(&briefing.prompt, scene_idx);
        
        if scene_idx == 0 {
            // Hook scene - main headline with kinetic typography
            layers.push(self.create_text_layer(
                &format!("headline-{}", scene_idx),
                "Título Principal",
                &headline,
                0.2,
                config.duration - 0.2,
                TransformPlan {
                    x: 0.08, y: 0.25, width: 0.84, height: 0.18,
                    rotation: 0.0, scale: 1.0, opacity: 1.0,
                    anchor_x: 0.0, anchor_y: 0.0,
                },
                StylePlan {
                    color: "#15F5BA".to_string(),
                    background_color: None,
                    font_size: Some(72.0),
                    font_family: Some("Geist".to_string()),
                    font_weight: Some("700".to_string()),
                    text_align: Some("left".to_string()),
                    line_height: Some(1.1),
                    letter_spacing: Some(-0.02),
                    border_radius: None,
                    border_width: None,
                    border_color: None,
                    shadow: Some(ShadowPlan {
                        offset_x: 0.0, offset_y: 4.0, blur: 20.0, color: "#000000".to_string(),
                    }),
                    gradient: None,
                },
                has_kinetic_type,
            ));
        } else if scene_idx == config.duration as usize - 1 || config.title.contains("CTA") || config.title.contains("Encerramento") {
            // CTA scene - logo + button
            layers.push(self.create_text_layer(
                &format!("cta-{}", scene_idx),
                "Call to Action",
                "BAIXE AGORA",
                0.5,
                config.duration - 0.5,
                TransformPlan {
                    x: 0.2, y: 0.7, width: 0.6, height: 0.12,
                    rotation: 0.0, scale: 1.0, opacity: 1.0,
                    anchor_x: 0.5, anchor_y: 0.5,
                },
                StylePlan {
                    color: "#0B0F10".to_string(),
                    background_color: Some("#15F5BA".to_string()),
                    font_size: Some(36.0),
                    font_family: Some("Geist".to_string()),
                    font_weight: Some("700".to_string()),
                    text_align: Some("center".to_string()),
                    line_height: Some(1.0),
                    letter_spacing: Some(0.05),
                    border_radius: Some(50.0),
                    border_width: None,
                    border_color: None,
                    shadow: Some(ShadowPlan {
                        offset_x: 0.0, offset_y: 8.0, blur: 24.0, color: "#15F5BA".to_string(),
                    }),
                    gradient: None,
                },
                true,
            ));

            if has_logo_anim || has_brand {
                layers.push(LayerPlan {
                    id: format!("logo-{}", scene_idx),
                    layer_type: LayerType::Svg,
                    name: "Logo ToolsOnDesk".to_string(),
                    content: "".to_string(),
                    asset_id: None,
                    start_time: 0.3,
                    duration_sec: config.duration - 0.3,
                    transform: TransformPlan {
                        x: 0.35, y: 0.3, width: 0.3, height: 0.3,
                        rotation: 0.0, scale: 1.0, opacity: 1.0,
                        anchor_x: 0.5, anchor_y: 0.5,
                    },
                    style: StylePlan {
                        color: "#15F5BA".to_string(),
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
                        shadow: Some(ShadowPlan {
                            offset_x: 0.0, offset_y: 0.0, blur: 30.0, color: "#15F5BA".to_string(),
                        }),
                        gradient: None,
                    },
                    animation: Some(AnimationPlan {
                        tracks: vec![
                            AnimationTrack {
                                property: "transform.scale".to_string(),
                                keyframes: vec![
                                    Keyframe { time: 0.0, value: serde_json::json!(0.5) },
                                    Keyframe { time: 0.4, value: serde_json::json!(1.1) },
                                    Keyframe { time: 0.6, value: serde_json::json!(1.0) },
                                ],
                                easing: "spring".to_string(),
                            },
                            AnimationTrack {
                                property: "opacity".to_string(),
                                keyframes: vec![
                                    Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                                    Keyframe { time: 0.2, value: serde_json::json!(1.0) },
                                ],
                                easing: "ease_in_out".to_string(),
                            },
                        ],
                        preset: Some("spring".to_string()),
                    }),
                    z_index: 50,
                });
            }
        } else {
            // Middle scenes - feature cards, benefits, etc.
            let features = self.extract_features(&briefing.prompt);
            for (feat_idx, feature) in features.iter().enumerate().take(3) {
                let delay = feat_idx as f32 * 0.15;
                layers.push(self.create_feature_card(
                    &format!("feat-{}-{}", scene_idx, feat_idx),
                    feature,
                    0.3 + delay,
                    config.duration - 0.3 - delay,
                    TransformPlan {
                        x: 0.08, y: 0.2 + (feat_idx as f32 * 0.25), width: 0.84, height: 0.2,
                        rotation: 0.0, scale: 1.0, opacity: 1.0,
                        anchor_x: 0.0, anchor_y: 0.0,
                    },
                    has_kinetic_type,
                ));
            }
        }

        // Add decorative shapes/elements
        if has_advertising && scene_idx > 0 {
            layers.push(LayerPlan {
                id: format!("accent-{}-1", scene_idx),
                layer_type: LayerType::Shape,
                name: "Accent Bar".to_string(),
                content: "".to_string(),
                asset_id: None,
                start_time: 0.1,
                duration_sec: config.duration - 0.1,
                transform: TransformPlan {
                    x: 0.08, y: 0.15, width: 0.12, height: 0.006,
                    rotation: 0.0, scale: 1.0, opacity: 1.0,
                    anchor_x: 0.0, anchor_y: 0.0,
                },
                style: StylePlan {
                    color: "#15F5BA".to_string(),
                    background_color: None,
                    font_size: None,
                    font_family: None,
                    font_weight: None,
                    text_align: None,
                    line_height: None,
                    letter_spacing: None,
                    border_radius: Some(3.0),
                    border_width: None,
                    border_color: None,
                    shadow: None,
                    gradient: None,
                },
                animation: Some(AnimationPlan {
                    tracks: vec![AnimationTrack {
                        property: "transform.scale".to_string(),
                        keyframes: vec![
                            Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                            Keyframe { time: 0.4, value: serde_json::json!(1.0) },
                        ],
                        easing: "spring".to_string(),
                    }],
                    preset: Some("scale_in".to_string()),
                }),
                z_index: 5,
            });
        }

        layers
    }

    fn create_text_layer(
        &self,
        id: &str,
        name: &str,
        content: &str,
        start_time: f32,
        duration: f32,
        transform: TransformPlan,
        style: StylePlan,
        kinetic: bool,
    ) -> LayerPlan {
        let animation = if kinetic {
            Some(AnimationPlan {
                tracks: vec![
                    AnimationTrack {
                        property: "transform.y".to_string(),
                        keyframes: vec![
                            Keyframe { time: 0.0, value: serde_json::json!(transform.y + 0.08) },
                            Keyframe { time: 0.5, value: serde_json::json!(transform.y) },
                        ],
                        easing: "spring".to_string(),
                    },
                    AnimationTrack {
                        property: "opacity".to_string(),
                        keyframes: vec![
                            Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                            Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                        ],
                        easing: "ease_in_out".to_string(),
                    },
                ],
                preset: Some("slide_up".to_string()),
            })
        } else {
            Some(AnimationPlan {
                tracks: vec![AnimationTrack {
                    property: "opacity".to_string(),
                    keyframes: vec![
                        Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                        Keyframe { time: 0.4, value: serde_json::json!(1.0) },
                    ],
                    easing: "ease_in_out".to_string(),
                }],
                preset: Some("fade_in".to_string()),
            })
        };

        LayerPlan {
            id: id.to_string(),
            layer_type: LayerType::Text,
            name: name.to_string(),
            content: content.to_string(),
            asset_id: None,
            start_time,
            duration_sec: duration,
            transform,
            style,
            animation,
            z_index: 20,
        }
    }

    fn create_feature_card(
        &self,
        id: &str,
        content: &str,
        start_time: f32,
        duration: f32,
        transform: TransformPlan,
        kinetic: bool,
    ) -> LayerPlan {
        let start_x = transform.x; // Extract before move
        LayerPlan {
            id: id.to_string(),
            layer_type: LayerType::Shape,
            name: "Feature Card".to_string(),
            content: content.to_string(),
            asset_id: None,
            start_time,
            duration_sec: duration,
            transform,
            style: StylePlan {
                color: "#F3F4F6".to_string(),
                background_color: Some("#141A1C".to_string()),
                font_size: Some(28.0),
                font_family: Some("Geist".to_string()),
                font_weight: Some("500".to_string()),
                text_align: Some("left".to_string()),
                line_height: Some(1.3),
                letter_spacing: None,
                border_radius: Some(12.0),
                border_width: Some(1.0),
                border_color: Some("#1F292B".to_string()),
                shadow: Some(ShadowPlan {
                    offset_x: 0.0, offset_y: 8.0, blur: 24.0, color: "#000000".to_string(),
                }),
                gradient: None,
            },
            animation: if kinetic {
                Some(AnimationPlan {
                    tracks: vec![
                        AnimationTrack {
                            property: "transform.x".to_string(),
                            keyframes: vec![
                                Keyframe { time: 0.0, value: serde_json::json!(start_x - 0.1) },
                                Keyframe { time: 0.5, value: serde_json::json!(start_x) },
                            ],
                            easing: "spring".to_string(),
                        },
                        AnimationTrack {
                            property: "opacity".to_string(),
                            keyframes: vec![
                                Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                                Keyframe { time: 0.3, value: serde_json::json!(1.0) },
                            ],
                            easing: "ease_in_out".to_string(),
                        },
                    ],
                    preset: Some("slide_right".to_string()),
                })
            } else {
                Some(AnimationPlan {
                    tracks: vec![AnimationTrack {
                        property: "opacity".to_string(),
                        keyframes: vec![
                            Keyframe { time: 0.0, value: serde_json::json!(0.0) },
                            Keyframe { time: 0.4, value: serde_json::json!(1.0) },
                        ],
                        easing: "ease_in_out".to_string(),
                    }],
                    preset: Some("fade_in".to_string()),
                })
            },
            z_index: 15,
        }
    }

    fn extract_headline(&self, prompt: &str, _scene_idx: usize) -> String {
        // Try to extract a meaningful headline from the prompt
        let words: Vec<&str> = prompt.split_whitespace().collect();
        if words.len() >= 3 {
            // Take first 4-6 words as headline
            let end = (words.len()).min(6);
            words[..end].join(" ").to_uppercase()
        } else {
            prompt.to_uppercase()
        }
    }

    fn extract_features(&self, prompt: &str) -> Vec<String> {
        // Extract key features/benefits from prompt
        let keywords = ["ferramenta", "produtividade", "criativo", "design", "vídeo", "imagem", "ia", "automação", "workflow", "interface", "dashboard", "analytics", "colaboração", "nuvem", "local", "rápido", "profissional"];
        let mut features = Vec::new();
        let prompt_lower = prompt.to_lowercase();
        
        for kw in keywords {
            if prompt_lower.contains(kw) {
                features.push(format!("✨ {}", kw.to_uppercase()));
            }
        }
        
        if features.is_empty() {
            features = vec!["✨ FERRAMENTAS CRIATIVAS".to_string(), "⚡ PRODUTIVIDADE IA".to_string(), "🎨 DESIGN PROFISSIONAL".to_string()];
        }
        
        features
    }

    /// Convert MotionDirectorPlan to MotionComposition for rendering
    pub fn plan_to_composition(&self, plan: &MotionDirectorPlan) -> MotionComposition {
        MotionComposition {
            id: format!("motion-{}", uuid::Uuid::new_v4().simple()),
            title: plan.project.title.clone(),
            width: plan.project.width,
            height: plan.project.height,
            fps: plan.project.fps,
            duration_sec: plan.project.duration_sec,
            background_color: plan.project.background_color.clone(),
            scenes: plan.scenes.iter().map(|s| MotionScene {
                id: s.id.clone(),
                title: s.title.clone(),
                start_time: s.start_time,
                duration_sec: s.duration_sec,
                layers: s.layers.iter().map(|l| self.layer_plan_to_layer(l)).collect(),
            }).collect(),
            audio_track: plan.audio.as_ref().map(|a| MotionAudioTrack {
                file_path: a.tracks.first().map(|t| t.asset_path.clone()).unwrap_or_default(),
                volume: a.master_volume,
                loop_audio: false,
            }),
        }
    }

    fn layer_plan_to_layer(&self, plan: &LayerPlan) -> MotionLayer {
        MotionLayer {
            id: plan.id.clone(),
            layer_type: match plan.layer_type {
                LayerType::Text => "text".to_string(),
                LayerType::Image => "image".to_string(),
                LayerType::Video => "video".to_string(),
                LayerType::Shape => "shape".to_string(),
                LayerType::Gradient => "gradient".to_string(),
                LayerType::Svg => "svg".to_string(),
                LayerType::Icon => "icon".to_string(),
                LayerType::Screenshot => "image".to_string(),
                LayerType::Chart => "shape".to_string(),
                LayerType::Group => "group".to_string(),
                LayerType::Audio => "audio".to_string(),
            },
            name: plan.name.clone(),
            content: plan.content.clone(),
            start_time: plan.start_time,
            duration_sec: plan.duration_sec,
            x: plan.transform.x,
            y: plan.transform.y,
            width: plan.transform.width,
            height: plan.transform.height,
            opacity: plan.transform.opacity,
            scale: plan.transform.scale,
            rotation: plan.transform.rotation,
            color: plan.style.color.clone(),
            font_size: plan.style.font_size,
            font_family: plan.style.font_family.clone(),
            animation: plan.animation.as_ref().and_then(|anim| {
                let preset = anim.preset.clone().unwrap_or_else(|| "fade_in".to_string());
                anim.tracks.first().map(|t| MotionAnimation {
                    effect: preset,
                    easing: t.easing.clone(),
                    duration_sec: plan.duration_sec * 0.5,
                    delay_sec: plan.start_time,
                })
            }),
            z_index: plan.z_index,
        }
    }
}

#[derive(Debug, Clone)]
pub struct SceneConfig {
    title: String,
    duration: f32,
    description: String,
    visual_cue: String,
    camera_movement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionBriefing {
    pub prompt: String,
    pub title: Option<String>,
    pub project_type: String, // "advertising", "reels", "brand", "explainer", etc.
    pub style: String,
    pub duration_sec: Option<f32>,
    pub fps: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub aspect_ratio: String,
    pub platform: Option<String>,
    pub audience: Option<String>,
    pub brand_identity: Option<String>,
    pub references: Vec<ReferenceInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceInput {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub purpose: String,
}