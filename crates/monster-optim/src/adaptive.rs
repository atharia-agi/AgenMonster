//! Adaptive routing — selects model based on task complexity and budget.

pub struct AdaptiveRouter {
    pub strategy: RoutingStrategy,
    pub budget_remaining: f32,
    pub cost_per_call: std::collections::HashMap<String, f32>,
}

pub enum RoutingStrategy {
    Fastest,
    Cheapest,
    Smart,
    BudgetAware { max_per_call: f32 },
}

impl AdaptiveRouter {
    pub fn new(strategy: RoutingStrategy, budget: f32) -> Self {
        let mut cost_per_call = std::collections::HashMap::new();
        cost_per_call.insert("claude-sonnet-4-20250514".into(), 0.003);
        cost_per_call.insert("gemini-2.5-flash".into(), 0.001);
        cost_per_call.insert("gpt-4o-mini".into(), 0.0015);
        cost_per_call.insert("gpt-4o".into(), 0.005);
        cost_per_call.insert("claude-3-haiku".into(), 0.0005);

        Self { strategy, budget_remaining: budget, cost_per_call }
    }

    pub fn select_model(&mut self, task: &str, energy: u32, complexity: f32) -> &'static str {
        match &self.strategy {
            RoutingStrategy::Fastest => "gpt-4o",
            RoutingStrategy::Cheapest => {
                if self.budget_remaining < 0.01 { "claude-3-haiku" } else { "gemini-2.5-flash" }
            }
            RoutingStrategy::Smart => {
                if complexity > 0.7 && energy > 200 && self.budget_remaining > 0.01 {
                    "gpt-4o"
                } else if complexity > 0.4 && self.budget_remaining > 0.005 {
                    "claude-sonnet-4-20250514"
                } else {
                    "gemini-2.5-flash"
                }
            }
            RoutingStrategy::BudgetAware { max_per_call } => {
                if *max_per_call <= 0.001 { "claude-3-haiku" }
                else if *max_per_call <= 0.002 { "gemini-2.5-flash" }
                else if *max_per_call <= 0.004 { "claude-sonnet-4-20250514" }
                else { "gpt-4o" }
            }
        }
    }

    pub fn record_cost(&mut self, model: &str) {
        if let Some(cost) = self.cost_per_call.get(model) {
            self.budget_remaining -= cost;
        }
    }

    pub fn cost_estimate(&self, model: &str) -> f32 {
        self.cost_per_call.get(model).copied().unwrap_or(0.0)
    }

    pub fn budget_percentage(&self) -> f32 {
        self.budget_remaining
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adaptive_router() {
        let mut router = AdaptiveRouter::new(RoutingStrategy::Smart, 1.0);
        assert_eq!(router.select_model("short", 10, 0.2), "gemini-2.5-flash");
        assert_eq!(router.select_model("complex", 500, 0.9), "gpt-4o");
    }

    #[test]
    fn test_budget_aware() {
        let mut router = AdaptiveRouter::new(RoutingStrategy::BudgetAware { max_per_call: 0.001 }, 1.0);
        assert_eq!(router.select_model("", 0, 0.0), "claude-3-haiku");
    }

    #[test]
    fn test_cost_tracking() {
        let mut router = AdaptiveRouter::new(RoutingStrategy::Smart, 1.0);
        router.record_cost("gpt-4o");
        assert!(router.budget_remaining < 1.0);
    }
}
