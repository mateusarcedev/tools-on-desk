use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MigrationStep {
    Discovery,
    Preflight,
    Backup,
    Copy,
    DatabaseMigration,
    PathReconciliation,
    CredentialMigration,
    Validation,
    Commit,
    Completed,
    Blocked,
    Failed,
    RecoveryRequired,
    RolledBack,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationStatus {
    pub has_legacy_data: bool,
    pub is_migrated: bool,
    pub current_step: MigrationStep,
    pub message: String,
    pub progress_percent: f32,
    pub backup_manifest_path: Option<String>,
    pub preserved_projects_count: usize,
    pub preserved_assets_count: usize,
    pub preserved_tasks_count: usize,
    pub preserved_history_count: usize,
    pub preserved_error_logs_count: usize,
    pub credentials_migrated: bool,
    pub binaries_reused: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationManifest {
    pub timestamp: String,
    pub source_db: String,
    pub target_db: String,
    pub source_sha256: String,
    pub target_sha256: String,
    pub tasks_count: usize,
    pub history_count: usize,
    pub error_logs_count: usize,
    pub creative_projects_count: usize,
    pub creative_assets_count: usize,
    pub creative_gen_history_count: usize,
    pub preferences_count: usize,
    pub credentials_recovered: bool,
    pub legacy_paths_found: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationProgressEvent {
    pub step: MigrationStep,
    pub step_name: String,
    pub message: String,
    pub percent: f32,
}
