use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub name: String,
    pub op: String,
    pub mod_name: String,
    pub status: String,
    pub date: String,
    pub size: String,
    pub file_path: Option<String>,
    pub error: Option<String>,
}
