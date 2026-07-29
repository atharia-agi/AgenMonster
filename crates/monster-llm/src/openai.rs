//! OpenAI client — GPT API with streaming.

pub struct OpenAIClient {
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
    pub base_url: String,
}

impl OpenAIClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: "gpt-4o".into(),
            max_tokens: 4096,
            base_url: "https://api.openai.com/v1".into(),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    pub fn build_request(&self, messages: &[ApiMessage]) -> serde_json::Value {
        let msgs: Vec<serde_json::Value> = messages.iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect();

        serde_json::json!({
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": msgs,
            "stream": true
        })
    }

    pub fn cost_estimate(&self, input_tokens: u32, output_tokens: u32) -> f32 {
        let (input_rate, output_rate) = match self.model.as_str() {
            "gpt-4o" => (2.5, 10.0),
            "gpt-4o-mini" => (0.15, 0.6),
            _ => (2.5, 10.0),
        };
        input_tokens as f32 * input_rate / 1_000_000.0 +
        output_tokens as f32 * output_rate / 1_000_000.0
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
    fn test_openai_client() {
        let client = OpenAIClient::new("test").with_model("gpt-4o-mini");
        assert_eq!(client.model, "gpt-4o-mini");
    }

    #[test]
    fn test_cost_estimate() {
        let client = OpenAIClient::new("test").with_model("gpt-4o");
        let cost = client.cost_estimate(1000, 500);
        assert!((cost - 0.0075).abs() < 0.001);
    }
}
