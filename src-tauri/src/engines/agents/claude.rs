use crate::engines::agents::types::{find_agent_binary, AgentAuthStatus, AgentInfo, AgentModel};
use crate::error::{AppError, AppResult};
use crate::platform::processes::ProcessManager;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

pub struct ClaudeCodeDriver;

impl ClaudeCodeDriver {
    pub fn find_binary() -> Option<PathBuf> {
        find_agent_binary("claude", &[
            ".local/bin/claude",
            "AppData/Local/Programs/Claude/claude.exe",
        ])
    }

    pub async fn detect() -> AgentInfo {
        let bin_path = Self::find_binary();
        let Some(bin) = bin_path else {
            return AgentInfo {
                id: "claude_code".into(),
                name: "Claude Code".into(),
                binary_path: None,
                version: None,
                auth_status: AgentAuthStatus::NotInstalled,
                account_info: None,
                default_model: Some("claude-3-7-sonnet".into()),
                available_models: vec![],
                supports_streaming: true,
                is_subscription: true,
            };
        };

        let bin_str = bin.to_string_lossy().to_string();

        // Get version
        let mut ver_cmd = Command::new(&bin);
        ver_cmd.arg("--version");
        ProcessManager::configure_command(&mut ver_cmd);
        let version = match tokio::time::timeout(tokio::time::Duration::from_secs(3), ver_cmd.output()).await {
            Ok(Ok(out)) if out.status.success() => {
                let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                Some(s)
            }
            _ => None,
        };

        // Check auth status via `claude auth status`
        let mut auth_cmd = Command::new(&bin);
        auth_cmd.args(["auth", "status"]);
        ProcessManager::configure_command(&mut auth_cmd);

        let mut auth_status = AgentAuthStatus::Unauthenticated;
        let mut account_info = None;

        if let Ok(Ok(out)) = tokio::time::timeout(tokio::time::Duration::from_secs(3), auth_cmd.output()).await {
            let stdout_str = String::from_utf8_lossy(&out.stdout);
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout_str) {
                if json.get("loggedIn").and_then(|v| v.as_bool()) == Some(true) {
                    auth_status = AgentAuthStatus::Authenticated;
                    let email = json.get("email").and_then(|v| v.as_str()).unwrap_or("Anthropic Account");
                    account_info = Some(format!("Claude Subscription ({})", email));
                } else {
                    auth_status = AgentAuthStatus::Unauthenticated;
                    account_info = Some("Não autenticado (Execute 'claude login')".into());
                }
            }
        }

        let available_models = vec![
            AgentModel {
                id: "claude-3-7-sonnet".into(),
                name: "Claude 3.7 Sonnet (Thinking)".into(),
                description: Some("Alta capacidade de raciocínio visual e direção criativa".into()),
            },
            AgentModel {
                id: "claude-3-5-sonnet".into(),
                name: "Claude 3.5 Sonnet".into(),
                description: Some("Excelente desempenho e geração consistente de instruções visuais".into()),
            },
            AgentModel {
                id: "claude-3-5-haiku".into(),
                name: "Claude 3.5 Haiku".into(),
                description: Some("Respostas ultra-rápidas para refinamento de prompts curtos".into()),
            },
        ];

        AgentInfo {
            id: "claude_code".into(),
            name: "Claude Code".into(),
            binary_path: Some(bin_str),
            version,
            auth_status,
            account_info,
            default_model: Some("claude-3-7-sonnet".into()),
            available_models,
            supports_streaming: true,
            is_subscription: true,
        }
    }

    pub async fn execute_prompt(
        prompt: &str,
        _model: Option<&str>,
        system_instruction: Option<&str>,
    ) -> AppResult<String> {
        let bin = Self::find_binary()
            .ok_or_else(|| AppError::Internal("Binário do Claude Code não encontrado".into()))?;

        let mut full_prompt = String::new();
        if let Some(sys) = system_instruction {
            full_prompt.push_str(sys);
            full_prompt.push_str("\n\n---\n\n");
        }
        full_prompt.push_str(prompt);

        let mut cmd = Command::new(bin);
        cmd.arg("-p");
        cmd.arg(&full_prompt);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        ProcessManager::configure_command(&mut cmd);

        let mut child = cmd.spawn()
            .map_err(|e| AppError::Internal(format!("Falha ao iniciar processo do Claude Code: {}", e)))?;

        let stdout = child.stdout.take()
            .ok_or_else(|| AppError::Internal("Não foi possível capturar stdout do Claude Code".into()))?;

        let mut reader = BufReader::new(stdout).lines();
        let mut output_lines = Vec::new();

        while let Ok(Some(line)) = reader.next_line().await {
            output_lines.push(line);
        }

        let status = child.wait().await
            .map_err(|e| AppError::Internal(format!("Falha ao aguardar Claude Code: {}", e)))?;

        if !status.success() && output_lines.is_empty() {
            return Err(AppError::Internal("Execução do Claude Code falhou ou requer login prévio".into()));
        }

        let result = output_lines.join("\n").trim().to_string();
        if result.is_empty() {
            return Err(AppError::Internal("Claude Code retornou texto vazio".into()));
        }

        Ok(result)
    }
}
