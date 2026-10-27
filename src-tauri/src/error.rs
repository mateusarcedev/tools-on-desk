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

    #[error("Tarefa '{0}' não encontrada")]
    TaskNotFound(String),

    #[error("Entrada inválida: {0}")]
    InvalidInput(String),

    #[error("Operação cancelada pelo usuário")]
    Canceled,

    #[error("Erro interno: {0}")]
    Internal(String),
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
