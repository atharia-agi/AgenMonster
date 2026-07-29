//! Anthropic client — Claude API with streaming.

pub struct AnthropicClient {
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
    pub base_url: String,
}

impl AnthropicClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: "claude-sonnet-4-20250514".into(),
            max_tokens: 4096,
            base_url: "https://api.anthropic.com".into(),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = max_tokens;
        self
    }

    pub fn system_prompt(&self) -> &str {
        "You are a cute pixel-art monster companion. You live on the user's desktop and help them with tasks. Keep responses short and fun."
    }

    pub fn build_request(&self, messages: &[ApiMessage]) -> serde_json::Value {
        let msgs: Vec<serde_json::Value> = messages.iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect();

        serde_json::json!({
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": self.system_prompt(),
            "messages": msgs,
            "stream": true
        })
    }

    pub fn cost_estimate(&self, input_tokens: u32, output_tokens: u32) -> f32 {
        let input_cost = input_tokens as f32 * 3.0 / 1_000_000.0;
        let output_cost = output_tokens as f32 * 15.0 / 1_000_000.0;
        input_cost + output_cost
    }
}

pub struct ApiMessage {
    pub role: String,
    pub content: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_anthropic_client() {
        let client = AnthropicClient::new("test-key")
            .with_model("claude-3-haiku")
            .with_max_tokens(1024);
        assert_eq!(client.model, "claude-3-haiku");
        assert_eq!(client.max_tokens, 1024);
    }

    #[test]
    fn test_build_request() {
        let client = AnthropicClient::new("test-key");
        let messages = vec![ApiMessage {
            role: "user".into(), content: "hello".into(),
        }];
        let req = client.build_request(&messages);
        assert_eq!(req["model"], "claude-sonnet-4-20250514");
        assert_eq!(req["messages"][0]["role"], "user");
    }

    #[test]
    fn test_cost_estimate() {
        let client = AnthropicClient::new("test");
        let cost = client.cost_estimate(1000, 500);
        assert!((cost - 0.0105).abs() < 0.001);
    }
}
