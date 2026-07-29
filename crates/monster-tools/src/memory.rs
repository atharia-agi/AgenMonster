//! Memory handle — bridge between tools and monster-memory subsystem.

pub use monster_memory::block::{MemoryBlock, MemoryTier};
pub use monster_memory::MemorySubsystem;

use std::sync::Arc;
use tokio::sync::Mutex;

pub struct MemoryHandle {
    inner: Arc<Mutex<MemorySubsystem>>,
    next_id: std::sync::atomic::AtomicU64,
}

impl MemoryHandle {
    pub fn new(subsystem: MemorySubsystem) -> Self {
        Self {
            inner: Arc::new(Mutex::new(subsystem)),
            next_id: std::sync::atomic::AtomicU64::new(1),
        }
    }

    pub fn next_id(&self) -> u64 {
        self.next_id.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    }

    pub async fn ingest_with_embedding(&self, block: MemoryBlock) -> anyhow::Result<()> {
        let guard: &MemorySubsystem = &*self.inner.lock().await;
        guard.ingest_with_embedding(block).await
    }

    pub async fn recall(&self, query: &str, limit: usize) -> anyhow::Result<Vec<MemoryBlock>> {
        let guard: &MemorySubsystem = &*self.inner.lock().await;
        guard.recall(query, limit).await
    }

    pub async fn decay_tick(&self) -> anyhow::Result<u64> {
        let guard: &MemorySubsystem = &*self.inner.lock().await;
        guard.decay_tick().await
    }
}
