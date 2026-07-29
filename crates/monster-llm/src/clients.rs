//! LLM clients — Anthropic, OpenAI, Gemini, Ollama.

pub mod anthropic {
    pub struct AnthropicClient { pub api_key: String }
    impl AnthropicClient {
        pub fn new(api_key: &str) -> Self { Self { api_key: api_key.to_string() } }
    }
}

pub mod openai {
    pub struct OpenAIClient { pub api_key: String }
    impl OpenAIClient {
        pub fn new(api_key: &str) -> Self { Self { api_key: api_key.to_string() } }
    }
}

pub mod gemini {
    pub struct GeminiClient { pub api_key: String }
    impl GeminiClient {
        pub fn new(api_key: &str) -> Self { Self { api_key: api_key.to_string() } }
    }
}

pub mod ollama {
    pub struct OllamaClient { pub base_url: String }
    impl OllamaClient {
        pub fn new(base_url: &str) -> Self { Self { base_url: base_url.to_string() } }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clients() {
        let _a = anthropic::AnthropicClient::new("test");
        let _o = openai::OpenAIClient::new("test");
        let _g = gemini::GeminiClient::new("test");
        let _ol = ollama::OllamaClient::new("http://localhost:11434");
    }
}
