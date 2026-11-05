use toolsondesk_lib::engines::MotionDirector;

#[test]
fn test_remotion_export() {
    // Read the Codex plan
    let plan_json = std::fs::read_to_string("/tmp/codex_motion_plan.json").unwrap();
    let plan: toolsondesk_lib::engines::motion_director::MotionDirectorPlan = serde_json::from_str(&plan_json).unwrap();
    
    // Convert to composition
    let director = MotionDirector::new();
    let composition = director.plan_to_composition(&plan);
    
    // Export to Remotion TSX
    let tsx = toolsondesk_lib::engines::MotionEngine::export_to_remotion_tsx(&composition);
    println!("TSX length: {}", tsx.len());
    println!("TSX preview: {}", &tsx[..500.min(tsx.len())]);
    assert!(tsx.contains("ArceMotionComposition"));
    assert!(tsx.contains("RemotionRoot"));
    assert!(tsx.contains("1920"));
    assert!(tsx.contains("1080"));
    assert!(tsx.contains("30"));
}
