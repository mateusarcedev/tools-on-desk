use crate::engines::agents::types::{find_agent_binary, AgentAuthStatus, AgentInfo, AgentModel};
use crate::error::{AppError, AppResult};
use crate::platform::processes::ProcessManager;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

pub struct CodexDriver;

impl CodexDriver {
    pub fn find_binary() -> Option<PathBuf> {
        find_agent_binary("codex", &[
            ".local/bin/codex",
            ".cargo/bin/codex",
            "AppData/Local/Programs/Codex/codex.exe",
        ])
    }

    pub async fn detect() -> AgentInfo {
        let bin_path = Self::find_binary();
        let Some(bin) = bin_path else {
            return AgentInfo {
                id: "codex".into(),
                name: "OpenAI Codex".into(),
                binary_path: None,
                version: None,
                auth_status: AgentAuthStatus::NotInstalled,
                account_info: None,
                default_model: Some("gpt-6-sol".into()),
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

        // Check auth status via `codex doctor`
        let mut doc_cmd = Command::new(&bin);
        doc_cmd.arg("doctor");
        ProcessManager::configure_command(&mut doc_cmd);

        let mut auth_status = AgentAuthStatus::Unauthenticated;
        let mut account_info = None;

        if let Ok(Ok(out)) = tokio::time::timeout(tokio::time::Duration::from_secs(3), doc_cmd.output()).await {
            let stdout_str = String::from_utf8_lossy(&out.stdout);
            let stderr_str = String::from_utf8_lossy(&out.stderr);
            let combined = format!("{}\n{}", stdout_str, stderr_str);

            if combined.contains("stored auth mode: chatgpt") || combined.contains("stored ChatGPT tokens: true") {
                auth_status = AgentAuthStatus::Authenticated;
                account_info = Some("ChatGPT Subscription (Codex App-Server Active)".into());
            } else if combined.contains("logged in") || combined.contains("Authenticated") {
                auth_status = AgentAuthStatus::Authenticated;
                account_info = Some("ChatGPT / OpenAI Active".into());
            }
        }

        let available_models = vec![
            AgentModel {
                id: "gpt-6-sol".into(),
                name: "GPT-6 Sol (ChatGPT Pro/Plus)".into(),
                description: Some("Modelo de alto raciocínio oficial do Codex para diretrizes e raciocínio criativo".into()),
            },
            AgentModel {
                id: "o3-mini".into(),
                name: "OpenAI o3-mini".into(),
                description: Some("Raciocínio analítico rápido e estruturado".into()),
            },
            AgentModel {
                id: "gpt-5.4-mini".into(),
                name: "GPT-5.4 Mini".into(),
                description: Some("Geração ágil com baixo consumo de cotas".into()),
            },
        ];

        AgentInfo {
            id: "codex".into(),
            name: "OpenAI Codex".into(),
            binary_path: Some(bin_str),
            version,
            auth_status,
            account_info,
            default_model: Some("gpt-6-sol".into()),
            available_models,
            supports_streaming: true,
            is_subscription: true,
        }
    }

    pub async fn execute_prompt(
        prompt: &str,
        model: Option<&str>,
        system_instruction: Option<&str>,
    ) -> AppResult<String> {
        let bin = Self::find_binary()
            .ok_or_else(|| AppError::Internal("Binário do Codex não encontrado no sistema".into()))?;

        let mut full_prompt = String::new();
        if let Some(sys) = system_instruction {
            full_prompt.push_str(sys);
            full_prompt.push_str("\n\n---\n\n");
        }
        full_prompt.push_str(prompt);

        let mut cmd = Command::new(bin);
        cmd.arg("exec");
        cmd.arg("--json");
        cmd.arg("--ephemeral");
        if let Some(m) = model {
            cmd.arg("-m");
            cmd.arg(m);
        }
        cmd.arg(&full_prompt);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        ProcessManager::configure_command(&mut cmd);

        let mut child = cmd.spawn()
            .map_err(|e| AppError::Internal(format!("Falha ao iniciar processo do Codex: {}", e)))?;

        let stdout = child.stdout.take()
            .ok_or_else(|| AppError::Internal("Não foi possível capturar stdout do Codex".into()))?;

        let mut reader = BufReader::new(stdout).lines();
        let mut final_response = String::new();

        while let Ok(Some(line)) = reader.next_line().await {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                let event_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
                if event_type == "item.completed" {
                    if let Some(item) = val.get("item") {
                        if item.get("type").and_then(|v| v.as_str()) == Some("agent_message") {
                            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                                final_response = text.to_string();
                            }
                        }
                    }
                }
            }
        }

        let status = child.wait().await
            .map_err(|e| AppError::Internal(format!("Falha ao aguardar processo do Codex: {}", e)))?;

        if !status.success() && final_response.is_empty() {
            return Err(AppError::Internal("Processo do Codex finalizou com código de erro".into()));
        }

        if final_response.is_empty() {
            return Err(AppError::Internal("Codex não retornou mensagem de resposta".into()));
        }

        Ok(final_response)
    }
}
