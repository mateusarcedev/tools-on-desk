use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorLogEntry {
    pub id: String,
    pub created_at: String,
    pub severity: String,
    pub source: String,
    pub module: String,
    pub operation: String,
    pub task_id: Option<String>,
    pub error_code: String,
    pub user_message: String,
    pub technical_details: Option<String>,
    pub sanitized_stack: Option<String>,
    pub status: String,
    pub app_version: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ErrorLogFilter {
    pub severity: Option<String>,
    pub module: Option<String>,
    pub status: Option<String>,
    pub period: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorLogStats {
    pub total: i64,
    pub critical: i64,
    pub unresolved: i64,
    pub database_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateErrorLogPayload {
    pub severity: Option<String>,
    pub source: Option<String>,
    pub module: String,
    pub operation: String,
    pub task_id: Option<String>,
    pub error_code: String,
    pub user_message: String,
    pub technical_details: Option<String>,
    pub sanitized_stack: Option<String>,
}
