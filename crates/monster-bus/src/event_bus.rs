//! EventBus — typed event bus for decoupled communication.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub type Callback = Arc<dyn Fn(&str) + Send + Sync>;

pub struct EventBus {
    subscribers: HashMap<String, Vec<Callback>>,
}

impl EventBus {
    pub fn new() -> Self {
        Self { subscribers: HashMap::new() }
    }

    pub fn subscribe(&mut self, topic: &str, cb: Callback) {
        self.subscribers.entry(topic.to_string()).or_default().push(cb);
    }

    pub fn publish(&self, topic: &str, payload: &str) {
        if let Some(cbs) = self.subscribers.get(topic) {
            for cb in cbs {
                cb(payload);
            }
        }
    }

    pub fn topics(&self) -> Vec<&str> {
        self.subscribers.keys().map(|s| s.as_str()).collect()
    }

    pub fn subscriber_count(&self, topic: &str) -> usize {
        self.subscribers.get(topic).map_or(0, |v| v.len())
    }
}

impl Default for EventBus {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[test]
    fn test_event_bus_subscribe_publish() {
        let mut bus = EventBus::new();
        let count = Arc::new(AtomicUsize::new(0));
        let c = count.clone();
        bus.subscribe("test", Arc::new(move |_| { c.fetch_add(1, Ordering::Relaxed); }));
        bus.publish("test", "hello");
        assert_eq!(count.load(Ordering::Relaxed), 1);
    }

    #[test]
    fn test_event_bus_topics() {
        let mut bus = EventBus::new();
        bus.subscribe("a", Arc::new(|_| {}));
        bus.subscribe("b", Arc::new(|_| {}));
        assert_eq!(bus.topics().len(), 2);
    }
}
