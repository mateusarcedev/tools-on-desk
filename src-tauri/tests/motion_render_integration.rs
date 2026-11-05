use toolsondesk_lib::engines::{MotionEngine, MotionDirector, MotionBriefing};
use toolsondesk_lib::domain::{MotionComposition, RenderMotionOptions};
use std::path::Path;
use std::sync::Arc;

#[tokio::test]
async fn test_motion_render_full_video() {
    let app_data_dir = Path::new("/home/mateusarcedev/.local/share/ToolsOnDesk");
    std::fs::create_dir_all(app_data_dir).unwrap();
    
    let director = MotionDirector::new();
    
    let briefing = MotionBriefing {
        prompt: "Crie um vídeo publicitário profissional de 20 segundos para o ToolsOnDesk. Apresente a proposta do aplicativo, mostre sua interface real, destaque ferramentas criativas e produtividade, utilize a identidade visual verde-menta e grafite e finalize com o logotipo animado.".to_string(),
        title: Some("ToolsOnDesk Promo 20s".to_string()),
        project_type: "advertising".to_string(),
        style: "Publicitário".to_string(),
        duration_sec: Some(20.0),
        fps: Some(30),
        width: Some(1920),
        height: Some(1080),
        aspect_ratio: "16:9".to_string(),
        platform: Some("web".to_string()),
        audience: Some("Desenvolvedores e criadores".to_string()),
        brand_identity: Some("ToolsOnDesk - Verde Menta #15F5BA, Grafite #0B0F10".to_string()),
        references: vec![],
    };
    
    println!("Generating plan...");
    let plan = director.generate_plan(app_data_dir, &briefing).await.unwrap();
    println!("Plan: {} scenes", plan.scenes.len());
    
    println!("Converting to composition...");
    let composition = director.plan_to_composition(&plan);
    
    let export_dir = Path::new("/tmp/motion_export");
    std::fs::create_dir_all(export_dir).unwrap();
    
    let cancel_token = Arc::new(std::sync::atomic::AtomicBool::new(false));
    
    println!("Rendering MP4...");
    let output_path = MotionEngine::render_to_mp4(
        &RenderMotionOptions {
            project_id: None,
            composition_json: serde_json::to_string(&composition).unwrap(),
            output_filename: "toolsondesk_promo.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "high".to_string(),
        },
        export_dir,
        cancel_token,
        |progress| {
            println!("  Progress: {:.1}%", progress * 100.0);
        },
    ).await.unwrap();
    
    println!("Video rendered to: {}", output_path);
    
    // Verify file exists and has reasonable size
    let metadata = std::fs::metadata(&output_path).unwrap();
    assert!(metadata.len() > 10000, "Video file should be > 10KB");
    println!("Video size: {} bytes", metadata.len());
    
    // Probe with ffprobe
    let probe_output = std::process::Command::new("ffprobe")
        .args(["-v", "error", "-select_streams", "v:0", 
               "-show_entries", "stream=width,height,r_frame_rate,duration",
               "-of", "json", &output_path])
        .output().unwrap();
    
    let probe_json = String::from_utf8_lossy(&probe_output.stdout);
    println!("FFprobe output: {}", probe_json);
    
    // Extract frames for contact sheet
    let frames_dir = Path::new("/tmp/motion_frames");
    std::fs::create_dir_all(frames_dir).unwrap();
    
    let extract_output = std::process::Command::new("ffmpeg")
        .args(["-y", "-i", &output_path, "-vf", "fps=1", 
               frames_dir.join("frame_%03d.png").to_str().unwrap()])
        .output().unwrap();
    
    println!("Frame extraction: {}", String::from_utf8_lossy(&extract_output.stderr));
    
    // List extracted frames
    let frames: Vec<_> = std::fs::read_dir(frames_dir).unwrap()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect();
    
    println!("Extracted {} frames", frames.len());
    for frame in &frames {
        println!("  {}", frame.display());
    }
    
    // Create contact sheet
    let contact_sheet = Path::new("/tmp/motion_contact_sheet.png");
    let frame_list = frames.iter().map(|p| p.to_str().unwrap()).collect::<Vec<_>>().join(" ");
    let contact_output = std::process::Command::new("ffmpeg")
        .args(["-y", "-i", &output_path, "-vf", 
               "select=not(mod(n\\,30)),scale=320:180,tile=4x2",
               contact_sheet.to_str().unwrap()])
        .output().unwrap();
    
    println!("Contact sheet created: {}", contact_sheet.display());
    println!("Contact sheet stderr: {}", String::from_utf8_lossy(&contact_output.stderr));
    
    // Verify video duration is close to 20s
    let duration_output = std::process::Command::new("ffprobe")
        .args(["-v", "error", "-show_entries", "format=duration",
               "-of", "default=noprint_wrappers=1:nokey=1", &output_path])
        .output().unwrap();
    
    let duration_str = String::from_utf8_lossy(&duration_output.stdout).trim().to_string();
    let duration: f64 = duration_str.parse().unwrap_or(0.0);
    println!("Video duration: {:.2}s (expected ~20s)", duration);
    
    assert!(duration >= 19.0 && duration <= 23.0, "Duration should be ~20s, got {:.2}s", duration);
    
    println!("\n✅ Full video render test PASSED");
    println!("  MP4: {}", output_path);
    println!("  Duration: {:.2}s", duration);
    println!("  Size: {} bytes", metadata.len());
    println!("  Frames extracted: {}", frames.len());
    println!("  Contact sheet: {}", contact_sheet.display());
}
