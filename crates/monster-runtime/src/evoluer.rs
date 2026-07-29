//! Autonomous evolver — runs once per day to formalize learned patterns
//! into new skills.
//!
//! TODO: Implement real skill evolution with LLM.

use std::path::PathBuf;

pub struct EvoluerLoop;

impl EvoluerLoop {
    pub fn new() -> Self { Self }

    pub async fn run_once(&self) -> anyhow::Result<usize> {
        tracing::info!("Evolver loop running (stub mode)");
        Ok(0)
    }
}

pub fn discover_skill_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    let mut p = PathBuf::from(home);
    p.push(".config");
    p.push("agenmonster");
    p.push("skills");
    p
}
