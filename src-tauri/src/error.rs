use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Erro de E/S: {0}")]
    Io(#[from] std::io::Error),

    #[error("Erro no banco de dados SQLite: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Erro no processamento de imagem: {0}")]
    Image(String),

    #[error("Erro no processamento de documentos: {0}")]
    Document(String),

    #[error("Erro de área de transferência: {0}")]
    Clipboard(String),

    #[error("Erro no gerenciamento de dependências: {0}")]
    Dependency(String),

    #[error("Tarefa '{0}' não encontrada")]
    TaskNotFound(String),

    #[error("Entrada inválida: {0}")]
    InvalidInput(String),

    #[error("Operação cancelada pelo usuário")]
    Canceled,

    #[error("Erro interno: {0}")]
    Internal(String),
}

impl AppError {
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::Io(_) => "IO_ERROR",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Image(_) => "IMAGE_PROCESSING_FAILED",
            AppError::Document(msg) => {
                if msg.contains("protegido") || msg.contains("encrypted") || msg.contains("senha") {
                    "DOCUMENT_ENCRYPTED"
                } else if msg.contains("LibreOffice") {
                    "LIBREOFFICE_NOT_FOUND"
                } else if msg.contains("corrompido") || msg.contains("malformado") {
                    "DOCUMENT_CORRUPTED"
                } else if msg.contains("OCR") {
                    "PDF_SCANNED_REQUIRES_OCR"
                } else {
                    "DOCUMENT_PROCESSING_FAILED"
                }
            }
            AppError::Clipboard(_) => "CLIPBOARD_ERROR",
            AppError::Dependency(msg) => {
                if msg.contains("não encontrada") || msg.contains("not found") {
                    "DEPENDENCY_NOT_FOUND"
                } else if msg.contains("hash") || msg.contains("integridade") || msg.contains("checksum") {
                    "DEPENDENCY_HASH_MISMATCH"
                } else if msg.contains("download") || msg.contains("baixar") {
                    "DEPENDENCY_DOWNLOAD_FAILED"
                } else if msg.contains("permissão") || msg.contains("permission") {
                    "DEPENDENCY_PERMISSION_DENIED"
                } else if msg.contains("versão") || msg.contains("incompatível") {
                    "DEPENDENCY_VERSION_UNSUPPORTED"
                } else if msg.contains("validação") || msg.contains("validar") {
                    "DEPENDENCY_VALIDATION_FAILED"
                } else if msg.contains("atualização") || msg.contains("update") {
                    "DEPENDENCY_UPDATE_FAILED"
                } else if msg.contains("rollback") {
                    "DEPENDENCY_ROLLBACK_FAILED"
                } else {
                    "DEPENDENCY_INSTALL_FAILED"
                }
            }
            AppError::TaskNotFound(_) => "TASK_NOT_FOUND",
            AppError::InvalidInput(msg) => {
                if msg.contains("SSRF") || msg.contains("local") || msg.contains("privad") {
                    "SSRF_SECURITY_BLOCK"
                } else {
                    "INVALID_INPUT"
                }
            }
            AppError::Canceled => "OPERATION_CANCELED",
            AppError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn user_friendly_message(&self) -> String {
        match self {
            AppError::Document(msg) => msg.clone(),
            AppError::Dependency(msg) => msg.clone(),
            AppError::InvalidInput(msg) => msg.clone(),
            AppError::Canceled => "A operação foi cancelada antes da conclusão.".to_string(),
            AppError::TaskNotFound(id) => format!("A tarefa '{}' não foi localizada no sistema.", id),
            AppError::Io(e) => format!("Não foi possível acessar o arquivo no disco: {}", e),
            AppError::Database(e) => format!("Falha de acesso ao banco de dados local: {}", e),
            AppError::Clipboard(e) => format!("Não foi possível acessar a área de transferência: {}", e),
            AppError::Image(e) => format!("Falha ao processar imagem: {}", e),
            AppError::Internal(e) => format!("Ocorreu um erro interno: {}", e),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
