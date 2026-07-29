# Changelog

All notable changes to **AgenMonster** are listed here.
Format pinned to [Keep a Changelog](https://keepachangelog.com/).

## [1.1.0] — Next-Gen + Polish — 2026-07-28
### Added
- **Goal-oriented loop** — auto-detects imperative intent, creates goals with sub-step progress (`/goal`, `/goals`, `/done`)
- **Active goal chip** — MonsterStatus ribbon shows current goal with ✓/· markers
- **Cost-guard progress bars** — per-call/daily/per-provider bars in Diagnostics (green/yellow/red)
- **MCP goal tools** — `goal.list`, `goal.create`, `goal.markdone`, `goal.complete` (19 tools total)
- **LLM self-tool-call** — agent emits `__AGENT_MCP__:name|json` markers; ChatPanel auto-dispatches and appends tool result
- **MCP stdio transport** — `src/mcp-server.mjs` JSON-lines runner
- **Memory graph search/filter** — search nodes by label, filter by kind (tag/fact/episode)
- **Episode detail drill** — click episode row to expand `detail` + `tags`
- **Memory graph node click** — click node for detail sidebar
- **Persona presets** — `/preset terse|helpful|sarcastic|indonesian|pirate` + chip UI in Settings
- **Memory pressure indicator** — 80% warn bar + banner for episodes/facts capacity
- **Advanced settings** — `iterateDecay` button + chat-mode toggle (chat/goal)
- **Cost-guard toasts** — `agenmonster:toast` custom event on warn/block
- **Slash commands** — `/mode chat|goal`, `/write <name>` (download .txt)
- **Mobile responsive** — `@media (max-width: 768px)` stack layout + 480px compact
- **Playwright e2e scaffolding** — `playwright.config.ts` + `tests/e2e/smoke.spec.ts` (5 smoke tests; chromium/firefox/webkit)
- 19 TOOLS total in MCP bridge

### Fixed
- svelte-check: 0 errors (8 warnings), all clean

### Tests
- 195/195 passing (+12 new tests: selfToolCall, costGuard thresholds, memoryGraph, agentToolCall, persona preset)

## [1.0.0] — Shipping Grade — 2026-07-21
### Added
- **Tauri IPC integration** — frontend talks to real Rust backend (16 typed commands)
- **Equipment system** — equip/unequip items with real stat effects (energy_bonus, learning_speed)
- **Equipment loadout** — persistent per-session loadout tracking (head/body/held/back/accessory)
- **Loading states** — notification popup shows ⏳ Working... during async backend calls
- **Backend status indicator** — bottom-right shows "Rust Backend Connected" or "Using Mock Data"
- **Global error boundary** — catches JS crashes, shows crash screen with RESTART button
- **Agent bridge verified** — real LLM calls via Groq/Mistral/Anthropic/OpenAI/Gemini fallback chain
- **7 quick actions** — feed, play, talk, pat, sleep, portal, deploy — all wired to Rust backend
- **Graceful fallback** — mock responses when Tauri runtime unavailable (dev/wasm mode)
- **Desktop shortcut** — `AgenMonster.lnk` on Desktop with custom ICO icon, double-click to launch
- **start.bat** — Launch script with ASCII art banner, auto PATH setup
- **`@types/node`** — Proper Node.js type definitions for svelte-check

### Fixed
- Equipment panel now actually calls `equipItem()`/`unequipItem()` via IPC
- Quick action IDs mismatch (labels vs IDs) — all 7 actions properly routed
- Memory stats now return real data instead of hardcoded zeros
- Notification popup duplicate timeout (removed double-clear)
- `MOOD_TRANSITIONS` missing `tired` mood (TypeScript Record type error)
- `equipItem` return type missing `effects` property
- `WeatherState` missing `config` property (MonsterRoom crash)
- `EnergyClient` duplicate identifier `current`/`max` (field vs method name)
- ~50 "Cannot find module 'node:*'" errors (installed `@types/node`)

### Changed
- Version bump: 0.7.0 → 1.0.0
- Window: 260×300 frameless pet → 1280×800 centered workspace
- Tauri config: WebView2 embed bootstrapper for Windows

### Build
- `cargo check --workspace` ✅ zero errors
- `cargo build -p agenmonster-desktop` ✅ compiles clean
- `npm run build` ✅ 260+ modules, ZERO warnings

---

## [0.18.0] — IDE Panels — 2026-07-20
### Added
- `GlobalSearch.svelte` — search across all files with regex, case-sensitive, whole-word toggles
- `GitPanel.svelte` — source control with staged/unstaged changes, commit, push, branch info
- `SettingsPanel.svelte` — 16 configurable settings (editor, terminal, monster, theme, agent)
- `OutputPanel.svelte` — build output with color-coded log entries and clear/copy
- `ProblemsPanel.svelte` — diagnostics with severity filters and file:line:col navigation
- `WelcomeTab.svelte` — getting started with quick links, keyboard shortcuts, monster tips, system status
- 5 sidebar views: Explorer, Search, Git, Skills, Settings
- Bottom panel: Terminal, Output, Problems, Console
- Dual-view system: Grid Dashboard ↔ IDE Workspace toggle via TopNav
- Activity Bar with Explorer, Search, Git, Skills views
- Sidebar: FileExplorer, search, git stats, skills list
- Right Panel: MonsterStatus + ThoughtBubble + ToolStatus
- Bottom Panel: Terminal, Console, Problems, Output tabs

## [0.15.0] — Peer Discovery + Sprite Animation + E2E Tests — 2026-07-20
### Added
- TCP-based peer-to-peer sync with UDP broadcast discovery (replaces libp2p stub)
- `SyncRequest`/`SyncResponse` JSON protocol: `ListPeers`, `GetSkill`, `PushSkill`, `GetMemoryDigest`
- Auto peer cleanup (2 min timeout), skill sharing between peers
- Real-time sprite animation: 6 moods, eye tracking, wing flapping, breathing, particles
- Ambient stage effects (mega sparkles, adult orbs)
- 10 E2E Playwright tests across pet window, chat window, performance suites
- `playwright.config.ts` configuration

## [0.16.0] — Full Workspace UI (Mockup-Driven) — 2026-07-20
### Added
- Full workspace dashboard: 4-row grid layout with 16+ panels
- `gameState.ts` — centralized reactive state store (7 needs, skills, missions, achievements, crystals, calendar)
- `MonsterStatus` — name, stage, level, XP, energy, mood, bond bars
- `ThoughtBubble` — AI thinking visualization with progressive typing dots
- `CurrentGoal` — active task with progress bar
- `ActiveSkills` — skill list with levels and XP progress
- `TodaysMissions` — task list with checkboxes and progress bars
- `EvolutionProgress` — visual stage progression (egg→mega)
- `NeedsPanel` — 7 stat bars (hunger, energy, focus, mood, affection, motivation, knowledge)
- `QuickActions` — 7 icon buttons (feed, play, talk, pat, sleep, portal, deploy)
- `ActivityLog` — timestamped event history
- `ActiveTasks` — running/pending/queued task status
- `ToolStatus` — online/offline/error indicators
- `Achievements` — unlocked/locked achievement cards
- `SystemConsole` — live log output with auto-scroll
- `CalendarPanel` — daily schedule with done/pending states
- `MemoryCrystals` — hexagonal crystal collection grid (12/50)
- `FriendshipLevel` — 5-tier relationship progress (stranger→soul companion)
- `MonsterRoom` — pixel-art workspace with desk, bookshelf, token bowl, portal
- `MinimizedBar` — compact taskbar widget (7 sections: icon, XP, energy, mood, task, progress, chat)
- `ContextMenu` — right-click menu with 7 actions
- `NotificationPopup` — slide-in alerts for task completion
- `TopNav` — 6 tabs + version + clock + date
### Changed
- `+page.svelte` fully rewritten — from simple pet+chat to full workspace dashboard

### Changed
- `monster-sync` no longer uses `unimplemented!()` — fully functional peer discovery

## [0.14.0] — Desktop Agent Bridge — 2026-07-20
### Added
- `agent_bridge.rs` — real LLM agent loop in desktop shell (Router + ToolRegistry + AgentLoop)
- `send_task` command now processes through real agent with 37+ tools
- Auto skill injection from `skills/` directory
- Token consumption → XP gain → evolution in desktop mode
- Memory subsystem initialized at startup
### Changed
- `send_task` returns full monster state (stage, mood, xp, energy) alongside response

## [0.13.0] — Tauri Desktop Shell Restored — 2026-07-20
### Added
- Tauri desktop shell re-added to workspace (`apps/desktop/src-tauri`)
- Frontend built successfully (Svelte 5 + Vite + SvelteKit static adapter)
- Icons regenerated from `monagen_icon.webp` (all platforms)
- Desktop commands: `boot_runtime`, `send_task`, `get_state`, `set_stage`, `get_skills`, `get_memory_stats`, `get_energy`, `spend_energy`
### Fixed
- `app.css` — CSS comments, @import order, lightningcss compatibility
- `package.json` — removed invalid comment, added lightningcss dep
- `main.rs`/`commands.rs` — updated to current Runtime API
- `icon.ico` — regenerated (was corrupt)

## [0.12.0] — Knowledge Graph + Proactive Compression — 2026-07-20
### Added
- `graph.rs` — cognee-inspired knowledge graph memory with typed relationship edges
- Edge types: `relates_to`, `depends_on`, `caused_by`, `implements`, `belongs_to`
- Bidirectional BFS graph traversal (configurable depth)
- Auto-extraction of relationships from memory content patterns
- `compress_proactive()` — proactive context compression at 80% token budget
- `AgentLoop::run()` now compresses context before each LLM call
### Test Count: 254 ALL PASS

## [0.11.0] — Tech Frontier + Context Compression + Code Intelligence — 2026-07-20
### Added
- `docs_fetch` tool — live library documentation via npm registry API (context7-inspired)
- `code_graph` tool — structural code analysis: functions, structs, imports, dependencies, metrics
- `ToolInput::args_as_value()` — HashMap→JSON Value conversion for tool handlers
- Context compression in `AgentContext::prune()` — extractive summarization instead of FIFO drop
- New chiptune SFX: `sleep`, `hungry`, `search`, `think`, `evolve_start`
- Icon setup: `monagen_icon.webp` → PNG icons for Tauri (32x32, 128x128, 128x128@2x)
- Font setup: `1UP` (title), `Players` (body), `PlayersCollege` (collegiate) with @font-face
### Changed
- Chiptune SFX engine rewritten: multi-waveform (square/triangle/sawtooth), arpeggio, vibrato, noise bursts
- Agent context pruning now compresses instead of dropping (preserves key facts)
- CSS updated: `Players` font for body text, `1UP` for pixel titles
- Tauri config updated with proper icon paths
### Fixed
- `detect_language()` in code_graph now handles standalone `fn`/`function`/`def`/`func` keywords
- Voice tool registered in global registry (`voice_speak`, `voice_listen`)
### Test Count: 251 ALL PASS

## [0.10.0] — Voice, Persistence, Health — 2026-07-20
### Added
- `voice_speak` tool — TTS via Windows SAPI (PowerShell `System.Speech.Synthesis`)
- `voice_listen` tool — STT via Windows Speech Recognition (`System.Speech.Recognition`)
- `tts_speak()` and `stt_listen()` free functions in `monster-tools::voice`
- `Runtime::save_state(path)` — serialize runtime state (stage, mood, XP, energy, tokens) to JSON
- `Runtime::load_state(path)` — restore state from JSON, returns `Result<bool>`
- `agenmonster health` — full system diagnostic (keys, tools, skills, memory, models, OS)
- `agenmonster daemon --voice` — auto-speak every response via TTS
- Daemon loads state on startup, saves state on shutdown
- `serde_json` dependency added to `monster-cli`
- `tempfile` dev-dependency added to `monster-runtime`
### Fixed
- Voice tool now registered in global registry (`voice_speak`, `voice_listen`)
- Health command shows all 37+ tools, skills, memory DB, model selector, runtime state
### Test Count: 290 ALL PASS

## [0.8.0] — Skill System + Skills CLI — 2026-07-20
### Added
- `SkillManifest` — `skill.toml` format for defining skills with tools, prompts, triggers
- `SkillLoader` — scan `skills/*/skill.toml`, parse, load
- `SkillLoader::create_skill()` — scaffold new skill with TOML + README
- `SkillRegistry` — register, get, list, search, match_task, enable/disable
- `skill_tools_to_json()` — bridge skills to JSON tool defs for agent loop
- CLI: `agenmonster skills list` — list installed skills
- CLI: `agenmonster skills new <name>` — create skill scaffold
- CLI: `agenmonster skills info <name>` — detailed skill info
- 3 sample skills: web-research, code-helper, memory-augment
- 63 new tests (unit + integration)
- Total tests: 287 (was 224)

### Changed
- Unified `monster-skills` crate (removed competing SkillRegistry types)
- Skills register tools with `skill_{id}_{tool}` namespace
- Task matching uses triggers (2x) + tags (1x) + description words (0.5x)

## [0.8.1] — Memory Tools Wired + Code Analysis — 2026-07-20
### Fixed
- `memory_store` tool now writes to real SQLite (was stub echoing input)
- `memory_search` tool now does semantic search via TF-IDF + cosine similarity (was stub)
- `memory_forget` tool now runs real decay tick (was stub)
- `code_format` tool now analyzes code (line count, Rust pattern detection)
- Memory subsystem auto-initialized at CLI startup (`~/.local/agenmonster/memory.db`)
- `AtomicPtr<MemoryHandle>` pattern bypasses Send+Sync for rusqlite Connection

## [0.9.0] — Skills→Agent Integration + Daemon Mode — 2026-07-20
### Added
- `AgentContext::inject_skill()` — injects skill prompts + tool descriptions into system prompt
- CLI `ask` auto-matches skills by task and injects them into agent context
- `agenmonster daemon` — persistent REPL with conversation history
  - 16K token context window with pruning
  - Commands: `status`, `skills`, `clear`, `exit`
  - Auto-matches skills per turn
  - Memory + token tracking + evolution per turn
- 1 new test (skill injection)
- Total tests: 288 (was 287)

### Changed
- Agent loop now receives skill-enhanced system prompts
- Skills are auto-injected based on trigger matching in user input
- Multi-skill activation: multiple skills can be injected per turn

## [0.7.6] — System Tools + Memory Integration — 2026-07-20
### Added
- `env_get` / `env_set` tools (environment variables)
- `file_watch` tool (directory listing with metadata)
- `network_info` tool (hostname, local IP)
- `process_kill` tool (terminate by name)
- `clipboard_get` / `clipboard_set` tools (PowerShell)
- `MemoryHandle` bridge for tools ↔ memory integration
- Memory tools: `memory_store`, `memory_search`, `memory_forget`
- 30+ new unit tests
- Total tools: 30 (was 22)

### Changed
- Tools can now access MemorySubsystem via MemoryHandle
- Memory store auto-generates embeddings for semantic search

## [0.7.5] — FTS5 + New Tools — 2026-07-20
### Added
- SQLite FTS5 full-text search with rank ordering
- `json_query` tool (dot-notation JSON extraction)
- `hash_generate` tool (blake3/sha256)
- `random_string` tool (alphanumeric/hex/uuid/numeric)
- 20+ new unit tests
- Total tools: 22 (was 19)

### Changed
- Memory subsystem now uses FTS5 for fast full-text search
- Graceful fallback to LIKE if FTS5 unavailable

## [0.7.4] — Memory Embeddings + Key Rotation — 2026-07-20
### Added
- TF-IDF embedding engine (64-dim, cosine similarity, zero deps)
- Memory semantic search with LIKE fallback
- Memory consolidation (hot→warm→cold tier promotion)
- Key rotation with automatic cooldown on failure
- `date_time` tool (iso, unix, human, date, time formats)
- `http_request` tool (GET, POST, PUT, DELETE with async reqwest)
- 20+ new unit + integration tests

### Changed
- Memory recall now tries vector similarity before LIKE
- MemorySubsystem stores embeddings as SQLite BLOB
- Total tools: 19 (was 17)

## [0.7.3] — Multi-Turn Agent + Vision — 2026-07-20
### Added
- Multi-turn agent loop: tool calls → execute → re-prompt → final answer
- Real VisionPlanner: screenshot → base64 → LLM analysis → action plan
- Real `fs_find` tool: recursive file search with glob pattern matching
- Real `os_shell` tool: execute shell commands via cmd.exe
- Built-in base64 encoder for vision pipeline
- 4 new vision planner tests (parse, fallback, base64, description)

### Changed
- Agent loop now loops on tool calls instead of exiting after one round
- Tool results fed back to LLM for processing before next iteration
- Vision planner returns structured PlannedAction with coordinates

## [0.7.2] — Full CLI + Real Tools — 2026-07-20
### Added
- CLI `ask` subcommand: full agent loop (LLM + tool dispatch + memory)
- Real `screenshot` tool: Windows screen capture via System.Drawing
- Real `mouse_click` tool: cursor move + click via user32.dll P/Invoke
- Real `type_text` tool: keyboard input via user32.dll keybd_event
- Real `os_process_list` tool: Windows tasklist with CSV parsing
- Real `os_clipboard` tool: PowerShell Get/Set-Clipboard
- Full Runtime boot in CLI `run` command with agent loop
- 17 new integration tests (ModelSelector, tools, agent loop, web search)

### Fixed
- CLI `search` command: tokio runtime conflict (use block_in_place)
- mouse_click: button type now actually changes click event flags
- All workspace warnings resolved

## [0.7.1] — Token-Driven Evolution — 2026-07-20
### Added
- Token-Driven Evolution: every API call feeds XP that drives stage progression
- ModelSelector: auto-detects 5 LLM providers from API keys, 14 models catalog
- Task-aware model selection (chat/code/creative/vision/fast/summarize/analyze)
- Runtime key hot-reload (add/remove keys without restart)
- Hunger system: monster hungry after 30min without API calls, starving after 2hr
- Dream mode: idle monster generates creative text per stage
- Personality drift: dominant task type affects mood description
- Mood swings: mood changes based on hunger/activity/stage
- Real web search: Tavily (AI answers) + Brave Search fallback
- Real web_fetch: HTTP GET with HTML-to-text extraction
- CLI `keys` subcommand: show detected providers
- CLI `models` subcommand: list available models + auto-selection
- CLI `chat` subcommand: streaming LLM test with token reporting
- dotenvy integration: auto-loads .env at startup
- 8 unit tests for ModelSelector

### Changed
- Router now uses ModelSelector for task-aware routing
- Router::new() takes ApiKeys + RouterCfg, creates ModelSelector internally
- LlmResponse includes input_tokens, output_tokens, total_tokens
- AgentLoop::run() returns (String, u32) — response + total tokens
- Runtime has selector field, init_selector(), add_provider_key()
- Runtime state_json() includes providers count
- Web tool handlers use dedicated tokio runtime for async HTTP

### Fixed
- Energy can_afford for unknown keys returns cost 10 (not infinite)
- Orchestrator test: xp_to_next after evolve is xp_for_stage("hatchling")=500
- BgAnimator speed/tick tests
- Animator frame count assertion
- All workspace warnings resolved

## [0.7.0] — Mega — 2026-07-19
### Added
- Audio synthesis (chiptune + 6 SFX presets)
- Per-stage tile patterns (7 procedural backgrounds)
- Per-stage sprite personality profiles
- Runtime monitor (bus event logger + health check)
- Energy economy (1000 max, 25/hr regen, 8 action costs)
- Webhooks (Discord/Slack/HTTP POST)
- Computer-Use agent loop (screenshot → vision → click)
- Vision planner (Claude/GPT-4o)
- Cutscene (48-frame particle burst evolution animation)
- Per-stage backgrounds (animated scroll)
- Speech bubbles (8-bit RPG style)
- Idle engine (bob offset, blink timer, attention phrases)
- E2E tests (Playwright)
- Integration tests (41 tests)
- CLI doctor/bench/sfx commands
- FFI C ABI (Flutter mobile)
- Asset pipeline
- Frame dedup + memory pool
- Render state machine

## [0.6.0] — Adult — 2026-07-18
### Added
- Pixel Identity Drop (6 design docs)
- monster-pixel crate (palette + sprite + animator)
- JS master sprite parity
- Svelte PixelPet + HUD
- Flutter CustomPainter pixel widget
- CSS anti-slop theme
- 7-stage sprite metadata

## [0.5.0] — Teen — 2026-07-17
### Added
- Marketplace registry HTTP server (axum + SQLite)
- Accessibility tree extraction (Win/Mac/Linux)
- Performance bench harness (6 micro-benchmarks)
- Tauri capabilities hardening

## [0.4.0] — Child — 2026-07-16
### Added
- Cross-device libp2p sync
- Linux Wayland gtk4-layer-shell
- Full CLI (run/doctor/bench/sfx/skills/sync)
- Adaptive LLM routing + cost ledger
- Skill Marketplace registry
- WASM demo

## [0.3.0] — Baby — 2026-07-15
### Added
- Audio UX end-to-end
- Computer-use gestures (Win/Mac/Linux)
- Autonomous evolver
- SkillHub signed bundles (Ed25519)
- macOS Liquid Glass vibrancy
- iOS Live Activity (WidgetKit)

## [0.2.0] — Hatchling — 2026-07-14
### Added
- Web tools (Exa/Brave/DDG/Jina)
- MCP stdio client
- SQLite 3-tier memory
- Cron scheduler
- Voice pipeline (CSM-1B + whisper.cpp)
- Skill authoring pipeline
- Agent loop orchestration

## [0.1.0] — Egg — 2026-07-13
### Added
- Workspace + 13 crates + Tauri/Flutter scaffolds
- `monster-bus` typed in-process bus
- Skill library + 6 shipped skills
- CLI `agenmonster` (headless)
- Mobile Android overlay + iOS in-app skeletons
