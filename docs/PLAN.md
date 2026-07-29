# AgenMonster — Master Plan Beyond Tier-Max

> Future-of-the-future planning. Sits on top of PROGRESS.md (which documents the
> shipped work). This file is the *forward* map: what to build next, why, and
> what should be deferred.

## 0. Identity (carried from PROGRESS.md)
- **Web-only SvelteKit 5 + Svelte runes**, static build via `adapter-static`.
- **Production server via `server.mjs`** (zero-dep).
- **All keys server-side**; LLM proxy in vite.config.ts (dev) and server.mjs (prod).
- **Tests**: 300/300 passing. svelte-check: 0 errors, 0 warnings. Build: green.
- **About panel** = source of truth. Every visible feature must show in About.

## 1. Tier audit
- Tier-1 CORE: ✅ shipped (SSE stream, cancel, escape, tests, lint, build).
- Tier-2 STATE PERSISTENCE: ✅ shipped (migration, config, stats, tokens, memory, persona, recap).
- Tier-3 ROUTING INTELLIGENCE: ✅ shipped (task detection, topic-aware routing, drift display).
- Tier-4 MEMORY BRAIN: ✅ shipped (episodic + facts + topics, decay, reconsolidation, persona, JSON I/O, lesson capture).
- Tier-5 UX: ✅ shipped (slash commands, markdown lite, copy, retry, drag-resend).
- Tier-6 UI ENRICHMENT: ✅ shipped (Diagnostics, MemoryPanel, BottomStatusBar LIVE, MonsterStatus heartbeat).
- Tier-7 OBSERVABILITY: ✅ shipped (token tracker, cost, latency, success/fail).
- Tier-MAX ROADMAP (9 items): ✅ all shipped — cost guard, session-end reflection, multi-conversation threads (state + UI), memory ontology, self-correction (heuristic + real retry), graph viz, dark theme, MCP bridge (transport-agnostic + HTTP).

## 2. Critical gaps (the reason for this plan)

After exhausting Tier-Max, three *real* gaps remain that turn AgenMonster from
"talks" into "does":

### GAP A: pet does not DO — no goal-oriented loop
The pet talks fluently, but if the user says "deploy this to AWS", nothing
in the pipeline:

- Creates a Task in `state.activeTasks` from the request.
- Tracks sub-steps (e.g. plan → write terraform → run plan → run apply → verify).
- Detects completion in the reply and marks the Task done.
- Surfaces the active goal in the system prompt so the LLM knows what we're doing.
- Visually exposes the goal in the UI so the user sees progress.

`gameState.ts` already has `ActiveTask` and `Mission` interfaces, but they are
populated by static thresholds (e.g. "send 5 messages → mission") — they
are *rewards*, not *intentions*.

### GAP B: cost-guard has UI for caps but no live feedback
Caps are persisted, `decideCall` enforces them, but the user has no
visual progress bar showing "you've used 30% of today's budget". This is the
missing "calmness" — users should be able to see the bar before they trip
over it.

### GAP C: agent loop is not pet-shaped
The system prompt says "you are AgenMonster" but nothing in the runtime makes
the pet *behave* like an agent loop. It only *responds*. There's no
"remember what I'm doing" cycle, no "act → observe → update memory" loop.

## 3. The "Next-Gen" tier (Tier-NG)

Items proposed below target the three gaps, in priority order.

### 3.1 Goal-oriented loop (closes GAP A + C) — **TIER-NG.1, PRIORITY 1**

**Module**: `src/lib/goals.ts` (pure).

```ts
interface Goal {
  id: string;
  title: string;
  subSteps: Array<{ id: string; title: string; done: boolean }>;
  createdAt: number;
  doneAt?: number;
  source: 'chat' | 'task_complete' | 'tool_use';
}

function inferGoalFromText(text: string): Goal | null;
function buildGoal(title: string, steps: string[]): Goal;
function markStepDone(goal: Goal, stepId: string): Goal;
function detectCompletionFromReply(goal: Goal, reply: string): Goal;
```

**Storage**: `state.goals: Goal[]` in `gameState.ts`. Migrate v1 → v2 by
adding the field on the next version bump.

**System-prompt integration**: `getActiveGoals(state) → Goal[]`. Inject
top-1 active goal into the system prompt as `Current goal:` block.

**Auto-detect trigger**: when chat contains imperative intent (`"deploy X"`,
`"fix this"`, `"build Y"`, `"refactor Z"`), call `inferGoalFromText` and
add the goal to state.

**UI**: `GoalsPanel.svelte` in Settings → `11 / GOALS`. Renders active +
recent-completed goals with sub-step progress bars.

**Slash commands**: `/goal <title> [step1 | step2 | ...]`, `/goals`,
`/done <step>`.

**Tests**: 8+ tests covering goal CRUD, intent detection, step completion,
system-prompt injection.

### 3.2 Cost-guard progress bars (closes GAP B) — **TIER-NG.2**

**Module**: `src/lib/costGuard.ts` already has the math; add `progress(caps,
snapshot) → { perCallRatio, dailyTotalRatio, perProviderRatio }`.

**UI**: `Diagnostics.svelte` shows progress bars (green <70%, yellow 70-95%,
red ≥95%) under each KPI. New `progress-bar` style.

**Tests**: 3 tests covering ratio thresholds and color bands.

### 3.3 Active goal visible to pet (UI continuity)

**MonsterStatus** receives `streaming` and an optional `currentGoalTitle`.
While a goal is active, ribbon-header shows `🎯 <title truncated>` under
the stage chip.

### 3.4 MCP tool-call for goals

`mcp.ts` adds:
- `goal.list` — returns active goals.
- `goal.create` — creates goal from external agent.
- `goal.mark_done` — marks step done.
- `goal.complete` — completes entire goal.

## 4. Smaller items ("dangling-completion", "experiment", "polish")

### 4.1 Dangling completion (priority 2)

| Item | Module | Effort |
|---|---|---|
| Cost-guard Diagnostics progress bars (NG.2) | Diagnostics.svelte | 1h |
| Episode detail drill in MemoryPanel | MemoryPanel.svelte | 30m |
| `mcp-server.mjs` stdio runner | new file | 1h |
| LLM-tool-call for memory.tools.* | mcp.ts + tools integration | 2h |
| **Active goal in system prompt** | ChatPanel + goals.ts | 30m (overlaps NG.1) |

### 4.2 Experimental (priority 3)

| Item | Module | Effort |
|---|---|---|
| Graph interactivity (click node → show detail) | MemoryGraph.svelte | 1h |
| Plugin API for custom LLM providers | llmProxyCore.ts + new plugin loader | 3h |
| TaskFirst chat mode (`/mode goal`) | ChatPanel | 1h |
| Workflow DSL (`.agenmonster.toml` in repo root) | new | 4h |

### 4.3 Polish (priority 4)

| Item | Effort |
|---|---|
| Mobile responsive layout | 3h |
| Dark variant for `gb-night` (already done — keep polish) | 0 |
| Memory pressure indicator (KPI >160/200) | 30m |
| Toast variants for cost-guard blocks | 30m |
| `AdvancedSettings` panel | 2h |
| Persona presets (Terse, Helpful, Sarcastic) | 1h |
| Inline code-block file-write (`/write <path>` slash) | 2h |

## 5. Memory architecture impact (target after NG.1)

After NG.1 ships, the system prompt for any LLM call will contain:
- The user's persona override.
- Top-3 recalled memories (with reconsolidation).
- The current active goal (if any).
- Personality drift note (if drift triggered).
- Reconsolidated facts (via `bumpFact`).

That's the full mental model the pet brings to every reply.

## 6. Acceptance criteria for NG.1

1. Tests ≥ 162 (current 154 + 8).
2. `svelte-check` clean.
3. About panel adds `GOALS · AUTOGEN FROM INTENT · STEP TRACKING`.
4. `docs/PROGRESS.md` gets a new section: `## Tier-NG.1 ✅: goal-oriented loop`.
5. The pet can demonstrate end-to-end: user says "deploy this to AWS", pet
   creates a goal with sub-steps, surfaces it in the system prompt, and the
   next reply acknowledges progress.

## 7. Things explicitly OUT of scope (so we don't get baited)

- **Web search / code execution tools** — those are MCP integrations for future
  agent platforms, not pet core.
- **Voice input / output** — outside the desktop scope.
- **Multi-user collaboration** — single-user companion only.
- **Cloud sync / accounts** — explicitly offline-first.
- **Graphify integration** — already rejected (Python runtime, different problem).

## 8. Long-term invariants

These NEVER change:

1. **No `npm install` extra deps.** The system stays zero-dep at runtime.
2. **All keys server-side.** Browser never holds provider keys.
3. **Tests grow monotonically.** Never delete a test when shipping.
4. **About panel = source of truth.** Every visible feature must show.
5. **`svelte-check` always green.** No warnings accepted.
6. **Pure logic + DOM glue.** State modules don't import svelte; UI imports them.

## 9. How to use this plan

When you (or another agent) come back and ask "what next?", read this file
top-down. Pick the highest-priority item in §3 or §4. Ship it fully. Update
§10 with completion status. Move on.

## 9a. Next-Run Plan (post-session compact)

> Read this section first when starting a fresh session. Highest-value items first.

### Priority 1: Playwright e2e scaffolding (prepare, don't block)
- Add `tests/e2e/` directory with smoke tests (`.spec.ts`) scaffolded but NOT run.
- Add `playwright.config.ts` + `package.json` scripts (`test:e2e`, `test:e2e:ui`).
- Write a PDF snapshot test that executes `server.mjs` in headless mode, hits `/`, asserts `AgenMonster` title.
- Document in README: "Run `npx playwright install chromium` once, then `npm run test:e2e`."
- Skip execution in this environment (offline Windows); ship config only.

### Priority 2: Daily Companion Plan (NEW — see `docs/DAILY_COMPANION.md`)
This is the comprehensive roadmap for making AgenMonster a true daily companion, not just a smart tool. See `docs/DAILY_COMPANION.md` for the full execution plan.

The plan adds 4 levels (11 weeks) of functionality:
- **Level 1 (Week 1)**: Companion personality — mood/energy, proactive check-ins, mood-aware system prompt, `/mood` commands
- **Level 2 (Week 2)**: Companion memory — routine detection, importance-weighted decay, semantic search
- **Level 3 (Week 3)**: Companion relationships — interaction scoring, relationship tiers, daily recap auto-generated, morning wake-up
- **Level 4 (Week 4)**: Companion intelligence — suggestions engine, goal persistence, memory index, enhanced export
- **Level 5 (Week 5+)**: Polish — notifications, presence indicator, analytics dashboard, backup automation, mobile companion, offline intelligence

### Priority 3: Bug-hunt pass on recent YOLO code
Quick audit with grep/static analysis:
- `ChatPanel.svelte` — check for `any` casts, uninitialized vars, memory leaks (`chatEl`, `inFlightAbort`).
- `SettingsPanel.svelte` — check `getGameState()` mutation safety; `chatMode` field exists in `GameState`?
- `MemoryPanel.svelte` — click-outside-to-close episode detail; keyboard accessibility.
- `Toast` — auto-dismiss timing, stack overflow if >10 toasts.

Fix >3 bugs found, add regression test per fix.

### Priority 4: Memory pressure + cost-guard edge cases
- Add per-route cost breakdown in Diagnostics (not just total).
- Add "Last 24h" toggle in Diagnostics.
- Add "Reset budget" button alongside "Reset stats".
- Memory pressure: add `facts` count bar (currently only episodes/facts count shown, but facts bar missing).

### Priority 5: Documentation + README refresh
- `README.md` updated ✅ (web-only SvelteKit architecture, 300 tests).
- `docs/PROGRESS.md` updated ✅ (Session 8: 300 tests, all NG features).
- `docs/PLAN.md` updated ✅ (test count, dangling-completion status, daily companion plan).
- `AGENTS.md` updated ✅ (agent compact summary).
- `docs/DAILY_COMPANION.md` NEW ✅ (comprehensive daily companion roadmap — docs/DAILY_COMPANION.md).

### Skip (out-of-scope, deferred indefinitely)
- Plugin API for custom LLM providers
- Workflow DSL `.agenmonster.toml`
- Multi-user / cloud sync

### Daily Companion Roadmap
- Full execution plan: `docs/DAILY_COMPANION.md`
- 5 levels (11 weeks), 80+ new tests, 380 total target
- Start Week 1 Day 1 with `src/lib/moodEnergy.ts` (foundation of all companion features)
