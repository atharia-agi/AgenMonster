# AgenMonster — Agent Compact

## Current State
- **Web-only SvelteKit 5 + Svelte runes** app in `apps/desktop`
- **871 tests PASSING**, 0 failures. Build: green. svelte-check: 0 errors, 0 warnings.
- **Real multi-turn agent loop**: `runAgentChatLoop` in `agentLoop.ts` — genuine feedback loop (parse `__AGENT_MCP__` → execute tool → feed result back → ask LLM for next turn until no tool call / `done` flag / maxTurns). Chat path uses `dispatchAgentChatLoop` in `chatEngine.ts` with an async tool executor.
- **External tool bridge live in chat + stdio + prod**: `executeToolAsync` routes `secondbrain.*` / `browseros.*` through `POST /api/mcp`; the SvelteKit route, `server.mjs`, and `src/mcp-server.mjs` all bridge to the SecondBrain `om-mcp.mjs` process (`K:\SecondBrain\.claude\scripts\om-mcp.mjs`, cwd `K:\SecondBrain\.mcp`, `OBSIDIAN_VAULT=K:\SecondBrain\Monster_Brain`) and the BrowserOS endpoint (`http://127.0.0.1:9001/mcp`). 106 tools are genuinely reachable.
- **Brain injected into system prompt**: `brainContext.ts` → `buildBrainContext()` → `Brain state:` block (PAD/CTEM tone + valence, causal-memory lessons, mastered skills, model-routing hint) injected in `ChatPanel.getSystemPrompt`. `needsStrongerModel` escalates to a stronger model via `selectModel('analyze', ...)` in `resolveConfigForText`.
- **Companion brain (5 self-improvement engines)**: `skillCurator.ts` (self-generating skills — crystallizes successful trajectories into `SKILL.md`-style AgentSkills, refines from outcomes, prunes dead skills, bridges into live `agentSkills` registry), `emotionEngine.ts` (continuous PAD/CTEM emotional loop — Pleasure-Arousal-Dominance state, cross-temporal momentum, mood mapping, behavior coupling, emotion-driven model routing hints), `spreadingActivation.ts` in `memoryGraph.ts` (SYNAPSE-style retrieval — activation seeding, per-hop decay, temporal decay, lateral inhibition), `dreamCycle.ts` (Genesis DreamCycle — idle clustering, memory consolidation with confidence boost, lesson crystallization, feeds curator for skill formation), `causalMemory.ts` (causal chains: trigger → goal → approach → outcome → lesson, outcome prediction, lesson retrieval). Wired into `+page.svelte` via chat-event emotional loop + idle dream scheduler.
- **About panel**: 45+ rows (all shipped features documented)
- **MCP tools**: 106 (19 local + 23 secondbrain + 64 browseros) — all genuinely reachable via the `/api/mcp` bridge
- **MCP server**: `src/mcp-server.mjs` — stdio JSON-lines transport (zero-dep), also bridges secondbrain.*/browseros.*
- **Agent tool-call loop**: `src/lib/agentToolCall.ts` — pure parser for `__AGENT_MCP__:name|json` marker
- **Agent loop**: `src/lib/agentLoop.ts` — `runAgentLoop` (single-shot, `needsRetry` signal, provider fallback, doom loop detection, performance marks + structured logging) **plus `runAgentChatLoop`** (genuine multi-turn feedback loop: tool result fed back into history, next-turn LLM call, maxTurns/`done`/doom-loop termination)
- **Self-correction**: `src/lib/selfCorrect.ts` — heuristic quality detection with weak-phrase word-boundary regex, context-aware justification exclusion, confidence scoring, and retry outcome tracking (`recordRetryOutcome`, `getRetryConfidenceStats`)
- **Cross-device sync**: `src/lib/crossDeviceSync.ts` — transport abstraction with libp2p WebRTC (P2P) > BroadcastChannel (same-origin) > ServerRelayTransport (cross-device via `server.mjs`), true CRDT merge (OR-Set for goals with tombstones, LWW-Register for state/memory, vector-clock seq), lazy transport init
- **SyncPanel**: `src/lib/panels/SyncPanel.svelte` — CRDT merge applied to goals with add/remove tombstones, LWW for state/memory, transport status display
- **ChatPanel retry**: `src/lib/panels/ChatPanel.svelte` — exponential backoff + jitter retry (500ms base, 2x multiplier, 200ms jitter, 3000ms cap), wired to `pickFallback()` for provider switching, `recordProviderFailure` on retry error, round-robin fallback with 60s failure avoidance, state persisted to localStorage
- **Server relay**: `server.mjs` — `/api/sync/publish`, `/api/sync/poll`, `/api/sync/peers` endpoints for cross-device sync relay with in-memory TTL store
- **Error boundaries**: `src/lib/panels/ErrorBoundary.svelte` — per-panel error isolation with retry + error reporting
- **Structured logging**: `src/lib/logger.ts` — levels (debug/info/warn/error/fatal), correlation IDs, child loggers, subscribers for aggregation, `withTiming` helper
- **Performance monitoring**: `performance.mark`/`measure` in agent loop for turn/tool/loop latency
- **CI/CD**: `.github/workflows/ci.yml` — unit tests, typecheck, build, e2e, security audit, bundle analysis
- **E2E**: Playwright tests in `tests/e2e/` (smoke, mobile, features, agentic, accessibility, chatPanelRetry, visual-regression)
- **Mobile E2E matrix**: 21 device configs (iPhone 13/14Pro/14ProMax, Pixel 5/7/7Pro, Galaxy S24, iPhone 12/13/14Pro WebKit, iPad Pro 11, iPad (gen 7), Galaxy Tab S9, iPad Mini, landscape variants) - 141 tests
- **Accessibility**: `src/lib/accessibilityTree.ts` + `AccessibilityTreePanel.svelte` — full a11y tree extraction with AOM fallback, node inspection, dump/export
- **libp2p P2P transport**: `src/lib/libp2pTransport.ts` — WebRTC P2P **enabled** with full dependency chain
- **Visual regression**: Playwright snapshot testing (`test:visual`, `test:visual:update`)
- **Load testing**: k6 scripts with smoke/load/stress/spike scenarios (`test:load:*`)
- **Chaos engineering**: Failure injection harness with 6 predefined scenarios (`test:chaos`)
- **LLM providers**: `kilo` (default: `kilo-auto/free`), `groq`, `mistral`, `openai`, `openrouter`, `nousresearch` — all typed in `src/lib/llm.ts` + wired in `llmProxyCore.ts` / `vite.config.ts`

## Autonomous Near-AGI Cognitive Architecture (v1.3.0) — AGENT MAP

> **Read this section first.** The app now contains a fully autonomous, self-evolving
> digital creature. Below is the complete map an agent needs to understand, navigate,
> and extend the system.

### Mission / Identity
- **Core Mission** (`src/lib/identityModel.ts` → `CORE_MISSION`): *"Tumbuh jadi companion AGI otonom AgenMonster yang terus belajar & membantu user."*
- The creature is NOT a chatbot that waits for input. It runs, thinks, remembers, learns, acts, evolves, and writes its own autobiography — continuously.

### How to run / verify (Windows PowerShell)
```powershell
cd K:\AgenMonster\apps\desktop
node --test --experimental-strip-types tests/*.test.ts tests/chaos/*.test.ts   # 871 pass
npm run build                                                            # green
npx svelte-check --tsconfig ./tsconfig.json                              # 0 errors
```

### The 4-Lobus + SELF architecture
```
              SELF (identity + emotion + attention)
                 │
     ┌───────────┼───────────┐
   THINKING    MEMORY      ACTION
     │           │           │
     └───────────┼───────────┘
                 │
             LEARNING (base)
```

### Module file map (NEW in v1.3.0 — all in `src/lib/`)
| Layer | File | Responsibility |
|---|---|---|
| SELF | `identityModel.ts` | CoreMission, SelfModel, `scoreAgainstIdentity` |
| SELF | `goalHierarchy.ts` | tiered goals (core/long/mid/daily), `buildGoalTree`, `pickActiveTieredGoal` |
| SELF | `attentionEconomy.ts` | `priorityScore = impact×urgency×confidence−cost`, `decideAttention` |
| THINKING | `metaCognition.ts` | `assessBelief` → `{belief, confidence, missing, nextAction}` |
| THINKING | `simulation.ts` | counterfactual rollout, `likelyFailureMode` |
| THINKING | `executivePlanner.ts` | `decompose`, `topologicalOrder`, `replanOnFailure` |
| MEMORY | `worldModelGraph.ts` | entity+relation graph, `formConcepts`, `persistWorldGraph/loadWorldGraph` |
| MEMORY | `conceptFormation.ts` | abstraction hierarchy (the differentiator), `shouldMerge`, `clusterIntoConcepts` |
| ACTION | `alignmentLayer.ts` | hard constraints + soft prefs, `checkAllowed` |
| ACTION | `experimentEngine.ts` | hypothesis→measure→causal update, `abTest` |
| ACTION | `socialCognition.ts` | Theory of Mind, `modelStakeholder`, `tailorFor` |
| ACTION | `toolOrchestration.ts` | `orchestrate`: plan→dry-run→execute→verify→rollback |
| ACTION | `policyHabits.ts` | `PolicyLibrary`, habit formation |
| LEARNING | `autonomousAgent.ts` | 3-hour continuous multi-turn loop |
| LEARNING | `deepRecursiveAgent.ts` | 1-hour near-AGI loop; `runDeepTurn` + `runCognitionLayer` + `composeSelfNarrative` |
| LEARNING | `autonomousWorld.ts` | pet explores world areas, gains XP |
| LEARNING | `autonomousSelfCare.ts` | pet self-heals via selfHealing engine |
| LEARNING | `autonomousParallelResearch.ts` | parallel in-process research branches |
| LEARNING | `autonomousCuriosity.ts` | intrinsic motivation when bored |

### Pre-existing foundation (still active)
- `agentLoop.ts` (`runAgentChatLoop`), `memoryGraph.ts` (spreading activation), `dreamCycle.ts`, `emotionEngine.ts`, `skillCurator.ts`, `causalMemory.ts`, `petForm.ts`, `worldEngine.ts`, `selfHealing.ts`, `crossDeviceSync.ts`, `layeredContext.ts`, `brainContext.ts`.

### Autonomous modes (UI: `+page.svelte`)
- **START 3H** button → `autonomousAgent.start(3h)` — continuous multi-turn loop, dream cycle, emotion, pet speech, direct state mutation.
- **DEEP 1H** button → `deepRecursiveAgent.start(1h)` + `autonomousWorld.start()` + `autonomousSelfCare.start()` — full near-AGI loop with all 12 modules wired via `runCognitionLayer`.
- Live status shows mission + identity/planner/concept layers ON.
- `pet-form-evolved` event → `petForm` state → `MonsterRoom` → `PixelPetV2` (**live visual evolution, permanent via localStorage**).
- `pet-life-log` event → `lifeLog` state → "Life Log" sidebar panel (pet's autobiography).

### Key integration points
- `deepRecursiveAgent.runCognitionLayer(args)` runs identity scoring, world-graph concept formation, meta-cognition, attention gating, executive planning, alignment — returns a summary injected into the system prompt.
- `deepRecursiveAgent.composeSelfNarrative(args)` writes a first-person "life log" to the vault each turn (`kind: 'self-narrative'`).
- World graph persists via `persistWorldGraph`/`loadWorldGraph` (grows across sessions).
- Causal self-learning: each turn records a `CausalChain` via `recordCausalChain` + `persistCausalMemory`.
- Cross-device: `sync.syncState/syncMemory/syncGoals` push the evolving brain to other devices.

### What makes this "never seen before"
1. Pet **visibly evolves its form live AND permanently** during autonomous self-directed learning.
2. **Persistent growing world graph** (knowledge graph that accumulates across sessions).
3. **Autobiographical self-narrative** the creature writes and displays about itself.
4. 23-layer cognitive architecture (4 lobus + SELF) integrating reasoning, memory, action, learning.
5. Rarely-discussed differentiators already present: **Dream Cycle**, **Emotion-as-priority-allocation**, **Identity/self-model**.

## Key Features Shipped
- **Self-generating skills (Curator)** — `skillCurator.ts` writes skills from successful trajectories, tracks per-skill outcomes, refines prompts from experience, prunes dead skills, promotes proven ones, bridges into the live `agentSkills` registry (11 tests)
- **Continuous PAD/CTEM emotional engine** — `emotionEngine.ts` continuous Pleasure-Arousal-Dominance space, cross-temporal valence momentum, personality baselines, PAD→Mood mapping, behavior coupling, model routing hints (frustration escalates, boredom downgrades) (14 tests)
- **Spreading-activation memory retrieval** — `spreadingActivation`/`retrieveBySpreadingActivation` in `memoryGraph.ts`: seed entities from query, per-hop decay, temporal decay of old associations, lateral inhibition, ranked episode/fact retrieval (10 tests)
- **DreamCycle idle consolidation** — `dreamCycle.ts`: clusters episodes by tags/keyword overlap, merges repeat clusters into boosted-confidence schema episodes, crystallizes lessons into facts, feeds skill curator, idempotent scheduler (11 tests)
- **Causal memory chains** — `causalMemory.ts`: records trigger→goal→approach→outcome→lesson arcs, merges similar arcs, predicts outcomes from past triggers, lesson retrieval by query (11 tests)
- Goal-oriented loop (`goals.ts`) — auto-detect intent, sub-step tracking, completion detection
- Cost guard progress bars in Diagnostics (per-call, daily, per-provider, warn/block tiers)
- Active goal chip in MonsterStatus ribbon
- MCP goal.* tools (`goal.list/create/markdone/complete`)
- Thread management + slash commands
- Self-correction retry (different provider on weak replies)
- Graph search/filter + node click detail
- Dark/dawn themes, persona presets, `/preset`, `/mode`, `/write` slash
- Cost-guard toast, memory pressure indicator, AdvancedSettings
- Mobile responsive CSS
- **World engine**: 6 areas, weather, seasons, 5 NPCs, 8 wild encounters, 13 story quests
- **Pet evolution**: 4 forms, 4 paths, SP regen, care/battle/exploration gates
- **Hub growth**: 6 services, 7 quests, 6 decorations, NPC visits, daily XP
- **Items system**: 12 items, buy/sell/use, shop helpers for Rin + Vee
- **NPC friendship**: persisted friendship levels, repeat dialogue, relationship tracking
- **Focus mode**: Ctrl+Shift+F collapses all sidebars + bottom bar
- **Playwright e2e**: 10/10 pass, production build, CI-ready
- Daily Companion (5 levels, 518 tests) — moodEnergy, systemPrompt, proactivity, routine, importance, relationship, dailyRecap, morningWakeup, memoryIndex, suggestions, analytics, backup automation, presence indicator
- **Mobile E2E matrix**: 21 device configs (iPhone 13/14Pro/14ProMax, Pixel 5/7/7Pro, Galaxy S24, iPhone 12/13/14Pro WebKit, iPad Pro 11, iPad (gen 7), Galaxy Tab S9, iPad Mini, landscape variants) - 141 tests
- **Accessibility tree extraction**: `src/lib/accessibilityTree.ts` + `AccessibilityTreePanel.svelte` — full a11y tree extraction with AOM fallback, node inspection, dump/export
- **libp2p P2P transport**: `src/lib/libp2pTransport.ts` — WebRTC P2P **enabled** with full dependency chain
- **Visual regression testing**: Playwright snapshot testing with 9 scenarios
- **Load testing baseline**: k6 with 4 scenarios (smoke/load/stress/spike), p95<1s, error rate<1%
- **Chaos engineering harness**: 6 scenarios (networkPartition, highLatency, intermittentErrors, cascadeFailure, timeoutStorm, degradePerformance), 15 tests passing

## Architecture
- All keys server-side (`.env` + `process.env`)
- LLM proxy: `vite.config.ts` (dev) + `server.mjs` (prod)
- `node --test --experimental-strip-types tests/*.test.ts tests/chaos/*.test.ts` runs tests
- `npm run build` for production SPA
- `E2E_URL=http://localhost:4173 npx playwright test` for e2e against preview server
- Cross-device sync transport abstraction: `SyncTransport` interface with `LibP2PTransport` > `BroadcastChannelTransport` > `ServerRelayTransport` implementations
- CRDT merge functions are pure and testable without DOM/Browser APIs

## Offline Constraints
- No `npm install` — all deps pre-installed
- Windows PowerShell (no `&&`, no `grep`, no `wc`, no `tail`)
- Use `cmd /c` for bash commands or use native PowerShell cmdlets

## Recent Changes (v1.0.4)
- **libp2p P2P transport enabled** — full dependency chain installed (libp2p @0.43.0 + 10 sub-deps)
- **Visual regression testing** — Playwright snapshot testing with 9 scenarios, UPDATE_SNAPSHOTS support
- **Load testing baseline** — k6 scripts with 4 scenarios (smoke/load/stress/spike), automated runner
- **Chaos engineering harness** — failure injection with 6 predefined scenarios, 15 tests passing
- **Mobile E2E matrix** — 21 device configs (iPhone 13/14Pro/14ProMax, Pixel 5/7/7Pro, Galaxy S24, iPhone 12/13/14Pro WebKit, iPad Pro 11, iPad (gen 7), Galaxy Tab S9, iPad Mini, landscape variants) - 141 tests
- **Accessibility tree extraction** — `src/lib/accessibilityTree.ts` + `AccessibilityTreePanel.svelte` with AOM fallback, node inspection, dump/export
- **Benchmark harness** — 6 micro-benchmarks with budget enforcement (`tests/bench/`)
- **Structured logging** — `src/lib/logger.ts` with correlation IDs, child loggers, `withTiming`
- **Error boundaries** — per-panel isolation with retry + copy-to-clipboard
- **Performance marks** in agent loop for turn/tool/loop latency

## Recent Changes (v1.0.5)
- **Real multi-turn agent loop** — `runAgentChatLoop` + `dispatchAgentChatLoop`: tool results fed back into history for the next LLM turn, terminating on no tool call / `done` flag / maxTurns / doom-loop guard. 4 new tests.
- **External tool bridge in chat + stdio + prod** — `executeToolAsync` routes `secondbrain.*`/`browseros.*` through `/api/mcp`; `server.mjs` and `src/mcp-server.mjs` now bridge to the SecondBrain `om-mcp.mjs` process and BrowserOS `:9001` endpoint, so all 106 tools are reachable in every runtime.
- **Brain injected into system prompt** — `brainContext.ts` builds a `Brain state:` block (emotion tone + valence, causal lessons, mastered skills, routing hint) consumed by `ChatPanel.getSystemPrompt`; `needsStrongerModel` escalates via `selectModel('analyze', ...)`.

## Recent Changes (v1.0.6)
- **Layered (towering) memory** — `memoryLayers.ts` (working → shortTerm → semantic → episodic → vault) with per-layer salience, temporal decay, cross-layer fusion + dedup; `layeredContext.ts` wires real resolvers (spreading activation, causal memory, topic memory) and makes **SecondBrain the permanent vault layer** (`secondbrain.recall` reads, `secondbrain.remember` consolidates every successful chat into the vault). 7 new tests.
- **Self-determined visual identity** — `petForm.ts` derives a deterministic visual form (hue, ferocity, luminosity, markers, posture) from internal state (PAD emotion, mastery, lesson depth, energy, closeness); wired into `PixelPetV2` (form hue shifts the render palette) + `MonsterRoom` (aura + posture badge). 6 new tests.
- **Chat → brain write-through** — `ChatPanel` feeds `setWorkingMemory` + `consolidateToVault` on success; `agenmonster:chat` now dispatched on both success and failure so the PAD/CTEM emotional loop + causal memory + gamify `adapt()` actually update from chat outcomes.
- **Persistence hardening** — `gameState.ts` rotating dual backup slots + auto-recovery from backup when the primary key is corrupt/cleared; daily backup now also persists full state to native disk in the Tauri shell.
- **Correlation fix** — pet visual now reacts to `task_fail` (not just `task_success`), so the pet's mood stays in sync with the brain's emotional state.

## Recent Changes (v1.0.7)
- **Daily Mission flow** — `dailyMission.ts` flagship orchestration: pulls all 5 memory layers (working → short → semantic → episodic → vault/SecondBrain) anchored to "today", injects active goals + causal lessons + emotional state into the system prompt, asks the LLM for concrete next moves, and writes a `[daily]` note back into the vault so tomorrow's tower already knows today's intent. Wired to `/mission` and `/briefing` slash commands in `ChatPanel` with a real streaming LLM turn. 4 new tests.

## Recent Changes (v1.1.0)
- **Lag fixes at the source** — `PixelPetV2.svelte` render loop capped at 30fps animated / 10fps idle (was unlimited 60fps `requestAnimationFrame`); always-mounted mini pet canvas removed from `MonsterHeader` (static stage icon instead); `+page.svelte` rAF-coalesces bursty `gamestate-change` events; `dispatchEvent` returns the cached singleton so unchanged state never re-renders panels.
- **Fully collapsible workspace** — left/right sidebars + bottom bar toggle (persisted to `agenmonster_workspace`), ChatPanel CONTROLS collapsed by default so the composer/chat viewport is tall.
- **Readable type scale** — `--fs-xs` 11px → `--fs-xl` applied across ChatPanel/ChatInput/ChatMessage/TopNav/BottomStatusBar/MonsterHeader/NeedsPanel/ActiveTasks/MemoryCrystals/TodaysMissions.
- **Pet speech throttling** — `petSpeech.ts` (90s cooldown + dedup) gates autonomous pet-initiated chats.

## Recent Changes (v1.2.0)
- **Professional dark theme** — `app.css` completely rewritten: GBA pixel toy theme (#f8f4e8 cream, 3px borders, `image-rendering: pixelated` everywhere) replaced with professional dark design system (#0a0a0f base, #12121a surfaces, 1px borders, 6px radii, Inter font, smooth cubic-bezier transitions). Legacy CSS variable aliases (`--gb-bg`, `--gb-border`, etc.) map to new tokens for backward compatibility.
- **PixelPetV2 dithering eliminated** — `ditheredRect` replaced from per-pixel `fillRect` loop (43,200+ calls/frame at 30fps) to pre-rendered 8×8 dither pattern canvas with `CanvasPattern` fill. Pattern cache (`_patCache`) ensures each unique color/intensity combination creates its dither canvas exactly once. `drawDitheredBand` replaced with gradient band fills.
- **NeedsPanel action fix** — `handleAction` now calls the actual game functions (`feedPet`, `playWithPet`, `cleanPet`, `sleepPet`) instead of dispatching empty `gamestate-change` events. Actions now actually modify pet state.
- **Unified background scheduler** — 3 separate `setInterval` timers (idle 30s, clock 10s, dream 60s) consolidated into a single 10s tick in `setupBackgroundScheduler`. Dream cycle and idle checks gated by tick count modulo. Reduces timer overhead and localStorage write frequency.
- **Component CSS modernized** — NeedsPanel, action buttons, need bars, item chips all updated to use design token variables (`--bg-overlay`, `--border-subtle`, `--radius-md`, `--duration-fast`), rounded corners, smooth hover transitions, proper focus states.

## Next Steps (completed in v1.3.0)
1. ✅ Live-test typing latency — done (all canvases capped, single scheduler, dithering cached)
2. ✅ Modernize remaining component CSS — done (all 29 panels + +page.svelte on design tokens)
3. Visual regression CI integration — scaffolded (`test:visual`), wire into GitHub Actions
4. Load testing CI integration — k6 scripts present (`test:load:*`)
5. libp2p WebRTC transport — enabled with full dep chain; needs signaling server for prod P2P

## Recent Changes (v1.2.0 extended) — All 29 panel files bulk-modernized
- All 29 panel files + `+page.svelte` bulk-modernized: `--gb-*` vars → design tokens (`--bg-surface`, `--border-default`, `--text-primary`, `--text-muted`, `--accent-subtle`), `steps(2)` → `ease-in-out` everywhere, `image-rendering: pixelated` removed from all non-canvas components. Only `PixelPetV2.svelte` and `CareRing.svelte` retain pixelated rendering (canvas elements). 915/915 tests passing.

## Recent Changes (v1.2.0 — Autonomous Creature Expansion)
- **AutonomousAgent (3h)** — `autonomousAgent.ts`: continuous multi-turn agent loop, dream cycle, emotional engine, pet speech, brain/vault write-through, direct gameState mutation.
- **DeepRecursiveAgent (1h near-AGI)** — `deepRecursiveAgent.ts`: recursive self-research using spreading activation (5 memory layers) + causal prediction + skill curator + brain injection + self-evolving pet form + cross-device CRDT brain sync.
- **AutonomousWorld** — `autonomousWorld.ts`: pet explores areas, rolls encounters, completes events, gains XP, unlocks regions — real world progression, no render cost.
- **AutonomousSelfCare** — `autonomousSelfCare.ts`: pet feeds/plays/cleans/sleeps itself via selfHealing engine when needs critical — self-sustaining.
- All 4 modules wired to `START 3H` / `DEEP 1H` buttons in `+page.svelte` with live status indicator. 915/915 tests pass, build green.

## Recent Changes (v1.3.0 — Near-AGI 23-Layer Cognitive Architecture)
- Full 23-layer cognitive architecture built (4 lobus: SELF / THINKING / MEMORY / ACTION / LEARNING) per AGI-2026 research + user cross-assistant synthesis.
- Wave A (SELF+MEMORY): `identityModel.ts` (CoreMission: companion AGI otonom AgenMonster), `goalHierarchy.ts` (tiered core/long/mid/daily), `worldModelGraph.ts` (entity+relation graph), `conceptFormation.ts` (abstraction hierarchy — differentiator).
- Wave B (THINKING): `metaCognition.ts` (belief/confidence/missing/next_action), `simulation.ts` (counterfactual rollout), `attentionEconomy.ts` (priority = impact×urgency×confidence−cost).
- Wave C (AGENCY): `executivePlanner.ts` (decompose/dependency/replan), `alignmentLayer.ts` (hard constraints + soft prefs), `experimentEngine.ts` (hypothesis→measure→causal update), `socialCognition.ts` (ToM), `policyHabits.ts` (habit formation), `toolOrchestration.ts` (plan→dry-run→execute→verify→rollback).
- Wave D: all wired into `deepRecursiveAgent.runDeepTurn` via `runCognitionLayer`. Persistent world graph + self-narrative + live/permanent pet-form evolution added. **871/871 tests pass, build green, svelte-check 0 errors.**
- **Kilo provider added**: `kilo-auto/free` default model wired into `LLMProvider` type + `llmProxyCore.ts` PROVIDERS map.
- **Null-safety hardening**: `achievements.ts`, `autonomousWorld.ts`, `gameState.ts`, `agentToolCall.ts` — all guarded against undefined state in test/browser environments.
- **Build fixes**: removed circular `manualChunks` in `vite.config.ts`, restored missing exports in `chatEngine.ts` (`dispatchAgentToolWithHooks`), `selfCorrect.ts` (`recordRetryOutcome`, `getRetryConfidenceStats`), `gameState.ts` (`items: []` in `createInitialState`).
