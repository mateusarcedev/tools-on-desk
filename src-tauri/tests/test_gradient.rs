use toolsondesk_lib::domain::creative::{GradientPlan, GradientStopPlan};

#[test]
fn test_gradient_deserialize() {
    let json = "{\"type\": \"radial\", \"stops\": [{\"color\": \"#15F5BA\", \"position\": 0}, {\"color\": \"#0B0F10\", \"position\": 1}], \"angle\": 0}";
    let plan: toolsondesk_lib::domain::creative::GradientPlan = serde_json::from_str(json).unwrap();
    println!("Parsed: {:?}", plan);
    assert_eq!(plan.type_, "radial");
}
