# AgenMonster Roadmap

## v1.0 — Current Release ✅
- [x] Web-only SvelteKit 5 + Svelte runes SPA
- [x] Zero-dep Node production server (`server.mjs`)
- [x] All API keys server-side (LLM proxy in vite.config.ts + server.mjs)
- [x] 886 unit tests, 10/10 e2e pass, svelte-check 0 errors
- [x] State persistence + migration (localStorage versioned)
- [x] 3-tier memory brain (episodic + facts + topics, decay, reconsolidation)
- [x] Goal-oriented loop (auto-detect intent, sub-step tracking, completion detection)
- [x] Agent self-tool-call loop (`__AGENT_MCP__:name|json`)
- [x] Cost guard + progress bars (per-call, daily, per-provider)
- [x] Thread management + slash commands
- [x] Self-correction retry (different provider on weak replies)
- [x] Memory graph (SVG search/filter + node click detail)
- [x] Dark/dawn themes, persona presets, `/preset`, `/mode`, `/write`
- [x] Daily Companion (5 levels: moodEnergy → analytics + backup)
- [x] MCP tools: 106 (19 local + 23 secondbrain + 64 browseros)
- [x] World exploration (6 areas, weather, seasons, NPCs, wild encounters, story quests)
- [x] Pet evolution (4 forms × 4 paths, SP regen)
- [x] Hub growth (6 services, 7 quests, 6 decorations)
- [x] Items & shops (12 items, Rin's shoppe + Vee's stall)
- [x] NPC friendship (persisted levels, repeat dialogue)
- [x] Focus mode (Ctrl+Shift+F)
- [x] Mobile responsive CSS
- [x] Playwright e2e (10/10 pass, CI-ready)
- [x] Near-AGI 23-layer cognitive architecture (SELF/THINKING/MEMORY/ACTION/LEARNING)
- [x] Deep Recursive Agent (1h autonomous loop with cognition layer)
- [x] Autonomous modes (START 3H + DEEP 1H with live status)
- [x] Self-narrative autobiography (first-person life log to vault)
- [x] Persistent world graph (grows across sessions)
- [x] Live + permanent pet form evolution

## v1.1 — Next Release ✅
### Completed
- [x] Shop UI for NPC stores (Rin's shoppe, Vee's stall)
- [x] Currency/credits system for item purchases
- [x] Pet needs interactivity (feed/play/clean actions with item effects)
- [x] Expand story chains with more area-specific arcs and rewards
- [x] Playwright e2e in CI matrix (chromium + firefox + webkit)

### Backlog
- [ ] Plugin API for custom LLM providers (deferred)
- [ ] Workflow DSL (`.agenmonster.toml`) (deferred)
- [ ] Graph interactivity expanded (search/filter nodes)
- [ ] Mobile test matrix (Playwright e2e)
- [ ] Cross-device sync (libp2p)
- [ ] WASM browser demo
- [ ] Accessibility tree extraction (UIAutomation/AppleScript/AT-SPI)
- [ ] Performance bench harness (6 micro-benchmarks)

## Completed Milestones

### Daily Companion (5 levels)
- **Level 1**: moodEnergy, systemPrompt, proactivity ✅
- **Level 2**: routine, importance, dailyRecap, morningWakeup ✅
- **Level 3**: relationship, systemPrompt integration ✅
- **Level 4**: memoryIndex, suggestions, goals persistence, export enhancement ✅
- **Level 5**: presence indicator, analytics, backup automation ✅

### World Engine
- 6 areas with unlock levels and encounter tables ✅
- Weather system (clear, rain, fog, storm, starry) ✅
- Seasons (spring/summer/autumn/winter) ✅
- 5 NPCs with schedules, dialogue, friendship ✅
- 8 wild encounters, 6 environmental events, 3 legendary encounters ✅
- 13 story events with chained quests and rewards ✅

### Pet Evolution
- 4 forms with SP regen ✅
- 4 paths (balanced/offensive/defensive/speed) ✅
- Care/battle/exploration gates ✅

### Hub Growth
- 6 services, 7 quests, 6 decorations ✅
- NPC visits, daily XP, leveling ✅

### Items System
- 12 items with effects ✅
- Buy/sell/use helpers ✅
- Shop mapping for Rin + Vee ✅

## Long-term Invariants
1. **No `npm install` extra deps.** The system stays zero-dep at runtime.
2. **All keys server-side.** Browser never holds provider keys.
3. **Tests grow monotonically.** Never delete a test when shipping.
4. **About panel = source of truth.** Every visible feature must show.
5. **`svelte-check` always green.** No warnings accepted.
6. **Pure logic + DOM glue.** State modules don't import svelte; UI imports them.
