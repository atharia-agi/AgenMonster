//! Monitor — runtime statistics and health checks.

pub struct Monitor {
    pub start_time: std::time::Instant,
    pub ticks: u64,
    pub energy_spent: u64,
    pub skills_learned: u32,
    pub llm_calls: u64,
    pub errors: u64,
    pub memories_stored: u64,
    pub tool_calls: u64,
}

impl Monitor {
    pub fn new() -> Self {
        Self {
            start_time: std::time::Instant::now(),
            ticks: 0,
            energy_spent: 0,
            skills_learned: 0,
            llm_calls: 0,
            errors: 0,
            memories_stored: 0,
            tool_calls: 0,
        }
    }

    pub fn tick(&mut self) {
        self.ticks += 1;
    }
    pub fn record_llm_call(&mut self) {
        self.llm_calls += 1;
    }
    pub fn record_error(&mut self) {
        self.errors += 1;
    }
    pub fn record_tool_call(&mut self) {
        self.tool_calls += 1;
    }
    pub fn record_skill_learned(&mut self) {
        self.skills_learned += 1;
    }
    pub fn record_memory_stored(&mut self) {
        self.memories_stored += 1;
    }

    pub fn uptime_secs(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }

    pub fn ticks_per_second(&self) -> f64 {
        let elapsed = self.uptime_secs() as f64;
        if elapsed == 0.0 {
            return 0.0;
        }
        self.ticks as f64 / elapsed
    }

    pub fn health_check(&self) -> HealthReport {
        HealthReport {
            uptime_secs: self.uptime_secs(),
            ticks: self.ticks,
            ticks_per_second: self.ticks_per_second(),
            llm_calls: self.llm_calls,
            errors: self.errors,
            error_rate: if self.llm_calls > 0 {
                self.errors as f32 / self.llm_calls as f32
            } else {
                0.0
            },
            memories_stored: self.memories_stored,
            tool_calls: self.tool_calls,
            skills_learned: self.skills_learned,
        }
    }

    pub fn snapshot(&self) -> MonitorSnapshot {
        MonitorSnapshot {
            uptime_secs: self.uptime_secs(),
            ticks: self.ticks,
            energy_spent: self.energy_spent,
            skills_learned: self.skills_learned,
            llm_calls: self.llm_calls,
            errors: self.errors,
            memories_stored: self.memories_stored,
            tool_calls: self.tool_calls,
        }
    }
}

pub struct HealthReport {
    pub uptime_secs: u64,
    pub ticks: u64,
    pub ticks_per_second: f64,
    pub llm_calls: u64,
    pub errors: u64,
    pub error_rate: f32,
    pub memories_stored: u64,
    pub tool_calls: u64,
    pub skills_learned: u32,
}

pub struct MonitorSnapshot {
    pub uptime_secs: u64,
    pub ticks: u64,
    pub energy_spent: u64,
    pub skills_learned: u32,
    pub llm_calls: u64,
    pub errors: u64,
    pub memories_stored: u64,
    pub tool_calls: u64,
}

impl Default for Monitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monitor() {
        let mut m = Monitor::new();
        m.tick();
        m.record_llm_call();
        m.record_tool_call();
        let snap = m.snapshot();
        assert_eq!(snap.ticks, 1);
        assert_eq!(snap.llm_calls, 1);
        assert_eq!(snap.tool_calls, 1);
    }

    #[test]
    fn test_health_check() {
        let mut m = Monitor::new();
        m.tick();
        let health = m.health_check();
        assert_eq!(health.ticks, 1);
        assert!(health.error_rate >= 0.0);
    }
}
