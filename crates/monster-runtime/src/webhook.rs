//! Webhook — outgoing webhook event dispatch.
//!
//! TODO: Implement real webhook sending.

use std::sync::RwLock;

pub struct WebhookRegistry {
    hooks: RwLock<Vec<WebhookEntry>>,
}

struct WebhookEntry {
    _url: String,
    _events: Vec<String>,
}

impl WebhookRegistry {
    pub fn new() -> Self {
        Self {
            hooks: RwLock::new(Vec::new()),
        }
    }

    pub fn register(&self, url: &str, events: Vec<String>) {
        self.hooks.write().unwrap().push(WebhookEntry {
            _url: url.to_string(),
            _events: events,
        });
    }

    pub async fn dispatch(&self, event: &str, _payload: &serde_json::Value) -> anyhow::Result<()> {
        tracing::info!(event, "webhook dispatch (stub)");
        Ok(())
    }
}

impl Default for WebhookRegistry {
    fn default() -> Self {
        Self::new()
    }
}
