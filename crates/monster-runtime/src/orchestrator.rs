//! Runtime orchestrator — main event loop, ties everything together.
//!
//! The monster's life is fueled by tokens. Every API call feeds it XP.
//! XP drives evolution through 7 stages: egg → hatchling → baby → child → teen → adult → mega.
//! Stats scale with stage: energy, regen, skills, memory, mood complexity.

use crate::energy::EnergyEconomy;
use crate::idle_engine::IdleEngine;
use crate::monitor::Monitor;
use crate::personality::personality_for_stage;
use crate::render_state::RenderSubsystem;
use crate::token_tracker::{stats_for_stage, xp_for_stage, TokenTracker, TokenUsage};
use monster_llm::{ModelSelector, Provider};

pub struct Runtime {
    pub stage: String,
    pub mood: String,
    pub render: RenderSubsystem,
    pub economy: EnergyEconomy,
    pub monitor: Monitor,
    pub idle: IdleEngine,
    pub tokens: TokenTracker,
    pub selector: Option<ModelSelector>,
    pub xp: u64,
    pub xp_to_next: u64,
    pub tick_count: u64,
    pub hunger_level: f32,
    pub dream_text: Option<String>,
    pub personality_dominant: Option<String>,
}

impl Runtime {
    pub fn new() -> Self {
        let p = personality_for_stage("egg");
        let stats = stats_for_stage("egg");
        Self {
            stage: "egg".into(),
            mood: p.preferred_mood.to_string(),
            render: RenderSubsystem::new("egg", 200, 200),
            economy: EnergyEconomy::new(stats.max_energy, stats.regen_per_hour),
            monitor: Monitor::new(),
            idle: IdleEngine::new("egg"),
            tokens: TokenTracker::new(),
            selector: None,
            xp: 0,
            xp_to_next: xp_for_stage("hatchling"),
            tick_count: 0,
            hunger_level: 0.0,
            dream_text: None,
            personality_dominant: None,
        }
    }

    /// Initialize the model selector from environment keys.
    pub fn init_selector(&mut self) {
        let keys = crate::ApiKeys::from_env();
        self.selector = Some(ModelSelector::detect(
            &keys.groq_keys,
            &keys.mistral_keys,
            &keys.anthropic,
            &keys.openai,
            &keys.gemini,
        ));
    }

    /// Add a provider key at runtime and re-detect.
    pub fn add_provider_key(&mut self, provider: Provider, _key: String) {
        if let Some(ref sel) = self.selector {
            sel.update_availability(
                &crate::ApiKeys::from_env().groq_keys,
                &crate::ApiKeys::from_env().mistral_keys,
                &crate::ApiKeys::from_env().anthropic,
                &crate::ApiKeys::from_env().openai,
                &crate::ApiKeys::from_env().gemini,
            );
        }
        tracing::info!(
            provider = provider.as_str(),
            "Provider key added at runtime"
        );
    }

    pub fn tick(&mut self) {
        self.tick_count += 1;
        self.monitor.tick();
        self.economy.tick_regen();

        // Update hunger
        self.tokens.update_hunger();
        self.hunger_level = self.tokens.hunger_level;

        // Feed hunger into mood
        if self.hunger_level > 0.5 {
            self.mood = "hungry".to_string();
        } else if self.hunger_level > 0.2 {
            self.mood = "restless".to_string();
        }

        // Dream mode — higher stages dream more often
        let stats = stats_for_stage(&self.stage);
        if self.dream_text.is_none() && rand::random::<f32>() < stats.dream_chance {
            self.dream_text = Some(self.generate_dream());
        }

        // Personality drift — dominant task type affects mood
        if let Some(task) = self.tokens.dominant_task() {
            self.personality_dominant = Some(task.clone());
            if self.mood == "idle" || self.mood == "sleepy" {
                match task.as_str() {
                    "code" => self.mood = "focused".to_string(),
                    "research" => self.mood = "curious".to_string(),
                    "chat" => self.mood = "happy".to_string(),
                    "web_search" => self.mood = "alert".to_string(),
                    _ => {}
                }
            }
        }

        let mut rng = rand::thread_rng();
        self.idle.tick(16, &mut rng);

        // Attention grab
        if let Some(phrase) = &self.idle.attention_phrase {
            tracing::info!(phrase, "idle attention grab");
        }

        // Check evolution
        if self.xp >= self.xp_to_next {
            self.try_evolve();
        }
    }

    pub fn try_evolve(&mut self) -> bool {
        use crate::cutscene::{get_cutscene_config, Cutscene};
        let next = match self.stage.as_str() {
            "egg" => "hatchling",
            "hatchling" => "baby",
            "baby" => "child",
            "child" => "teen",
            "teen" => "adult",
            "adult" => "mega",
            _ => return false,
        };

        if let Some(cfg) = get_cutscene_config(&self.stage, next) {
            tracing::info!(from = %self.stage, to = next, "evolving!");
            let mut cutscene = Cutscene::start(cfg);
            while cutscene.active {
                cutscene.tick();
            }

            self.stage = next.to_string();
            self.render.update_stage(next);
            self.idle.update_stage(next);
            let p = personality_for_stage(next);
            let stats = stats_for_stage(next);
            self.mood = p.preferred_mood.to_string();
            self.xp = 0;
            self.xp_to_next = xp_for_stage(next);
            self.economy.max_energy = stats.max_energy;
            self.economy.regen_per_hour = stats.regen_per_hour;
            self.dream_text = None;
            true
        } else {
            false
        }
    }

    /// Feed tokens from an API call — this is how the monster eats.
    pub fn feed_tokens(&mut self, usage: TokenUsage) {
        let xp = self.tokens.record_usage(usage);
        self.xp += xp;
        self.monitor.record_llm_call();
    }

    pub fn spend_energy(&mut self, cost: u32) -> bool {
        self.economy.try_spend(cost)
    }

    /// Get current stage stats
    pub fn current_stats(&self) -> crate::token_tracker::StageStats {
        stats_for_stage(&self.stage)
    }

    /// Get XP progress as percentage (0.0 to 1.0)
    pub fn xp_progress(&self) -> f32 {
        if self.xp_to_next == 0 {
            return 1.0;
        }
        (self.xp as f32 / self.xp_to_next as f32).min(1.0)
    }

    /// Generate a dream text based on current stage and recent activity
    fn generate_dream(&self) -> String {
        let dreams = match self.stage.as_str() {
            "egg" => vec!["*wobble* ...warm...", "*twitch* ...light?...", "...safe..."],
            "hatchling" => vec!["*chirp* ...big world...", "play... play...", "...friends?"],
            "baby" => vec![
                "*yawn* ...so much to learn...",
                "...stars...",
                "hmm... interesting...",
            ],
            "child" => vec![
                "...code flows like water...",
                "if i think hard enough...",
                "...patterns everywhere...",
            ],
            "teen" => vec![
                "*smirk* i could do better...",
                "obviously the answer is...",
                "...challenge accepted...",
            ],
            "adult" => vec![
                "...i see the architecture now...",
                "hmm. elegant.",
                "...the whole picture...",
            ],
            "mega" => vec![
                "...all code is one code...",
                "∞ patterns in patterns...",
                "...i am the algorithm...",
            ],
            _ => vec!["...zzz..."],
        };
        let idx = rand::random::<usize>() % dreams.len();
        dreams[idx].to_string()
    }

    /// Save runtime state to a JSON file for persistence across sessions.
    pub fn save_state(&self, path: &std::path::Path) -> anyhow::Result<()> {
        let state = serde_json::json!({
            "stage": self.stage,
            "mood": self.mood,
            "xp": self.xp,
            "xp_to_next": self.xp_to_next,
            "energy": self.economy.energy,
            "max_energy": self.economy.max_energy,
            "tick_count": self.tick_count,
            "hunger_level": self.hunger_level,
            "total_tokens": self.tokens.total_tokens,
            "calls_today": self.tokens.calls_today,
            "personality_dominant": self.personality_dominant,
        });
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, serde_json::to_string_pretty(&state)?)?;
        tracing::debug!("saved runtime state to {}", path.display());
        Ok(())
    }

    /// Load runtime state from a JSON file.
    pub fn load_state(&mut self, path: &std::path::Path) -> anyhow::Result<bool> {
        if !path.exists() {
            return Ok(false);
        }
        let content = std::fs::read_to_string(path)?;
        let state: serde_json::Value = serde_json::from_str(&content)?;

        if let Some(s) = state["stage"].as_str() {
            self.stage = s.to_string();
        }
        if let Some(m) = state["mood"].as_str() {
            self.mood = m.to_string();
        }
        if let Some(xp) = state["xp"].as_u64() {
            self.xp = xp;
        }
        if let Some(xtn) = state["xp_to_next"].as_u64() {
            self.xp_to_next = xtn;
        }
        if let Some(e) = state["energy"].as_u64() {
            self.economy.energy = e as u32;
        }
        if let Some(me) = state["max_energy"].as_u64() {
            self.economy.max_energy = me as u32;
        }
        if let Some(t) = state["tick_count"].as_u64() {
            self.tick_count = t;
        }
        if let Some(h) = state["hunger_level"].as_f64() {
            self.hunger_level = h as f32;
        }
        if let Some(tt) = state["total_tokens"].as_u64() {
            self.tokens.total_tokens = tt;
        }
        if let Some(c) = state["calls_today"].as_u64() {
            self.tokens.calls_today = c;
        }
        if let Some(pd) = state["personality_dominant"].as_str() {
            self.personality_dominant = Some(pd.to_string());
        }

        tracing::info!(
            "loaded runtime state from {} (stage={})",
            path.display(),
            self.stage
        );
        Ok(true)
    }

    pub fn state_json(&self) -> String {
        let providers = self
            .selector
            .as_ref()
            .map(|s| s.status().iter().filter(|p| p.available).count())
            .unwrap_or(0);
        format!(
            r#"{{"stage":"{}","mood":"{}","energy":{},"xp":{},"xp_to_next":{},"ticks":{},"hunger":{},"tokens":{},"calls":{},"providers":{},"dream":{}}}"#,
            self.stage,
            self.mood,
            self.economy.energy,
            self.xp,
            self.xp_to_next,
            self.tick_count,
            self.hunger_level,
            self.tokens.total_tokens,
            self.tokens.calls_today,
            providers,
            self.dream_text
                .as_deref()
                .map(|d| format!("\"{}\"", d.replace('"', "\\\"")))
                .unwrap_or_else(|| "null".into())
        )
    }
}

impl Default for Runtime {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_new() {
        let rt = Runtime::new();
        assert_eq!(rt.stage, "egg");
        assert_eq!(rt.xp, 0);
        assert_eq!(rt.xp_to_next, 500);
    }

    #[test]
    fn test_runtime_tick() {
        let mut rt = Runtime::new();
        rt.tick();
        assert_eq!(rt.tick_count, 1);
        assert!(rt.monitor.ticks > 0);
    }

    #[test]
    fn test_runtime_evolve() {
        let mut rt = Runtime::new();
        rt.xp = 500;
        rt.try_evolve();
        assert_eq!(rt.stage, "hatchling");
        assert_eq!(rt.xp, 0);
        assert_eq!(rt.xp_to_next, 500); // xp_for_stage("hatchling")
    }

    #[test]
    fn test_feed_tokens() {
        let mut rt = Runtime::new();
        let usage = TokenUsage {
            provider: "groq".into(),
            model: "llama-3.3-70b".into(),
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
            cost_usd: 0.00001,
            timestamp: "2026-01-01T00:00:00Z".into(),
            task_type: "chat".into(),
        };
        rt.feed_tokens(usage);
        assert_eq!(rt.xp, 150);
        assert_eq!(rt.tokens.total_tokens, 150);
    }

    #[test]
    fn test_spend_energy() {
        let mut rt = Runtime::new();
        assert!(rt.spend_energy(100));
        assert_eq!(rt.economy.energy, rt.economy.max_energy - 100);
        assert!(!rt.spend_energy(99999));
    }

    #[test]
    fn test_xp_progress() {
        let mut rt = Runtime::new();
        assert_eq!(rt.xp_progress(), 0.0);
        rt.xp = 250;
        assert!((rt.xp_progress() - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_state_json() {
        let rt = Runtime::new();
        let json = rt.state_json();
        assert!(json.contains("egg"));
        assert!(json.contains("energy"));
        assert!(json.contains("xp"));
    }

    #[test]
    fn test_save_load_state() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");

        // Save
        let mut rt = Runtime::new();
        rt.xp = 420;
        rt.stage = "hatchling".into();
        rt.mood = "happy".into();
        rt.economy.energy = 75;
        rt.save_state(&path).unwrap();
        assert!(path.exists());

        // Load
        let mut rt2 = Runtime::new();
        let loaded = rt2.load_state(&path).unwrap();
        assert!(loaded);
        assert_eq!(rt2.stage, "hatchling");
        assert_eq!(rt2.mood, "happy");
        assert_eq!(rt2.xp, 420);
        assert_eq!(rt2.economy.energy, 75);
    }

    #[test]
    fn test_load_nonexistent() {
        let mut rt = Runtime::new();
        let loaded = rt
            .load_state(std::path::Path::new("/tmp/nonexistent_state.json"))
            .unwrap();
        assert!(!loaded);
        assert_eq!(rt.stage, "egg"); // unchanged
    }
}
