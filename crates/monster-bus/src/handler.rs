use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use uuid::Uuid;

/// Unique per subscriber. Cheap, copy, no allocation.
#[derive(Debug, Clone, Copy, Hash, Eq, PartialEq)]
pub struct HandlerId(pub u64);

static COUNTER: AtomicU64 = AtomicU64::new(1);

impl HandlerId {
    pub fn new() -> Self {
        HandlerId(COUNTER.fetch_add(1, Ordering::Relaxed))
    }
}

/// A track of handlers registered for targeted unsubscribes
#[derive(Default, Debug)]
pub struct HandlerRegistry {
    set: HashSet<HandlerId>,
}

impl HandlerRegistry {
    pub fn add(&mut self, id: HandlerId) {
        self.set.insert(id);
    }
    pub fn drain(&mut self) -> Vec<HandlerId> {
        self.set.drain().collect()
    }
}

/// Helper to attach a stable task id
pub fn task_uuid() -> Uuid {
    Uuid::new_v4()
}
