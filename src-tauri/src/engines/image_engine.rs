use crate::domain::{ImageConvertOptions, ImagesToPdfOptions};
use crate::error::{AppError, AppResult};
use image::{imageops::FilterType, GenericImageView};
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

pub struct ImageEngine;

#[derive(Debug, Clone)]
pub struct ImageConversionResult {
    pub output_path: String,
    pub original_size: u64,
    pub output_size: u64,
    pub width: u32,
    pub height: u32,
}

impl ImageEngine {
    pub fn convert_single(
        source_path: &str,
        target_path: &str,
        format: &str,
        quality: u8,
        target_w: Option<u32>,
        target_h: Option<u32>,
        preserve_ratio: bool,
    ) -> AppResult<ImageConversionResult> {
        let src_p = Path::new(source_path);
        if !src_p.exists() {
            return Err(AppError::InvalidInput(format!(
                "Imagem de origem não encontrada: {}",
                source_path
            )));
        }

        let orig_size = std::fs::metadata(src_p)?.len();
        let img = image::open(src_p)
            .map_err(|e| AppError::Image(format!("Falha ao abrir imagem {}: {}", source_path, e)))?;

        let (orig_w, orig_h) = img.dimensions();

        let final_img = if let Some(tw) = target_w {
            let (nw, nh) = if preserve_ratio {
                let ratio = orig_h as f64 / orig_w as f64;
                (tw, (tw as f64 * ratio).round().max(1.0) as u32)
            } else if let Some(th) = target_h {
                (tw, th)
            } else {
                (tw, orig_h)
            };
            img.resize_exact(nw, nh, FilterType::Lanczos3)
        } else if let Some(th) = target_h {
            let (nw, nh) = if preserve_ratio {
                let ratio = orig_w as f64 / orig_h as f64;
                ((th as f64 * ratio).round().max(1.0) as u32, th)
            } else {
                (orig_w, th)
            };
            img.resize_exact(nw, nh, FilterType::Lanczos3)
        } else {
            img
        };

        let (final_w, final_h) = final_img.dimensions();

        let tgt_p = Path::new(target_path);
        if let Some(parent) = tgt_p.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut out_file = File::create(tgt_p)?;

        let fmt_upper = format.to_uppercase();
        if fmt_upper == "JPG" || fmt_upper == "JPEG" {
            let rgb = final_img.to_rgb8();
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut out_file,
                quality.clamp(1, 100),
            );
            encoder
                .encode(
                    rgb.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgb8,
                )
                .map_err(|e| AppError::Image(format!("Falha ao codificar JPEG: {}", e)))?;
        } else {
            final_img
                .write_to(&mut out_file, image::ImageFormat::Png)
                .map_err(|e| AppError::Image(format!("Falha ao codificar PNG: {}", e)))?;
        }

        out_file.flush()?;
        let out_size = std::fs::metadata(tgt_p)?.len();

        Ok(ImageConversionResult {
            output_path: target_path.to_string(),
            original_size: orig_size,
            output_size: out_size,
            width: final_w,
            height: final_h,
        })
    }

    pub fn convert_batch<F>(
        options: &ImageConvertOptions,
        progress_cb: F,
    ) -> AppResult<Vec<ImageConversionResult>>
    where
        F: Fn(f64),
    {
        let total = options.files.len();
        if total == 0 {
            return Err(AppError::InvalidInput("Nenhum arquivo fornecido".into()));
        }

        let out_dir = Path::new(&options.output_folder);
        std::fs::create_dir_all(out_dir)?;

        let mut results = Vec::new();
        let ext = if options.format.to_uppercase() == "PNG" {
            "png"
        } else {
            "jpg"
        };

        for (i, file_path_str) in options.files.iter().enumerate() {
            let file_path = Path::new(file_path_str);
            let stem = file_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("imagem");

            let target_filename = format!("{}.{}", stem, ext);
            let mut target_path = out_dir.join(&target_filename);

            let mut counter = 1;
            while target_path.exists() && target_path.to_str() != Some(file_path_str) {
                target_path = out_dir.join(format!("{}_{}.{}", stem, counter, ext));
                counter += 1;
            }

            let res = Self::convert_single(
                file_path_str,
                target_path.to_str().unwrap_or(""),
                &options.format,
                options.quality,
                options.target_width,
                options.target_height,
                options.preserve_ratio,
            )?;

            results.push(res);
            let prog = (i + 1) as f64 / total as f64;
            progress_cb(prog);
        }

        Ok(results)
    }

    pub fn images_to_pdf<F>(
        options: &ImagesToPdfOptions,
        progress_cb: F,
    ) -> AppResult<String>
    where
        F: Fn(f64),
    {
        let total = options.files.len();
        if total == 0 {
            return Err(AppError::InvalidInput("Nenhum arquivo fornecido".into()));
        }

        let target_path = Path::new(&options.output_pdf);
        if let Some(parent) = target_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let file = File::create(target_path)?;
        let mut writer = CountingWriter::new(BufWriter::new(file));

        writer.write_bytes(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")?;

        let mm_to_pt = 72.0 / 25.4;
        let (default_pw_pt, default_ph_pt) = match options.page_size.as_str() {
            "Carta" => (8.5 * 72.0, 11.0 * 72.0),
            _ => (210.0 * mm_to_pt, 297.0 * mm_to_pt), // A4
        };

        let margin_pt = match options.margin.as_str() {
            "Nenhuma" => 0.0,
            "Grande" => 20.0 * mm_to_pt,
            _ => 10.0 * mm_to_pt, // Pequena
        };

        let mut page_object_ids: Vec<usize> = Vec::new();
        let mut object_offsets: Vec<usize> = Vec::new();
        let mut next_obj_id = 3;

        for (i, file_path_str) in options.files.iter().enumerate() {
            let prog = 0.05 + (i as f64 / total as f64) * 0.85;
            progress_cb(prog);

            let img = image::open(file_path_str).map_err(|e| {
                AppError::Image(format!("Falha ao abrir imagem {}: {}", file_path_str, e))
            })?;
            let (img_w, img_h) = img.dimensions();

            let (pw_pt, ph_pt) = if options.page_size == "Ajustar" {
                let w = img_w as f64 + 2.0 * margin_pt;
                let h = img_h as f64 + 2.0 * margin_pt;
                (w, h)
            } else {
                (default_pw_pt, default_ph_pt)
            };

            let printable_w = (pw_pt - 2.0 * margin_pt).max(10.0);
            let printable_h = (ph_pt - 2.0 * margin_pt).max(10.0);

            let scale_x = printable_w / img_w as f64;
            let scale_y = printable_h / img_h as f64;
            let scale = scale_x.min(scale_y);

            let disp_w = img_w as f64 * scale;
            let disp_h = img_h as f64 * scale;

            let pos_x = margin_pt + (printable_w - disp_w) / 2.0;
            let pos_y = margin_pt + (printable_h - disp_h) / 2.0;

            let mut jpeg_bytes = Vec::new();
            let mut cursor = Cursor::new(&mut jpeg_bytes);
            img.write_to(&mut cursor, image::ImageFormat::Jpeg)
                .map_err(|e| AppError::Image(format!("Falha ao codificar JPEG: {}", e)))?;

            let img_obj_id = next_obj_id;
            next_obj_id += 1;
            let content_obj_id = next_obj_id;
            next_obj_id += 1;
            let page_obj_id = next_obj_id;
            next_obj_id += 1;

            page_object_ids.push(page_obj_id);

            while object_offsets.len() < img_obj_id {
                object_offsets.push(0);
            }
            object_offsets[img_obj_id - 1] = writer.offset;

            let img_header = format!(
                "{} 0 obj\n<< /Type /XObject /Subtype /Image /Width {} /Height {} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {} >>\nstream\n",
                img_obj_id, img_w, img_h, jpeg_bytes.len()
            );
            writer.write_bytes(img_header.as_bytes())?;
            writer.write_bytes(&jpeg_bytes)?;
            writer.write_bytes(b"\nendstream\nendobj\n")?;

            let content_str = format!(
                "q\n{:.3} 0 0 {:.3} {:.3} {:.3} cm\n/Im{} Do\nQ\n",
                disp_w, disp_h, pos_x, pos_y, img_obj_id
            );

            while object_offsets.len() < content_obj_id {
                object_offsets.push(0);
            }
            object_offsets[content_obj_id - 1] = writer.offset;

            let content_header = format!(
                "{} 0 obj\n<< /Length {} >>\nstream\n{}\nendstream\nendobj\n",
                content_obj_id,
                content_str.len(),
                content_str
            );
            writer.write_bytes(content_header.as_bytes())?;

            while object_offsets.len() < page_obj_id {
                object_offsets.push(0);
            }
            object_offsets[page_obj_id - 1] = writer.offset;

            let page_obj = format!(
                "{} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {:.3} {:.3}] /Contents {} 0 R /Resources << /XObject << /Im{} {} 0 R >> >> >>\nendobj\n",
                page_obj_id, pw_pt, ph_pt, content_obj_id, img_obj_id, img_obj_id
            );
            writer.write_bytes(page_obj.as_bytes())?;
        }

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

        Ok(options.output_pdf.clone())
    }
}
