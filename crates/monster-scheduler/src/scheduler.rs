//! Scheduler — cron-like job scheduling with tick-based execution.

use std::collections::HashMap;

pub struct Scheduler {
    jobs: HashMap<String, SchedulerJob>,
    tick_count: u64,
}

pub struct SchedulerJob {
    pub name: String,
    pub interval_ticks: u64,
    pub last_run_tick: u64,
    pub enabled: bool,
    pub oneshot: bool,
}

impl Scheduler {
    pub fn new() -> Self {
        Self { jobs: HashMap::new(), tick_count: 0 }
    }

    pub fn add_job(&mut self, name: &str, interval_ticks: u64) {
        self.jobs.insert(name.to_string(), SchedulerJob {
            name: name.to_string(),
            interval_ticks,
            last_run_tick: 0,
            enabled: true,
            oneshot: false,
        });
    }

    pub fn add_oneshot(&mut self, name: &str, delay_ticks: u64) {
        self.jobs.insert(name.to_string(), SchedulerJob {
            name: name.to_string(),
            interval_ticks: delay_ticks,
            last_run_tick: self.tick_count,
            enabled: true,
            oneshot: true,
        });
    }

    pub fn remove_job(&mut self, name: &str) {
        self.jobs.remove(name);
    }

    pub fn enable_job(&mut self, name: &str) -> bool {
        self.jobs.get_mut(name).map(|j| { j.enabled = true; true }).unwrap_or(false)
    }

    pub fn disable_job(&mut self, name: &str) -> bool {
        self.jobs.get_mut(name).map(|j| { j.enabled = false; true }).unwrap_or(false)
    }

    pub fn tick(&mut self) -> Vec<String> {
        self.tick_count += 1;
        let mut due = Vec::new();

        for job in self.jobs.values_mut() {
            if !job.enabled { continue; }
            let elapsed = self.tick_count.saturating_sub(job.last_run_tick);
            if elapsed >= job.interval_ticks {
                job.last_run_tick = self.tick_count;
                due.push(job.name.clone());
                if job.oneshot {
                    job.enabled = false;
                }
            }
        }

        due
    }

    pub fn job_count(&self) -> usize { self.jobs.len() }
    pub fn enabled_count(&self) -> usize { self.jobs.values().filter(|j| j.enabled).count() }
    pub fn tick_count(&self) -> u64 { self.tick_count }

    pub fn next_due(&self) -> Option<(String, u64)> {
        self.jobs.values()
            .filter(|j| j.enabled)
            .map(|j| {
                let remaining = j.interval_ticks.saturating_sub(
                    self.tick_count.saturating_sub(j.last_run_tick)
                );
                (j.name.clone(), remaining)
            })
            .min_by_key(|(_, r)| *r)
    }
}

impl Default for Scheduler {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scheduler_tick() {
        let mut sched = Scheduler::new();
        sched.add_job("heartbeat", 3);
        sched.add_job("cleanup", 10);

        let due = sched.tick(); // tick 1
        assert!(due.is_empty());

        let due = sched.tick(); // tick 2
        assert!(due.is_empty());

        let due = sched.tick(); // tick 3
        assert!(due.contains(&"heartbeat".to_string()));
    }

    #[test]
    fn test_oneshot() {
        let mut sched = Scheduler::new();
        sched.add_oneshot("delayed", 2);
        sched.tick(); // tick 1
        let due = sched.tick(); // tick 2
        assert!(due.contains(&"delayed".to_string()));
        // Should not fire again
        let due = sched.tick(); // tick 3
        assert!(!due.contains(&"delayed".to_string()));
    }

    #[test]
    fn test_next_due() {
        let mut sched = Scheduler::new();
        sched.add_job("a", 5);
        sched.add_job("b", 10);
        let (name, _) = sched.next_due().unwrap();
        assert_eq!(name, "a");
    }
}
