//! Energy economy — atomic energy bar preventing runaway evolution loops.
//! Regenerates over time, spent on LLM calls, tool dispatch, evolution.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyPolicy {
    pub max_energy: u32,
    pub regen_per_hour: f32,
    pub cost_per_llm_call: u32,
    pub cost_per_tool_dispatch: u32,
    pub cost_per_evo_attempt: u32,
    pub cost_per_skill_write: u32,
}

impl Default for EnergyPolicy {
    fn default() -> Self {
        Self {
            max_energy: 1000,
            regen_per_hour: 25.0,
            cost_per_llm_call: 5,
            cost_per_tool_dispatch: 1,
            cost_per_evo_attempt: 50,
            cost_per_skill_write: 20,
        }
    }
}

pub struct Energy {
    current: AtomicU64,
    last_regen: Mutex<DateTime<Utc>>,
    policy: EnergyPolicy,
}

impl Energy {
    pub fn new(policy: EnergyPolicy) -> Self {
        Self {
            current: AtomicU64::new(policy.max_energy as u64),
            last_regen: Mutex::new(Utc::now()),
            policy,
        }
    }

    pub async fn tick_regen(&self) -> u32 {
        let mut g = self.last_regen.lock().await;
        let now = Utc::now();
        let elapsed = now - *g;
        *g = now;
        let hours = elapsed.num_seconds() as f32 / 3600.0;
        let regen = (hours * self.policy.regen_per_hour) as u32;
        let before = self.current.load(Ordering::Relaxed);
        let after = (before + regen as u64).min(self.policy.max_energy as u64);
        self.current.store(after, Ordering::Relaxed);
        after as u32
    }

    pub fn current(&self) -> u32 {
        self.current.load(Ordering::Relaxed) as u32
    }

    pub fn max(&self) -> u32 {
        self.policy.max_energy
    }

    pub fn as_percentage(&self) -> f32 {
        self.current.load(Ordering::Relaxed) as f32 / self.policy.max_energy as f32 * 100.0
    }

    pub fn try_spend(&self, cost: u32) -> bool {
        loop {
            let cur = self.current.load(Ordering::Relaxed);
            if cur < cost as u64 { return false; }
            if self.current.compare_exchange(cur, cur - cost as u64, Ordering::SeqCst, Ordering::Relaxed).is_ok() {
                return true;
            }
        }
    }

    pub fn spend_or_warn(&self, label: &str, cost: u32) -> bool {
        if self.try_spend(cost) { true }
        else { tracing::warn!(label, cost, "insufficient energy"); false }
    }
}
