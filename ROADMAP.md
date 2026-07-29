# AgenMonster Roadmap

## v0.1 — Egg (MVP) ✅
- [x] Monorepo scaffold (23+ crates)
- [x] Bus-first architecture
- [x] Basic pet render
- [x] LLM streaming (Anthropic/OpenAI)

## v0.2 — Hatchling ✅
- [x] Web tools (Exa/Brave/DDG/Jina)
- [x] MCP stdio client
- [x] SQLite 3-tier memory
- [x] Cron scheduler
- [x] Voice pipeline (CSM-1B + whisper.cpp)
- [x] Skill authoring pipeline
- [x] Agent loop orchestration

## v0.3 — Baby ✅
- [x] Audio UX end-to-end
- [x] Computer-use gestures (Win/Mac/Linux)
- [x] Autonomous evolver
- [x] SkillHub signed bundles (Ed25519)
- [x] macOS Liquid Glass vibrancy
- [x] iOS Live Activity (WidgetKit)

## v0.4 — Child ✅
- [x] Cross-device libp2p sync
- [x] Linux Wayland gtk4-layer-shell
- [x] Full CLI (run/doctor/bench/sfx/skills/sync)
- [x] Adaptive LLM routing + cost ledger
- [x] Skill Marketplace registry
- [x] WASM demo

## v0.5 — Teen ✅
- [x] Marketplace registry HTTP server (axum + SQLite)
- [x] Accessibility tree extraction (Win/Mac/Linux)
- [x] Performance bench harness (6 micro-benchmarks)
- [x] Tauri capabilities hardening

## v0.6 — Adult ✅
- [x] Pixel Identity Drop (6 design docs)
- [x] monster-pixel crate (palette + sprite + animator)
- [x] JS master sprite parity
- [x] Svelte PixelPet + HUD
- [x] Flutter CustomPainter pixel widget
- [x] CSS anti-slop theme
- [x] 7-stage sprite metadata

## v0.7 — Mega ✅ (Completed)
- [x] Audio synthesis (chiptune + 6 SFX presets)
- [x] Per-stage tile patterns (7 procedural backgrounds)
- [x] Per-stage sprite personality profiles
- [x] Monitor (bus event logger + health check)
- [x] Energy economy (1000 max, 25/hr regen, 8 action costs)
- [x] Webhooks (Discord/Slava/HTTP POST)
- [x] Computer-Use agent loop (screenshot → vision → click)
- [x] Vision planner (Claude/GPT-4o)
- [x] Cutscene (48-frame particle burst evolution animation)
- [x] Per-stage backgrounds (animated scroll)
- [x] Speech bubbles (8-bit RPG style)
- [x] Stage personality profiles (7 stages, bob/blink/attention)
- [x] Idle engine (bob offset, blink timer, attention phrases)
- [x] E2E tests (Playwright)
- [x] Integration tests (41 tests)
- [x] CLI doctor/bench/sfx commands
- [x] FFI C ABI (Flutter mobile)
- [x] Asset pipeline
- [x] Frame dedup + memory pool
- [x] Render state machine
- [x] **Token-Driven Evolution** — Every API call feeds XP, XP drives stage evolution
- [x] **Hunger System** — Monster gets hungry after 30min without API calls
- [x] **Dream Mode** — Idle monster generates creative text per stage
- [x] **Personality Drift** — Dominant task type affects mood
- [x] **Mood Swings** — Mood changes based on hunger/activity/stage
- [x] **ModelSelector** — Auto-detects providers from API keys, picks best model per task
- [x] **Real Web Search** — Tavily (AI answers) + Brave Search fallback
- [x] **Real Web Fetch** — HTTP fetch with HTML-to-text extraction
- [x] **Runtime API Keys** — Hot-reload keys without restart
- [x] **dotenvy Integration** — Auto-loads .env at startup
- [x] **CLI Enhancements** — keys, models, chat subcommands
- [x] **134 tests, ALL PASS, ZERO warnings**

## v0.8 — Mega+ (In Progress)
### Phase 1: Core Integration (Current Sprint)
- [x] ModelSelector auto-detection from .env keys
- [x] Real Tavily/Brave web search tools
- [x] Real web_fetch tool
- [x] CLI keys/models/chat subcommands
- [x] dotenvy auto-loading
- [ ] Wire agent loop to use Router + ModelSelector
- [ ] Real os_process_list tool (Windows tasklist)
- [ ] Real os_clipboard tool (Windows clipboard)
- [ ] CLI status subcommand (full runtime state JSON)
- [ ] CLI search subcommand (quick web search)
- [ ] CLI evolve subcommand (manual evolution trigger)
- [ ] Integration test: full agent loop with real Groq
- [ ] Integration test: web_search with real Tavily/Brave

### Phase 2: LLM Integration
- [ ] Wire Router into agent loop for real LLM calls
- [ ] Task-type-aware routing (code→Codestral, chat→Llama, vision→Claude)
- [ ] Cost tracking per call with budget enforcement
- [ ] Multi-key rotation with rate limit handling
- [ ] Streaming response display in CLI chat

### Phase 3: Desktop Shell (Tauri)
- [ ] Re-add Tauri app to workspace (needs icon + npm build)
- [ ] Press Start 2P font file drop
- [ ] Real Aseprite sprites (replace programmatic)
- [ ] Per-stage animated tile backgrounds (Canvas2D)
- [ ] Evolution cutscene (Canvas2D rendering)
- [ ] System tray integration
- [ ] Window management (minimize to taskbar popup)

### Phase 4: Tools & Computer Use
- [ ] Real screenshot tool (Windows DXGI)
- [ ] Real mouse_click/type_text (Windows SendInput)
- [ ] Vision model integration (screenshot → Claude/GPT-4o analysis)
- [ ] Computer-use agent loop with real vision
- [ ] Clipboard monitoring
- [ ] Process management

### Phase 5: Memory & Learning
- [ ] SQLite memory with real vector embeddings
- [ ] Salience decay with configurable rates
- [ ] Memory consolidation (hot → warm → cold)
- [ ] Semantic search over memories
- [ ] Skill learning from successful task patterns

### Phase 6: Sync & Distribution
- [ ] libp2p real peer discovery (replace stub)
- [ ] Cross-device state sync
- [ ] Skill marketplace public registry
- [ ] WASM browser demo
- [ ] Flutter Android overlay service
- [ ] iOS Dynamic Island live updates

### Phase 7: Polish & Launch
- [ ] Accessibility real UIAutomation/AXAPI/AT-SPI
- [ ] CI integration for benchmarks
- [ ] API reference generation
- [ ] Performance profiling & optimization
- [ ] Security audit
- [ ] Public release preparation

## v1.0 — Target Release
- [ ] All 7 stages fully functional
- [ ] Real-time desktop pet with full interaction
- [ ] Multi-provider LLM routing with cost optimization
- [ ] Autonomous skill learning and evolution
- [ ] Cross-device sync
- [ ] Public skill marketplace
- [ ] Mobile companion apps
- [ ] Comprehensive documentation
