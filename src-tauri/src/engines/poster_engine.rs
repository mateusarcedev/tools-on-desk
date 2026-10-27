use crate::domain::{PosterOptions, PosterSpec};
use crate::error::{AppError, AppResult};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use image::{DynamicImage, GenericImageView, ImageFormat, Rgb, RgbImage};
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
    pub fn parse_paper_dimensions(paper: &str, custom_w: Option<f64>, custom_h: Option<f64>) -> (f64, f64) {
        match paper {
            "A3" => (297.0, 420.0),
            "Letter" => (215.9, 279.4),
            "Legal" => (215.9, 355.6),
            "Personalizado" => (
                custom_w.unwrap_or(210.0).max(50.0),
                custom_h.unwrap_or(297.0).max(50.0),
            ),
            _ => (210.0, 297.0), // A4 default
        }
    }

    pub fn calculate_spec(options: &PosterOptions) -> AppResult<PosterSpec> {
        let path = Path::new(&options.source_path);
        if !path.exists() {
            return Err(AppError::InvalidInput(format!(
                "Imagem de origem não encontrada: {}",
                options.source_path
            )));
        }

        let mut img = image::open(path)
            .map_err(|e| AppError::Image(format!("Falha ao abrir imagem: {}", e)))?;

        if let Some(deg) = options.rotate_deg {
            img = match deg % 360 {
                90 => img.rotate90(),
                180 => img.rotate180(),
                270 => img.rotate270(),
                _ => img,
            };
        }

        let (img_w, img_h) = img.dimensions();
        if img_w == 0 || img_h == 0 {
            return Err(AppError::InvalidInput("Dimensões da imagem inválidas".into()));
        }

        let (mut pw, mut ph) = Self::parse_paper_dimensions(
            &options.paper,
            options.custom_w_mm,
            options.custom_h_mm,
        );

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
            let c = options.cols.clamp(1, 30);
            (c, c as f64 * sw + ov)
        } else {
            let target_w = (options.width_cm * 10.0).max(10.0);
            let c = (((target_w - ov) / sw).ceil() as u32).clamp(1, 40);
            (c, target_w)
        };

        let total_h_mm = total_w_mm / ar;
        let rows = (((total_h_mm - ov) / sh).ceil() as u32).clamp(1, 40);
        let pages = cols * rows;

        let dpi = (img_w as f64 / (total_w_mm / 25.4)).round() as u32;
        let low_dpi = dpi < 100;
        let human_scale_ratio = if total_h_mm > 0.0 { 1800.0 / total_h_mm } else { 1.0 };

        Ok(PosterSpec {
            paper_w_mm: pw,
            paper_h_mm: ph,
            useful_w_mm: cw,
            useful_h_mm: ch,
            total_w_cm: total_w_mm / 10.0,
            total_h_cm: total_h_mm / 10.0,
            cols,
            rows,
            pages,
            dpi,
            low_dpi,
            img_w,
            img_h,
            human_scale_ratio,
        })
    }

    pub fn parse_hex(hex_str: Option<&str>, default: (u8, u8, u8)) -> (u8, u8, u8) {
        let s = match hex_str {
            Some(h) => h.trim().trim_start_matches('#'),
            None => return default,
        };
        if s.len() == 6 {
            if let Ok(val) = u32::from_str_radix(s, 16) {
                return (
                    ((val >> 16) & 0xFF) as u8,
                    ((val >> 8) & 0xFF) as u8,
                    (val & 0xFF) as u8,
                );
            }
        }
        default
    }

    pub fn apply_artistic_effect(
        img: &DynamicImage,
        options: &PosterOptions,
        target_w: u32,
        target_h: u32,
    ) -> DynamicImage {
        let effect = options.effect.as_str();
        let dot_color = Self::parse_hex(options.dot_color.as_deref(), (15, 23, 42)); // default slate-900
        let bg_color = Self::parse_hex(options.bg_color.as_deref(), (255, 255, 255)); // default white
        let is_square = options.dot_shape.as_deref() == Some("square");
        let invert = options.invert.unwrap_or(false);
        let contrast = options.contrast.unwrap_or(0.0).clamp(-100.0, 100.0);
        let brightness = options.brightness.unwrap_or(0.0).clamp(-100.0, 100.0);

        let contrast_factor = (259.0 * (contrast as f32 + 255.0)) / (255.0 * (259.0 - contrast as f32));
        let brightness_offset = brightness as f32 * 2.55;

        match effect {
            "Original" => {
                let rgb = img.to_rgb8();
                if contrast != 0.0 || brightness != 0.0 {
                    let mut adjusted = RgbImage::new(rgb.width(), rgb.height());
                    for (x, y, pixel) in rgb.enumerate_pixels() {
                        let r = ((contrast_factor * (pixel[0] as f32 - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                        let g = ((contrast_factor * (pixel[1] as f32 - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                        let b = ((contrast_factor * (pixel[2] as f32 - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                        adjusted.put_pixel(x, y, Rgb([r, g, b]));
                    }
                    DynamicImage::ImageRgb8(adjusted)
                } else {
                    DynamicImage::ImageRgb8(rgb)
                }
            }
            "P&B" => {
                let gray = img.to_luma8();
                let mut adjusted = RgbImage::new(gray.width(), gray.height());
                for (x, y, pixel) in gray.enumerate_pixels() {
                    let val = ((contrast_factor * (pixel[0] as f32 - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                    adjusted.put_pixel(x, y, Rgb([val, val, val]));
                }
                DynamicImage::ImageRgb8(adjusted)
            }
            "HighContrast" => {
                let gray = img.to_luma8();
                let mut out = RgbImage::new(gray.width(), gray.height());
                for (x, y, pixel) in gray.enumerate_pixels() {
                    let mut lum = pixel[0] as f32;
                    lum = ((contrast_factor * (lum - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0);
                    let is_dot = if invert { lum >= 128.0 } else { lum < 128.0 };
                    let c = if is_dot { dot_color } else { bg_color };
                    out.put_pixel(x, y, Rgb([c.0, c.1, c.2]));
                }
                DynamicImage::ImageRgb8(out)
            }
            "FloydSteinberg" => {
                let gray = img.to_luma8();
                let w = gray.width() as usize;
                let h = gray.height() as usize;
                let mut buffer: Vec<f32> = gray.pixels().map(|p| p[0] as f32 / 255.0).collect();

                let mut out = RgbImage::new(w as u32, h as u32);
                for y in 0..h {
                    for x in 0..w {
                        let idx = y * w + x;
                        let old_val = buffer[idx];
                        let new_val = if old_val >= 0.5 { 1.0 } else { 0.0 };
                        let is_dot = if invert { new_val > 0.5 } else { new_val < 0.5 };
                        let c = if is_dot { dot_color } else { bg_color };
                        out.put_pixel(x as u32, y as u32, Rgb([c.0, c.1, c.2]));

                        let err = old_val - new_val;
                        if x + 1 < w {
                            buffer[idx + 1] += err * (7.0 / 16.0);
                        }
                        if y + 1 < h {
                            if x > 0 {
                                buffer[(y + 1) * w + (x - 1)] += err * (3.0 / 16.0);
                            }
                            buffer[(y + 1) * w + x] += err * (5.0 / 16.0);
                            if x + 1 < w {
                                buffer[(y + 1) * w + (x + 1)] += err * (1.0 / 16.0);
                            }
                        }
                    }
                }
                DynamicImage::ImageRgb8(out)
            }
            "HalftoneMono" | "HalftoneColor" => {
                let is_color = effect == "HalftoneColor";
                let pitch_mm = options.dot_pitch_mm.unwrap_or(4.0).clamp(1.5, 20.0);
                let (src_w, src_h) = img.dimensions();

                let grid_cols = ((target_w as f64 / (pitch_mm * 3.7795)).round() as u32).clamp(10, 240);
                let grid_rows = (((grid_cols as f64 * src_h as f64) / src_w as f64).round() as u32).clamp(10, 240);

                let cell_w = target_w as f64 / grid_cols as f64;
                let cell_h = target_h as f64 / grid_rows as f64;
                let max_radius = (cell_w.min(cell_h) / 2.0) * options.max_dot_size.unwrap_or(0.95).clamp(0.1, 1.0);
                let min_radius = (cell_w.min(cell_h) / 2.0) * options.min_dot_size.unwrap_or(0.05).clamp(0.0, 0.5);

                let mut out = RgbImage::new(target_w, target_h);
                // Fill background
                for pixel in out.pixels_mut() {
                    *pixel = Rgb([bg_color.0, bg_color.1, bg_color.2]);
                }

                let src_rgb = img.to_rgb8();

                for gy in 0..grid_rows {
                    for gx in 0..grid_cols {
                        let cx = (gx as f64 + 0.5) * cell_w;
                        let cy = (gy as f64 + 0.5) * cell_h;

                        // Sample source image in this grid cell
                        let src_x_start = ((gx as f64 / grid_cols as f64) * src_w as f64).floor() as u32;
                        let src_x_end = (((gx + 1) as f64 / grid_cols as f64) * src_w as f64).ceil().min(src_w as f64) as u32;
                        let src_y_start = ((gy as f64 / grid_rows as f64) * src_h as f64).floor() as u32;
                        let src_y_end = (((gy + 1) as f64 / grid_rows as f64) * src_h as f64).ceil().min(src_h as f64) as u32;

                        let mut sum_r = 0u64;
                        let mut sum_g = 0u64;
                        let mut sum_b = 0u64;
                        let mut count = 0u64;

                        for sy in src_y_start..src_y_end.max(src_y_start + 1) {
                            for sx in src_x_start..src_x_end.max(src_x_start + 1) {
                                if sx < src_w && sy < src_h {
                                    let p = src_rgb.get_pixel(sx, sy);
                                    sum_r += p[0] as u64;
                                    sum_g += p[1] as u64;
                                    sum_b += p[2] as u64;
                                    count += 1;
                                }
                            }
                        }

                        if count == 0 {
                            continue;
                        }

                        let avg_r = (sum_r / count) as f32;
                        let avg_g = (sum_g / count) as f32;
                        let avg_b = (sum_b / count) as f32;

                        let mut lum = (0.2126 * avg_r + 0.7152 * avg_g + 0.0722 * avg_b) / 255.0;
                        lum = ((contrast_factor * (lum - 0.5) + 0.5) + (brightness_offset / 255.0)).clamp(0.0, 1.0);

                        let darkness = if invert { lum } else { 1.0 - lum };
                        let radius = min_radius + (max_radius - min_radius) * (darkness as f64);

                        if radius < 0.5 {
                            continue;
                        }

                        let active_dot_color = if is_color {
                            let r = ((contrast_factor * (avg_r - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                            let g = ((contrast_factor * (avg_g - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                            let b = ((contrast_factor * (avg_b - 128.0) + 128.0) + brightness_offset).clamp(0.0, 255.0) as u8;
                            (r, g, b)
                        } else {
                            dot_color
                        };

                        if is_square {
                            let half = radius;
                            let min_x = (cx - half).floor().max(0.0) as u32;
                            let max_x = (cx + half).ceil().min(target_w as f64 - 1.0) as u32;
                            let min_y = (cy - half).floor().max(0.0) as u32;
                            let max_y = (cy + half).ceil().min(target_h as f64 - 1.0) as u32;

                            for py in min_y..=max_y {
                                for px in min_x..=max_x {
                                    out.put_pixel(px, py, Rgb([active_dot_color.0, active_dot_color.1, active_dot_color.2]));
                                }
                            }
                        } else {
                            let r_ceil = radius.ceil() as i32;
                            let min_x = ((cx as i32) - r_ceil).max(0) as u32;
                            let max_x = ((cx as i32) + r_ceil).min(target_w as i32 - 1) as u32;
                            let min_y = ((cy as i32) - r_ceil).max(0) as u32;
                            let max_y = ((cy as i32) + r_ceil).min(target_h as i32 - 1) as u32;

                            let r_sq = radius * radius;
                            let r_inner_sq = (radius - 0.75).max(0.0).powi(2);

                            for py in min_y..=max_y {
                                for px in min_x..=max_x {
                                    let dx = px as f64 - cx;
                                    let dy = py as f64 - cy;
                                    let dist_sq = dx * dx + dy * dy;

                                    if dist_sq <= r_inner_sq {
                                        out.put_pixel(px, py, Rgb([active_dot_color.0, active_dot_color.1, active_dot_color.2]));
                                    } else if dist_sq <= r_sq {
                                        // Anti-aliased boundary blend
                                        let dist = dist_sq.sqrt();
                                        let blend = (radius + 0.75 - dist).clamp(0.0, 1.0);
                                        let bg = bg_color;
                                        let r = (active_dot_color.0 as f64 * blend + bg.0 as f64 * (1.0 - blend)) as u8;
                                        let g = (active_dot_color.1 as f64 * blend + bg.1 as f64 * (1.0 - blend)) as u8;
                                        let b = (active_dot_color.2 as f64 * blend + bg.2 as f64 * (1.0 - blend)) as u8;
                                        out.put_pixel(px, py, Rgb([r, g, b]));
                                    }
                                }
                            }
                        }
                    }
                }
                DynamicImage::ImageRgb8(out)
            }
            _ => DynamicImage::ImageRgb8(img.to_rgb8()),
        }
    }

    pub fn generate_preview(options: &PosterOptions) -> AppResult<String> {
        let path = Path::new(&options.source_path);
        if !path.exists() {
            return Err(AppError::InvalidInput(format!(
                "Imagem não encontrada: {}",
                options.source_path
            )));
        }

        let mut img = image::open(path)
            .map_err(|e| AppError::Image(format!("Falha ao carregar imagem: {}", e)))?;

        if let Some(deg) = options.rotate_deg {
            img = match deg % 360 {
                90 => img.rotate90(),
                180 => img.rotate180(),
                270 => img.rotate270(),
                _ => img,
            };
        }

        let (src_w, src_h) = img.dimensions();
        let max_dim = 700u32;
        let (thumb_w, thumb_h) = if src_w > src_h {
            (max_dim, ((max_dim as f64 * src_h as f64) / src_w as f64).round() as u32)
        } else {
            (((max_dim as f64 * src_w as f64) / src_h as f64).round() as u32, max_dim)
        };

        let downscaled = img.resize(thumb_w, thumb_h, image::imageops::FilterType::Triangle);
        let processed = Self::apply_artistic_effect(&downscaled, options, thumb_w, thumb_h);

        let mut jpeg_buf = Vec::new();
        let mut cursor = Cursor::new(&mut jpeg_buf);
        processed
            .write_to(&mut cursor, ImageFormat::Jpeg)
            .map_err(|e| AppError::Image(format!("Falha ao codificar prévia: {}", e)))?;

        let b64 = BASE64_STANDARD.encode(&jpeg_buf);
        Ok(format!("data:image/jpeg;base64,{}", b64))
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

        let mut raw_img = image::open(path)
            .map_err(|e| AppError::Image(format!("Falha ao carregar imagem: {}", e)))?;

        if let Some(deg) = options.rotate_deg {
            raw_img = match deg % 360 {
                90 => raw_img.rotate90(),
                180 => raw_img.rotate180(),
                270 => raw_img.rotate270(),
                _ => raw_img,
            };
        }

        progress_cb(0.12);

        let (mut pw_mm, mut ph_mm) = Self::parse_paper_dimensions(
            &options.paper,
            options.custom_w_mm,
            options.custom_h_mm,
        );

        if options.orientation == "Paisagem" {
            std::mem::swap(&mut pw_mm, &mut ph_mm);
        }

        let m_mm = options.margin_mm.max(0.0);
        let ov_mm = options.overlap_mm.max(0.0).min((pw_mm - 2.0 * m_mm) / 3.0);
        let cw_mm = (pw_mm - 2.0 * m_mm).max(10.0);
        let ch_mm = (ph_mm - 2.0 * m_mm).max(10.0);
        let sw_mm = (cw_mm - ov_mm).max(5.0);
        let sh_mm = (ch_mm - ov_mm).max(5.0);

        let (src_w, src_h) = raw_img.dimensions();
        let ar = src_w as f64 / src_h as f64;

        let (cols, total_w_mm) = if options.mode == "Por páginas" {
            let c = options.cols.clamp(1, 30);
            (c, c as f64 * sw_mm + ov_mm)
        } else {
            let target_w = (options.width_cm * 10.0).max(10.0);
            let c = (((target_w - ov_mm) / sw_mm).ceil() as u32).clamp(1, 40);
            (c, target_w)
        };

        let total_h_mm = total_w_mm / ar;
        let rows = (((total_h_mm - ov_mm) / sh_mm).ceil() as u32).clamp(1, 40);
        let total_pages = cols * rows;

        // Apply artistic styling to source image
        let processed_img = if options.effect == "Original" {
            raw_img
        } else {
            // Render at high resolution based on target dimensions (capped for memory efficiency)
            let max_target_dim = 3600u32;
            let (render_w, render_h) = if src_w >= src_h {
                (max_target_dim, ((max_target_dim as f64 * src_h as f64) / src_w as f64).round() as u32)
            } else {
                (((max_target_dim as f64 * src_w as f64) / src_h as f64).round() as u32, max_target_dim)
            };
            Self::apply_artistic_effect(&raw_img, options, render_w, render_h)
        };

        let (img_w, img_h) = processed_img.dimensions();

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

        let mut next_obj_id = 3;
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

                let cropped = processed_img.crop_imm(px_start_x, px_start_y, slice_w, slice_h);

                let mut jpeg_bytes = Vec::new();
                let mut cursor = Cursor::new(&mut jpeg_bytes);
                cropped
                    .write_to(&mut cursor, ImageFormat::Jpeg)
                    .map_err(|e| AppError::Image(format!("Falha ao codificar fatia JPEG: {}", e)))?;

                let page_label = format!("{} (Linha {}, Coluna {})", current_page, r + 1, c + 1);

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
                let text_x = m_pt;
                let text_y = (m_pt * 0.35).max(6.0);
                let num_str = format!(
                    "BT\n/F1 7 Tf\n0.3 G\n{:.3} {:.3} Td\n(Folha {} de {} - Arce Tools Poster Studio) Tj\nET\n",
                    text_x, text_y, label, total_pages
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
