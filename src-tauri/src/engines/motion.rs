use crate::domain::{MotionComposition, RenderMotionOptions};
use crate::engines::ExternalToolManager;
use crate::error::{AppError, AppResult};
use regex::Regex;
use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct MotionEngine;

impl MotionEngine {
    pub async fn render_to_mp4<F>(
        options: &RenderMotionOptions,
        output_dir: &Path,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        let composition: MotionComposition = serde_json::from_str(&options.composition_json)
            .map_err(|e| AppError::Creative(format!("JSON de composição motion inválido: {}", e)))?;

        let _ = std::fs::create_dir_all(output_dir);
        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        let mut out_filename = options.output_filename.clone();
        if !out_filename.ends_with(".mp4") {
            out_filename.push_str(".mp4");
        }
        let target_path = output_dir.join(&out_filename);

        let width = composition.width.max(320);
        let height = composition.height.max(240);
        let fps = composition.fps.clamp(15, 60);
        let duration = composition.duration_sec.max(1.0);
        let bg_color = sanitize_color(&composition.background_color);

        let mut args: Vec<String> = vec![
            "-y".to_string(),
            "-f".to_string(),
            "lavfi".to_string(),
            "-i".to_string(),
            format!("color=c={}:s={}x{}:d={}:r={}", bg_color, width, height, duration, fps),
        ];

        // Gather additional inputs (images/audio)
        let mut input_idx = 1;
        let mut filter_complex = String::new();
        let mut last_stream = "[0:v]".to_string();

        // Process scenes and layers
        for (s_idx, scene) in composition.scenes.iter().enumerate() {
            let s_start = scene.start_time;
            let s_end = s_start + scene.duration_sec;

            for (l_idx, layer) in scene.layers.iter().enumerate() {
                let l_start = s_start + layer.start_time;
                let l_end = (l_start + layer.duration_sec).min(s_end);

                if layer.layer_type == "text" {
                    let text = sanitize_drawtext_content(&layer.content);
                    let font_color = sanitize_color(&layer.color);
                    let font_size = layer.font_size.unwrap_or(48.0) as u32;

                    // Text position coordinates
                    let x_pos = (layer.x * width as f32) as i32;
                    let y_pos = (layer.y * height as f32) as i32;

                    let current_stream = format!("[txt_{}_{}]", s_idx, l_idx);
                    let drawtext_filter = format!(
                        "{last_stream}drawtext=text='{text}':fontsize={font_size}:fontcolor={font_color}:x={x_pos}:y={y_pos}:enable='between(t,{l_start:.2},{l_end:.2})'{current_stream};",
                        last_stream = last_stream,
                        text = text,
                        font_size = font_size,
                        font_color = font_color,
                        x_pos = x_pos,
                        y_pos = y_pos,
                        l_start = l_start,
                        l_end = l_end,
                        current_stream = current_stream
                    );
                    filter_complex.push_str(&drawtext_filter);
                    last_stream = current_stream;
                } else if layer.layer_type == "image" && !layer.content.is_empty() {
                    let img_path = Path::new(&layer.content);
                    if img_path.is_file() {
                        args.push("-i".to_string());
                        args.push(layer.content.clone());

                        let img_w = (layer.width * width as f32) as i32;
                        let img_h = (layer.height * height as f32) as i32;
                        let x_pos = (layer.x * width as f32) as i32;
                        let y_pos = (layer.y * height as f32) as i32;

                        let scaled_stream = format!("[img_scaled_{}]", input_idx);
                        filter_complex.push_str(&format!(
                            "[{}:v]scale={}:{}{};",
                            input_idx, img_w, img_h, scaled_stream
                        ));

                        let next_stream = format!("[ov_{}_{}]", s_idx, l_idx);
                        filter_complex.push_str(&format!(
                            "{last_stream}{scaled_stream}overlay=x={x}:y={y}:enable='between(t,{l_start:.2},{l_end:.2})'{next_stream};",
                            last_stream = last_stream,
                            scaled_stream = scaled_stream,
                            x = x_pos,
                            y = y_pos,
                            l_start = l_start,
                            l_end = l_end,
                            next_stream = next_stream
                        ));

                        last_stream = next_stream;
                        input_idx += 1;
                    }
                }
            }
        }

        // Audio track input if present
        let mut has_audio = false;
        if let Some(ref audio) = composition.audio_track {
            let audio_path = Path::new(&audio.file_path);
            if audio_path.is_file() {
                args.push("-i".to_string());
                args.push(audio.file_path.clone());
                has_audio = true;
            }
        }

        // Apply filter_complex or fallback to simple pass
        if !filter_complex.is_empty() {
            // Trim trailing semicolon
            if filter_complex.ends_with(';') {
                filter_complex.pop();
            }
            args.push("-filter_complex".to_string());
            args.push(filter_complex);
            args.push("-map".to_string());
            args.push(last_stream);
        }

        if has_audio {
            args.push("-map".to_string());
            args.push(format!("{}:a", input_idx));
            args.push("-c:a".to_string());
            args.push("aac".to_string());
            args.push("-b:a".to_string());
            args.push("192k".to_string());
            args.push("-shortest".to_string());
        }

        // Video codec settings
        args.push("-c:v".to_string());
        args.push("libx264".to_string());
        args.push("-pix_fmt".to_string());
        args.push("yuv420p".to_string());
        args.push("-preset".to_string());
        args.push("fast".to_string());

        let crf = match options.quality.as_str() {
            "ultra" => "16",
            "high" => "20",
            _ => "23",
        };
        args.push("-crf".to_string());
        args.push(crf.to_string());

        args.push("-t".to_string());
        args.push(format!("{:.2}", duration));

        args.push(target_path.to_string_lossy().to_string());

        let total_dur = duration as f64;
        let time_regex = Regex::new(r"time=(\d+):(\d+):(\d+\.\d+)").unwrap();

        let progress_ref = Arc::new(progress_cb);
        let progress_runner = progress_ref.clone();

        ExternalToolManager::run_with_cancellation(
            &ffmpeg_path,
            &args,
            cancel_token,
            move |line| {
                if let Some(caps) = time_regex.captures(line) {
                    let h: f64 = caps[1].parse().unwrap_or(0.0);
                    let m: f64 = caps[2].parse().unwrap_or(0.0);
                    let s: f64 = caps[3].parse().unwrap_or(0.0);
                    let current_sec = h * 3600.0 + m * 60.0 + s;
                    let prog = (current_sec / total_dur).clamp(0.0, 0.99);
                    progress_runner(prog);
                }
            },
        ).await?;

        // Verify output file
        if !target_path.is_file() {
            return Err(AppError::Creative("Renderização finalizada mas arquivo MP4 não foi encontrado no disco.".into()));
        }

        let meta = std::fs::metadata(&target_path)?;
        if meta.len() == 0 {
            let _ = std::fs::remove_file(&target_path);
            return Err(AppError::Creative("Renderização gerou um arquivo vazio corrompido.".into()));
        }

        progress_ref(1.0);
        Ok(target_path.to_string_lossy().to_string())
    }

    /// Generates a clean standalone Remotion TypeScript file for code-export interoperability
    pub fn export_to_remotion_tsx(composition: &MotionComposition) -> String {
        format!(
            r#"// Generated by Arce Tools Creative Studio
// Remotion Interoperability Export
import React from 'react';
import {{ Composition, Sequence, interpolate, useCurrentFrame, useVideoConfig }} from 'remotion';

export const ArceMotionComposition: React.FC = () => {{
  const frame = useCurrentFrame();
  const {{ fps, durationInFrames, width, height }} = useVideoConfig();

  return (
    <div style={{{{ flex: 1, backgroundColor: '{bg}', width, height, position: 'relative', overflow: 'hidden' }}}}>
      {{/* Scenes rendered as Remotion Sequences */}}
    </div>
  );
}};

export const RemotionRoot: React.FC = () => {{
  return (
    <Composition
      id="{id}"
      component={{ArceMotionComposition}}
      durationInFrames={{{duration_frames}}}
      fps={{{fps}}}
      width={{{width}}}
      height={{{height}}}
    />
  );
}};
"#,
            bg = sanitize_color(&composition.background_color),
            id = composition.id,
            duration_frames = (composition.duration_sec * composition.fps as f32) as u32,
            fps = composition.fps,
            width = composition.width,
            height = composition.height
        )
    }
}

fn sanitize_color(hex_or_name: &str) -> String {
    let clean = hex_or_name.trim();
    if clean.starts_with('#') {
        format!("0x{}", &clean[1..])
    } else if clean.is_empty() {
        "0x0B0F10".to_string()
    } else {
        clean.to_string()
    }
}

fn sanitize_drawtext_content(raw: &str) -> String {
    raw.replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace(':', "\\:")
        .replace('%', "\\%")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_color_and_drawtext() {
        assert_eq!(sanitize_color("#15F5BA"), "0x15F5BA");
        assert_eq!(sanitize_color("#000000"), "0x000000");
        assert_eq!(sanitize_drawtext_content("Preço: 50% OFF!"), "Preço\\: 50\\% OFF!");
    }
}
