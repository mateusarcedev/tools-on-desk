use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosterOptions {
    pub paper: String, // "A4", "A3", "Personalizado"
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
    pub effect: String, // "Original", "P&B"
    pub source_path: String,
    pub target_pdf: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosterSpec {
    pub paper_w_mm: f64,
    pub paper_h_mm: f64,
    pub total_w_cm: f64,
    pub total_h_cm: f64,
    pub cols: u32,
    pub rows: u32,
    pub pages: u32,
    pub dpi: u32,
    pub low_dpi: bool,
    pub img_w: u32,
    pub img_h: u32,
}
