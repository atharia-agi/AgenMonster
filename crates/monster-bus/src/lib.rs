//! Bus crate — typed event bus for all inter-crate communication.
//! Channels are created per-topic; publish is non-blocking.

mod channels;
pub mod event;
pub mod topic;

use event::BusEvent;
use std::collections::HashMap;
use tokio::sync::broadcast;
use topic::Topic;

#[derive(Clone)]
pub struct Bus {
    channels: std::sync::Arc<tokio::sync::RwLock<HashMap<Topic, broadcast::Sender<Envelope>>>>,
    capacity: usize,
}

#[derive(Clone, Debug)]
pub struct Envelope {
    pub payload: BusEvent,
    pub emitted_at: chrono::DateTime<chrono::Utc>,
}

impl Bus {
    pub fn new(cfg: BusConfig) -> Self {
        let mut channels = HashMap::new();
        for t in Topic::all() {
            let (tx, _) = broadcast::channel(cfg.default_capacity);
            channels.insert(*t, tx);
        }
        Self {
            channels: std::sync::Arc::new(tokio::sync::RwLock::new(channels)),
            capacity: cfg.default_capacity,
        }
    }

    pub async fn publish(&self, topic: Topic, payload: BusEvent) -> anyhow::Result<()> {
        let channels = self.channels.read().await;
        if let Some(tx) = channels.get(&topic) {
            let env = Envelope {
                payload,
                emitted_at: chrono::Utc::now(),
            };
            let _ = tx.send(env);
        }
        Ok(())
    }

    pub async fn subscribe(&self, topic: Topic) -> (Subscription, broadcast::Receiver<Envelope>) {
        let channels = self.channels.read().await;
        let rx = channels.get(&topic).unwrap().subscribe();
        (Subscription { topic }, rx)
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

pub struct Subscription {
    pub topic: Topic,
}

pub struct BusConfig {
    pub default_capacity: usize,
}

impl Default for BusConfig {
    fn default() -> Self {
        Self {
            default_capacity: 256,
        }
    }
}
