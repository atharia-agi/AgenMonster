//! Agent bridge — connects Tauri IPC to the real agent loop (LLM + tools).

use std::sync::{Arc, Mutex};
use monster_runtime::Runtime;

pub struct AgentBridge {
    pub runtime: Arc<Mutex<Runtime>>,
    pub memory_initialized: bool,
}

impl AgentBridge {
    pub fn new(runtime: Arc<Mutex<Runtime>>) -> Self {
        Self {
            runtime,
            memory_initialized: false,
        }
    }

    /// Initialize memory subsystem (call once at startup).
    pub fn init_memory(&mut self) {
        if self.memory_initialized { return; }
        let db_path = dirs::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("agenmonster").join("memory.db");
        std::fs::create_dir_all(db_path.parent().unwrap()).ok();

        if let Ok(subsystem) = pollster::block_on(monster_memory::MemorySubsystem::boot(
            db_path.to_str().unwrap_or("memory.db")
        )) {
            let handle = monster_tools::memory::MemoryHandle::new(subsystem);
            monster_tools::registry::init_memory_handle(handle);
            self.memory_initialized = true;
        }
    }

    /// Process a user message through the real agent loop (blocking).
    /// Returns (response_text, tokens_consumed).
    pub fn process_message_sync(&self, user_message: &str) -> (String, u32) {
        let rt = self.runtime.lock().unwrap();
        let keys = monster_runtime::ApiKeys::from_env();
        drop(rt);

        let cfg = monster_llm::routing::RouterCfg::default();
        let router = monster_llm::Router::new(
            monster_llm::ApiKeys {
                groq_keys: keys.groq_keys,
                mistral_keys: keys.mistral_keys,
                anthropic: keys.anthropic,
                openai: keys.openai,
                gemini: keys.gemini,
            },
            cfg,
        );

        let tools = monster_tools::ToolRegistry::bootstrap_global();
        let mut ctx = monster_agent::loop_main::AgentContext::new(12000);

        // Auto-match and inject skills
        let skills_dir = std::path::Path::new("skills");
        let loaded_skills = monster_skills::SkillLoader::load_from_dir(skills_dir)
            .unwrap_or_default();
        let mut skill_registry = monster_skills::SkillRegistry::new();
        for skill in loaded_skills {
            skill_registry.register(skill);
        }
        let msg_lower = user_message.to_lowercase();
        for skill in skill_registry.list_enabled() {
            let has_trigger = skill.triggers().iter().any(|t| msg_lower.contains(&t.to_lowercase()));
            if has_trigger {
                ctx.inject_skill(skill);
                break;
            }
        }

        let rt = self.runtime.lock().unwrap();
        drop(rt);

        let mut agent = monster_agent::loop_main::AgentLoop::new(5, 5);
        let result = pollster::block_on(agent.run(user_message, &mut ctx, &tools, &router));

        match result {
            Ok((response, tokens)) => (response, tokens),
            Err(e) => (format!("[Agent Error] {e}"), 0),
        }
    }
}
