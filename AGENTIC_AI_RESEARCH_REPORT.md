# AgenMonster Deep Recursive Research Report
## Cutting-Edge Agentic AI Enhancement Opportunities (2025-2026)

**Date:** 2026-08-09
**Scope:** 23-Layer Cognitive Architecture Gap Analysis & State-of-the-Art Integration Roadmap

---

## Executive Summary

AgenMonster's 23-layer cognitive architecture (4 Lobus: SELF/THINKING/MEMORY/ACTION/LEARNING) is already substantially more advanced than most production agent systems. It implements identity modeling, goal hierarchies, attention economics, meta-cognition, simulation, executive planning, world model graphs, concept formation, alignment layers, experiment engines, social cognition, tool orchestration, policy habits, emotion engines, layered memory, causal memory, dream cycles, skill curation, and spreading activation.

However, the cutting edge of agentic AI research (2025-2026) has advanced in several dimensions that AgenMonster does not yet fully address:

1. **Turn-level credit assignment & recursive self-distillation** (AgentOPSD, 2026) - Bayesian belief-state credit propagation for long-horizon agents
2. **World rehearsal / internalized environment models** (EnvACE, 2026) - agents that learn to simulate environment responses internally
3. **Test-time compute scaling & deliberate reasoning** (o1/o3, extended thinking, 2025-2026) - adaptive compute allocation based on task difficulty
4. **Structured thought representations** (Table as Thought, Video-of-Thought, 2025) - tabular/multimodal reasoning scaffolds
5. **Continual learning beyond parameters** (Continual Learning in Transition, 2026) - skill libraries, interaction protocols, test-time training
6. **Agent refinement tuning & self-correction** (AgentRefine, TREK, 2025-2026) - learning from observation of mistakes
7. **Multi-agent role diversity & cooperation** (CORD, 2025) - generalizable cooperation via dynamic role assignment
8. **First-order logic reward machines** (FORM, 2025) - expressive, transferable task specifications
9. **Curiosity-driven auditing & intrinsic motivation** (CALM, 2025) - self-directed exploration for alignment
10. **Activity frames & deterministic agent memory** (Activity Frames, 2026) - screen-activity compilation for replay
11. **Segment-level preference optimization** (SDPO, 2025) - multi-turn social agent alignment
12. **Hierarchical goal-conditioned policy planning** (HGCPP, 2025) - MCTS + goal hierarchies
13. **LLM predictive control** (LLMPC, 2025) - unified planning framework
14. **Uncertainty quantification** (Aleatoric to Epistemic, 2025) - epistemic vs aleatoric uncertainty in agents
15. **Neurosymbolic integration & world models** (Economic World Models, 2026) - generative environment simulation

---

## Gap Analysis: AgenMonster vs. State-of-the-Art

### What AgenMonster Already Has (Strong Position)

| Capability | Existing Module | Status |
|---|---|---|
| Identity/self-model | `identityModel.ts` | ✅ Implemented |
| Tiered goal hierarchy | `goalHierarchy.ts` | ✅ Implemented |
| Attention/priority gating | `attentionEconomy.ts` | ✅ Implemented |
| Meta-cognition | `metaCognition.ts` | ✅ Implemented |
| Counterfactual simulation | `simulation.ts` | ✅ Implemented |
| Executive planning/decomposition | `executivePlanner.ts` | ✅ Implemented |
| World model graph | `worldModelGraph.ts` | ✅ Implemented |
| Concept formation/abstraction | `conceptFormation.ts` | ✅ Implemented |
| Alignment/constraints | `alignmentLayer.ts` | ✅ Implemented |
| Experiment/hypothesis engine | `experimentEngine.ts` | ✅ Implemented |
| Theory of Mind | `socialCognition.ts` | ✅ Implemented |
| Tool orchestration | `toolOrchestration.ts` | ✅ Implemented |
| Policy/habit formation | `policyHabits.ts` | ✅ Implemented |
| Continuous emotion loop | `emotionEngine.ts` | ✅ Implemented |
| Layered memory (5 tiers) | `memoryLayers.ts` | ✅ Implemented |
| Causal memory chains | `causalMemory.ts` | ✅ Implemented |
| Dream cycle/consolidation | `dreamCycle.ts` | ✅ Implemented |
| Skill curation | `skillCurator.ts` | ✅ Implemented |
| Spreading activation | `memoryGraph.ts` | ✅ Implemented |
| Autonomous 3h loop | `autonomousAgent.ts` | ✅ Implemented |
| Deep recursive 1h loop | `deepRecursiveAgent.ts` | ✅ Implemented |
| Autonomous world exploration | `autonomousWorld.ts` | ✅ Implemented |
| Autonomous self-care | `autonomousSelfCare.ts` | ✅ Implemented |
| Cross-device CRDT sync | `crossDeviceSync.ts` | ✅ Implemented |
| Self-correction/retry | `selfCorrect.ts` | ✅ Implemented |
| Pet form/visual identity | `petForm.ts` | ✅ Implemented |
| Daily companion routines | `dailyMission.ts` | ✅ Implemented |

### What AgenMonster Is Missing (Critical Gaps)

| Capability | Gap Description |
|---|---|
| **Turn-level credit assignment** | No Bayesian belief-state credit propagation for multi-turn trajectories |
| **World rehearsal** | No internalized environment model for pre-execution simulation |
| **Adaptive test-time compute** | Fixed reasoning depth; no dynamic compute allocation based on task difficulty |
| **Structured thought representations** | Linear chain-of-text only; no tabular/multimodal reasoning scaffolds |
| **Refinement tuning from mistakes** | Self-correction exists but doesn't systematically learn from observed errors |
| **First-order logic reward specification** | No expressive, transferable reward/task specification framework |
| **Curiosity-driven intrinsic motivation** | Curiosity engine exists but isn't formally tied to RL-style reward signals |
| **Hierarchical MCTS planning** | Executive planner exists but lacks Monte Carlo Tree Search exploration |
| **Epistemic uncertainty tracking** | No explicit aleatoric vs epistemic uncertainty quantification |
| **Multi-agent role diversity** | Single-agent architecture; no dynamic role assignment for multi-agent cooperation |
| **Segment-level preference optimization** | No segment-level DPO for multi-turn social interactions |
| **LLM predictive control loop** | No unified MPC-style planning with cost function minimization |
| **Deterministic activity frames** | No compiled, replayable agent memory from screen activity |
| **Continual learning beyond parameters** | Memory exists but no formal on-policy/test-time training pipeline |
| **Neurosymbolic task specification** | No integration of symbolic logic with neural reasoning |

---

## Top 15 Enhancement Opportunities (Ranked by Impact × Feasibility)

### 1. Recursive Turn-Level Credit Assignment (AgentOPSD Pattern)
**Priority:** CRITICAL | **Complexity:** HIGH | **Impact:** VERY HIGH

**What it does:**
Implements Bayesian belief-state credit propagation across multi-turn agent trajectories. Instead of broadcasting a single trajectory-level advantage uniformly across all turns (like GRPO), it aggregates token-level teacher-student log-probability gaps into turn-level evidence, recursively updates a belief state in log-odds space, and assigns credit according to marginal belief revision. This identifies pivotal turns that meaningfully influence outcomes.

**How it integrates with AgenMonster:**
- Wires into `agentLoop.ts` (`runAgentChatLoop`) to replace uniform credit with turn-level belief revision
- Uses `skillCurator.ts` as the "privileged self-teacher" (the `c+` skill retrieval)
- Feeds into `selfCorrect.ts` for more precise retry decisions
- Integrates with `causalMemory.ts` to record which turns were pivotal for which outcomes
- Works with the existing `needsStrongerModel` routing in `brainContext.ts`

**Implementation notes:**
- Add `beliefState: {B0, ck, logitB0, gamma}` to agent turn state
- Compute `delta_k,t = log pi(y_k,t | h_k,t+) - log pi(y_k,t | h_k,t)` per token
- Aggregate to `e_k = sum(delta_k,t)` per turn
- Update `c_k = gamma * c_k-1 + e_k`, `B_k = sigma(logit(B0) + c_k)`
- Compute `Delta B_k = B_k - B_k-1` as turn credit
- Reshape advantage: `A_k = A_seq * [(1-lambda) + lambda * clip(1 + b * z_k, 1-b, 1+b)]`

**Reference:** AgentOPSD (arXiv:2608.05987, 2026)

---

### 2. World Rehearsal / Internalized Environment Model (EnvACE Pattern)
**Priority:** HIGH | **Complexity:** HIGH | **Impact:** VERY HIGH

**What it does:**
The agent learns to simulate environment responses internally during training. Instead of always interacting with real environments, the policy alternates between acting and rehearsal: it generates a tool call, then plays the role of the environment to produce the response induced by that action, and conditions subsequent decisions on the rehearsed response. Both roles are jointly optimized end-to-end using task-success rewards. This yields an internal "world model" that directly supports decision-making.

**How it integrates with AgenMonster:**
- Extends `simulation.ts` with generative environment modeling
- Uses `toolOrchestration.ts` dry-run mode as the rehearsal mechanism
- Feeds into `executivePlanner.ts` for plan verification before execution
- Works with `worldModelGraph.ts` to ground rehearsed responses in known entities/relations
- Enables private rehearsal at test-time before committed execution

**Implementation notes:**
- Add `rehearsalMode: 'skip' | 'light' | 'full'` to tool orchestration config
- Light rehearsal: predict likely tool response from past `causalMemory.ts` outcomes
- Full rehearsal: generate synthetic environment response via LLM
- Joint optimization: train both action policy and rehearsal policy on task-success rewards
- At test time, enable `rehearseBeforeCommit: true` for high-stakes tool calls

**Reference:** EnvACE (arXiv:2608.06197, 2026)

---

### 3. Adaptive Test-Time Compute Scaling
**Priority:** HIGH | **Complexity:** MEDIUM | **Impact:** HIGH

**What it does:**
Dynamically allocates reasoning compute based on task difficulty. Easy tasks get fast, shallow reasoning; hard tasks trigger deeper deliberation with more turns, more tools, and stronger models. This is the core insight behind OpenAI's o1/o3 and Anthropic's extended thinking, but generalized to agentic tool-use contexts.

**How it integrates with AgenMonster:**
- Wires into `attentionEconomy.ts` `decideAttention()` as a "reasoning depth" signal
- Uses `brainContext.ts` `needsStrongerModel()` to escalate both model AND compute budget
- Integrates with `agentLoop.ts` to adjust `maxTurns` dynamically per task
- Feeds into `costGuard.ts` (diagnostics) to track compute vs. outcome correlation
- Uses `selfCorrect.ts` confidence scores to decide if more turns are warranted

**Implementation notes:**
- Add `computeBudget: {turns, depth, tools}` to task context
- Easy heuristic: short query + low emotion arousal + high confidence = minimal compute
- Hard heuristic: multi-step plan + high stakes + low confidence = max compute
- Track `computeEfficiency: outcomeQuality / computeSpent` in `causalMemory.ts`
- Support explicit user commands: `/deep`, `/quick`, `/think`

**Reference:** Test-Time Compute survey (arXiv:2501.02497, 2025); OpenAI o1/o3; Anthropic extended thinking

---

### 4. Structured Thought Representations (Table as Thought)
**Priority:** MEDIUM | **Complexity:** MEDIUM | **Impact:** HIGH

**What it does:**
Organizes reasoning within structured schemas (tables, graphs, grids) rather than unstructured linear text. Rows represent sequential thought steps; columns capture critical constraints, evidence, confidence, and alternatives. The reasoning process iteratively populates the structure until self-verification ensures completeness. This is inspired by cognitive neuroscience theories of human thought organization.

**How it integrates with AgenMonster:**
- Extends `metaCognition.ts` `assessBelief()` output to include structured fields
- Adds new module `structuredThought.ts` with Table/Graph/Grid thought schemas
- Integrates with `simulation.ts` for counterfactual branching in structured format
- Feeds into `executivePlanner.ts` for topological ordering with constraint tracking
- Enables `worldModelGraph.ts` to use graph-structured thoughts for entity relations

**Implementation notes:**
- Define `ThoughtTable` schema: `{rows: ThoughtStep[], columns: ThoughtColumn[], verification: boolean}`
- `ThoughtStep`: `{id, text, evidence, confidence, alternatives, dependencyIds}`
- `ThoughtColumn`: `{name, type: 'text'|'confidence'|'evidence'|'alternative', width}`
- Self-verification: each row must have all required columns populated before proceeding
- Serialize to/from JSON for LLM prompts: "Reason using this table structure..."

**Reference:** Table as Thought (arXiv:2501.02152, 2025)

---

### 5. Agent Refinement Tuning (AgentRefine Pattern)
**Priority:** HIGH | **Complexity:** MEDIUM | **Impact:** HIGH

**What it does:**
Enables the model to learn to correct its mistakes via observation of trajectory outcomes. Instead of just retrying on failure, the agent analyzes what went wrong in the failed trajectory, generates a refined version, and learns the pattern. This creates a "refinement corpus" that improves generalization beyond memorization.

**How it integrates with AgenMonster:**
- Extends `selfCorrect.ts` from heuristic-based to LLM-based refinement
- Uses `causalMemory.ts` to retrieve past failures similar to current situation
- Feeds refined trajectories into `skillCurator.ts` as new skill candidates
- Integrates with `dreamCycle.ts` to refine failures during idle consolidation
- Works with `agentLoop.ts` to generate `(failedTrajectory, refinedTrajectory)` pairs

**Implementation notes:**
- Add `refineFailedTrajectory(failed, outcome, context)` to `selfCorrect.ts`
- Prompt: "Given this failed trajectory and its outcome, produce a corrected version"
- Store `(original, refined, outcome)` triplets in `causalMemory.ts`
- Periodically distill refinements into `agentSkills` via `skillCurator.ts`
- Track `refinementSuccessRate` per skill/pattern

**Reference:** AgentRefine (arXiv:2501.01702, ICLR 2025)

---

### 6. TREK-Style Exploration via Distillation + GRPO Refinement
**Priority:** HIGH | **Complexity:** MEDIUM | **Impact:** HIGH

**What it does:**
Two-stage training: (1) Distill verified expert trajectories to expand the student's exploration support, pulling hard-prompt solution modes into the student's distribution; (2) Refine with standard on-policy GRPO. This prevents GRPO from stalling on hard prompts whose correct solutions lie outside the student's current on-policy support.

**How it integrates with AgenMonster:**
- Extends `skillCurator.ts` to identify "hard prompts" (low success rate queries)
- Uses external teacher (stronger model via `selectModel('analyze')`) for distillation phase
- Feeds distilled trajectories into `agentLoop.ts` as few-shot examples
- Integrates with `brainContext.ts` for model routing between teacher and student
- Works with `memoryLayers.ts` to persist distilled skills across sessions

**Implementation notes:**
- Add `distillPhase(prompt, teacherModel)` to agent loop
- Compute student likelihood of teacher trajectory; keep top-r proposals
- Apply short forward-KL phase: `minimize KL(student || teacher) on verified modes`
- Return to standard GRPO refinement with expanded support
- Track `distillationGain` per task type

**Reference:** TREK (arXiv:2607.05339, 2026)

---

### 7. Epistemic Uncertainty Tracking
**Priority:** MEDIUM | **Complexity:** MEDIUM | **Impact:** HIGH

**What it does:**
Explicitly distinguishes aleatoric uncertainty (inherent randomness/noise) from epistemic uncertainty (lack of knowledge). For agents, this means knowing when uncertainty comes from an inherently stochastic environment vs. from the agent's own ignorance. Epistemic uncertainty should trigger exploration; aleatoric uncertainty should trigger caution or hedging.

**How it integrates with AgenMonster:**
- Extends `metaCognition.ts` `assessBelief()` to return `{confidence, aleatoricUncertainty, epistemicUncertainty}`
- Uses `simulation.ts` counterfactuals to estimate aleatoric uncertainty
- Feeds into `attentionEconomy.ts` to prioritize exploration of high-epistemic-uncertainty areas
- Integrates with `alignmentLayer.ts` to block actions under high aleatoric uncertainty
- Works with `emotionEngine.ts` to map uncertainty to emotional states (anxiety = high epistemic)

**Implementation notes:**
- Add `UncertaintyDecomposition` type: `{aleatoric: number, epistemic: number, total: number}`
- Estimate aleatoric: variance of outcomes in `causalMemory.ts` for same trigger/goal
- Estimate epistemic: 1 - confidence in `metaCognition.ts` belief state
- Epistemic > threshold → trigger `autonomousCuriosity.ts` exploration
- Aleatoric > threshold → trigger `alignmentLayer.ts` conservative behavior

**Reference:** Uncertainty Quantification survey (arXiv:2501.03282, 2025)

---

### 8. Curiosity-Driven Intrinsic Motivation (CALM Pattern)
**Priority:** MEDIUM | **Complexity:** MEDIUM | **Impact:** HIGH

**What it does:**
Uses intrinsically motivated RL to fine-tune an LLM as an auditor/explorer agent that uncovers potential harmful, biased, or surprising input-output pairs. The curiosity signal drives the agent to explore edge cases, boundary conditions, and novel situations that the base policy would not naturally encounter.

**How it integrates with AgenMonster:**
- Extends `autonomousCuriosity.ts` with formal curiosity-driven RL objective
- Uses `alignmentLayer.ts` as the "audit target" - the agent probes for alignment failures
- Integrates with `emotionEngine.ts` - curiosity peaks when `boredom` is high
- Feeds discovered edge cases into `skillCurator.ts` as robustness improvements
- Works with `causalMemory.ts` to track which curiosities led to useful discoveries

**Implementation notes:**
- Add `curiosityReward(state, action) = infoGain(state, action) - cost(action)`
- Info gain: KL divergence between world model predictions and actual outcomes
- Train curiosity agent on `(state, curiosityAction, outcome)` pairs
- Use `alignmentLayer.ts` constraints as guardrails on curiosity actions
- Store "curiosity episodes" in `memoryLayers.ts` working memory

**Reference:** CALM (arXiv:2501.02997, AAAI 2025)

---

### 9. Monte Carlo Tree Search Planning
**Priority:** MEDIUM | **Complexity:** HIGH | **Impact:** HIGH

**What it does:**
Uses MCTS to explore alternative action sequences before committing. The agent builds a search tree over possible tool-use sequences, evaluates each branch with a value function, and selects actions based on the search. This is particularly valuable for long-horizon tasks where local greedy choices lead to dead ends.

**How it integrates with AgenMonster:**
- Extends `executivePlanner.ts` to add MCTS as an alternative to topological sorting
- Uses `worldModelGraph.ts` as the branching factor source (possible next actions)
- Integrates with `simulation.ts` for rollout evaluation of branches
- Works with `alignmentLayer.ts` to prune forbidden branches early
- Feeds MCTS trajectories into `causalMemory.ts` for outcome tracking

**Implementation notes:**
- Add `mctsPlan(goal, depth, simulations)` to `executivePlanner.ts`
- Tree nodes: `{state, actions, visits, value, untriedActions}`
- Selection: UCT = value/visits + c * sqrt(log(parentVisits)/visits)
- Expansion: pick untried action from `worldModelGraph.ts` neighbors
- Rollout: use `simulation.ts` to estimate outcome value
- Backprop: update visit counts and values up the tree
- Budget: limit simulations by `attentionEconomy.ts` compute budget

**Reference:** Process Supervision with MCTS (arXiv:2501.01478, AAAI 2025); HGCPP (arXiv:2501.01727, 2025)

---

### 10. Multi-Agent Role Diversity (CORD Pattern)
**Priority:** MEDIUM | **Complexity:** HIGH | **IMPACT:** HIGH

**What it does:**
Enables generalizable cooperation between multiple agents via dynamic role assignment. A high-level controller assigns roles to low-level agents by maximizing role entropy with constraints. This creates coherent, non-redundant role clusters that generalize to unseen collaborators. For AgenMonster, this means internal sub-agent specialization.

**How it integrates with AgenMonster:**
- Extends `deepRecursiveAgent.ts` to spawn role-specialized sub-agents
- Uses `socialCognition.ts` `modelStakeholder()` as role assignment input
- Integrates with `attentionEconomy.ts` for role-based priority scoring
- Works with `toolOrchestration.ts` to distribute tool calls across role-specialized agents
- Feeds into `causalMemory.ts` to track role effectiveness

**Implementation notes:**
- Define internal roles: `researcher`, `planner`, `executor`, `verifier`, `critic`, `curator`
- Add `assignRoles(task, availableAgents)` to `deepRecursiveAgent.ts`
- Role entropy objective: maximize diversity of role assignments while maintaining coherence
- Causal influence: measure how much each role affects the final outcome
- Enable sub-agent spawning via existing MCP tool bridge

**Reference:** CORD (arXiv:2501.02221, 2025)

---

### 11. First-Order Logic Reward Machines (FORM Pattern)
**Priority:** MEDIUM | **Complexity:** HIGH | **Impact:** MEDIUM

**What it does:**
Replaces propositional logic reward specifications with first-order logic, enabling more compact and transferable task specifications. Multiple agents can collaboratively learn policies for a shared FORM, with the first-order abstraction enabling significant improvements in learning speed and task transferability.

**How it integrates with AgenMonster:**
- Extends `alignmentLayer.ts` with FORM-based constraint specification
- Uses `goalHierarchy.ts` to map goals to first-order logic predicates
- Integrates with `worldModelGraph.ts` for grounding logical predicates in world state
- Works with `toolOrchestration.ts` to verify tool sequences against logical specifications
- Feeds into `policyHabits.ts` for transferable policy learning

**Implementation notes:**
- Add `RewardMachine` type: `{states: string[], transitions: {from, to, condition, reward}[]}`
- Condition: first-order logic formula over world model graph predicates
- Example: `forall(x, has(x, 'key') -> can('open', x))`
- Learning: infer FORM from demonstration trajectories
- Transfer: reuse FORM across related tasks with different instantiations

**Reference:** FORM (arXiv:2501.00364, AAMAS 2025)

---

### 12. Segment-Level Preference Optimization (SDPO Pattern)
**Priority:** MEDIUM | **Complexity:** MEDIUM | **Impact:** MEDIUM

**What it does:**
Dynamically selects key segments within multi-turn interactions to optimize agent behavior. Unlike standard DPO (single-turn) or session-level DPO (too coarse), SDPO identifies the most informative interaction segments and applies preference optimization at that granularity. This is crucial for social agents where multi-turn context matters.

**How it integrates with AgenMonster:**
- Extends `socialCognition.ts` with segment-level preference learning
- Uses `emotionEngine.ts` to identify emotionally significant segments
- Integrates with `causalMemory.ts` to find segments that caused outcome changes
- Works with `skillCurator.ts` to refine skills based on preference segments
- Feeds into `alignmentLayer.ts` for multi-turn value alignment

**Implementation notes:**
- Add `segment(turns, keyMoment)` to conversation state
- Key moment detection: emotion shift, tool call, goal change, user feedback
- Preference pairs: `(segmentA, segmentB)` where A is preferred over B
- SDPO loss: `-log(sigma(beta * (score(segmentA) - score(segmentB))))`
- Track `preferenceAccuracy` per segment type

**Reference:** SDPO (arXiv:2501.01821, 2025)

---

### 13. Hierarchical Goal-Conditioned Policy Planning (HGCPP Pattern)
**Priority:** MEDIUM | **Complexity:** HIGH | **Impact:** MEDIUM

**What it does:**
Combines short goal-conditioned policies organized hierarchically with MCTS planning using high-level actions. A single plan-tree maintained during the agent's lifetime holds knowledge about goal achievement. This hierarchy enhances sample efficiency and speeds up reasoning by reusing high-level actions and anticipating future needs.

**How it integrates with AgenMonster:**
- Extends `executivePlanner.ts` to maintain persistent plan trees
- Uses `goalHierarchy.ts` tiered goals as the hierarchy levels
- Integrates with `simulation.ts` for rollout-based plan evaluation
- Works with `causalMemory.ts` to cache plan-tree outcomes
- Feeds into `attentionEconomy.ts` for plan-aware priority scoring

**Implementation notes:**
- Add `PlanTree` type: `{root: PlanNode, nodes: Map<id, PlanNode>}`
- `PlanNode`: `{goal, actions, outcome, children, visits, value}`
- High-level actions: sub-goals from `goalHierarchy.ts`
- Low-level policies: tool sequences from `toolOrchestration.ts`
- Maintain tree across sessions in `memoryLayers.ts` semantic layer
- Reuse successful subtrees across related goals

**Reference:** HGCPP (arXiv:2501.01727, ICAART 2025)

---

### 14. Activity Frames for Deterministic Agent Memory
**Priority:** LOW | **Complexity:** MEDIUM | **Impact:** MEDIUM

**What it does:**
Compiles passively captured screen/agent activity into deterministic, byte-identical, cacheable memory frames. Each frame is a typed episode carrying application, site, timing, input volume, and evidence pointers back to raw data. This enables replay, audit, and efficient context compression (86x reduction demonstrated).

**How it integrates with AgenMonster:**
- Adds new module `activityFrames.ts` for compiling agent interaction history
- Integrates with `memoryLayers.ts` as a new "episodic frame" layer
- Works with `chatEngine.ts` to replay relevant frames as context
- Feeds into `dreamCycle.ts` for frame consolidation during idle
- Enables deterministic replay for debugging/auditing

**Implementation notes:**
- Define `ActivityFrame`: `{id, timestamp, type, app, site, inputs, evidencePointer}`
- Types: `chat_message`, `tool_call`, `tool_result`, `plan_update`, `emotion_shift`
- Compile rule: one frame per significant agent action (not every token)
- Compression: merge consecutive frames of same type into summary frames
- Replay: reconstruct conversation from frame sequence

**Reference:** Activity Frames (arXiv:2608.05784, 2026)

---

### 15. LLM Predictive Control (LLMPC) Loop
**Priority:** LOW | **Complexity:** HIGH | **Impact:** MEDIUM

**What it does:**
Frames LLM planning as model predictive control: the LLM acts as an implicit planning cost function minimizer when given planning prompts. A unified MPC framework enables improved performance over few-shot prompting by explicitly optimizing a cost function over a planning horizon, with receding horizon control.

**How it integrates with AgenMonster:**
- Extends `executivePlanner.ts` with explicit cost function optimization
- Uses `alignmentLayer.ts` constraints as hard cost terms
- Integrates with `simulation.ts` for rollout cost evaluation
- Works with `attentionEconomy.ts` for multi-horizon cost balancing
- Feeds into `brainContext.ts` for system-prompt cost specification

**Implementation notes:**
- Define `CostFunction`: `{hard: Constraint[], soft: Preference[], weights: number[]}`
- Planning horizon: N steps ahead (configurable by `attentionEconomy.ts`)
- Receding horizon: execute first step, re-plan at each turn
- Cost minimization: prompt LLM with explicit cost terms and horizon
- Track `costImprovement` over planning steps

**Reference:** LLMPC (arXiv:2501.02486, 2025)

---

## Implementation Roadmap

### Phase 1: Foundation (Months 1-3) - Critical + High Priority

| Sprint | Enhancement | Key Modules Modified | Deliverable |
|---|---|---|---|
| 1 | Recursive Turn-Level Credit Assignment | `agentLoop.ts`, `skillCurator.ts`, `causalMemory.ts` | Turn-level belief state tracking, Delta-B credit reshaping |
| 2 | Adaptive Test-Time Compute | `attentionEconomy.ts`, `brainContext.ts`, `agentLoop.ts` | Dynamic maxTurns, compute budget allocation |
| 3 | Agent Refinement Tuning | `selfCorrect.ts`, `causalMemory.ts`, `dreamCycle.ts` | Refinement corpus generation, skill distillation |
| 4 | World Rehearsal | `simulation.ts`, `toolOrchestration.ts`, `executivePlanner.ts` | Rehearsal mode in tool orchestration, dry-run prediction |

### Phase 2: Enhancement (Months 4-6) - High + Medium Priority

| Sprint | Enhancement | Key Modules Modified | Deliverable |
|---|---|---|---|
| 5 | TREK-Style Distillation + GRPO | `skillCurator.ts`, `agentLoop.ts`, `brainContext.ts` | Two-stage training pipeline, teacher-student routing |
| 6 | Epistemic Uncertainty Tracking | `metaCognition.ts`, `simulation.ts`, `emotionEngine.ts` | Uncertainty decomposition, curiosity trigger |
| 7 | Curiosity-Driven Intrinsic Motivation | `autonomousCuriosity.ts`, `alignmentLayer.ts`, `causalMemory.ts` | Curiosity reward, edge-case discovery |
| 8 | Structured Thought Representations | `metaCognition.ts`, `simulation.ts`, `worldModelGraph.ts` | ThoughtTable schema, self-verification |

### Phase 3: Advanced (Months 7-12) - Medium + Low Priority

| Sprint | Enhancement | Key Modules Modified | Deliverable |
|---|---|---|---|
| 9 | MCTS Planning | `executivePlanner.ts`, `worldModelGraph.ts`, `simulation.ts` | MCTS tree search, UCT selection |
| 10 | Multi-Agent Role Diversity | `deepRecursiveAgent.ts`, `socialCognition.ts`, `toolOrchestration.ts` | Role-specialized sub-agents, role entropy |
| 11 | FORM Reward Machines | `alignmentLayer.ts`, `goalHierarchy.ts`, `worldModelGraph.ts` | First-order logic reward specification |
| 12 | SDPO Social Alignment | `socialCognition.ts`, `emotionEngine.ts`, `causalMemory.ts` | Segment-level preference pairs |
| 13 | HGCPP Plan Trees | `executivePlanner.ts`, `goalHierarchy.ts`, `causalMemory.ts` | Persistent plan trees, subtree reuse |
| 14 | Activity Frames | `activityFrames.ts` (new), `memoryLayers.ts`, `dreamCycle.ts` | Frame compilation, replay, compression |
| 15 | LLMPC Loop | `executivePlanner.ts`, `alignmentLayer.ts`, `attentionEconomy.ts` | Cost function optimization, receding horizon |

---

## Key Research References

1. **AgentOPSD** (Tsinghua/Meituan, 2026) - Recursive Self-Distillation for Agentic RL
   - arXiv:2608.05987 - Turn-level credit assignment via Bayesian belief revision

2. **EnvACE** (Tencent, 2026) - World Rehearsal for Agentic RL
   - arXiv:2608.06197 - Internalized environment dynamics via world rehearsal

3. **AgentRefine** (ICLR 2025) - Agent Generalization via Refinement Tuning
   - arXiv:2501.01702 - Learning to correct mistakes via environment feedback

4. **TREK** (2026) - Distill to Explore, Reinforce to Refine
   - arXiv:2607.05339 - Teacher-routed exploration via forward KL

5. **Test-Time Compute Survey** (2025) - From Intuitive Inference to Deliberate Reasoning
   - arXiv:2501.02497 - Comprehensive survey of System-1 to System-2 thinking transitions

6. **Continual Learning in Transition** (CASIA, 2026) - Beyond Parameter-Centric Learning
   - arXiv:2608.06216 - External harness components (memory, skills, protocols) for CL

7. **Table as Thought** (2025) - Structured Thoughts in LLM Reasoning
   - arXiv:2501.02152 - Tabular reasoning scaffolds inspired by cognitive neuroscience

8. **FORM** (AAMAS 2025) - First-Order Logic Reward Machines
   - arXiv:2501.00364 - Expressive, transferable reward specification

9. **CALM** (AAAI 2025) - Curiosity-Driven Auditing for LLMs
   - arXiv:2501.02997 - Intrinsic motivation for alignment probing

10. **CORD** (2025) - Generalizable Cooperation via Role Diversity
    - arXiv:2501.02221 - Hierarchical MARL with dynamic role assignment

11. **Activity Frames** (2026) - Deterministic Screen-Activity Compilation
    - arXiv:2608.05784 - 86x context compression for agent memory

12. **LLMPC** (2025) - Large Language Model Predictive Control
    - arXiv:2501.02486 - Unified MPC framework for LLM planning

13. **SDPO** (2025) - Segment-Level Direct Preference Optimization
    - arXiv:2501.01821 - Multi-turn social agent alignment

14. **HGCPP** (ICAART 2025) - Hierarchical Goal-Conditioned Policy Planning
    - arXiv:2501.01727 - MCTS + goal hierarchies for sparse-reward tasks

15. **Uncertainty Quantification Survey** (2025) - From Aleatoric to Epistemic
    - arXiv:2501.03282 - Mathematical foundations of UQ in AI

16. **Self-Evolving Clinical Systems** (2026) - Scaling Medical Agents
    - arXiv:2607.11175 - Three-level autonomy taxonomy, self-evolution framework

17. **Economic World Models** (2026) - Agentic Economies Blueprint
    - arXiv:2608.06020 - Six-level capability ladder for generative economic simulation

18. **Video-of-Thought** (ICML 2024) - Step-by-Step Video Reasoning
    - arXiv:2501.03230 - Perception-to-cognition CoT for multimodal agents

19. **SenseRAG** (WACV 2025) - Environmental Knowledge Bases
    - arXiv:2501.03535 - Proactive RAG + CoT for autonomous agents

20. **Multi-Agent Pathfinding** (JAIR 2026) - Communication-Constrained Planning
    - arXiv:2501.02770 - Adaptive path expansion + dynamic leading

---

## Strategic Recommendations

### Immediate Wins (0-3 months)
1. **Turn-level credit assignment** - Highest ROI, directly improves agent loop quality
2. **Adaptive test-time compute** - Leverages existing `needsStrongerModel` infrastructure
3. **Agent refinement tuning** - Builds on existing `selfCorrect.ts` with minimal refactoring

### Medium-Term Investments (3-6 months)
4. **World rehearsal** - Transforms `simulation.ts` from passive to active prediction
5. **TREK distillation pipeline** - Leverages existing multi-model routing
6. **Epistemic uncertainty** - Deepens `metaCognition.ts` beyond binary confidence

### Long-Term Differentiation (6-12 months)
7. **Structured thought representations** - Unique cognitive architecture feature
8. **Multi-agent role diversity** - Enables true internal specialization
9. **FORM reward machines** - Formal specification of agent goals

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Complexity creep from adding too many modules | HIGH | HIGH | Phase gates; each sprint must pass existing test suite |
| Performance regression from belief-state overhead | MEDIUM | MEDIUM | Benchmark turn latency; cap belief-state computation budget |
| Divergence from existing architecture patterns | MEDIUM | HIGH | Strict adherence to 4-Lobus layering; peer review per module |
| Test coverage gaps for new features | HIGH | MEDIUM | Add tests alongside implementation; maintain 871+ passing tests |
| MCP tool bridge limitations for sub-agents | MEDIUM | HIGH | Design role diversity without requiring sub-agent tool calls initially |

---

## Conclusion

AgenMonster's 23-layer architecture is already world-class in breadth. The gaps identified above are primarily in **depth** - specifically in how the existing layers interact, learn from each other, and allocate computational resources adaptively. The highest-value enhancements are:

1. **Recursive turn-level credit** (makes the agent loop learn from its own turns)
2. **World rehearsal** (makes the agent think before acting)
3. **Adaptive compute** (makes the agent match effort to difficulty)
4. **Refinement tuning** (makes the agent learn from mistakes)

These four enhancements together would transform AgenMonster from a comprehensive cognitive architecture into a genuinely self-improving agent system that rivals the state-of-the-art in 2025-2026.

---

*Report generated via deep recursive research on arXiv, HuggingFace Daily Papers, and cutting-edge agentic AI literature (2025-2026).*
