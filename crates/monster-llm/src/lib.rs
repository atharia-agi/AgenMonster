//! LLM crate — smart routing across Groq, Mistral, Anthropic, OpenAI, Gemini.
//!
//! Priority for free/cheap: Groq (fastest) → Mistral (strong) → custom keys.
//! Key rotation: we cycle through multiple API keys per provider for throughput.

pub mod anthropic;
pub mod openai;
pub mod gemini;
pub mod ollama;
pub mod groq;
pub mod mistral;
pub mod routing;
pub mod adaptive;
pub mod stream;
pub mod sse;
pub mod clients;
pub mod model_selector;
pub mod key_rotation;

pub use model_selector::{ModelSelector, Provider, TaskType, Selection, ProviderStatus};

use routing::RouterCfg;

/// Response from an LLM call, including token usage for monster feeding.
#[derive(Debug, Clone)]
pub struct LlmResponse {
    pub text: String,
    pub provider: String,
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
}

pub struct Router {
    pub groq_keys: Vec<String>,
    pub mistral_keys: Vec<String>,
    pub anthropic_key: Option<String>,
    pub openai_key: Option<String>,
    pub gemini_key: Option<String>,
    pub cfg: RouterCfg,
    pub selector: ModelSelector,
    groq_index: std::sync::atomic::AtomicUsize,
    mistral_index: std::sync::atomic::AtomicUsize,
}

impl Router {
    pub fn new(keys: ApiKeys, cfg: RouterCfg) -> Self {
        let selector = ModelSelector::detect(
            &keys.groq_keys, &keys.mistral_keys,
            &keys.anthropic, &keys.openai, &keys.gemini,
        );
        Self {
            groq_keys: keys.groq_keys,
            mistral_keys: keys.mistral_keys,
            anthropic_key: keys.anthropic,
            openai_key: keys.openai,
            gemini_key: keys.gemini,
            cfg,
            selector,
            groq_index: std::sync::atomic::AtomicUsize::new(0),
            mistral_index: std::sync::atomic::AtomicUsize::new(0),
        }
    }

    /// Add a key at runtime and re-detect available providers.
    pub fn add_key_runtime(&mut self, provider: Provider, key: String) {
        match provider {
            Provider::Groq => {
                if !self.groq_keys.contains(&key) {
                    self.groq_keys.push(key);
                }
            }
            Provider::Mistral => {
                if !self.mistral_keys.contains(&key) {
                    self.mistral_keys.push(key);
                }
            }
            Provider::Anthropic => self.anthropic_key = Some(key),
            Provider::OpenAI => self.openai_key = Some(key),
            Provider::Gemini => self.gemini_key = Some(key),
            Provider::Ollama => {} // handled separately
        }
        self.selector.update_availability(
            &self.groq_keys, &self.mistral_keys,
            &self.anthropic_key, &self.openai_key, &self.gemini_key,
        );
        tracing::info!(
            provider = provider.as_str(),
            total_providers = self.selector.status().iter().filter(|s| s.available).count(),
            "Provider added, re-detected"
        );
    }

    /// Remove a key at runtime.
    pub fn remove_key_runtime(&mut self, provider: Provider, key: &str) {
        match provider {
            Provider::Groq => self.groq_keys.retain(|k| k != key),
            Provider::Mistral => self.mistral_keys.retain(|k| k != key),
            Provider::Anthropic => self.anthropic_key = None,
            Provider::OpenAI => self.openai_key = None,
            Provider::Gemini => self.gemini_key = None,
            Provider::Ollama => {}
        }
        self.selector.update_availability(
            &self.groq_keys, &self.mistral_keys,
            &self.anthropic_key, &self.openai_key, &self.gemini_key,
        );
    }

    /// Select best model for a task using the ModelSelector.
    pub fn select_model(&self, task_type: &str) -> Option<Selection> {
        self.selector.select(TaskType::from_str(task_type))
    }

    /// Get full fallback chain for a task.
    pub fn fallback_chain(&self, task_type: &str) -> Vec<Selection> {
        self.selector.select_with_fallback(TaskType::from_str(task_type))
    }

    /// Get next Groq key (round-robin rotation)
    fn next_groq_key(&self) -> Option<&str> {
        if self.groq_keys.is_empty() { return None; }
        let idx = self.groq_index.fetch_add(1, std::sync::atomic::Ordering::Relaxed) % self.groq_keys.len();
        Some(&self.groq_keys[idx])
    }

    /// Get next Mistral key (round-robin rotation)
    fn next_mistral_key(&self) -> Option<&str> {
        if self.mistral_keys.is_empty() { return None; }
        let idx = self.mistral_index.fetch_add(1, std::sync::atomic::Ordering::Relaxed) % self.mistral_keys.len();
        Some(&self.mistral_keys[idx])
    }

    /// Route a prompt to the best available LLM.
    /// Priority: Groq (fastest/free) → Mistral (strong) → Anthropic → OpenAI → Gemini
    /// Returns LlmResponse with text + token usage for monster feeding.
    pub async fn route(&self, prompt: &str, _task_type: &str) -> anyhow::Result<LlmResponse> {
        // Try Groq first (fastest, free tier)
        if let Some(key) = self.next_groq_key() {
            let client = groq::GroqClient::new(key);
            let messages = vec![
                groq::GroqMessage { role: "system".into(), content: groq::default_system_prompt() },
                groq::GroqMessage { role: "user".into(), content: prompt.to_string() },
            ];
            match client.chat(messages).await {
                Ok(resp) => {
                    if let Some(choice) = resp.choices.first() {
                        let usage = resp.usage.unwrap_or(groq::GroqUsage { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
                        return Ok(LlmResponse {
                            text: choice.message.content.clone(),
                            provider: "groq".into(),
                            model: client.model,
                            input_tokens: usage.prompt_tokens,
                            output_tokens: usage.completion_tokens,
                            total_tokens: usage.total_tokens,
                        });
                    }
                }
                Err(e) => {
                    tracing::warn!(error = %e, "Groq failed, trying next provider");
                }
            }
        }

        // Try Mistral next (strong)
        if let Some(key) = self.next_mistral_key() {
            let client = mistral::MistralClient::new(key);
            let messages = vec![
                mistral::MistralMessage { role: "system".into(), content: mistral::default_system_prompt() },
                mistral::MistralMessage { role: "user".into(), content: prompt.to_string() },
            ];
            match client.chat(messages).await {
                Ok(resp) => {
                    if let Some(choice) = resp.choices.first() {
                        let usage = resp.usage.unwrap_or(mistral::MistralUsage { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
                        return Ok(LlmResponse {
                            text: choice.message.content.clone(),
                            provider: "mistral".into(),
                            model: client.model,
                            input_tokens: usage.prompt_tokens,
                            output_tokens: usage.completion_tokens,
                            total_tokens: usage.total_tokens,
                        });
                    }
                }
                Err(e) => {
                    tracing::warn!(error = %e, "Mistral failed, trying next provider");
                }
            }
        }

        // Try Anthropic
        if let Some(ref key) = self.anthropic_key {
            let client = anthropic::AnthropicClient::new(key);
            let messages = vec![
                anthropic::ApiMessage { role: "user".into(), content: prompt.to_string() },
            ];
            let req = client.build_request(&messages);
            match self.call_anthropic(key, &req).await {
                Ok(text) => return Ok(LlmResponse {
                    text, provider: "anthropic".into(), model: "claude-3.5-sonnet".into(),
                    input_tokens: 0, output_tokens: 0, total_tokens: 0,
                }),
                Err(e) => tracing::warn!(error = %e, "Anthropic failed"),
            }
        }

        // Try OpenAI
        if let Some(ref key) = self.openai_key {
            let client = openai::OpenAIClient::new(key);
            let messages = vec![
                openai::ApiMessage { role: "user".into(), content: prompt.to_string() },
            ];
            let req = client.build_request(&messages);
            match self.call_openai(key, &req).await {
                Ok(text) => return Ok(LlmResponse {
                    text, provider: "openai".into(), model: "gpt-4o".into(),
                    input_tokens: 0, output_tokens: 0, total_tokens: 0,
                }),
                Err(e) => tracing::warn!(error = %e, "OpenAI failed"),
            }
        }

        // Try Gemini
        if let Some(ref key) = self.gemini_key {
            let client = gemini::GeminiClient::new(key);
            let messages = vec![
                gemini::ApiMessage { role: "user".into(), content: prompt.to_string() },
            ];
            let req = client.build_request(&messages);
            match self.call_gemini(key, &req).await {
                Ok(text) => return Ok(LlmResponse {
                    text, provider: "gemini".into(), model: "gemini-2.5-flash".into(),
                    input_tokens: 0, output_tokens: 0, total_tokens: 0,
                }),
                Err(e) => tracing::warn!(error = %e, "Gemini failed"),
            }
        }

        anyhow::bail!("No LLM API key configured. Set GROQ_API_KEY, MISTRAL_API_KEY_1, ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in .env")
    }

    /// Route with streaming callback. Returns LlmResponse with token usage.
    pub async fn route_stream(
        &self,
        prompt: &str,
        task_type: &str,
        mut on_chunk: impl FnMut(String),
    ) -> anyhow::Result<LlmResponse> {
        // Try Groq first (supports streaming)
        if let Some(key) = self.next_groq_key() {
            let client = groq::GroqClient::new(key);
            let messages = vec![
                groq::GroqMessage { role: "system".into(), content: groq::default_system_prompt() },
                groq::GroqMessage { role: "user".into(), content: prompt.to_string() },
            ];
            match client.chat_stream(messages, |chunk| on_chunk(chunk)).await {
                Ok(result) => return Ok(LlmResponse {
                    text: result.text,
                    provider: "groq".into(),
                    model: client.model,
                    input_tokens: result.input_tokens,
                    output_tokens: result.output_tokens,
                    total_tokens: result.total_tokens,
                }),
                Err(e) => tracing::warn!(error = %e, "Groq stream failed"),
            }
        }

        // Try Mistral (supports streaming)
        if let Some(key) = self.next_mistral_key() {
            let client = mistral::MistralClient::new(key);
            let messages = vec![
                mistral::MistralMessage { role: "system".into(), content: mistral::default_system_prompt() },
                mistral::MistralMessage { role: "user".into(), content: prompt.to_string() },
            ];
            match client.chat_stream(messages, |chunk| on_chunk(chunk)).await {
                Ok(result) => return Ok(LlmResponse {
                    text: result.text,
                    provider: "mistral".into(),
                    model: client.model,
                    input_tokens: result.input_tokens,
                    output_tokens: result.output_tokens,
                    total_tokens: result.total_tokens,
                }),
                Err(e) => tracing::warn!(error = %e, "Mistral stream failed"),
            }
        }

        // Fallback to non-streaming
        self.route(prompt, task_type).await
    }

    async fn call_anthropic(&self, key: &str, req: &serde_json::Value) -> anyhow::Result<String> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Anthropic error {status}: {body}");
        }

        let v: serde_json::Value = resp.json().await?;
        Ok(v["content"][0]["text"].as_str().unwrap_or("").to_string())
    }

    async fn call_openai(&self, key: &str, req: &serde_json::Value) -> anyhow::Result<String> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {key}"))
            .header("Content-Type", "application/json")
            .json(req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("OpenAI error {status}: {body}");
        }

        let v: serde_json::Value = resp.json().await?;
        Ok(v["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string())
    }

    async fn call_gemini(&self, key: &str, req: &serde_json::Value) -> anyhow::Result<String> {
        let client = reqwest::Client::new();
        let resp = client
            .post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"))
            .header("Content-Type", "application/json")
            .json(req)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("Gemini error {status}: {body}");
        }

        let v: serde_json::Value = resp.json().await?;
        Ok(v["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("").to_string())
    }

    pub fn anthropic_default(&self) -> Option<String> {
        self.anthropic_key.clone()
    }

    pub fn provider_count(&self) -> usize {
        let mut count = 0;
        if !self.groq_keys.is_empty() { count += 1; }
        if !self.mistral_keys.is_empty() { count += 1; }
        if self.anthropic_key.is_some() { count += 1; }
        if self.openai_key.is_some() { count += 1; }
        if self.gemini_key.is_some() { count += 1; }
        count
    }

    pub fn status(&self) -> String {
        format!(
            "Providers: {} | Groq: {} keys | Mistral: {} keys | Anthropic: {} | OpenAI: {} | Gemini: {}",
            self.provider_count(),
            self.groq_keys.len(),
            self.mistral_keys.len(),
            if self.anthropic_key.is_some() { "✓" } else { "✗" },
            if self.openai_key.is_some() { "✓" } else { "✗" },
            if self.gemini_key.is_some() { "✓" } else { "✗" },
        )
    }
}

#[derive(Default, Clone)]
pub struct ApiKeys {
    pub groq_keys: Vec<String>,
    pub mistral_keys: Vec<String>,
    pub anthropic: Option<String>,
    pub openai: Option<String>,
    pub gemini: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_router_status() {
        let router = Router::new(
            ApiKeys {
                groq_keys: vec!["key1".into(), "key2".into()],
                mistral_keys: vec!["key1".into()],
                ..Default::default()
            },
            RouterCfg::default(),
        );
        assert_eq!(router.provider_count(), 2);
        let status = router.status();
        assert!(status.contains("Groq: 2"));
        assert!(status.contains("Mistral: 1"));
    }
}
