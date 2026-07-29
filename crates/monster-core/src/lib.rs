//! Core crate — common types, errors, and utilities shared across all crates.

pub mod error;
pub mod config;
pub mod types;

pub use error::AgenError;
pub use config::AgenConfig;
pub use types::*;
