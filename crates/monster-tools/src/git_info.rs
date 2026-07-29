//! Git info tool — repo status, branch, recent commits.

use serde_json::Value;

pub struct GitInfoTool;

impl GitInfoTool {
    pub fn new() -> Self { Self }
    pub fn name(&self) -> &str { "git_info" }
    pub fn description(&self) -> &str { "Get git repo info: status, branch, last 5 commits." }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Repo path (default: current dir)" },
                "query": {
                    "type": "string",
                    "enum": ["status", "branch", "log", "all"],
                    "description": "What info to get (default: all)"
                }
            }
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let path = args.get("path").and_then(|v| v.as_str()).unwrap_or(".");
        let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("all");
        let mut result = serde_json::Map::new();

        if query == "all" || query == "branch" {
            let output = std::process::Command::new("git")
                .args(["-C", path, "branch", "--show-current"])
                .output()?;
            let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
            result.insert("branch".into(), serde_json::json!(branch));
        }

        if query == "all" || query == "status" {
            let output = std::process::Command::new("git")
                .args(["-C", path, "status", "--porcelain"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let changed: Vec<&str> = stdout.lines().filter(|l| !l.is_empty()).collect();
            result.insert("changed_files".into(), serde_json::json!(changed.len()));
            if !changed.is_empty() {
                result.insert("files".into(), serde_json::json!(changed.iter().take(10).collect::<Vec<_>>()));
            }
        }

        if query == "all" || query == "log" {
            let output = std::process::Command::new("git")
                .args(["-C", path, "log", "--oneline", "-5"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let commits: Vec<&str> = stdout.lines().filter(|l| !l.is_empty()).collect();
            result.insert("recent_commits".into(), serde_json::json!(commits));
        }

        Ok(serde_json::Value::Object(result).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_git_info_branch() {
        let tool = GitInfoTool::new();
        let result = tool.execute(&serde_json::json!({"path": ".", "query": "branch"})).unwrap();
        assert!(result.contains("branch"));
    }
}
