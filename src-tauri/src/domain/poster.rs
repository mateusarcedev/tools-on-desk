use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosterOptions {
    pub paper: String, // "A4", "A3", "Letter", "Legal", "Personalizado"
    pub custom_w_mm: Option<f64>,
    pub custom_h_mm: Option<f64>,
    pub orientation: String, // "Retrato", "Paisagem"
    pub mode: String,        // "Por páginas", "Por largura"
    pub cols: u32,
    pub width_cm: f64,
    pub margin_mm: f64,
    pub overlap_mm: f64,
    pub crop_marks: bool,
    pub page_numbers: bool,
    pub effect: String, // "Original", "P&B", "HalftoneMono", "HalftoneColor", "FloydSteinberg", "HighContrast"
    pub dot_shape: Option<String>, // "circle", "square"
    pub dot_pitch_mm: Option<f64>, // spacing between dots in mm (e.g. 4.0)
    pub min_dot_size: Option<f64>, // 0.0 to 1.0
    pub max_dot_size: Option<f64>, // 0.0 to 1.0
    pub brightness: Option<f64>,   // -100 to 100
    pub contrast: Option<f64>,     // -100 to 100
    pub invert: Option<bool>,
    pub intensity: Option<f64>,
    pub dot_color: Option<String>, // hex e.g. "#000000"
    pub bg_color: Option<String>,  // hex e.g. "#ffffff"
    pub rotate_deg: Option<u32>,   // 0, 90, 180, 270
    pub source_path: String,
    pub target_pdf: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosterSpec {
    pub paper_w_mm: f64,
    pub paper_h_mm: f64,
    pub useful_w_mm: f64,
    pub useful_h_mm: f64,
    pub total_w_cm: f64,
    pub total_h_cm: f64,
    pub cols: u32,
    pub rows: u32,
    pub pages: u32,
    pub dpi: u32,
    pub low_dpi: bool,
    pub img_w: u32,
    pub img_h: u32,
    pub human_scale_ratio: f64, // 180.0 / total_h_cm
}
