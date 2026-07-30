//! MCP tools — Model Context Protocol integration.

pub struct McpTools {
    pub servers: Vec<McpServer>,
}

pub struct McpServer {
    pub name: String,
    pub url: String,
    pub tools: Vec<String>,
}

impl McpTools {
    pub fn new() -> Self {
        Self {
            servers: Vec::new(),
        }
    }

    pub fn add_server(&mut self, server: McpServer) {
        self.servers.push(server);
    }

    pub async fn call_tool(&self, server: &str, tool: &str, args: &str) -> String {
        tracing::info!(server, tool, args, "mcp call");
        format!("MCP result from {server}:{tool}")
    }

    pub fn list_servers(&self) -> Vec<&str> {
        self.servers.iter().map(|s| s.name.as_str()).collect()
    }
}

impl Default for McpTools {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_tools() {
        let mut mcp = McpTools::new();
        mcp.add_server(McpServer {
            name: "test".into(),
            url: "http://localhost:3000".into(),
            tools: vec!["tool1".into()],
        });
        assert_eq!(mcp.list_servers().len(), 1);
    }
}
