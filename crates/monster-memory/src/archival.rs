//! Archival — move memories between tiers based on access patterns.

pub struct ArchivalEngine {
    pub hot_threshold: f32,
    pub warm_threshold: f32,
    pub cold_threshold: f32,
    pub decay_rate: f32,
}

impl ArchivalEngine {
    pub fn new() -> Self {
        Self {
            hot_threshold: 0.8,
            warm_threshold: 0.5,
            cold_threshold: 0.2,
            decay_rate: 0.95,
        }
    }

    pub fn tick_decay(&self, memories: &mut [ArchivalEntry]) {
        for m in memories.iter_mut() {
            m.decay_score *= self.decay_rate;
        }
    }

    pub fn promote_demote(&self, memories: &mut [ArchivalEntry]) {
        for m in memories.iter_mut() {
            let new_tier = if m.decay_score > self.hot_threshold && m.access_count > 10 {
                "hot"
            } else if m.decay_score > self.warm_threshold && m.access_count > 3 {
                "warm"
            } else if m.decay_score > self.cold_threshold {
                "cold"
            } else {
                "archived"
            };
            m.tier = new_tier.to_string();
        }
    }

    pub fn prune_archived(&self, memories: &mut Vec<ArchivalEntry>, max_archived: usize) {
        let archived_count = memories.iter().filter(|m| m.tier == "archived").count();
        if archived_count > max_archived {
            let to_remove = archived_count - max_archived;
            let mut removed = 0;
            memories.retain(|m| {
                if m.tier == "archived" && removed < to_remove {
                    removed += 1;
                    false
                } else {
                    true
                }
            });
        }
    }
}

pub struct ArchivalEntry {
    pub id: u64,
    pub tier: String,
    pub content: String,
    pub access_count: u32,
    pub decay_score: f32,
}

impl Default for ArchivalEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decay() {
        let engine = ArchivalEngine::new();
        let mut memories = vec![ArchivalEntry {
            id: 1,
            tier: "hot".into(),
            content: "".into(),
            access_count: 15,
            decay_score: 1.0,
        }];
        engine.tick_decay(&mut memories);
        assert!(memories[0].decay_score < 1.0);
    }

    #[test]
    fn test_promote_demote() {
        let engine = ArchivalEngine::new();
        let mut memories = vec![ArchivalEntry {
            id: 1,
            tier: "cold".into(),
            content: "".into(),
            access_count: 15,
            decay_score: 0.9,
        }];
        engine.promote_demote(&mut memories);
        assert_eq!(memories[0].tier, "hot");
    }

    #[test]
    fn test_prune() {
        let engine = ArchivalEngine::new();
        let mut memories: Vec<ArchivalEntry> = (0..10)
            .map(|i| ArchivalEntry {
                id: i,
                tier: "archived".into(),
                content: "".into(),
                access_count: 0,
                decay_score: 0.0,
            })
            .collect();
        engine.prune_archived(&mut memories, 3);
        assert_eq!(memories.len(), 3);
    }
}
