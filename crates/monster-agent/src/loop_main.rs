//! Agent loop — main execution cycle with tool dispatch and LLM integration.

use monster_tools::registry::{ToolRegistry, ToolInput, ToolOutput};

pub struct AgentLoop {
    pub max_iterations: usize,
    pub current_iteration: usize,
    pub running: bool,
    pub energy_per_iteration: u32,
    pub total_energy_spent: u64,
    pub last_response: String,
    pub tool_calls: Vec<ToolCall>,
}

#[derive(Debug, Clone)]
pub struct ToolCall {
    pub name: String,
    pub args: std::collections::HashMap<String, serde_json::Value>,
    pub result: Option<ToolOutput>,
    pub iteration: usize,
}

impl AgentLoop {
    pub fn new(max_iterations: usize, energy_per_iteration: u32) -> Self {
        Self {
            max_iterations,
            current_iteration: 0,
            running: false,
            energy_per_iteration,
            total_energy_spent: 0,
            last_response: String::new(),
            tool_calls: Vec::new(),
        }
    }

    pub fn start(&mut self) {
        self.running = true;
        self.current_iteration = 0;
    }

    pub fn step(&mut self) -> AgentStepResult {
        if !self.running {
            return AgentStepResult::Stopped;
        }
        self.current_iteration += 1;
        self.total_energy_spent += self.energy_per_iteration as u64;

        if self.current_iteration >= self.max_iterations {
            self.running = false;
            return AgentStepResult::Completed;
        }
        AgentStepResult::Continue
    }

    /// Run a full agent loop: LLM generates a response, optionally calls tools,
    /// executes them, feeds results back, and repeats until no more tool calls
    /// or max iterations reached. Returns (response_text, total_tokens_consumed).
    pub async fn run(
        &mut self,
        prompt: &str,
        context: &mut AgentContext,
        tools: &ToolRegistry,
        router: &monster_llm::Router,
    ) -> anyhow::Result<(String, u32)> {
        self.start();
        context.add_user_message(prompt);
        let mut total_tokens: u32 = 0;

        loop {
            match self.step() {
                AgentStepResult::Continue => {}
                AgentStepResult::Completed => break,
                AgentStepResult::Stopped => break,
            }

            // Build messages for LLM
            let messages = context.to_api_messages();

            // Proactive compression — run before each LLM call
            context.compress_proactive();

            // Get LLM response
            let response = router.route_stream(
                &messages_to_prompt(&messages),
                "agent",
                |_| {},
            ).await?;

            total_tokens += response.total_tokens;
            self.last_response = response.text.clone();
            context.add_assistant_message(&response.text);

            // Check if response contains tool calls (JSON format)
            if let Some(tool_calls) = parse_tool_calls(&response.text) {
                // Execute all tool calls
                let mut tool_results_text = Vec::new();
                for tc in &tool_calls {
                    let input = ToolInput {
                        name: tc.name.clone(),
                        args: tc.args.clone(),
                    };
                    let result = tools.execute(&input)?;
                    context.add_tool_result(&tc.name, &result.content);
                    self.tool_calls.push(ToolCall {
                        name: tc.name.clone(),
                        args: tc.args.clone(),
                        result: Some(result.clone()),
                        iteration: self.current_iteration,
                    });
                    tool_results_text.push(format!("{}: {}", tc.name, result.content));
                }

                // Feed tool results back to LLM for processing
                let tool_prompt = format!(
                    "Tool results:\n{}\n\nBased on these results, provide your final answer or call more tools if needed.",
                    tool_results_text.join("\n")
                );
                context.add_user_message(&tool_prompt);

                // Continue the loop — LLM will either call more tools or give final answer
                continue;
            }

            // No tool calls — this is the final answer
            return Ok((response.text, total_tokens));
        }

        Ok((self.last_response.clone(), total_tokens))
    }

    pub fn stop(&mut self) {
        self.running = false;
    }

    pub fn reset(&mut self) {
        self.current_iteration = 0;
        self.running = false;
        self.total_energy_spent = 0;
        self.tool_calls.clear();
        self.last_response.clear();
    }

    pub fn progress(&self) -> f32 {
        if self.max_iterations == 0 { return 1.0; }
        self.current_iteration as f32 / self.max_iterations as f32
    }
}

/// Agent context for managing conversation history.
pub struct AgentContext {
    pub messages: Vec<ContextMessage>,
    pub max_tokens: usize,
    pub current_tokens: usize,
    pub system_prompt: String,
}

pub struct ContextMessage {
    pub role: String,
    pub content: String,
    pub tokens: usize,
}

impl AgentContext {
    pub fn new(max_tokens: usize) -> Self {
        Self {
            messages: Vec::new(),
            max_tokens,
            current_tokens: 0,
            system_prompt: "You are AgenMonster, a cute pixel-art monster companion living on the user's desktop. You can help with tasks: web search, code, research, computer control. Keep responses short and fun.".into(),
        }
    }

    pub fn with_system_prompt(mut self, prompt: &str) -> Self {
        self.system_prompt = prompt.to_string();
        self
    }

    /// Inject a matched skill's prompt and tool descriptions into the system prompt.
    pub fn inject_skill(&mut self, skill: &monster_skills::Skill) {
        // Add skill system prompt if available
        if let Some(sys_prompt) = skill.prompt("system") {
            self.system_prompt.push_str(&format!("\n\n[Skill: {}]\n{}", skill.id(), sys_prompt));
        }
        // Add skill tool descriptions
        if !skill.tools().is_empty() {
            self.system_prompt.push_str(&format!("\n\nAvailable skill tools for '{}':", skill.id()));
            for tool in skill.tools() {
                self.system_prompt.push_str(&format!("\n  - skill_{}_{}: {}", skill.id(), tool.name, tool.description));
                for example in &tool.examples {
                    self.system_prompt.push_str(&format!("\n    Example: {example}"));
                }
            }
        }
        // Add triggers as hints
        if !skill.triggers().is_empty() {
            self.system_prompt.push_str(&format!("\n\nTriggers for '{}': {}", skill.id(), skill.triggers().join(", ")));
        }
    }

    pub fn add_message(&mut self, role: &str, content: &str) {
        let tokens = content.len() / 4;
        self.messages.push(ContextMessage {
            role: role.to_string(),
            content: content.to_string(),
            tokens,
        });
        self.current_tokens += tokens;
        self.prune();
    }

    pub fn add_user_message(&mut self, content: &str) {
        self.add_message("user", content);
    }

    pub fn add_assistant_message(&mut self, content: &str) {
        self.add_message("assistant", content);
    }

    pub fn add_tool_result(&mut self, tool_name: &str, result: &str) {
        self.add_message("tool", &format!("[{tool_name}] {result}"));
    }

    /// Compress context proactively when approaching token budget.
    /// Uses extractive summarization: keeps key facts, drops noise.
    pub fn compress_proactive(&mut self) {
        // Proactive compression at 80% budget — prevents hitting hard limit
        let threshold = (self.max_tokens as f64 * 0.8) as usize;
        if self.current_tokens <= threshold {
            return; // Still have headroom
        }
        
        // Only compress if we have enough messages to make it worthwhile
        if self.messages.len() <= 6 {
            return;
        }
        
        // Compress oldest 25% of messages
        let compress_count = (self.messages.len() / 4).max(1);
        let compress_count = compress_count.min(self.messages.len() - 4);
        
        let mut key_facts: Vec<String> = Vec::new();
        let mut removed_tokens = 0;
        
        for _ in 0..compress_count {
            if self.messages.is_empty() { break; }
            let removed = self.messages.remove(0);
            removed_tokens += removed.tokens;
            
            let content = removed.content.to_lowercase();
            let has_key_signal = content.contains("error")
                || content.contains("found")
                || content.contains("result")
                || content.contains("answer")
                || content.contains("tool")
                || content.contains("search")
                || content.contains("file")
                || content.contains("created")
                || content.contains("completed")
                || content.contains("warning")
                || removed.role == "tool";
            
            if has_key_signal {
                let summary = if removed.content.len() > 150 {
                    format!("{}...", &removed.content[..147])
                } else {
                    removed.content.clone()
                };
                key_facts.push(format!("[{}]: {}", removed.role, summary));
            }
        }
        
        if !key_facts.is_empty() {
            let summary = format!(
                "[Context Summary — {} messages compressed]:\n{}",
                compress_count,
                key_facts.join("\n")
            );
            let summary_tokens = summary.len() / 4;
            self.messages.insert(0, ContextMessage {
                role: "system".into(),
                content: summary,
                tokens: summary_tokens,
            });
            self.current_tokens = self.current_tokens - removed_tokens + summary_tokens;
        } else {
            self.current_tokens -= removed_tokens;
        }
    }

    pub fn prune(&mut self) {
        // Smart compression: summarize oldest messages instead of dropping them
        while self.current_tokens > self.max_tokens && self.messages.len() > 4 {
            // Take the oldest 30% of messages for compression
            let compress_count = (self.messages.len() / 3).max(1);
            let compress_count = compress_count.min(self.messages.len() - 2);
            
            // Extract key facts from messages being compressed
            let mut key_facts: Vec<String> = Vec::new();
            let mut removed_tokens = 0;
            
            for _ in 0..compress_count {
                if self.messages.is_empty() { break; }
                let removed = self.messages.remove(0);
                removed_tokens += removed.tokens;
                
                // Extractive summarization: keep sentences with key signals
                let content = removed.content.to_lowercase();
                let has_key_signal = content.contains("error")
                    || content.contains("found")
                    || content.contains("result")
                    || content.contains("answer")
                    || content.contains("tool")
                    || content.contains("search")
                    || content.contains("file")
                    || content.contains("created")
                    || content.contains("completed")
                    || removed.role == "tool";
                
                if has_key_signal {
                    // Truncate long messages to 200 chars
                    let summary = if removed.content.len() > 200 {
                        format!("{}...", &removed.content[..197])
                    } else {
                        removed.content.clone()
                    };
                    key_facts.push(format!("[{}]: {}", removed.role, summary));
                }
            }
            
            // Replace compressed messages with a summary
            if !key_facts.is_empty() {
                let summary = format!(
                    "[Context Summary — {} messages compressed]:\n{}",
                    compress_count,
                    key_facts.join("\n")
                );
                let summary_tokens = summary.len() / 4;
                self.messages.insert(0, ContextMessage {
                    role: "system".into(),
                    content: summary,
                    tokens: summary_tokens,
                });
                self.current_tokens = self.current_tokens - removed_tokens + summary_tokens;
            } else {
                self.current_tokens -= removed_tokens;
            }
        }
        
        // Hard drop if still over budget (safety net)
        while self.current_tokens > self.max_tokens && self.messages.len() > 2 {
            let removed = self.messages.remove(0);
            self.current_tokens -= removed.tokens;
        }
    }

    pub fn clear(&mut self) {
        self.messages.clear();
        self.current_tokens = 0;
    }

    pub fn to_api_messages(&self) -> Vec<serde_json::Value> {
        let mut msgs = Vec::new();
        if !self.system_prompt.is_empty() {
            msgs.push(serde_json::json!({
                "role": "system",
                "content": self.system_prompt
            }));
        }
        for m in &self.messages {
            msgs.push(serde_json::json!({
                "role": m.role,
                "content": m.content
            }));
        }
        msgs
    }

    pub fn token_usage(&self) -> f32 {
        if self.max_tokens == 0 { return 0.0; }
        self.current_tokens as f32 / self.max_tokens as f32
    }

    pub fn message_count(&self) -> usize { self.messages.len() }
}

fn messages_to_prompt(messages: &[serde_json::Value]) -> String {
    messages.iter()
        .map(|m| {
            let role = m["role"].as_str().unwrap_or("user");
            let content = m["content"].as_str().unwrap_or("");
            format!("[{role}]: {content}")
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn parse_tool_calls(response: &str) -> Option<Vec<ToolCall>> {
    // Look for JSON tool call blocks in the response
    if let Some(start) = response.find("```tool_calls") {
        let rest = &response[start + 13..];
        if let Some(end) = rest.find("```") {
            let json_str = rest[..end].trim();
            if let Ok(calls) = serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
                let tool_calls: Vec<ToolCall> = calls.into_iter().filter_map(|v| {
                    let name = v["name"].as_str()?.to_string();
                    let args = v["args"].as_object()
                        .map(|o| o.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
                        .unwrap_or_default();
                    Some(ToolCall {
                        name,
                        args,
                        result: None,
                        iteration: 0,
                    })
                }).collect();
                if !tool_calls.is_empty() { return Some(tool_calls); }
            }
        }
    }
    None
}

pub enum AgentStepResult {
    Continue,
    Completed,
    Stopped,
}

impl Default for AgentLoop {
    fn default() -> Self { Self::new(100, 5) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_loop() {
        let mut loop_runner = AgentLoop::new(3, 5);
        loop_runner.start();
        assert!(matches!(loop_runner.step(), AgentStepResult::Continue));
        assert!(matches!(loop_runner.step(), AgentStepResult::Continue));
        assert!(matches!(loop_runner.step(), AgentStepResult::Completed));
        assert!(!loop_runner.running);
    }

    #[test]
    fn test_agent_loop_stop() {
        let mut loop_runner = AgentLoop::new(10, 5);
        loop_runner.start();
        loop_runner.stop();
        assert!(matches!(loop_runner.step(), AgentStepResult::Stopped));
    }

    #[test]
    fn test_progress() {
        let mut loop_runner = AgentLoop::new(4, 5);
        loop_runner.start();
        loop_runner.step();
        assert!((loop_runner.progress() - 0.25).abs() < 0.01);
    }

    #[test]
    fn test_context() {
        let mut ctx = AgentContext::new(1000).with_system_prompt("You are a pet.");
        ctx.add_user_message("hello");
        let msgs = ctx.to_api_messages();
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0]["role"], "system");
    }

    #[test]
    fn test_context_prune() {
        let mut ctx = AgentContext::new(100);
        for i in 0..20 {
            ctx.add_message("user", &format!("message {i} with some content here"));
        }
        assert!(ctx.current_tokens <= 100);
    }

    #[test]
    fn test_tool_call_parse() {
        let response = "Here's the result:\n```tool_calls\n[{\"name\": \"web_search\", \"args\": {\"query\": \"test\"}}]\n```";
        let calls = parse_tool_calls(response);
        assert!(calls.is_some());
        assert_eq!(calls.unwrap().len(), 1);
    }

    #[test]
    fn test_inject_skill() {
        let mut ctx = AgentContext::new(8000);
        let original_len = ctx.system_prompt.len();

        let skill = monster_skills::Skill {
            manifest: monster_skills::SkillManifest {
                skill: monster_skills::SkillMeta {
                    name: "test-skill".into(),
                    version: "1.0".into(),
                    author: "test".into(),
                    description: "A test".into(),
                    min_stage: "egg".into(),
                    tags: vec![],
                },
                tools: vec![monster_skills::SkillTool {
                    name: "do_thing".into(),
                    description: "Does a thing".into(),
                    parameters: vec![],
                    examples: vec!["do_thing hello".into()],
                }],
                prompts: {
                    let mut m = std::collections::HashMap::new();
                    m.insert("system".into(), "Be helpful.".into());
                    m
                },
                triggers: vec!["test".into()],
            },
            path: std::path::PathBuf::from("/tmp"),
            enabled: true,
        };

        ctx.inject_skill(&skill);
        assert!(ctx.system_prompt.len() > original_len);
        assert!(ctx.system_prompt.contains("[Skill: test-skill]"));
        assert!(ctx.system_prompt.contains("Be helpful."));
        assert!(ctx.system_prompt.contains("skill_test-skill_do_thing"));
    }
}
