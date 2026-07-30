//! Environment variable tools — get/set system env vars.

use serde_json::Value;

pub struct EnvGetTool;
pub struct EnvSetTool;

impl EnvGetTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "env_get"
    }
    pub fn description(&self) -> &str {
        "Get an environment variable value by key name."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "key": { "type": "string", "description": "Environment variable name" }
            },
            "required": ["key"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let key = args
            .get("key")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("key is required"))?;
        match std::env::var(key) {
            Ok(val) => {
                Ok(serde_json::json!({"key": key, "value": val, "exists": true}).to_string())
            }
            Err(_) => {
                Ok(serde_json::json!({"key": key, "value": null, "exists": false}).to_string())
            }
        }
    }
}

impl EnvSetTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "env_set"
    }
    pub fn description(&self) -> &str {
        "Set an environment variable for this session."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "key": { "type": "string", "description": "Environment variable name" },
                "value": { "type": "string", "description": "Value to set" }
            },
            "required": ["key", "value"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let key = args
            .get("key")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("key is required"))?;
        let value = args
            .get("value")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("value is required"))?;
        std::env::set_var(key, value);
        Ok(serde_json::json!({"key": key, "value": value, "set": true}).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_env_get_existing() {
        let tool = EnvGetTool::new();
        std::env::set_var("AGENMONSTER_TEST_VAR", "hello");
        let result = tool
            .execute(&serde_json::json!({"key": "AGENMONSTER_TEST_VAR"}))
            .unwrap();
        assert!(result.contains("hello"));
    }

    #[test]
    fn test_env_get_missing() {
        let tool = EnvGetTool::new();
        let result = tool
            .execute(&serde_json::json!({"key": "NONEXISTENT_VAR_12345"}))
            .unwrap();
        assert!(result.contains("false"));
    }

    #[test]
    fn test_env_set() {
        let tool = EnvSetTool::new();
        let result = tool
            .execute(&serde_json::json!({"key": "AGENMONSTER_SET_TEST", "value": "world"}))
            .unwrap();
        assert!(result.contains("true"));
        assert_eq!(std::env::var("AGENMONSTER_SET_TEST").unwrap(), "world");
    }
}
