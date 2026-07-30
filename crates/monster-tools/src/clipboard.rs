//! Clipboard tools — get/set system clipboard (Windows PowerShell).

use serde_json::Value;

pub struct ClipboardGetTool;
pub struct ClipboardSetTool;

impl ClipboardGetTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "clipboard_get"
    }
    pub fn description(&self) -> &str {
        "Get the current clipboard text content."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({"type": "object", "properties": {}})
    }
    pub fn execute(&self, _args: &Value) -> anyhow::Result<String> {
        let output = std::process::Command::new("powershell")
            .args(["-Command", "Get-Clipboard"])
            .output()?;
        let content = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(serde_json::json!({
            "content": content,
            "length": content.len(),
        })
        .to_string())
    }
}

impl ClipboardSetTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "clipboard_set"
    }
    pub fn description(&self) -> &str {
        "Set the clipboard to a text value."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "text": { "type": "string", "description": "Text to put on clipboard" }
            },
            "required": ["text"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let text = args
            .get("text")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("text is required"))?;
        let output = std::process::Command::new("powershell")
            .args(["-Command", &format!("Set-Clipboard -Value '{text}'")])
            .output()?;
        Ok(serde_json::json!({
            "success": output.status.success(),
            "length": text.len(),
        })
        .to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clipboard_get() {
        let tool = ClipboardGetTool::new();
        let result = tool.execute(&serde_json::json!({})).unwrap();
        assert!(result.contains("content"));
        assert!(result.contains("length"));
    }

    #[test]
    fn test_clipboard_set() {
        let tool = ClipboardSetTool::new();
        let result = tool
            .execute(&serde_json::json!({"text": "test clipboard"}))
            .unwrap();
        assert!(result.contains("success"));
    }
}
