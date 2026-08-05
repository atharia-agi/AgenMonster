# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-08-04

### Added
- **libp2p P2P Transport Enabled** — Full dependency chain installed (libp2p @0.43.0 + 10 sub-deps), WebRTC P2P ready for production signaling server
- **Visual Regression Testing** — Playwright snapshot testing with 9 scenarios (`test:visual`, `test:visual:update`), thresholds: 0.2, maxDiffPixels: 100
- **Load Testing Baseline** — k6 scripts with 4 scenarios (smoke/load/stress/spike), automated runner, thresholds: p95<1s, error rate<1%
- **Chaos Engineering Harness** — Failure injection with 6 predefined scenarios (networkPartition, highLatency, intermittentErrors, cascadeFailure, timeoutStorm, degradePerformance), 15 tests passing

### Changed
- Test count: 771 → **786 passing** (+15 chaos tests)
- Build: production + SSR clean
- svelte-check: 0 errors (1 pre-existing a11y warning only)
- libp2p dependencies: all version conflicts resolved, installed with `--legacy-peer-deps`

### Infrastructure
- Added `tests/load/load-test.js` + `tests/load/run-load-test.js` (k6)
- Added `apps/desktop/tests/e2e/visual-regression.spec.ts` (9 scenarios)
- Added `apps/desktop/src/lib/chaos/chaos-engine.ts` + `apps/desktop/tests/chaos/chaos-engine.test.ts`
- Added npm scripts: `test:visual`, `test:visual:update`, `test:load:*`, `test:chaos`

---

## [Unreleased]

### Added
- **World engine** (`worldEngine.ts`) — 6 areas, weather, seasons, travel, questFlags, npcFriendship, npcMet
- **Event engine** (`eventEngine.ts`) — 5 NPCs with schedules/dialogue/requests, 8 wild encounters, 6 environmental events, 3 legendary encounters, 13 story events with chained quests
- **Pet evolution** (`petEvolution.ts`) — 4 forms, 4 paths (balanced/offensive/defensive/speed), SP regen, care/battle/exploration gates
- **Hub growth** (`hubGrowth.ts`) — 6 services, 7 quests, 6 decorations, NPC visits, daily XP, leveling
- **Exploration** (`exploration.ts`) — side-scroll player, NPC AI patrol, interaction detection, area transitions
- **Items system** (`items.ts`) — 12 items with effects, buy/sell/use helpers, shop mapping for Rin + Vee
- **WorldPanel** — arrow-key movement, weather particles (rain/fog/starry), area decorations, NPC sprites, transitions, encounters, evolve trigger, parallax backgrounds
- **EventPanel** — active events list, event log with timestamps
- **EvolutionPanel** — form display, SP bar, stats, path selection
- **HubPanel** — level bar, visitors, services, quests, decorations
- **GameLoop** (`gameLoop.ts`) — 30s tick for world/evolution/hub state updates
- **NPC friendship persistence** — `npcFriendship` + `npcMet` in WorldState, dialogue tiers based on friendship level
- **Story quest rewards** — `choice.effect(world)` + `onComplete(world)` wired into WorldPanel
- **Pet mood/energy gameplay** — movement speed, encounter chance, win rate scale with energy level
- **World event narration** (`worldEventNarration.ts`) — 90 tests, 10 personalities × 9 event contexts
- **Focus mode persistence** — localStorage-backed, restored on app startup
- **SecondBrain MCP bridge** — `/api/mcp` route, `om-mcp.mjs` spawned with `OBSIDIAN_VAULT`
- **BrowserOS MCP proxy** — 64 tools via HTTP to `http://127.0.0.1:9001/mcp`
- **NousResearch default provider** — `stepfun/step-3.7-flash:free` with custom provider UI
- **Font modernization** — Inter/Plus Jakarta Sans, 14px base, removed pixelated rendering from UI

### Changed
- Test count: 518 → **518** (world engine + items + e2e fixes)
- MCP tools: 19 → **106** (19 local + 23 secondbrain + 64 browseros)
- About panel: 45 → **45+ rows**
- E2E: 0/10 → **10/10 pass** (5 smoke + 5 features, chromium, production build)
- `apps/desktop/tests/e2e/` — fixed Playwright timing: `networkidle` → `domcontentloaded`, JS-dispatched interactions, LLM provider mock, focusMode isolation
- `playwright.config.ts` — retries 0, timeout 120s, actionTimeout 20s
- `AGENTS.md` — updated test count, MCP count, world engines, e2e status
- `README.md` — updated test count, MCP count, world features, fonts
- `apps/desktop/README.md` — updated test count, MCP count, features list

### Fixed
- `worldEventNarration.ts` — `isGoalComplete` returns boolean (was undefined)
- `memory.ts` — `QuotaExceededError` handling in persist
- `proactivity.ts` — pet-initiate listener wired into ChatPanel.svelte
- `PixelPetV2.svelte` — color grading fix (HSL→RGB conversion)
- `src/mcp-server.mjs` — import path fixed (`./lib/mcp.ts`) — stdio MCP server boots

### Security
- All secrets migration paths updated: `.env` confirmed gitignored and absent from all commits
- `.env.example` committed as zero-secret template only
- `tokenTracker.estimateCost()` — pre-flight cost estimation so cost-guard hard-blocks over-budget calls BEFORE any network request

### Changed (Round 2 — Shipping-grade refactor)
- `ChatPanel.svelte` god-component decomposed: 1041 → 647 lines
  - 22 slash commands extracted to `src/lib/commands/slashCommands.ts` (pure dispatcher, no Svelte coupling)
  - cost-guard evaluation, transient-error classification, and agent tool dispatch extracted to `src/lib/chatEngine.ts` (+12 unit tests)
  - transient-retry + abort classification now uses shared `isTransientError` / `isAbortError`
- `GameState` fully typed: replaced 9 `any[]` fields with real interfaces (`Mission`, `ChatMessage`, `ToolInfo`, `MemoryItem`, enriched `Skill`, `MemoryCrystal`, `ActiveTask`)
  - `ChatMessage.timestamp` required; crystal identity unified on `title` (legacy `label` dropped)
  - panels (`TodaysMissions`, `MemoryCrystals`, `BottomStatusBar`, `Achievements`) now import shared types from `gameState.ts` instead of declaring local anonymous shapes
- Backup automation: tracks last-backup date in localStorage; no longer misses days if app is closed at midnight
- Repo hygiene: removed ~277MB root binaries (`mingw64.zip`, portable zip, `vs_buildtools.exe`, font zips), junk files `16`/`24`/`8`, all committed log/dump files, 10 one-off Python debug scripts, 5 dead components (`MemoryPanel`, `MemoryGraph`, `MinimizedBar`, `SkillTree`, `CollapsiblePanel`), 5 empty dirs; untracked 85 generated `.svelte-kit/output` files; `CHANGELOG_v0.x.md` history consolidated into `docs/changelog/`
- Test count: 427 → **439 passing** (+12 chatEngine tests); svelte-check 0 errors, 0 warnings; build green

---

## [Unreleased] — Session 21+ (2025-08)

### Added
- **Needs decay system** — 7 needs (hunger, energy, focus, mood, affection, motivation, knowledge) decay every 30s game tick
- **Personality traits** — `personalityTraits` in GameState modify decay rates per personality type
- **Personality assignment UI** (`PersonalityPanel.svelte`) — 10 personalities with trait stats (risk/energy/learning)
- **PERSONA tab** in TopNav for personality selection
- **Pet mood indicator** in WorldPanel — emoji bubble (😊/😐/😟/😢) above pet
- **Seasonal decorations** in WorldPanel — spring/summer/autumn/winter parallax layers
- **Mood effects on gameplay** — mood affects encounter chance and win chance in WorldPanel
- **Crafting system** (`CraftingPanel.svelte`) — 8 recipes combining materials into consumables
- **CRAFT tab** in TopNav
- **Achievement system** (`achievements.ts`) — 21 achievements across 5 categories (story, exploration, crafting, pet_care, milestone)
- **Achievements panel** — category-grouped display with progress tracking
- **Cross-area story chains** — The Lost Artifact (5 steps, 3 areas) and The Glitch Cure (5 steps, 3 areas)
- **Seasonal story chains** — Dark Frost (winter), Festival of Bloom (spring), Neon Rave (summer), Harvest Festival (autumn)
- **Daily quest system** (`dailyQuests.ts`) — 6 quest definitions, 3 rotate daily with XP/currency/item rewards
- **DailyQuestsPanel** — quest cards with progress bars, claim buttons, auto-refresh at midnight
- **QUESTS tab** in TopNav
- **Achievement tracking** — `achievements` field in GameState, `updateAchievements()` helper
- **CI pipeline** (`.github/workflows/ci.yml`) — chromium/firefox/webkit matrix + lint + unit tests
- `requiredAreas` and `season` requirement types in `EventRequirement`
- `meetsRequirements` exported from `eventEngine.ts`
- `getMoodMultiplier()`, `getEnergySpeedMult()`, `getPersonalityTraits()` helpers in `gameState.ts`
- `setPersonalityType()` in `gameState.ts`
- `getNeedsDecayPerTick()` in `gameLoop.ts`

### Changed
- Test count: 518 → **593 passing** (+75 new tests)
- Story events: 13 → **30+** (area-specific, seasonal, cross-area chains)
- MCP tools: 106 (unchanged)
- TopNav tabs expanded: 13 → 15 tabs (added CRAFT, PERSONA, QUESTS)
- GameState schema: added `personalityType`, `personalityTraits`, `achievements`, `dailyQuests`
- WorldState: already had `questFlags`, `npcFriendship`, `npcMet`
- Items: 12 items → **12 items** (unchanged) + 8 crafting recipes
- Achievements: 21 achievements across 5 categories
- Daily quests: 6 definitions, 3 active per day
- Playwright e2e: now configured for chromium + firefox + webkit in CI

### Fixed
- svelte-check: 0 errors maintained throughout
- Build: green throughout

### Added
- Initial release of AgenMonster Desktop via Tauri 2
- Floating 8-bit pet window with system-tray integration and global shortcut
- Agent tool-call loop (`__AGENT_MCP__:name|json`) 
- 3-tier memory brain (episodic + facts + topics, decay, reconsolidation)
- 427 passing unit tests; svelte-check 0 errors, 0 warnings
- PowerShell installer (`installer/Install-AgenMonster.ps1`)
- Portable bundle (`AgenMonster-portable-win64.zip`)
- NSIS installer script scaffolded in installer/
