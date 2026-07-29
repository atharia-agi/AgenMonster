//! Random string generator tool.

use serde_json::Value;

pub struct RandomStringTool;

impl RandomStringTool {
    pub fn new() -> Self { Self }

    pub fn name(&self) -> &str { "random_string" }

    pub fn description(&self) -> &str {
        "Generate a random string. Supports alphanumeric, hex, uuid formats."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "length": {
                    "type": "integer",
                    "description": "String length (default: 16, max: 256)"
                },
                "format": {
                    "type": "string",
                    "enum": ["alphanumeric", "hex", "uuid", "numeric"],
                    "description": "Output format (default: alphanumeric)"
                }
            }
        })
    }

    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let length = args.get("length")
            .and_then(|v| v.as_u64())
            .unwrap_or(16)
            .min(256) as usize;

        let format = args.get("format")
            .and_then(|v| v.as_str())
            .unwrap_or("alphanumeric");

        let output = match format {
            "hex" => {
                let bytes: Vec<u8> = (0..length).map(|_| rand::random::<u8>()).collect();
                bytes.iter().map(|b| format!("{b:02x}")).collect::<String>()[..length].to_string()
            }
            "uuid" => {
                let uuid = uuid::Uuid::new_v4();
                uuid.to_string()
            }
            "numeric" => {
                let chars: Vec<char> = (0..length)
                    .map(|_| {
                        let idx = rand::random::<u8>() % 10;
                        (b'0' + idx) as char
                    })
                    .collect();
                chars.into_iter().collect()
            }
            _ => {
                const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                let chars: Vec<char> = (0..length)
                    .map(|_| {
                        let idx = rand::random::<u8>() as usize % CHARS.len();
                        CHARS[idx] as char
                    })
                    .collect();
                chars.into_iter().collect()
            }
        };

        Ok(serde_json::json!({
            "string": output,
            "length": output.len(),
            "format": format,
        }).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_alphanumeric() {
        let tool = RandomStringTool::new();
        let result = tool.execute(&serde_json::json!({"length": 32})).unwrap();
        assert!(result.contains("string"));
        assert!(result.contains("32"));
    }

    #[test]
    fn test_random_hex() {
        let tool = RandomStringTool::new();
        let result = tool.execute(&serde_json::json!({"format": "hex", "length": 8})).unwrap();
        assert!(result.contains("hex"));
    }

    #[test]
    fn test_random_uuid() {
        let tool = RandomStringTool::new();
        let result = tool.execute(&serde_json::json!({"format": "uuid"})).unwrap();
        assert!(result.contains("uuid"));
    }

    #[test]
    fn test_random_numeric() {
        let tool = RandomStringTool::new();
        let result = tool.execute(&serde_json::json!({"format": "numeric", "length": 6})).unwrap();
        assert!(result.contains("numeric"));
    }

    #[test]
    fn test_different_each_time() {
        let tool = RandomStringTool::new();
        let r1 = tool.execute(&serde_json::json!({})).unwrap();
        let r2 = tool.execute(&serde_json::json!({})).unwrap();
        assert_ne!(r1, r2);
    }
}
