use crate::domain::{MotionComposition, RenderMotionOptions};
use crate::engines::ExternalToolManager;
use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub mod commands;

pub use commands::{frames_complete, render_motion_web, save_frame};

pub struct WebRenderer;

impl WebRenderer {
    /// Renders a MotionComposition to MP4 using the real deterministic HTML/Canvas headless engine
    pub async fn render_to_mp4<F>(
        options: &RenderMotionOptions,
        output_dir: &Path,
        cancel_token: Arc<AtomicBool>,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64) + Send + Sync + 'static,
    {
        // 1. Validate composition JSON
        let composition: MotionComposition = serde_json::from_str(&options.composition_json)
            .map_err(|e| AppError::Creative(format!("Composição Motion JSON inválida: {}", e)))?;

        std::fs::create_dir_all(output_dir)
            .map_err(|e| AppError::Creative(format!("Falha ao criar diretório de saída: {}", e)))?;

        let mut out_filename = options.output_filename.clone();
        if !out_filename.ends_with(".mp4") {
            out_filename.push_str(".mp4");
        }
        let target_path = output_dir.join(&out_filename);

        // 2. Locate tools
        let node_path = ExternalToolManager::find_executable("node")
            .ok_or_else(|| AppError::Internal("Runtime Node.js não foi encontrado no sistema para renderização HTML/Canvas.".into()))?;

        let ffmpeg_path = ExternalToolManager::get_ffmpeg()?;

        let script_path = Self::find_motion_renderer_script()
            .ok_or_else(|| AppError::Internal("Script do renderizador headless (scripts/motion_renderer.mjs) não foi localizado.".into()))?;

        // 3. Write validated composition to temporary file
        let run_id = uuid::Uuid::new_v4().to_string();
        let temp_comp_path = output_dir.join(format!("comp_{}.json", run_id));
        std::fs::write(&temp_comp_path, &options.composition_json)
            .map_err(|e| AppError::Creative(format!("Falha ao salvar manifesto temporário da composição: {}", e)))?;

        let frames_dir = output_dir.join(format!("frames_{}", run_id));
        let _ = std::fs::create_dir_all(&frames_dir);

        let fps = composition.fps.clamp(15, 60);

        let args = vec![
            script_path.to_string_lossy().to_string(),
            "--composition".to_string(),
            temp_comp_path.to_string_lossy().to_string(),
            "--output".to_string(),
            target_path.to_string_lossy().to_string(),
            "--frames-dir".to_string(),
            frames_dir.to_string_lossy().to_string(),
            "--fps".to_string(),
            fps.to_string(),
            "--quality".to_string(),
            options.quality.clone(),
            "--ffmpeg".to_string(),
            ffmpeg_path.to_string_lossy().to_string(),
        ];

        let progress_ref = Arc::new(progress_cb);
        let progress_runner = progress_ref.clone();

        // 4. Run headless rendering with cancellation
        let run_res = ExternalToolManager::run_with_cancellation(
            &node_path,
            &args,
            cancel_token.clone(),
            move |line| {
                if line.starts_with("PROGRESS:") {
                    let json_part = &line["PROGRESS:".len()..];
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_part) {
                        if let Some(p) = v.get("progress").and_then(|val| val.as_f64()) {
                            progress_runner(p.clamp(0.0, 0.99));
                        }
                    }
                }
            },
        ).await;

        // Cleanup temporary composition file
        let _ = std::fs::remove_file(&temp_comp_path);

        if let Err(e) = run_res {
            // Clean up partially written files on error or cancellation
            let _ = std::fs::remove_dir_all(&frames_dir);
            if target_path.exists() {
                let _ = std::fs::remove_file(&target_path);
            }
            return Err(e);
        }

        // 5. Verify target file
        if !target_path.is_file() {
            let _ = std::fs::remove_dir_all(&frames_dir);
            return Err(AppError::Creative("Renderização finalizada mas arquivo MP4 não foi encontrado no disco.".into()));
        }

        let meta = std::fs::metadata(&target_path)?;
        if meta.len() == 0 {
            let _ = std::fs::remove_file(&target_path);
            let _ = std::fs::remove_dir_all(&frames_dir);
            return Err(AppError::Creative("Renderização gerou um arquivo vazio corrompido.".into()));
        }

        progress_ref(1.0);
        Ok(target_path.to_string_lossy().to_string())
    }

    fn find_motion_renderer_script() -> Option<PathBuf> {
        // 1. Check current directory and parent
        if let Ok(cur) = std::env::current_dir() {
            let p = cur.join("scripts").join("motion_renderer.mjs");
            if p.is_file() {
                return Some(p);
            }
            if let Some(parent) = cur.parent() {
                let p = parent.join("scripts").join("motion_renderer.mjs");
                if p.is_file() {
                    return Some(p);
                }
            }
        }

        // 2. CARGO_MANIFEST_DIR (in tests or dev)
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        if let Some(parent) = manifest_dir.parent() {
            let p = parent.join("scripts").join("motion_renderer.mjs");
            if p.is_file() {
                return Some(p);
            }
        }
        let p_manifest = manifest_dir.join("scripts").join("motion_renderer.mjs");
        if p_manifest.is_file() {
            return Some(p_manifest);
        }

        // 3. Fallback relative to executable
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let p = parent.join("scripts").join("motion_renderer.mjs");
                if p.is_file() {
                    return Some(p);
                }
                if let Some(grandparent) = parent.parent() {
                    let p = grandparent.join("scripts").join("motion_renderer.mjs");
                    if p.is_file() {
                        return Some(p);
                    }
                }
            }
        }

        None
    }

    pub fn export_to_remotion_tsx(composition: &MotionComposition) -> String {
        format!(
            r#"// Generated by ToolsOnDesk Creative Studio
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
            bg = composition.background_color,
            id = composition.id,
            duration_frames = (composition.duration_sec * composition.fps as f32) as u32,
            fps = composition.fps,
            width = composition.width,
            height = composition.height
        )
    }
}
