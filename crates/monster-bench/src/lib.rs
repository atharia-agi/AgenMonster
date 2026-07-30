//! Benchmark harness — runs 6 micro-benchmarks, records in SQLite,
//! detects regressions, generates report.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchResult {
    pub name: String,
    pub iterations: u32,
    pub mean_us: f64,
    pub p50_us: f64,
    pub p99_us: f64,
    pub std_dev_us: f64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Regression {
    pub name: String,
    pub baseline_us: f64,
    pub current_us: f64,
    pub change_pct: f64,
    pub severity: String,
}

pub struct BenchTracker {
    db: rusqlite::Connection,
}

impl BenchTracker {
    pub fn open(path: &std::path::Path) -> anyhow::Result<Self> {
        let db = rusqlite::Connection::open(path)?;
        db.execute_batch(
            "CREATE TABLE IF NOT EXISTS bench (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, iterations INTEGER, mean_us REAL,
            p50_us REAL, p99_us REAL, std_dev_us REAL, timestamp TEXT
        );",
        )?;
        Ok(Self { db })
    }

    pub fn record(&self, r: &BenchResult) -> anyhow::Result<()> {
        self.db.execute(
            "INSERT INTO bench (name, iterations, mean_us, p50_us, p99_us, std_dev_us, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                r.name,
                r.iterations,
                r.mean_us,
                r.p50_us,
                r.p99_us,
                r.std_dev_us,
                r.timestamp
            ],
        )?;
        Ok(())
    }

    pub fn history(&self, name: &str, limit: usize) -> anyhow::Result<Vec<BenchResult>> {
        let mut stmt = self.db.prepare(
            "SELECT name, iterations, mean_us, p50_us, p99_us, std_dev_us, timestamp
             FROM bench WHERE name = ?1 ORDER BY id DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![name, limit as i64], |row| {
            Ok(BenchResult {
                name: row.get(0)?,
                iterations: row.get(1)?,
                mean_us: row.get(2)?,
                p50_us: row.get(3)?,
                p99_us: row.get(4)?,
                std_dev_us: row.get(5)?,
                timestamp: row.get(6)?,
            })
        })?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn detect_regressions(&self, threshold_pct: f64) -> anyhow::Result<Vec<Regression>> {
        let names: Vec<String> = self
            .db
            .prepare("SELECT DISTINCT name FROM bench")?
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();
        let mut out = vec![];
        for name in names {
            let h = self.history(&name, 2)?;
            if h.len() >= 2 {
                let change = ((h[0].mean_us - h[1].mean_us) / h[1].mean_us) * 100.0;
                if change > threshold_pct {
                    out.push(Regression {
                        name,
                        baseline_us: h[1].mean_us,
                        current_us: h[0].mean_us,
                        change_pct: change,
                        severity: if change > 50.0 {
                            "critical"
                        } else if change > 20.0 {
                            "warning"
                        } else {
                            "info"
                        }
                        .into(),
                    });
                }
            }
        }
        Ok(out)
    }

    pub fn summary(&self) -> anyhow::Result<String> {
        let names: Vec<String> = self
            .db
            .prepare("SELECT DISTINCT name FROM bench")?
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();
        let mut lines = vec!["# Benchmark Summary".into(), "".into()];
        for name in &names {
            if let Some(r) = self.history(name, 1)?.first() {
                lines.push(format!(
                    "| {} | mean {:.1}μs | p99 {:.1}μs |",
                    r.name, r.mean_us, r.p99_us
                ));
            }
        }
        Ok(lines.join("\n"))
    }
}
