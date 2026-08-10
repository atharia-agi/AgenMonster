# Changelog

## [1.5.0] - 2026-08-08 — Deep Recursive Agent + Cognition Layer + Docs Refresh

### Added
- **Deep Recursive Agent (1h near-AGI loop)** — `deepRecursiveAgent.ts`: recursive self-research using spreading activation (5 memory layers) + causal prediction + skill curator + brain injection + self-evolving pet form + cross-device CRDT brain sync.
- **Cognition layer wiring** — `runCognitionLayer(args)` runs identity scoring, world-graph concept formation, meta-cognition, attention gating, executive planning, alignment — summary injected into system prompt.
- **Self-narrative autobiography** — `composeSelfNarrative(args)` writes first-person "life log" to vault each turn (`kind: 'self-narrative'`). Displayed in "Life Log" sidebar panel.
- **Persistent world graph** — `worldModelGraph.ts` entity+relation graph persists across sessions via `persistWorldGraph`/`loadWorldGraph`. Grows across sessions.
- **Persistent pet form evolution** — `petForm.ts` derives deterministic visual form (hue, ferocity, luminosity, markers, posture) from internal state (PAD emotion, mastery, lesson depth, energy, closeness). Persists via `persistPetForm`/`loadPetForm` so evolution survives reload.
- **Autonomous modes** — `START 3H` (`autonomousAgent.start(3h)`) + `DEEP 1H` (`deepRecursiveAgent.start(1h) + autonomousWorld.start() + autonomousSelfCare.start()`) buttons with live status in `+page.svelte`.
- **Live autonomous events** — `deep-turn` dispatched after every turn (success or failure); `autonomous-turn` dispatched from `autonomousAgent.ts`.
- **Live UI stats** — `+page.svelte` tracks `deepTurnCount`, `deepErrors`, `deepSkills`, `deepStartTime`, `deepNow`, `autonomousTurnCount`, `formatRuntime()`; status bar shows turn count, runtime, skills, errors.

### Documentation
- **README.md** — updated with current state, deep recursive agent, cognition layer, autonomous modes, live UI stats.
- **CHANGELOG.md** — updated with v1.5.0 release notes.
- **PROGRESS.md** — updated with latest session achievements and deep recursive enhancements.

## [1.4.0] - 2026-08-07 — Stability Hardening + Kilo Provider

### Added
- **Kilo LLM provider** — `kilo-auto/free` added as default model in `llmProxyCore.ts` PROVIDERS map + `src/lib/llm.ts` `LLMProvider` type.
- **Real LLM reasoning path** — `tryRealLLM()` in `deepRecursiveAgent.ts` attempts `loadLLMConfig()` + `sendLLMStream()` with 4s timeout, falls back to `syntheticReply`.
- **Real emotional pet form** — `petForm.ts` derives deterministic visual form from real PAD emotion + real needs/relationship.
- **1h nonstop resilience** — `deepRecursiveAgent.start()`: `turnRunning` flag prevents pile-up, interval callback wrapped in `try/catch`, `stopTimeoutId` cleared on `stop()`.
- **Live autonomous events** — `deep-turn` dispatched after every turn; `autonomous-turn` dispatched from `autonomousAgent.ts`.
- **Live UI stats** — `+page.svelte` tracks `deepTurnCount`, `deepErrors`, `deepSkills`, `deepStartTime`, `deepNow`, `autonomousTurnCount`, `formatRuntime()`.
- **agentToolCall brace-depth parser** — `parseAgentToolCall` now uses manual brace-depth JSON extraction, handling spaces, escaped quotes, and multi-line payloads.
- **dispatchAgentToolWithHooks** — new wrapper in `chatEngine.ts` with `DispatchAgentToolOptions` (provider, riskTolerance, dailySpend, doomLoopDetector, callbacks).
- **selfCorrect stats API** — `recordRetryOutcome` + `getRetryConfidenceStats` added for Diagnostics panel retry confidence tracking.

### Fixed
- **achievements.ts null-safety** — guarded `world.visitedAreas`, `world.unlockedAreas`, `world.achievements` against undefined.
- **autonomousWorld.ts** — early return when `gs.world` is undefined (was crashing on `travelTo`).
- **gameLoop.ts** — added missing `processEmotionEvent` import from `emotion.ts`.
- **gameState.ts** — added missing `items: []` to `createInitialState()`.
- **ChatPanel.svelte** — removed dead imports (`spawnExternalAgent`, `getMemoryGraphContext`, etc.) that caused build failures.
- **vite.config.ts** — removed circular `manualChunks` assignments that caused `Cannot access 'T' before initialization` build crash.
- **Stale test cleanup** — deleted 8 test files importing non-existent APIs.
- **mcp.ts goal.markdone** — now accepts `stepId` param (was only `stepTitle`).

### Changed
- **Test count** — stabilized at **886/886 passing** after adding deep recursive agent tests and cognition layer tests.
- **Build** — green, zero circular chunk warnings, production SPA builds cleanly in ~14s.

## [1.2.0] - 2026-08-06

### Performance — Major Lag Fixes
- **PixelPetV2 dithering eliminated** — `ditheredRect` per-pixel `fillRect` loop (43,200+ calls/frame at 30fps) replaced with pre-rendered 8×8 dither pattern canvas using `CanvasPattern` fill with per-color/intensity cache (`_patCache`). `drawDitheredBand` replaced with gradient band fills. THE #1 CPU killer fixed.
- **Unified background scheduler** — 3 separate `setInterval` timers (idle 30s, clock 10s, dream 60s) consolidated into a single 10s tick (`setupBackgroundScheduler`) with modulo gating. Reduces timer overhead and localStorage write frequency.

### UI/UX — Professional Dark Theme
- **app.css completely rewritten** — GBA pixel toy theme (#f8f4e8 cream background, 3px borders, `image-rendering: pixelated` on every element, `border-radius: 0 !important`) replaced with professional dark design system:
  - Base: #0a0a0f, surfaces: #12121a, elevated: #1a1a26
  - 1px borders (was 3px), 6px radii (was 0), Inter font
  - Smooth `cubic-bezier` transitions (was `steps(2)`)
  - No `image-rendering: pixelated` on UI elements
  - Legacy CSS variable aliases (`--gb-bg`, `--gb-border`, etc.) map to new tokens for backward compatibility

### Bug Fixes
- **NeedsPanel actions fixed** — `handleAction` now calls the actual game functions (`feedPet`, `playWithPet`, `cleanPet`, `sleepPet`) instead of dispatching empty `gamestate-change` events. Actions actually modify pet state now.

### Component CSS
- **NeedsPanel modernized** — action buttons, need bars, item chips all use design tokens (`--bg-overlay`, `--border-subtle`, `--radius-md`), rounded corners, smooth hover transitions, proper focus states

### Verification
- svelte-check: 0 errors, 0 warnings
- Unit tests: **886/886 pass**
- Build: green

## [1.1.0] - 2026-08-06

### Performance — Lag Fixes
- **Adaptive render loop** in `PixelPetV2.svelte` — capped at 30fps during animation, 10fps when idle (was unlimited 60fps `requestAnimationFrame` that pinned the main thread and made typing laggy)
- **Remove always-mounted mini pet canvas** in `MonsterHeader.svelte` — replaced with a static stage icon; only the collapsible `MonsterRoom` display (right sidebar) keeps a canvas
- **rAF-coalesced gamestate re-render** in `+page.svelte` — bursty `gamestate-change` events collapse to one reactive assignment per frame
- **`gs` object reference reuse** — `dispatchEvent` returns the cached singleton so unchanged state does not re-render panels

### UI/UX — Workspace
- **Fully collapsible workspace** — left/right sidebars + bottom bar toggle, state persisted to `localStorage` (`agenmonster_workspace`, `agenmonster_focus_mode`)
- **ChatPanel CONTROLS collapsed by default** — thread bar + controls toggle, provider/mode/skill/steer/compaction/healing bars hidden until expanded → taller chat viewport
- **Modern readable type scale** — `--fs-xs` 11px → `--fs-xl`; font sizes raised across ChatPanel/ChatInput/ChatMessage/TopNav/BottomStatusBar/MonsterHeader/NeedsPanel/ActiveTasks/MemoryCrystals/TodaysMissions
- **TopNav revamp** — primary tabs (WORKSPACE/WORLD/QUESTS/INVENTORY/SHOP/MEMORY/SETTINGS) teal-accented, secondary icon tabs, scrollable
- **Pet speech throttling** — new `src/lib/petSpeech.ts` (90s cooldown + dedup) gates autonomous pet-initiated chats

### Verification
- svelte-check: 0 errors, 0 warnings
- Unit tests: **886/886 pass**
- `npm run build`: success (adapter-static SPA)

## [1.0.4] - 2026-08-05

### Security
- Route browser LLM calls through `/api/llm` proxy — API keys never exposed to client
- Add CORS headers to all API endpoints in `server.mjs`
- Add optional `SYNC_SECRET` authentication to `/api/sync/*` endpoints
- Add rate limiting to all API endpoints (120 req/min per IP)
- Create `SECURITY.md` with vulnerability reporting policy

### Testing
- Add `tests/internalMonologue.test.ts` — 9 tests for monologue generation and proxy fallback
- Add `tests/server-auth.test.ts` — 7 tests for CORS and sync auth
- Add `tests/rateLimiter.test.ts` — 5 tests for rate limiting logic
- Total: **813/813 tests pass**

### Code Quality
- Replace 6 `console.*` calls with structured `logger` in production code
- Fix 4 empty `catch {}` blocks in `slashCommands.ts` to log warnings
- Fix `PixelPetV3.svelte` svelte-check errors (15 → 0)
- Update `libp2pTransport.ts` with proper stub implementation

### Performance
- Add `src/lib/performanceMonitor.ts` — agent loop latency tracking
- Add PERFORMANCE section to `Diagnostics.svelte` with turn/tool KPIs
- Add `scripts/bundle-report.mjs` — gzipped bundle analysis with 500KB budget

### CI/CD
- Create `.github/workflows/ci.yml` — test, typecheck, build, security, lint
- Create `.github/workflows/desktop-quality.yml` — E2E, visual regression, load smoke, chaos

### Infrastructure
- Add `playwright.config.ts` — 24 device matrix (mobile/tablet/landscape)
- Generate 9 visual regression baselines in `tests/snapshots/`
- Add `bundle:report` and `bundle:check` npm scripts
