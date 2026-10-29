use crate::domain::{
    ProcessedReference, ReferenceCompatibility, ReferenceFileType, ReferencePurpose,
};
use crate::error::{AppError, AppResult};
use base64::prelude::*;
use std::fs;
use std::io::Read;
use std::path::Path;
use uuid::Uuid;

pub struct ReferenceEngine;

impl ReferenceEngine {
    /// Inspeciona um arquivo de referência local, extrai conteúdo real (texto, dimensões, thumbnail)
    /// e calcula a compatibilidade real com o agente e o modelo de imagem selecionados.
    pub fn inspect_reference_file(
        path: &Path,
        purpose: ReferencePurpose,
        agent_id: &str,
        model_id: &str,
    ) -> AppResult<ProcessedReference> {
        if !path.exists() {
            return Err(AppError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Arquivo de referência não encontrado: {}", path.display()),
            )));
        }

        let metadata = fs::metadata(path)?;
        let file_size_bytes = metadata.len();

        // Limite de segurança: máx 50 MB
        if file_size_bytes > 50 * 1024 * 1024 {
            return Err(AppError::InvalidInput(format!(
                "Arquivo '{}' excede o limite máximo permitido de 50 MB.",
                path.display()
            )));
        }

        let file_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "referencia".into());

        let (file_type, mime_type) = Self::detect_type_and_mime(path);

        let preview_data_url;
        let width;
        let height;
        let page_count;
        let extracted_text;
        let extraction_status;

        match file_type {
            ReferenceFileType::Image => {
                let (w, h, thumb, status) = Self::process_image(path);
                width = w;
                height = h;
                preview_data_url = thumb;
                page_count = None;
                extracted_text = None;
                extraction_status = status;
            }
            ReferenceFileType::Pdf => {
                let (text, pages, status) = Self::process_pdf(path);
                width = None;
                height = None;
                preview_data_url = None;
                extracted_text = text;
                page_count = Some(pages);
                extraction_status = status;
            }
            ReferenceFileType::Docx => {
                let (text, status) = Self::process_docx(path);
                width = None;
                height = None;
                preview_data_url = None;
                page_count = None;
                extracted_text = text;
                extraction_status = status;
            }
            ReferenceFileType::Text | ReferenceFileType::Markdown => {
                let (text, status) = Self::process_plain_text(path);
                width = None;
                height = None;
                preview_data_url = None;
                page_count = None;
                extracted_text = text;
                extraction_status = status;
            }
            ReferenceFileType::Data => {
                let (text, status) = Self::process_data_file(path);
                width = None;
                height = None;
                preview_data_url = None;
                page_count = None;
                extracted_text = text;
                extraction_status = status;
            }
            ReferenceFileType::Svg => {
                let (thumb, text, status) = Self::process_svg(path);
                width = None;
                height = None;
                preview_data_url = thumb;
                page_count = None;
                extracted_text = text;
                extraction_status = status;
            }
            ReferenceFileType::Other => {
                width = None;
                height = None;
                preview_data_url = None;
                page_count = None;
                extracted_text = None;
                extraction_status = "unsupported_format".into();
            }
        }

        let compatibility = Self::evaluate_compatibility(
            &file_type,
            agent_id,
            model_id,
            &extraction_status,
        );

        Ok(ProcessedReference {
            id: Uuid::new_v4().to_string(),
            file_path: path.to_string_lossy().to_string(),
            file_name,
            file_size_bytes,
            file_type,
            mime_type,
            purpose,
            preview_data_url,
            width,
            height,
            page_count,
            extracted_text,
            extraction_status,
            compatibility,
        })
    }

    pub fn inspect_multiple(
        paths_and_purposes: &[(String, ReferencePurpose)],
        agent_id: &str,
        model_id: &str,
    ) -> AppResult<Vec<ProcessedReference>> {
        let mut results = Vec::new();
        for (p_str, purpose) in paths_and_purposes {
            let p = Path::new(p_str);
            let res = Self::inspect_reference_file(p, purpose.clone(), agent_id, model_id)?;
            results.push(res);
        }
        Ok(results)
    }

    fn detect_type_and_mime(path: &Path) -> (ReferenceFileType, String) {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        match ext.as_str() {
            "png" => (ReferenceFileType::Image, "image/png".into()),
            "jpg" | "jpeg" => (ReferenceFileType::Image, "image/jpeg".into()),
            "webp" => (ReferenceFileType::Image, "image/webp".into()),
            "bmp" => (ReferenceFileType::Image, "image/bmp".into()),
            "gif" => (ReferenceFileType::Image, "image/gif".into()),
            "pdf" => (ReferenceFileType::Pdf, "application/pdf".into()),
            "docx" => (
                ReferenceFileType::Docx,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document".into(),
            ),
            "txt" => (ReferenceFileType::Text, "text/plain".into()),
            "md" | "markdown" => (ReferenceFileType::Markdown, "text/markdown".into()),
            "json" => (ReferenceFileType::Data, "application/json".into()),
            "csv" => (ReferenceFileType::Data, "text/csv".into()),
            "svg" => (ReferenceFileType::Svg, "image/svg+xml".into()),
            _ => (ReferenceFileType::Other, "application/octet-stream".into()),
        }
    }

    fn process_image(path: &Path) -> (Option<u32>, Option<u32>, Option<String>, String) {
        match image::open(path) {
            Ok(img) => {
                let w = img.width();
                let h = img.height();

                // Gerar thumbnail compacto (máx 160x160) codificado em base64
                let thumb = img.thumbnail(160, 160);
                let mut buffer = std::io::Cursor::new(Vec::new());

                let data_url = match thumb.write_to(&mut buffer, image::ImageFormat::Jpeg) {
                    Ok(_) => {
                        let b64 = BASE64_STANDARD.encode(buffer.into_inner());
                        Some(format!("data:image/jpeg;base64,{}", b64))
                    }
                    Err(_) => None,
                };

                (Some(w), Some(h), data_url, "ready".into())
            }
            Err(e) => (None, None, None, format!("Erro ao abrir imagem: {}", e)),
        }
    }

    fn process_pdf(path: &Path) -> (Option<String>, u32, String) {
        match lopdf::Document::load(path) {
            Ok(doc) => {
                let pages = doc.get_pages();
                let page_count = pages.len() as u32;

                let mut extracted_pages = Vec::new();
                let mut total_chars = 0;

                // Extrair texto por página até o limite de 20 páginas para contexto útil
                let mut page_nums: Vec<u32> = pages.keys().cloned().collect();
                page_nums.sort();

                for &p in page_nums.iter().take(20) {
                    let page_text = doc.extract_text(&[p]).unwrap_or_default();
                    let trimmed = page_text.trim();
                    if !trimmed.is_empty() {
                        total_chars += trimmed.len();
                        extracted_pages.push(format!("--- Página {} ---\n{}", p, trimmed));
                    }
                }

                if total_chars < 15 {
                    // PDF digitalizado sem camada de texto (imagem pura).
                    (
                        None,
                        page_count,
                        "scanned_pdf_ocr_unavailable".into(),
                    )
                } else {
                    let combined = extracted_pages.join("\n\n");
                    (Some(combined), page_count, "ready".into())
                }
            }
            Err(e) => (None, 0, format!("Erro ao ler PDF: {}", e)),
        }
    }

    fn process_docx(path: &Path) -> (Option<String>, String) {
        let file = match fs::File::open(path) {
            Ok(f) => f,
            Err(e) => return (None, format!("Erro de acesso ao DOCX: {}", e)),
        };

        let mut archive = match zip::ZipArchive::new(file) {
            Ok(a) => a,
            Err(e) => return (None, format!("Arquivo DOCX inválido ou corrompido: {}", e)),
        };

        let mut xml_file = match archive.by_name("word/document.xml") {
            Ok(f) => f,
            Err(_) => return (None, "Estrutura word/document.xml não encontrada no DOCX".into()),
        };

        let mut xml_content = String::new();
        if let Err(e) = xml_file.read_to_string(&mut xml_content) {
            return (None, format!("Falha ao ler XML do documento: {}", e));
        }

        // Extrai o texto contido nos nós <w:p> (parágrafos) e <w:t> (runs de texto)
        let mut paragraphs = Vec::new();
        for p_slice in xml_content.split("</w:p>") {
            let mut p_text = String::new();
            let mut start_idx = 0;
            while let Some(t_open) = p_slice[start_idx..].find("<w:t") {
                let actual_open = start_idx + t_open;
                if let Some(tag_end) = p_slice[actual_open..].find('>') {
                    let text_start = actual_open + tag_end + 1;
                    if let Some(close_tag) = p_slice[text_start..].find("</w:t>") {
                        let text_val = &p_slice[text_start..text_start + close_tag];
                        p_text.push_str(text_val);
                        start_idx = text_start + close_tag + 6;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }

            let trimmed = p_text.trim();
            if !trimmed.is_empty() {
                paragraphs.push(trimmed.to_string());
            }
        }

        if paragraphs.is_empty() {
            (None, "DOCX sem texto pesquisável".into())
        } else {
            (Some(paragraphs.join("\n\n")), "ready".into())
        }
    }

    fn process_plain_text(path: &Path) -> (Option<String>, String) {
        match fs::read(path) {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes).trim().to_string();
                if text.is_empty() {
                    (None, "Arquivo de texto vazio".into())
                } else {
                    // Limitar a 30.000 caracteres para prompt de contexto equilibrado
                    let truncated = if text.len() > 30_000 {
                        format!("{}\n\n[... texto truncado aos 30.000 caracteres ...]", &text[..30_000])
                    } else {
                        text
                    };
                    (Some(truncated), "ready".into())
                }
            }
            Err(e) => (None, format!("Erro ao ler arquivo de texto: {}", e)),
        }
    }

    fn process_data_file(path: &Path) -> (Option<String>, String) {
        match fs::read(path) {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes).trim().to_string();
                let summary = if text.len() > 15_000 {
                    format!("{}\n\n[... dados truncados aos 15.000 caracteres ...]", &text[..15_000])
                } else {
                    text
                };
                (Some(summary), "ready".into())
            }
            Err(e) => (None, format!("Erro ao ler dados: {}", e)),
        }
    }

    fn process_svg(path: &Path) -> (Option<String>, Option<String>, String) {
        match fs::read_to_string(path) {
            Ok(content) => {
                let lower = content.to_lowercase();
                // Verificação de segurança: não permitir scripts inline em SVG
                if lower.contains("<script") || lower.contains("javascript:") || lower.contains("<!entity") {
                    return (
                        None,
                        None,
                        "SVG rejeitado: contém elementos de script ou entidades externas inseguras".into(),
                    );
                }

                let b64 = BASE64_STANDARD.encode(content.as_bytes());
                let data_url = format!("data:image/svg+xml;base64,{}", b64);
                (Some(data_url), Some(content), "ready".into())
            }
            Err(e) => (None, None, format!("Erro ao ler SVG: {}", e)),
        }
    }

    fn evaluate_compatibility(
        file_type: &ReferenceFileType,
        agent_id: &str,
        _model_id: &str,
        extraction_status: &str,
    ) -> ReferenceCompatibility {
        match file_type {
            ReferenceFileType::Image => {
                let (agent_compat, mode, notes): (bool, String, String) = match agent_id {
                    "codex" => (
                        true,
                        "multimodal_vision".into(),
                        "OpenAI Codex aceita a imagem diretamente para análise visual e compreensão de produto/estilo.".into(),
                    ),
                    "antigravity" => (
                        true,
                        "multimodal_vision".into(),
                        "Google Antigravity possui suporte nativo a visão multimodal para direção criativa.".into(),
                    ),
                    "claude_code" => (
                        true,
                        "workspace_inspection".into(),
                        "Claude Code acessa arquivos locais do workspace para inspeção.".into(),
                    ),
                    _ => (
                        false,
                        "metadata_only".into(),
                        "Agente opera apenas em texto; a imagem não será vista diretamente.".into(),
                    ),
                };

                ReferenceCompatibility {
                    agent_compatible: agent_compat,
                    image_model_compatible: false,
                    mode,
                    notes: format!(
                        "{}\nℹ Nota: O modelo de difusão de imagem opera em síntese textual guiada pelas instruções do agente multimodal.",
                        notes
                    ),
                }
            }
            ReferenceFileType::Pdf => {
                if extraction_status == "scanned_pdf_ocr_unavailable" {
                    ReferenceCompatibility {
                        agent_compatible: false,
                        image_model_compatible: false,
                        mode: "scanned_pdf_no_ocr".into(),
                        notes: "PDF digitalizado sem camada de texto pesquisável. Não foi possível extrair conteúdo textual sem OCR.".into(),
                    }
                } else if extraction_status == "ready" {
                    ReferenceCompatibility {
                        agent_compatible: true,
                        image_model_compatible: false,
                        mode: "text_extraction".into(),
                        notes: "Texto extraído com sucesso. O conteúdo alimenta o briefing e diretrizes do agente de IA.".into(),
                    }
                } else {
                    ReferenceCompatibility {
                        agent_compatible: false,
                        image_model_compatible: false,
                        mode: "read_error".into(),
                        notes: format!("Falha na leitura do documento: {}", extraction_status),
                    }
                }
            }
            ReferenceFileType::Docx | ReferenceFileType::Text | ReferenceFileType::Markdown | ReferenceFileType::Data => {
                if extraction_status == "ready" {
                    ReferenceCompatibility {
                        agent_compatible: true,
                        image_model_compatible: false,
                        mode: "text_extraction".into(),
                        notes: "Documento textual estruturado pronto para contextualizar o agente de criação.".into(),
                    }
                } else {
                    ReferenceCompatibility {
                        agent_compatible: false,
                        image_model_compatible: false,
                        mode: "read_error".into(),
                        notes: format!("Erro ao extrair conteúdo do arquivo: {}", extraction_status),
                    }
                }
            }
            ReferenceFileType::Svg => {
                ReferenceCompatibility {
                    agent_compatible: true,
                    image_model_compatible: false,
                    mode: "vector_markup".into(),
                    notes: "Vetor SVG validado. A estrutura vetorial orienta formas e paleta no briefing do agente.".into(),
                }
            }
            ReferenceFileType::Other => ReferenceCompatibility {
                agent_compatible: false,
                image_model_compatible: false,
                mode: "unsupported".into(),
                notes: "Formato de arquivo não suportado pelo pipeline multimodal.".into(),
            },
        }
    }
}
