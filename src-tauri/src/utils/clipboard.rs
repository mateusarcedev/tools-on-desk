use crate::error::{AppError, AppResult};

pub fn copy_text_to_system_clipboard(text: &str) -> AppResult<()> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| AppError::Clipboard(format!("Falha ao inicializar área de transferência nativa: {}", e)))?;
    clipboard
        .set_text(text)
        .map_err(|e| AppError::Clipboard(format!("Falha ao copiar texto para a área de transferência: {}", e)))?;
    Ok(())
}
