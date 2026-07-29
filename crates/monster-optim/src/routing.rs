//! Routing rules — model selection based on cost/quality/latency.

pub struct RoutingRules {
    pub prefer_local: bool,
    pub max_cost_per_call: f32,
    pub max_latency_ms: u32,
    pub min_quality: f32,
    pub fallback_model: String,
    pub model_costs: std::collections::HashMap<String, f32>,
    pub model_quality: std::collections::HashMap<String, f32>,
}

impl RoutingRules {
    pub fn default_rules() -> Self {
        let mut model_costs = std::collections::HashMap::new();
        model_costs.insert("claude-sonnet-4-20250514".into(), 0.003);
        model_costs.insert("gemini-2.5-flash".into(), 0.001);
        model_costs.insert("gpt-4o-mini".into(), 0.0015);
        model_costs.insert("gpt-4o".into(), 0.005);
        model_costs.insert("claude-3-haiku".into(), 0.0005);

        let mut model_quality = std::collections::HashMap::new();
        model_quality.insert("claude-sonnet-4-20250514".into(), 0.9);
        model_quality.insert("gemini-2.5-flash".into(), 0.7);
        model_quality.insert("gpt-4o-mini".into(), 0.75);
        model_quality.insert("gpt-4o".into(), 0.95);
        model_quality.insert("claude-3-haiku".into(), 0.6);

        Self {
            prefer_local: true,
            max_cost_per_call: 0.01,
            max_latency_ms: 5000,
            min_quality: 0.5,
            fallback_model: "gemini-2.5-flash".into(),
            model_costs,
            model_quality,
        }
    }

    pub fn select_best(&self, task_complexity: f32) -> &str {
        let mut best = &self.fallback_model;
        let mut best_score = 0.0f32;

        for (model, cost) in &self.model_costs {
            if *cost > self.max_cost_per_call { continue; }
            let quality = self.model_quality.get(model).copied().unwrap_or(0.5);
            if quality < self.min_quality { continue; }
            let score = quality * (1.0 - task_complexity * 0.3) - cost * 10.0;
            if score > best_score {
                best_score = score;
                best = model;
            }
        }
        best
    }

    pub fn fits_budget(&self, model: &str) -> bool {
        self.model_costs.get(model).map_or(false, |&c| c <= self.max_cost_per_call)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_rules() {
        let rules = RoutingRules::default_rules();
        assert!(rules.prefer_local);
        assert!(rules.fits_budget("gemini-2.5-flash"));
    }

    #[test]
    fn test_select_best() {
        let rules = RoutingRules::default_rules();
        let model = rules.select_best(0.5);
        assert!(!model.is_empty());
    }
}
