//! JSON query tool — extract values from JSON data.

use serde_json::Value;

pub struct JsonQueryTool;

impl JsonQueryTool {
    pub fn new() -> Self { Self }

    pub fn name(&self) -> &str { "json_query" }

    pub fn description(&self) -> &str {
        "Query JSON data using dot notation. Example: 'users.0.name' extracts first user's name."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "json": {
                    "type": "string",
                    "description": "JSON string to query"
                },
                "path": {
                    "type": "string",
                    "description": "Dot-notation path (e.g. 'data.items.0.name')"
                }
            },
            "required": ["json", "path"]
        })
    }

    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let json_str = args.get("json")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("json is required"))?;

        let path = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("path is required"))?;

        let data: Value = serde_json::from_str(json_str)?;
        let result = query_path(&data, path)?;

        Ok(serde_json::to_string_pretty(&result)?)
    }
}

fn query_path<'a>(data: &'a Value, path: &str) -> anyhow::Result<&'a Value> {
    let mut current = data;
    for part in path.split('.') {
        if part.is_empty() { continue; }
        if let Ok(idx) = part.parse::<usize>() {
            current = current.get(idx)
                .ok_or_else(|| anyhow::anyhow!("index {idx} out of bounds"))?;
        } else {
            current = current.get(part)
                .ok_or_else(|| anyhow::anyhow!("key '{part}' not found"))?;
        }
    }
    Ok(current)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_query_nested() {
        let tool = JsonQueryTool::new();
        let result = tool.execute(&serde_json::json!({
            "json": r#"{"users": [{"name": "Alice"}, {"name": "Bob"}]}"#,
            "path": "users.1.name"
        })).unwrap();
        assert!(result.contains("Bob"));
    }

    #[test]
    fn test_json_query_simple() {
        let tool = JsonQueryTool::new();
        let result = tool.execute(&serde_json::json!({
            "json": r#"{"key": "value"}"#,
            "path": "key"
        })).unwrap();
        assert!(result.contains("value"));
    }

    #[test]
    fn test_json_query_missing_key() {
        let tool = JsonQueryTool::new();
        let result = tool.execute(&serde_json::json!({
            "json": r#"{"key": "value"}"#,
            "path": "missing"
        }));
        assert!(result.is_err());
    }
}
