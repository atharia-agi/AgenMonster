//! Memory block — individual memory entries.

pub struct MemoryBlock {
    pub id: u64,
    pub tier: MemoryTier,
    pub content: String,
    pub embedding: Vec<f32>,
    pub access_count: u32,
    pub created_at: u64,
    pub last_accessed: u64,
    pub decay_score: f32,
}

#[derive(Debug)]
pub enum MemoryTier {
    Hot,
    Warm,
    Cold,
    Archived,
}

impl MemoryBlock {
    pub fn new(id: u64, tier: MemoryTier, content: &str) -> Self {
        Self {
            id,
            tier,
            content: content.to_string(),
            embedding: Vec::new(),
            access_count: 0,
            created_at: 0,
            last_accessed: 0,
            decay_score: 1.0,
        }
    }

    pub fn access(&mut self) {
        self.access_count += 1;
        self.decay_score = (self.decay_score + 0.1).min(1.0);
    }

    pub fn decay(&mut self, factor: f32) {
        self.decay_score = (self.decay_score * factor).max(0.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_block() {
        let mut block = MemoryBlock::new(1, MemoryTier::Hot, "test memory");
        assert_eq!(block.content, "test memory");
        block.access();
        assert_eq!(block.access_count, 1);
        assert!(block.decay_score > 0.9);
        block.decay(0.5);
        assert!(block.decay_score < 1.0);
    }
}
