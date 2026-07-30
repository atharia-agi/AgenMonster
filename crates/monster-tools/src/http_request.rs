//! HTTP request tool — real HTTP client for API calls and web requests.

use serde_json::Value;

pub struct HttpRequestTool;

impl HttpRequestTool {
    pub fn new() -> Self {
        Self
    }

    pub fn name(&self) -> &str {
        "http_request"
    }

    pub fn description(&self) -> &str {
        "Make an HTTP request. Supports GET, POST, PUT, DELETE. Returns status, headers, and body."
    }

    pub fn parameters(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "enum": ["GET", "POST", "PUT", "DELETE"],
                    "description": "HTTP method (default: GET)"
                },
                "url": {
                    "type": "string",
                    "description": "URL to request"
                },
                "body": {
                    "type": "string",
                    "description": "Request body (for POST/PUT)"
                }
            },
            "required": ["url"]
        })
    }

    pub async fn execute(&self, args: &Value) -> anyhow::Result<String> {
        let url = args
            .get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("url is required"))?;

        let method = args.get("method").and_then(|v| v.as_str()).unwrap_or("GET");

        let client = reqwest::Client::new();
        let mut req = match method {
            "POST" => client.post(url),
            "PUT" => client.put(url),
            "DELETE" => client.delete(url),
            _ => client.get(url),
        };

        if let Some(body) = args.get("body").and_then(|v| v.as_str()) {
            req = req.body(body.to_string());
        }

        let response = req.send().await?;
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        let body_len = body.len();
        let body_display = if body_len > 2000 {
            format!("{}...", &body[..2000])
        } else {
            body
        };

        Ok(serde_json::json!({
            "status": status,
            "ok": (200..300).contains(&status),
            "body": body_display,
            "body_length": body_len,
        })
        .to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_http_get() {
        let tool = HttpRequestTool::new();
        let result = tool
            .execute(&serde_json::json!({
                "url": "https://httpbin.org/get"
            }))
            .await
            .unwrap();
        assert!(result.contains("200"));
    }
}
