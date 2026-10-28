use crate::domain::{
    CreateProjectPayload, CreativeAsset, CreativeGenerationHistoryEntry, CreativeProject,
    CreativeSkill, CreativeTemplate, MotionComposition, NvidiaImageGenOptions,
    NvidiaImageGenResult, NvidiaKeyStatus, NvidiaModelInfo, NvidiaVideoGenOptions,
    NvidiaVideoGenResult, OpenCodeStatus, RenderMotionOptions, TemplateParameter,
};
use crate::engines::{
    MotionEngine, NvidiaAIProvider, NvidiaValidationResult, OpenCodeManager, SkillManager,
};
use crate::error::AppError;
use crate::storage::Db;
use tauri::{AppHandle, Manager, State};
use std::path::{Path, PathBuf};
use std::sync::Arc;

fn get_app_data_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("data")
    })
}

fn get_export_path(app: &AppHandle) -> PathBuf {
    let app_data = get_app_data_path(app);
    let export_dir = app_data.join("creative_exports");
    let _ = std::fs::create_dir_all(&export_dir);
    export_dir
}

// --------------------------------------------------------------------------
// NVIDIA KEY & PROVIDER COMMANDS
// --------------------------------------------------------------------------

#[tauri::command]
pub async fn save_nvidia_key(
    app: AppHandle,
    key: String,
) -> Result<(), AppError> {
    let app_data = get_app_data_path(&app);
    NvidiaAIProvider::save_api_key(&app_data, &key)?;
    Ok(())
}

#[tauri::command]
pub async fn get_nvidia_key_status(
    app: AppHandle,
) -> Result<NvidiaKeyStatus, AppError> {
    let app_data = get_app_data_path(&app);
    let status = NvidiaAIProvider::get_key_status(&app_data)?;
    Ok(status)
}

#[tauri::command]
pub async fn validate_nvidia_key(
    app: AppHandle,
    key: Option<String>,
) -> Result<NvidiaValidationResult, AppError> {
    let app_data = get_app_data_path(&app);
    let res = NvidiaAIProvider::validate_key(&app_data, key.as_deref()).await?;
    Ok(res)
}

#[tauri::command]
pub fn list_nvidia_models() -> Result<Vec<NvidiaModelInfo>, AppError> {
    Ok(NvidiaAIProvider::list_available_models())
}

#[tauri::command]
pub async fn generate_ai_image(
    app: AppHandle,
    db: State<'_, Db>,
    options: NvidiaImageGenOptions,
) -> Result<NvidiaImageGenResult, AppError> {
    let app_data = get_app_data_path(&app);
    let output_dir = app_data.join("creative_assets").join("images");
    let _ = std::fs::create_dir_all(&output_dir);

    let res = NvidiaAIProvider::generate_image(&app_data, options.clone(), &output_dir).await?;

    // Record into generation history
    for path in &res.image_paths {
        let entry = CreativeGenerationHistoryEntry {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: None,
            provider: "nvidia".into(),
            model: res.model_id.clone(),
            modality: "image".into(),
            prompt: res.prompt.clone(),
            negative_prompt: options.negative_prompt.clone(),
            parameters_json: Some(serde_json::to_string(&options).unwrap_or_default()),
            output_path: Some(path.clone()),
            duration_ms: res.duration_ms,
            status: "success".into(),
            error: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        let _ = db.insert_generation_history(&entry);

        // Also add to creative assets
        if let Ok(meta) = std::fs::metadata(path) {
            let asset = CreativeAsset {
                id: uuid::Uuid::new_v4().to_string(),
                project_id: None,
                name: Path::new(path).file_name().and_then(|n| n.to_str()).unwrap_or("image.png").into(),
                asset_type: "image".into(),
                file_path: path.clone(),
                file_size_bytes: meta.len(),
                width: Some(options.width),
                height: Some(options.height),
                duration_sec: None,
                mime_type: Some("image/png".into()),
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            let _ = db.insert_creative_asset(&asset);
        }
    }

    Ok(res)
}

#[tauri::command]
pub async fn generate_ai_video(
    app: AppHandle,
    db: State<'_, Db>,
    options: NvidiaVideoGenOptions,
) -> Result<NvidiaVideoGenResult, AppError> {
    let app_data = get_app_data_path(&app);
    let output_dir = app_data.join("creative_assets").join("videos");
    let _ = std::fs::create_dir_all(&output_dir);

    let res = NvidiaAIProvider::generate_video(&app_data, options.clone(), &output_dir).await?;

    let entry = CreativeGenerationHistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: None,
        provider: "nvidia".into(),
        model: res.model_id.clone(),
        modality: "video".into(),
        prompt: options.prompt.clone(),
        negative_prompt: None,
        parameters_json: Some(serde_json::to_string(&options).unwrap_or_default()),
        output_path: Some(res.video_path.clone()),
        duration_ms: (res.duration_sec * 1000) as u64,
        status: "success".into(),
        error: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let _ = db.insert_generation_history(&entry);

    Ok(res)
}

#[tauri::command]
pub async fn generate_creative_plan(
    app: AppHandle,
    prompt: String,
    project_type: String,
    style: String,
    skill_ids: Vec<String>,
) -> Result<String, AppError> {
    let app_data = get_app_data_path(&app);
    let skill_mgr = SkillManager::new();
    let mut skills = Vec::new();
    for id in &skill_ids {
        if let Some(s) = skill_mgr.get_skill(id) {
            skills.push(s);
        }
    }
    if skills.is_empty() {
        skills = skill_mgr.list_skills(None, None);
    }

    let plan = NvidiaAIProvider::generate_creative_plan(&app_data, &prompt, &project_type, &style, &skills).await?;
    Ok(plan)
}

// --------------------------------------------------------------------------
// SKILLS & OPENCODE COMMANDS
// --------------------------------------------------------------------------

#[tauri::command]
pub fn get_creative_skills(
    category: Option<String>,
    query: Option<String>,
) -> Result<Vec<CreativeSkill>, AppError> {
    let skill_mgr = SkillManager::new();
    Ok(skill_mgr.list_skills(category.as_deref(), query.as_deref()))
}

#[tauri::command]
pub fn get_creative_skill_by_id(id: String) -> Result<Option<CreativeSkill>, AppError> {
    let skill_mgr = SkillManager::new();
    Ok(skill_mgr.get_skill(&id))
}

#[tauri::command]
pub fn toggle_creative_skill(id: String, enabled: bool) -> Result<bool, AppError> {
    let skill_mgr = SkillManager::new();
    skill_mgr.toggle_skill(&id, enabled)
}

#[tauri::command]
pub async fn get_opencode_status(app: AppHandle) -> Result<OpenCodeStatus, AppError> {
    let app_data = get_app_data_path(&app);
    let status = OpenCodeManager::check_status(&app_data).await;
    Ok(status)
}

// --------------------------------------------------------------------------
// PROJECT WORKSPACE & ASSET CRUD
// --------------------------------------------------------------------------

#[tauri::command]
pub fn create_creative_project(
    db: State<'_, Db>,
    payload: CreateProjectPayload,
) -> Result<CreativeProject, AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let project = CreativeProject {
        id: uuid::Uuid::new_v4().to_string(),
        title: payload.title,
        project_type: payload.project_type,
        aspect_ratio: payload.aspect_ratio,
        width: payload.width,
        height: payload.height,
        fps: payload.fps,
        duration_sec: payload.duration_sec,
        prompt: payload.prompt,
        style: payload.style,
        model: payload.model,
        skills_used: payload.skills_used,
        data_json: payload.data_json,
        output_path: None,
        thumbnail_path: None,
        status: "draft".into(),
        created_at: now.clone(),
        updated_at: now,
    };
    db.insert_creative_project(&project)?;
    Ok(project)
}

#[tauri::command]
pub fn get_creative_project(
    db: State<'_, Db>,
    id: String,
) -> Result<Option<CreativeProject>, AppError> {
    let project = db.get_creative_project(&id)?;
    Ok(project)
}

#[tauri::command]
pub fn list_creative_projects(
    db: State<'_, Db>,
    project_type: Option<String>,
) -> Result<Vec<CreativeProject>, AppError> {
    let list = db.list_creative_projects(project_type.as_deref())?;
    Ok(list)
}

#[tauri::command]
pub fn update_creative_project(
    db: State<'_, Db>,
    project: CreativeProject,
) -> Result<(), AppError> {
    db.update_creative_project(&project)?;
    Ok(())
}

#[tauri::command]
pub fn delete_creative_project(
    db: State<'_, Db>,
    id: String,
) -> Result<(), AppError> {
    db.delete_creative_project(&id)?;
    Ok(())
}

#[tauri::command]
pub fn list_creative_assets(
    db: State<'_, Db>,
    project_id: Option<String>,
) -> Result<Vec<CreativeAsset>, AppError> {
    let list = db.list_creative_assets(project_id.as_deref())?;
    Ok(list)
}

#[tauri::command]
pub fn import_creative_asset(
    db: State<'_, Db>,
    file_path: String,
    project_id: Option<String>,
) -> Result<CreativeAsset, AppError> {
    let path = Path::new(&file_path);
    if !path.is_file() {
        return Err(AppError::InvalidInput(format!("Arquivo não encontrado: {}", file_path)));
    }

    let meta = std::fs::metadata(path)
        .map_err(|e| AppError::Io(e))?;

    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("asset").to_string();
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

    let (asset_type, mime) = match ext.as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "svg" => ("image", format!("image/{}", ext)),
        "mp4" | "webm" | "mov" | "mkv" => ("video", format!("video/{}", ext)),
        "mp3" | "wav" | "aac" | "flac" | "ogg" => ("audio", format!("audio/{}", ext)),
        "ttf" | "otf" | "woff2" => ("font", "font/ttf".into()),
        _ => ("other", "application/octet-stream".into()),
    };

    let asset = CreativeAsset {
        id: uuid::Uuid::new_v4().to_string(),
        project_id,
        name,
        asset_type: asset_type.into(),
        file_path: path.to_string_lossy().to_string(),
        file_size_bytes: meta.len(),
        width: None,
        height: None,
        duration_sec: None,
        mime_type: Some(mime),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    db.insert_creative_asset(&asset)?;
    Ok(asset)
}

#[tauri::command]
pub fn delete_creative_asset(
    db: State<'_, Db>,
    id: String,
) -> Result<(), AppError> {
    db.delete_creative_asset(&id)?;
    Ok(())
}

// --------------------------------------------------------------------------
// MOTION DESIGN & COMPOSITE RENDERING COMMANDS
// --------------------------------------------------------------------------

#[tauri::command]
pub async fn render_motion_project(
    app: AppHandle,
    db: State<'_, Db>,
    options: RenderMotionOptions,
) -> Result<String, AppError> {
    let export_dir = get_export_path(&app);
    let cancel_token = Arc::new(std::sync::atomic::AtomicBool::new(false));

    let res = MotionEngine::render_to_mp4(
        &options,
        &export_dir,
        cancel_token,
        |_progress| {},
    ).await?;

    // Update project status if project_id is given
    if let Some(ref pid) = options.project_id {
        if let Ok(Some(mut proj)) = db.get_creative_project(pid) {
            proj.output_path = Some(res.clone());
            proj.status = "completed".into();
            let _ = db.update_creative_project(&proj);
        }
    }

    Ok(res)
}

#[tauri::command]
pub fn export_remotion_project(
    composition_json: String,
) -> Result<String, AppError> {
    let composition: MotionComposition = serde_json::from_str(&composition_json)
        .map_err(|e| AppError::Creative(format!("JSON inválido: {}", e)))?;
    let tsx = MotionEngine::export_to_remotion_tsx(&composition);
    Ok(tsx)
}

#[tauri::command]
pub fn list_creative_templates() -> Result<Vec<CreativeTemplate>, AppError> {
    Ok(get_default_creative_templates())
}

fn get_default_creative_templates() -> Vec<CreativeTemplate> {
    vec![
        // 1. Promoção de Loja
        CreativeTemplate {
            id: "store-promo".into(),
            title: "Promoção de Loja Relâmpago".into(),
            category: "advertising".into(),
            description: "Vídeo vertical de alta conversão para promoções, com selo de desconto animado e chamada de urgência.".into(),
            aspect_ratio: "9:16".into(),
            duration_sec: 15.0,
            thumbnail_preview: "linear-gradient(135deg, #141A1C 0%, #15F5BA 100%)".into(),
            default_composition_json: r##"{"id":"store-promo","title":"Promoção Relâmpago","width":1080,"height":1920,"fps":30,"duration_sec":15.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Abertura","start_time":0.0,"duration_sec":5.0,"layers":[{"id":"l-1","layer_type":"text","name":"Título","content":"MEGA OFERTA","start_time":0.5,"duration_sec":4.5,"x":0.1,"y":0.3,"width":0.8,"height":0.15,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":84.0,"animation":{"effect":"slide_up","easing":"spring","duration_sec":0.6,"delay_sec":0.2},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "promo_title".into(),
                    label: "Título Principal".into(),
                    param_type: "text".into(),
                    default_value: "MEGA OFERTA".into(),
                    current_value: "MEGA OFERTA".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
                TemplateParameter {
                    id: "accent_color".into(),
                    label: "Cor de Destaque".into(),
                    param_type: "color".into(),
                    default_value: "#15F5BA".into(),
                    current_value: "#15F5BA".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 2. Anúncio de Produto
        CreativeTemplate {
            id: "product-launch".into(),
            title: "Lançamento de Produto".into(),
            category: "product".into(),
            description: "Apresentação cinematográfica horizontal 16:9 de novos produtos com especificações e iluminação elegante.".into(),
            aspect_ratio: "16:9".into(),
            duration_sec: 10.0,
            thumbnail_preview: "linear-gradient(135deg, #0B0F10 0%, #1E293B 100%)".into(),
            default_composition_json: r##"{"id":"product-launch","title":"Lançamento de Produto","width":1920,"height":1080,"fps":30,"duration_sec":10.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Cena Principal","start_time":0.0,"duration_sec":10.0,"layers":[{"id":"l-1","layer_type":"text","name":"Nome do Produto","content":"NOVA COLEÇÃO 2026","start_time":0.5,"duration_sec":9.0,"x":0.1,"y":0.2,"width":0.8,"height":0.12,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#FFFFFF","font_size":72.0,"animation":{"effect":"fade_in","easing":"ease_in_out","duration_sec":0.8,"delay_sec":0.3},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "product_name".into(),
                    label: "Nome do Produto".into(),
                    param_type: "text".into(),
                    default_value: "NOVA COLEÇÃO 2026".into(),
                    current_value: "NOVA COLEÇÃO 2026".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 3. Apresentação de Marca
        CreativeTemplate {
            id: "brand-reveal".into(),
            title: "Apresentação de Marca Institucional".into(),
            category: "brand".into(),
            description: "Vídeo 1:1 quadrado para feed com introdução minimalista, slogan e transições harmônicas.".into(),
            aspect_ratio: "1:1".into(),
            duration_sec: 8.0,
            thumbnail_preview: "linear-gradient(135deg, #141A1C 0%, #0F172A 100%)".into(),
            default_composition_json: r##"{"id":"brand-reveal","title":"Apresentação de Marca","width":1080,"height":1080,"fps":30,"duration_sec":8.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Reveal","start_time":0.0,"duration_sec":8.0,"layers":[{"id":"l-1","layer_type":"text","name":"Slogan","content":"TRANSFORME SEU FUTURO","start_time":1.0,"duration_sec":6.5,"x":0.15,"y":0.45,"width":0.7,"height":0.1,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":56.0,"animation":{"effect":"zoom_in","easing":"spring","duration_sec":0.7,"delay_sec":0.5},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "brand_slogan".into(),
                    label: "Slogan".into(),
                    param_type: "text".into(),
                    default_value: "TRANSFORME SEU FUTURO".into(),
                    current_value: "TRANSFORME SEU FUTURO".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 4. Animação de Logotipo
        CreativeTemplate {
            id: "logo-glow".into(),
            title: "Animação de Logotipo com Brilho Mint".into(),
            category: "motion".into(),
            description: "Entrada em escala elástica com feixe de luz passando sobre a marca e assinatura sonora.".into(),
            aspect_ratio: "1:1".into(),
            duration_sec: 5.0,
            thumbnail_preview: "linear-gradient(135deg, #0B0F10 0%, #15F5BA 100%)".into(),
            default_composition_json: r##"{"id":"logo-glow","title":"Logo Glow","width":1080,"height":1080,"fps":60,"duration_sec":5.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Logo Entrada","start_time":0.0,"duration_sec":5.0,"layers":[{"id":"l-1","layer_type":"text","name":"Marca","content":"ARCE TOOLS","start_time":0.5,"duration_sec":4.0,"x":0.2,"y":0.4,"width":0.6,"height":0.2,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":76.0,"animation":{"effect":"glow","easing":"spring","duration_sec":0.8,"delay_sec":0.2},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "logo_text".into(),
                    label: "Texto da Marca".into(),
                    param_type: "text".into(),
                    default_value: "ARCE TOOLS".into(),
                    current_value: "ARCE TOOLS".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 5. Reels de 15 Segundos
        CreativeTemplate {
            id: "reels-15s".into(),
            title: "Reels / TikTok em 3 Atos".into(),
            category: "social".into(),
            description: "Estrutura testada de 15s para viralização: Gancho nos 3s iniciais, Proposta nos 7s seguintes e CTA final.".into(),
            aspect_ratio: "9:16".into(),
            duration_sec: 15.0,
            thumbnail_preview: "linear-gradient(135deg, #141A1C 0%, #064E3B 100%)".into(),
            default_composition_json: r##"{"id":"reels-15s","title":"Reels 15s","width":1080,"height":1920,"fps":30,"duration_sec":15.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Ato 1 - Gancho","start_time":0.0,"duration_sec":4.0,"layers":[{"id":"l-1","layer_type":"text","name":"Gancho","content":"PARE DE PERDER TEMPO!","start_time":0.2,"duration_sec":3.5,"x":0.1,"y":0.35,"width":0.8,"height":0.15,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#FFFFFF","font_size":78.0,"animation":{"effect":"bounce","easing":"spring","duration_sec":0.5,"delay_sec":0.1},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "hook_text".into(),
                    label: "Gancho Inicial".into(),
                    param_type: "text".into(),
                    default_value: "PARE DE PERDER TEMPO!".into(),
                    current_value: "PARE DE PERDER TEMPO!".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 6. Story Publicitário
        CreativeTemplate {
            id: "story-ad".into(),
            title: "Story Publicitário com Botão Animado".into(),
            category: "advertising".into(),
            description: "Formato vertical para stories com indicador animado de clique e sensação de urgência.".into(),
            aspect_ratio: "9:16".into(),
            duration_sec: 12.0,
            thumbnail_preview: "linear-gradient(135deg, #15F5BA 0%, #0F172A 100%)".into(),
            default_composition_json: r##"{"id":"story-ad","title":"Story Ad","width":1080,"height":1920,"fps":30,"duration_sec":12.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Oferta","start_time":0.0,"duration_sec":12.0,"layers":[{"id":"l-1","layer_type":"text","name":"Chamada","content":"DISPONÍVEL AGORA","start_time":0.5,"duration_sec":11.0,"x":0.1,"y":0.25,"width":0.8,"height":0.12,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":72.0,"animation":{"effect":"slide_up","easing":"ease_in_out","duration_sec":0.6,"delay_sec":0.2},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "story_title".into(),
                    label: "Chamada do Story".into(),
                    param_type: "text".into(),
                    default_value: "DISPONÍVEL AGORA".into(),
                    current_value: "DISPONÍVEL AGORA".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 7. Thumbnail
        CreativeTemplate {
            id: "youtube-thumb".into(),
            title: "Thumbnail de Alto CTR".into(),
            category: "social".into(),
            description: "Layout 16:9 de alto impacto com tipografia gigante e cores contrastantes para capas de vídeos.".into(),
            aspect_ratio: "16:9".into(),
            duration_sec: 5.0,
            thumbnail_preview: "linear-gradient(135deg, #141A1C 0%, #22C55E 100%)".into(),
            default_composition_json: r##"{"id":"youtube-thumb","title":"Thumbnail CTR","width":1920,"height":1080,"fps":30,"duration_sec":5.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Capa","start_time":0.0,"duration_sec":5.0,"layers":[{"id":"l-1","layer_type":"text","name":"Título da Capa","content":"O SEGREDO REVELADO!","start_time":0.0,"duration_sec":5.0,"x":0.08,"y":0.35,"width":0.85,"height":0.2,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":96.0,"animation":{"effect":"zoom_in","easing":"spring","duration_sec":0.5,"delay_sec":0.0},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "thumb_text".into(),
                    label: "Texto da Thumbnail".into(),
                    param_type: "text".into(),
                    default_value: "O SEGREDO REVELADO!".into(),
                    current_value: "O SEGREDO REVELADO!".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 8. Abertura de Vídeo
        CreativeTemplate {
            id: "video-opener".into(),
            title: "Abertura Cinemática de 5 Segundos".into(),
            category: "motion".into(),
            description: "Intro impactante para canais, cursos e transmissões ao vivo com transição limpa para o conteúdo.".into(),
            aspect_ratio: "16:9".into(),
            duration_sec: 5.0,
            thumbnail_preview: "linear-gradient(135deg, #0B0F10 0%, #0369A1 100%)".into(),
            default_composition_json: r##"{"id":"video-opener","title":"Abertura Cinemática","width":1920,"height":1080,"fps":60,"duration_sec":5.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Intro","start_time":0.0,"duration_sec":5.0,"layers":[{"id":"l-1","layer_type":"text","name":"Título do Canal","content":"ARCE STUDIO","start_time":0.4,"duration_sec":4.2,"x":0.15,"y":0.4,"width":0.7,"height":0.2,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#FFFFFF","font_size":88.0,"animation":{"effect":"fade_in","easing":"ease_in_out","duration_sec":0.7,"delay_sec":0.2},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "channel_title".into(),
                    label: "Título do Canal / Projeto".into(),
                    param_type: "text".into(),
                    default_value: "ARCE STUDIO".into(),
                    current_value: "ARCE STUDIO".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 9. Oferta com Preço Animado
        CreativeTemplate {
            id: "animated-price".into(),
            title: "Preço Animado com Efeito Pop".into(),
            category: "advertising".into(),
            description: "Preço anterior riscado com o novo valor surgindo em destaque mint com física de mola (spring).".into(),
            aspect_ratio: "1:1".into(),
            duration_sec: 7.0,
            thumbnail_preview: "linear-gradient(135deg, #141A1C 0%, #15F5BA 100%)".into(),
            default_composition_json: r##"{"id":"animated-price","title":"Preço Animado","width":1080,"height":1080,"fps":60,"duration_sec":7.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Preço","start_time":0.0,"duration_sec":7.0,"layers":[{"id":"l-1","layer_type":"text","name":"Valor","content":"R$ 97,00","start_time":0.8,"duration_sec":5.8,"x":0.2,"y":0.45,"width":0.6,"height":0.15,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":84.0,"animation":{"effect":"bounce","easing":"spring","duration_sec":0.6,"delay_sec":0.4},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "price_value".into(),
                    label: "Valor Promocional".into(),
                    param_type: "text".into(),
                    default_value: "R$ 97,00".into(),
                    current_value: "R$ 97,00".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },

        // 10. Antes e Depois
        CreativeTemplate {
            id: "before-after".into(),
            title: "Transformação Antes e Depois".into(),
            category: "product".into(),
            description: "Divisão comparativa com transição vertical ou wipe horizontal mostrando o resultado de forma irrefutável.".into(),
            aspect_ratio: "1:1".into(),
            duration_sec: 8.0,
            thumbnail_preview: "linear-gradient(135deg, #334155 0%, #15F5BA 100%)".into(),
            default_composition_json: r##"{"id":"before-after","title":"Antes e Depois","width":1080,"height":1080,"fps":30,"duration_sec":8.0,"background_color":"#0B0F10","scenes":[{"id":"sc-1","title":"Comparativo","start_time":0.0,"duration_sec":8.0,"layers":[{"id":"l-1","layer_type":"text","name":"Legenda","content":"ANTES vs DEPOIS","start_time":0.5,"duration_sec":7.0,"x":0.1,"y":0.1,"width":0.8,"height":0.1,"opacity":1.0,"scale":1.0,"rotation":0.0,"color":"#15F5BA","font_size":60.0,"animation":{"effect":"fade_in","easing":"ease_in_out","duration_sec":0.6,"delay_sec":0.2},"z_index":1}]}]}"##.into(),
            editable_parameters: vec![
                TemplateParameter {
                    id: "comparison_label".into(),
                    label: "Legenda".into(),
                    param_type: "text".into(),
                    default_value: "ANTES vs DEPOIS".into(),
                    current_value: "ANTES vs DEPOIS".into(),
                    options: None,
                    target_layer_id: "l-1".into(),
                },
            ],
        },
    ]
}
