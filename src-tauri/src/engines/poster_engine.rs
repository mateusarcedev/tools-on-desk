use crate::domain::{PosterOptions, PosterSpec};
use crate::error::{AppError, AppResult};
use image::GenericImageView;
use std::fs::File;
use std::io::{BufWriter, Cursor, Write};
use std::path::Path;

struct CountingWriter<W> {
    inner: W,
    offset: usize,
}

impl<W: Write> CountingWriter<W> {
    fn new(inner: W) -> Self {
        Self { inner, offset: 0 }
    }

    fn write_bytes(&mut self, bytes: &[u8]) -> std::io::Result<()> {
        self.inner.write_all(bytes)?;
        self.offset += bytes.len();
        Ok(())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

pub struct PosterEngine;

impl PosterEngine {
    pub fn calculate_spec(options: &PosterOptions) -> AppResult<PosterSpec> {
        let path = Path::new(&options.source_path);
        if !path.exists() {
            return Err(AppError::InvalidInput(format!(
                "Imagem de origem não encontrada: {}",
                options.source_path
            )));
        }

        let img = image::open(path)
            .map_err(|e| AppError::Image(format!("Falha ao abrir imagem: {}", e)))?;
        let (img_w, img_h) = img.dimensions();
        if img_w == 0 || img_h == 0 {
            return Err(AppError::InvalidInput("Dimensões da imagem inválidas".into()));
        }

        let (mut pw, mut ph) = match options.paper.as_str() {
            "A3" => (297.0, 420.0),
            "Personalizado" => (
                options.custom_w_mm.unwrap_or(210.0).max(50.0),
                options.custom_h_mm.unwrap_or(297.0).max(50.0),
            ),
            _ => (210.0, 297.0), // Default A4
        };

        if options.orientation == "Paisagem" {
            std::mem::swap(&mut pw, &mut ph);
        }

        let m = options.margin_mm.max(0.0);
        let ov = options.overlap_mm.max(0.0).min((pw - 2.0 * m) / 3.0);
        let cw = (pw - 2.0 * m).max(10.0);
        let ch = (ph - 2.0 * m).max(10.0);
        let sw = (cw - ov).max(5.0);
        let sh = (ch - ov).max(5.0);

        let ar = img_w as f64 / img_h as f64;

        let (cols, total_w_mm) = if options.mode == "Por páginas" {
            let c = options.cols.clamp(1, 20);
            (c, c as f64 * sw + ov)
        } else {
            let target_w = (options.width_cm * 10.0).max(10.0);
            let c = (((target_w - ov) / sw).ceil() as u32).clamp(1, 30);
            (c, target_w)
        };

        let total_h_mm = total_w_mm / ar;
        let rows = (((total_h_mm - ov) / sh).ceil() as u32).clamp(1, 30);
        let pages = cols * rows;

        let dpi = (img_w as f64 / (total_w_mm / 25.4)).round() as u32;
        let low_dpi = dpi < 100;

        Ok(PosterSpec {
            paper_w_mm: pw,
            paper_h_mm: ph,
            total_w_cm: total_w_mm / 10.0,
            total_h_cm: total_h_mm / 10.0,
            cols,
            rows,
            pages,
            dpi,
            low_dpi,
            img_w,
            img_h,
        })
    }

    pub fn generate_pdf<F>(
        options: &PosterOptions,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64),
    {
        progress_cb(0.05);

        let path = Path::new(&options.source_path);
        if !path.exists() {
            return Err(AppError::InvalidInput(format!(
                "Arquivo não encontrado: {}",
                options.source_path
            )));
        }

        let mut img = image::open(path)
            .map_err(|e| AppError::Image(format!("Falha ao carregar imagem: {}", e)))?;

        progress_cb(0.15);

        if options.effect == "P&B" {
            img = img.grayscale();
        }

        let (img_w, img_h) = img.dimensions();

        let (mut pw_mm, mut ph_mm) = match options.paper.as_str() {
            "A3" => (297.0, 420.0),
            "Personalizado" => (
                options.custom_w_mm.unwrap_or(210.0).max(50.0),
                options.custom_h_mm.unwrap_or(297.0).max(50.0),
            ),
            _ => (210.0, 297.0),
        };

        if options.orientation == "Paisagem" {
            std::mem::swap(&mut pw_mm, &mut ph_mm);
        }

        let m_mm = options.margin_mm.max(0.0);
        let ov_mm = options.overlap_mm.max(0.0).min((pw_mm - 2.0 * m_mm) / 3.0);
        let cw_mm = (pw_mm - 2.0 * m_mm).max(10.0);
        let ch_mm = (ph_mm - 2.0 * m_mm).max(10.0);
        let sw_mm = (cw_mm - ov_mm).max(5.0);
        let sh_mm = (ch_mm - ov_mm).max(5.0);

        let ar = img_w as f64 / img_h as f64;

        let (cols, total_w_mm) = if options.mode == "Por páginas" {
            let c = options.cols.clamp(1, 20);
            (c, c as f64 * sw_mm + ov_mm)
        } else {
            let target_w = (options.width_cm * 10.0).max(10.0);
            let c = (((target_w - ov_mm) / sw_mm).ceil() as u32).clamp(1, 30);
            (c, target_w)
        };

        let total_h_mm = total_w_mm / ar;
        let rows = (((total_h_mm - ov_mm) / sh_mm).ceil() as u32).clamp(1, 30);
        let total_pages = cols * rows;

        let mm_to_pt = 72.0 / 25.4;
        let pw_pt = pw_mm * mm_to_pt;
        let ph_pt = ph_mm * mm_to_pt;
        let m_pt = m_mm * mm_to_pt;
        let cw_pt = cw_mm * mm_to_pt;
        let ch_pt = ch_mm * mm_to_pt;

        let target_path = Path::new(&options.target_pdf);
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let file = File::create(target_path)?;
        let mut writer = CountingWriter::new(BufWriter::new(file));

        let mut page_object_ids: Vec<usize> = Vec::new();
        let mut object_offsets: Vec<usize> = Vec::new();

        // PDF Header
        writer.write_bytes(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")?;

        let mut next_obj_id = 3; // 1: Catalog, 2: Pages tree
        let mut page_data = Vec::new();

        let mut current_page = 0;
        for r in 0..rows {
            for c in 0..cols {
                current_page += 1;
                let page_progress = 0.15 + (current_page as f64 / total_pages as f64) * 0.75;
                progress_cb(page_progress);

                let sheet_x_start = c as f64 * sw_mm;
                let sheet_x_end = sheet_x_start + cw_mm;
                let sheet_y_start = r as f64 * sh_mm;
                let sheet_y_end = sheet_y_start + ch_mm;

                let px_start_x = (((sheet_x_start / total_w_mm) * img_w as f64).round() as u32).min(img_w);
                let px_end_x = (((sheet_x_end / total_w_mm) * img_w as f64).round() as u32).min(img_w);
                let px_start_y = (((sheet_y_start / total_h_mm) * img_h as f64).round() as u32).min(img_h);
                let px_end_y = (((sheet_y_end / total_h_mm) * img_h as f64).round() as u32).min(img_h);

                let slice_w = (px_end_x.saturating_sub(px_start_x)).max(1);
                let slice_h = (px_end_y.saturating_sub(px_start_y)).max(1);

                let cropped = img.crop_imm(px_start_x, px_start_y, slice_w, slice_h);

                let mut jpeg_bytes = Vec::new();
                let mut cursor = Cursor::new(&mut jpeg_bytes);
                cropped
                    .write_to(&mut cursor, image::ImageFormat::Jpeg)
                    .map_err(|e| AppError::Image(format!("Falha ao codificar fatia JPEG: {}", e)))?;

                let page_label = format!("{}{}", (b'A' + (r % 26) as u8) as char, c + 1);

                let img_obj_id = next_obj_id;
                next_obj_id += 1;
                let content_obj_id = next_obj_id;
                next_obj_id += 1;
                let page_obj_id = next_obj_id;
                next_obj_id += 1;

                page_object_ids.push(page_obj_id);
                page_data.push((
                    page_obj_id,
                    content_obj_id,
                    img_obj_id,
                    slice_w,
                    slice_h,
                    jpeg_bytes,
                    page_label,
                ));
            }
        }

        let font_obj_id = next_obj_id;
        next_obj_id += 1;

        for (page_id, content_id, img_id, sw, sh, jpeg_data, label) in page_data {
            while object_offsets.len() < img_id {
                object_offsets.push(0);
            }
            object_offsets[img_id - 1] = writer.offset;

            let img_header = format!(
                "{} 0 obj\n<< /Type /XObject /Subtype /Image /Width {} /Height {} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {} >>\nstream\n",
                img_id, sw, sh, jpeg_data.len()
            );
            writer.write_bytes(img_header.as_bytes())?;
            writer.write_bytes(&jpeg_data)?;
            writer.write_bytes(b"\nendstream\nendobj\n")?;

            let mut stream_content = Vec::new();
            stream_content.extend_from_slice(
                format!(
                    "q\n{:.3} 0 0 {:.3} {:.3} {:.3} cm\n/Im{} Do\nQ\n",
                    cw_pt, ch_pt, m_pt, m_pt, img_id
                )
                .as_bytes(),
            );

            if options.crop_marks {
                let tick = (cw_pt * 0.05).clamp(8.0, 18.0);
                let x0 = m_pt;
                let y0 = m_pt;
                let x1 = m_pt + cw_pt;
                let y1 = m_pt + ch_pt;

                let marks = format!(
                    "0.5 w 0.2 G\n\
                    {:.3} {:.3} m {:.3} {:.3} l S\n{:.3} {:.3} m {:.3} {:.3} l S\n\
                    {:.3} {:.3} m {:.3} {:.3} l S\n{:.3} {:.3} m {:.3} {:.3} l S\n\
                    {:.3} {:.3} m {:.3} {:.3} l S\n{:.3} {:.3} m {:.3} {:.3} l S\n\
                    {:.3} {:.3} m {:.3} {:.3} l S\n{:.3} {:.3} m {:.3} {:.3} l S\n",
                    x0, y0, x0 + tick, y0,
                    x0, y0, x0, y0 + tick,
                    x0, y1, x0 + tick, y1,
                    x0, y1, x0, y1 - tick,
                    x1, y1, x1 - tick, y1,
                    x1, y1, x1, y1 - tick,
                    x1, y0, x1 - tick, y0,
                    x1, y0, x1, y0 + tick
                );
                stream_content.extend_from_slice(marks.as_bytes());
            }

            if options.page_numbers {
                let text_x = (pw_pt - m_pt - 30.0).max(m_pt);
                let text_y = (m_pt * 0.4).max(6.0);
                let num_str = format!(
                    "BT\n/F1 8 Tf\n0.35 G\n{:.3} {:.3} Td\n({}) Tj\nET\n",
                    text_x, text_y, label
                );
                stream_content.extend_from_slice(num_str.as_bytes());
            }

            while object_offsets.len() < content_id {
                object_offsets.push(0);
            }
            object_offsets[content_id - 1] = writer.offset;

            let content_header = format!(
                "{} 0 obj\n<< /Length {} >>\nstream\n",
                content_id,
                stream_content.len()
            );
            writer.write_bytes(content_header.as_bytes())?;
            writer.write_bytes(&stream_content)?;
            writer.write_bytes(b"\nendstream\nendobj\n")?;

            while object_offsets.len() < page_id {
                object_offsets.push(0);
            }
            object_offsets[page_id - 1] = writer.offset;

            let page_obj = format!(
                "{} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {:.3} {:.3}] /Contents {} 0 R /Resources << /XObject << /Im{} {} 0 R >> /Font << /F1 {} 0 R >> >> >>\nendobj\n",
                page_id, pw_pt, ph_pt, content_id, img_id, img_id, font_obj_id
            );
            writer.write_bytes(page_obj.as_bytes())?;
        }

        while object_offsets.len() < font_obj_id {
            object_offsets.push(0);
        }
        object_offsets[font_obj_id - 1] = writer.offset;

        let font_obj = format!(
            "{} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            font_obj_id
        );
        writer.write_bytes(font_obj.as_bytes())?;

        let catalog_offset = writer.offset;
        writer.write_bytes(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")?;

        let pages_offset = writer.offset;
        let mut kids = String::new();
        for id in &page_object_ids {
            kids.push_str(&format!("{} 0 R ", id));
        }
        let pages_obj = format!(
            "2 0 obj\n<< /Type /Pages /Kids [ {}] /Count {} >>\nendobj\n",
            kids,
            page_object_ids.len()
        );
        writer.write_bytes(pages_obj.as_bytes())?;

        let total_objs = next_obj_id - 1;
        let mut final_offsets = vec![0; total_objs];
        final_offsets[0] = catalog_offset;
        final_offsets[1] = pages_offset;
        for i in 2..total_objs {
            if i < object_offsets.len() {
                final_offsets[i] = object_offsets[i];
            }
        }

        let xref_offset = writer.offset;
        let xref_header = format!("xref\n0 {}\n0000000000 65535 f \n", total_objs + 1);
        writer.write_bytes(xref_header.as_bytes())?;

        for offset in final_offsets {
            let entry = format!("{:010} 00000 n \n", offset);
            writer.write_bytes(entry.as_bytes())?;
        }

        let trailer = format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            total_objs + 1,
            xref_offset
        );
        writer.write_bytes(trailer.as_bytes())?;

        writer.flush()?;
        progress_cb(1.0);

        Ok(options.target_pdf.clone())
    }
}
