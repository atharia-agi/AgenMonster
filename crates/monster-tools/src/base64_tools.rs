//! Base64 encode/decode tools.

use serde_json::Value;

pub struct Base64EncodeTool;
pub struct Base64DecodeTool;

impl Base64EncodeTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "base64_encode"
    }
    pub fn description(&self) -> &str {
        "Encode a string to base64."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "input": { "type": "string", "description": "String to encode" }
            },
            "required": ["input"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let input = args.get("input").and_then(|v| v.as_str()).unwrap_or("");
        Ok(encode_base64(input.as_bytes()))
    }
}

impl Base64DecodeTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "base64_decode"
    }
    pub fn description(&self) -> &str {
        "Decode a base64 string to text."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "input": { "type": "string", "description": "Base64 string to decode" }
            },
            "required": ["input"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let input = args.get("input").and_then(|v| v.as_str()).unwrap_or("");
        decode_base64(input)
    }
}

const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn encode_base64(data: &[u8]) -> String {
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(BASE64_CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(BASE64_CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(BASE64_CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(BASE64_CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn decode_base64(input: &str) -> anyhow::Result<String> {
    let input: Vec<u8> = input
        .bytes()
        .filter(|b| *b != b'=' && *b != b'\n' && *b != b'\r')
        .collect();
    let mut result = Vec::new();
    for chunk in input.chunks(4) {
        if chunk.len() < 2 {
            break;
        }
        let mut vals = [0u32; 4];
        for (i, &b) in chunk.iter().enumerate() {
            vals[i] = BASE64_CHARS
                .iter()
                .position(|&c| c == b)
                .map(|p| p as u32)
                .unwrap_or(0);
        }
        let triple = (vals[0] << 18) | (vals[1] << 12) | (vals[2] << 6) | vals[3];
        result.push((triple >> 16) as u8);
        if chunk.len() > 2 {
            result.push((triple >> 8) as u8);
        }
        if chunk.len() > 3 {
            result.push(triple as u8);
        }
    }
    String::from_utf8(result).map_err(|e| anyhow::anyhow!("Invalid UTF-8: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_base64_roundtrip() {
        let original = "Hello, AgenMonster!";
        let encoded = encode_base64(original.as_bytes());
        let decoded = decode_base64(&encoded).unwrap();
        assert_eq!(original, decoded);
    }
    #[test]
    fn test_base64_encode_empty() {
        assert_eq!(encode_base64(b""), "");
    }
}
