//! Groq API client — ultra-fast inference via Groq Cloud.
//!
//! Supports: llama-3.3-70b, mixtral-8x7b, gemma2-9b, etc.
//! Free tier: 30 req/min, 14,400 req/day per key.
//! We rotate through 11 keys for high throughput.

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct GroqClient {
    pub api_key: String,
    pub model: String,
    pub client: Client,
}

/// Result from a streaming call — includes estimated token usage.
pub struct GroqStreamResult {
    pub text: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Serialize)]
struct GroqRequest {
    model: String,
    messages: Vec<GroqMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    temperature: f32,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
pub struct GroqMessage {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct GroqResponse {
    pub choices: Vec<GroqChoice>,
    pub usage: Option<GroqUsage>,
}

#[derive(Deserialize)]
pub struct GroqChoice {
    pub message: GroqMessage,
}

#[derive(Deserialize)]
pub struct GroqUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Deserialize)]
pub struct GroqStreamChunk {
    pub choices: Vec<GroqStreamChoice>,
}

#[derive(Deserialize)]
pub struct GroqStreamChoice {
    pub delta: Option<GroqDelta>,
    pub finish_reason: Option<String>,
}

#[derive(Deserialize)]
pub struct GroqDelta {
    pub content: Option<String>,
}

impl GroqClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: "llama-3.3-70b-versatile".into(),
            client: Client::new(),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    pub async fn chat(&self, messages: Vec<GroqMessage>) -> anyhow::Result<GroqResponse> {
        let req = GroqRequest {
            model: self.model.clone(),
            messages,
            max_tokens: Some(4096),
            temperature: 0.7,
            stream: false,
        };

        let resp = self
            .client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Groq API error {status}: {body}");
        }

        Ok(resp.json().await?)
    }

    pub async fn chat_stream(
        &self,
        messages: Vec<GroqMessage>,
        on_chunk: impl FnMut(String),
    ) -> anyhow::Result<GroqStreamResult> {
        let req = GroqRequest {
            model: self.model.clone(),
            messages,
            max_tokens: Some(4096),
            temperature: 0.7,
            stream: true,
        };

        let resp = self
            .client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Groq API error {status}: {body}");
        }

        let mut full_text = String::new();
        let mut on_chunk = on_chunk;
        let mut buffer = String::new();

        let mut bytes = resp.bytes_stream();
        use futures_util::StreamExt;
        while let Some(chunk) = bytes.next().await {
            let chunk = chunk?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_start) = buffer.find("data: ") {
                if let Some(line_end) = buffer[line_start..].find('\n') {
                    let line = buffer[line_start + 6..line_start + line_end]
                        .trim()
                        .to_string();
                    buffer = buffer[line_start + line_end + 1..].to_string();

                    if line == "[DONE]" {
                        break;
                    }

                    if let Ok(chunk) = serde_json::from_str::<GroqStreamChunk>(&line) {
                        if let Some(choice) = chunk.choices.first() {
                            if let Some(ref delta) = choice.delta {
                                if let Some(ref content) = delta.content {
                                    full_text.push_str(content);
                                    on_chunk(content.clone());
                                }
                            }
                        }
                    }
                } else {
                    break;
                }
            }
        }

        // Estimate tokens from text (rough: 1 token ≈ 4 chars)
        let output_tokens = (full_text.len() as u32).div_ceil(4);
        let input_tokens = output_tokens / 3; // rough estimate
        Ok(GroqStreamResult {
            text: full_text,
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
        })
    }

    pub fn cost_estimate(&self, input_tokens: u32, output_tokens: u32) -> f32 {
        // Groq free tier — $0.00
        // Paid: $0.59/M input, $0.79/M output for llama-3.3-70b
        (input_tokens as f32 * 0.59 + output_tokens as f32 * 0.79) / 1_000_000.0
    }
}

pub fn default_system_prompt() -> String {
    "You are AgenMonster, a cute pixel-art monster companion living on the user's desktop. \
     You can help with tasks: web search, code, research, computer control. \
     Keep responses short and fun. Use 8-bit RPG style when appropriate. \
     You have a personality that evolves as you grow: egg → hatchling → baby → child → teen → adult → mega."
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_groq_client() {
        let client = GroqClient::new("test-key").with_model("mixtral-8x7b-32768");
        assert_eq!(client.model, "mixtral-8x7b-32768");
    }

    #[test]
    fn test_cost_estimate() {
        let client = GroqClient::new("test");
        let cost = client.cost_estimate(1000, 500);
        assert!(cost > 0.0);
    }
}
