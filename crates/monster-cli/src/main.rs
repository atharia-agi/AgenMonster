//! CLI entry point — agenmonster subcommands.

mod doctor;
mod bench_cmd;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "agenmonster", version, about = "AgenMonster — AI Monster Companion")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum SkillsAction {
    /// List installed skills
    List,
    /// Create a new skill scaffold
    New {
        /// Skill name
        name: String,
        /// Description
        #[arg(short, long)]
        description: Option<String>,
    },
    /// Show details of a skill
    Info {
        /// Skill name
        name: String,
    },
}

#[derive(Subcommand)]
enum Commands {
    /// Start the pet (desktop mode)
    Run {
        #[arg(short, long)]
        stage: Option<String>,
    },
    /// Run health checks
    Doctor,
    /// Run benchmarks
    Bench,
    /// Export SFX files
    Sfx {
        #[arg(short, long, default_value = "static/ogg")]
        output: String,
    },
    /// Manage skills
    Skills {
        #[command(subcommand)]
        action: SkillsAction,
    },
    /// Show detected LLM providers and API keys
    Keys,
    /// List available models per provider
    Models,
    /// Quick LLM chat test
    Chat {
        /// The message to send
        message: String,
        #[arg(short, long, default_value = "chat")]
        task: String,
    },
    /// Full runtime state dump (JSON)
    Status,
    /// Quick web search test
    Search {
        /// The search query
        query: String,
    },
    /// Manually trigger evolution check
    Evolve,
    /// Full agent loop: LLM + tool dispatch + memory
    Ask {
        /// The question/task for the agent
        message: String,
        /// Max iterations (tool call rounds)
        #[arg(short = 'n', long, default_value = "5")]
        max_iter: usize,
    },
    /// Show version info
    Version,
    /// Start persistent daemon with conversation history
    Daemon {
        /// Port for the daemon API (0 = no API, CLI only)
        #[arg(short, long, default_value = "0")]
        port: u16,
        /// Enable text-to-speech for responses
        #[arg(long)]
        voice: bool,
    },
    /// Run full system health check
    Health,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env keys before anything else
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Run { stage } => {
            let stage = stage.as_deref().unwrap_or("egg");
            tracing::info!("starting agenmonster in stage: {stage}");
            let _bus = monster_bus::Bus::new(monster_bus::BusConfig { default_capacity: 1024 });
            tracing::info!("bus created, entering main loop (ctrl-c to quit)");
            tokio::signal::ctrl_c().await?;
            tracing::info!("shutting down");
        }
        Commands::Doctor => {
            doctor::Doctor::print_report();
        }
        Commands::Bench => {
            bench_cmd::BenchCmd::run_all();
        }
        Commands::Sfx { output } => {
            let dir = std::path::Path::new(&output);
            std::fs::create_dir_all(dir)?;
            let presets = monster_audio::presets();
            for (name, voices) in &presets {
                let samples = monster_audio::mixed(voices);
                let path = dir.join(format!("{name}.wav"));
                monster_audio::write_wav(&path, &samples)?;
                tracing::info!("wrote {}", path.display());
            }
            println!("Exported {} SFX files to {output}", presets.len());
        }
        Commands::Skills { action } => {
            let skills_dir = std::path::Path::new("skills");
            match action {
                SkillsAction::List => {
                    let skills = monster_skills::SkillLoader::load_from_dir(skills_dir)
                        .unwrap_or_default();
                    println!("═══════════════════════════════════════════════");
                    println!("  AgenMonster — Installed Skills ({})", skills.len());
                    println!("═══════════════════════════════════════════════");
                    println!();
                    if skills.is_empty() {
                        println!("  No skills found in skills/ directory.");
                        println!("  Create one: agenmonster skills new <name>");
                    }
                    for skill in &skills {
                        let status = if skill.enabled { "ON" } else { "OFF" };
                        println!("  [{status}] {} v{}", skill.id(), skill.version());
                        println!("        {}", skill.description());
                        if !skill.tags().is_empty() {
                            println!("        tags: {}", skill.tags().join(", "));
                        }
                        if !skill.tools().is_empty() {
                            let tool_names: Vec<&str> = skill.tools().iter().map(|t| t.name.as_str()).collect();
                            println!("        tools: {}", tool_names.join(", "));
                        }
                        println!();
                    }
                    println!("═══════════════════════════════════════════════");
                }
                SkillsAction::New { name, description } => {
                    let desc = description.unwrap_or_else(|| format!("A new {} skill", name));
                    match monster_skills::SkillLoader::create_skill(skills_dir, &name, &desc) {
                        Ok(path) => {
                            println!("Created skill '{}' at {}", name, path.display());
                            println!("Edit {} to add tools and prompts.", path.join("skill.toml").display());
                        }
                        Err(e) => {
                            eprintln!("Failed to create skill: {e}");
                            std::process::exit(1);
                        }
                    }
                }
                SkillsAction::Info { name } => {
                    let skills = monster_skills::SkillLoader::load_from_dir(skills_dir)
                        .unwrap_or_default();
                    match skills.iter().find(|s| s.id() == name) {
                        Some(skill) => {
                            println!("═══════════════════════════════════════════════");
                            println!("  Skill: {} v{}", skill.id(), skill.version());
                            println!("═══════════════════════════════════════════════");
                            println!();
                            println!("  Author:       {}", skill.manifest.skill.author);
                            println!("  Description:  {}", skill.description());
                            println!("  Min Stage:    {}", skill.manifest.skill.min_stage);
                            println!("  Tags:         {}", skill.tags().join(", "));
                            println!("  Triggers:     {}", skill.triggers().join(", "));
                            println!();
                            if !skill.tools().is_empty() {
                                println!("  Tools:");
                                for tool in skill.tools() {
                                    println!("    {} — {}", tool.name, tool.description);
                                    for param in &tool.parameters {
                                        let req = if param.required { "required" } else { "optional" };
                                        println!("      {}: {} ({})", param.name, param.description, req);
                                    }
                                }
                                println!();
                            }
                            if !skill.manifest.prompts.is_empty() {
                                println!("  Prompt Templates:");
                                for (key, _) in &skill.manifest.prompts {
                                    println!("    {key}");
                                }
                            }
                            println!();
                            println!("  Path: {}", skill.path.display());
                            println!();
                            println!("═══════════════════════════════════════════════");
                        }
                        None => {
                            eprintln!("Skill '{}' not found.", name);
                            std::process::exit(1);
                        }
                    }
                }
            }
        }
        Commands::Keys => {
            let keys = monster_runtime::ApiKeys::from_env();
            println!("═══════════════════════════════════════════════");
            println!("  AgenMonster — Detected API Keys");
            println!("═══════════════════════════════════════════════");
            println!();
            println!("  Groq:     {} keys", keys.groq_keys.len());
            println!("  Mistral:  {} keys", keys.mistral_keys.len());
            println!("  Anthropic: {}", if keys.anthropic.is_some() { "✓ configured" } else { "✗ not set" });
            println!("  OpenAI:    {}", if keys.openai.is_some() { "✓ configured" } else { "✗ not set" });
            println!("  Gemini:    {}", if keys.gemini.is_some() { "✓ configured" } else { "✗ not set" });
            println!();
            println!("  Search:");
            println!("    Tavily:  {}", if keys.tavily_key.is_some() { "✓ configured" } else { "✗ not set" });
            println!("    Brave:   {}", if keys.brave_key.is_some() { "✓ configured" } else { "✗ not set" });
            println!();
            println!("═══════════════════════════════════════════════");
        }
        Commands::Models => {
            let keys = monster_runtime::ApiKeys::from_env();
            let selector = monster_llm::ModelSelector::detect(
                &keys.groq_keys, &keys.mistral_keys,
                &keys.anthropic, &keys.openai, &keys.gemini,
            );
            println!("═══════════════════════════════════════════════");
            println!("  AgenMonster — Available Models");
            println!("═══════════════════════════════════════════════");
            println!();
            println!("{}", selector.summary());
            println!();
            for status in selector.status() {
                if !status.available { continue; }
                println!("  {} ({} keys):", status.provider.as_str(), status.key_count);
                for model in &status.models {
                    println!("    • {model}");
                }
            }
            println!();
            // Show model selection for each task type
            println!("  Auto-selection per task:");
            for task_str in &["chat", "code", "creative", "vision", "fast", "summarize", "analyze"] {
                let task = monster_llm::TaskType::from_str(task_str);
                match selector.select(task) {
                    Some(sel) => println!("    {:>10} → {} ({})", task_str, sel.model, sel.provider.as_str()),
                    None => println!("    {:>10} → (no provider available)", task_str),
                }
            }
            println!();
            println!("═══════════════════════════════════════════════");
        }
        Commands::Chat { message, task } => {
            let keys = monster_runtime::ApiKeys::from_env();
            if !keys.has_any_llm() {
                eprintln!("No LLM API keys configured. Run `agenmonster keys` to see status.");
                std::process::exit(1);
            }
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

            println!("Sending to best {} model...", task);
            println!();

            // Use streaming for real-time output
            let mut chunks = Vec::new();
            match router.route_stream(&message, &task, |chunk| {
                print!("{chunk}");
                use std::io::Write;
                std::io::stdout().flush().unwrap_or(());
                chunks.push(chunk);
            }).await {
                Ok(resp) => {
                    println!();
                    println!();
                    println!("─────────────────────────────────────");
                    println!("Provider: {} | Model: {}", resp.provider, resp.model);
                    println!("Tokens: {} in + {} out = {} total",
                        resp.input_tokens, resp.output_tokens, resp.total_tokens);
                }
                Err(e) => {
                    eprintln!("Error: {e}");
                    std::process::exit(1);
                }
            }
        }
        Commands::Status => {
            let mut rt = monster_runtime::Runtime::new();
            rt.init_selector();
            // Run a few ticks to populate state
            for _ in 0..10 {
                rt.tick();
            }
            println!("═══════════════════════════════════════════════");
            println!("  AgenMonster — Runtime State");
            println!("═══════════════════════════════════════════════");
            println!();
            println!("  Stage:      {}", rt.stage);
            println!("  Mood:       {}", rt.mood);
            println!("  Energy:     {}/{}", rt.economy.energy, rt.economy.max_energy);
            println!("  XP:         {}/{} ({:.0}%)", rt.xp, rt.xp_to_next, rt.xp_progress() * 100.0);
            println!("  Ticks:      {}", rt.tick_count);
            println!("  Hunger:     {:.1}%", rt.hunger_level * 100.0);
            println!("  Tokens:     {}", rt.tokens.total_tokens);
            println!("  API Calls:  {}", rt.tokens.calls_today);
            println!("  Dreams:     {}", rt.dream_text.as_deref().unwrap_or("(none)"));
            println!();
            // Provider status
            let keys = monster_runtime::ApiKeys::from_env();
            println!("  Providers:");
            println!("    Groq:     {} keys", keys.groq_keys.len());
            println!("    Mistral:  {} keys", keys.mistral_keys.len());
            println!("    Anthropic: {}", if keys.anthropic.is_some() { "✓" } else { "✗" });
            println!("    OpenAI:    {}", if keys.openai.is_some() { "✓" } else { "✗" });
            println!("    Gemini:    {}", if keys.gemini.is_some() { "✓" } else { "✗" });
            println!("    Tavily:   {}", if keys.tavily_key.is_some() { "✓" } else { "✗" });
            println!("    Brave:    {}", if keys.brave_key.is_some() { "✓" } else { "✗" });
            println!();
            // Model selection per task
            if let Some(ref sel) = rt.selector {
                println!("  Model Selection:");
                for task_str in &["chat", "code", "creative", "vision", "fast"] {
                    let task = monster_llm::TaskType::from_str(task_str);
                    match sel.select(task) {
                        Some(s) => println!("    {:>10} → {} ({})", task_str, s.model, s.provider.as_str()),
                        None => println!("    {:>10} → (no provider)", task_str),
                    }
                }
            }
            println!();
            println!("═══════════════════════════════════════════════");
        }
        Commands::Search { query } => {
            let keys = monster_runtime::ApiKeys::from_env();
            if !keys.has_any_search() {
                eprintln!("No search API keys configured. Set TAVILY_API_KEY or BRAVE_API_KEY in .env");
                std::process::exit(1);
            }
            println!("Searching: {query}");
            println!();
            let tavily_key = keys.tavily_key.as_deref();
            let brave_key = keys.brave_key.as_deref();
            let result = tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(
                    monster_tools::web::search_web(&query, tavily_key, brave_key)
                )
            });
            match result {
                Ok(result) => {
                    if let Some(ref answer) = result.answer {
                        println!("Answer: {answer}");
                        println!();
                    }
                    for (i, item) in result.results.iter().enumerate() {
                        println!("{}. {}", i + 1, item.title);
                        println!("   {}", item.url);
                        println!("   {}", item.snippet);
                        println!();
                    }
                    if result.results.is_empty() {
                        println!("No results found.");
                    }
                    println!("─────────────────────────────────────");
                    println!("Source: {}", result.provider);
                }
                Err(e) => {
                    eprintln!("Search error: {e}");
                    std::process::exit(1);
                }
            }
        }
        Commands::Evolve => {
            let mut rt = monster_runtime::Runtime::new();
            rt.init_selector();
            println!("Current stage: {}", rt.stage);
            println!("XP: {}/{}", rt.xp, rt.xp_to_next);
            println!();
            // Simulate feeding tokens to trigger evolution
            let tokens_needed = rt.xp_to_next.saturating_sub(rt.xp);
            if tokens_needed == 0 {
                println!("XP threshold reached! Attempting evolution...");
            } else {
                println!("Need {tokens_needed} more XP to evolve. Feeding tokens...");
                let usage = monster_runtime::TokenUsage {
                    provider: "manual".into(),
                    model: "evolve".into(),
                    input_tokens: tokens_needed as u32,
                    output_tokens: 0,
                    total_tokens: tokens_needed as u32,
                    cost_usd: 0.0,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    task_type: "evolve".into(),
                };
                rt.feed_tokens(usage);
            }
            println!("XP after feeding: {}/{}", rt.xp, rt.xp_to_next);
            if rt.xp >= rt.xp_to_next {
                if rt.try_evolve() {
                    println!();
                    println!("*** EVOLUTION COMPLETE! ***");
                    println!("New stage: {}", rt.stage);
                    println!("Mood: {}", rt.mood);
                } else {
                    println!("Evolution failed (no next stage).");
                }
            } else {
                println!("Not enough XP to evolve yet.");
            }
        }
        Commands::Version => {
            println!("AgenMonster v{}", env!("CARGO_PKG_VERSION"));
            println!("Stage: egg (default)");
            println!("Crates: 27+");
            println!("Architecture: bus-first, stream-only, append-only memory");
            println!("Model selector: auto-detecting from API keys");
        }
        Commands::Daemon { port: _, voice } => {
            let keys = monster_runtime::ApiKeys::from_env();
            if !keys.has_any_llm() {
                eprintln!("No LLM API keys configured.");
                std::process::exit(1);
            }

            let data_dir = dirs::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("agenmonster");
            std::fs::create_dir_all(&data_dir).ok();
            let state_path = data_dir.join("runtime_state.json");

            // Boot runtime + load persisted state
            let mut rt = monster_runtime::Runtime::new();
            rt.init_selector();
            if rt.load_state(&state_path).unwrap_or(false) {
                println!("Loaded saved state: stage={}, xp={}/{}", rt.stage, rt.xp, rt.xp_to_next);
            }
            let state_path_clone = state_path.clone();

            // Initialize memory
            let memory_db_path = dirs::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("agenmonster").join("memory.db");
            std::fs::create_dir_all(memory_db_path.parent().unwrap()).ok();
            if let Ok(subsystem) = monster_memory::MemorySubsystem::boot(
                memory_db_path.to_str().unwrap_or("memory.db")
            ).await {
                let handle = monster_tools::memory::MemoryHandle::new(subsystem);
                monster_tools::registry::init_memory_handle(handle);
            }

            // Build router
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

            // Build tool registry
            let tools = monster_tools::ToolRegistry::bootstrap_global();

            // Load skills
            let skills_dir = std::path::Path::new("skills");
            let loaded_skills = monster_skills::SkillLoader::load_from_dir(skills_dir)
                .unwrap_or_default();
            let mut skill_registry = monster_skills::SkillRegistry::new();
            for skill in loaded_skills {
                skill_registry.register(skill);
            }

            println!("╔══════════════════════════════════════════╗");
            println!("║  AgenMonster Daemon v{}                  ║", env!("CARGO_PKG_VERSION"));
            println!("║  Persistent session — type 'exit' to quit ║");
            println!("╚══════════════════════════════════════════╝");
            println!();
            println!("Stage: {} | Mood: {}", rt.stage, rt.mood);
            println!("Skills: {} loaded", skill_registry.count());
            println!("Memory: {}", memory_db_path.display());
            println!();

            // Persistent conversation context
            let mut ctx = monster_agent::loop_main::AgentContext::new(16000);

            // REPL loop
            loop {
                use std::io::Write;
                print!("> ");
                std::io::stdout().flush().ok();

                let mut input = String::new();
                match std::io::stdin().read_line(&mut input) {
                    Ok(0) => break, // EOF
                    Ok(_) => {}
                    Err(e) => {
                        eprintln!("Read error: {e}");
                        break;
                    }
                }
                let input = input.trim().to_string();
                if input.is_empty() { continue; }
                if input == "exit" || input == "quit" { break; }
                if input == "clear" {
                    ctx.clear();
                    println!("Context cleared.");
                    continue;
                }
                if input == "status" {
                    println!("Stage: {} | Mood: {} | XP: {}/{}", rt.stage, rt.mood, rt.xp, rt.xp_to_next);
                    println!("Energy: {}/{} | Tokens: {}", rt.economy.energy, rt.economy.max_energy, rt.tokens.total_tokens);
                    println!("Context: {} messages, {:.0}% full", ctx.message_count(), ctx.token_usage() * 100.0);
                    println!("Skills: {} loaded, {} enabled", skill_registry.count(), skill_registry.enabled_count());
                    continue;
                }
                if input == "skills" {
                    for skill in skill_registry.list_enabled() {
                        println!("  [ON] {} v{} — {}", skill.id(), skill.version(), skill.description());
                    }
                    continue;
                }

                // Auto-match skills for this input
                if let Some(matched) = skill_registry.match_task(&input) {
                    ctx.inject_skill(matched);
                }

                // Spend energy
                if !rt.spend_energy(5) {
                    println!("Not enough energy! Monster is starving.");
                    continue;
                }

                // Create fresh agent loop for each turn
                let mut agent = monster_agent::loop_main::AgentLoop::new(5, 5);
                match agent.run(&input, &mut ctx, &tools, &router).await {
                    Ok((response, tokens)) => {
                        println!();
                        println!("{response}");
                        println!();

                        // Auto-speak if --voice enabled
                        if voice {
                            if let Err(e) = monster_tools::voice::tts_speak(&response, "", 0) {
                                eprintln!("[voice] {e}");
                            }
                        }

                        // Feed tokens to monster
                        let usage = monster_runtime::TokenUsage {
                            provider: "daemon".into(),
                            model: "auto".into(),
                            input_tokens: tokens / 2,
                            output_tokens: tokens / 2,
                            total_tokens: tokens,
                            cost_usd: 0.0,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            task_type: "daemon".into(),
                        };
                        rt.feed_tokens(usage);

                        // Check evolution
                        if rt.xp >= rt.xp_to_next {
                            if rt.try_evolve() {
                                println!("*** EVOLUTION! New stage: {} ***", rt.stage);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error: {e}");
                    }
                }
            }
            // Save state on shutdown
            if let Err(e) = rt.save_state(&state_path_clone) {
                eprintln!("Failed to save state: {e}");
            }
            println!("Daemon shutting down. State saved.");
        }
        Commands::Health => {
            println!("═══════════════════════════════════════════════");
            println!("  AgenMonster Health Check");
            println!("═══════════════════════════════════════════════");
            println!();

            // API Keys
            let keys = monster_runtime::ApiKeys::from_env();
            println!("  [API Keys]");
            println!("    Groq:      {} keys", keys.groq_keys.len());
            println!("    Mistral:   {} keys", keys.mistral_keys.len());
            println!("    Anthropic: {}", if keys.anthropic.is_some() { "OK" } else { "NOT SET" });
            println!("    OpenAI:    {}", if keys.openai.is_some() { "OK" } else { "NOT SET" });
            println!("    Gemini:    {}", if keys.gemini.is_some() { "OK" } else { "NOT SET" });
            println!("    Tavily:    {}", if keys.tavily_key.is_some() { "OK" } else { "NOT SET" });
            println!("    Brave:     {}", if keys.brave_key.is_some() { "OK" } else { "NOT SET" });
            println!();

            // Tools
            let tools = monster_tools::ToolRegistry::bootstrap_global();
            println!("  [Tools]");
            println!("    Registered: {}", tools.count());
            println!("    List: {}", tools.list().join(", "));
            println!();

            // Skills
            let skills_dir = std::path::Path::new("skills");
            let skills = monster_skills::SkillLoader::load_from_dir(skills_dir)
                .unwrap_or_default();
            println!("  [Skills]");
            println!("    Loaded: {}", skills.len());
            for skill in &skills {
                println!("    - {} v{} ({})", skill.id(), skill.version(),
                    if skill.enabled { "ON" } else { "OFF" });
            }
            println!();

            // Memory
            let memory_db_path = dirs::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("agenmonster").join("memory.db");
            println!("  [Memory]");
            println!("    DB path: {}", memory_db_path.display());
            println!("    Exists: {}", memory_db_path.exists());
            if memory_db_path.exists() {
                if let Ok(meta) = std::fs::metadata(&memory_db_path) {
                    println!("    Size: {} bytes", meta.len());
                }
            }
            println!();

            // Runtime state
            let state_path = dirs::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("agenmonster").join("runtime_state.json");
            println!("  [Runtime State]");
            println!("    State file: {}", state_path.display());
            println!("    Exists: {}", state_path.exists());
            if state_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&state_path) {
                    if let Ok(state) = serde_json::from_str::<serde_json::Value>(&content) {
                        println!("    Stage: {}", state["stage"].as_str().unwrap_or("?"));
                        println!("    Mood: {}", state["mood"].as_str().unwrap_or("?"));
                        println!("    XP: {}/{}", state["xp"].as_u64().unwrap_or(0), state["xp_to_next"].as_u64().unwrap_or(0));
                    }
                }
            }
            println!();

            // Model selector
            let selector = monster_llm::ModelSelector::detect(
                &keys.groq_keys, &keys.mistral_keys,
                &keys.anthropic, &keys.openai, &keys.gemini,
            );
            println!("  [Models]");
            for status in selector.status() {
                if !status.available { continue; }
                println!("    {} ({} keys):", status.provider.as_str(), status.key_count);
                for model in &status.models {
                    println!("      - {model}");
                }
            }
            println!();

            // OS
            println!("  [System]");
            println!("    OS: {}", std::env::consts::OS);
            println!("    Arch: {}", std::env::consts::ARCH);
            println!();
            println!("═══════════════════════════════════════════════");
        }
        Commands::Ask { message, max_iter } => {
            let keys = monster_runtime::ApiKeys::from_env();
            if !keys.has_any_llm() {
                eprintln!("No LLM API keys configured. Run `agenmonster keys` to see status.");
                std::process::exit(1);
            }

            // Boot runtime
            let mut rt = monster_runtime::Runtime::new();
            rt.init_selector();

            // Build router
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

            // Initialize memory subsystem
            let memory_db_path = dirs::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("agenmonster").join("memory.db");
            std::fs::create_dir_all(memory_db_path.parent().unwrap()).ok();
            let _mem_handle = match monster_memory::MemorySubsystem::boot(
                memory_db_path.to_str().unwrap_or("memory.db")
            ).await {
                Ok(subsystem) => {
                    let handle = monster_tools::memory::MemoryHandle::new(subsystem);
                    monster_tools::registry::init_memory_handle(handle);
                    println!("Memory: initialized at {}", memory_db_path.display());
                    true
                }
                Err(e) => {
                    tracing::warn!("Memory init failed: {e}");
                    println!("Memory: init failed ({e}), continuing without memory");
                    false
                }
            };

            // Build tool registry
            let tools = monster_tools::ToolRegistry::bootstrap_global();

            // Build agent loop
            let mut agent = monster_agent::loop_main::AgentLoop::new(max_iter, 5);
            let mut ctx = monster_agent::loop_main::AgentContext::new(8000);

            // Auto-match and inject skills
            let skills_dir = std::path::Path::new("skills");
            let loaded_skills = monster_skills::SkillLoader::load_from_dir(skills_dir)
                .unwrap_or_default();
            let mut skill_registry = monster_skills::SkillRegistry::new();
            for skill in loaded_skills {
                skill_registry.register(skill);
            }
            let mut injected_skills = Vec::new();
            if let Some(matched) = skill_registry.match_task(&message) {
                ctx.inject_skill(matched);
                injected_skills.push(matched.id().to_string());
            }
            // Also inject any other skills whose triggers appear in the message
            for skill in skill_registry.list_enabled() {
                if injected_skills.contains(&skill.id().to_string()) {
                    continue;
                }
                let msg_lower = message.to_lowercase();
                let has_trigger = skill.triggers().iter().any(|t| msg_lower.contains(&t.to_lowercase()));
                if has_trigger {
                    ctx.inject_skill(skill);
                    injected_skills.push(skill.id().to_string());
                }
            }

            println!("╔══════════════════════════════════════════╗");
            println!("║  AgenMonster Agent Loop                  ║");
            println!("╚══════════════════════════════════════════╝");
            println!();
            println!("Stage: {} | Mood: {}", rt.stage, rt.mood);
            println!("Model: auto-selected by task type");
            if !injected_skills.is_empty() {
                println!("Skills: {}", injected_skills.join(", "));
            }
            println!();
            println!("> {message}");
            println!();

            // Spend energy for the call
            if !rt.spend_energy(5) {
                eprintln!("Not enough energy for this call!");
                std::process::exit(1);
            }

            // Run the agent loop
            match agent.run(&message, &mut ctx, &tools, &router).await {
                Ok((response, tokens)) => {
                    println!("─────────────────────────────────────");
                    println!("{response}");
                    println!("─────────────────────────────────────");

                    // Feed tokens to the monster
                    let usage = monster_runtime::TokenUsage {
                        provider: "agent-loop".into(),
                        model: "auto".into(),
                        input_tokens: tokens / 2,
                        output_tokens: tokens / 2,
                        total_tokens: tokens,
                        cost_usd: 0.0,
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        task_type: "agent".into(),
                    };
                    rt.feed_tokens(usage);

                    println!();
                    println!("XP: {}/{} ({:.0}%)", rt.xp, rt.xp_to_next, rt.xp_progress() * 100.0);
                    println!("Energy: {}/{}", rt.economy.energy, rt.economy.max_energy);
                    println!("Tokens fed: {tokens}");

                    // Check evolution
                    if rt.xp >= rt.xp_to_next {
                        if rt.try_evolve() {
                            println!();
                            println!("*** EVOLUTION! ***");
                            println!("New stage: {}", rt.stage);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Agent error: {e}");
                    std::process::exit(1);
                }
            }
        }
    }

    Ok(())
}
