//! AgenMonster configuration types.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgenConfig {
    pub app_dir: PathBuf,
    pub api_keys: ApiKeysConfig,
    pub personality: PersonalityConfig,
    pub energy: EnergyConfig,
    pub sync: SyncConfig,
    pub marketplace: MarketplaceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeysConfig {
    pub anthropic: Option<String>,
    pub openai: Option<String>,
    pub gemini: Option<String>,
    pub fal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalityConfig {
    pub stage: String,
    pub mood: String,
    pub attention_rate: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyConfig {
    pub max: u32,
    pub regen_per_hour: f32,
    pub cost_per_llm: u32,
    pub cost_per_tool: u32,
    pub cost_per_evo: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub enabled: bool,
    pub port: u16,
    pub peers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceConfig {
    pub registry_url: String,
    pub auto_publish: bool,
}

impl Default for AgenConfig {
    fn default() -> Self {
        Self {
            app_dir: dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("agenmonster"),
            api_keys: ApiKeysConfig {
                anthropic: None,
                openai: None,
                gemini: None,
                fal: None,
            },
            personality: PersonalityConfig {
                stage: "egg".into(),
                mood: "idle".into(),
                attention_rate: 0.02,
            },
            energy: EnergyConfig {
                max: 1000,
                regen_per_hour: 25.0,
                cost_per_llm: 5,
                cost_per_tool: 1,
                cost_per_evo: 50,
            },
            sync: SyncConfig {
                enabled: false,
                port: 0,
                peers: vec![],
            },
            marketplace: MarketplaceConfig {
                registry_url: "https://registry.agenmonster.dev".into(),
                auto_publish: false,
            },
        }
    }
}
