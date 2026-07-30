//! Memory recall — search and retrieve from memory tiers.

pub struct RecallEngine {
    pub hot_limit: usize,
    pub warm_limit: usize,
    pub cold_limit: usize,
}

impl RecallEngine {
    pub fn new() -> Self {
        Self {
            hot_limit: 100,
            warm_limit: 500,
            cold_limit: 2000,
        }
    }

    pub fn recall<'a>(&self, query: &str, memories: &'a [MemoryEntry]) -> Vec<&'a MemoryEntry> {
        let query_lower = query.to_lowercase();
        let mut results: Vec<&MemoryEntry> = memories
            .iter()
            .filter(|m| m.content.to_lowercase().contains(&query_lower))
            .collect();

        results.sort_by(|a, b| {
            let score_a = a.access_count as f32 * a.decay_score;
            let score_b = b.access_count as f32 * b.decay_score;
            score_b
                .partial_cmp(&score_a)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results.truncate(10);
        results
    }

    pub fn tier_stats(&self, memories: &[MemoryEntry]) -> TierStats {
        let mut stats = TierStats::default();
        for m in memories {
            match m.tier.as_str() {
                "hot" => stats.hot += 1,
                "warm" => stats.warm += 1,
                "cold" => stats.cold += 1,
                _ => stats.archived += 1,
            }
        }
        stats
    }
}

pub struct MemoryEntry {
    pub id: u64,
    pub tier: String,
    pub content: String,
    pub access_count: u32,
    pub decay_score: f32,
    pub embedding: Vec<f32>,
}

#[derive(Default)]
pub struct TierStats {
    pub hot: usize,
    pub warm: usize,
    pub cold: usize,
    pub archived: usize,
}

impl Default for RecallEngine {
    fn default() -> Self {
        Self::new()
    }
}
