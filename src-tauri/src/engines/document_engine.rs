use crate::domain::{
    DocumentOperationResult, LibreOfficeStatus, PdfCompressOptions, PdfInfo, PdfMergeOptions,
    PdfOrganizeOptions, PdfPageInfo, PdfSplitOptions, PdfToDocxOptions, WordToPdfOptions,
};
use crate::error::{AppError, AppResult};
use docx_rs::{Docx, Paragraph, Run};
use lopdf::{Document, Object};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

pub struct DocumentEngine;

impl DocumentEngine {
    // ==========================================
    // INSPECTOR
    // ==========================================

    pub fn inspect_pdf<P: AsRef<Path>>(path: P) -> AppResult<PdfInfo> {
        let path = path.as_ref();
        if !path.exists() {
            return Err(AppError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Arquivo não encontrado: {}", path.display()),
            )));
        }

        let metadata = fs::metadata(path)?;
        let file_size_bytes = metadata.len();
        let file_size_formatted = format_file_size(file_size_bytes);

        let doc = Document::load(path).map_err(|e| {
            AppError::Document(format!("Não foi possível abrir o arquivo PDF: {}", e))
        })?;

        let is_encrypted = doc.is_encrypted();
        let pages_map = doc.get_pages();
        let page_count = pages_map.len() as u32;

        // Document Metadata
        let mut title = None;
        let mut author = None;
        let mut creator = None;

        if let Ok(info_id) = doc.trailer.get(b"Info").and_then(|obj| obj.as_reference()) {
            if let Ok(info_dict) = doc.get_object(info_id).and_then(|obj| obj.as_dict()) {
                if let Ok(t) = info_dict.get(b"Title").and_then(|obj| obj.as_str()) {
                    title = Some(String::from_utf8_lossy(t).to_string());
                }
                if let Ok(a) = info_dict.get(b"Author").and_then(|obj| obj.as_str()) {
                    author = Some(String::from_utf8_lossy(a).to_string());
                }
                if let Ok(c) = info_dict.get(b"Creator").and_then(|obj| obj.as_str()) {
                    creator = Some(String::from_utf8_lossy(c).to_string());
                }
            }
        }

        let mut pages_info = Vec::new();
        let mut total_extracted_chars = 0;
        let mut first_width = 595.28; // A4 pt default
        let mut first_height = 841.89;

        // Iterate up to first 100 pages for responsive UI
        let mut sorted_page_nums: Vec<u32> = pages_map.keys().cloned().collect();
        sorted_page_nums.sort();

        for &num in sorted_page_nums.iter().take(100) {
            let mut width_pt = 595.28;
            let mut height_pt = 841.89;
            let mut rotation_deg = 0;

            if let Some(&page_id) = pages_map.get(&num) {
                if let Ok(page_dict) = doc.get_object(page_id).and_then(|o| o.as_dict()) {
                    // Extract rotation
                    if let Ok(rot) = page_dict.get(b"Rotate").and_then(|r| r.as_i64()) {
                        rotation_deg = rot as i32;
                    }

                    // Extract MediaBox [llx, lly, urx, ury]
                    if let Ok(mb) = page_dict.get(b"MediaBox").and_then(|m| m.as_array()) {
                        if mb.len() >= 4 {
                            let llx = obj_to_f64(&mb[0]).unwrap_or(0.0);
                            let lly = obj_to_f64(&mb[1]).unwrap_or(0.0);
                            let urx = obj_to_f64(&mb[2]).unwrap_or(595.28);
                            let ury = obj_to_f64(&mb[3]).unwrap_or(841.89);
                            width_pt = (urx - llx).abs();
                            height_pt = (ury - lly).abs();
                        }
                    }
                }
            }

            if num == 1 {
                first_width = width_pt;
                first_height = height_pt;
            }

            // Extract text snippet
            let snippet = doc
                .extract_text(&[num])
                .ok()
                .map(|t| {
                    let cleaned: String = t
                        .chars()
                        .filter(|c| !c.is_control() || *c == ' ')
                        .take(120)
                        .collect();
                    total_extracted_chars += cleaned.len();
                    cleaned
                });

            pages_info.push(PdfPageInfo {
                page_number: num,
                width_pt,
                height_pt,
                rotation_deg,
                text_snippet: snippet,
            });
        }

        let orientation = if first_height >= first_width {
            "Retrato".to_string()
        } else {
            "Paisagem".to_string()
        };

        Ok(PdfInfo {
            path: path.to_string_lossy().to_string(),
            page_count,
            file_size_bytes,
            file_size_formatted,
            is_encrypted,
            has_selectable_text: total_extracted_chars > 20,
            title,
            author,
            creator,
            page_width_pt: Some(first_width),
            page_height_pt: Some(first_height),
            orientation: Some(orientation),
            pages: pages_info,
        })
    }

    // ==========================================
    // MERGE ENGINE
    // ==========================================

    pub fn merge_pdfs(options: &PdfMergeOptions) -> AppResult<DocumentOperationResult> {
        if options.source_paths.len() < 2 {
            return Err(AppError::InvalidInput(
                "Selecione ao menos 2 arquivos PDF para unir.".to_string(),
            ));
        }

        let target_path = Path::new(&options.target_path);
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut target_doc = Document::with_version("1.5");
        let mut max_id = 1;
        let mut all_page_ids = Vec::new();

        // Reserve target Pages object ID
        let pages_id = (max_id, 0);
        max_id += 1;

        for path_str in &options.source_paths {
            let path = Path::new(path_str);
            if !path.exists() {
                return Err(AppError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("Arquivo não encontrado: {}", path.display()),
                )));
            }

            let mut doc = Document::load(path).map_err(|e| {
                AppError::Document(format!("Erro ao ler PDF '{}': {}", path.display(), e))
            })?;

            if doc.is_encrypted() {
                return Err(AppError::Document(format!(
                    "O arquivo '{}' está protegido por senha. Documentos protegidos não podem ser unidos.",
                    path.display()
                )));
            }

            doc.renumber_objects_with(max_id);
            let pages = doc.get_pages();

            // Collect page object IDs in sequence
            let mut page_nums: Vec<u32> = pages.keys().cloned().collect();
            page_nums.sort();
            for num in page_nums {
                if let Some(&page_id) = pages.get(&num) {
                    all_page_ids.push(Object::Reference(page_id));
                }
            }

            // Copy objects, redirecting Page.Parent to target pages_id
            for (id, mut obj) in doc.objects {
                if let Ok(dict) = obj.as_dict_mut() {
                    let type_name = dict.get(b"Type").and_then(|t| t.as_name()).unwrap_or(b"");
                    if type_name == b"Catalog" || type_name == b"Pages" {
                        continue;
                    }
                    if type_name == b"Page" {
                        dict.set("Parent", Object::Reference(pages_id));
                    }
                }
                target_doc.objects.insert(id, obj);
            }

            max_id = target_doc.max_id + 1;
        }

        // Build Pages dictionary
        let mut pages_dict = lopdf::Dictionary::new();
        pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
        pages_dict.set("Count", Object::Integer(all_page_ids.len() as i64));
        pages_dict.set("Kids", Object::Array(all_page_ids.clone()));
        target_doc
            .objects
            .insert(pages_id, Object::Dictionary(pages_dict));

        // Build Catalog dictionary
        let catalog_id = (max_id, 0);
        let mut catalog_dict = lopdf::Dictionary::new();
        catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
        catalog_dict.set("Pages", Object::Reference(pages_id));
        target_doc
            .objects
            .insert(catalog_id, Object::Dictionary(catalog_dict));

        target_doc
            .trailer
            .set("Root", Object::Reference(catalog_id));
        target_doc.compress();

        target_doc.save(target_path).map_err(|e| {
            AppError::Document(format!("Erro ao gravar PDF unificado no disco: {}", e))
        })?;

        let output_size = fs::metadata(target_path)?.len();

        Ok(DocumentOperationResult {
            success: true,
            output_path: target_path.to_string_lossy().to_string(),
            output_size_bytes: output_size,
            original_size_bytes: None,
            saved_percent: None,
            page_count: Some(all_page_ids.len() as u32),
            message: format!(
                "Sucesso: {} documentos unidos em {} páginas.",
                options.source_paths.len(),
                all_page_ids.len()
            ),
        })
    }

    // ==========================================
    // SPLIT ENGINE
    // ==========================================

    pub fn split_pdf(options: &PdfSplitOptions) -> AppResult<Vec<String>> {
        let source_path = Path::new(&options.source_path);
        let target_dir = Path::new(&options.target_dir);
        fs::create_dir_all(target_dir)?;

        let doc = Document::load(source_path).map_err(|e| {
            AppError::Document(format!("Erro ao ler PDF de origem: {}", e))
        })?;

        if doc.is_encrypted() {
            return Err(AppError::Document(
                "O documento está protegido por senha e não pode ser dividido.".to_string(),
            ));
        }

        let total_pages = doc.get_pages().len() as u32;
        let stem = source_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();
        let mut generated_files = Vec::new();

        match options.mode.as_str() {
            "all" => {
                for page in 1..=total_pages {
                    let mut page_doc = doc.clone();
                    let to_delete: Vec<u32> = (1..=total_pages).filter(|&p| p != page).collect();
                    page_doc.delete_pages(&to_delete);

                    let out_name = format!("{}_pagina_{:03}.pdf", stem, page);
                    let out_path = target_dir.join(out_name);
                    page_doc.save(&out_path).map_err(|e| {
                        AppError::Document(format!("Erro ao salvar página {}: {}", page, e))
                    })?;
                    generated_files.push(out_path.to_string_lossy().to_string());
                }
            }
            "ranges" => {
                let range_str = options.ranges.as_deref().unwrap_or("1");
                let page_numbers = parse_page_ranges(range_str, total_pages)?;

                if options.export_single.unwrap_or(true) {
                    // Export selected pages into a single combined file
                    let mut page_doc = doc.clone();
                    let selected_set: HashSet<u32> = page_numbers.iter().cloned().collect();
                    let to_delete: Vec<u32> = (1..=total_pages)
                        .filter(|p| !selected_set.contains(p))
                        .collect();
                    page_doc.delete_pages(&to_delete);

                    let filename = options
                        .output_filename
                        .clone()
                        .unwrap_or_else(|| format!("{}_extraido.pdf", stem));
                    let out_path = target_dir.join(filename);
                    page_doc.save(&out_path).map_err(|e| {
                        AppError::Document(format!("Erro ao salvar PDF dividido: {}", e))
                    })?;
                    generated_files.push(out_path.to_string_lossy().to_string());
                } else {
                    // Export each individual selected page
                    for page in page_numbers {
                        let mut page_doc = doc.clone();
                        let to_delete: Vec<u32> = (1..=total_pages).filter(|&p| p != page).collect();
                        page_doc.delete_pages(&to_delete);

                        let out_name = format!("{}_pag_{:03}.pdf", stem, page);
                        let out_path = target_dir.join(out_name);
                        page_doc.save(&out_path).map_err(|e| {
                            AppError::Document(format!("Erro ao salvar página {}: {}", page, e))
                        })?;
                        generated_files.push(out_path.to_string_lossy().to_string());
                    }
                }
            }
            "every_n" => {
                let n = options.every_n.unwrap_or(1).max(1);
                let mut start = 1;
                let mut part = 1;

                while start <= total_pages {
                    let end = (start + n - 1).min(total_pages);
                    let mut part_doc = doc.clone();
                    let to_delete: Vec<u32> = (1..=total_pages)
                        .filter(|&p| p < start || p > end)
                        .collect();
                    part_doc.delete_pages(&to_delete);

                    let out_name = format!("{}_parte_{:02}_pags_{}-{}.pdf", stem, part, start, end);
                    let out_path = target_dir.join(out_name);
                    part_doc.save(&out_path).map_err(|e| {
                        AppError::Document(format!("Erro ao salvar parte {}: {}", part, e))
                    })?;
                    generated_files.push(out_path.to_string_lossy().to_string());

                    start = end + 1;
                    part += 1;
                }
            }
            _ => {
                return Err(AppError::InvalidInput(format!(
                    "Modo de divisão desconhecido: {}",
                    options.mode
                )));
            }
        }

        Ok(generated_files)
    }

    // ==========================================
    // ORGANIZE ENGINE
    // ==========================================

    pub fn organize_pdf(options: &PdfOrganizeOptions) -> AppResult<DocumentOperationResult> {
        let source_path = Path::new(&options.source_path);
        let target_path = Path::new(&options.target_path);

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let doc = Document::load(source_path).map_err(|e| {
            AppError::Document(format!("Erro ao abrir PDF para organizar: {}", e))
        })?;

        if doc.is_encrypted() {
            return Err(AppError::Document(
                "O documento está protegido por senha e não pode ser reorganizado.".to_string(),
            ));
        }

        let total_pages = doc.get_pages().len() as u32;

        if options.pages.is_empty() {
            return Err(AppError::InvalidInput(
                "Nenhuma página selecionada para compor o documento reorganizado.".to_string(),
            ));
        }

        // Validate all requested pages exist
        for action in &options.pages {
            if action.original_page < 1 || action.original_page > total_pages {
                return Err(AppError::InvalidInput(format!(
                    "Página de origem {} inválida. O documento possui {} páginas.",
                    action.original_page, total_pages
                )));
            }
        }

        // Build new document from selected pages
        let mut target_doc = Document::with_version("1.5");
        let mut max_id = 1;
        let pages_id = (max_id, 0);
        max_id += 1;

        let mut new_page_refs = Vec::new();

        for action in &options.pages {
            let mut single_page_doc = doc.clone();
            let to_delete: Vec<u32> = (1..=total_pages)
                .filter(|&p| p != action.original_page)
                .collect();
            single_page_doc.delete_pages(&to_delete);

            // Apply rotation if needed
            if action.rotation_deg % 360 != 0 {
                let pages = single_page_doc.get_pages();
                if let Some(&p_id) = pages.get(&1) {
                    if let Ok(p_dict) = single_page_doc.get_object_mut(p_id).and_then(|o| o.as_dict_mut()) {
                        let cur_rot = p_dict.get(b"Rotate").and_then(|r| r.as_i64()).unwrap_or(0);
                        let final_rot = (cur_rot + action.rotation_deg as i64) % 360;
                        p_dict.set("Rotate", Object::Integer(final_rot));
                    }
                }
            }

            single_page_doc.renumber_objects_with(max_id);
            let pages = single_page_doc.get_pages();
            if let Some(&p_id) = pages.get(&1) {
                new_page_refs.push(Object::Reference(p_id));
            }

            for (id, mut obj) in single_page_doc.objects {
                if let Ok(dict) = obj.as_dict_mut() {
                    let type_name = dict.get(b"Type").and_then(|t| t.as_name()).unwrap_or(b"");
                    if type_name == b"Catalog" || type_name == b"Pages" {
                        continue;
                    }
                    if type_name == b"Page" {
                        dict.set("Parent", Object::Reference(pages_id));
                    }
                }
                target_doc.objects.insert(id, obj);
            }

            max_id = target_doc.max_id + 1;
        }

        // Build Pages dictionary
        let mut pages_dict = lopdf::Dictionary::new();
        pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
        pages_dict.set("Count", Object::Integer(new_page_refs.len() as i64));
        pages_dict.set("Kids", Object::Array(new_page_refs.clone()));
        target_doc
            .objects
            .insert(pages_id, Object::Dictionary(pages_dict));

        // Build Catalog dictionary
        let catalog_id = (max_id, 0);
        let mut catalog_dict = lopdf::Dictionary::new();
        catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
        catalog_dict.set("Pages", Object::Reference(pages_id));
        target_doc
            .objects
            .insert(catalog_id, Object::Dictionary(catalog_dict));

        target_doc
            .trailer
            .set("Root", Object::Reference(catalog_id));
        target_doc.compress();

        target_doc.save(target_path).map_err(|e| {
            AppError::Document(format!("Erro ao gravar documento reorganizado: {}", e))
        })?;

        let output_size = fs::metadata(target_path)?.len();

        Ok(DocumentOperationResult {
            success: true,
            output_path: target_path.to_string_lossy().to_string(),
            output_size_bytes: output_size,
            original_size_bytes: None,
            saved_percent: None,
            page_count: Some(options.pages.len() as u32),
            message: format!(
                "Documento reorganizado com sucesso ({} páginas geradas).",
                options.pages.len()
            ),
        })
    }

    // ==========================================
    // COMPRESS ENGINE
    // ==========================================

    pub fn compress_pdf(options: &PdfCompressOptions) -> AppResult<DocumentOperationResult> {
        let source_path = Path::new(&options.source_path);
        let target_path = Path::new(&options.target_path);

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let orig_size = fs::metadata(source_path)?.len();

        let mut doc = Document::load(source_path).map_err(|e| {
            AppError::Document(format!("Erro ao carregar PDF para compressão: {}", e))
        })?;

        if doc.is_encrypted() {
            return Err(AppError::Document(
                "PDFs protegidos por senha não podem ser comprimidos estruturalmente.".to_string(),
            ));
        }

        // 1. Structural pruning
        doc.prune_objects();

        // 2. Stream deflation / recompression
        doc.compress();

        // 3. If extreme, remove metadata stream
        if options.level == "extreme" {
            let metadata_ids: Vec<lopdf::ObjectId> = doc
                .objects
                .iter()
                .filter_map(|(&id, obj)| {
                    if let Ok(dict) = obj.as_dict() {
                        if dict.get(b"Type").and_then(|t| t.as_name()).unwrap_or(b"") == b"Metadata" {
                            return Some(id);
                        }
                    }
                    None
                })
                .collect();

            for id in metadata_ids {
                doc.objects.remove(&id);
            }
        }

        doc.save(target_path).map_err(|e| {
            AppError::Document(format!("Erro ao salvar PDF comprimido: {}", e))
        })?;

        let comp_size = fs::metadata(target_path)?.len();
        let saved_percent = if orig_size > 0 && comp_size < orig_size {
            Some(((orig_size - comp_size) as f64 / orig_size as f64) * 100.0)
        } else {
            Some(0.0)
        };

        let message = if comp_size < orig_size {
            let pct = saved_percent.unwrap_or(0.0);
            format!(
                "Compressão concluída: redução de {} ({:.1}% menor).",
                format_file_size(orig_size - comp_size),
                pct
            )
        } else {
            "O arquivo já se encontrava com compressão estrutural máxima (economia de 0%).".to_string()
        };

        Ok(DocumentOperationResult {
            success: true,
            output_path: target_path.to_string_lossy().to_string(),
            output_size_bytes: comp_size,
            original_size_bytes: Some(orig_size),
            saved_percent,
            page_count: Some(doc.get_pages().len() as u32),
            message,
        })
    }

    // ==========================================
    // LIBREOFFICE DETECTION & WORD -> PDF
    // ==========================================

    pub fn check_libreoffice() -> LibreOfficeStatus {
        let candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            "soffice",
            "libreoffice",
        ];

        for &cmd in &candidates {
            if let Ok(output) = Command::new(cmd).arg("--version").output() {
                if output.status.success() {
                    let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    return LibreOfficeStatus {
                        is_available: true,
                        path: Some(cmd.to_string()),
                        version: Some(ver),
                        notes: "LibreOffice detectado e pronto para conversão headless.".to_string(),
                    };
                }
            }
        }

        LibreOfficeStatus {
            is_available: false,
            path: None,
            version: None,
            notes: "LibreOffice não detectado. Conversões Word para PDF requerem o LibreOffice headless instalado no sistema (winget install TheDocumentFoundation.LibreOffice).".to_string(),
        }
    }

    pub fn convert_word_to_pdf(options: &WordToPdfOptions) -> AppResult<DocumentOperationResult> {
        let lo_status = Self::check_libreoffice();
        if !lo_status.is_available {
            return Err(AppError::Document(
                "O LibreOffice não foi detectado no sistema. A conversão de Word (.docx/.doc) para PDF necessita do LibreOffice em modo headless. Instale gratuitamente via 'winget install TheDocumentFoundation.LibreOffice'.".to_string(),
            ));
        }

        let lo_binary = lo_status.path.unwrap();
        let source_path = Path::new(&options.source_path);
        if !source_path.exists() {
            return Err(AppError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Arquivo Word não encontrado: {}", source_path.display()),
            )));
        }

        // Determine destination folder
        let temp_dir = std::env::temp_dir();
        let out_dir = match &options.target_path {
            Some(p) => Path::new(p).parent().unwrap_or(&temp_dir),
            None => source_path.parent().unwrap_or(&temp_dir),
        };
        fs::create_dir_all(out_dir)?;

        // Isolated temporary user installation profile to prevent lockups with running LibreOffice instances
        let profile_dir = temp_dir.join(format!("arce_lo_profile_{}", Uuid::new_v4()));
        let _ = fs::create_dir_all(&profile_dir);
        let profile_url = format!(
            "-env:UserInstallation=file:///{}",
            profile_dir.to_string_lossy().replace('\\', "/")
        );

        let output = Command::new(&lo_binary)
            .arg(&profile_url)
            .arg("--headless")
            .arg("--convert-to")
            .arg("pdf")
            .arg("--outdir")
            .arg(out_dir)
            .arg(source_path)
            .arg("--norestore")
            .arg("--nofirststartwizard")
            .arg("--nologo")
            .output()
            .map_err(|e| {
                AppError::Document(format!("Falha ao invocar executável do LibreOffice: {}", e))
            })?;

        // Cleanup temp profile
        let _ = fs::remove_dir_all(&profile_dir);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::Document(format!(
                "O LibreOffice retornou erro ao converter o documento Word: {}",
                stderr
            )));
        }

        let stem = source_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();
        let expected_pdf = out_dir.join(format!("{}.pdf", stem));

        if !expected_pdf.exists() {
            return Err(AppError::Document(
                "O arquivo PDF resultante não foi encontrado após a conversão do Word.".to_string(),
            ));
        }

        // Rename if target_path was specified
        let final_path = if let Some(target) = &options.target_path {
            let t_path = Path::new(target);
            if t_path != expected_pdf {
                let _ = fs::rename(&expected_pdf, t_path);
                t_path.to_path_buf()
            } else {
                expected_pdf
            }
        } else {
            expected_pdf
        };

        let output_size = fs::metadata(&final_path)?.len();

        Ok(DocumentOperationResult {
            success: true,
            output_path: final_path.to_string_lossy().to_string(),
            output_size_bytes: output_size,
            original_size_bytes: None,
            saved_percent: None,
            page_count: None,
            message: "Documento Word convertido para PDF com sucesso via LibreOffice.".to_string(),
        })
    }

    // ==========================================
    // PDF -> DOCX CONVERTER
    // ==========================================

    pub fn convert_pdf_to_docx(options: &PdfToDocxOptions) -> AppResult<DocumentOperationResult> {
        let source_path = Path::new(&options.source_path);
        if !source_path.exists() {
            return Err(AppError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Arquivo PDF não encontrado: {}", source_path.display()),
            )));
        }

        let doc = Document::load(source_path).map_err(|e| {
            AppError::Document(format!("Erro ao carregar PDF para conversão Word: {}", e))
        })?;

        if doc.is_encrypted() {
            return Err(AppError::Document(
                "O arquivo PDF está protegido por senha. Remova a proteção antes de converter para Word.".to_string(),
            ));
        }

        let pages_map = doc.get_pages();
        let mut sorted_pages: Vec<u32> = pages_map.keys().cloned().collect();
        sorted_pages.sort();

        let mut all_pages_text: Vec<(u32, Vec<String>)> = Vec::new();
        let mut total_chars = 0;

        for &p in &sorted_pages {
            let text = doc.extract_text(&[p]).unwrap_or_default();
            total_chars += text.trim().len();
            let paragraphs: Vec<String> = text
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            all_pages_text.push((p, paragraphs));
        }

        if total_chars == 0 {
            return Err(AppError::Document(
                "O documento PDF selecionado não contém texto selecionável (parece ser uma imagem ou documento digitalizado). Para converter digitalizações para texto editável, é necessário OCR.".to_string(),
            ));
        }

        // Determine destination path
        let target_path = match &options.target_path {
            Some(p) => PathBuf::from(p),
            None => {
                let parent = source_path.parent().unwrap_or_else(|| Path::new("."));
                let stem = source_path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy();
                parent.join(format!("{}.docx", stem))
            }
        };

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Build valid DOCX document using docx-rs
        let mut docx = Docx::new();

        for (page_num, paragraphs) in all_pages_text {
            if options.mode == "layout_preserve" && page_num > 1 {
                docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(format!("--- Página {} ---", page_num))));
            }

            for p in paragraphs {
                // Heuristic title detection (short uppercase or bold)
                if p.len() < 50 && p.chars().all(|c| c.is_uppercase() || !c.is_alphabetic()) {
                    docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(p).bold()));
                } else {
                    docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(p)));
                }
            }
        }

        let file = fs::File::create(&target_path)?;
        docx.build()
            .pack(file)
            .map_err(|e| AppError::Document(format!("Erro ao empacotar arquivo DOCX: {}", e)))?;

        let output_size = fs::metadata(&target_path)?.len();

        Ok(DocumentOperationResult {
            success: true,
            output_path: target_path.to_string_lossy().to_string(),
            output_size_bytes: output_size,
            original_size_bytes: None,
            saved_percent: None,
            page_count: Some(sorted_pages.len() as u32),
            message: format!(
                "PDF convertido para DOCX editável com sucesso ({} páginas processadas).",
                sorted_pages.len()
            ),
        })
    }
}

// ==========================================
// HELPERS
// ==========================================

fn parse_page_ranges(range_str: &str, max_pages: u32) -> AppResult<Vec<u32>> {
    let mut pages = Vec::new();
    let parts = range_str.split(',');

    for part in parts {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }

        if part.contains('-') {
            let bounds: Vec<&str> = part.split('-').collect();
            if bounds.len() != 2 {
                return Err(AppError::InvalidInput(format!(
                    "Intervalo de páginas malformado: '{}'",
                    part
                )));
            }
            let start: u32 = bounds[0]
                .trim()
                .parse()
                .map_err(|_| AppError::InvalidInput(format!("Número inválido: '{}'", bounds[0])))?;
            let end: u32 = bounds[1]
                .trim()
                .parse()
                .map_err(|_| AppError::InvalidInput(format!("Número inválido: '{}'", bounds[1])))?;

            if start < 1 || end > max_pages || start > end {
                return Err(AppError::InvalidInput(format!(
                    "Intervalo '{}-{}' inválido para documento de {} páginas.",
                    start, end, max_pages
                )));
            }

            for p in start..=end {
                pages.push(p);
            }
        } else {
            let p: u32 = part
                .parse()
                .map_err(|_| AppError::InvalidInput(format!("Número de página inválido: '{}'", part)))?;
            if p < 1 || p > max_pages {
                return Err(AppError::InvalidInput(format!(
                    "Página {} fora do intervalo válido (1-{}).",
                    p, max_pages
                )));
            }
            pages.push(p);
        }
    }

    if pages.is_empty() {
        return Err(AppError::InvalidInput(
            "Nenhuma página válida especificada no intervalo.".to_string(),
        ));
    }

    Ok(pages)
}

fn obj_to_f64(obj: &Object) -> Option<f64> {
    match obj {
        Object::Real(f) => Some(*f as f64),
        Object::Integer(i) => Some(*i as f64),
        _ => None,
    }
}

fn format_file_size(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}
