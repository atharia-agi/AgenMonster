//! String utilities tool — transform text.

use serde_json::Value;

pub struct StringUtilsTool;

impl StringUtilsTool {
    pub fn new() -> Self { Self }
    pub fn name(&self) -> &str { "string_utils" }
    pub fn description(&self) -> &str { "Transform text: uppercase, lowercase, trim, reverse, length, count_words." }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "input": { "type": "string", "description": "Text to transform" },
                "operation": {
                    "type": "string",
                    "enum": ["uppercase", "lowercase", "trim", "reverse", "length", "count_words", "capitalize", "snake_case", "camel_case"],
                    "description": "Operation to perform"
                }
            },
            "required": ["input", "operation"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let input = args.get("input").and_then(|v| v.as_str()).unwrap_or("");
        let op = args.get("operation").and_then(|v| v.as_str()).unwrap_or("length");

        let result = match op {
            "uppercase" => serde_json::json!({"result": input.to_uppercase()}),
            "lowercase" => serde_json::json!({"result": input.to_lowercase()}),
            "trim" => serde_json::json!({"result": input.trim()}),
            "reverse" => serde_json::json!({"result": input.chars().rev().collect::<String>()}),
            "length" => serde_json::json!({"length": input.len(), "chars": input.chars().count()}),
            "count_words" => serde_json::json!({"word_count": input.split_whitespace().count()}),
            "capitalize" => {
                let mut chars = input.chars();
                match chars.next() {
                    None => serde_json::json!({"result": ""}),
                    Some(f) => serde_json::json!({"result": format!("{}{}", f.to_uppercase(), chars.as_str())}),
                }
            }
            "snake_case" => {
                let snake: String = input.chars().enumerate().map(|(i, c)| {
                    if c.is_uppercase() && i > 0 { format!("_{c}") } else { c.to_lowercase().to_string() }
                }).collect();
                serde_json::json!({"result": snake})
            }
            "camel_case" => {
                let words: Vec<&str> = input.split(|c: char| c == ' ' || c == '_' || c == '-').collect();
                let camel: String = words.iter().enumerate().map(|(i, w)| {
                    let mut chars = w.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(f) => {
                            if i == 0 { format!("{}{}", f.to_lowercase(), chars.as_str()) }
                            else { format!("{}{}", f.to_uppercase(), chars.as_str()) }
                        }
                    }
                }).collect();
                serde_json::json!({"result": camel})
            }
            _ => serde_json::json!({"error": "Unknown operation"}),
        };

        Ok(result.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_uppercase() {
        let tool = StringUtilsTool::new();
        let result = tool.execute(&serde_json::json!({"input": "hello", "operation": "uppercase"})).unwrap();
        assert!(result.contains("HELLO"));
    }
    #[test]
    fn test_reverse() {
        let tool = StringUtilsTool::new();
        let result = tool.execute(&serde_json::json!({"input": "abc", "operation": "reverse"})).unwrap();
        assert!(result.contains("cba"));
    }
    #[test]
    fn test_count_words() {
        let tool = StringUtilsTool::new();
        let result = tool.execute(&serde_json::json!({"input": "hello world foo", "operation": "count_words"})).unwrap();
        assert!(result.contains("3"));
    }
}
