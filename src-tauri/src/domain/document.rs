use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPageInfo {
    pub page_number: u32,
    pub width_pt: f64,
    pub height_pt: f64,
    pub rotation_deg: i32,
    pub text_snippet: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfInfo {
    pub path: String,
    pub page_count: u32,
    pub file_size_bytes: u64,
    pub file_size_formatted: String,
    pub is_encrypted: bool,
    pub has_selectable_text: bool,
    pub title: Option<String>,
    pub author: Option<String>,
    pub creator: Option<String>,
    pub page_width_pt: Option<f64>,
    pub page_height_pt: Option<f64>,
    pub orientation: Option<String>,
    pub pages: Vec<PdfPageInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfMergeOptions {
    pub source_paths: Vec<String>,
    pub target_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfSplitOptions {
    pub source_path: String,
    pub target_dir: String,
    pub mode: String, // "all", "ranges", "every_n"
    pub ranges: Option<String>, // e.g. "1-3, 5, 8-10"
    pub every_n: Option<u32>,
    pub export_single: Option<bool>,
    pub output_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPageAction {
    pub original_page: u32,
    pub rotation_deg: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfOrganizeOptions {
    pub source_path: String,
    pub target_path: String,
    pub pages: Vec<PdfPageAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfCompressOptions {
    pub source_path: String,
    pub target_path: String,
    pub level: String, // "lossless", "recommended", "extreme"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WordToPdfOptions {
    pub source_path: String,
    pub target_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfToDocxOptions {
    pub source_path: String,
    pub target_path: Option<String>,
    pub mode: String, // "editable_text", "layout_preserve"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentOperationResult {
    pub success: bool,
    pub output_path: String,
    pub output_size_bytes: u64,
    pub original_size_bytes: Option<u64>,
    pub saved_percent: Option<f64>,
    pub page_count: Option<u32>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibreOfficeStatus {
    pub is_available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub notes: String,
}
