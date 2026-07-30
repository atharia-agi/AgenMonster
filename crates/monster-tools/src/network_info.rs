//! Network info tool — IP, hostname, DNS lookup.

use serde_json::Value;

pub struct NetworkInfoTool;

impl NetworkInfoTool {
    pub fn new() -> Self {
        Self
    }
    pub fn name(&self) -> &str {
        "network_info"
    }
    pub fn description(&self) -> &str {
        "Get network information: local IP, hostname, public IP (via DNS lookup)."
    }
    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "enum": ["local_ip", "hostname", "public_ip", "all"],
                    "description": "What info to get (default: all)"
                }
            }
        })
    }
    pub fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("all");
        let mut result = serde_json::Map::new();

        if query == "all" || query == "hostname" {
            if let Ok(hostname) =
                std::env::var("COMPUTERNAME").or_else(|_| std::env::var("HOSTNAME"))
            {
                result.insert("hostname".into(), serde_json::Value::String(hostname));
            }
        }

        if query == "all" || query == "local_ip" {
            // Get local IP by connecting to a public DNS server
            if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
                let _ = socket.connect("8.8.8.8:80");
                if let Ok(addr) = socket.local_addr() {
                    result.insert(
                        "local_ip".into(),
                        serde_json::Value::String(addr.ip().to_string()),
                    );
                }
            }
        }

        if query == "all" || query == "public_ip" {
            // Try to get public IP from a DNS service
            let output = std::process::Command::new("nslookup")
                .args(["myip.opendns.com", "resolver1.opendns.com"])
                .output();
            if let Ok(out) = output {
                let stdout = String::from_utf8_lossy(&out.stdout);
                for line in stdout.lines() {
                    if line.contains("Address:") && !line.contains("127.0.0") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if let Some(ip) = parts.last() {
                            if ip
                                .chars()
                                .next()
                                .map(|c| c.is_ascii_digit())
                                .unwrap_or(false)
                            {
                                result.insert(
                                    "public_ip".into(),
                                    serde_json::Value::String(ip.to_string()),
                                );
                                break;
                            }
                        }
                    }
                }
            }
        }

        Ok(serde_json::Value::Object(result).to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_info_hostname() {
        let tool = NetworkInfoTool::new();
        let result = tool
            .execute(&serde_json::json!({"query": "hostname"}))
            .unwrap();
        assert!(result.contains("hostname"));
    }

    #[test]
    fn test_network_info_all() {
        let tool = NetworkInfoTool::new();
        let result = tool.execute(&serde_json::json!({})).unwrap();
        assert!(result.contains("hostname"));
    }
}
