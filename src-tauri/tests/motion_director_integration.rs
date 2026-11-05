use toolsondesk_lib::engines::motion_director::{MotionDirector, MotionBriefing};
use std::path::Path;

#[tokio::test]
async fn test_motion_director_full_flow() {
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
    println!("Plan generated: {} scenes, generator: {}", plan.scenes.len(), plan.metadata.generator);
    
    assert!(plan.scenes.len() >= 3, "Should have at least 3 scenes for advertising");
    assert_eq!(plan.project.width, 1920);
    assert_eq!(plan.project.height, 1080);
    assert_eq!(plan.project.fps, 30);
    
    for scene in &plan.scenes {
        println!("  Scene {}: {} ({}s) - {} layers", scene.order, scene.title, scene.duration_sec, scene.layers.len());
        assert!(scene.layers.len() >= 2, "Each scene should have at least 2 layers");
        for layer in &scene.layers {
            let anim_name = layer.animation.as_ref().and_then(|a| a.preset.as_ref()).map(|s| s.as_str()).unwrap_or("none");
            println!("    Layer: {} ({:?}) - animation: {}", layer.name, layer.layer_type, anim_name);
        }
    }
    
    println!("\nConverting to composition...");
    let composition = director.plan_to_composition(&plan);
    println!("Composition: {}x{} @ {}fps, {}s, {} scenes", 
        composition.width, composition.height, composition.fps, composition.duration_sec, composition.scenes.len());
    
    assert_eq!(composition.width, 1920);
    assert_eq!(composition.height, 1080);
    assert_eq!(composition.fps, 30);
    assert!(composition.duration_sec >= 15.0);
    
    // Save for inspection
    let plan_json = serde_json::to_string_pretty(&plan).unwrap();
    std::fs::write("/tmp/motion_plan.json", plan_json).unwrap();
    println!("Plan saved to /tmp/motion_plan.json");
    
    let comp_json = serde_json::to_string_pretty(&composition).unwrap();
    std::fs::write("/tmp/motion_composition.json", comp_json).unwrap();
    println!("Composition saved to /tmp/motion_composition.json");
}
