//! Process kill tool — terminate a process by PID or name.

use serde_json::Value;

pub struct ProcessKillTool;

impl ProcessKillTool {
    pub fn new() -> Self { Self }
    pub fn name(&self) -> &str { "process_kill" }
    pub fn description(&self) -> &str {
        "Kill a process by PID or name. Use with caution."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "pid": { "type": "integer", "description": "Process ID to kill" },
                "name": { "type": "string", "description": "Process name to kill (all instances)" },
                "force": { "type": "boolean", "description": "Force kill (default: false)" }
            }
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let force = args.get("force").and_then(|v| v.as_bool()).unwrap_or(false);

        if let Some(pid) = args.get("pid").and_then(|v| v.as_u64()) {
            let flag = if force { "/F" } else { "" };
            let output = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), flag])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(serde_json::json!({
                "pid": pid,
                "success": output.status.success(),
                "output": format!("{}{}", stdout, stderr).trim(),
            }).to_string());
        }

        if let Some(name) = args.get("name").and_then(|v| v.as_str()) {
            let flag = if force { "/F" } else { "" };
            let output = std::process::Command::new("taskkill")
                .args(["/IM", name, flag])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Ok(serde_json::json!({
                "name": name,
                "success": output.status.success(),
                "output": format!("{}{}", stdout, stderr).trim(),
            }).to_string());
        }

        Ok(serde_json::json!({"error": "Provide either 'pid' or 'name'"}).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_kill_no_args() {
        let tool = ProcessKillTool::new();
        let result = tool.execute(&serde_json::json!({})).unwrap();
        assert!(result.contains("error") || result.contains("Provide"));
    }
}
