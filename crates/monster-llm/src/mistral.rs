//! Mistral API client — fast + strong models.
//!
//! Supports: mistral-large-latest, mistral-small-latest, codestral-latest, open-mistral-nemo
//! Free tier available with rate limits.

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct MistralClient {
    pub api_key: String,
    pub model: String,
    pub client: Client,
}

/// Result from a streaming call — includes estimated token usage.
pub struct MistralStreamResult {
    pub text: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Serialize)]
struct MistralRequest {
    model: String,
    messages: Vec<MistralMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    temperature: f32,
    stream: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MistralMessage {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct MistralResponse {
    pub choices: Vec<MistralChoice>,
    pub usage: Option<MistralUsage>,
}

#[derive(Deserialize)]
pub struct MistralChoice {
    pub message: MistralMessage,
}

#[derive(Deserialize)]
pub struct MistralUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Deserialize)]
pub struct MistralStreamChunk {
    pub choices: Vec<MistralStreamChoice>,
}

#[derive(Deserialize)]
pub struct MistralStreamChoice {
    pub delta: Option<MistralDelta>,
}

#[derive(Deserialize)]
pub struct MistralDelta {
    pub content: Option<String>,
}

impl MistralClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: "mistral-large-latest".into(),
            client: Client::new(),
        }
    }

    pub fn with_model(mut self, model: &str) -> Self {
        self.model = model.to_string();
        self
    }

    pub async fn chat(&self, messages: Vec<MistralMessage>) -> anyhow::Result<MistralResponse> {
        let req = MistralRequest {
            model: self.model.clone(),
            messages,
            max_tokens: Some(4096),
            temperature: 0.7,
            stream: false,
        };

        let resp = self
            .client
            .post("https://api.mistral.ai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Mistral API error {status}: {body}");
        }

        Ok(resp.json().await?)
    }

    pub async fn chat_stream(
        &self,
        messages: Vec<MistralMessage>,
        mut on_chunk: impl FnMut(String),
    ) -> anyhow::Result<MistralStreamResult> {
        let req = MistralRequest {
            model: self.model.clone(),
            messages,
            max_tokens: Some(4096),
            temperature: 0.7,
            stream: true,
        };

        let resp = self
            .client
            .post("https://api.mistral.ai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Mistral API error {status}: {body}");
        }

        let mut full_text = String::new();
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

                    if let Ok(chunk) = serde_json::from_str::<MistralStreamChunk>(&line) {
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
        let output_tokens = (full_text.len() as u32 + 3) / 4;
        let input_tokens = output_tokens / 3;
        Ok(MistralStreamResult {
            text: full_text,
            input_tokens,
            output_tokens,
            total_tokens: input_tokens + output_tokens,
        })
    }

    pub async fn code_complete(&self, prompt: &str, language: &str) -> anyhow::Result<String> {
        let messages = vec![
            MistralMessage {
                role: "system".into(),
                content: format!("You are a code assistant. Complete the {language} code. Output only the code, no explanation."),
            },
            MistralMessage {
                role: "user".into(),
                content: prompt.to_string(),
            },
        ];

        let resp = self.chat(messages).await?;
        Ok(resp
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default())
    }

    pub fn cost_estimate(&self, input_tokens: u32, output_tokens: u32) -> f32 {
        // mistral-large: $2/M input, $6/M output
        // mistral-small: $0.1/M input, $0.3/M output
        let (input_rate, output_rate) = match self.model.as_str() {
            "mistral-large-latest" => (2.0, 6.0),
            "mistral-small-latest" => (0.1, 0.3),
            "codestral-latest" => (0.3, 0.9),
            _ => (2.0, 6.0),
        };
        (input_tokens as f32 * input_rate + output_tokens as f32 * output_rate) / 1_000_000.0
    }
}

pub fn default_system_prompt() -> String {
    "You are AgenMonster, a cute pixel-art monster companion living on the user's desktop. \
     You can help with tasks: web search, code, research, computer control. \
     Keep responses short and fun. Use 8-bit RPG style when appropriate."
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mistral_client() {
        let client = MistralClient::new("test-key").with_model("mistral-small-latest");
        assert_eq!(client.model, "mistral-small-latest");
    }

    #[test]
    fn test_cost_estimate() {
        let client = MistralClient::new("test");
        let cost = client.cost_estimate(1000, 500);
        assert!(cost > 0.0);
    }
}
