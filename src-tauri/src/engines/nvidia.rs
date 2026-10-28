use crate::domain::{
    CreativeSkill, NvidiaImageGenOptions, NvidiaImageGenResult, NvidiaKeyStatus, NvidiaModelInfo,
    NvidiaVideoGenOptions, NvidiaVideoGenResult,
};
use crate::error::{AppError, AppResult};
use crate::utils::sanitizer::sanitize_error_text;
use crate::utils::vault::SecureVault;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{Duration, Instant};

const NVIDIA_KEY_SECRET_NAME: &str = "NVIDIA_API_KEY";
const NVIDIA_CHAT_BASE_URL: &str = "https://integrate.api.nvidia.com/v1";
const NVIDIA_GENAI_BASE_URL: &str = "https://ai.api.nvidia.com/v1/genai";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NvidiaValidationResult {
    pub valid: bool,
    pub message: String,
    pub available_models: Vec<String>,
}

pub struct NvidiaAIProvider;

impl NvidiaAIProvider {
    pub fn save_api_key(app_data_dir: &Path, raw_key: &str) -> AppResult<()> {
        let trimmed = raw_key.trim();
        if trimmed.is_empty() {
            SecureVault::delete_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?;
            return Ok(());
        }

        if !trimmed.starts_with("nvapi-") && trimmed.len() < 20 {
            return Err(AppError::InvalidInput(
                "A chave de API da NVIDIA geralmente inicia com 'nvapi-' e possui mais de 20 caracteres.".into(),
            ));
        }

        SecureVault::store_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME, trimmed)?;
        Ok(())
    }

    pub fn get_key_status(app_data_dir: &Path) -> AppResult<NvidiaKeyStatus> {
        let key_opt = SecureVault::get_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?;
        if let Some(key) = key_opt {
            let masked = SecureVault::mask_key(&key);
            Ok(NvidiaKeyStatus {
                has_key: true,
                masked_key: Some(masked),
                validated: true,
                last_validated_at: None,
            })
        } else {
            Ok(NvidiaKeyStatus {
                has_key: false,
                masked_key: None,
                validated: false,
                last_validated_at: None,
            })
        }
    }

    pub async fn validate_key(
        app_data_dir: &Path,
        override_key: Option<&str>,
    ) -> AppResult<NvidiaValidationResult> {
        let key = if let Some(k) = override_key {
            k.to_string()
        } else {
            SecureVault::get_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?
                .ok_or_else(|| AppError::Nvidia("Nenhuma chave de API da NVIDIA configurada.".into()))?
        };

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(12))
            .build()
            .map_err(|e| AppError::Internal(format!("Falha ao inicializar cliente HTTP: {}", e)))?;

        let url = format!("{}/models", NVIDIA_CHAT_BASE_URL);
        let resp = client
            .get(&url)
            .header(AUTHORIZATION, format!("Bearer {}", key))
            .header(CONTENT_TYPE, "application/json")
            .send()
            .await;

        match resp {
            Ok(r) => {
                let status = r.status();
                if status.is_success() {
                    let body: serde_json::Value = r.json().await.unwrap_or_default();
                    let mut models = Vec::new();
                    if let Some(arr) = body.get("data").and_then(|d| d.as_array()) {
                        for item in arr.iter().take(20) {
                            if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                                models.push(id.to_string());
                            }
                        }
                    }
                    Ok(NvidiaValidationResult {
                        valid: true,
                        message: "Chave NVIDIA validada com sucesso!".into(),
                        available_models: models,
                    })
                } else if status.as_u16() == 401 {
                    Err(AppError::Nvidia(
                        "Chave de API NVIDIA inválida ou não autorizada (HTTP 401). Verifique sua chave no portal build.nvidia.com".into(),
                    ))
                } else if status.as_u16() == 429 {
                    Err(AppError::Nvidia(
                        "Limite de requisições excedido temporariamente (HTTP 429). Aguarde alguns instantes.".into(),
                    ))
                } else {
                    let err_txt = r.text().await.unwrap_or_default();
                    Err(AppError::Nvidia(format!(
                        "NVIDIA API retornou status HTTP {}: {}",
                        status.as_u16(),
                        sanitize_error_text(&err_txt)
                    )))
                }
            }
            Err(e) => Err(AppError::Nvidia(format!(
                "Falha na conexão com NVIDIA API: {}",
                sanitize_error_text(&e.to_string())
            ))),
        }
    }

    pub fn list_available_models() -> Vec<NvidiaModelInfo> {
        vec![
            // 1. LLM & Planning
            NvidiaModelInfo {
                id: "meta/llama-3.3-70b-instruct".into(),
                name: "Llama 3.3 70B Instruct".into(),
                category: "llm".into(),
                provider: "Meta / NVIDIA".into(),
                description: "Modelo ideal para roteiros, planejamento de animações, direção de arte e storyboards.".into(),
                context_length: Some(128000),
                supports_streaming: true,
                cost_tier: "free_tier".into(),
            },
            NvidiaModelInfo {
                id: "nvidia/nemotron-4-340b-instruct".into(),
                name: "Nemotron-4 340B Instruct".into(),
                category: "llm".into(),
                provider: "NVIDIA".into(),
                description: "Modelo de raciocínio de alta capacidade para direção criativa e composições complexas.".into(),
                context_length: Some(4096),
                supports_streaming: true,
                cost_tier: "free_tier".into(),
            },
            NvidiaModelInfo {
                id: "mistralai/mixtral-8x22b-instruct".into(),
                name: "Mixtral 8x22B Instruct".into(),
                category: "llm".into(),
                provider: "Mistral AI / NVIDIA".into(),
                description: "Mistura eficiente de especialistas para redação publicitária e legendas dinâmicas.".into(),
                context_length: Some(65536),
                supports_streaming: true,
                cost_tier: "free_tier".into(),
            },
            NvidiaModelInfo {
                id: "deepseek-ai/deepseek-r1".into(),
                name: "DeepSeek R1 Reasoning".into(),
                category: "llm".into(),
                provider: "DeepSeek / NVIDIA".into(),
                description: "Modelo avançado de raciocínio passo-a-passo para montagem de cenas e lógica temporal.".into(),
                context_length: Some(64000),
                supports_streaming: true,
                cost_tier: "free_tier".into(),
            },

            // 2. Image Generation & Editing
            NvidiaModelInfo {
                id: "black-forest-labs/flux.1-schnell".into(),
                name: "FLUX.1 [schnell]".into(),
                category: "image".into(),
                provider: "Black Forest Labs / NVIDIA".into(),
                description: "Geração ultra-rápida (1-4 passos) de alta fidelidade para anúncios e redes sociais.".into(),
                context_length: None,
                supports_streaming: false,
                cost_tier: "free_tier".into(),
            },
            NvidiaModelInfo {
                id: "black-forest-labs/flux.1-dev".into(),
                name: "FLUX.1 [dev]".into(),
                category: "image".into(),
                provider: "Black Forest Labs / NVIDIA".into(),
                description: "Máxima fidelidade visual, tipografia embutida e realismo fotográfico.".into(),
                context_length: None,
                supports_streaming: false,
                cost_tier: "standard".into(),
            },
            NvidiaModelInfo {
                id: "stabilityai/stable-diffusion-3.5-large".into(),
                name: "Stable Diffusion 3.5 Large".into(),
                category: "image".into(),
                provider: "Stability AI / NVIDIA".into(),
                description: "Excelente renderização de objetos, estética cinematográfica e iluminação de produtos.".into(),
                context_length: None,
                supports_streaming: false,
                cost_tier: "standard".into(),
            },

            // 3. Video Generation
            NvidiaModelInfo {
                id: "nvidia/cosmos-nemotron-34b".into(),
                name: "NVIDIA Cosmos Nemotron".into(),
                category: "video".into(),
                provider: "NVIDIA".into(),
                description: "Geração e simulação de dinâmica física e vídeo para mídias imersivas.".into(),
                context_length: None,
                supports_streaming: false,
                cost_tier: "standard".into(),
            },
            NvidiaModelInfo {
                id: "stabilityai/stable-video-diffusion".into(),
                name: "Stable Video Diffusion (SVD)".into(),
                category: "video".into(),
                provider: "Stability AI / NVIDIA".into(),
                description: "Geração de vídeo a partir de imagem com movimento suave de câmera e parallax.".into(),
                context_length: None,
                supports_streaming: false,
                cost_tier: "standard".into(),
            },
        ]
    }

    pub async fn generate_image(
        app_data_dir: &Path,
        options: NvidiaImageGenOptions,
        output_dir: &Path,
    ) -> AppResult<NvidiaImageGenResult> {
        let start_time = Instant::now();
        let key = SecureVault::get_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?
            .ok_or_else(|| AppError::Nvidia("Chave NVIDIA não configurada. Insira sua chave em Configurações > NVIDIA AI.".into()))?;

        let model_id = options.model_id.clone().unwrap_or_else(|| "black-forest-labs/flux.1-schnell".into());
        let endpoint = format!("{}/{}", NVIDIA_GENAI_BASE_URL, model_id);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(90))
            .build()
            .map_err(|e| AppError::Internal(format!("Erro ao criar cliente HTTP: {}", e)))?;

        // Enhance prompt with style preset if specified
        let mut final_prompt = options.prompt.clone();
        if let Some(style) = &options.style_preset {
            let enhancement = match style.to_lowercase().as_str() {
                "publicitário" | "advertising" => ", commercial advertising photography, professional studio lighting, 8k, sharp focus, award-winning ad",
                "fotográfico" | "photographic" => ", 35mm photograph, realistic texture, cinematic depth of field, natural lighting, high dynamic range",
                "cinematográfico" | "cinematic" => ", cinematic lighting, dramatic atmosphere, anamorphic lens, 8k resolution, color graded",
                "minimalista" | "minimalist" => ", minimalist design, clean composition, soft ambient lighting, elegant, negative space",
                "editorial" => ", high fashion editorial, vogue style, studio softbox, sophisticated color palette",
                "ilustração" | "illustration" => ", high quality digital vector art, vibrant colors, clean contours, modern illustration",
                "3d" => ", 3D octane render, raytracing, subsurface scattering, ambient occlusion, hyper-detailed",
                "produto" | "product" => ", product photography, hero shot, clean background, reflections, soft studio light",
                "social media" => ", eye-catching social media aesthetic, vibrant contrast, high engagement, punchy colors",
                _ => "",
            };
            final_prompt.push_str(enhancement);
        }

        let seed = options.seed.unwrap_or_else(|| rand_seed());
        let payload = serde_json::json!({
            "prompt": final_prompt,
            "width": options.width,
            "height": options.height,
            "steps": options.steps.unwrap_or(4),
            "cfg_scale": options.cfg_scale.unwrap_or(3.5),
            "seed": seed,
            "samples": options.samples.max(1).min(4)
        });

        let resp = client
            .post(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", key))
            .header(CONTENT_TYPE, "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Nvidia(format!("Erro ao contatar API de imagem NVIDIA: {}", sanitize_error_text(&e.to_string()))))?;

        let status = resp.status();
        if !status.is_success() {
            let err_body = resp.text().await.unwrap_or_default();
            let sanitized = sanitize_error_text(&err_body);
            if status.as_u16() == 401 {
                return Err(AppError::Nvidia("Chave NVIDIA inválida ou sem permissão para modelos visuais (HTTP 401).".into()));
            } else if status.as_u16() == 402 || status.as_u16() == 403 {
                return Err(AppError::Nvidia(format!(
                    "Acesso negado ou créditos insuficientes para o modelo '{}' na sua conta NVIDIA. O modelo requer cota ativa.",
                    model_id
                )));
            } else if status.as_u16() == 429 {
                return Err(AppError::Nvidia("Limite de geração por minuto da NVIDIA atingido. Tente novamente em alguns segundos.".into()));
            } else {
                return Err(AppError::Nvidia(format!("Falha na geração NVIDIA (HTTP {}): {}", status.as_u16(), sanitized)));
            }
        }

        let body_json: serde_json::Value = resp.json().await
            .map_err(|e| AppError::Nvidia(format!("Resposta inválida do serviço de imagem: {}", e)))?;

        let _ = std::fs::create_dir_all(output_dir);
        let mut saved_paths = Vec::new();

        // Check artifacts format
        if let Some(artifacts) = body_json.get("artifacts").and_then(|a| a.as_array()) {
            for (idx, artifact) in artifacts.iter().enumerate() {
                if let Some(b64) = artifact.get("base64").and_then(|b| b.as_str()) {
                    let image_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64)
                        .map_err(|e| AppError::Image(format!("Falha ao decodificar imagem base64: {}", e)))?;

                    let filename = format!("nvidia_gen_{}_{}_{}.png", chrono::Utc::now().timestamp_millis(), seed, idx);
                    let target_path = output_dir.join(&filename);

                    // Ensure target_path stays inside output_dir (prevent path traversal)
                    if !target_path.starts_with(output_dir) {
                        return Err(AppError::InvalidInput("Violação de caminho de segurança ao salvar imagem".into()));
                    }

                    std::fs::write(&target_path, &image_bytes)
                        .map_err(|e| AppError::Io(e))?;

                    saved_paths.push(target_path.to_string_lossy().to_string());
                }
            }
        }

        if saved_paths.is_empty() {
            return Err(AppError::Nvidia("Nenhuma imagem gerada foi retornada pela API da NVIDIA.".into()));
        }

        let duration_ms = start_time.elapsed().as_millis() as u64;
        Ok(NvidiaImageGenResult {
            image_paths: saved_paths,
            prompt: final_prompt,
            seed,
            model_id,
            duration_ms,
        })
    }

    pub async fn generate_creative_plan(
        app_data_dir: &Path,
        user_prompt: &str,
        project_type: &str,
        style: &str,
        skills: &[CreativeSkill],
    ) -> AppResult<String> {
        let key = SecureVault::get_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?
            .ok_or_else(|| AppError::Nvidia("Chave NVIDIA não configurada.".into()))?;

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| AppError::Internal(format!("Erro ao criar cliente HTTP: {}", e)))?;

        let mut skills_summary = String::new();
        for s in skills.iter().filter(|s| s.enabled) {
            skills_summary.push_str(&format!("- **{}**: {}\n", s.name, s.description));
        }

        let system_instructions = format!(
            r#"Você é o Diretor Criativo e Engenheiro de Motion Design do Arce Creative Studio.
O usuário é um criador ou profissional de negócios que NÃO sabe programar.
Sua missão é interpretar a ideia do usuário e produzir uma resposta estruturada de alto padrão, contendo:
1. Resumo do conceito visual e narrativa
2. Direção de arte recomendada (paleta de cores hexadecimais, tipografia, iluminação)
3. Estrutura de cenas com timing exato em segundos
4. Roteiro de texto para cada cena (títulos, subtítulos, call to action)
5. Efeitos de motion design (fade, zoom, spring, kinetic typography)

Skills ativas no estúdio:
{}

Tipo de projeto: {}
Estilo visual desejado: {}
Responda de forma clara, profissional e motivadora em Português do Brasil."#,
            skills_summary, project_type, style
        );

        let payload = serde_json::json!({
            "model": "meta/llama-3.3-70b-instruct",
            "messages": [
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1500
        });

        let endpoint = format!("{}/chat/completions", NVIDIA_CHAT_BASE_URL);
        let resp = client
            .post(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", key))
            .header(CONTENT_TYPE, "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Nvidia(format!("Erro ao consultar NVIDIA Chat: {}", sanitize_error_text(&e.to_string()))))?;

        if !resp.status().is_success() {
            let err_txt = resp.text().await.unwrap_or_default();
            return Err(AppError::Nvidia(format!("Falha no planejamento de IA (HTTP): {}", sanitize_error_text(&err_txt))));
        }

        let body: serde_json::Value = resp.json().await
            .map_err(|e| AppError::Nvidia(format!("Resposta inválida do chat NVIDIA: {}", e)))?;

        let content = body
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|v| v.as_str())
            .unwrap_or("Não foi possível gerar o planejamento.")
            .to_string();

        Ok(content)
    }

    pub async fn generate_video(
        app_data_dir: &Path,
        options: NvidiaVideoGenOptions,
        output_dir: &Path,
    ) -> AppResult<NvidiaVideoGenResult> {
        let key = SecureVault::get_secret(app_data_dir, NVIDIA_KEY_SECRET_NAME)?
            .ok_or_else(|| AppError::Nvidia("Chave NVIDIA não configurada.".into()))?;

        let model_id = options.model_id.unwrap_or_else(|| "stabilityai/stable-video-diffusion".into());

        // Real check: If calling external video generative model
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::Internal(format!("Erro ao criar cliente HTTP: {}", e)))?;

        let endpoint = format!("{}/{}", NVIDIA_GENAI_BASE_URL, model_id);
        let payload = serde_json::json!({
            "prompt": options.prompt,
            "duration": options.duration_sec,
            "aspect_ratio": options.aspect_ratio
        });

        let resp = client
            .post(&endpoint)
            .header(AUTHORIZATION, format!("Bearer {}", key))
            .header(CONTENT_TYPE, "application/json")
            .json(&payload)
            .send()
            .await;

        match resp {
            Ok(r) => {
                let status = r.status();
                if status.is_success() {
                    // Generative video returned
                    let body: serde_json::Value = r.json().await.unwrap_or_default();
                    let filename = format!("nvidia_video_{}.mp4", chrono::Utc::now().timestamp_millis());
                    let out_path = output_dir.join(&filename);
                    if let Some(b64) = body.get("video_base64").and_then(|v| v.as_str()) {
                        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64)
                            .map_err(|e| AppError::Creative(format!("Falha ao decodificar vídeo: {}", e)))?;
                        std::fs::write(&out_path, bytes)?;
                        return Ok(NvidiaVideoGenResult {
                            video_path: out_path.to_string_lossy().to_string(),
                            duration_sec: options.duration_sec,
                            model_id,
                        });
                    }
                }
                
                // If cloud video model is not authorized or quota exceeded:
                Err(AppError::Nvidia(format!(
                    "O modelo generativo de vídeo na nuvem '{}' não está liberado para sua chave NVIDIA ou requer créditos dedicados de inferência NVCF. Utilize o Modo Vídeo Composto (offline com FFmpeg) para renderizar vídeos completos com transições, música e legendas diretamente no seu computador.",
                    model_id
                )))
            }
            Err(e) => Err(AppError::Nvidia(format!(
                "Falha na chamada ao modelo de vídeo: {}",
                sanitize_error_text(&e.to_string())
            ))),
        }
    }
}

fn rand_seed() -> u64 {
    use std::time::SystemTime;
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(42)
}
