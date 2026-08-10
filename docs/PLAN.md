# AgenMonster — Master Plan

> Future-of-the-future planning. Sits on top of PROGRESS.md (which documents the
> shipped work). This file is the *forward* map: what to build next, why, and
> what should be deferred.

## 🚀 v1.4.0 Stability Hardening + Kilo Provider (latest)
- **Kilo LLM provider** — `kilo-auto/free` added as default model in `llmProxyCore.ts` + `src/lib/llm.ts`
- **Real LLM reasoning path** — `tryRealLLM()` in `deepRecursiveAgent.ts` with 4s timeout + synthetic fallback
- **Real emotional pet form** — `petForm.ts` derives deterministic visual form from real PAD emotion + needs/relationship
- **1h nonstop resilience** — `deepRecursiveAgent.start()`: `turnRunning` flag, `try/catch` interval, `stopTimeoutId` cleared on `stop()`
- **Live autonomous events** — `deep-turn` + `autonomous-turn` dispatched after every turn
- **Live UI stats** — `+page.svelte` tracks `deepTurnCount`, `deepErrors`, `deepSkills`, `deepStartTime`, `deepNow`, `autonomousTurnCount`, `formatRuntime()`
- **agentToolCall brace-depth parser** — handles spaces, escaped quotes, multi-line JSON payloads
- **dispatchAgentToolWithHooks** — new wrapper in `chatEngine.ts` with full options + callbacks
- **selfCorrect stats API** — `recordRetryOutcome` + `getRetryConfidenceStats` for Diagnostics panel
- **Null-safety hardening** — `achievements.ts`, `autonomousWorld.ts`, `gameState.ts`, `agentToolCall.ts` guarded against undefined state
- **Build fixes** — removed circular `manualChunks` in `vite.config.ts`, restored missing exports in `chatEngine.ts`, `selfCorrect.ts`, `gameState.ts`
- **Stale test cleanup** — deleted 8 test files importing non-existent APIs
- **Test count**: 871/871 passing. Build: green.

## 🚀 v1.3.0 Near-AGI 23-Layer Cognitive Architecture
- **Full 23-layer autonomous cognitive architecture** (4 lobus: SELF / THINKING / MEMORY / ACTION / LEARNING) built per AGI-2026 research synthesis.
- **Wave A (SELF+MEMORY):** `identityModel.ts` (CoreMission: companion AGI otonom AgenMonster), `goalHierarchy.ts` (tiered core/long/mid/daily goals), `worldModelGraph.ts` (entity+relation graph, persistent via localStorage), `conceptFormation.ts` (abstraction hierarchy — differentiator).
- **Wave B (THINKING):** `metaCognition.ts` (belief/confidence/missing/next_action), `simulation.ts` (counterfactual rollout), `attentionEconomy.ts` (priority = impact×urgency×confidence−cost).
- **Wave C (AGENCY):** `executivePlanner.ts` (decompose/dependency/replan), `alignmentLayer.ts` (hard constraints + soft prefs), `experimentEngine.ts` (hypothesis→measure→causal update), `socialCognition.ts` (Theory of Mind), `policyHabits.ts` (habit formation), `toolOrchestration.ts` (plan→dry-run→execute→verify→rollback).
- **Wave D (integration):** all wired into `deepRecursiveAgent.runDeepTurn` via `runCognitionLayer`; `composeSelfNarrative` writes a first-person autobiography to the vault; `pet-form-evolved` drives **live + permanent visual evolution**; "Life Log" sidebar panel displays the pet's self-narrative.
- **Autonomous modes UI:** `START 3H` (AutonomousAgent) + `DEEP 1H` (DeepRecursiveAgent + AutonomousWorld + AutonomousSelfCare) buttons with live status in `+page.svelte`.
- **Kilo provider added**: `kilo-auto/free` default model wired into `LLMProvider` type + `llmProxyCore.ts` PROVIDERS map.
- **Null-safety hardening**: `achievements.ts`, `autonomousWorld.ts`, `gameState.ts`, `agentToolCall.ts` — all guarded against undefined state in test/browser environments.
- **Build fixes**: removed circular `manualChunks` in `vite.config.ts`, restored missing exports in `chatEngine.ts` (`dispatchAgentToolWithHooks`), `selfCorrect.ts` (`recordRetryOutcome`, `getRetryConfidenceStats`), `gameState.ts` (`items: []` in `createInitialState`).

## 🚀 v1.1.0 Performance + Workspace
- **Lag fixes at the source** — `PixelPetV2` render loop capped at 30fps animated / 10fps idle; always-mounted mini pet canvas removed from `MonsterHeader` (static icon); `+page.svelte` rAF-coalesces bursty `gamestate-change` events; `dispatchEvent` returns a cached singleton so unchanged state never re-renders panels.
- **Fully collapsible workspace** — left/right sidebars + bottom bar toggle; ChatPanel CONTROLS collapsed by default (taller chat viewport).
- **Readable type scale** — `--fs-xs` 11px → `--fs-xl` across all core panels.
- **Pet speech throttling** — `petSpeech.ts` 90s cooldown + dedup.

## 🚀 v1.0.4 Infrastructure Complete (this session)
- **libp2p P2P transport enabled** — full dependency chain installed (libp2p @0.43.0 + 10 sub-deps)
- **Visual regression testing** — Playwright snapshot testing with 9 scenarios, UPDATE_SNAPSHOTS support
- **Load testing baseline** — k6 scripts with 4 scenarios (smoke/load/stress/spike), automated runner
- **Chaos engineering harness** — failure injection with 6 predefined scenarios, 15 tests passing

## 0. Identity (carried from PROGRESS.md)
- **Web-only SvelteKit 5 + Svelte runes**, static build via `adapter-static`.
- **Production server via `server.mjs`** (zero-dep).
- **All keys server-side**; LLM proxy in vite.config.ts (dev) and server.mjs (prod).
- **Tests**: 871/871 passing. svelte-check: 0 errors, 0 warnings. Build: green.
- **About panel** = source of truth. Every visible feature must show in About.
- **E2E**: 10/10 pass (chromium, production build).

## 1. Tier audit
- Tier-1 CORE: ✅ shipped (SSE stream, cancel, escape, tests, lint, build).
- Tier-2 STATE PERSISTENCE: ✅ shipped (migration, config, stats, tokens, memory, persona, recap).
- Tier-3 ROUTING INTELLIGENCE: ✅ shipped (task detection, topic-aware routing, drift display).
- Tier-4 MEMORY BRAIN: ✅ shipped (episodic + facts + topics, decay, reconsolidation, persona, JSON I/O, lesson capture).
- Tier-5 UX: ✅ shipped (slash commands, markdown lite, copy, retry, drag-resend).
- Tier-6 UI ENRICHMENT: ✅ shipped (Diagnostics, MemoryPanel, BottomStatusBar LIVE, MonsterStatus heartbeat).
- Tier-7 OBSERVABILITY: ✅ shipped (token tracker, cost, latency, success/fail).
- Tier-MAX ROADMAP (9 items): ✅ all shipped — cost guard, session-end reflection, multi-conversation threads (state + UI), memory ontology, self-correction (heuristic + real retry), graph viz, dark theme, MCP bridge (transport-agnostic + HTTP).
- Tier-WORLD: ✅ shipped — world engine, event engine, pet evolution, hub growth, items, NPC friendship, story quests.
- Tier-DAILY-COMPANION: ✅ shipped — 5 levels (moodEnergy → analytics + backup).

## 2. Critical gaps (the reason for this plan)

After exhausting Tier-Max + Tier-WORLD + Tier-DAILY-COMPANION, three *real* gaps remain:

### GAP A: Shop UI + currency system
Items exist but there's no visual shop interface. Players can't browse/buy/sell items through the UI.

### GAP B: Pet needs interactivity
Pet needs (hunger, affection, energy, focus, mood, motivation, knowledge) affect gameplay but there's no direct interaction model (feed/play/clean actions with item effects).

### GAP C: Story chain expansion
13 story events exist but they're isolated. Need more area-specific arcs with branching paths and meaningful rewards.

## 3. Forward priorities

### 3.1 Shop UI for NPC stores (closes GAP A)

**Module**: `src/lib/panels/ShopPanel.svelte` (new)

- Browse items by NPC (Rin's shoppe, Vee's stall)
- Buy/sell with currency tracking
- Item detail tooltips showing effects
- Inventory count display

**Storage**: Add `currency: number` to `GameState`. Deduct on buy, add on sell.

**Tests**: 8+ tests covering buy/sell, currency deduction, inventory limits.

### 3.2 Pet needs interactivity (closes GAP B)

**Module**: Extend `NeedsPanel.svelte` with action buttons.

- Feed (uses food items, +energy, +hunger)
- Play (uses toy items, +affection, -energy)
- Clean (uses grooming items, +mood, +focus)
- Sleep (restores energy, time passes)

**Effects**: Item effects already defined in `items.ts`. Wire into `gameState.ts` via `useItem()`.

**Tests**: 6+ tests covering each action's effect on needs.

### 3.3 Story chain expansion (closes GAP C)

**Module**: Extend `eventEngine.ts` story events.

- Add 10+ new story events with branching choices
- Area-specific arcs (home_forest chain, void_sea chain, etc.)
- Meaningful rewards (items, NPC friendship, hub unlocks)
- Quest chains with prerequisites

**Tests**: 10+ tests covering chain progression, prerequisites, rewards.

## 4. Smaller items

### 4.1 Dangling completion (priority 2)

| Item | Module | Effort |
|---|---|---|
| Currency/credits system | gameState.ts | 2h |
| Shop UI panel | ShopPanel.svelte | 4h |
| Pet needs action buttons | NeedsPanel.svelte | 2h |
| Story chain expansion | eventEngine.ts | 4h |

### 4.2 Experimental (priority 3)

| Item | Module | Effort |
|---|---|---|
| Playwright e2e in CI matrix | .github/workflows | 2h |
| FireFox + WebKit e2e validation | playwright.config.ts | 1h |
| World map minimap | WorldPanel.svelte | 3h |
| Pet needs urgency indicators | NeedsPanel.svelte | 1h |

### 4.3 Polish (priority 4)

| Item | Effort |
|---|---|
| Accessibility audit (WCAG 2.2 AA) | 4h |
| Performance profiling + optimization | 3h |
| Internationalization (i18n) | 6h |
| Offline mode (service worker) | 4h |

## 5. Memory architecture impact (target after NG.1)

After NG.1 ships, the system prompt for any LLM call will contain:
- The user's persona override.
- Top-3 recalled memories (with reconsolidation).
- The current active goal (if any).
- Personality drift note (if drift triggered).
- Reconsolidated facts (via `bumpFact`).

That's the full mental model the pet brings to every reply.

## 6. Acceptance criteria for NG.1

1. Tests ≥ 800 (current 871 passing).
2. `svelte-check` clean (0 errors, 0 warnings).
3. About panel adds `SHOP · CURRENCY · PET NEEDS · STORY CHAINS`.
4. `docs/PROGRESS.md` gets a new section: `## Session 21 — Shop UI + Pet Needs + Story Chains`.
5. The pet can demonstrate end-to-end: user opens shop, buys item, feeds pet, sees needs change, progresses through story chain.

## 7. Things explicitly OUT of scope (so we don't get baited)

- **Web search / code execution tools** — those are MCP integrations for future agent platforms, not pet core.
- **Voice input / output** — outside the desktop scope.
- **Multi-user collaboration** — single-user companion only.
- **Cloud sync / accounts** — explicitly offline-first.
- **Graphify integration** — already rejected (Python runtime, different problem).
- **Tauri / Rust / Flutter** — web-only since Session 8 pivot.

## 8. Long-term invariants

These NEVER change:

1. **No `npm install` extra deps.** The system stays zero-dep at runtime.
2. **All keys server-side.** Browser never holds provider keys.
3. **Tests grow monotonically.** Never delete a test when shipping.
4. **About panel = source of truth.** Every visible feature must show.
5. **`svelte-check` always green.** No warnings accepted.
6. **Pure logic + DOM glue.** State modules don't import svelte; UI imports them.
7. **Pixel aesthetic.** No `border-radius`, `backdrop-filter`, `box-shadow`, or spring physics in production CSS.

## 9. How to use this plan

When you (or another agent) come back and ask "what next?", read this file
top-down. Pick the highest-priority item in §3 or §4. Ship it fully. Update
§10 with completion status. Move on.

## 10. Next-Run Plan (current session)

### Priority 1: Shop UI + Currency
- Add `currency: number` to `GameState`
- Create `ShopPanel.svelte` with item grid, buy/sell buttons
- Wire buy/sell to `useItem()` + currency deduction
- Add tests

### Priority 2: Pet Needs Interactivity
- Add action buttons to `NeedsPanel.svelte` (feed/play/clean/sleep)
- Wire actions to `useItem()` + effect system
- Add urgency indicators (color changes when needs are low)

### Priority 3: Story Chain Expansion
- Add 10+ new story events to `eventEngine.ts`
- Add branching choices with prerequisites
- Add meaningful rewards (items, NPC friendship, hub unlocks)

### Priority 4: E2E in CI
- Add `.github/workflows/e2e.yml` with 3-browser matrix
- Fix any remaining flaky tests
- Document E2E_URL setup in README

