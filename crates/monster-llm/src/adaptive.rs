//! Adaptive routing — selects model based on task complexity and cost.

pub struct AdaptiveRouter {
    pub anthropic_key: Option<String>,
    pub openai_key: Option<String>,
    pub budget_remaining: f64,
}

impl AdaptiveRouter {
    pub fn new(anthropic: Option<String>, openai: Option<String>, budget: f64) -> Self {
        Self { anthropic_key: anthropic, openai_key: openai, budget_remaining: budget }
    }

    pub fn select_model(&self, task_type: &str, complexity: f32) -> &str {
        match task_type {
            "vision" | "computer_use" => "claude-sonnet-4-20250514",
            "code" if complexity > 0.7 => "claude-sonnet-4-20250514",
            "code" => "gpt-4o",
            "chat" if complexity < 0.3 => "gpt-4o-mini",
            "chat" => "gpt-4o",
            "summarize" => "gpt-4o-mini",
            _ => "gpt-4o",
        }
    }

    pub fn estimate_cost(&self, model: &str, tokens: u32) -> f64 {
        match model {
            "claude-sonnet-4-20250514" => tokens as f64 * 0.000003,
            "gpt-4o" => tokens as f64 * 0.000005,
            "gpt-4o-mini" => tokens as f64 * 0.00000015,
            _ => 0.0,
        }
    }
}
