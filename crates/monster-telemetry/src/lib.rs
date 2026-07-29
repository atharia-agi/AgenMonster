//! Telemetry — metrics, counters, event tracking.

use std::sync::atomic::{AtomicU64, Ordering};

pub struct Telemetry {
    bus_events: AtomicU64,
    llm_calls: AtomicU64,
    tool_calls: AtomicU64,
    evolution_attempts: AtomicU64,
    memory_writes: AtomicU64,
    memory_reads: AtomicU64,
    started_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TelemetrySnapshot {
    pub bus_events_total: u64,
    pub llm_calls_total: u64,
    pub tool_calls_total: u64,
    pub evolution_attempts: u64,
    pub memory_writes: u64,
    pub memory_reads: u64,
    pub started_at: String,
}

impl Telemetry {
    pub fn new() -> Self {
        Self {
            bus_events: AtomicU64::new(0),
            llm_calls: AtomicU64::new(0),
            tool_calls: AtomicU64::new(0),
            evolution_attempts: AtomicU64::new(0),
            memory_writes: AtomicU64::new(0),
            memory_reads: AtomicU64::new(0),
            started_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn record_llm_call(&self) { self.llm_calls.fetch_add(1, Ordering::Relaxed); }
    pub fn record_tool_call(&self) { self.tool_calls.fetch_add(1, Ordering::Relaxed); }
    pub fn record_evolution(&self) { self.evolution_attempts.fetch_add(1, Ordering::Relaxed); }
    pub fn record_memory_write(&self) { self.memory_writes.fetch_add(1, Ordering::Relaxed); }
    pub fn record_memory_read(&self) { self.memory_reads.fetch_add(1, Ordering::Relaxed); }

    pub fn snapshot(&self) -> TelemetrySnapshot {
        TelemetrySnapshot {
            bus_events_total: self.bus_events.load(Ordering::Relaxed),
            llm_calls_total: self.llm_calls.load(Ordering::Relaxed),
            tool_calls_total: self.tool_calls.load(Ordering::Relaxed),
            evolution_attempts: self.evolution_attempts.load(Ordering::Relaxed),
            memory_writes: self.memory_writes.load(Ordering::Relaxed),
            memory_reads: self.memory_reads.load(Ordering::Relaxed),
            started_at: self.started_at.clone(),
        }
    }
}
