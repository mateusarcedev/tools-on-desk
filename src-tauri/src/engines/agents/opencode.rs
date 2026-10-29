use crate::engines::agents::types::{find_agent_binary, AgentAuthStatus, AgentInfo, AgentModel};
use crate::error::{AppError, AppResult};
use crate::platform::processes::ProcessManager;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

pub struct OpenCodeDriver;

impl OpenCodeDriver {
    pub fn find_binary() -> Option<PathBuf> {
        find_agent_binary("opencode", &[
            ".opencode/bin/opencode",
            ".local/bin/opencode",
            "AppData/Local/Programs/OpenCode/opencode.exe",
        ])
    }

    pub async fn detect() -> AgentInfo {
        let bin_path = Self::find_binary();
        let Some(bin) = bin_path else {
            return AgentInfo {
                id: "opencode".into(),
                name: "OpenCode".into(),
                binary_path: None,
                version: None,
                auth_status: AgentAuthStatus::NotInstalled,
                account_info: None,
                default_model: Some("default".into()),
                available_models: vec![],
                supports_streaming: true,
                is_subscription: false,
            };
        };

        let bin_str = bin.to_string_lossy().to_string();

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

        let available_models = vec![
            AgentModel {
                id: "opencode-default".into(),
                name: "OpenCode Engine".into(),
                description: Some("Motor local open-source para raciocínio e scaffolding".into()),
            },
        ];

        AgentInfo {
            id: "opencode".into(),
            name: "OpenCode".into(),
            binary_path: Some(bin_str),
            version,
            auth_status: AgentAuthStatus::Authenticated,
            account_info: Some("OpenCode Local Server".into()),
            default_model: Some("opencode-default".into()),
            available_models,
            supports_streaming: true,
            is_subscription: false,
        }
    }

    pub async fn execute_prompt(
        prompt: &str,
        _model: Option<&str>,
        system_instruction: Option<&str>,
    ) -> AppResult<String> {
        let bin = Self::find_binary()
            .ok_or_else(|| AppError::Internal("Binário do OpenCode não encontrado".into()))?;

        let mut full_prompt = String::new();
        if let Some(sys) = system_instruction {
            full_prompt.push_str(sys);
            full_prompt.push_str("\n\n---\n\n");
        }
        full_prompt.push_str(prompt);

        let mut cmd = Command::new(bin);
        cmd.arg("run");
        cmd.arg(&full_prompt);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        ProcessManager::configure_command(&mut cmd);

        let mut child = cmd.spawn()
            .map_err(|e| AppError::Internal(format!("Falha ao iniciar processo do OpenCode: {}", e)))?;

        let stdout = child.stdout.take()
            .ok_or_else(|| AppError::Internal("Não foi possível capturar stdout do OpenCode".into()))?;

        let mut reader = BufReader::new(stdout).lines();
        let mut output_lines = Vec::new();

        while let Ok(Some(line)) = reader.next_line().await {
            output_lines.push(line);
        }

        let status = child.wait().await
            .map_err(|e| AppError::Internal(format!("Falha ao aguardar OpenCode: {}", e)))?;

        if !status.success() && output_lines.is_empty() {
            return Err(AppError::Internal("Execução do OpenCode falhou".into()));
        }

        let result = output_lines.join("\n").trim().to_string();
        if result.is_empty() {
            return Err(AppError::Internal("OpenCode retornou texto vazio".into()));
        }

        Ok(result)
    }
}
