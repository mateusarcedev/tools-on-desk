use crate::engines::agents::types::{find_agent_binary, AgentAuthStatus, AgentInfo, AgentModel};
use crate::error::{AppError, AppResult};
use crate::platform::processes::ProcessManager;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

pub struct AntigravityDriver;

impl AntigravityDriver {
    pub fn find_binary() -> Option<PathBuf> {
        find_agent_binary("agy", &[
            ".local/bin/agy",
            "AppData/Local/Programs/agy/agy.exe",
        ])
    }

    pub async fn detect() -> AgentInfo {
        let bin_path = Self::find_binary();
        let Some(bin) = bin_path else {
            return AgentInfo {
                id: "antigravity".into(),
                name: "Google Antigravity".into(),
                binary_path: None,
                version: None,
                auth_status: AgentAuthStatus::NotInstalled,
                account_info: None,
                default_model: Some("gemini-3.8-flash-high".into()),
                available_models: vec![],
                supports_streaming: true,
                is_subscription: true,
            };
        };

        let bin_str = bin.to_string_lossy().to_string();

        // Check models via `agy models`
        let mut models_cmd = Command::new(&bin);
        models_cmd.arg("models");
        ProcessManager::configure_command(&mut models_cmd);

        let mut available_models = Vec::new();
        let mut auth_status = AgentAuthStatus::Unauthenticated;
        let mut account_info = None;

        if let Ok(Ok(out)) = tokio::time::timeout(tokio::time::Duration::from_secs(3), models_cmd.output()).await {
            let stdout_str = String::from_utf8_lossy(&out.stdout);
            for line in stdout_str.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('⠋') || trimmed.starts_with('⠙') || trimmed.starts_with('⠹') || trimmed.starts_with('⠸') || trimmed.starts_with('⠼') || trimmed.starts_with('⠴') || trimmed.starts_with('⠦') || trimmed.starts_with('⠧') || trimmed.starts_with('⠇') || trimmed.starts_with('⠏') {
                    continue;
                }
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                if parts.len() >= 2 {
                    let id = parts[0];
                    let name = parts[1..].join(" ");
                    if id.contains("gemini") || id.contains("claude") || id.contains("gpt") {
                        available_models.push(AgentModel {
                            id: id.to_string(),
                            name,
                            description: Some("Disponível via assinatura Google Antigravity".into()),
                        });
                    }
                }
            }

            if !available_models.is_empty() {
                auth_status = AgentAuthStatus::Authenticated;
                account_info = Some("Google Antigravity (Subscription Active)".into());
            }
        }

        if available_models.is_empty() {
            available_models = vec![
                AgentModel {
                    id: "gemini-3.8-flash-high".into(),
                    name: "Gemini 3.8 Flash (High)".into(),
                    description: Some("Alta velocidade e raciocínio multimodal refinado".into()),
                },
                AgentModel {
                    id: "claude-sonnet-4-6".into(),
                    name: "Claude Sonnet 4.6 (Thinking)".into(),
                    description: Some("Direção criativa detalhada e raciocínio visual apurado".into()),
                },
                AgentModel {
                    id: "claude-opus-4-6-thinking".into(),
                    name: "Claude Opus 4.6 (Thinking)".into(),
                    description: Some("Capacidade máxima de concepção de campanhas e narrativa".into()),
                },
            ];
        }

        AgentInfo {
            id: "antigravity".into(),
            name: "Google Antigravity".into(),
            binary_path: Some(bin_str),
            version: Some("1.4.10".into()),
            auth_status,
            account_info,
            default_model: Some("gemini-3.8-flash-high".into()),
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
        Self::execute_prompt_with_images(prompt, model, system_instruction, &[]).await
    }

    pub async fn execute_prompt_with_images(
        prompt: &str,
        model: Option<&str>,
        system_instruction: Option<&str>,
        image_paths: &[String],
    ) -> AppResult<String> {
        let bin = Self::find_binary()
            .ok_or_else(|| AppError::Internal("Binário do Google Antigravity (agy) não encontrado".into()))?;

        let mut full_prompt = String::new();
        if let Some(sys) = system_instruction {
            full_prompt.push_str(sys);
            full_prompt.push_str("\n\n---\n\n");
        }

        if !image_paths.is_empty() {
            full_prompt.push_str("[ARQUIVOS DE IMAGEM PARA ANÁLISE MULTIMODAL]:\n");
            for p in image_paths {
                full_prompt.push_str(&format!("- {}\n", p));
            }
            full_prompt.push_str("Por favor, examine visualmente as imagens acima para orientar as decisões criativas.\n\n");
        }

        full_prompt.push_str(prompt);

        let mut cmd = Command::new(bin);
        cmd.arg("-p");
        if let Some(m) = model {
            cmd.arg("--model");
            cmd.arg(m);
        }
        cmd.arg(&full_prompt);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        ProcessManager::configure_command(&mut cmd);

        let mut child = cmd.spawn()
            .map_err(|e| AppError::Internal(format!("Falha ao iniciar processo do Antigravity: {}", e)))?;

        let stdout = child.stdout.take()
            .ok_or_else(|| AppError::Internal("Não foi possível capturar stdout do Antigravity".into()))?;

        let mut reader = BufReader::new(stdout).lines();
        let mut output_lines = Vec::new();

        while let Ok(Some(line)) = reader.next_line().await {
            output_lines.push(line);
        }

        let status = child.wait().await
            .map_err(|e| AppError::Internal(format!("Falha ao aguardar Antigravity: {}", e)))?;

        if !status.success() && output_lines.is_empty() {
            return Err(AppError::Internal("Execução do Antigravity falhou".into()));
        }

        let result = output_lines.join("\n").trim().to_string();
        if result.is_empty() {
            return Err(AppError::Internal("Antigravity retornou texto vazio".into()));
        }

        Ok(result)
    }
}
