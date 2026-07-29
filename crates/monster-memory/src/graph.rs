//! Knowledge graph for memory — cognee-inspired relationship tracking.
//!
//! Memories can have typed edges (relates_to, caused_by, implements, etc.).
//! Graph traversal enables context-aware recall beyond simple similarity.

use rusqlite::Connection;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct MemoryEdge {
    pub from_id: i64,
    pub to_id: i64,
    pub relation: String,
    pub weight: f32,
    pub created_at: i64,
}

#[derive(Debug, Clone)]
pub struct GraphNode {
    pub id: i64,
    pub content: String,
    pub tier: String,
    pub edges_out: Vec<MemoryEdge>,
    pub edges_in: Vec<MemoryEdge>,
}

pub struct KnowledgeGraph {
    db: Arc<Connection>,
}

impl KnowledgeGraph {
    pub fn new(db: Arc<Connection>) -> Self {
        let _ = db.execute_batch("
            CREATE TABLE IF NOT EXISTS memory_edges (
                from_id INTEGER NOT NULL,
                to_id INTEGER NOT NULL,
                relation TEXT NOT NULL,
                weight REAL DEFAULT 1.0,
                created_at INTEGER DEFAULT 0,
                FOREIGN KEY (from_id) REFERENCES memories(id),
                FOREIGN KEY (to_id) REFERENCES memories(id),
                UNIQUE(from_id, to_id, relation)
            );
            CREATE INDEX IF NOT EXISTS idx_edges_from ON memory_edges(from_id);
            CREATE INDEX IF NOT EXISTS idx_edges_to ON memory_edges(to_id);
            CREATE INDEX IF NOT EXISTS idx_edges_relation ON memory_edges(relation);
        ");
        Self { db }
    }

    pub fn add_edge(&self, from_id: i64, to_id: i64, relation: &str, weight: f32) -> anyhow::Result<()> {
        let now = chrono::Utc::now().timestamp();
        self.db.execute(
            "INSERT OR REPLACE INTO memory_edges (from_id, to_id, relation, weight, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![from_id, to_id, relation, weight, now],
        )?;
        Ok(())
    }

    pub fn edges_from(&self, id: i64) -> anyhow::Result<Vec<MemoryEdge>> {
        let mut stmt = self.db.prepare(
            "SELECT from_id, to_id, relation, weight, created_at FROM memory_edges WHERE from_id = ?1"
        )?;
        let rows = stmt.query_map(rusqlite::params![id], |row| {
            Ok(MemoryEdge {
                from_id: row.get(0)?,
                to_id: row.get(1)?,
                relation: row.get(2)?,
                weight: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn edges_to(&self, id: i64) -> anyhow::Result<Vec<MemoryEdge>> {
        let mut stmt = self.db.prepare(
            "SELECT from_id, to_id, relation, weight, created_at FROM memory_edges WHERE to_id = ?1"
        )?;
        let rows = stmt.query_map(rusqlite::params![id], |row| {
            Ok(MemoryEdge {
                from_id: row.get(0)?,
                to_id: row.get(1)?,
                relation: row.get(2)?,
                weight: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn traverse(&self, start_id: i64, max_depth: usize) -> anyhow::Result<Vec<(i64, usize, String)>> {
        let mut visited = std::collections::HashSet::new();
        let mut result = Vec::new();
        let mut queue = std::collections::VecDeque::new();
        
        queue.push_back((start_id, 0usize));
        visited.insert(start_id);
        
        while let Some((current_id, depth)) = queue.pop_front() {
            if depth > max_depth { continue; }
            
            let out_edges = self.edges_from(current_id)?;
            for edge in &out_edges {
                if !visited.contains(&edge.to_id) {
                    visited.insert(edge.to_id);
                    result.push((edge.to_id, depth + 1, edge.relation.clone()));
                    queue.push_back((edge.to_id, depth + 1));
                }
            }
            
            let in_edges = self.edges_to(current_id)?;
            for edge in &in_edges {
                if !visited.contains(&edge.from_id) {
                    visited.insert(edge.from_id);
                    result.push((edge.from_id, depth + 1, edge.relation.clone()));
                    queue.push_back((edge.from_id, depth + 1));
                }
            }
        }
        
        Ok(result)
    }

    pub fn auto_extract_edges(&self, memory_id: i64, content: &str) -> anyhow::Result<Vec<MemoryEdge>> {
        let mut edges = Vec::new();
        let content_lower = content.to_lowercase();
        
        let implements_patterns = ["implements", "is part of", "belongs to", "contains"];
        for pattern in &implements_patterns {
            if content_lower.contains(pattern) {
                let related = self.find_memory_by_concept(content, pattern)?;
                if let Some(related_id) = related {
                    self.add_edge(memory_id, related_id, pattern, 0.8)?;
                    edges.push(MemoryEdge {
                        from_id: memory_id,
                        to_id: related_id,
                        relation: pattern.to_string(),
                        weight: 0.8,
                        created_at: chrono::Utc::now().timestamp(),
                    });
                }
            }
        }
        
        let depends_patterns = ["depends on", "requires", "needs", "uses"];
        for pattern in &depends_patterns {
            if content_lower.contains(pattern) {
                let related = self.find_memory_by_concept(content, pattern)?;
                if let Some(related_id) = related {
                    self.add_edge(memory_id, related_id, "depends_on", 0.7)?;
                    edges.push(MemoryEdge {
                        from_id: memory_id,
                        to_id: related_id,
                        relation: "depends_on".to_string(),
                        weight: 0.7,
                        created_at: chrono::Utc::now().timestamp(),
                    });
                }
            }
        }
        
        let caused_patterns = ["caused", "led to", "resulted in", "triggered"];
        for pattern in &caused_patterns {
            if content_lower.contains(pattern) {
                let related = self.find_memory_by_concept(content, pattern)?;
                if let Some(related_id) = related {
                    self.add_edge(memory_id, related_id, "caused_by", 0.9)?;
                    edges.push(MemoryEdge {
                        from_id: memory_id,
                        to_id: related_id,
                        relation: "caused_by".to_string(),
                        weight: 0.9,
                        created_at: chrono::Utc::now().timestamp(),
                    });
                }
            }
        }
        
        Ok(edges)
    }

    fn find_memory_by_concept(&self, content: &str, keyword: &str) -> anyhow::Result<Option<i64>> {
        let content_lower = content.to_lowercase();
        if let Some(pos) = content_lower.find(keyword) {
            let after = &content[pos + keyword.len()..];
            let words: Vec<&str> = after.split_whitespace().take(3).collect();
            let concept = words.join(" ");
            
            if !concept.is_empty() {
                let pattern = format!("%{concept}%");
                let result = self.db.query_row(
                    "SELECT id FROM memories WHERE content LIKE ?1 LIMIT 1",
                    rusqlite::params![pattern],
                    |row| row.get::<_, i64>(0),
                );
                return Ok(result.ok());
            }
        }
        Ok(None)
    }

    pub fn stats(&self) -> GraphStats {
        let edge_count: i64 = self.db
            .query_row("SELECT COUNT(*) FROM memory_edges", [], |row| row.get(0))
            .unwrap_or(0);
        let relation_counts: Vec<(String, i64)> = {
            let mut stmt = self.db.prepare("SELECT relation, COUNT(*) FROM memory_edges GROUP BY relation").unwrap();
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            }).unwrap();
            rows.filter_map(|r| r.ok()).collect()
        };
        GraphStats {
            total_edges: edge_count as usize,
            relations: relation_counts.into_iter().map(|(r, c)| (r, c as usize)).collect(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct GraphStats {
    pub total_edges: usize,
    pub relations: Vec<(String, usize)>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn test_db() -> Arc<Connection> {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch("
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
        ").unwrap();
        Arc::new(db)
    }

    #[test]
    fn test_add_and_retrieve_edges() {
        let db = test_db();
        let graph = KnowledgeGraph::new(db.clone());
        
        db.execute("INSERT INTO memories (id, tier, content) VALUES (1, 'Hot', 'Test memory 1')", []).unwrap();
        db.execute("INSERT INTO memories (id, tier, content) VALUES (2, 'Hot', 'Test memory 2')", []).unwrap();
        
        graph.add_edge(1, 2, "relates_to", 1.0).unwrap();
        
        let out = graph.edges_from(1).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].to_id, 2);
        assert_eq!(out[0].relation, "relates_to");
        
        let inc = graph.edges_to(2).unwrap();
        assert_eq!(inc.len(), 1);
        assert_eq!(inc[0].from_id, 1);
    }

    #[test]
    fn test_traverse() {
        let db = test_db();
        let graph = KnowledgeGraph::new(db.clone());
        
        db.execute("INSERT INTO memories (id, tier, content) VALUES (1, 'Hot', 'A')", []).unwrap();
        db.execute("INSERT INTO memories (id, tier, content) VALUES (2, 'Hot', 'B')", []).unwrap();
        db.execute("INSERT INTO memories (id, tier, content) VALUES (3, 'Hot', 'C')", []).unwrap();
        
        graph.add_edge(1, 2, "relates_to", 1.0).unwrap();
        graph.add_edge(2, 3, "relates_to", 1.0).unwrap();
        
        let related = graph.traverse(1, 2).unwrap();
        assert_eq!(related.len(), 2);
        assert!(related.iter().any(|(id, _, _)| *id == 2));
        assert!(related.iter().any(|(id, _, _)| *id == 3));
    }

    #[test]
    fn test_stats() {
        let db = test_db();
        let graph = KnowledgeGraph::new(db.clone());
        
        db.execute("INSERT INTO memories (id, tier, content) VALUES (1, 'Hot', 'A')", []).unwrap();
        db.execute("INSERT INTO memories (id, tier, content) VALUES (2, 'Hot', 'B')", []).unwrap();
        
        graph.add_edge(1, 2, "relates_to", 1.0).unwrap();
        graph.add_edge(2, 1, "caused_by", 0.8).unwrap();
        
        let stats = graph.stats();
        assert_eq!(stats.total_edges, 2);
        assert!(stats.relations.iter().any(|(r, c)| r == "relates_to" && *c == 1));
        assert!(stats.relations.iter().any(|(r, c)| r == "caused_by" && *c == 1));
    }
}
