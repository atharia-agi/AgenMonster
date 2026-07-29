use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvolutionRecipe {
    pub id: String,
    pub from_stage: String,
    pub to_stage: String,
    pub trigger: EvolutionTrigger,
    pub cost: EvolutionCost,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EvolutionTrigger {
    /// Number of unique tasks solved.
    TasksCompleted { count: u32 },
    /// Memory confidence on certain topic clusters.
    MemoryMastery { topic: String, confidence: f32 },
    /// User explicitly asks for evolution.
    UserConsent,
    /// Recursive: pet evolved N times already.
    MultiEvo { count: u32 },
    /// LLM-determined personal milestone ("first time you solved a math problem")
    LlmAssessedMilestone { prompt: String },
    /// Time-based birthday
    Age { days: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EvolutionCost {
    Currency { amount: u32 },
    Energy { points: u32 },
    Free,
}
