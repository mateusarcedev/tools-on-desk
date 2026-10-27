use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Waiting,
    Processing,
    Done,
    Failed,
    Canceled,
}

impl TaskStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskStatus::Waiting => "waiting",
            TaskStatus::Processing => "processing",
            TaskStatus::Done => "done",
            TaskStatus::Failed => "failed",
            TaskStatus::Canceled => "canceled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "processing" => TaskStatus::Processing,
            "done" => TaskStatus::Done,
            "failed" => TaskStatus::Failed,
            "canceled" => TaskStatus::Canceled,
            _ => TaskStatus::Waiting,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub name: String,
    pub op: String,
    pub mod_name: String,
    pub status: TaskStatus,
    pub progress: f64,
    pub source_path: Option<String>,
    pub target_path: Option<String>,
    pub options_json: Option<String>,
    pub error: Option<String>,
    pub size_mb: Option<f64>,
    pub speed: Option<String>,
    pub created_at: String,
    pub finished_at: Option<String>,
}
