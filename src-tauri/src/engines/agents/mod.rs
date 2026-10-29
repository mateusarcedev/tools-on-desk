pub mod antigravity;
pub mod claude;
pub mod codex;
pub mod opencode;
pub mod types;

pub use antigravity::AntigravityDriver;
pub use claude::ClaudeCodeDriver;
pub use codex::CodexDriver;
pub use opencode::OpenCodeDriver;
pub use types::*;

use crate::error::{AppError, AppResult};

pub struct AgentManager;

impl AgentManager {
    pub async fn list_agents() -> Vec<AgentInfo> {
        let (codex, agy, claude, opencode) = tokio::join!(
            CodexDriver::detect(),
            AntigravityDriver::detect(),
            ClaudeCodeDriver::detect(),
            OpenCodeDriver::detect()
        );

        vec![codex, agy, claude, opencode]
    }

    pub async fn get_agent_status(agent_id: &str) -> AppResult<AgentInfo> {
        match agent_id {
            "codex" => Ok(CodexDriver::detect().await),
            "antigravity" => Ok(AntigravityDriver::detect().await),
            "claude_code" | "claude" => Ok(ClaudeCodeDriver::detect().await),
            "opencode" => Ok(OpenCodeDriver::detect().await),
            other => Err(AppError::InvalidInput(format!("Agente desconhecido: {}", other))),
        }
    }

    pub async fn execute_prompt(
        agent_id: &str,
        prompt: &str,
        model: Option<&str>,
        system_instruction: Option<&str>,
    ) -> AppResult<String> {
        match agent_id {
            "codex" => CodexDriver::execute_prompt(prompt, model, system_instruction).await,
            "antigravity" => AntigravityDriver::execute_prompt(prompt, model, system_instruction).await,
            "claude_code" | "claude" => ClaudeCodeDriver::execute_prompt(prompt, model, system_instruction).await,
            "opencode" => OpenCodeDriver::execute_prompt(prompt, model, system_instruction).await,
            other => Err(AppError::InvalidInput(format!("Agente desconhecido: {}", other))),
        }
    }

    pub async fn enhance_image_prompt(
        agent_id: &str,
        raw_prompt: &str,
        style_hint: Option<&str>,
        aspect_ratio: Option<&str>,
    ) -> AppResult<EnhancePromptResult> {
        let sys_prompt = r#"Você é um Diretor de Arte Sênior e Especialista em Engenharia de Prompt para IA Generativa Visual (FLUX.1 e Stable Diffusion 3.5).
Sua tarefa é pegar uma ideia simples do usuário e refiná-la para gerar uma imagem publicitária ou cinematográfica de impacto.

Regras Obrigatórias:
1. Responda em formato estruturado claro com:
[ENHANCED_PROMPT]: Um prompt descritivo em inglês otimizado para o modelo visual (iluminação, texturas 8k, lente fotográfica, ângulo, composição, atmosfera).
[REASONING]: Uma explicação concisa (em português) de 2 frases sobre suas escolhas estéticas e de iluminação.
[RECOMMENDED_STYLE]: O estilo ideal (ex: Publicitário, Fotográfico, Cinematográfico, 3D, Minimalista).
[RECOMMENDED_RATIO]: A proporção recomendada (ex: 1:1, 16:9, 9:16, 4:3).

Não inclua textos fora dessa estrutura."#;

        let user_prompt = format!(
            "Ideia de imagem: \"{}\"\nEstilo desejado: {}\nProporção pretendida: {}",
            raw_prompt,
            style_hint.unwrap_or("Não especificado"),
            aspect_ratio.unwrap_or("1:1")
        );

        let response = Self::execute_prompt(agent_id, &user_prompt, None, Some(sys_prompt)).await?;

        // Parse structured tags
        let mut enhanced_prompt = raw_prompt.to_string();
        let mut reasoning = None;
        let mut recommended_style = None;
        let mut recommended_ratio = None;

        if let Some(pos) = response.find("[ENHANCED_PROMPT]:") {
            let rest = &response[pos + 18..];
            let end_pos = rest.find('[').unwrap_or(rest.len());
            let clean = rest[..end_pos].trim();
            if !clean.is_empty() {
                enhanced_prompt = clean.to_string();
            }
        } else if !response.trim().is_empty() {
            enhanced_prompt = response.trim().to_string();
        }

        if let Some(pos) = response.find("[REASONING]:") {
            let rest = &response[pos + 12..];
            let end_pos = rest.find('[').unwrap_or(rest.len());
            let clean = rest[..end_pos].trim();
            if !clean.is_empty() {
                reasoning = Some(clean.to_string());
            }
        }

        if let Some(pos) = response.find("[RECOMMENDED_STYLE]:") {
            let rest = &response[pos + 20..];
            let end_pos = rest.find('[').unwrap_or(rest.len());
            let clean = rest[..end_pos].trim();
            if !clean.is_empty() {
                recommended_style = Some(clean.to_string());
            }
        }

        if let Some(pos) = response.find("[RECOMMENDED_RATIO]:") {
            let rest = &response[pos + 20..];
            let end_pos = rest.find('[').unwrap_or(rest.len());
            let clean = rest[..end_pos].trim();
            if !clean.is_empty() {
                recommended_ratio = Some(clean.to_string());
            }
        }

        Ok(EnhancePromptResult {
            original_prompt: raw_prompt.to_string(),
            enhanced_prompt,
            creative_reasoning: reasoning,
            recommended_aspect_ratio: recommended_ratio,
            recommended_style,
            agent_used: agent_id.to_string(),
        })
    }
}
