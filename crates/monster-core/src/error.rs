//! AgenMonster error types.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgenError {
    #[error("bus error: {0}")]
    Bus(String),

    #[error("memory error: {0}")]
    Memory(String),

    #[error("LLM error: {0}")]
    Llm(String),

    #[error("tool error: {0}")]
    Tool(String),

    #[error("evolution error: {0}")]
    Evolution(String),

    #[error("render error: {0}")]
    Render(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("SQL error: {0}")]
    Sql(#[from] rusqlite::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("other: {0}")]
    Other(String),
}

impl From<anyhow::Error> for AgenError {
    fn from(e: anyhow::Error) -> Self {
        AgenError::Other(e.to_string())
    }
}
