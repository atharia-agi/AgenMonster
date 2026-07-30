//! # monster-evolve
//!
//! Self-evolution subsystem — skill library, pet evolution, auto-MCP.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub trigger: String,
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub body: String,
    pub strength: f32,
    pub composed_of: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub usage_count: u32,
    pub success_count: u32,
}

pub struct SkillLibrary;

impl SkillLibrary {
    pub fn open(_path: &str) -> anyhow::Result<Self> {
        Ok(Self)
    }
    pub async fn upsert(&self, _skill: Skill) -> anyhow::Result<()> {
        Ok(())
    }
    pub fn search(&self, _query: &str) -> Vec<SkillHit> {
        vec![]
    }
    pub fn count(&self) -> usize {
        0
    }
}

#[derive(Debug, Clone)]
pub struct SkillHit {
    pub id: String,
    pub score: f32,
}

pub struct SkillStrength;

pub struct StageManager;

impl StageManager {
    pub fn new() -> Self {
        Self
    }
}

impl Default for StageManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillProposal {
    pub id: String,
    pub title: String,
    pub description: String,
    pub trigger_examples: Vec<String>,
    pub body: String,
    pub embedded_rust: Option<String>,
}

pub struct SkillAuthoring;

impl SkillAuthoring {
    pub async fn write_to_disk(
        _proposal: &SkillProposal,
        _dir: &std::path::Path,
    ) -> anyhow::Result<()> {
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SkillAuthoringError {
    #[error("validation failed")]
    ValidationFailed,
}

pub struct SkillLoader;

#[derive(Debug, Clone)]
pub struct ParsedSkill {
    pub id: String,
    pub body: String,
}

pub struct SkillBundle {
    pub body_markdown: String,
}

pub struct SkillManifest;

pub struct SkillHub;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvolutionPolicy;

impl Default for EvolutionPolicy {
    fn default() -> Self {
        Self
    }
}

#[derive(Debug, Clone)]
pub enum EvolutionEvent {
    SkillLearned { skill_id: String },
    StageUpgraded { from: String, to: String },
}
