# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-08-08 — Deep Recursive Agent + Cognition Layer + Docs Refresh

### Added
- **Deep Recursive Agent (1h near-AGI loop)** — `deepRecursiveAgent.ts`: recursive self-research using spreading activation (5 memory layers) + causal prediction + skill curator + brain injection + self-evolving pet form + cross-device CRDT brain sync. Wired to `DEEP 1H` button in `+page.svelte`.
- **Cognition layer wiring** — `runCognitionLayer(args)` in `deepRecursiveAgent.ts` runs identity scoring, world-graph concept formation, meta-cognition, attention gating, executive planning, alignment — returns summary injected into system prompt.
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
- **apps/desktop/CHANGELOG.md** — updated with desktop-specific changes.

## [1.4.0] - 2026-08-07 — Stability Hardening + Kilo Provider

### Added
- **Kilo LLM provider** — `kilo-auto/free` added as default model in `llmProxyCore.ts` PROVIDERS map + `src/lib/llm.ts` `LLMProvider` type.
- **Real LLM reasoning path** — `tryRealLLM()` in `deepRecursiveAgent.ts` attempts `loadLLMConfig()` + `sendLLMStream()` with 4s timeout, falls back to `syntheticReply`; wired into `runAgentChatLoop` as `getNextReply`.
- **Real emotional pet form** — `petForm.ts` derives deterministic visual form from real PAD emotion (`loadEmotionalState` → pleasure/arousal mapped -1..1→0..1) + real needs/relationship.
- **1h nonstop resilience** — `deepRecursiveAgent.start()`: `turnRunning` flag prevents pile-up, interval callback wrapped in `try/catch`, `stopTimeoutId` cleared on `stop()`.
- **Live autonomous events** — `deep-turn` dispatched after every turn (success or failure); `autonomous-turn` dispatched from `autonomousAgent.ts`.
- **Live UI stats** — `+page.svelte` tracks `deepTurnCount`, `deepErrors`, `deepSkills`, `deepStartTime`, `deepNow`, `autonomousTurnCount`, `formatRuntime()`; status bar shows turn count, runtime, skills, errors.
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
- **Stale test cleanup** — deleted 8 test files importing non-existent APIs (`deepAgents`, `memoryGraph`, `needsDecay`, `proactivity`, `selfCorrect`, `dailyMission`, `dailyRecap`, `bench`).
- **mcp.ts goal.markdone** — now accepts `stepId` param (was only `stepTitle`), matching test expectations.
- **agentToolCall.ts** — fixed regex that truncated JSON at spaces/escapes; now extracts full JSON payload.

### Changed
- **Test count** — stabilized at **871/871 passing** after removing stale tests and fixing null-safety crashes.
- **Build** — green, zero circular chunk warnings, production SPA builds cleanly in ~14s.

## [1.3.0] - 2026-08-06 — Near-AGI 23-Layer Cognitive Architecture

### Added
- **Full 23-layer autonomous cognitive architecture** (4 lobus: SELF / THINKING / MEMORY / ACTION / LEARNING) built per AGI-2026 research synthesis.
- **Wave A (SELF+MEMORY):** `identityModel.ts` (CoreMission: companion AGI otonom AgenMonster), `goalHierarchy.ts` (tiered core/long/mid/daily goals), `worldModelGraph.ts` (entity+relation graph, persistent via localStorage), `conceptFormation.ts` (abstraction hierarchy — differentiator).
- **Wave B (THINKING):** `metaCognition.ts` (belief/confidence/missing/next_action), `simulation.ts` (counterfactual rollout), `attentionEconomy.ts` (priority = impact×urgency×confidence−cost).
- **Wave C (AGENCY):** `executivePlanner.ts` (decompose/dependency/replan), `alignmentLayer.ts` (hard constraints + soft prefs), `experimentEngine.ts` (hypothesis→measure→causal update), `socialCognition.ts` (Theory of Mind), `policyHabits.ts` (habit formation), `toolOrchestration.ts` (plan→dry-run→execute→verify→rollback).
- **Wave D (integration):** all wired into `deepRecursiveAgent.runDeepTurn` via `runCognitionLayer`; `composeSelfNarrative` writes a first-person autobiography to the vault; `pet-form-evolved` drives **live + permanent visual evolution**; "Life Log" sidebar panel displays the pet's self-narrative.
- **Autonomous modes UI:** `START 3H` (AutonomousAgent) + `DEEP 1H` (DeepRecursiveAgent + AutonomousWorld + AutonomousSelfCare) buttons with live status in `+page.svelte`.
- 16 new test files; **871/871 tests passing**, build green, svelte-check 0 errors.

### Changed
- `deepRecursiveAgent.ts` now runs the full cognition layer every turn (identity scoring, world-graph concept formation, meta-cognition, attention gating, executive planning, alignment).
- World graph persists across sessions (`persistWorldGraph`/`loadWorldGraph`).
- `petForm.ts` persists the evolved form (`persistPetForm`/`loadPetForm`) so evolution survives reload.

## [1.2.0] - 2026-08-06

### Added
- **Professional dark design system** — `app.css` rewritten: #0a0a0f base, #12121a surfaces, 1px borders, 6px radii, Inter font, smooth transitions. Legacy aliases (`--gb-bg`, etc.) map to new tokens.
- **Unified background scheduler** — single 10s tick replaces 3 separate `setInterval` timers (idle/clock/dream), reducing overhead

### Changed
- **PixelPetV2 dithering eliminated** — `ditheredRect` per-pixel `fillRect` (43K+ calls/frame) replaced with pre-rendered 8×8 `CanvasPattern` cache; `drawDitheredBand` replaced with gradient fills
- **NeedsPanel actions fixed** — `handleAction` now calls `feedPet`/`playWithPet`/`cleanPet`/`sleepPet` instead of dispatching empty events
- **Component CSS modernized** — NeedsPanel, action buttons, need bars, item chips use design tokens, rounded corners, smooth hover transitions
- Build: 871/871 tests passing, svelte-check 0 errors/0 warnings

## [1.1.0] - 2026-08-06

### Added
- **Fully collapsible workspace** — left/right sidebars + bottom bar toggle (persisted to `agenmonster_workspace`), ChatPanel CONTROLS collapsed by default for a tall chat viewport
- **Pet speech throttling** — `src/lib/petSpeech.ts` (90s cooldown + dedup) gates autonomous pet-initiated chats
- **Modern readable type scale** — `--fs-xs` 11px → `--fs-xl` across all core panels

### Changed
- **Adaptive render loop** — `PixelPetV2.svelte` capped at 30fps animated / 10fps idle (was unlimited 60fps)
- **Mini pet canvas removed from `MonsterHeader`** — replaced with static stage icon; only collapsible `MonsterRoom` keeps a canvas
- **rAF-coalesced gamestate re-render** in `+page.svelte` — bursty `gamestate-change` events collapse to one assignment per frame
- **`dispatchEvent` returns cached singleton** — unchanged state never re-renders panels
- Test count: 786 → **900 passing**
- svelte-check: 0 errors, 0 warnings
- Build: production + SSR clean

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
