//! Token tracker — every API token the monster consumes becomes XP.
//!
//! Core concept: the monster "eats" tokens to survive and grow.
//! 1 token ≈ 1 XP. The more you use the AI, the more it evolves.
//! This creates a natural progression loop: use → feed → evolve → unlock.

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// XP thresholds for each evolution stage.
/// The monster starts as an egg and evolves through 7 stages.
pub fn xp_for_stage(stage: &str) -> u64 {
    match stage {
        "egg" => 0,
        "hatchling" => 500,
        "baby" => 2_000,
        "child" => 8_000,
        "teen" => 25_000,
        "adult" => 80_000,
        "mega" => 250_000,
        _ => 0,
    }
}

/// Stats that scale with evolution stage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageStats {
    pub max_energy: u32,
    pub regen_per_hour: u32,
    pub max_skills: usize,
    pub memory_capacity: usize,
    pub attention_rate: f32,
    pub llm_cost_multiplier: f32,
    pub tool_cost_multiplier: f32,
    pub mood_complexity: usize,
    pub dream_chance: f32,
}

pub fn stats_for_stage(stage: &str) -> StageStats {
    match stage {
        "egg" => StageStats {
            max_energy: 500,
            regen_per_hour: 10,
            max_skills: 0,
            memory_capacity: 10,
            attention_rate: 0.005,
            llm_cost_multiplier: 1.0,
            tool_cost_multiplier: 1.0,
            mood_complexity: 1,
            dream_chance: 0.0,
        },
        "hatchling" => StageStats {
            max_energy: 800,
            regen_per_hour: 20,
            max_skills: 3,
            memory_capacity: 25,
            attention_rate: 0.02,
            llm_cost_multiplier: 0.9,
            tool_cost_multiplier: 0.95,
            mood_complexity: 2,
            dream_chance: 0.01,
        },
        "baby" => StageStats {
            max_energy: 1000,
            regen_per_hour: 30,
            max_skills: 5,
            memory_capacity: 50,
            attention_rate: 0.025,
            llm_cost_multiplier: 0.8,
            tool_cost_multiplier: 0.9,
            mood_complexity: 3,
            dream_chance: 0.02,
        },
        "child" => StageStats {
            max_energy: 1200,
            regen_per_hour: 40,
            max_skills: 8,
            memory_capacity: 100,
            attention_rate: 0.03,
            llm_cost_multiplier: 0.7,
            tool_cost_multiplier: 0.85,
            mood_complexity: 4,
            dream_chance: 0.03,
        },
        "teen" => StageStats {
            max_energy: 1500,
            regen_per_hour: 55,
            max_skills: 12,
            memory_capacity: 200,
            attention_rate: 0.04,
            llm_cost_multiplier: 0.6,
            tool_cost_multiplier: 0.8,
            mood_complexity: 5,
            dream_chance: 0.04,
        },
        "adult" => StageStats {
            max_energy: 2000,
            regen_per_hour: 75,
            max_skills: 20,
            memory_capacity: 500,
            attention_rate: 0.03,
            llm_cost_multiplier: 0.5,
            tool_cost_multiplier: 0.7,
            mood_complexity: 6,
            dream_chance: 0.05,
        },
        "mega" => StageStats {
            max_energy: 3000,
            regen_per_hour: 100,
            max_skills: 50,
            memory_capacity: 1000,
            attention_rate: 0.02,
            llm_cost_multiplier: 0.4,
            tool_cost_multiplier: 0.6,
            mood_complexity: 7,
            dream_chance: 0.08,
        },
        _ => StageStats {
            max_energy: 500,
            regen_per_hour: 10,
            max_skills: 0,
            memory_capacity: 10,
            attention_rate: 0.005,
            llm_cost_multiplier: 1.0,
            tool_cost_multiplier: 1.0,
            mood_complexity: 1,
            dream_chance: 0.0,
        },
    }
}

/// Token usage record for a single API call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub provider: String,
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
    pub cost_usd: f64,
    pub timestamp: String,
    pub task_type: String,
}

/// Tracks cumulative token usage and converts it to monster XP.
pub struct TokenTracker {
    pub total_tokens: u64,
    pub total_cost_usd: f64,
    pub session_tokens: u64,
    pub calls_today: u64,
    pub last_feed_time: std::time::Instant,
    pub recent_usage: VecDeque<TokenUsage>,
    pub hunger_level: f32,
    pub mood_history: VecDeque<String>,
    max_recent: usize,
}

impl TokenTracker {
    pub fn new() -> Self {
        Self {
            total_tokens: 0,
            total_cost_usd: 0.0,
            session_tokens: 0,
            calls_today: 0,
            last_feed_time: std::time::Instant::now(),
            recent_usage: VecDeque::new(),
            hunger_level: 0.0,
            mood_history: VecDeque::new(),
            max_recent: 50,
        }
    }

    /// Record a token usage event. Returns XP gained.
    pub fn record_usage(&mut self, usage: TokenUsage) -> u64 {
        let tokens = usage.total_tokens as u64;
        self.total_tokens += tokens;
        self.total_cost_usd += usage.cost_usd;
        self.session_tokens += tokens;
        self.calls_today += 1;
        self.last_feed_time = std::time::Instant::now();
        self.hunger_level = 0.0;

        if self.recent_usage.len() >= self.max_recent {
            self.recent_usage.pop_front();
        }
        self.recent_usage.push_back(usage);

        tokens
    }

    /// Update hunger based on time since last feed.
    /// Monster gets "hungry" if not fed for 30+ minutes.
    pub fn update_hunger(&mut self) {
        let elapsed = self.last_feed_time.elapsed().as_secs_f32();
        // After 30 minutes, hunger starts rising
        if elapsed > 1800.0 {
            let hunger_minutes = (elapsed - 1800.0) / 60.0;
            self.hunger_level = (hunger_minutes / 60.0).min(1.0); // Max hunger after 90 min total
        }
    }

    /// Is the monster starving? (Haven't been fed in 2+ hours)
    pub fn is_starving(&self) -> bool {
        self.last_feed_time.elapsed().as_secs() > 7200
    }

    /// Get tokens per hour (for activity tracking)
    pub fn tokens_per_hour(&self) -> f64 {
        let hours = self.last_feed_time.elapsed().as_secs_f64() / 3600.0;
        if hours < 0.01 {
            return 0.0;
        }
        self.session_tokens as f64 / hours
    }

    /// Get the dominant task type from recent usage (for personality drift)
    pub fn dominant_task(&self) -> Option<String> {
        if self.recent_usage.is_empty() {
            return None;
        }
        let mut counts = std::collections::HashMap::new();
        for u in &self.recent_usage {
            *counts.entry(u.task_type.clone()).or_insert(0) += 1;
        }
        counts.into_iter().max_by_key(|(_, c)| *c).map(|(t, _)| t)
    }

    /// Get average cost per call
    pub fn avg_cost_per_call(&self) -> f64 {
        if self.calls_today == 0 {
            return 0.0;
        }
        self.total_cost_usd / self.calls_today as f64
    }

    /// Get a summary for the HUD
    pub fn summary(&self) -> TokenSummary {
        TokenSummary {
            total_tokens: self.total_tokens,
            session_tokens: self.session_tokens,
            calls_today: self.calls_today,
            total_cost_usd: self.total_cost_usd,
            hunger_level: self.hunger_level,
            tokens_per_hour: self.tokens_per_hour(),
            dominant_task: self.dominant_task(),
        }
    }
}

impl Default for TokenTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenSummary {
    pub total_tokens: u64,
    pub session_tokens: u64,
    pub calls_today: u64,
    pub total_cost_usd: f64,
    pub hunger_level: f32,
    pub tokens_per_hour: f64,
    pub dominant_task: Option<String>,
}

/// Estimate token count from text (rough: 1 token ≈ 4 chars)
pub fn estimate_tokens(text: &str) -> u32 {
    (text.len() as u32).div_ceil(4)
}

/// Estimate cost for a provider (rough estimates per 1M tokens)
pub fn estimate_cost(provider: &str, input_tokens: u32, output_tokens: u32) -> f64 {
    let (input_price, output_price) = match provider {
        "groq" => (0.05, 0.10),
        "mistral" => (0.25, 0.25),
        "anthropic" => (3.0, 15.0),
        "openai" => (2.5, 10.0),
        "gemini" => (0.075, 0.30),
        _ => (0.0, 0.0),
    };
    let input_cost = (input_tokens as f64 / 1_000_000.0) * input_price;
    let output_cost = (output_tokens as f64 / 1_000_000.0) * output_price;
    input_cost + output_cost
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xp_thresholds() {
        assert_eq!(xp_for_stage("egg"), 0);
        assert_eq!(xp_for_stage("hatchling"), 500);
        assert_eq!(xp_for_stage("mega"), 250_000);
    }

    #[test]
    fn test_stats_scaling() {
        let egg = stats_for_stage("egg");
        let mega = stats_for_stage("mega");
        assert!(mega.max_energy > egg.max_energy);
        assert!(mega.regen_per_hour > egg.regen_per_hour);
        assert!(mega.memory_capacity > egg.memory_capacity);
        assert!(mega.llm_cost_multiplier < egg.llm_cost_multiplier);
    }

    #[test]
    fn test_token_tracker_record() {
        let mut tracker = TokenTracker::new();
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
        let xp = tracker.record_usage(usage);
        assert_eq!(xp, 150);
        assert_eq!(tracker.total_tokens, 150);
        assert_eq!(tracker.calls_today, 1);
    }

    #[test]
    fn test_hunger_system() {
        let mut tracker = TokenTracker::new();
        tracker.update_hunger();
        assert_eq!(tracker.hunger_level, 0.0);
    }

    #[test]
    fn test_estimate_tokens() {
        assert_eq!(estimate_tokens("hello"), 2);
        assert_eq!(estimate_tokens("hello world"), 3);
    }

    #[test]
    fn test_estimate_cost() {
        let cost = estimate_cost("groq", 1000, 500);
        assert!(cost > 0.0);
        assert!(cost < 0.01);
    }
}
