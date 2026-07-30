//! Memory subsystem — 3-tier memory (hot/warm/cold) with SQLite backend.
//!
//! Real vector embeddings using TF-IDF (no external ML crate needed).
//! Memories decay over time, get promoted/demoted between tiers.

pub mod archival;
pub mod block;
pub mod decay;
pub mod embedding;
pub mod graph;
pub mod recall;

use block::{MemoryBlock, MemoryTier};
use embedding::EmbeddingEngine;
use rusqlite::Connection;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct MemorySubsystem {
    db: Arc<Connection>,
    block_cache: RwLock<Vec<MemoryBlock>>,
    embedder: EmbeddingEngine,
}

impl MemorySubsystem {
    pub async fn boot(db_path: &str) -> anyhow::Result<Self> {
        let db = Connection::open(db_path)?;
        db.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY,
                tier TEXT,
                content TEXT,
                embedding BLOB,
                access_count INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT 0,
                last_accessed INTEGER DEFAULT 0,
                decay_score REAL DEFAULT 1.0,
                tags TEXT DEFAULT ''
            );
            CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
            CREATE INDEX IF NOT EXISTS idx_memories_decay ON memories(decay_score DESC);
            CREATE INDEX IF NOT EXISTS idx_memories_content ON memories(content);
        ",
        )?;
        // Create FTS5 virtual table for full-text search (if not exists)
        let fts_result = db.execute_batch(
            "CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, tier, tags, content='memories', content_rowid='id');"
        );
        if fts_result.is_err() {
            // FTS5 not available in this SQLite build, fall back to LIKE
            tracing::warn!("FTS5 not available, using LIKE search fallback");
        }
        Ok(Self {
            db: Arc::new(db),
            block_cache: RwLock::new(Vec::new()),
            embedder: EmbeddingEngine::new(),
        })
    }

    pub async fn ingest(&self, block: MemoryBlock) -> anyhow::Result<()> {
        let tier_str = format!("{:?}", block.tier);
        let embedding_bytes = embedding::vec_to_bytes(&block.embedding);
        self.db.execute(
            "INSERT OR REPLACE INTO memories (id, tier, content, embedding, access_count, created_at, last_accessed, decay_score)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                block.id, tier_str, block.content, embedding_bytes,
                block.access_count, block.created_at, block.last_accessed, block.decay_score
            ],
        )?;
        // Sync with FTS5 (ignore errors if FTS5 not available)
        let _ = self.db.execute(
            "INSERT OR REPLACE INTO memories_fts(rowid, content, tier, tags) VALUES (?1, ?2, ?3, '')",
            rusqlite::params![block.id, block.content, tier_str],
        );
        self.block_cache.write().await.push(block);
        Ok(())
    }

    /// Ingest with automatic embedding generation.
    pub async fn ingest_with_embedding(&self, block: MemoryBlock) -> anyhow::Result<()> {
        let mut block = block;
        block.embedding = self.embedder.embed(&block.content);
        self.ingest(block).await
    }

    pub async fn recall(&self, query: &str, limit: usize) -> anyhow::Result<Vec<MemoryBlock>> {
        // Try semantic search first (vector similarity) — only if memories have embeddings
        let query_embedding = self.embedder.embed(query);
        if !query_embedding.is_empty() {
            let all = self.get_all_memories().await?;
            let has_embeddings = all.iter().any(|m| !m.embedding.is_empty());
            if has_embeddings {
                let mut scored: Vec<(MemoryBlock, f32)> = all
                    .into_iter()
                    .filter_map(|m| {
                        if m.embedding.is_empty() {
                            return None; // skip memories without embeddings
                        }
                        let similarity =
                            embedding::cosine_similarity(&query_embedding, &m.embedding);
                        if similarity > 0.05 {
                            Some((m, similarity))
                        } else {
                            None
                        }
                    })
                    .collect();
                scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
                let results: Vec<MemoryBlock> =
                    scored.into_iter().take(limit).map(|(m, _)| m).collect();
                if !results.is_empty() {
                    return Ok(results);
                }
            }
        }

        // Fallback to LIKE search
        let pattern = format!("%{query}%");
        let mut stmt = self.db.prepare(
            "SELECT id, tier, content, access_count, created_at, last_accessed, decay_score
             FROM memories WHERE content LIKE ?1 ORDER BY decay_score DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![pattern, limit as i64], |row| {
            let tier_str: String = row.get(1)?;
            let tier = match tier_str.as_str() {
                "Hot" => MemoryTier::Hot,
                "Warm" => MemoryTier::Warm,
                "Cold" => MemoryTier::Cold,
                _ => MemoryTier::Archived,
            };
            Ok(MemoryBlock {
                id: row.get(0)?,
                tier,
                content: row.get(2)?,
                embedding: vec![],
                access_count: row.get(3)?,
                created_at: row.get(4)?,
                last_accessed: row.get(5)?,
                decay_score: row.get(6)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    /// Full-text search using FTS5 (falls back to LIKE if FTS5 unavailable).
    pub async fn fts_search(&self, query: &str, limit: usize) -> anyhow::Result<Vec<MemoryBlock>> {
        // Try FTS5 first
        let fts_result = self.db.prepare(
            "SELECT m.id, m.tier, m.content, m.access_count, m.created_at, m.last_accessed, m.decay_score
             FROM memories_fts f
             JOIN memories m ON m.id = f.rowid
             WHERE memories_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2"
        );

        match fts_result {
            Ok(mut stmt) => {
                let rows = stmt.query_map(rusqlite::params![query, limit as i64], |row| {
                    let tier_str: String = row.get(1)?;
                    let tier = match tier_str.as_str() {
                        "Hot" => MemoryTier::Hot,
                        "Warm" => MemoryTier::Warm,
                        "Cold" => MemoryTier::Cold,
                        _ => MemoryTier::Archived,
                    };
                    Ok(MemoryBlock {
                        id: row.get(0)?,
                        tier,
                        content: row.get(2)?,
                        embedding: vec![],
                        access_count: row.get(3)?,
                        created_at: row.get(4)?,
                        last_accessed: row.get(5)?,
                        decay_score: row.get(6)?,
                    })
                })?;
                let results: Vec<MemoryBlock> = rows.filter_map(|r| r.ok()).collect();
                if !results.is_empty() {
                    return Ok(results);
                }
            }
            Err(_) => {} // FTS5 not available, fall through
        }

        // Fallback to LIKE
        self.recall(query, limit).await
    }

    /// Consolidate memories: hot → warm → cold based on access patterns.
    pub async fn consolidate(&self) -> anyhow::Result<u64> {
        let mut changed: u64 = 0;
        // Demote hot memories with low access to warm
        changed += self.db.execute(
            "UPDATE memories SET tier = 'Warm' WHERE tier = 'Hot' AND access_count < 3 AND decay_score < 0.5",
            [],
        )? as u64;
        // Demote warm memories with very low access to cold
        changed += self.db.execute(
            "UPDATE memories SET tier = 'Cold' WHERE tier = 'Warm' AND access_count < 2 AND decay_score < 0.3",
            [],
        )? as u64;
        // Archive cold memories with zero decay
        changed += self.db.execute(
            "UPDATE memories SET tier = 'Archived' WHERE tier = 'Cold' AND decay_score <= 0.0",
            [],
        )? as u64;
        Ok(changed)
    }

    pub async fn decay_tick(&self) -> anyhow::Result<u64> {
        let changed = self.db.execute(
            "UPDATE memories SET decay_score = MAX(0.0, decay_score - 0.01)
             WHERE decay_score > 0.0",
            [],
        )?;
        Ok(changed as u64)
    }

    /// Get all memories from the database.
    async fn get_all_memories(&self) -> anyhow::Result<Vec<MemoryBlock>> {
        let mut stmt = self.db.prepare(
            "SELECT id, tier, content, access_count, created_at, last_accessed, decay_score
             FROM memories ORDER BY decay_score DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let tier_str: String = row.get(1)?;
            let tier = match tier_str.as_str() {
                "Hot" => MemoryTier::Hot,
                "Warm" => MemoryTier::Warm,
                "Cold" => MemoryTier::Cold,
                _ => MemoryTier::Archived,
            };
            Ok(MemoryBlock {
                id: row.get(0)?,
                tier,
                content: row.get(2)?,
                embedding: vec![],
                access_count: row.get(3)?,
                created_at: row.get(4)?,
                last_accessed: row.get(5)?,
                decay_score: row.get(6)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    /// Get memory count by tier.
    pub async fn tier_counts(&self) -> anyhow::Result<TierCounts> {
        let mut counts = TierCounts::default();
        let mut stmt = self
            .db
            .prepare("SELECT tier, COUNT(*) FROM memories GROUP BY tier")?;
        let rows = stmt.query_map([], |row| {
            let tier: String = row.get(0)?;
            let count: i64 = row.get(1)?;
            Ok((tier, count))
        })?;
        for row in rows.flatten() {
            match row.0.as_str() {
                "Hot" => counts.hot = row.1 as usize,
                "Warm" => counts.warm = row.1 as usize,
                "Cold" => counts.cold = row.1 as usize,
                _ => counts.archived += row.1 as usize,
            }
        }
        Ok(counts)
    }

    pub fn stats(&self) -> MemoryStats {
        let count: i64 = self
            .db
            .query_row("SELECT COUNT(*) FROM memories", [], |row| row.get(0))
            .unwrap_or(0);
        MemoryStats {
            total_blocks: count as usize,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct TierCounts {
    pub hot: usize,
    pub warm: usize,
    pub cold: usize,
    pub archived: usize,
}

#[derive(Debug, Clone)]
pub struct MemoryStats {
    pub total_blocks: usize,
}
