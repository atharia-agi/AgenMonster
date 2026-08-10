# AgenMonster

**A fully self-evolving, cross-platform AI monster companion — web edition.**

A living pixel pet that grows from your real work — chats, remembers, explores a side-scrolling world, and evolves through 7 stages. Built as a pure SvelteKit 5 + Svelte runes web app with a zero-dep Node production server.

## Quick Start

```bash
cd apps/desktop
npm install
npm run dev          # http://localhost:1420  (LLM proxy + SPA)
npm run build        # static SPA → build/
npm run preview      # preview production build
npm run start        # zero-dep Node server (built SPA + LLM proxy)
npm test             # 900 unit tests
npm run lint         # svelte-check (0 errors, 0 warnings)
npm run test:e2e     # Playwright e2e (chromium + firefox + webkit + 24 mobile devices)
npm run test:visual  # Visual regression snapshots
npm run test:load:smoke  # k6 load test baseline
npm run test:chaos   # Chaos engineering harness
```

## Architecture

- **Web-only SvelteKit 5 + Svelte runes** — no Tauri, no Rust, no Flutter. Pure web app with `adapter-static`.
- **Production server via `server.mjs`** — zero-dep Node.js server that serves the built SPA and proxies LLM requests.
- **All keys server-side** — provider API keys live only in `.env` / `process.env`. The browser never holds a key and never calls provider APIs directly, closing the key-exposure / CORS hole.
- **LLM proxy** — `vite.config.ts` dev middleware (`POST /api/llm`) and `server.mjs` production proxy route. Both enforce key confinement.
- **Tests**: 886/886 passing. svelte-check: 0 errors, 0 warnings. Build: green.
- **About panel**: 45+ rows (all shipped features documented).
- **MCP tools**: 106 tools (19 local + 23 secondbrain + 64 browseros) accessible via HTTP `POST /api/mcp` or stdio via `mcp-server.mjs`.
- **Deep Recursive Agent**: 1h near-AGI loop with 23-layer cognition architecture (SELF/THINKING/MEMORY/ACTION/LEARNING), self-narrative autobiography, persistent world graph, live pet form evolution.
- **Autonomous modes**: START 3H (continuous multi-turn) + DEEP 1H (near-AGI) with live status tracking turn count, runtime, skills, errors.
- **Typography**: Inter for body, Plus Jakarta Sans for headings. 14px base, antialiased.

## Key Features

| Feature | Status | Notes |
|---|---|---|
| SSE streaming + abort/cancel | Shipped | 120s timeout safety |
| State persistence + migration | Shipped | localStorage versioned |
| 3-tier memory brain | Shipped | Episodic + facts + topics, decay, reconsolidation |
| Slash commands | Shipped | /remember, /forget, /export, /import, /persona, /budget, /topics, /help, /goal, /preset, /mode, /write, /new, /switch, /stats |
| Cost guard + progress bars | Shipped | Per-call, daily, per-provider with warn/block tiers |
| Goal-oriented loop | Shipped | Auto-detect intent, sub-step tracking, completion detection |
| Agent self-tool-call loop | Shipped | `__AGENT_MCP__:name|json` marker in LLM replies, auto-executed |
| Memory graph (SVG) | Shipped | Search + filter, node click → detail, opacity dimming |
| Thread management | Shipped | Multi-conversation threads with UI chip row + slash commands |
| Self-correction retry | Shipped | Falls back to different provider/model on weak replies |
| Dark + dawn themes | Shipped | `html[data-theme='gb-night']` / `gb-dawn` |
| MCP stdio runner | Shipped | `mcp-server.mjs` zero-dep Node stdio transport |
| Playwright e2e | 10/10 pass | 5 smoke + 5 features, chromium + firefox + webkit + 24 mobile devices |
| Daily Companion (5 levels) | Shipped | moodEnergy, systemPrompt, proactivity, routine, importance, relationship, dailyRecap, morningWakeup, memoryIndex, suggestions, analytics, backup automation, presence indicator |
| Advanced settings | Shipped | iterateDecay, chatMode toggle, memory pressure indicator |
| Persona presets | Shipped | terse, helpful, sarcastic, indonesian, pirate |
| `/write` download | Shipped | Downloads conversation as `.txt` |
| Cost-guard toast | Shipped | Red/yellow toast via `agenmonster:toast` event |
| World exploration | Shipped | Side-scrolling pixel world, 6 areas, weather, seasons, NPCs, wild encounters |
| Pet evolution | Shipped | 4 forms, 4 paths (balanced/offensive/defensive/speed), SP regen |
| Hub growth | Shipped | 6 services, 7 quests, 6 decorations, NPC visits, daily XP |
| Items & shops | Shipped | 12 items, buy/sell/use, Rin's shoppe + Vee's stall |
| Crafting system | Shipped | 8 recipes combining materials into consumables and rare items |
| Daily quests | Shipped | 3 rotating quests per day with XP, currency, and item rewards |
| Achievements | Shipped | 21 achievements across 5 categories (story, exploration, crafting, pet_care, milestone) |
| Personality system | Shipped | 10 personalities with trait modifiers (risk, energy, learning) |
| Pet mood/energy gameplay | Shipped | Movement speed, encounter chance, win rate scale with energy level |
| Needs decay system | Shipped | 7 needs decay over time, personality traits modify decay rates |
| NPC friendship | Shipped | Persisted friendship levels, repeat dialogue, relationship tracking |
| Story quests | Shipped | 30+ story events with chained quests, choice effects, rewards |
| Cross-area story chains | Shipped | The Lost Artifact (5 steps), The Glitch Cure (5 steps) |
| Seasonal story chains | Shipped | Winter/Spring/Summer/Autumn area-specific chains |
| Focus mode | Shipped | Ctrl+Shift+F collapses sidebars + bottom bar |
| Mobile responsive | Shipped | Media queries at 768px/480px |
| SecondBrain MCP bridge | Shipped | 23 tools via Obsidian vault isolation |
| BrowserOS MCP proxy | Shipped | 64 tools via HTTP to BrowserOS |
| NousResearch default provider | Shipped | `stepfun/step-3.7-flash:free` with custom provider UI |
| **Kilo provider** | **Added** | **`kilo-auto/free` default model wired into LLM proxy** |
| **Deep Recursive Agent (1h)** | **Shipped** | **23-layer cognition layer, self-narrative, persistent world graph, live pet evolution** |
| **Autonomous modes** | **Shipped** | **START 3H + DEEP 1H buttons with live status (turns, runtime, skills, errors)** |
| Font modernization | Shipped | Inter/Plus Jakarta Sans, 14px base, removed pixelated rendering from UI |
| CI pipeline | Shipped | GitHub Actions: chromium + firefox + webkit matrix + lint + unit tests |
| **libp2p P2P transport** | **Enabled** | WebRTC P2P deps installed (libp2p @0.43.0 + 10 sub-deps) |
| **Visual regression testing** | **Enabled** | Playwright snapshot testing (9 scenarios) |
| **Load testing baseline** | **Baselined** | k6 scripts: smoke/load/stress/spike |
| **Chaos engineering harness** | **Ready** | 6 failure injection scenarios, 15 tests |

## LLM Proxy Security

Provider API keys live **only** in `.env` and are read server-side — by the Vite dev/preview middleware (`POST /api/llm`) and by the production `npm run start` server (`server.mjs`). The browser never sees a key and never calls provider APIs directly, which closes the key-exposure / CORS hole. To use chat, run via `npm run dev`, `npm run preview`, or `npm run start`. A pure static host without the proxy won't be able to reach the LLM.

## State Persistence

Pet progress persists to `localStorage` and is versioned + migrated against current defaults, so older saves don't break on schema changes. Use the Export/Import buttons in Settings (or Ctrl/Cmd+E / Ctrl/Cmd+I) to back up or move progress between machines.

## Task-Aware Routing

The chat uses a Router/ModelSelector (`src/lib/router.ts`) that detects the task type from each message (chat / code / creative / vision / fast / summarize / analyze) and picks the best available provider+model (server-decided from `.env` keys). The provider buttons act as pins; `AUTO` re-enables automatic routing.

## World Engine

AgenMonster includes a living pixel world (`src/lib/worldEngine.ts`) with:
- **6 areas**: home_forest → void_sea, unlockable by level
- **Weather system**: clear, rain, fog, storm, starry with area-specific chances
- **Seasons**: spring/summer/autumn/winter affecting encounters
- **5 NPCs**: Rin (merchant), Vee (hacker), Kai (trainer), Momo (healer), Jax (explorer) with schedules, dialogue, friendship
- **8 wild Digimon**: area-specific encounters with level ranges
- **6 environmental events**: sudden_rain, fog_rolls_in, glitch_wave, starfall, bridge_collapse, token_rush
- **3 legendary encounters**: Ancient Koromon, Storm Lord, Void Walker
- **30+ story events**: chained quests with choices, effects, and rewards including cross-area and seasonal chains

## Testing

```bash
npm test             # 886 unit tests (node --test, no deps)
npm run lint         # svelte-check (0 errors, 0 warnings)
npm run build        # production SPA (green)
npm run test:e2e     # Playwright e2e (chromium + firefox + webkit + 24 mobile devices)
npm run test:visual  # Visual regression snapshots
npm run test:load:smoke  # k6 load test baseline
npm run test:chaos   # Chaos engineering harness
```

## Roadmap

See [docs/PLAN.md](docs/PLAN.md) for the forward plan.

## License

MIT OR Apache-2.0
