export interface NvidiaKeyStatus {
  has_key: boolean;
  masked_key: string | null;
  validated: boolean;
  last_validated_at: string | null;
}

export interface NvidiaModelInfo {
  id: string;
  name: string;
  category: 'llm' | 'image' | 'video';
  provider: string;
  description: string;
  context_length: number | null;
  supports_streaming: boolean;
  cost_tier: 'free_tier' | 'standard';
}

export interface NvidiaValidationResult {
  valid: boolean;
  message: string;
  available_models: string[];
}

export interface NvidiaImageGenOptions {
  prompt: string;
  negative_prompt?: string;
  style_preset?: string;
  aspect_ratio: string;
  width: number;
  height: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
  samples: number;
  model_id?: string;
  references?: ProcessedReference[];
}

export interface NvidiaImageGenResult {
  image_paths: string[];
  prompt: string;
  seed: number;
  model_id: string;
  duration_ms: number;
}

export interface NvidiaVideoGenOptions {
  prompt: string;
  reference_image_path?: string;
  model_id?: string;
  duration_sec: number;
  aspect_ratio: string;
  fps: number;
}

export interface NvidiaVideoGenResult {
  video_path: string;
  duration_sec: number;
  model_id: string;
}

export interface CreativeProject {
  id: string;
  title: string;
  project_type: 'image' | 'motion' | 'video' | 'storyboard';
  aspect_ratio: string;
  width: number;
  height: number;
  fps: number;
  duration_sec: number;
  prompt: string | null;
  style: string | null;
  model: string | null;
  skills_used: string[];
  data_json: string;
  output_path: string | null;
  thumbnail_path: string | null;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  title: string;
  project_type: 'image' | 'motion' | 'video' | 'storyboard';
  aspect_ratio: string;
  width: number;
  height: number;
  fps: number;
  duration_sec: number;
  prompt?: string;
  style?: string;
  model?: string;
  skills_used: string[];
  data_json: string;
}

export interface CreativeAsset {
  id: string;
  project_id: string | null;
  name: string;
  asset_type: 'image' | 'video' | 'audio' | 'font' | 'template' | 'other';
  file_path: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface CreativeSkill {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: 'design' | 'motion' | 'video' | '3d_quality';
  version: string;
  tools: string[];
  limitations: string;
  license: string;
  content_md: string;
  enabled: boolean;
  icon: string;
}

export interface OpenCodeStatus {
  installed: boolean;
  version: string | null;
  binary_path: string | null;
  running: boolean;
  workspace_path: string;
}

export interface MotionComposition {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  duration_sec: number;
  background_color: string;
  scenes: MotionScene[];
  audio_track?: MotionAudioTrack;
}

export interface MotionScene {
  id: string;
  title: string;
  start_time: number;
  duration_sec: number;
  layers: MotionLayer[];
}

export interface MotionLayer {
  id: string;
  layer_type: 'text' | 'image' | 'shape' | 'badge';
  name: string;
  content: string;
  start_time: number;
  duration_sec: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  rotation: number;
  color: string;
  font_size?: number;
  font_family?: string;
  animation?: MotionAnimation;
  z_index: number;
}

export interface MotionAnimation {
  effect: 'fade_in' | 'slide_up' | 'zoom_in' | 'bounce' | 'glow' | 'wipe';
  easing: 'linear' | 'ease_in_out' | 'spring' | 'bounce';
  duration_sec: number;
  delay_sec: number;
}

export interface MotionAudioTrack {
  file_path: string;
  volume: number;
  loop_audio: boolean;
}

export interface RenderMotionOptions {
  project_id?: string;
  composition_json: string;
  output_filename: string;
  format: 'mp4' | 'webm' | 'png_sequence';
  quality: 'standard' | 'high' | 'ultra';
}

export interface CreativeTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  aspect_ratio: string;
  duration_sec: number;
  thumbnail_preview: string;
  default_composition_json: string;
  editable_parameters: TemplateParameter[];
}

export interface TemplateParameter {
  id: string;
  label: string;
  param_type: 'text' | 'color' | 'number' | 'image' | 'select';
  default_value: string;
  current_value: string;
  options?: string[];
  target_layer_id: string;
}

export type AgentAuthStatus =
  | 'not_installed'
  | 'unauthenticated'
  | 'authenticated'
  | 'rate_limited'
  | 'error';

export interface AgentModel {
  id: string;
  name: string;
  description: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  binary_path: string | null;
  version: string | null;
  auth_status: AgentAuthStatus;
  account_info: string | null;
  default_model: string | null;
  available_models: AgentModel[];
  supports_streaming: boolean;
  is_subscription: boolean;
}

export interface EnhancePromptResult {
  original_prompt: string;
  enhanced_prompt: string;
  agent_id: string;
  model: string;
  reasoning: string | null;
  recommended_style: string | null;
  recommended_ratio: string | null;
}

export interface ImageModelCapabilities {
  id: string;
  display_name: string;
  provider: string;
  supports_dimensions: boolean;
  min_steps: number;
  max_steps: number;
  default_steps: number;
  min_cfg: number;
  max_cfg: number;
  default_cfg: number;
  supports_negative_prompt: boolean;
  supported_aspect_ratios: string[];
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageEditOptions {
  input_path: string;
  output_path?: string;
  crop?: CropArea;
  rotate_deg?: number;
  flip_h?: boolean;
  flip_v?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  resize_width?: number;
  resize_height?: number;
  format?: 'png' | 'jpeg';
}

export interface ImageEditResult {
  output_path: string;
  width: number;
  height: number;
  file_size_bytes: number;
}

export type ReferenceFileType =
  | 'image'
  | 'pdf'
  | 'docx'
  | 'text'
  | 'markdown'
  | 'data'
  | 'svg'
  | 'other';

export type ReferencePurpose =
  | 'product'
  | 'style'
  | 'composition'
  | 'lighting'
  | 'character'
  | 'brand_identity'
  | 'instructions'
  | 'additional_context';

export interface ReferenceCompatibility {
  agent_compatible: boolean;
  image_model_compatible: boolean;
  mode: string;
  notes: string;
}

export interface ProcessedReference {
  id: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  file_type: ReferenceFileType;
  mime_type: string;
  purpose: ReferencePurpose;
  preview_data_url: string | null;
  width: number | null;
  height: number | null;
  page_count: number | null;
  extracted_text: string | null;
  extraction_status: string;
  compatibility: ReferenceCompatibility;
}

export interface GenerationMetadata {
  id: string;
  project_id: string | null;
  provider: string;
  model: string;
  modality: string;
  prompt: string;
  enhanced_prompt: string | null;
  agent_used: string | null;
  negative_prompt: string | null;
  operation: string;
  parameters_json: string | null;
  output_path: string | null;
  references: ProcessedReference[];
  duration_ms: number;
  status: string;
  created_at: string;
}

// Motion Director Types (Mission 10)
export interface MotionDirectorPlan {
  project: MotionProjectPlan;
  scenes: ScenePlan[];
  audio?: AudioPlan;
  metadata: PlanMetadata;
}

export interface MotionProjectPlan {
  title: string;
  concept: string;
  style: string;
  width: number;
  height: number;
  fps: number;
  duration_sec: number;
  background_color: string;
  color_palette: string[];
  typography: TypographyPlan;
}

export interface TypographyPlan {
  primary_font: string;
  secondary_font: string;
  heading_size: number;
  body_size: number;
  accent_color: string;
}

export interface ScenePlan {
  id: string;
  order: number;
  title: string;
  duration_sec: number;
  start_time: number;
  description: string;
  visual_cue: string;
  camera_movement?: string;
  layers: LayerPlan[];
  transition_in?: TransitionPlan;
  transition_out?: TransitionPlan;
}

export type LayerType = 
  | 'text' | 'image' | 'video' | 'shape' | 'gradient' 
  | 'svg' | 'icon' | 'screenshot' | 'chart' | 'group' | 'audio';

export interface LayerPlan {
  id: string;
  layer_type: LayerType;
  name: string;
  content: string;
  asset_id?: string;
  start_time: number;
  duration_sec: number;
  transform: TransformPlan;
  style: StylePlan;
  animation?: AnimationPlan;
  z_index: number;
}

export interface TransformPlan {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  anchor_x: number;
  anchor_y: number;
}

export interface StylePlan {
  color: string;
  background_color?: string;
  font_size?: number;
  font_family?: string;
  font_weight?: string;
  text_align?: string;
  line_height?: number;
  letter_spacing?: number;
  border_radius?: number;
  border_width?: number;
  border_color?: string;
  shadow?: ShadowPlan;
  gradient?: GradientPlan;
}

export interface ShadowPlan {
  offset_x: number;
  offset_y: number;
  blur: number;
  color: string;
}

export interface GradientPlan {
  type: 'linear' | 'radial';
  stops: GradientStop[];
  angle: number;
}

export interface GradientStop {
  color: string;
  position: number;
}

export interface AnimationPlan {
  tracks: AnimationTrack[];
  preset?: string;
}

export interface AnimationTrack {
  property: string;
  keyframes: Keyframe[];
  easing: string;
}

export interface Keyframe {
  time: number;
  value: number | string;
}

export interface TransitionPlan {
  type: string;
  duration_sec: number;
  easing: string;
  direction?: string;
}

export interface AudioPlan {
  tracks: AudioTrackPlan[];
  master_volume: number;
}

export interface AudioTrackPlan {
  id: string;
  name: string;
  asset_path: string;
  start_time: number;
  duration_sec?: number;
  volume: number;
  fade_in_sec: number;
  fade_out_sec: number;
  loop_audio: boolean;
}

export interface PlanMetadata {
  created_at: string;
  generator: string;
  skills_used: string[];
  references_used: string[];
  version: string;
}

// Briefing Input
export interface MotionBriefing {
  prompt: string;
  title?: string;
  project_type: string;
  style: string;
  duration_sec?: number;
  fps?: number;
  width?: number;
  height?: number;
  aspect_ratio: string;
  platform?: string;
  audience?: string;
  brand_identity?: string;
  references: ReferenceInput[];
}

export interface ReferenceInput {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  purpose: string;
}

export type CreativeStudioTab =
  | 'overview'
  | 'image-studio'
  | 'motion-studio'
  | 'video-studio'
  | 'skills'
  | 'projects'
  | 'assets'
  | 'settings';
