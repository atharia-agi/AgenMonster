//! Telemetry — metrics collection, counters, gauges, histograms.

use std::collections::HashMap;

pub struct Telemetry {
    counters: HashMap<String, u64>,
    gauges: HashMap<String, f64>,
    histograms: HashMap<String, Vec<f64>>,
}

impl Telemetry {
    pub fn new() -> Self {
        Self {
            counters: HashMap::new(),
            gauges: HashMap::new(),
            histograms: HashMap::new(),
        }
    }

    pub fn increment(&mut self, key: &str) {
        *self.counters.entry(key.to_string()).or_insert(0) += 1;
    }

    pub fn increment_by(&mut self, key: &str, amount: u64) {
        *self.counters.entry(key.to_string()).or_insert(0) += amount;
    }

    pub fn set_gauge(&mut self, key: &str, value: f64) {
        self.gauges.insert(key.to_string(), value);
    }

    pub fn record_histogram(&mut self, key: &str, value: f64) {
        self.histograms.entry(key.to_string()).or_default().push(value);
    }

    pub fn get_counter(&self, key: &str) -> u64 {
        self.counters.get(key).copied().unwrap_or(0)
    }

    pub fn get_gauge(&self, key: &str) -> f64 {
        self.gauges.get(key).copied().unwrap_or(0.0)
    }

    pub fn histogram_stats(&self, key: &str) -> Option<HistogramStats> {
        let values = self.histograms.get(key)?;
        if values.is_empty() { return None; }
        let mut sorted = values.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let sum: f64 = sorted.iter().sum();
        let count = sorted.len();
        let min = sorted[0];
        let max = sorted[count - 1];
        let mean = sum / count as f64;
        let median = sorted[count / 2];
        let p95 = sorted[(count as f64 * 0.95) as usize];
        Some(HistogramStats { min, max, mean, median, p95, count })
    }

    pub fn snapshot(&self) -> HashMap<String, String> {
        let mut snap = HashMap::new();
        for (k, v) in &self.counters {
            snap.insert(format!("counter.{k}"), v.to_string());
        }
        for (k, v) in &self.gauges {
            snap.insert(format!("gauge.{k}"), format!("{v:.4}"));
        }
        for (k, v) in &self.histograms {
            if let Some(stats) = self.histogram_stats(k) {
                snap.insert(format!("hist.{k}.mean"), format!("{:.4}", stats.mean));
                snap.insert(format!("hist.{k}.p95"), format!("{:.4}", stats.p95));
            }
        }
        snap
    }

    pub fn reset(&mut self) {
        self.counters.clear();
        self.gauges.clear();
        self.histograms.clear();
    }
}

pub struct HistogramStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub median: f64,
    pub p95: f64,
    pub count: usize,
}

impl Default for Telemetry {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_counters() {
        let mut t = Telemetry::new();
        t.increment("llm_calls");
        t.increment("llm_calls");
        t.increment_by("errors", 3);
        assert_eq!(t.get_counter("llm_calls"), 2);
        assert_eq!(t.get_counter("errors"), 3);
    }

    #[test]
    fn test_telemetry_gauges() {
        let mut t = Telemetry::new();
        t.set_gauge("energy", 750.0);
        assert_eq!(t.get_gauge("energy"), 750.0);
    }

    #[test]
    fn test_histogram() {
        let mut t = Telemetry::new();
        for i in 0..100 {
            t.record_histogram("latency", i as f64);
        }
        let stats = t.histogram_stats("latency").unwrap();
        assert_eq!(stats.min, 0.0);
        assert_eq!(stats.max, 99.0);
        assert!((stats.mean - 49.5).abs() < 0.1);
    }

    #[test]
    fn test_snapshot() {
        let mut t = Telemetry::new();
        t.increment("test");
        t.set_gauge("g", 1.0);
        let snap = t.snapshot();
        assert!(snap.contains_key("counter.test"));
        assert!(snap.contains_key("gauge.g"));
    }

    #[test]
    fn test_reset() {
        let mut t = Telemetry::new();
        t.increment("x");
        t.set_gauge("y", 1.0);
        t.reset();
        assert_eq!(t.get_counter("x"), 0);
        assert_eq!(t.get_gauge("y"), 0.0);
    }
}
