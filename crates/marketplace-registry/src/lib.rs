//! Marketplace registry HTTP server — axum + SQLite.
//! CRUD for signed skill bundles, star ratings, search, health checks.

use axum::{
    extract::Path,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillBundle {
    pub id: String,
    pub version: String,
    pub author: String,
    pub author_pubkey: String,
    pub signature_b64: String,
    pub description: String,
    pub body_markdown: String,
    pub changelog: String,
    pub downloads: u64,
    pub stars: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillIndex {
    pub id: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub stars: u64,
}

pub struct Registry {
    pub db: std::sync::Mutex<Connection>,
}

impl Registry {
    pub fn open(path: &str) -> anyhow::Result<Self> {
        let db = Connection::open(path)?;
        db.execute_batch(
            "CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            version TEXT,
            author TEXT,
            author_pubkey TEXT,
            signature_b64 TEXT,
            description TEXT,
            body_markdown TEXT,
            changelog TEXT,
            downloads INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 0
        );",
        )?;
        Ok(Self {
            db: std::sync::Mutex::new(db),
        })
    }

    pub fn index(&self) -> anyhow::Result<Vec<SkillIndex>> {
        let db = self.db.lock().unwrap();
        let mut stmt = db.prepare(
            "SELECT id, version, author, description, stars FROM skills ORDER BY stars DESC",
        )?;
        let rows = stmt.query_map([], |row: &rusqlite::Row| {
            Ok(SkillIndex {
                id: row.get(0)?,
                version: row.get(1)?,
                author: row.get(2)?,
                description: row.get(3)?,
                stars: row.get(4)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn get(&self, id: &str) -> anyhow::Result<Option<SkillBundle>> {
        let db = self.db.lock().unwrap();
        let mut stmt = db.prepare(
            "SELECT id, version, author, author_pubkey, signature_b64, description, body_markdown, changelog, downloads, stars
             FROM skills WHERE id = ?1"
        )?;
        let mut rows = stmt.query_map([id], |row: &rusqlite::Row| {
            Ok(SkillBundle {
                id: row.get(0)?,
                version: row.get(1)?,
                author: row.get(2)?,
                author_pubkey: row.get(3)?,
                signature_b64: row.get(4)?,
                description: row.get(5)?,
                body_markdown: row.get(6)?,
                changelog: row.get(7)?,
                downloads: row.get(8)?,
                stars: row.get(9)?,
            })
        })?;
        rows.next().transpose().map_err(Into::into)
    }

    pub fn upsert(&self, skill: &SkillBundle) -> anyhow::Result<()> {
        let db = self.db.lock().unwrap();
        db.execute(
            "INSERT OR REPLACE INTO skills (id, version, author, author_pubkey, signature_b64, description, body_markdown, changelog, downloads, stars)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                skill.id, skill.version, skill.author, skill.author_pubkey,
                skill.signature_b64, skill.description, skill.body_markdown,
                skill.changelog, skill.downloads, skill.stars
            ],
        )?;
        Ok(())
    }

    pub fn star(&self, id: &str) -> anyhow::Result<()> {
        let db = self.db.lock().unwrap();
        db.execute("UPDATE skills SET stars = stars + 1 WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn search(&self, q: &str) -> anyhow::Result<Vec<SkillIndex>> {
        let db = self.db.lock().unwrap();
        let pattern = format!("%{q}%");
        let mut stmt = db.prepare(
            "SELECT id, version, author, description, stars FROM skills
             WHERE id LIKE ?1 OR description LIKE ?1 OR author LIKE ?1
             ORDER BY stars DESC LIMIT 20",
        )?;
        let rows = stmt.query_map(rusqlite::params![pattern], |row: &rusqlite::Row| {
            Ok(SkillIndex {
                id: row.get(0)?,
                version: row.get(1)?,
                author: row.get(2)?,
                description: row.get(3)?,
                stars: row.get(4)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }
}

pub fn router(reg: Arc<Registry>) -> Router {
    let reg2 = reg.clone();
    let reg3 = reg.clone();
    let reg4 = reg.clone();
    let reg5 = reg.clone();
    let reg6 = reg.clone();

    Router::new()
        .route(
            "/v1/healthz",
            get(|| async { Json(serde_json::json!({ "ok": true })) }),
        )
        .route(
            "/v1/index",
            get(move || async move { Json(reg2.index().unwrap_or_default()) }),
        )
        .route(
            "/v1/skill/:id",
            get(move |Path(id): Path<String>| {
                let reg = reg3.clone();
                async move {
                    match reg.get(&id).unwrap_or(None) {
                        Some(s) => Ok(Json(s)),
                        None => Err(StatusCode::NOT_FOUND),
                    }
                }
            }),
        )
        .route(
            "/v1/skill",
            post(move |Json(s): Json<SkillBundle>| async move {
                let reg = reg4.clone();
                if s.signature_b64.len() < 10 {
                    return Err::<StatusCode, _>(StatusCode::UNAUTHORIZED);
                }
                reg.upsert(&s).unwrap();
                Ok(StatusCode::CREATED)
            }),
        )
        .route(
            "/v1/skill/:id/star",
            post(move |Path(id): Path<String>| async move {
                let reg = reg5.clone();
                reg.star(&id).unwrap();
                Ok::<_, StatusCode>(StatusCode::OK)
            }),
        )
        .route(
            "/v1/search",
            get(
                move |axum::extract::Query(params): axum::extract::Query<
                    HashMap<String, String>,
                >| {
                    let reg = reg6.clone();
                    async move {
                        let q = params.get("q").map(|s| s.as_str()).unwrap_or("");
                        Json(reg.search(q).unwrap_or_default())
                    }
                },
            ),
        )
        .layer(CorsLayer::permissive())
}
