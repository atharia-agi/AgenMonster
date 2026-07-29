//! System info tool — CPU, memory, disk usage.

use serde_json::Value;

pub struct SysInfoTool;

impl SysInfoTool {
    pub fn new() -> Self { Self }
    pub fn name(&self) -> &str { "sys_info" }
    pub fn description(&self) -> &str { "Get system info: CPU, memory, disk usage on Windows." }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "enum": ["cpu", "memory", "disk", "all"],
                    "description": "What info to get (default: all)"
                }
            }
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("all");
        let mut result = serde_json::Map::new();

        if query == "all" || query == "cpu" {
            let output = std::process::Command::new("wmic")
                .args(["cpu", "get", "LoadPercentage", "/value"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if let Some(val) = line.strip_prefix("LoadPercentage=") {
                    if let Ok(pct) = val.trim().parse::<f64>() {
                        result.insert("cpu_usage_percent".into(), serde_json::json!(pct));
                    }
                }
            }
            let output = std::process::Command::new("wmic")
                .args(["cpu", "get", "Name", "/value"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if let Some(val) = line.strip_prefix("Name=") {
                    let name = val.trim().to_string();
                    if !name.is_empty() {
                        result.insert("cpu_name".into(), serde_json::json!(name));
                        break;
                    }
                }
            }
        }

        if query == "all" || query == "memory" {
            let output = std::process::Command::new("wmic")
                .args(["OS", "get", "FreePhysicalMemory,TotalVisibleMemorySize", "/value"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut free = 0u64;
            let mut total = 0u64;
            for line in stdout.lines() {
                if let Some(val) = line.strip_prefix("FreePhysicalMemory=") {
                    free = val.trim().parse().unwrap_or(0);
                }
                if let Some(val) = line.strip_prefix("TotalVisibleMemorySize=") {
                    total = val.trim().parse().unwrap_or(0);
                }
            }
            if total > 0 {
                let used_mb = (total - free) as f64 / 1024.0;
                let total_mb = total as f64 / 1024.0;
                let pct = (total - free) as f64 / total as f64 * 100.0;
                result.insert("memory_used_mb".into(), serde_json::json!(used_mb as u64));
                result.insert("memory_total_mb".into(), serde_json::json!(total_mb as u64));
                result.insert("memory_usage_percent".into(), serde_json::json!(pct as u64));
            }
        }

        if query == "all" || query == "disk" {
            let output = std::process::Command::new("wmic")
                .args(["logicaldisk", "get", "Size,FreeSpace,DeviceID", "/value"])
                .output()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut disks = Vec::new();
            let mut current = serde_json::Map::new();
            for line in stdout.lines() {
                if let Some(val) = line.strip_prefix("DeviceID=") {
                    if !current.is_empty() { disks.push(serde_json::Value::Object(current)); }
                    current = serde_json::Map::new();
                    current.insert("device".into(), serde_json::json!(val.trim()));
                }
                if let Some(val) = line.strip_prefix("FreeSpace=") {
                    if let Ok(bytes) = val.trim().parse::<u64>() {
                        current.insert("free_gb".into(), serde_json::json!((bytes as f64 / 1_073_741_824.0) as f64));
                    }
                }
                if let Some(val) = line.strip_prefix("Size=") {
                    if let Ok(bytes) = val.trim().parse::<u64>() {
                        current.insert("total_gb".into(), serde_json::json!((bytes as f64 / 1_073_741_824.0) as f64));
                    }
                }
            }
            if !current.is_empty() { disks.push(serde_json::Value::Object(current)); }
            result.insert("disks".into(), serde_json::json!(disks));
        }

        Ok(serde_json::Value::Object(result).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_sys_info_cpu() {
        let tool = SysInfoTool::new();
        let result = tool.execute(&serde_json::json!({"query": "cpu"})).unwrap();
        assert!(result.contains("cpu"));
    }
    #[test]
    fn test_sys_info_memory() {
        let tool = SysInfoTool::new();
        let result = tool.execute(&serde_json::json!({"query": "memory"})).unwrap();
        assert!(result.contains("memory"));
    }
}
