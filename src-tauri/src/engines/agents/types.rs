use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AgentAuthStatus {
    Authenticated,
    Unauthenticated,
    NotInstalled,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentModel {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub binary_path: Option<String>,
    pub version: Option<String>,
    pub auth_status: AgentAuthStatus,
    pub account_info: Option<String>,
    pub default_model: Option<String>,
    pub available_models: Vec<AgentModel>,
    pub supports_streaming: bool,
    pub is_subscription: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
pub enum AgentEvent {
    SessionStarted {
        session_id: String,
        agent_id: String,
        model: String,
    },
    MessageDelta {
        text: String,
    },
    ReasoningSummary {
        summary: String,
    },
    ToolRequested {
        tool_call_id: String,
        tool_name: String,
        arguments_json: String,
    },
    ToolResult {
        tool_call_id: String,
        result: String,
    },
    AgentCompleted {
        final_text: String,
        prompt_tokens: Option<u32>,
        completion_tokens: Option<u32>,
    },
    AgentFailed {
        error: String,
    },
    SessionInterrupted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteAgentPromptPayload {
    pub agent_id: String,
    pub prompt: String,
    pub model: Option<String>,
    pub system_instruction: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancePromptResult {
    pub original_prompt: String,
    pub enhanced_prompt: String,
    pub creative_reasoning: Option<String>,
    pub recommended_aspect_ratio: Option<String>,
    pub recommended_style: Option<String>,
    pub agent_used: String,
}

pub fn find_agent_binary(name: &str, extra_rel_paths: &[&str]) -> Option<PathBuf> {
    // 1. Check with ExternalToolManager
    if let Some(p) = crate::engines::ExternalToolManager::find_executable(name) {
        return Some(p);
    }
    // 2. Check user home directories
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        let home_path = std::path::Path::new(&home);
        for rel in extra_rel_paths {
            let cand = home_path.join(rel);
            if cand.is_file() {
                return Some(cand);
            }
        }
    }
    None
}
