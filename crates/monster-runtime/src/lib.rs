//! # monster-runtime
//!
//! The single entry point. Boots the entire AgenMonster system: bus,
//! memory, tools, agent loop, scheduler, telemetry, evolution, render.
//!
//! Core concept: the monster "eats" API tokens to survive and grow.
//! Every LLM call feeds it XP. XP drives evolution through 7 stages.
//! Stats scale with stage: energy, regen, skills, memory, mood complexity.
//!
//! Unique features:
//! - Hunger system: monster gets hungry if not fed (no API calls) for 30+ minutes
//! - Dream mode: idle monster generates creative text based on stage
//! - Personality drift: dominant task type affects mood and behavior
//! - Mood swings: mood changes based on hunger, activity, and stage

use std::path::PathBuf;

pub mod token_tracker;
pub mod monitor;
pub mod energy;
pub mod webhook;
pub mod webhook_handler;
pub mod computer_use;
pub mod vision_planner;
pub mod cutscene;
pub mod personality;
pub mod idle_engine;
pub mod render_state;
pub mod orchestrator;

pub use orchestrator::Runtime;
pub use monitor::Monitor;
pub use energy::EnergyEconomy;
pub use personality::personality_for_stage;
pub use idle_engine::IdleEngine;
pub use token_tracker::{TokenTracker, TokenUsage, stats_for_stage, xp_for_stage};

pub struct RuntimeConfig {
    pub app_dir: PathBuf,
    pub api_keys: ApiKeys,
}

#[derive(Default, Clone)]
pub struct ApiKeys {
    pub groq_keys: Vec<String>,
    pub mistral_keys: Vec<String>,
    pub anthropic: Option<String>,
    pub openai: Option<String>,
    pub gemini: Option<String>,
    pub tavily_key: Option<String>,
    pub brave_key: Option<String>,
}

impl ApiKeys {
    pub fn from_env() -> Self {
        let _ = dotenvy::dotenv();
        let mut groq_keys = Vec::new();
        if let Ok(key) = std::env::var("GROQ_API_KEY") {
            groq_keys.push(key);
        }
        for i in 0..=9 {
            let var = if i == 0 { "GROQ_API_KEY".to_string() } else { format!("GROQ_API_KEY_{i}") };
            if let Ok(key) = std::env::var(&var) {
                if !groq_keys.contains(&key) {
                    groq_keys.push(key);
                }
            }
        }

        let mut mistral_keys = Vec::new();
        for i in 1..=10 {
            let var = format!("MISTRAL_API_KEY_{i}");
            if let Ok(key) = std::env::var(&var) {
                mistral_keys.push(key);
            }
        }

        Self {
            groq_keys,
            mistral_keys,
            anthropic: std::env::var("ANTHROPIC_API_KEY").ok(),
            openai: std::env::var("OPENAI_API_KEY").ok(),
            gemini: std::env::var("GEMINI_API_KEY").ok(),
            tavily_key: std::env::var("TAVILY_API_KEY").ok(),
            brave_key: std::env::var("BRAVE_API_KEY").ok(),
        }
    }

    pub fn has_any_llm(&self) -> bool {
        !self.groq_keys.is_empty() || !self.mistral_keys.is_empty() ||
        self.anthropic.is_some() || self.openai.is_some() || self.gemini.is_some()
    }

    pub fn has_any_search(&self) -> bool {
        self.tavily_key.is_some() || self.brave_key.is_some()
    }
}
