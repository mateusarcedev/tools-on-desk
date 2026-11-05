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
    _output_dir: String,
    fps: u32,
    duration: f32,
) -> AppResult<()> {
    println!("Frames captured: {} fps, {:.2}s duration", fps, duration);
    Ok(())
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
