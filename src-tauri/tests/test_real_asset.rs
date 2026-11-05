use toolsondesk_lib::engines::{MotionDirector, MotionBriefing};
use toolsondesk_lib::domain::{MotionComposition, RenderMotionOptions};
use toolsondesk_lib::engines::motion_director::ReferenceInput;
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[tokio::test]
async fn test_real_asset_in_composition() {
    // Use an existing icon as a test asset
    let asset_path = "/home/mateusarcedev/projetos/arce-tools/src-tauri/icons/icon.png";
    assert!(Path::new(asset_path).exists(), "Test asset not found");
    
    // Create a briefing with the asset reference
    let briefing = MotionBriefing {
        prompt: "Create a video showing the ToolsOnDesk logo".to_string(),
        title: Some("ToolsOnDesk Logo Test".to_string()),
        project_type: "brand".to_string(),
        style: "Publicitário".to_string(),
        duration_sec: Some(10.0),
        fps: Some(30),
        width: Some(1920),
        height: Some(1080),
        aspect_ratio: "16:9".to_string(),
        platform: Some("web".to_string()),
        audience: Some("Developers".to_string()),
        brand_identity: Some("ToolsOnDesk".to_string()),
        references: vec![
            ReferenceInput {
                id: "logo-1".to_string(),
                file_path: asset_path.to_string(),
                file_name: "icon.png".to_string(),
                file_type: "image".to_string(),
                purpose: "brand_identity".to_string(),
            }
        ],
    };
    
    let director = MotionDirector::new();
    let app_data_dir = Path::new("/home/mateusarcedev/.local/share/ToolsOnDesk");
    std::fs::create_dir_all(app_data_dir).unwrap();
    
    let plan = director.generate_plan(app_data_dir, &briefing).await.unwrap();
    println!("Plan generated: {} scenes", plan.scenes.len());
    
    // Check if the asset reference is included in the plan
    let has_asset = plan.scenes.iter().flat_map(|s| &s.layers).any(|l| l.asset_id.is_some());
    println!("Plan has asset references: {}", has_asset);
    
    let composition = director.plan_to_composition(&plan);
    println!("Composition: {} scenes", composition.scenes.len());
    
    // Check if the composition has image layers
    let has_image = composition.scenes.iter().flat_map(|s| &s.layers).any(|l| l.layer_type == "image");
    println!("Composition has image layers: {}", has_image);
    
    // Render
    let export_dir = Path::new("/tmp/asset_test_export");
    std::fs::create_dir_all(export_dir).unwrap();
    
    let cancel_token = Arc::new(AtomicBool::new(false));
    let output_path = toolsondesk_lib::engines::MotionEngine::render_to_mp4(
        &RenderMotionOptions {
            project_id: None,
            composition_json: serde_json::to_string(&composition).unwrap(),
            output_filename: "asset_test.mp4".to_string(),
            format: "mp4".to_string(),
            quality: "high".to_string(),
        },
        export_dir,
        cancel_token,
        |_| {},
    ).await.unwrap();
    
    println!("Video rendered to: {}", output_path);
    let meta = std::fs::metadata(&output_path).unwrap();
    assert!(meta.len() > 0);
    println!("Video size: {} bytes", meta.len());
}
