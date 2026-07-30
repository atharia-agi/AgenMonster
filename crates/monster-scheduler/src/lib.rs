//! Scheduler — cron-like job scheduling.

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledJob {
    pub id: String,
    pub name: String,
    pub interval_secs: u64,
    pub enabled: bool,
    pub last_run: Option<String>,
}

pub struct Scheduler {
    jobs: RwLock<Vec<ScheduledJob>>,
}

impl Scheduler {
    pub fn new() -> Self {
        Self {
            jobs: RwLock::new(vec![
                ScheduledJob {
                    id: "evolver".into(),
                    name: "Daily Evolver".into(),
                    interval_secs: 86400,
                    enabled: true,
                    last_run: None,
                },
                ScheduledJob {
                    id: "consolidation".into(),
                    name: "Memory Consolidation".into(),
                    interval_secs: 3600,
                    enabled: true,
                    last_run: None,
                },
                ScheduledJob {
                    id: "telemetry_flush".into(),
                    name: "Telemetry Flush".into(),
                    interval_secs: 300,
                    enabled: true,
                    last_run: None,
                },
                ScheduledJob {
                    id: "energy_regen".into(),
                    name: "Energy Regen".into(),
                    interval_secs: 120,
                    enabled: true,
                    last_run: None,
                },
                ScheduledJob {
                    id: "attention_grab".into(),
                    name: "Attention Grab".into(),
                    interval_secs: 600,
                    enabled: true,
                    last_run: None,
                },
            ]),
        }
    }

    pub async fn snapshot(&self) -> Vec<ScheduledJob> {
        self.jobs.read().await.clone()
    }

    pub async fn is_due(&self, job: &ScheduledJob) -> bool {
        if !job.enabled {
            return false;
        }
        match &job.last_run {
            None => true,
            Some(last) => {
                let Ok(t) = last.parse::<chrono::DateTime<chrono::Utc>>() else {
                    return true;
                };
                (chrono::Utc::now() - t).num_seconds() >= job.interval_secs as i64
            }
        }
    }

    pub async fn fire_now(&self, id: &str) -> anyhow::Result<()> {
        let mut jobs = self.jobs.write().await;
        if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
            job.last_run = Some(chrono::Utc::now().to_rfc3339());
        }
        Ok(())
    }
}
