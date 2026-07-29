//! Memory decay — gradual salience reduction for unaccessed memories.

use super::MemorySubsystem;

impl MemorySubsystem {
    pub async fn apply_decay(&self, rate: f32) -> anyhow::Result<u64> {
        let changed = self.db.execute(
            "UPDATE memories SET decay_score = MAX(0.0, decay_score - ?1) WHERE decay_score > 0.0",
            rusqlite::params![rate],
        )?;
        Ok(changed as u64)
    }

    pub async fn boost_score(&self, id: u64, amount: f32) -> anyhow::Result<()> {
        self.db.execute(
            "UPDATE memories SET decay_score = MIN(1.0, decay_score + ?1) WHERE id = ?2",
            rusqlite::params![amount, id],
        )?;
        Ok(())
    }
}
