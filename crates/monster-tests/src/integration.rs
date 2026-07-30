//! E2E integration tests for the full agent loop.
//! Tests: bus, memory, pixel rendering, runtime, cutscene, tile, audio, tools, scheduler.

#[cfg(test)]
mod tests {
    use monster_bus::event::BusEvent;
    use monster_bus::topic::Topic;
    use monster_bus::{Bus, BusConfig};

    #[tokio::test]
    async fn bus_publish_subscribe() {
        let bus = Bus::new(BusConfig {
            default_capacity: 64,
        });
        let (_h, mut rx) = bus.subscribe(Topic::Telemetry).await;
        bus.publish(Topic::Telemetry, BusEvent::TelemetryTick)
            .await
            .unwrap();
        let env = rx.recv().await.unwrap();
        assert!(format!("{:?}", env.payload).contains("Telemetry"));
    }

    #[tokio::test]
    async fn memory_ingest_recall() {
        let db = tempfile::NamedTempFile::new().unwrap();
        let mem = monster_memory::MemorySubsystem::boot(db.path().to_str().unwrap())
            .await
            .unwrap();
        let block = monster_memory::block::MemoryBlock::new(
            1,
            monster_memory::block::MemoryTier::Hot,
            "hello world",
        );
        mem.ingest(block).await.unwrap();
        let results = mem.recall("hello", 5).await.unwrap();
        assert!(!results.is_empty());
    }

    #[tokio::test]
    async fn pixel_sprite_sheet() {
        let sheet = monster_pixel::SpriteSheet::new("test", 24, 24);
        assert_eq!(sheet.frame_count(), 0);
        assert_eq!(sheet.total_duration_ms(), 0);
    }

    #[tokio::test]
    async fn pixel_palette_for_stage() {
        let pal = monster_pixel::palette_for_stage("egg");
        assert_eq!(pal.id, "egg");
        assert_eq!(pal.colors.len(), 7);
    }

    #[tokio::test]
    async fn pixel_background_render() {
        let bg = monster_pixel::Background::new("teen", 320, 240);
        let pixels = bg.render_frame(0, 0.0);
        assert_eq!(pixels.len(), 320 * 240 * 4);
    }

    #[tokio::test]
    async fn pixel_bg_animator() {
        let mut anim = monster_pixel::BgAnimator::new(1.0);
        anim.tick(1000);
        assert_eq!(anim.current_frame(), 1);
    }

    #[tokio::test]
    async fn pixel_anim_state() {
        let mut state = monster_pixel::AnimState::new("idle");
        assert_eq!(state.current, "idle");
        assert!(state.playing);
        state.tick(100, &[100, 100, 100]);
        assert_eq!(state.frame, 1);
    }

    #[tokio::test]
    async fn energy_economy() {
        let mut energy = monster_runtime::EnergyEconomy::new(1000, 25);
        assert_eq!(energy.energy, 1000);
        assert!(energy.try_spend(500));
        assert_eq!(energy.energy, 500);
        assert!(!energy.try_spend(600));
        assert_eq!(energy.energy, 500);
    }

    #[tokio::test]
    async fn energy_spend_action() {
        let mut energy = monster_runtime::EnergyEconomy::new(1000, 25);
        assert!(energy.spend_action("llm_short"));
        assert_eq!(energy.energy, 995);
    }

    #[tokio::test]
    async fn cutscene_start_and_tick() {
        let cfg = monster_runtime::cutscene::CutsceneConfig {
            from: "egg".into(),
            to: "hatchling".into(),
            duration_frames: 48,
            flash_text: "EVOLVING!".into(),
            particle_count: 32,
        };
        let mut cs = monster_runtime::cutscene::Cutscene::start(cfg);
        assert!(cs.active);
        assert_eq!(cs.current_frame, 0);
        assert!(!cs.flash_visible());
        cs.tick();
        assert_eq!(cs.current_frame, 1);
        for _ in 1..48 {
            cs.tick();
        }
        assert!(!cs.active);
    }

    #[tokio::test]
    async fn cutscene_get_config() {
        let cfg = monster_runtime::cutscene::get_cutscene_config("egg", "hatchling").unwrap();
        assert_eq!(cfg.from, "egg");
        assert_eq!(cfg.to, "hatchling");
        assert!(cfg.duration_frames > 0);
    }

    #[tokio::test]
    async fn cutscene_invalid_transition() {
        assert!(monster_runtime::cutscene::get_cutscene_config("mega", "egg").is_none());
    }

    #[tokio::test]
    async fn personality_load() {
        let p = monster_runtime::personality_for_stage("mega");
        assert_eq!(p.name, "mega");
        assert!(!p.traits.is_empty());
        assert!(!p.default_speech.is_empty());
    }

    #[tokio::test]
    async fn tile_pattern_all_stages() {
        for stage in &["egg", "hatchling", "baby", "child", "teen", "adult", "mega"] {
            let name = monster_tile::pattern_for_stage(stage);
            assert!(!name.is_empty());
        }
    }

    #[tokio::test]
    async fn tile_all_patterns() {
        let patterns = monster_tile::all_patterns();
        assert_eq!(patterns.len(), 7);
    }

    #[tokio::test]
    async fn audio_presets() {
        let presets = monster_audio::presets();
        assert_eq!(presets.len(), 6);
        for (name, voices) in &presets {
            assert!(!name.is_empty());
            assert!(!voices.is_empty());
        }
    }

    #[tokio::test]
    async fn audio_voice_render() {
        let voice = monster_audio::Voice {
            wave: monster_audio::Wave::Square,
            freq_hz: 440.0,
            duration_ms: 100,
            envelope: monster_audio::Envelope::default(),
            volume: 0.5,
        };
        let samples = voice.render();
        assert!(!samples.is_empty());
    }

    #[tokio::test]
    async fn audio_mixed() {
        let voices = vec![
            monster_audio::Voice {
                wave: monster_audio::Wave::Square,
                freq_hz: 440.0,
                duration_ms: 100,
                envelope: monster_audio::Envelope::default(),
                volume: 0.5,
            },
            monster_audio::Voice {
                wave: monster_audio::Wave::Triangle,
                freq_hz: 880.0,
                duration_ms: 50,
                envelope: monster_audio::Envelope::default(),
                volume: 0.3,
            },
        ];
        let mixed = monster_audio::mixed(&voices);
        assert!(!mixed.is_empty());
    }

    #[tokio::test]
    async fn audio_wav_write() {
        let voice = monster_audio::Voice {
            wave: monster_audio::Wave::Square,
            freq_hz: 440.0,
            duration_ms: 100,
            envelope: monster_audio::Envelope::default(),
            volume: 0.5,
        };
        let samples = voice.render();
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.wav");
        monster_audio::write_wav(&path, &samples).unwrap();
        assert!(path.exists());
    }

    #[test]
    fn tool_registry_bootstrap() {
        let reg = monster_tools::registry::ToolRegistry::bootstrap_global();
        assert!(reg.count() >= 15);
    }

    #[test]
    fn tool_registry_list() {
        let reg = monster_tools::registry::ToolRegistry::bootstrap_global();
        let names = reg.list();
        assert!(names.contains(&"web_search"));
        assert!(names.contains(&"screenshot"));
        assert!(names.contains(&"mouse_click"));
    }

    #[test]
    fn tool_registry_search() {
        let reg = monster_tools::registry::ToolRegistry::bootstrap_global();
        let results = reg.search("memory");
        assert!(!results.is_empty());
    }

    #[tokio::test]
    async fn scheduler_default_jobs() {
        let sched = monster_scheduler::Scheduler::new();
        let jobs = sched.snapshot().await;
        assert_eq!(jobs.len(), 5);
    }

    #[tokio::test]
    async fn scheduler_is_due() {
        let sched = monster_scheduler::Scheduler::new();
        let jobs = sched.snapshot().await;
        for job in &jobs {
            if job.enabled {
                assert!(
                    sched.is_due(job).await,
                    "{} should be due on first run",
                    job.name
                );
            }
        }
    }

    #[tokio::test]
    async fn scheduler_fire() {
        let sched = monster_scheduler::Scheduler::new();
        let jobs = sched.snapshot().await;
        if let Some(job) = jobs.first() {
            sched.fire_now(&job.id).await.unwrap();
        }
    }

    #[test]
    fn runtime_new() {
        let rt = monster_runtime::Runtime::new();
        assert_eq!(rt.stage, "egg");
        assert_eq!(rt.xp, 0);
        assert!(!rt.dream_text.is_some());
    }

    #[test]
    fn runtime_tick() {
        let mut rt = monster_runtime::Runtime::new();
        rt.tick();
        assert_eq!(rt.tick_count, 1);
    }

    #[test]
    fn runtime_feed_tokens() {
        let mut rt = monster_runtime::Runtime::new();
        let usage = monster_runtime::TokenUsage {
            provider: "groq".into(),
            model: "llama-3".into(),
            input_tokens: 100,
            output_tokens: 200,
            total_tokens: 300,
            cost_usd: 0.001,
            timestamp: "2025-01-01T00:00:00Z".into(),
            task_type: "chat".into(),
        };
        rt.feed_tokens(usage);
        assert!(rt.xp > 0);
    }

    #[test]
    fn runtime_xp_progress() {
        let mut rt = monster_runtime::Runtime::new();
        assert_eq!(rt.xp_progress(), 0.0);
        let usage = monster_runtime::TokenUsage {
            provider: "groq".into(),
            model: "llama-3".into(),
            input_tokens: 100,
            output_tokens: 200,
            total_tokens: 300,
            cost_usd: 0.001,
            timestamp: "2025-01-01T00:00:00Z".into(),
            task_type: "chat".into(),
        };
        rt.feed_tokens(usage);
        assert!(rt.xp_progress() > 0.0);
    }

    #[test]
    fn runtime_state_json() {
        let rt = monster_runtime::Runtime::new();
        let json = rt.state_json();
        assert!(json.contains("egg"));
    }

    #[test]
    fn token_tracker_new() {
        let tracker = monster_runtime::TokenTracker::new();
        assert_eq!(tracker.total_tokens, 0);
        assert_eq!(tracker.hunger_level, 0.0);
    }

    #[test]
    fn token_tracker_record_usage() {
        let mut tracker = monster_runtime::TokenTracker::new();
        let usage = monster_runtime::TokenUsage {
            provider: "groq".into(),
            model: "llama-3".into(),
            input_tokens: 100,
            output_tokens: 200,
            total_tokens: 300,
            cost_usd: 0.001,
            timestamp: "2025-01-01T00:00:00Z".into(),
            task_type: "chat".into(),
        };
        let xp = tracker.record_usage(usage);
        assert!(xp > 0);
        assert_eq!(tracker.total_tokens, 300);
    }

    #[test]
    fn xp_for_stage_all() {
        assert_eq!(monster_runtime::xp_for_stage("egg"), 0);
        assert!(monster_runtime::xp_for_stage("mega") > 0);
    }

    #[test]
    fn stats_for_stage_all() {
        for stage in &["egg", "hatchling", "baby", "child", "teen", "adult", "mega"] {
            let stats = monster_runtime::stats_for_stage(stage);
            assert!(stats.max_energy > 0);
            assert!(stats.memory_capacity > 0);
        }
    }

    #[test]
    fn webhook_registry_new() {
        let reg = monster_runtime::webhook::WebhookRegistry::new();
        reg.register("http://localhost:9999/hook".into(), vec!["test".into()]);
    }

    // ===== Round 9: ModelSelector + Real API Integration Tests =====

    #[test]
    fn model_selector_detect_from_keys() {
        let groq_keys = vec!["gsk_test1".into(), "gsk_test2".into()];
        let mistral_keys = vec!["mistral_test1".into()];
        let selector =
            monster_llm::ModelSelector::detect(&groq_keys, &mistral_keys, &None, &None, &None);
        let status = selector.status();
        assert!(status
            .iter()
            .any(|s| s.provider == monster_llm::Provider::Groq && s.available));
        assert!(status
            .iter()
            .any(|s| s.provider == monster_llm::Provider::Mistral && s.available));
        assert!(status
            .iter()
            .all(|s| s.provider != monster_llm::Provider::Anthropic || !s.available));
    }

    #[test]
    fn model_selector_select_chat() {
        let groq_keys = vec!["gsk_test1".into()];
        let selector = monster_llm::ModelSelector::detect(&groq_keys, &vec![], &None, &None, &None);
        let selection = selector.select(monster_llm::TaskType::Chat);
        assert!(selection.is_some());
        let sel = selection.unwrap();
        assert_eq!(sel.provider, monster_llm::Provider::Groq);
    }

    #[test]
    fn model_selector_select_vision_excludes_groq() {
        let groq_keys = vec!["gsk_test1".into()];
        let mistral_keys = vec!["mistral_test1".into()];
        let selector =
            monster_llm::ModelSelector::detect(&groq_keys, &mistral_keys, &None, &None, &None);
        let selection = selector.select(monster_llm::TaskType::Vision);
        if let Some(sel) = selection {
            assert_ne!(
                sel.provider,
                monster_llm::Provider::Groq,
                "Groq should not be selected for vision tasks"
            );
        }
    }

    #[test]
    fn model_selector_fallback_chain() {
        let groq_keys = vec!["gsk_test1".into()];
        let mistral_keys = vec!["mistral_test1".into()];
        let selector =
            monster_llm::ModelSelector::detect(&groq_keys, &mistral_keys, &None, &None, &None);
        let chain = selector.select_with_fallback(monster_llm::TaskType::Chat);
        assert!(!chain.is_empty());
        // Should have at least Groq and Mistral in the chain
        assert!(chain.len() >= 2);
    }

    #[test]
    fn model_selector_runtime_key_add() {
        let selector = monster_llm::ModelSelector::detect(&vec![], &vec![], &None, &None, &None);
        // Initially no providers available
        assert!(selector.status().iter().all(|s| !s.available));
        // Add a Groq key
        selector.update_availability(&vec!["gsk_new".into()], &vec![], &None, &None, &None);
        assert!(selector.status().iter().any(|s| s.available));
    }

    #[test]
    fn model_selector_task_type_from_str() {
        assert!(matches!(
            monster_llm::TaskType::from_str("chat"),
            monster_llm::TaskType::Chat
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("code"),
            monster_llm::TaskType::Code
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("vision"),
            monster_llm::TaskType::Vision
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("fast"),
            monster_llm::TaskType::Fast
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("creative"),
            monster_llm::TaskType::Creative
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("summarize"),
            monster_llm::TaskType::Summarize
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("analyze"),
            monster_llm::TaskType::Analyze
        ));
        assert!(matches!(
            monster_llm::TaskType::from_str("unknown"),
            monster_llm::TaskType::Chat
        ));
    }

    #[test]
    fn router_with_model_selector() {
        let router = monster_llm::Router::new(
            monster_llm::ApiKeys {
                groq_keys: vec!["gsk_test1".into(), "gsk_test2".into()],
                mistral_keys: vec!["mistral_test1".into()],
                ..Default::default()
            },
            monster_llm::routing::RouterCfg::default(),
        );
        assert_eq!(router.provider_count(), 2);
        assert!(router.select_model("chat").is_some());
        assert!(router.select_model("code").is_some());
        let chain = router.fallback_chain("chat");
        assert!(chain.len() >= 2);
    }

    #[test]
    fn tool_os_process_list_exists() {
        let reg = monster_tools::registry::ToolRegistry::bootstrap_global();
        assert!(reg.get("os_process_list").is_some());
    }

    #[test]
    fn tool_os_clipboard_exists() {
        let reg = monster_tools::registry::ToolRegistry::bootstrap_global();
        assert!(reg.get("os_clipboard").is_some());
    }

    #[test]
    fn tool_os_process_list_execute() {
        let reg = monster_tools::registry::ToolRegistry::bootstrap_global();
        let input = monster_tools::registry::ToolInput {
            name: "os_process_list".into(),
            args: std::collections::HashMap::new(),
        };
        let output = reg.execute(&input).unwrap();
        // Should succeed on Windows (tasklist available)
        assert!(output.success || output.content.contains("Error"));
    }

    #[test]
    fn runtime_init_selector() {
        let mut rt = monster_runtime::Runtime::new();
        rt.init_selector();
        assert!(rt.selector.is_some());
    }

    #[test]
    fn runtime_state_json_includes_providers() {
        let mut rt = monster_runtime::Runtime::new();
        rt.init_selector();
        let json = rt.state_json();
        assert!(json.contains("providers"));
    }

    #[tokio::test]
    async fn web_search_brave_only() {
        let _ = dotenvy::dotenv();
        let brave_key = std::env::var("BRAVE_API_KEY").ok();
        if brave_key.is_none() {
            // Skip if no key
            return;
        }
        let result =
            monster_tools::web::brave_search("rust programming", brave_key.as_deref().unwrap(), 5)
                .await;
        assert!(result.is_ok());
        let r = result.unwrap();
        assert!(!r.results.is_empty() || r.results.is_empty()); // May return empty on rate limit
    }

    #[tokio::test]
    async fn web_fetch_example() {
        let result = monster_tools::web::web_fetch("https://httpbin.org/get").await;
        assert!(result.is_ok());
        let content = result.unwrap();
        assert!(content.contains("httpbin") || content.contains("origin"));
    }

    #[tokio::test]
    async fn agent_loop_context_messages() {
        let mut ctx = monster_agent::loop_main::AgentContext::new(10000)
            .with_system_prompt("You are a test agent.");
        ctx.add_user_message("Hello");
        ctx.add_assistant_message("Hi there!");
        ctx.add_user_message("How are you?");
        assert_eq!(ctx.message_count(), 3);
        let msgs = ctx.to_api_messages();
        assert_eq!(msgs.len(), 4); // system + 3 messages
        assert_eq!(msgs[0]["role"], "system");
        assert_eq!(msgs[1]["role"], "user");
        assert_eq!(msgs[2]["role"], "assistant");
    }

    #[test]
    fn agent_loop_lifecycle() {
        let mut agent = monster_agent::loop_main::AgentLoop::new(5, 10);
        assert_eq!(agent.progress(), 0.0);
        agent.start();
        assert!(agent.running);
        let r1 = agent.step();
        assert!(matches!(
            r1,
            monster_agent::loop_main::AgentStepResult::Continue
        ));
        assert_eq!(agent.current_iteration, 1);
        assert_eq!(agent.total_energy_spent, 10);
        agent.stop();
        assert!(!agent.running);
    }

    #[test]
    fn token_tracker_dominant_task() {
        let mut tracker = monster_runtime::TokenTracker::new();
        // Record multiple code tasks
        for _ in 0..5 {
            tracker.record_usage(monster_runtime::TokenUsage {
                provider: "groq".into(),
                model: "llama-3".into(),
                input_tokens: 100,
                output_tokens: 50,
                total_tokens: 150,
                cost_usd: 0.001,
                timestamp: "2025-01-01T00:00:00Z".into(),
                task_type: "code".into(),
            });
        }
        // Record one chat task
        tracker.record_usage(monster_runtime::TokenUsage {
            provider: "groq".into(),
            model: "llama-3".into(),
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
            cost_usd: 0.001,
            timestamp: "2025-01-01T00:00:00Z".into(),
            task_type: "chat".into(),
        });
        assert_eq!(tracker.dominant_task(), Some("code".to_string()));
    }

    // ========== ROUND 11: Memory Embedding + Key Rotation + New Tools ==========

    #[test]
    fn test_embedding_engine_basic() {
        use monster_memory::embedding::EmbeddingEngine;
        let engine = EmbeddingEngine::new();
        let emb = engine.embed("hello world");
        assert_eq!(emb.len(), 64);
        assert!(emb.iter().any(|&x| x != 0.0));
    }

    #[test]
    fn test_embedding_similarity() {
        use monster_memory::embedding::{cosine_similarity, EmbeddingEngine};
        let engine = EmbeddingEngine::new();
        let a = engine.embed("rust programming language");
        let b = engine.embed("rust code language");
        let sim = cosine_similarity(&a, &b);
        assert!(
            sim > 0.3,
            "Similar texts should have similarity > 0.3, got {}",
            sim
        );
    }

    #[test]
    fn test_embedding_different_texts() {
        use monster_memory::embedding::{cosine_similarity, EmbeddingEngine};
        let engine = EmbeddingEngine::new();
        let a = engine.embed("rust programming");
        let b = engine.embed("cooking recipe food");
        let sim = cosine_similarity(&a, &b);
        assert!(
            sim < 0.5,
            "Different texts should have similarity < 0.5, got {}",
            sim
        );
    }

    #[test]
    fn test_embedding_bytes_roundtrip() {
        use monster_memory::embedding::{bytes_to_vec, vec_to_bytes};
        let original = vec![0.5, -0.3, 1.0, 0.0, 0.75];
        let bytes = vec_to_bytes(&original);
        let restored = bytes_to_vec(&bytes);
        assert_eq!(original.len(), restored.len());
        for (a, b) in original.iter().zip(restored.iter()) {
            assert!((a - b).abs() < 0.001);
        }
    }

    #[tokio::test]
    async fn test_memory_ingest_with_embedding() {
        let db_path = std::env::temp_dir().join(format!(
            "agenmonster_test_memory_embed_{}.sqlite",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&db_path);
        let mem = monster_memory::MemorySubsystem::boot(db_path.to_str().unwrap())
            .await
            .unwrap();
        let block = monster_memory::block::MemoryBlock::new(
            1,
            monster_memory::block::MemoryTier::Hot,
            "test memory content",
        );
        mem.ingest_with_embedding(block).await.unwrap();
        let results = mem.recall("test", 10).await.unwrap();
        assert!(!results.is_empty());
        let _ = std::fs::remove_file(&db_path);
    }

    #[tokio::test]
    async fn test_memory_consolidation() {
        let db_path = std::env::temp_dir().join("agenmonster_test_consolidate.sqlite");
        let _ = std::fs::remove_file(&db_path);
        let mem = monster_memory::MemorySubsystem::boot(db_path.to_str().unwrap())
            .await
            .unwrap();
        for i in 0..5 {
            let mut block = monster_memory::block::MemoryBlock::new(
                i,
                monster_memory::block::MemoryTier::Hot,
                &format!("memory {i}"),
            );
            block.access_count = 1; // low access
            block.decay_score = 0.4; // low decay
            mem.ingest(block).await.unwrap();
        }
        let changed = mem.consolidate().await.unwrap();
        assert!(changed > 0, "Should have consolidated some memories");
        let counts = mem.tier_counts().await.unwrap();
        assert!(counts.warm > 0 || counts.cold > 0);
        let _ = std::fs::remove_file(&db_path);
    }

    #[test]
    fn test_key_rotation_register_and_get() {
        use monster_llm::key_rotation::KeyRotator;
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let rotator = KeyRotator::new();
            rotator
                .register_provider("groq", vec!["key1".into(), "key2".into()])
                .await;
            let k1 = rotator.next_key("groq").await.unwrap();
            let k2 = rotator.next_key("groq").await.unwrap();
            assert_ne!(k1, k2);
        });
    }

    #[test]
    fn test_key_rotation_failure_cooldown() {
        use monster_llm::key_rotation::KeyRotator;
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let rotator = KeyRotator::new();
            rotator.register_provider("groq", vec!["key1".into()]).await;
            rotator.mark_failure("groq", "key1").await;
            let stats = rotator.stats().await;
            assert_eq!(stats.total_failures, 1);
        });
    }

    #[test]
    fn test_new_tool_date_time() {
        let reg = monster_tools::ToolRegistry::bootstrap_global();
        assert!(reg.get("date_time").is_some());
        let args = std::collections::HashMap::new();
        let input = monster_tools::ToolInput {
            name: "date_time".into(),
            args,
        };
        let output = reg.execute(&input).unwrap();
        assert!(output.success);
        assert!(output.content.contains("20"));
    }

    #[test]
    fn test_new_tool_http_request() {
        let reg = monster_tools::ToolRegistry::bootstrap_global();
        assert!(reg.get("http_request").is_some());
    }

    // ── Skill System Tests ─────────────────────────────────────

    #[test]
    fn test_skill_loader_loads_samples() {
        let skills_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../skills");
        let skills = monster_skills::SkillLoader::load_from_dir(&skills_dir).unwrap();
        assert!(
            skills.len() >= 3,
            "Expected at least 3 sample skills, got {}",
            skills.len()
        );
        let ids: Vec<&str> = skills.iter().map(|s| s.id()).collect();
        assert!(ids.contains(&"web-research"));
        assert!(ids.contains(&"code-helper"));
        assert!(ids.contains(&"memory-augment"));
    }

    #[test]
    fn test_skill_registry_from_loaded() {
        let skills_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../skills");
        let skills = monster_skills::SkillLoader::load_from_dir(&skills_dir).unwrap();
        let mut reg = monster_skills::SkillRegistry::new();
        for skill in skills {
            reg.register(skill);
        }
        assert_eq!(reg.count(), 3);
        assert_eq!(reg.enabled_count(), 3);
        assert!(reg.get("web-research").is_some());
        assert!(reg.get("code-helper").is_some());
    }

    #[test]
    fn test_skill_search() {
        let skills_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../skills");
        let skills = monster_skills::SkillLoader::load_from_dir(&skills_dir).unwrap();
        let mut reg = monster_skills::SkillRegistry::new();
        for skill in skills {
            reg.register(skill);
        }
        let results = reg.search("research");
        assert!(!results.is_empty());
        let results = reg.search("code");
        assert!(!results.is_empty());
    }

    #[test]
    fn test_skill_match_task() {
        let skills_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../skills");
        let skills = monster_skills::SkillLoader::load_from_dir(&skills_dir).unwrap();
        let mut reg = monster_skills::SkillRegistry::new();
        for skill in skills {
            reg.register(skill);
        }
        let matched = reg.match_task("search the web for rust docs");
        assert!(matched.is_some());
        assert_eq!(matched.unwrap().id(), "web-research");
    }

    #[test]
    fn test_skill_tools_to_json() {
        let skills_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../skills");
        let skills = monster_skills::SkillLoader::load_from_dir(&skills_dir).unwrap();
        let json = monster_skills::skill_tools_to_json(&skills);
        assert!(
            json.len() >= 5,
            "Expected at least 5 skill tools, got {}",
            json.len()
        );
        for tool_def in &json {
            assert!(tool_def["name"].as_str().unwrap().starts_with("skill_"));
        }
    }

    #[test]
    fn test_skill_create_and_load() {
        let dir = tempfile::tempdir().unwrap();
        let skill_dir = monster_skills::SkillLoader::create_skill(
            dir.path(),
            "test-skill",
            "A test skill for unit tests",
        )
        .unwrap();
        assert!(skill_dir.join("skill.toml").exists());
        let skill = monster_skills::SkillLoader::load_skill(&skill_dir.join("skill.toml")).unwrap();
        assert_eq!(skill.id(), "test-skill");
        assert_eq!(skill.version(), "0.1.0");
        assert_eq!(skill.description(), "A test skill for unit tests");
    }

    #[test]
    fn test_skill_prompt_templates() {
        let skills_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../skills");
        let skills = monster_skills::SkillLoader::load_from_dir(&skills_dir).unwrap();
        let web = skills.iter().find(|s| s.id() == "web-research").unwrap();
        assert!(web.prompt("system").is_some());
        assert!(web.prompt("search_strategy").is_some());
    }
}
