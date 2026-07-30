//! Gemini client — Google Gemini API.

pub struct GeminiClient {
    pub api_key: String,
    pub model: String,
    pub base_url: String,
}

impl GeminiClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: "gemini-2.5-flash".into(),
            base_url: "https://generativelanguage.googleapis.com/v1beta".into(),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    pub fn build_request(&self, messages: &[ApiMessage]) -> serde_json::Value {
        let contents: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                serde_json::json!({
                    "role": if m.role == "assistant" { "model" } else { "user" },
                    "parts": [{"text": m.content}]
                })
            })
            .collect();

        serde_json::json!({
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": 4096
            }
        })
    }

    pub fn cost_estimate(&self, input_tokens: u32, output_tokens: u32) -> f32 {
        input_tokens as f32 * 0.075 / 1_000_000.0 + output_tokens as f32 * 0.3 / 1_000_000.0
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
    fn test_gemini_client() {
        let client = GeminiClient::new("test").with_model("gemini-2.5-pro");
        assert_eq!(client.model, "gemini-2.5-pro");
    }

    #[test]
    fn test_build_request() {
        let client = GeminiClient::new("test");
        let messages = vec![ApiMessage {
            role: "user".into(),
            content: "hello".into(),
        }];
        let req = client.build_request(&messages);
        assert!(req["contents"].is_array());
    }
}
