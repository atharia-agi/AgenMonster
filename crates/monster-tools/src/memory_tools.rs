//! Memory tools — store, search, forget via MemorySubsystem.

use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct MemoryStoreTool {
    pub db: Arc<RwLock<Option<crate::memory::MemoryHandle>>>,
}

pub struct MemorySearchTool {
    pub db: Arc<RwLock<Option<crate::memory::MemoryHandle>>>,
}

pub struct MemoryForgetTool {
    pub db: Arc<RwLock<Option<crate::memory::MemoryHandle>>>,
}

use crate::memory;

impl MemoryStoreTool {
    pub fn new(db: Arc<RwLock<Option<memory::MemoryHandle>>>) -> Self {
        Self { db }
    }
    pub fn name(&self) -> &str {
        "memory_store"
    }
    pub fn description(&self) -> &str {
        "Store a memory. Content is auto-embedded for semantic search."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "content": { "type": "string", "description": "Memory content to store" },
                "tier": { "type": "string", "enum": ["hot", "warm", "cold"], "description": "Memory tier (default: hot)" }
            },
            "required": ["content"]
        })
    }
    pub async fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let content = args
            .get("content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("content is required"))?;
        let tier_str = args.get("tier").and_then(|v| v.as_str()).unwrap_or("hot");
        let tier = match tier_str {
            "warm" => memory::MemoryTier::Warm,
            "cold" => memory::MemoryTier::Cold,
            _ => memory::MemoryTier::Hot,
        };
        let db = self.db.read().await;
        if let Some(ref handle) = *db {
            let id = handle.next_id();
            let block = memory::MemoryBlock::new(id, tier, content);
            handle.ingest_with_embedding(block).await?;
            Ok(serde_json::json!({"stored": true, "id": id, "tier": tier_str}).to_string())
        } else {
            Ok(serde_json::json!({"stored": false, "error": "Memory not initialized"}).to_string())
        }
    }
}

impl MemorySearchTool {
    pub fn new(db: Arc<RwLock<Option<memory::MemoryHandle>>>) -> Self {
        Self { db }
    }
    pub fn name(&self) -> &str {
        "memory_search"
    }
    pub fn description(&self) -> &str {
        "Search memories by semantic similarity or keyword."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "query": { "type": "string", "description": "Search query" },
                "limit": { "type": "integer", "description": "Max results (default: 5)" }
            },
            "required": ["query"]
        })
    }
    pub async fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let query = args
            .get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("query is required"))?;
        let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(5) as usize;
        let db = self.db.read().await;
        if let Some(ref handle) = *db {
            let results: Vec<memory::MemoryBlock> = handle.recall(query, limit).await?;
            let items: Vec<serde_json::Value> = results
                .into_iter()
                .map(|m| {
                    serde_json::json!({
                        "id": m.id,
                        "content": m.content,
                        "tier": format!("{:?}", m.tier),
                        "decay_score": m.decay_score,
                    })
                })
                .collect();
            Ok(
                serde_json::json!({"query": query, "count": items.len(), "results": items})
                    .to_string(),
            )
        } else {
            Ok(serde_json::json!({"error": "Memory not initialized"}).to_string())
        }
    }
}

impl MemoryForgetTool {
    pub fn new(db: Arc<RwLock<Option<memory::MemoryHandle>>>) -> Self {
        Self { db }
    }
    pub fn name(&self) -> &str {
        "memory_forget"
    }
    pub fn description(&self) -> &str {
        "Decay all memories (reduce decay_score). High decay = forgotten."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "amount": { "type": "number", "description": "Decay amount per memory (default: 0.1)" }
            }
        })
    }
    pub async fn execute(&self, _args: &Value) -> anyhow::Result<String> {
        let db = self.db.read().await;
        if let Some(ref handle) = *db {
            let decayed: u64 = handle.decay_tick().await?;
            Ok(serde_json::json!({"decayed": decayed}).to_string())
        } else {
            Ok(serde_json::json!({"error": "Memory not initialized"}).to_string())
        }
    }
}
