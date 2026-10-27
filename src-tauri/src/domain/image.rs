use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConvertOptions {
    pub files: Vec<String>,
    pub format: String, // "JPG", "PNG"
    pub quality: u8,
    pub target_width: Option<u32>,
    pub target_height: Option<u32>,
    pub preserve_ratio: bool,
    pub output_folder: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesToPdfOptions {
    pub files: Vec<String>,
    pub page_size: String, // "A4", "Carta", "Ajustar"
    pub margin: String,    // "Nenhuma", "Pequena", "Grande"
    pub output_pdf: String,
}
