//! Router configuration.

#[derive(Debug, Clone)]
pub struct RouterCfg {
    pub model: String,
    pub fallback_model: String,
    pub max_retries: u32,
    pub timeout_secs: u64,
}

impl Default for RouterCfg {
    fn default() -> Self {
        Self {
            model: "claude-sonnet-4-20250514".into(),
            fallback_model: "gpt-4o".into(),
            max_retries: 2,
            timeout_secs: 30,
        }
    }
}
