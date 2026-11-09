use tauri::command;

#[command]
pub async fn save_frame(
    frame_index: u32,
    data_url: String,
    output_dir: String,
) -> Result<(), crate::error::AppError> {
    crate::engines::renderer::save_frame(frame_index, data_url, output_dir).await
}

#[command]
pub async fn frames_complete(
    output_dir: String,
    fps: u32,
    duration: f32,
) -> Result<String, crate::error::AppError> {
    crate::engines::renderer::frames_complete(output_dir, fps, duration).await
}

#[command]
pub async fn render_motion_web(
    composition_json: String,
    output_filename: String,
    output_dir: String,
    fps: u32,
    duration: f32,
    quality: String,
) -> Result<String, crate::error::AppError> {
    crate::engines::renderer::render_motion_web(
        composition_json,
        output_filename,
        output_dir,
        fps,
        duration,
        quality,
    ).await
}