//! File watch tool — directory listing with metadata.

use serde_json::Value;
use std::path::Path;

pub struct FileWatchTool;

impl FileWatchTool {
    pub fn new() -> Self { Self }
    pub fn name(&self) -> &str { "file_watch" }
    pub fn description(&self) -> &str {
        "List files in a directory with sizes and modification times. Supports recursive depth."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string", "description": "Directory path to list" },
                "depth": { "type": "integer", "description": "Recursion depth (default: 1, max: 5)" },
                "pattern": { "type": "string", "description": "Filter by extension (e.g. '.rs', '.toml')" }
            },
            "required": ["path"]
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let path_str = args.get("path").and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("path is required"))?;
        let max_depth = args.get("depth").and_then(|v| v.as_u64()).unwrap_or(1).min(5) as usize;
        let pattern = args.get("pattern").and_then(|v| v.as_str()).unwrap_or("");

        let path = Path::new(path_str);
        if !path.exists() {
            return Ok(serde_json::json!({"error": format!("Path not found: {path_str}")}).to_string());
        }
        if !path.is_dir() {
            return Ok(serde_json::json!({"error": format!("Not a directory: {path_str}")}).to_string());
        }

        let mut entries = Vec::new();
        walk_dir(path, pattern, &mut entries, 0, max_depth)?;

        Ok(serde_json::json!({
            "path": path_str,
            "count": entries.len(),
            "entries": entries,
        }).to_string())
    }
}

fn walk_dir(dir: &Path, pattern: &str, entries: &mut Vec<Value>, depth: usize, max_depth: usize) -> anyhow::Result<()> {
    if depth >= max_depth { return Ok(()); }
    if let Ok(read_dir) = std::fs::read_dir(dir) {
        for entry in read_dir.flatten() {
            let path = entry.path();
            let meta = std::fs::metadata(&path).ok();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

            if !pattern.is_empty() && path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy() != pattern.trim_start_matches('.') {
                        continue;
                    }
                }
            }

            let entry = serde_json::json!({
                "name": name,
                "path": path.to_string_lossy(),
                "is_dir": path.is_dir(),
                "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
                "modified": meta.as_ref()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0),
            });
            entries.push(entry);

            if path.is_dir() {
                walk_dir(&path, pattern, entries, depth + 1, max_depth)?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_watch_current_dir() {
        let tool = FileWatchTool::new();
        let result = tool.execute(&serde_json::json!({"path": "."})).unwrap();
        assert!(result.contains("count"));
    }

    #[test]
    fn test_file_watch_nonexistent() {
        let tool = FileWatchTool::new();
        let result = tool.execute(&serde_json::json!({"path": "/nonexistent/path/12345"})).unwrap();
        assert!(result.contains("error"));
    }
}
