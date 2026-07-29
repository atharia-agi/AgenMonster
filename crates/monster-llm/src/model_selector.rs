//! Model selector — auto-detects providers from API keys, picks best model per task.
//!
//! Task types: "chat", "code", "creative", "vision", "fast", "summarize"
//! Each provider + model has a capability profile. Selector picks the optimal one.

use std::sync::{Arc, RwLock};

/// Supported LLM providers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Provider {
    Groq,
    Mistral,
    Anthropic,
    OpenAI,
    Gemini,
    Ollama,
}

impl Provider {
    pub fn as_str(&self) -> &'static str {
        match self {
            Provider::Groq => "groq",
            Provider::Mistral => "mistral",
            Provider::Anthropic => "anthropic",
            Provider::OpenAI => "openai",
            Provider::Gemini => "gemini",
            Provider::Ollama => "ollama",
        }
    }

    pub fn all() -> &'static [Provider] {
        &[
            Provider::Groq, Provider::Mistral, Provider::Anthropic,
            Provider::OpenAI, Provider::Gemini, Provider::Ollama,
        ]
    }
}

/// A model available on a provider.
#[derive(Debug, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub provider: Provider,
    pub display_name: String,
    pub context_window: u32,
    pub max_output: u32,
    pub cost_per_1k_input: f64,
    pub cost_per_1k_output: f64,
    pub supports_streaming: bool,
    pub supports_vision: bool,
    pub supports_tools: bool,
    pub speed_tier: SpeedTier,
    pub quality_tier: QualityTier,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SpeedTier {
    UltraFast, // < 500ms
    Fast,      // < 2s
    Medium,    // < 5s
    Slow,      // > 5s
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum QualityTier {
    Flagship,  // best available
    Strong,    // very capable
    Standard,  // good enough
    Lightweight, // fast + cheap
}

/// Task type for model selection.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TaskType {
    Chat,
    Code,
    Creative,
    Vision,
    Fast,
    Summarize,
    Analyze,
}

impl TaskType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskType::Chat => "chat",
            TaskType::Code => "code",
            TaskType::Creative => "creative",
            TaskType::Vision => "vision",
            TaskType::Fast => "fast",
            TaskType::Summarize => "summarize",
            TaskType::Analyze => "analyze",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "code" => TaskType::Code,
            "creative" => TaskType::Creative,
            "vision" => TaskType::Vision,
            "fast" => TaskType::Fast,
            "summarize" => TaskType::Summarize,
            "analyze" => TaskType::Analyze,
            _ => TaskType::Chat,
        }
    }
}

/// Detected provider status.
#[derive(Debug, Clone)]
pub struct ProviderStatus {
    pub provider: Provider,
    pub available: bool,
    pub key_count: usize,
    pub models: Vec<String>,
}

/// Selection result — the chosen model + reasoning.
#[derive(Debug, Clone)]
pub struct Selection {
    pub model: String,
    pub provider: Provider,
    pub model_info: ModelInfo,
    pub reason: String,
}

/// The model selector — detects available providers and selects optimal models.
pub struct ModelSelector {
    models: Vec<ModelInfo>,
    available_providers: Arc<RwLock<Vec<ProviderStatus>>>,
}

impl ModelSelector {
    /// Create a new selector, auto-detecting from the given keys.
    pub fn detect(
        groq_keys: &[String],
        mistral_keys: &[String],
        anthropic_key: &Option<String>,
        openai_key: &Option<String>,
        gemini_key: &Option<String>,
    ) -> Self {
        let models = Self::build_model_catalog();
        let selector = Self {
            models,
            available_providers: Arc::new(RwLock::new(Vec::new())),
        };
        selector.update_availability(
            groq_keys, mistral_keys, anthropic_key, openai_key, gemini_key,
        );
        selector
    }

    /// Re-detect available providers (call when keys change at runtime).
    pub fn update_availability(
        &self,
        groq_keys: &[String],
        mistral_keys: &[String],
        anthropic_key: &Option<String>,
        openai_key: &Option<String>,
        gemini_key: &Option<String>,
    ) {
        let mut statuses = Vec::new();
        for &provider in Provider::all() {
            let (available, key_count) = match provider {
                Provider::Groq => (!groq_keys.is_empty(), groq_keys.len()),
                Provider::Mistral => (!mistral_keys.is_empty(), mistral_keys.len()),
                Provider::Anthropic => (anthropic_key.is_some(), if anthropic_key.is_some() { 1 } else { 0 }),
                Provider::OpenAI => (openai_key.is_some(), if openai_key.is_some() { 1 } else { 0 }),
                Provider::Gemini => (gemini_key.is_some(), if gemini_key.is_some() { 1 } else { 0 }),
                Provider::Ollama => (false, 0), // detected separately
            };
            let models: Vec<String> = self.models.iter()
                .filter(|m| m.provider == provider)
                .map(|m| m.id.clone())
                .collect();
            statuses.push(ProviderStatus { provider, available, key_count, models });
        }
        *self.available_providers.write().unwrap() = statuses;
    }

    /// Select the best model for a task type.
    pub fn select(&self, task: TaskType) -> Option<Selection> {
        let candidates: Vec<&ModelInfo> = self.models.iter()
            .filter(|m| self.is_provider_available(m.provider))
            .filter(|m| {
                // For vision tasks, only select models that support vision
                if task == TaskType::Vision && !m.supports_vision { return false; }
                true
            })
            .collect();

        if candidates.is_empty() { return None; }

        let scored: Vec<(&ModelInfo, f64)> = candidates.iter()
            .map(|m| (*m, self.score_model(m, task)))
            .collect();

        let best = scored.iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))?;

        Some(Selection {
            model: best.0.id.clone(),
            provider: best.0.provider,
            model_info: best.0.clone(),
            reason: self.explain_selection(best.0, task),
        })
    }

    /// Select with fallback — tries primary, then falls back.
    pub fn select_with_fallback(&self, task: TaskType) -> Vec<Selection> {
        let mut candidates: Vec<(&ModelInfo, f64)> = self.models.iter()
            .filter(|m| self.is_provider_available(m.provider))
            .filter(|m| {
                if task == TaskType::Vision && !m.supports_vision { return false; }
                true
            })
            .map(|m| (m, self.score_model(m, task)))
            .collect();

        candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        candidates.into_iter().map(|(m, _)| Selection {
            model: m.id.clone(),
            provider: m.provider,
            model_info: m.clone(),
            reason: self.explain_selection(m, task),
        }).collect()
    }

    /// Add a provider key at runtime.
    pub fn add_key(&self, provider: Provider, _key: String) {
        // Rebuild from current statuses — caller should re-detect
        // This is a signal that keys changed; actual key storage lives in ApiKeys
        tracing::info!(provider = provider.as_str(), "API key added at runtime");
    }

    /// Get all available providers and their status.
    pub fn status(&self) -> Vec<ProviderStatus> {
        self.available_providers.read().unwrap().clone()
    }

    /// Get all models for an available provider.
    pub fn models_for_provider(&self, provider: Provider) -> Vec<&ModelInfo> {
        self.models.iter()
            .filter(|m| m.provider == provider && self.is_provider_available(provider))
            .collect()
    }

    /// Human-readable summary.
    pub fn summary(&self) -> String {
        let statuses = self.status();
        let available: Vec<_> = statuses.iter().filter(|s| s.available).collect();
        if available.is_empty() {
            return "No LLM providers configured. Add API keys to .env or at runtime.".into();
        }
        let parts: Vec<String> = available.iter().map(|s| {
            format!("{} ({} keys, {} models)", s.provider.as_str(), s.key_count, s.models.len())
        }).collect();
        format!("{} providers: {}", available.len(), parts.join(", "))
    }

    // ── Private helpers ──

    fn is_provider_available(&self, provider: Provider) -> bool {
        self.available_providers.read().unwrap()
            .iter()
            .any(|s| s.provider == provider && s.available)
    }

    fn score_model(&self, model: &ModelInfo, task: TaskType) -> f64 {
        let mut score = 0.0;

        // Base quality score
        score += match model.quality_tier {
            QualityTier::Flagship => 40.0,
            QualityTier::Strong => 30.0,
            QualityTier::Standard => 20.0,
            QualityTier::Lightweight => 10.0,
        };

        // Task-specific bonuses
        match task {
            TaskType::Code => {
                if model.id.contains("code") || model.id.contains("codestral") { score += 25.0; }
                if model.supports_tools { score += 10.0; }
                if model.context_window >= 32_000 { score += 5.0; }
            }
            TaskType::Creative => {
                if model.quality_tier == QualityTier::Flagship { score += 20.0; }
                if model.context_window >= 64_000 { score += 10.0; }
            }
            TaskType::Vision => {
                if model.supports_vision { score += 30.0; } else { score -= 50.0; }
            }
            TaskType::Fast => {
                match model.speed_tier {
                    SpeedTier::UltraFast => score += 30.0,
                    SpeedTier::Fast => score += 20.0,
                    SpeedTier::Medium => score += 5.0,
                    SpeedTier::Slow => score -= 10.0,
                }
                // Penalize expensive models for fast tasks
                if model.cost_per_1k_input > 0.005 { score -= 15.0; }
            }
            TaskType::Summarize => {
                if model.cost_per_1k_input < 0.001 { score += 15.0; } // prefer cheap
                if model.context_window >= 128_000 { score += 10.0; }
            }
            TaskType::Analyze => {
                if model.context_window >= 128_000 { score += 15.0; }
                if model.quality_tier == QualityTier::Flagship { score += 15.0; }
            }
            TaskType::Chat => {
                // Balanced: prefer good quality + reasonable cost
                if model.cost_per_1k_input < 0.001 { score += 10.0; }
                if model.supports_tools { score += 5.0; }
            }
        }

        // Provider preference (Groq is free tier → bonus for cost-sensitive tasks)
        if model.provider == Provider::Groq && matches!(task, TaskType::Fast | TaskType::Chat) {
            score += 10.0;
        }

        score
    }

    fn explain_selection(&self, model: &ModelInfo, task: TaskType) -> String {
        let task_str = TaskType::as_str(&task);
        match task {
            TaskType::Fast => format!("{} selected for speed ({} tier)", model.id, format!("{:?}", model.speed_tier).to_lowercase()),
            TaskType::Code => {
                if model.id.contains("code") || model.id.contains("codestral") {
                    format!("{} selected — specialized code model", model.id)
                } else {
                    format!("{} selected for code (strong general model)", model.id)
                }
            }
            TaskType::Vision => format!("{} selected — supports vision input", model.id),
            TaskType::Summarize => format!("{} selected — cost-effective for large context", model.id),
            _ => format!("{} selected for {task_str} (best available)", model.id),
        }
    }

    /// Build the complete model catalog.
    fn build_model_catalog() -> Vec<ModelInfo> {
        let mut models = Vec::new();

        // ── Groq models (ultra-fast, free tier) ──
        models.extend(vec![
            ModelInfo {
                id: "llama-3.3-70b-versatile".into(), provider: Provider::Groq,
                display_name: "Llama 3.3 70B".into(),
                context_window: 128_000, max_output: 32_768,
                cost_per_1k_input: 0.0, cost_per_1k_output: 0.0,
                supports_streaming: true, supports_vision: false, supports_tools: true,
                speed_tier: SpeedTier::UltraFast, quality_tier: QualityTier::Strong,
            },
            ModelInfo {
                id: "llama-3.1-8b-instant".into(), provider: Provider::Groq,
                display_name: "Llama 3.1 8B Instant".into(),
                context_window: 131_072, max_output: 8_192,
                cost_per_1k_input: 0.0, cost_per_1k_output: 0.0,
                supports_streaming: true, supports_vision: false, supports_tools: false,
                speed_tier: SpeedTier::UltraFast, quality_tier: QualityTier::Lightweight,
            },
            ModelInfo {
                id: "mixtral-8x7b-32768".into(), provider: Provider::Groq,
                display_name: "Mixtral 8x7B".into(),
                context_window: 32_768, max_output: 32_768,
                cost_per_1k_input: 0.0, cost_per_1k_output: 0.0,
                supports_streaming: true, supports_vision: false, supports_tools: false,
                speed_tier: SpeedTier::UltraFast, quality_tier: QualityTier::Standard,
            },
            ModelInfo {
                id: "gemma2-9b-it".into(), provider: Provider::Groq,
                display_name: "Gemma 2 9B".into(),
                context_window: 8_192, max_output: 8_192,
                cost_per_1k_input: 0.0, cost_per_1k_output: 0.0,
                supports_streaming: true, supports_vision: false, supports_tools: false,
                speed_tier: SpeedTier::UltraFast, quality_tier: QualityTier::Lightweight,
            },
        ]);

        // ── Mistral models ──
        models.extend(vec![
            ModelInfo {
                id: "mistral-large-latest".into(), provider: Provider::Mistral,
                display_name: "Mistral Large".into(),
                context_window: 128_000, max_output: 32_768,
                cost_per_1k_input: 0.002, cost_per_1k_output: 0.006,
                supports_streaming: true, supports_vision: false, supports_tools: true,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Flagship,
            },
            ModelInfo {
                id: "mistral-small-latest".into(), provider: Provider::Mistral,
                display_name: "Mistral Small".into(),
                context_window: 32_768, max_output: 8_192,
                cost_per_1k_input: 0.001, cost_per_1k_output: 0.003,
                supports_streaming: true, supports_vision: false, supports_tools: true,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Strong,
            },
            ModelInfo {
                id: "codestral-latest".into(), provider: Provider::Mistral,
                display_name: "Codestral".into(),
                context_window: 32_768, max_output: 8_192,
                cost_per_1k_input: 0.001, cost_per_1k_output: 0.003,
                supports_streaming: true, supports_vision: false, supports_tools: false,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Strong,
            },
            ModelInfo {
                id: "open-mistral-nemo".into(), provider: Provider::Mistral,
                display_name: "Mistral Nemo".into(),
                context_window: 128_000, max_output: 8_192,
                cost_per_1k_input: 0.0, cost_per_1k_output: 0.0,
                supports_streaming: true, supports_vision: false, supports_tools: false,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Standard,
            },
        ]);

        // ── Anthropic models ──
        models.extend(vec![
            ModelInfo {
                id: "claude-sonnet-4-20250514".into(), provider: Provider::Anthropic,
                display_name: "Claude Sonnet 4".into(),
                context_window: 200_000, max_output: 64_000,
                cost_per_1k_input: 0.003, cost_per_1k_output: 0.015,
                supports_streaming: true, supports_vision: true, supports_tools: true,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Flagship,
            },
            ModelInfo {
                id: "claude-3-5-haiku-20241022".into(), provider: Provider::Anthropic,
                display_name: "Claude 3.5 Haiku".into(),
                context_window: 200_000, max_output: 8_192,
                cost_per_1k_input: 0.001, cost_per_1k_output: 0.005,
                supports_streaming: true, supports_vision: true, supports_tools: true,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Strong,
            },
        ]);

        // ── OpenAI models ──
        models.extend(vec![
            ModelInfo {
                id: "gpt-4o".into(), provider: Provider::OpenAI,
                display_name: "GPT-4o".into(),
                context_window: 128_000, max_output: 16_384,
                cost_per_1k_input: 0.0025, cost_per_1k_output: 0.01,
                supports_streaming: true, supports_vision: true, supports_tools: true,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Flagship,
            },
            ModelInfo {
                id: "gpt-4o-mini".into(), provider: Provider::OpenAI,
                display_name: "GPT-4o Mini".into(),
                context_window: 128_000, max_output: 16_384,
                cost_per_1k_input: 0.00015, cost_per_1k_output: 0.0006,
                supports_streaming: true, supports_vision: true, supports_tools: true,
                speed_tier: SpeedTier::UltraFast, quality_tier: QualityTier::Standard,
            },
            ModelInfo {
                id: "o3-mini".into(), provider: Provider::OpenAI,
                display_name: "o3 Mini".into(),
                context_window: 200_000, max_output: 100_000,
                cost_per_1k_input: 0.0011, cost_per_1k_output: 0.0044,
                supports_streaming: true, supports_vision: false, supports_tools: true,
                speed_tier: SpeedTier::Medium, quality_tier: QualityTier::Flagship,
            },
        ]);

        // ── Gemini models ──
        models.extend(vec![
            ModelInfo {
                id: "gemini-2.5-flash".into(), provider: Provider::Gemini,
                display_name: "Gemini 2.5 Flash".into(),
                context_window: 1_000_000, max_output: 65_536,
                cost_per_1k_input: 0.000075, cost_per_1k_output: 0.0003,
                supports_streaming: true, supports_vision: true, supports_tools: true,
                speed_tier: SpeedTier::UltraFast, quality_tier: QualityTier::Strong,
            },
            ModelInfo {
                id: "gemini-2.5-pro".into(), provider: Provider::Gemini,
                display_name: "Gemini 2.5 Pro".into(),
                context_window: 1_000_000, max_output: 65_536,
                cost_per_1k_input: 0.00125, cost_per_1k_output: 0.01,
                supports_streaming: true, supports_vision: true, supports_tools: true,
                speed_tier: SpeedTier::Fast, quality_tier: QualityTier::Flagship,
            },
        ]);

        models
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_with_groq_only() {
        let sel = ModelSelector::detect(
            &["key1".into(), "key2".into()],
            &vec![],
            &None, &None, &None,
        );
        let statuses = sel.status();
        let groq = statuses.iter().find(|s| s.provider == Provider::Groq).unwrap();
        assert!(groq.available);
        assert_eq!(groq.key_count, 2);
        let mistral = statuses.iter().find(|s| s.provider == Provider::Mistral).unwrap();
        assert!(!mistral.available);
    }

    #[test]
    fn test_select_chat() {
        let sel = ModelSelector::detect(
            &["key1".into()],
            &vec![],
            &None, &None, &None,
        );
        let result = sel.select(TaskType::Chat).unwrap();
        assert_eq!(result.provider, Provider::Groq);
    }

    #[test]
    fn test_select_fast_prefers_groq() {
        let sel = ModelSelector::detect(
            &["key1".into()],
            &vec![],
            &None, &None, &None,
        );
        let result = sel.select(TaskType::Fast).unwrap();
        assert_eq!(result.provider, Provider::Groq);
        assert!(result.model_info.speed_tier == SpeedTier::UltraFast);
    }

    #[test]
    fn test_select_vision_requires_vision_model() {
        let sel = ModelSelector::detect(
            &["key1".into()],
            &vec![],
            &None, &None, &None,
        );
        // Groq doesn't have vision models
        assert!(sel.select(TaskType::Vision).is_none());
    }

    #[test]
    fn test_fallback_chain() {
        let sel = ModelSelector::detect(
            &["key1".into()],
            &["key2".into()],
            &Some("sk-ant".into()),
            &None, &None,
        );
        let chain = sel.select_with_fallback(TaskType::Chat);
        assert!(chain.len() >= 2); // Groq + Mistral at minimum
    }

    #[test]
    fn test_summary_no_keys() {
        let sel = ModelSelector::detect(&vec![], &vec![], &None, &None, &None);
        let s = sel.summary();
        assert!(s.contains("No LLM providers"));
    }

    #[test]
    fn test_summary_with_keys() {
        let sel = ModelSelector::detect(
            &["k1".into()],
            &["k2".into(), "k3".into()],
            &Some("sk-ant".into()), &None, &None,
        );
        let s = sel.summary();
        assert!(s.contains("3 providers"));
    }

    #[test]
    fn test_model_catalog_size() {
        let _sel = ModelSelector::detect(
            &["key1".into()],
            &vec![],
            &None, &None, &None,
        );
        // Total catalog should have all models regardless of availability
        let all = ModelSelector::build_model_catalog();
        assert!(all.len() >= 12);
    }

    #[test]
    fn test_task_type_from_str() {
        assert_eq!(TaskType::from_str("code"), TaskType::Code);
        assert_eq!(TaskType::from_str("vision"), TaskType::Vision);
        assert_eq!(TaskType::from_str("unknown"), TaskType::Chat);
    }
}
