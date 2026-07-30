//! Ollama client — local model inference.

pub struct OllamaClient {
    pub base_url: String,
    pub model: String,
}

impl OllamaClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
            model: "llama3.2".into(),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    pub fn build_request(&self, prompt: &str) -> serde_json::Value {
        serde_json::json!({
            "model": self.model,
            "prompt": prompt,
            "stream": true
        })
    }

    pub fn build_chat_request(&self, messages: &[ApiMessage]) -> serde_json::Value {
        let msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
            .collect();

        serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": true
        })
    }

    pub fn cost_estimate(&self) -> f32 {
        0.0 // Local models are free
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
    fn test_ollama_client() {
        let client = OllamaClient::new("http://localhost:11434").with_model("mistral");
        assert_eq!(client.model, "mistral");
        assert_eq!(client.cost_estimate(), 0.0);
    }

    #[test]
    fn test_build_request() {
        let client = OllamaClient::new("http://localhost:11434");
        let req = client.build_request("hello");
        assert_eq!(req["model"], "llama3.2");
    }
}
