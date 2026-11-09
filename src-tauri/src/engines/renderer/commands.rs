use crate::domain::RenderMotionOptions;
use crate::engines::renderer::WebRenderer;
use crate::error::{AppError, AppResult};
use std::path::Path;
use std::sync::Arc;

pub async fn save_frame(
    frame_index: u32,
    data_url: String,
    output_dir: String,
) -> AppResult<()> {
    let output_dir = Path::new(&output_dir);
    std::fs::create_dir_all(output_dir)
        .map_err(|e| AppError::Creative(format!("Failed to create frames directory: {}", e)))?;

    let base64_data = data_url
        .strip_prefix("data:image/png;base64,")
        .ok_or_else(|| AppError::Creative("Invalid data URL format".into()))?;

    let image_data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data)
        .map_err(|e| AppError::Creative(format!("Failed to decode base64 image: {}", e)))?;

    let filename = format!("frame_{:06}.png", frame_index);
    let file_path = output_dir.join(filename);
    
    std::fs::write(&file_path, image_data)
        .map_err(|e| AppError::Creative(format!("Failed to write frame: {}", e)))?;

    Ok(())
}

pub async fn frames_complete(
    output_dir: String,
    fps: u32,
    duration: f32,
) -> AppResult<String> {
    let output_path = Path::new(&output_dir);
    let frames_pattern = output_path.join("frame_%06d.png");
    let target_video = output_path.join("output.mp4");

    let ffmpeg_path = crate::engines::ExternalToolManager::get_ffmpeg()?;

    let mut cmd = tokio::process::Command::new(ffmpeg_path);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let fps_str = fps.clamp(15, 60).to_string();
    let dur_str = format!("{:.2}", duration);

    cmd.args([
        "-y",
        "-framerate",
        &fps_str,
        "-i",
        &frames_pattern.to_string_lossy(),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-t",
        &dur_str,
        &target_video.to_string_lossy(),
    ]);

    let output = cmd.output().await.map_err(|e| {
        AppError::Creative(format!("Falha ao invocar FFmpeg para frames_complete: {}", e))
    })?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Creative(format!(
            "FFmpeg falhou ao codificar frames: {}",
            err_msg
        )));
    }

    Ok(target_video.to_string_lossy().to_string())
}

pub async fn render_motion_web(
    composition_json: String,
    output_filename: String,
    output_dir: String,
    _fps: u32,
    _duration: f32,
    quality: String,
) -> Result<String, AppError> {
    let output_path = Path::new(&output_dir);
    let render_options = RenderMotionOptions {
        project_id: None,
        composition_json,
        output_filename,
        format: "mp4".to_string(),
        quality,
    };

    let cancel_token = Arc::new(std::sync::atomic::AtomicBool::new(false));
    
    WebRenderer::render_to_mp4(
        &render_options,
        output_path,
        cancel_token,
        |_| {},
    ).await
}
