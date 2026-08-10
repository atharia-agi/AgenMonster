# Near-AGI 23-Layer Cognitive Architecture — Full Execution Plan

> Mission (Core Identity): **"Tumbuh jadi companion AGI otonom AgenMonster yang terus belajar & membantu user."**
> Target: naik dari 11-layer autonomous creature → 23-layer near-AGI cognitive architecture.
> Organisasi: 4 lobus (THINKING / MEMORY / ACTION / LEARNING) + SELF core, sesuai riset AGI 2026.

---

## 1. The 4-Lobus Map

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

| Lobus | Fungsi |
|---|---|
| **SELF** | identity/goal compass, emotion-as-priority, attention gating |
| **THINKING** | reasoning, planning, simulation, metacognition, parallel |
| **MEMORY** | episodic, semantic, procedural, world graph, spreading, dream, concept |
| **ACTION** | tools, world exploration, social, self-care, orchestration |
| **LEARNING** | curiosity, causal, experiment, policy habit, alignment, continual |

---

## 2. 23-Layer Table

Legend: ✅ exists · 🔧 build · 🆕 new (from research)

### SELF core
| # | Layer | File | Status |
|---|---|---|---|
| 4 | Emotion/Value (priority alloc) | `emotionEngine.ts` | ✅ |
| 12 | Identity & Goal Hierarchy | `identityModel.ts`, `goalHierarchy.ts` | 🔧 |
| 21 | Attention Economy | `attentionEconomy.ts` | 🔧 |

### THINKING
| # | Layer | File | Status |
|---|---|---|---|
| 1 | Multi-turn reasoning | `agentLoop.ts` | ✅ |
| 10 | Parallel cognition | `autonomousParallelResearch.ts` | ✅ |
| 13 | Executive Planner | `executivePlanner.ts` | 🔧 |
| 14 | Episodic Simulation | `simulation.ts` | 🔧 |
| 15 | Meta-Cognition & Uncertainty | `metaCognition.ts` | 🔧 |

### MEMORY
| # | Layer | File | Status |
|---|---|---|---|
| 2 | Spreading activation | `memoryGraph.ts` | ✅ |
| 3 | Dream cycle / replay | `dreamCycle.ts` | ✅ |
| 5 | Skill curator (procedural) | `skillCurator.ts` | ✅ |
| 19 | Persistent World Model Graph | `worldModelGraph.ts` | 🔧 |
| 23 | Concept Formation Engine | `conceptFormation.ts` | 🆕 |

### ACTION
| # | Layer | File | Status |
|---|---|---|---|
| 7 | World exploration | `autonomousWorld.ts` | ✅ |
| 8 | Self-care | `autonomousSelfCare.ts` | ✅ |
| 17 | Social Cognition / ToM | `socialCognition.ts` | 🔧 |
| 22 | Tool Orchestration (transactional) | `toolOrchestration.ts` | 🔧 |
| — | Pet speech / 106 tools | `petSpeech.ts`, `mcp.ts` | ✅ |

### LEARNING
| # | Layer | File | Status |
|---|---|---|---|
| 9 | Causal self-learning | `causalMemory.ts` | ✅ |
| 11 | Curiosity | `autonomousCuriosity.ts` | ✅ |
| 16 | Experiment Engine | `experimentEngine.ts` | 🔧 |
| 18 | Value Alignment (constraint) | `alignmentLayer.ts` | 🔧 |
| 20 | Policy Habits | `policyHabits.ts` | 🔧 |
| — | Continual (layered+dream) | `memoryLayers.ts`, `layeredContext.ts` | ✅ |

**Competitive edge (jarang dibahas di literatur, kita SUDAH punya):** Dream Cycle (3), Emotion-as-priority (4), Identity (12).

---

## 3. Per-Layer Spec (build/new)

### 12. Identity & Goal Hierarchy — `identityModel.ts` + `goalHierarchy.ts`
- `identityModel.ts`: `CoreMission` const, `SelfModel { mission, traits, strengths[], weaknesses[], constraints[] }`, `loadIdentity()/persistIdentity()`.
- `goalHierarchy.ts`: upgrade `goals.ts` `Goal` → tree with `tier: 'core'|'long'|'mid'|'daily'`, `parentId`, `status`. API: `addGoalTiered()`, `getGoalsByTier()`, `decomposeIntoSteps()`, `scoreAgainstIdentity(goal, self)`.
- Connect: feeds Attention (21), Planner (13), Alignment (18). All decisions scored vs identity.
- Tests: identity load/persist, tier tree, scoreAgainstIdentity.

### 19. Persistent World Model Graph — `worldModelGraph.ts`
- Entity nodes: `people | projects | companies | places | concepts`. Relations: `works_on | owns | depends_on | causes | blocked_by | scheduled_for`.
- Pure graph ops: `addEntity`, `link`, `getNeighbors`, `shortestPath`, `mergeDuplicate`.
- Dream cycle (3) konsolidasi graph ini (compress, dedup).
- Connect: Simulation (14), Causal (9), Concept (23).
- Tests: add/link/query/merge.

### 23. Concept Formation Engine — `conceptFormation.ts` 🆕 (differentiator)
- Cluster episodes/facts by embedding similarity + shared tags → naikkan abstraksi.
- `formConcept(cluster)` → parent concept; `detectMerger(a,b)` → false jika tak related.
- Simpan hierarchy ke world graph (19) sebagai node `concept`.
- Enable transfer learning / analogi / kreativitas.
- Tests: cluster→concept, false-merge reject, hierarchy build.

### 15. Meta-Cognition & Uncertainty — `metaCognition.ts`
- `assessBelief(statement, evidence)` → `{belief, confidence, missing[], assumptions[], next_action}`.
- `next_action` ∈ `search | experiment | verify | act`.
- Connect: Planner (13), Experiment (16), Attention (21).
- Tests: low-confidence→search, missing-extraction.

### 14. Episodic Simulation — `simulation.ts`
- `simulate(action, worldModel)` → counterfactual rollout (light MCTS).
- `consequenceOf(order)`, `likelyFailureMode(action)`.
- Connect: World Graph (19), Causal (9).
- Tests: deterministic rollout, failure-mode detection.

### 21. Attention Economy — `attentionEconomy.ts`
- `priority = GoalImpact × Urgency × Confidence − Cost`.
- `shouldIgnore / shouldDefer / shouldFocus`.
- Connect: Identity (12), Meta (15), Curiosity (11). Cegah rabbit hole.
- Tests: formula, ignore-low-priority.

### 13. Executive Planner — `executivePlanner.ts`
- `decompose(goal)` → task tree; `buildDependencyGraph`; `replanOnFailure`.
- Contoh: project → sub-task, reorder otomatis kalau delay.
- Connect: Goals (12), World (19), Attention (21), Alignment (18).
- Tests: decompose, dependency, replan.

### 18. Value Alignment — `alignmentLayer.ts`
- Hard: never leak secret / violate law / harm. Soft: truthful, reversible-first, ask-if-irreversible.
- `checkAllowed(action)` membungkus Planner (13), Curiosity (11), Experiment (16).
- Tests: hard-block, soft-warn, irreversible-ask.

### 16. Experiment Engine — `experimentEngine.ts`
- Loop: Hypothesis → Design → Run → Measure → Update causal graph → Store skill/policy.
- A/B test otomatis (mis. prompt X vs Y).
- Connect: Meta (15), Causal (9), Skill (5), Policy (20).
- Tests: hypothesis→result→causal update.

### 17. Social Cognition / ToM — `socialCognition.ts`
- Model stakeholder: `{goals, knowledgeLevel, trust, emotionalState}` per role (investor/developer/end-user).
- `tailorFor(role, plan)`.
- Connect: Identity (12), Meta (15).
- Tests: role model, tailored plan.

### 20. Policy Habits — `policyHabits.ts`
- `IF task==X THEN policy_Y, confidence+=0.03`. Habit formation.
- Connect: Experiment (16), Causal (9), Skill (5).
- Tests: habit form, confidence growth.

### 22. Tool Orchestration (transactional) — `toolOrchestration.ts`
- `plan → dry-run → execute → verify → rollback`.
- Wrap 106 tools via `executeToolAsync`.
- Connect: Alignment (18), Planner (13).
- Tests: dry-run, verify-pass, rollback-on-fail.

---

## 4. Implementation Waves

**Wave A — SELF + MEMORY foundation**
1. `identityModel.ts` + `goalHierarchy.ts` (12)
2. `worldModelGraph.ts` (19)
3. `conceptFormation.ts` (23)
→ Verify: build green, tests pass.

**Wave B — THINKING upgrade**
4. `metaCognition.ts` (15)
5. `simulation.ts` (14)
6. `attentionEconomy.ts` (21)
→ Verify.

**Wave C — ACTION + LEARNING agency**
7. `executivePlanner.ts` (13)
8. `alignmentLayer.ts` (18)
9. `experimentEngine.ts` (16)
10. `socialCognition.ts` (17)
11. `policyHabits.ts` (20)
12. `toolOrchestration.ts` (22)
→ Verify.

**Wave D — Integration**
13. Wire semua ke `deepRecursiveAgent.ts` + `autonomousAgent.ts` (loop utama).
14. UI: status bar tampil Identity / Current Goal / Planner state / Concept count.
15. Docs: AGENTS.md + CHANGELOG → "v1.3.0 — Near-AGI 23-Layer".

---

## 5. Testing & Verification (per wave)
- Tiap modul = pure TS + `tests/*.test.ts` (node --test, deterministic seed, 10–14 tests/modul).
- Setelah tiap wave: `svelte-check` 0 error · `npm run build` green · `node --test tests/*.test.ts tests/chaos/*.test.ts` = 915+ baru.
- Integration: jalankan `DEEP 1H` di UI, pastikan loop jalan tanpa crash.

## 6. Continual Loop (target akhir)
```
SELF(Identity) → THINKING(Planner+Sim+Meta) → ACTION(Tools+World)
   ↑                                              │
   │                                         LEARNING(Exp+Causal+Habit)
   │                                              │
   └── MEMORY(WorldGraph+Concept+Dream) ←─────────┘
        (replay → abstract → better SELF/plan)
```

## 7. Risks & Mitigation
- Bundle size: modul pure-logic, no render → aman.
- Breaking: tiap layer impact-terisolasi; planner/curiosity lewat alignment.
- Test flake: deterministic seed di simulation/experiment.

---
*Plan dibuat pas mode build aktif. Eksekusi mengikuti Wave A→B→C→D, tiap wave hijau sebelum lanjut.*
