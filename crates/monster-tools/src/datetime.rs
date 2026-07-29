//! Date/time tool — real system clock.

use serde_json::Value;

pub struct DateTimeTool;

impl DateTimeTool {
    pub fn new() -> Self { Self }

    pub fn name(&self) -> &str { "date_time" }

    pub fn description(&self) -> &str {
        "Get current date and time. Optional format parameter: 'iso', 'unix', 'human', 'date', 'time'. Default: human-readable."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "format": {
                    "type": "string",
                    "enum": ["iso", "unix", "human", "date", "time"],
                    "description": "Output format (default: human)"
                }
            }
        })
    }

    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let format = args.get("format")
            .and_then(|v| v.as_str())
            .unwrap_or("human");

        let now = chrono::Local::now();
        let output = match format {
            "iso" => now.to_rfc3339(),
            "unix" => now.timestamp().to_string(),
            "date" => now.format("%Y-%m-%d").to_string(),
            "time" => now.format("%H:%M:%S").to_string(),
            _ => now.format("%Y-%m-%d %H:%M:%S %Z").to_string(),
        };

        Ok(serde_json::json!({
            "datetime": output,
            "timezone": now.format("%Z").to_string(),
            "unix_timestamp": now.timestamp(),
            "year": now.format("%Y").to_string().parse::<i32>().unwrap_or(0),
            "month": now.format("%m").to_string().parse::<u32>().unwrap_or(0),
            "day": now.format("%d").to_string().parse::<u32>().unwrap_or(0),
            "hour": now.format("%H").to_string().parse::<u32>().unwrap_or(0),
            "minute": now.format("%M").to_string().parse::<u32>().unwrap_or(0),
            "weekday": now.format("%A").to_string(),
        }).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date_time_human() {
        let tool = DateTimeTool::new();
        let result = tool.execute(&serde_json::json!({})).unwrap();
        assert!(result.contains("datetime"));
        assert!(result.contains("timezone"));
    }

    #[test]
    fn test_date_time_iso() {
        let tool = DateTimeTool::new();
        let result = tool.execute(&serde_json::json!({"format": "iso"})).unwrap();
        assert!(result.contains("T"));
    }

    #[test]
    fn test_date_time_unix() {
        let tool = DateTimeTool::new();
        let result = tool.execute(&serde_json::json!({"format": "unix"})).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        let ts = parsed["unix_timestamp"].as_i64().unwrap();
        assert!(ts > 1_700_000_000);
    }
}
