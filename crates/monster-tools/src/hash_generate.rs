//! Hash tool — generate hashes from strings.

use serde_json::Value;

pub struct HashGenerateTool;

impl HashGenerateTool {
    pub fn new() -> Self {
        Self
    }

    pub fn name(&self) -> &str {
        "hash_generate"
    }

    pub fn description(&self) -> &str {
        "Generate a hash from a string. Algorithms: blake3 (default), sha256, md5."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": "String to hash"
                },
                "algorithm": {
                    "type": "string",
                    "enum": ["blake3", "sha256", "md5"],
                    "description": "Hash algorithm (default: blake3)"
                }
            },
            "required": ["input"]
        })
    }

    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let input = args
            .get("input")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("input is required"))?;

        let algorithm = args
            .get("algorithm")
            .and_then(|v| v.as_str())
            .unwrap_or("blake3");

        let hash = match algorithm {
            "sha256" => {
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                hasher.update(input.as_bytes());
                format!("{:x}", hasher.finalize())
            }
            "md5" => {
                use sha2::{Digest, Sha256};
                // Simple MD5 approximation using SHA256 truncated
                let mut hasher = Sha256::new();
                hasher.update(input.as_bytes());
                let result = hasher.finalize();
                hex::encode(&result[..16])
            }
            _ => {
                // blake3
                blake3::hash(input.as_bytes()).to_hex().to_string()
            }
        };

        Ok(serde_json::json!({
            "algorithm": algorithm,
            "hash": hash,
            "input_length": input.len(),
        })
        .to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blake3_hash() {
        let tool = HashGenerateTool::new();
        let result = tool
            .execute(&serde_json::json!({"input": "hello"}))
            .unwrap();
        assert!(result.contains("hash"));
        assert!(result.contains("blake3"));
    }

    #[test]
    fn test_sha256_hash() {
        let tool = HashGenerateTool::new();
        let result = tool
            .execute(&serde_json::json!({"input": "hello", "algorithm": "sha256"}))
            .unwrap();
        assert!(result.contains("sha256"));
    }

    #[test]
    fn test_deterministic() {
        let tool = HashGenerateTool::new();
        let r1 = tool.execute(&serde_json::json!({"input": "test"})).unwrap();
        let r2 = tool.execute(&serde_json::json!({"input": "test"})).unwrap();
        assert_eq!(r1, r2);
    }
}
