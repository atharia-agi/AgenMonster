//! Key rotation — automatic failover across multiple provider keys.
//!
//! When a key hits rate limits, automatically rotate to the next one.
//! Tracks usage counts and cooldown timestamps per key.

use std::collections::HashMap;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct KeySlot {
    pub provider: String,
    pub key: String,
    pub usage_count: u32,
    pub last_used: u64,
    pub cooldown_until: u64,
    pub failures: u32,
}

#[derive(Debug, Clone, Default)]
pub struct KeyStats {
    pub total_rotations: u64,
    pub total_failures: u32,
    pub active_keys: usize,
    pub cooldown_keys: usize,
}

pub struct KeyRotator {
    keys: RwLock<HashMap<String, Vec<KeySlot>>>,
    current_idx: RwLock<HashMap<String, usize>>,
    stats: RwLock<KeyStats>,
    max_failures: u32,
    cooldown_secs: u64,
}

impl KeyRotator {
    pub fn new() -> Self {
        Self {
            keys: RwLock::new(HashMap::new()),
            current_idx: RwLock::new(HashMap::new()),
            stats: RwLock::new(KeyStats::default()),
            max_failures: 3,
            cooldown_secs: 60,
        }
    }

    /// Register keys for a provider.
    pub async fn register_provider(&self, provider: &str, keys: Vec<String>) {
        let slots: Vec<KeySlot> = keys
            .into_iter()
            .map(|key| KeySlot {
                provider: provider.to_string(),
                key,
                usage_count: 0,
                last_used: 0,
                cooldown_until: 0,
                failures: 0,
            })
            .collect();
        self.keys.write().await.insert(provider.to_string(), slots);
        self.current_idx
            .write()
            .await
            .insert(provider.to_string(), 0);
    }

    /// Get the next available key for a provider.
    pub async fn next_key(&self, provider: &str) -> Option<String> {
        let now = now_secs();
        let mut keys = self.keys.write().await;
        let slots = keys.get_mut(provider)?;
        let mut idx_map = self.current_idx.write().await;
        let idx = idx_map.entry(provider.to_string()).or_insert(0);

        // Try all slots, starting from current
        let len = slots.len();
        for _ in 0..len {
            let slot = &mut slots[*idx];
            if slot.cooldown_until <= now && slot.failures < self.max_failures {
                slot.usage_count += 1;
                slot.last_used = now;
                let key = slot.key.clone();
                *idx = (*idx + 1) % len;
                self.stats.write().await.total_rotations += 1;
                return Some(key);
            }
            *idx = (*idx + 1) % len;
        }

        // All keys exhausted — try the one with shortest cooldown
        let best = slots.iter().min_by_key(|s| s.cooldown_until)?;
        if best.cooldown_until <= now {
            self.stats.write().await.total_rotations += 1;
            Some(best.key.clone())
        } else {
            None
        }
    }

    /// Mark a key as failed (triggers cooldown).
    pub async fn mark_failure(&self, provider: &str, key: &str) {
        let now = now_secs();
        let mut keys = self.keys.write().await;
        if let Some(slots) = keys.get_mut(provider) {
            for slot in slots {
                if slot.key == key {
                    slot.failures += 1;
                    slot.cooldown_until = now + self.cooldown_secs;
                    self.stats.write().await.total_failures += 1;
                    break;
                }
            }
        }
    }

    /// Mark a key as successful (reset failure count).
    pub async fn mark_success(&self, provider: &str, key: &str) {
        let mut keys = self.keys.write().await;
        if let Some(slots) = keys.get_mut(provider) {
            for slot in slots {
                if slot.key == key {
                    let old_failures = slot.failures;
                    slot.failures = 0;
                    // Decrement global failure counter
                    if old_failures > 0 {
                        let mut stats = self.stats.write().await;
                        stats.total_failures = stats.total_failures.saturating_sub(old_failures);
                    }
                    break;
                }
            }
        }
    }

    /// Get stats for all providers.
    pub async fn stats(&self) -> KeyStats {
        let mut stats = self.stats.read().await.clone();
        let keys = self.keys.read().await;
        let now = now_secs();
        for slots in keys.values() {
            stats.active_keys += slots
                .iter()
                .filter(|s| s.failures < self.max_failures)
                .count();
            stats.cooldown_keys += slots.iter().filter(|s| s.cooldown_until > now).count();
        }
        stats
    }

    /// Get usage summary per provider.
    pub async fn usage_summary(&self) -> HashMap<String, Vec<(u32, u32, bool)>> {
        let keys = self.keys.read().await;
        let now = now_secs();
        let mut result = HashMap::new();
        for (provider, slots) in keys.iter() {
            let summary: Vec<(u32, u32, bool)> = slots
                .iter()
                .map(|s| (s.usage_count, s.failures, s.cooldown_until > now))
                .collect();
            result.insert(provider.clone(), summary);
        }
        result
    }
}

impl Default for KeyRotator {
    fn default() -> Self {
        Self::new()
    }
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_and_get_key() {
        let rotator = KeyRotator::new();
        rotator
            .register_provider("groq", vec!["key1".into(), "key2".into()])
            .await;
        let key = rotator.next_key("groq").await;
        assert!(key.is_some());
    }

    #[tokio::test]
    async fn test_rotation() {
        let rotator = KeyRotator::new();
        rotator
            .register_provider("groq", vec!["key1".into(), "key2".into()])
            .await;
        let k1 = rotator.next_key("groq").await.unwrap();
        let k2 = rotator.next_key("groq").await.unwrap();
        assert_ne!(k1, k2);
    }

    #[tokio::test]
    async fn test_failure_marks_cooldown() {
        let rotator = KeyRotator::new();
        rotator.register_provider("groq", vec!["key1".into()]).await;
        rotator.mark_failure("groq", "key1").await;
        let stats = rotator.stats().await;
        assert_eq!(stats.total_failures, 1);
    }

    #[tokio::test]
    async fn test_success_resets_failures() {
        let rotator = KeyRotator::new();
        rotator.register_provider("groq", vec!["key1".into()]).await;
        rotator.mark_failure("groq", "key1").await;
        rotator.mark_success("groq", "key1").await;
        let stats = rotator.stats().await;
        assert_eq!(stats.total_failures, 0);
    }
}
