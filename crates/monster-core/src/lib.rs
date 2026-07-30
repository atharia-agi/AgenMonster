//! Core crate — common types, errors, and utilities shared across all crates.

pub mod config;
pub mod error;
pub mod types;

pub use config::AgenConfig;
pub use error::AgenError;
pub use types::*;
