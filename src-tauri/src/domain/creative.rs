use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaKeyStatus {
    pub has_key: bool,
    pub masked_key: Option<String>,
    pub validated: bool,
    pub last_validated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaModelInfo {
    pub id: String,
    pub name: String,
    pub category: String, // "llm", "image", "video"
    pub provider: String,
    pub description: String,
    pub context_length: Option<u32>,
    pub supports_streaming: bool,
    pub cost_tier: String, // "free_tier", "standard"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaImageGenOptions {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub style_preset: Option<String>,
    pub aspect_ratio: String, // "1:1", "16:9", "9:16", "4:3", etc.
    pub width: u32,
    pub height: u32,
    pub steps: Option<u32>,
    pub cfg_scale: Option<f32>,
    pub seed: Option<u64>,
    pub samples: u32,
    pub model_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaImageGenResult {
    pub image_paths: Vec<String>,
    pub prompt: String,
    pub seed: u64,
    pub model_id: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaVideoGenOptions {
    pub prompt: String,
    pub reference_image_path: Option<String>,
    pub model_id: Option<String>,
    pub duration_sec: u32,
    pub aspect_ratio: String,
    pub fps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaVideoGenResult {
    pub video_path: String,
    pub duration_sec: u32,
    pub model_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeProject {
    pub id: String,
    pub title: String,
    pub project_type: String, // "image", "motion", "video", "storyboard"
    pub aspect_ratio: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub duration_sec: f32,
    pub prompt: Option<String>,
    pub style: Option<String>,
    pub model: Option<String>,
    pub skills_used: Vec<String>,
    pub data_json: String,
    pub output_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub status: String, // "draft", "rendering", "completed", "failed"
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectPayload {
    pub title: String,
    pub project_type: String,
    pub aspect_ratio: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub duration_sec: f32,
    pub prompt: Option<String>,
    pub style: Option<String>,
    pub model: Option<String>,
    pub skills_used: Vec<String>,
    pub data_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeAsset {
    pub id: String,
    pub project_id: Option<String>,
    pub name: String,
    pub asset_type: String, // "image", "video", "audio", "font", "template"
    pub file_path: String,
    pub file_size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_sec: Option<f32>,
    pub mime_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeGenerationHistoryEntry {
    pub id: String,
    pub project_id: Option<String>,
    pub provider: String,
    pub model: String,
    pub modality: String, // "image", "motion", "video", "llm"
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub parameters_json: Option<String>,
    pub output_path: Option<String>,
    pub duration_ms: u64,
    pub status: String,
    pub error: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeSkill {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub category: String, // "design", "motion", "video", "3d_quality"
    pub version: String,
    pub tools: Vec<String>,
    pub limitations: String,
    pub license: String,
    pub content_md: String,
    pub enabled: bool,
    pub icon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenCodeStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub binary_path: Option<String>,
    pub running: bool,
    pub workspace_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionComposition {
    pub id: String,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub duration_sec: f32,
    pub background_color: String,
    pub scenes: Vec<MotionScene>,
    pub audio_track: Option<MotionAudioTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionScene {
    pub id: String,
    pub title: String,
    pub start_time: f32,
    pub duration_sec: f32,
    pub layers: Vec<MotionLayer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionLayer {
    pub id: String,
    pub layer_type: String, // "text", "image", "shape", "badge"
    pub name: String,
    pub content: String,
    pub start_time: f32,
    pub duration_sec: f32,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub opacity: f32,
    pub scale: f32,
    pub rotation: f32,
    pub color: String,
    pub font_size: Option<f32>,
    pub font_family: Option<String>,
    pub animation: Option<MotionAnimation>,
    pub z_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionAnimation {
    pub effect: String, // "fade_in", "slide_up", "zoom_in", "bounce", "glow", "wipe"
    pub easing: String, // "linear", "ease_in_out", "spring", "bounce"
    pub duration_sec: f32,
    pub delay_sec: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionAudioTrack {
    pub file_path: String,
    pub volume: f32,
    pub loop_audio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderMotionOptions {
    pub project_id: Option<String>,
    pub composition_json: String,
    pub output_filename: String,
    pub format: String, // "mp4", "webm", "png_sequence"
    pub quality: String, // "standard", "high", "ultra"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderCompositeVideoOptions {
    pub project_id: Option<String>,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub scenes_json: String,
    pub background_audio_path: Option<String>,
    pub audio_volume: Option<f32>,
    pub output_filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreativeTemplate {
    pub id: String,
    pub title: String,
    pub category: String,
    pub description: String,
    pub aspect_ratio: String,
    pub duration_sec: f32,
    pub thumbnail_preview: String,
    pub default_composition_json: String,
    pub editable_parameters: Vec<TemplateParameter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateParameter {
    pub id: String,
    pub label: String,
    pub param_type: String, // "text", "color", "number", "image", "select"
    pub default_value: String,
    pub current_value: String,
    pub options: Option<Vec<String>>,
    pub target_layer_id: String,
}
