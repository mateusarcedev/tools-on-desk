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

export type CreativeStudioTab =
  | 'overview'
  | 'image-studio'
  | 'motion-studio'
  | 'video-studio'
  | 'skills'
  | 'projects'
  | 'assets'
  | 'settings';
