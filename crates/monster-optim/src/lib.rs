//! Optimization utilities — memory pooling, batch processing,
//! frame deduplication, and other performance helpers.

use std::collections::HashMap;
use tokio::sync::RwLock;

/// Frame deduplication cache — skips re-rendering identical frames.
pub struct FrameDedup {
    cache: RwLock<HashMap<String, Vec<u8>>>,
    max_entries: usize,
}

impl FrameDedup {
    pub fn new(max_entries: usize) -> Self {
        Self { cache: RwLock::new(HashMap::new()), max_entries }
    }

    pub async fn get_or_render<F>(&self, key: &str, render: F) -> Vec<u8>
    where F: std::future::Future<Output = Vec<u8>> {
        {
            let cache = self.cache.read().await;
            if let Some(frame) = cache.get(key) {
                return frame.clone();
            }
        }
        let frame = render.await;
        let mut cache = self.cache.write().await;
        if cache.len() >= self.max_entries {
            let oldest = cache.keys().next().cloned();
            if let Some(k) = oldest { cache.remove(&k); }
        }
        cache.insert(key.to_string(), frame.clone());
        frame
    }

    pub async fn clear(&self) {
        self.cache.write().await.clear();
    }
}

/// Batch processor — collects items and processes them in chunks.
pub struct BatchProcessor<T> {
    buffer: Vec<T>,
    batch_size: usize,
}

impl<T> BatchProcessor<T> {
    pub fn new(batch_size: usize) -> Self {
        Self { buffer: Vec::new(), batch_size }
    }

    pub fn push(&mut self, item: T) -> bool {
        self.buffer.push(item);
        self.buffer.len() >= self.batch_size
    }

    pub fn drain(&mut self) -> Vec<T> {
        std::mem::take(&mut self.buffer)
    }

    pub fn len(&self) -> usize { self.buffer.len() }
    pub fn is_empty(&self) -> bool { self.buffer.is_empty() }
}

/// Memory pool — pre-allocated buffer pool for hot paths.
pub struct MemPool {
    pools: HashMap<usize, Vec<Vec<u8>>>,
    max_per_size: usize,
}

impl MemPool {
    pub fn new(max_per_size: usize) -> Self {
        Self { pools: HashMap::new(), max_per_size }
    }

    pub fn get(&mut self, size: usize) -> Vec<u8> {
        if let Some(pool) = self.pools.get_mut(&size) {
            if let Some(buf) = pool.pop() { return buf; }
        }
        vec![0u8; size]
    }

    pub fn put(&mut self, buf: Vec<u8>) {
        let size = buf.len();
        let pool = self.pools.entry(size).or_insert_with(Vec::new);
        if pool.len() < self.max_per_size {
            pool.push(buf);
        }
    }
}
