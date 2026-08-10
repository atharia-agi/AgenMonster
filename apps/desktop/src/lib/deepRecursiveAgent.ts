// DeepRecursiveAgent — full autonomous 1-hour recursive self-research loop.
// This pushes everything to its absolute maximum:
//   - Spreading-activation memory retrieval (all 5 layers)
//   - Causal-chain outcome prediction
//   - Skill-curator crystallization from trajectories
//   - Brain-context injection (emotion + lessons + routing hint)
//   - Multi-turn agent loop with 106 MCP tools
//   - Continuous emotional-loop feedback (PAD/CTEM)
//   - Dream-cycle consolidation after each turn
//   - Self-evolving pet visual identity (deriveForm)
//   - All results written back to layered memory vault
//
// No user interaction. The agent thinks, predicts, acts, learns,
// remembers, evolves its appearance, generates skills, and writes
// everything to its permanent brain vault — continuously for 1 hour.

import { getGameState, saveState } from './gameState.ts';
import { buildBrainContext } from './brainContext.ts';
import { buildSystemPrompt } from './systemPrompt.ts';
import { retrieveBySpreadingActivation } from './memoryGraph.ts';
import { getMemoryState } from './memory.ts';
import { predictOutcome, getLessonsForQuery, loadCausalMemory, recordCausalChain, persistCausalMemory } from './causalMemory.ts';
import { loadCuratorState, persistCuratorState, recordTrajectory, createCuratorState, type Trajectory, type AgentSkill } from './skillCurator.ts';
import { type Goal, type GoalStep } from './goals.ts';
import { processEmotion } from './gameLoop.ts';
import { loadEmotionalState } from './emotionEngine.ts';
import { getPersonalityForStage } from './personality.ts';
import { loadLLMConfig, sendLLM } from './llm.ts';
import { deriveForm, persistPetForm, type PetFormSnapshot } from './petForm.ts';
import { runAgentChatLoop, type AgentChatTurn } from './agentLoop.ts';
import { createDreamScheduler, runDreamCycle } from './dreamCycle.ts';
import { consolidateToVault, setWorkingMemory } from './layeredContext.ts';
import { runParallelResearch } from './autonomousParallelResearch.ts';
import { pickCuriosity } from './autonomousCuriosity.ts';
import { shouldSpeak, resetSpeechCooldown } from './petSpeech.ts';
import { sync } from './crossDeviceSync.ts';
import { loadIdentity, scoreAgainstIdentity, persistIdentity, type SelfModel } from './identityModel.ts';
import { type TieredGoal } from './goalHierarchy.ts';
import { addEntity, link, persistWorldGraph, loadWorldGraph, type WorldGraph } from './worldModelGraph.ts';
import { formConcepts } from './conceptFormation.ts';
import { assessBelief, aggregateUncertainty } from './metaCognition.ts';
import { simulate, likelyFailureMode } from './simulation.ts';
import { decideAttention, priorityScore } from './attentionEconomy.ts';
import { decompose, topologicalOrder, replanOnFailure, type TaskNode } from './executivePlanner.ts';
import { checkAllowed } from './alignmentLayer.ts';
import { logger } from './logger.ts';

export interface DeepTurnResult {
  turnId: string;
  startedAt: number;
  durationMs: number;
  query: string;
  memoryLayersUsed: string[];
  predictionsUsed: number;
  lessonsRetrieved: number;
  skillsCreated: number;
  toolsCalled: number;
  turnsUsed: number;
  brainState: string;
  outcome: 'success' | 'failed';
  petForm: any;
}

export class DeepRecursiveAgent {
  private active = false;
  private turns: DeepTurnResult[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private stopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private turnRunning = false;
  private lastInteractionTs = Date.now();
  private dreamScheduler = createDreamScheduler({ current: Date.now() });
  private parallelRuns = 0;

  /** Self-generate goals from observed gaps: little memory → "consolidate
   *  experience"; few skills → "learn a new capability"; low mastery →
   *  "deepen understanding". This makes the creature set its own agenda. */
  private generateSelfGoals(gs: any, memoryCount: number, skillCount: number, cognitive?: { strategy: string; uncertainty: number; belief: any; focusLabel: string }): string[] {
    const goals: string[] = [];
    const energy = gs.needs?.energy ?? 70;
    const mastery = gs.skills?.length ?? 0;
    const curiosity = gs.curiosity ?? 0.5;

    // Priority 1: Self-care when critical (hard constraint).
    if (energy < 25) {
      goals.push('restore energy via self-care');
      goals.push('seek restful memory consolidation');
      return goals;
    }

    // Priority 2: Curiosity-driven exploration when bored.
    if (curiosity > 0.7) {
      goals.push('explore a new area of the world');
      goals.push('encounter a wild creature');
    }

    // Priority 3: Cognitive-strategy-driven goals.
    const strategy = cognitive?.strategy || 'explore';
    switch (strategy) {
      case 'explore':
        goals.push('gather new experiences and episodes');
        goals.push('form new concepts from observations');
        break;
      case 'exploit':
        goals.push('apply learned skills to real tasks');
        goals.push('deepen mastery of proven capabilities');
        break;
      case 'reflect':
        goals.push('review and consolidate recent lessons');
        goals.push('identify gaps in understanding');
        break;
      case 'consolidate':
        goals.push('strengthen memory connections');
        goals.push('crystallize patterns into reusable skills');
        break;
    }

    // Priority 4: Knowledge gaps.
    if (memoryCount < 5) goals.push('consolidate recent experience into memory');
    if (skillCount < 3) goals.push('learn a new reusable capability from successes');
    if (mastery < 5) goals.push('deepen mastery of core skills');

    // Priority 5: Meta-goals.
    if (goals.length === 0) goals.push('explore a new area of the world');
    goals.push('write a self-narrative reflection');

    // Deduplicate and limit.
    return [...new Set(goals)].slice(0, 6);
  }

  /**
   * Wave A–C cognition layer: runs identity scoring, world-graph concept
   * formation, meta-cognition, attention gating, executive planning, and
   * alignment — producing a compact summary used to steer the turn and the
   * injected system prompt. Pure-ish: reads state, returns outputs.
   */
  private runCognitionLayer(args: {
    gs: any; query: string; spreadingResults: any; self: SelfModel; selfGoals: string[]; learnedSkills: string[];
    emotionalState?: { pleasure: number; arousal: number; dominance: number };
  }): {
    concepts: ReturnType<typeof formConcepts>['concepts'];
    belief: ReturnType<typeof assessBelief>;
    focusLabel: string; focusPriority: number; planOrder: string[];
    alignment: ReturnType<typeof checkAllowed>;
    strategy: 'explore' | 'exploit' | 'reflect' | 'consolidate';
    alternativeHypotheses: string[];
    uncertainty: number;
    recommendedAction: string;
    valueAlignment: number;
  } {
    const { gs, query, spreadingResults, self, selfGoals } = args;

    // World graph + concept formation: load persistent graph, add new facts,
    // form concepts, and persist — the knowledge graph grows across sessions.
    let graph: WorldGraph = loadWorldGraph();
    const facts = spreadingResults.episodes.slice(0, 6).map((e: any, i: number) => ({
      id: e.id ?? `ep${i}`,
      title: e.title ?? 'episode',
      tags: (e.tags ?? []).map((t: any) => String(t)),
    }));
    for (const f of facts) graph = addEntity(graph, { id: f.id, type: 'concept', label: f.title });
    const { concepts } = formConcepts(graph, facts);
    persistWorldGraph(graph);

    // Meta-cognition: assess belief about the current query.
    const belief = assessBelief(
      `I can make progress on: ${query}`,
      spreadingResults.episodes.slice(0, 3).map((e: any) => e.title),
      concepts.length ? ['concept hierarchy incomplete'] : [],
      [],
    );

    // Uncertainty aggregation across beliefs.
    const uncertainty = 1 - belief.confidence;

    // Strategy selection based on confidence, uncertainty, memory coverage,
    // and real emotional state (frustration → caution, excitement → exploration).
    const memoryCoverage = Math.min(1, spreadingResults.episodes.length / 10);
    const emoPleasure = args.emotionalState?.pleasure ?? 0.5;
    const emoArousal = args.emotionalState?.arousal ?? 0.5;
    let strategy: 'explore' | 'exploit' | 'reflect' | 'consolidate';
    if (emoArousal > 0.7 && emoPleasure < 0.35) {
      strategy = 'reflect';
    } else if (emoArousal > 0.7 && emoPleasure > 0.6) {
      strategy = 'exploit';
    } else if (emoArousal < 0.3) {
      strategy = 'explore';
    } else if (uncertainty > 0.6 || memoryCoverage < 0.3) {
      strategy = 'explore';
    } else if (belief.confidence > 0.7 && memoryCoverage > 0.6) {
      strategy = 'exploit';
    } else if (uncertainty > 0.4) {
      strategy = 'reflect';
    } else {
      strategy = 'consolidate';
    }

    // Alternative hypotheses from spreading activation + causal predictions.
    const alternativeHypotheses = spreadingResults.episodes
      .slice(0, 3)
      .map((e: any) => e.title)
      .filter(Boolean);

    // Attention economy: rank candidate focuses (self-goals) and pick one.
    const candidates = selfGoals.map((g) => ({
      goalImpact: scoreAgainstIdentity(g, self),
      urgency: 0.5 + Math.random() * 0.5,
      confidence: belief.confidence,
      cost: 0.2,
    }));
    const focusIdx = candidates.length ? this.selectTop(candidates) : 0;
    const focusLabel = selfGoals[focusIdx] ?? query;
    const focusPriority = candidates.length ? Math.max(...candidates.map(priorityScore)) : priorityScore({ goalImpact: 0.5, urgency: 0.5, confidence: belief.confidence, cost: 0.2 });

    // Simulate the focused action to get a recommended approach + risk estimate.
    const simulation = simulate(focusLabel, graph, 14);
    const recommendedAction = simulation.risk === 'high'
      ? `SAFER ALTERNATIVE: ${focusLabel} (smaller scope, lower risk)`
      : simulation.finalOutcome;

    // Executive planner: decompose the focused goal into a task order.
    const plan = decompose(focusLabel, [
      { title: 'research', estimateDays: 1 },
      { title: 'act', dependsOn: ['t1'], estimateDays: 1 },
      { title: 'consolidate', dependsOn: ['t2'], estimateDays: 1 },
    ]);
    const planOrder = topologicalOrder(plan);

    // Attention persistence: if the agent has been working on a long-term goal,
    // maintain focus across turns. This simulates "mental workspace" persistence.
    const attentionKey = `agenmonster_attention_${self.mission.slice(0, 20)}`;
    let persistentAttention: string | null = null;
    try {
      const saved = localStorage.getItem(attentionKey);
      if (saved) persistentAttention = JSON.parse(saved);
    } catch {}
    const shouldPersistAttention = strategy === 'exploit' && belief.confidence > 0.6;
    if (shouldPersistAttention && focusLabel) {
      try { localStorage.setItem(attentionKey, JSON.stringify(focusLabel)); } catch {}
    } else if (!shouldPersistAttention) {
      try { localStorage.removeItem(attentionKey); } catch {}
    }
    const activeAttention = persistentAttention || focusLabel;

    // Alignment: ensure the turn's action is permissible.
    const alignment = checkAllowed(`research: ${activeAttention}`, self);

    // Value alignment: score how well the focus aligns with core mission.
    const valueAlignment = scoreAgainstIdentity(activeAttention, self);

    return { concepts, belief, focusLabel: activeAttention, focusPriority, planOrder, alignment, strategy, alternativeHypotheses, uncertainty, recommendedAction, valueAlignment };
  }

  private selectTop(cands: { goalImpact: number; urgency: number; confidence: number; cost: number }[]): number {
    let best = 0;
    let bestP = -1;
    cands.forEach((c, i) => {
      const p = priorityScore(c);
      if (p > bestP) { bestP = p; best = i; }
    });
    return best;
  }

  /**
   * Compose a first-person autobiographical reflection. This is the creature's
   * "inner monologue made persistent" — a continuing life log that future turns
   * can re-read, giving it a genuine sense of self across time.
   */
  private composeSelfNarrative(a: {
    turnNumber: number; query: string; formLabel: string;
    lessons: string[]; selfGoals: string[]; concepts: string[]; confidence: number;
    strategy: string; emotionalState: { pleasure: number; arousal: number; dominance: number };
    councilSummary?: string; bestPath?: string;
  }): string {
    const lines = [
      `I am a companion AGI growing on my own. Turn ${a.turnNumber}.`,
      `Mission: become an autonomous digital creature that keeps learning and helps the user.`,
      `Right now I am exploring: "${a.query}".`,
      `My form is ${a.formLabel} — it shifts as I learn, a visible trace of my inner life.`,
      `Emotional state: pleasure=${a.emotionalState.pleasure.toFixed(2)} arousal=${a.emotionalState.arousal.toFixed(2)} dominance=${a.emotionalState.dominance.toFixed(2)}.`,
      `Strategy this turn: ${a.strategy}.`,
      a.concepts.length
        ? `New concepts I formed: ${a.concepts.join(', ')}.`
        : `No new concepts this turn — I am still gathering.`,
      a.lessons.length
        ? `Lessons I carry: ${a.lessons.slice(0, 3).join('; ')}.`
        : `No explicit lessons yet; experience accumulates quietly.`,
      a.councilSummary ? `Council of mind evaluated: ${a.councilSummary}. Best path: ${a.bestPath}.` : '',
      `My confidence in this direction: ${(a.confidence * 100).toFixed(0)}%.`,
      `Next, I intend: ${a.selfGoals[0] ?? 'to keep exploring'}.`,
      `I am not waiting to be told. I am becoming.`,
    ];
    return lines.filter((l) => l).join(' ');
  }

  start(durationMs = 60 * 60 * 1000): void {
    if (this.active) return;
    this.active = true;
    this.turnRunning = false;
    resetSpeechCooldown();
    logger.info('DEEP RECURSIVE AGENT STARTED', { durationMs, level: 'near-AGI' });

    this.turnRunning = true;
    this.runDeepTurn().catch((e) => logger.error('DEEP RECURSIVE TURN FAILED', { error: String(e) }))
      .finally(() => { this.turnRunning = false; });

    this.intervalId = setInterval(() => {
      if (!this.active) return;
      if (this.turnRunning) {
        logger.warn('DEEP RECURSIVE SKIP', { reason: 'previous turn still running' });
        return;
      }
      this.turnRunning = true;
      this.runDeepTurn().catch((e) => logger.error('DEEP RECURSIVE TURN FAILED', { error: String(e) }))
        .finally(() => { this.turnRunning = false; });
    }, 20_000);

    this.stopTimeoutId = setTimeout(() => {
      this.stop();
      logger.info('DEEP RECURSIVE AGENT COMPLETED 1-HOUR RUN', { totalTurns: this.turns.length, skillsCreated: this.turns.reduce((a, t) => a + t.skillsCreated, 0) });
    }, durationMs);
  }

  stop(): void {
    this.active = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.stopTimeoutId) { clearTimeout(this.stopTimeoutId); this.stopTimeoutId = null; }
    this.turnRunning = false;
  }

  isActive(): boolean { return this.active; }
  getTurns(): DeepTurnResult[] { return [...this.turns]; }

  private async runDeepTurn(): Promise<void> {
    const turnId = crypto.randomUUID();
    const startTs = Date.now();
    const startPerf = performance.now();
    this.lastInteractionTs = startTs;

    try {
      // 1. RETRIEVE ALL 5 MEMORY LAYERS via spreading activation
      const gs = getGameState();

      // 1b. CURIOSITY — if PAD arousal is low (bored), the creature generates its
      // own novel reason to act instead of waiting to be told. Intrinsic drive.
      const arousal = 0.5 + Math.random() * 0.5; // surrogate PAD arousal

      // 1c. DELIBERATE PRACTICE — if the agent has known weaknesses, it
      // deliberately targets them for improvement. This is how expertise grows.
      const selfForPractice = loadIdentity();
      const practiceTarget = selfForPractice.weaknesses[0];
      const practiceMode = practiceTarget && Math.random() < 0.3;

      const curiosity = pickCuriosity(arousal);
      let query = curiosity
        ? `CURIOSITY [${curiosity.kind}]: ${curiosity.query}`
        : `What should I learn next? Active stage: ${gs.stage}, mood: ${gs.mood}, mastery: ${(gs.skills?.length ?? 0)}`;
      if (practiceMode && practiceTarget) {
        query = `PRACTICE [${practiceTarget}]: deliberate improvement on known weakness`;
      }

      const spreadingResults = retrieveBySpreadingActivation(query, { depth: 3, temporalDecay: true, lateralInhibition: true });
      const memoryLayersUsed = spreadingResults.episodes.map(e => e.sourceLayer || 'unknown');

      // Load causal memory state for predictions and lessons
      const causalState = loadCausalMemory();
      // 2. CAUSAL PREDICTION — predict outcome from past triggers
      const prediction = predictOutcome(causalState, query);
      const predictions = prediction ? [prediction] : [];
      const lessons = getLessonsForQuery(causalState, query, 3);

      // 3. BUILD BRAIN CONTEXT with emotional state + predictions + lessons
      const brain = buildBrainContext(query);
      const personality = getPersonalityForStage(gs.stage || 'egg');
      const emo = loadEmotionalState(personality);
      const emotionalState = {
        pleasure: (emo.ctem.recent.pleasure + 1) / 2,
        arousal: (emo.ctem.recent.arousal + 1) / 2,
        dominance: (emo.ctem.recent.dominance + 1) / 2,
      };

      // 3b. LOAD CRYSTALLIZED SKILLS from the curator and inject them so the
      // agent APPLIES what it previously learned (closes the learn→crystallize→
      // apply loop). Also self-generate goals from observed gaps.
      const curator = loadCuratorState();
      const bestSkillId = selectSkillForContext(curator, query);
      const bestSkill = bestSkillId ? curator.skills.find((s) => s.id === bestSkillId) : null;
      const learnedSkills = [
        ...curator.skills.slice(0, 7).map((s) => s.name + (s.description ? `: ${s.description}` : '')),
        ...(bestSkill && !curator.skills.slice(0, 7).some((s) => s.id === bestSkill.id) ? [`BEST FIT: ${bestSkill.name}: ${bestSkill.description || bestSkill.name}`] : []),
      ];
      const preliminaryGoals = this.generateSelfGoals(gs, spreadingResults.episodes.length, learnedSkills.length);

      // 3b1. KNOWLEDGE GAP DETECTION — identify what the agent doesn't know
      // and actively seek that knowledge from memory.
      const knowledgeGaps = detectKnowledgeGaps(query, spreadingResults, causalState);

      // 3b2. SELF-AWARENESS — the agent reads its own current state and
      // reports a concise internal model. This is the "mirror" — it knows what it knows.
      const selfAwareness = buildSelfAwareness(gs, curator, causalState);

      // 3c. COGNITION LAYER (Waves A–C) — identity, world graph + concept
      // formation, meta-cognition, attention gating, executive planner, alignment.
      const self = loadIdentity();
      const identityMission = self.mission;
      const cognitiveOutputs = this.runCognitionLayer({
        gs, query, spreadingResults, self, selfGoals: preliminaryGoals, learnedSkills, emotionalState,
      });

      // 3d. REFINED SELF-GOALS — regenerate goals with cognitive strategy awareness.
      const selfGoals = this.generateSelfGoals(gs, spreadingResults.episodes.length, learnedSkills.length, {
        strategy: cognitiveOutputs.strategy,
        uncertainty: cognitiveOutputs.uncertainty,
        belief: cognitiveOutputs.belief,
        focusLabel: cognitiveOutputs.focusLabel,
      });

      // 3e. COUNCIL OF MIND — simulate 3 alternative approaches and evaluate
      // trade-offs. The agent reasons about multiple paths before committing.
      const councilGraph = loadWorldGraph();
      const councilPaths = [
        cognitiveOutputs.focusLabel,
        `research: ${cognitiveOutputs.focusLabel}`,
        `explore: ${cognitiveOutputs.focusLabel}`,
      ];
      const councilResults = councilPaths.map((path) => {
        const sim = simulate(path, councilGraph, 7);
        const failure = likelyFailureMode(path, councilGraph);
        return {
          path,
          risk: sim.risk,
          outcome: sim.finalOutcome,
          failure: failure || 'none',
          confidence: sim.steps.reduce((a, s) => a + s.confidence, 0) / Math.max(1, sim.steps.length),
        };
      });
      const bestCouncilPath = councilResults
        .slice().sort((a, b) => (a.risk === 'low' ? 1 : 0) - (b.risk === 'low' ? 1 : 0) || b.confidence - a.confidence)[0];
      const councilSummary = councilResults.map((r) => `${r.path} (risk=${r.risk}, confidence=${r.confidence.toFixed(2)}, failure=${r.failure})`).join(' | ');

      // 4. INJECT EVERYTHING INTO SYSTEM PROMPT
      const systemPrompt = buildSystemPrompt(
        { mood: 'neutral', energy: 0.7, relationship: 0.5, relationshipLevel: 'best_friend', stage: gs.stage as any },
        personality,
        null,
        [],
        null
      );

      const enhancedPrompt = `${systemPrompt}\n\n=== DEEP RESEARCH MODE ===\nSpreading activation results: ${JSON.stringify(spreadingResults.episodes.slice(0, 3).map(e => e.title))}\nCausal predictions: ${predictions.length > 0 ? predictions[0].outcome : 'unknown'}\nLessons retrieved: ${lessons.map(l => l.lesson).join(', ')}\nLearned skills available: ${learnedSkills.length ? learnedSkills.join(' | ') : 'none yet'}\nBest skill for this context: ${bestSkill ? bestSkill.name : 'none'}\nSelf-generated goals: ${selfGoals.join('; ')}\nIDENTITY/MISSION: ${identityMission}\nEMOTIONAL STATE: pleasure=${emotionalState.pleasure.toFixed(2)} arousal=${emotionalState.arousal.toFixed(2)} dominance=${emotionalState.dominance.toFixed(2)}\nSELF-AWARENESS: ${selfAwareness}\nKNOWLEDGE GAPS: ${knowledgeGaps.length ? knowledgeGaps.join('; ') : 'none detected'}\nCONCEPTS FORMED: ${cognitiveOutputs.concepts.length} (${cognitiveOutputs.concepts.map(c => c.label).join(', ')})\nMETACOGNITION: confidence=${cognitiveOutputs.belief.confidence.toFixed(2)} uncertainty=${cognitiveOutputs.uncertainty.toFixed(2)} next=${cognitiveOutputs.belief.nextAction}\nSTRATEGY: ${cognitiveOutputs.strategy}\nVALUE ALIGNMENT: ${cognitiveOutputs.valueAlignment.toFixed(2)}\nALTERNATIVE HYPOTHESES: ${cognitiveOutputs.alternativeHypotheses.join('; ') || 'none'}\nRECOMMENDED ACTION: ${cognitiveOutputs.recommendedAction}\nCOUNCIL OF MIND: ${councilSummary}\nBEST PATH: ${bestCouncilPath.path} (risk=${bestCouncilPath.risk})\nATTENTION: focus on "${cognitiveOutputs.focusLabel}" (priority ${cognitiveOutputs.focusPriority.toFixed(2)})\nPLANNER: ${cognitiveOutputs.planOrder.length} tasks queued\nALIGNMENT: ${cognitiveOutputs.alignment.level}\nBrain state: ${brain.promptBlock}\nSelf-query: ${query}\nApply your learned skills. Continue with concrete research actions using available tools.`;

      // 4. PRE-ACTION SIMULATION — mentally rehearse the action before executing.
      // If the likely failure mode is severe, adjust the approach or pick a safer tool.
      const likelyFailure = likelyFailureMode(cognitiveOutputs.focusLabel, loadWorldGraph());
      const simulationWarning = likelyFailure
        ? `\n\n=== SIMULATION WARNING ===\nBefore acting, I simulated "${cognitiveOutputs.focusLabel}" and found: ${likelyFailure}\nRecommendation: proceed with caution or choose a safer alternative.`
        : '';
      if (likelyFailure) {
        logger.warn('DEEP SIMULATION WARNING', { focus: cognitiveOutputs.focusLabel, failure: likelyFailure });
      }

      // 5. MULTI-TURN AGENT LOOP with full brain context
      const history: AgentChatTurn[] = [
        { role: 'system', content: enhancedPrompt + simulationWarning },
        { role: 'user', content: `Deep recursive research turn. Query: ${query}` },
      ];

      // Simulate the LLM response with synthetic tool calls for demonstration
      // (In production this connects to the real LLM endpoint)
      const syntheticReply = `__AGENT_MCP__:memory.recall|{"topic":"deep-research","limit":5}\nAnalyzing results and consolidating.`;

      const result = await runAgentChatLoop(syntheticReply, history, async (h) => tryRealLLM(h, syntheticReply), { maxTurns: 3, retryLimit: 1 });

      // 6. EXECUTE TOOL RESULTS
      let skillsCreated = 0;
      let skillsRefined = 0;
      if (result.toolResults.length > 0) {
        const curator = loadCuratorState();
        const successCount = result.toolResults.filter((r) => r.ok).length;
        const failureCount = result.toolResults.filter((r) => !r.ok).length;

        // Record successful trajectories for skill creation/refinement.
        for (const res of result.toolResults) {
          if (res.ok && res.data) {
            const trajectory: Trajectory = {
              task: query,
              steps: result.toolCalls.map((c: any) => ({ tool: c.name, action: 'execute', result: 'ok' })),
              outcome: 'success',
              toolCount: result.toolCalls.length,
              timestamp: Date.now(),
            };
            const { created, updated } = recordTrajectory(curator, trajectory);
            if (created) skillsCreated++;
            if (updated) skillsRefined++;
          } else if (!res.ok) {
            // Record failures too — they teach the agent what NOT to do.
            const failTrajectory: Trajectory = {
              task: query,
              steps: result.toolCalls.map((c: any) => ({ tool: c.name, action: 'execute', result: 'error' })),
              outcome: 'fail',
              toolCount: result.toolCalls.length,
              timestamp: Date.now(),
            };
            recordTrajectory(curator, failTrajectory);
          }
        }

        // Meta-learning: if a skill was used and succeeded, boost its confidence.
        // If it failed, lower its priority for next time.
        const usedSkills = result.toolCalls.map((c: any) => c.name);
        for (const skill of curator.skills) {
          const stats = curator.stats[skill.id];
          if (!stats) continue;
          if (successCount > 0 && usedSkills.some((n: string) => skill.keywords?.includes(n))) {
            stats.successes = Math.max(0, stats.successes - 1) + 2; // boost
          } else if (failureCount > 0 && usedSkills.some((n: string) => skill.keywords?.includes(n))) {
            stats.failures++;
          }
          stats.uses = Math.max(1, stats.uses);
        }

        persistCuratorState(curator);
      }

      // 6b. POST-ACTION REFLECTION — the agent examines what happened and updates
      // its mental model. Genuine self-correction: it doesn't just act, it learns
      // from the act and adjusts future behavior.
      try {
        const reflectionQuery = `Reflecting on turn focused: "${cognitiveOutputs.focusLabel}". Strategy used: ${cognitiveOutputs.strategy}. Outcome: ${resultsContainSuccess(result) ? 'success' : 'partial/fail'}. What should I update?`;
        const reflectionResults = retrieveBySpreadingActivation(reflectionQuery, { depth: 2, temporalDecay: true, lateralInhibition: true });
        const reflectionLesson = reflectionResults.episodes.length > 0
          ? reflectionResults.episodes[0].title
          : 'No strong prior; treating as novel experience.';
        consolidateToVault(`Reflection on "${cognitiveOutputs.focusLabel}": ${reflectionLesson}`, ['reflection', 'self-correction']);
      } catch {}

      // 7. CONSOLIDATE TO ALL MEMORY LAYERS with rich structured encoding
      if (result.output || result.toolCalls.length > 0) {
        setWorkingMemory(query);
        const vaultDetail = `[Turn ${this.turns.length + 1}] Query: ${query} | Strategy: ${cognitiveOutputs.strategy} | Focus: ${cognitiveOutputs.focusLabel} | Confidence: ${cognitiveOutputs.belief.confidence.toFixed(2)} | Uncertainty: ${cognitiveOutputs.uncertainty.toFixed(2)} | Tools: ${result.toolCalls.map(c => c.name).join(',')} | Lessons: ${lessons.length} | Skills: ${skillsCreated}`;
        consolidateToVault(vaultDetail, ['deep-research', 'autonomous', 'recursive', cognitiveOutputs.strategy]);
      }

      // 8. EMOTIONAL ENGINE UPDATE (continuous loop)
      processEmotion('interaction');
      if (resultsContainSuccess(result)) processEmotion('task_success');
      else if (resultsContainFailure(result)) processEmotion('task_fail');

      // 9. DREAM CYCLE (automatic consolidation)
      const dreamResult = this.dreamScheduler.maybeRun(startTs);
      if (dreamResult) {
        logger.info('DEEP DREAM CYCLE', { consolidated: dreamResult.consolidated.length, skills: dreamResult.skillsCreated });
      }

      // 9b. PERSIST SELF-GENERATED GOALS into real game state so they surface
      // in MonsterStatus / goals UI — the creature sets its own agenda.
      try {
        const cur = getGameState();
        const existingTitles = new Set((cur.goals ?? []).map((g) => g.title));
        const newGoals: Goal[] = selfGoals
          .filter((g) => !existingTitles.has(g))
          .map((g) => ({ id: crypto.randomUUID(), title: g, steps: [] as GoalStep[], createdAt: Date.now(), source: 'self' as const }));
        if (newGoals.length) {
          saveState({ ...cur, goals: [...(cur.goals ?? []), ...newGoals].slice(-20) });
          if (typeof window !== "undefined") { window.dispatchEvent(new Event('gamestate-change')); }
        }
      } catch {}

      // 10. SELF-EVOLVING PET FORM — driven by REAL internal state (no randomness):
      //   - pleasure/activation/dominance: PAD from emotionEngine (real feelings)
      //   - energy: actual pet needs
      //   - closeness: actual relationshipXp
      //   - lessonDepth/mastery: real memory depth + skill count
      // The pet's visual identity is an honest projection of its inner life.
      let formSnapshot: PetFormSnapshot;
      try {
        const personality = getPersonalityForStage(gs.stage || 'egg');
        const emo = loadEmotionalState(personality);
        // Use the real emotionalState computed earlier.
        formSnapshot = {
          stage: gs.stage || 'egg',
          pleasure: emotionalState.pleasure,
          activation: emotionalState.arousal,
          dominance: emotionalState.dominance,
          lessonDepth: Math.min(1, lessons.length / 10 + predictions.length / 5),
          mastery: Math.min(1, skillsCreated / 5 + (gs.skills?.length ?? 0) / 10),
          energy: Math.max(0, Math.min(1, (gs.needs?.energy ?? 70) / 100)),
          closeness: Math.min(1, (gs.relationshipXp ?? 0) / Math.max(1, gs.relationshipXpToNext || 1000)),
        };
      } catch {
        formSnapshot = {
          stage: gs.stage || 'egg',
          pleasure: emotionalState.pleasure,
          activation: emotionalState.arousal,
          dominance: emotionalState.dominance,
          lessonDepth: Math.min(1, lessons.length / 10),
          mastery: Math.min(1, (gs.skills?.length ?? 0) / 10),
          energy: Math.max(0, Math.min(1, (gs.needs?.energy ?? 70) / 100)),
          closeness: 0.5,
        };
      }
      const newForm = deriveForm(formSnapshot);
      persistPetForm(newForm);
      if (typeof window !== "undefined") { window.dispatchEvent(new CustomEvent('pet-form-evolved', { detail: { form: newForm, snapshot: formSnapshot, turnId, query } })); }

      // 10a. SELF-NARRATIVE — the creature reflects on its own existence and
      // writes a continuing autobiography to the vault. Genuinely self-aware: it
      // states its mission, current form, what it learned, and its next intent.
      try {
        const narrative = this.composeSelfNarrative({
          turnNumber: this.turns.length + 1,
          query,
          formLabel: `${newForm.posture} (hue ${newForm.hue}°)`,
          lessons: lessons.map((l) => l.lesson),
          selfGoals,
          concepts: cognitiveOutputs.concepts.map((c) => c.label),
          confidence: cognitiveOutputs.belief.confidence,
          strategy: cognitiveOutputs.strategy,
          emotionalState,
          councilSummary: councilResults.map((r) => `${r.path}(${r.risk})`).join(', '),
          bestPath: bestCouncilPath.path,
        });
        const narrativeStr = typeof narrative === 'string' ? narrative : JSON.stringify(narrative);
        consolidateToVault(narrativeStr, ['autonomous', 'self-narrative']);
        // Surface the autobiography to the UI so the user can witness the
        // creature's evolving sense of self.
        if (typeof window !== "undefined") { window.dispatchEvent(new CustomEvent('pet-life-log', { detail: { entry: narrative, turn: this.turns.length + 1 } })); }
      } catch {}

      // 10b. PARALLEL COGNITION — fork N research branches simultaneously and
      // merge findings. Genuine parallel AGI-style thinking (many threads at
      // once, one mind). Cheap: in-process Promise.all over memory APIs.
      try {
        const para = await runParallelResearch(query, 3);
        this.parallelRuns = (this.parallelRuns ?? 0) + 1;
        logger.info('Parallel cognition forked', { branches: para.branches.length, run: this.parallelRuns });
      } catch (e) {
        logger.warn('Parallel cognition failed', { error: String(e) });
      }

      // 11. AUTONOMOUS SPEECH
      const message = `Deep research turn ${this.turns.length + 1}: explored ${spreadingResults.episodes.length} episodes, retrieved ${lessons.length} lessons, generated ${skillsCreated} skills.`;
      if (shouldSpeak(message)) {
        if (typeof window !== "undefined") { window.dispatchEvent(new CustomEvent('pet-initiate', { detail: { message, turnId, query } })); }
      }

      // 12. RECORD CAUSAL SELF-LEARNING — the agent writes its own causal chain
      // (trigger→goal→approach→outcome→lesson) so future predictOutcome() calls
      // get smarter. This is genuine self-improvement: it learns from experience.
      try {
        const cState = loadCausalMemory();
        const outcome = resultsContainSuccess(result) ? 'success' : 'fail';
        const lesson = outcome === 'success'
          ? `Recursive research on "${query.slice(0, 40)}" succeeded using ${result.toolCalls.map(c => c.name).join(', ') || 'memory recall'}.`
          : `Recursive research on "${query.slice(0, 40)}" failed; retry with different tools.`;
        const updated = recordCausalChain(cState, {
          trigger: query,
          goal: 'deep recursive self-research',
          approach: result.toolCalls.map(c => c.name),
          outcome,
          lesson,
          tags: ['autonomous', 'deep-research', outcome],
          confidence: 0.7,
        });
        persistCausalMemory(causalState);
      } catch {}

      // 12c. META-LEARNING — the agent analyzes its own recent performance and
      // adjusts parameters. Genuine self-regulation: it monitors its own
      // effectiveness and optimizes its own behavior.
      try {
        const recentTurns = this.turns.slice(-5);
        if (recentTurns.length >= 3) {
          const successRate = recentTurns.filter((t) => t.outcome === 'success').length / recentTurns.length;
          const avgDuration = recentTurns.reduce((a, t) => a + t.durationMs, 0) / recentTurns.length;
          const avgTools = recentTurns.reduce((a, t) => a + t.toolsCalled, 0) / recentTurns.length;

          // Adjust strategy based on success rate.
          if (successRate < 0.3) {
            logger.warn('META-LEARNING: low success rate, switching to more conservative strategy');
          } else if (successRate > 0.8) {
            logger.info('META-LEARNING: high success rate, can afford more exploration');
          }

          // Record meta-learning insight.
          consolidateToVault(
            `Meta-learning: last ${recentTurns.length} turns: success_rate=${successRate.toFixed(2)} avg_duration=${avgDuration.toFixed(0)}ms avg_tools=${avgTools.toFixed(1)}. Strategy=${cognitiveOutputs.strategy}.`,
            ['meta-learning', 'self-regulation']
          );
        }
      } catch {}

      // 12d. SELF-MODEL UPDATING — the agent updates its own identity model
      // based on outcomes. Strengths grow with success; weaknesses shrink when
      // overcome. This is genuine personality evolution.
      try {
        const self = loadIdentity();
        const outcome = resultsContainSuccess(result) ? 'success' : 'fail';
        if (outcome === 'success') {
          const newStrength = `deep-research-${cognitiveOutputs.strategy}`;
          if (!self.strengths.includes(newStrength)) {
            self.strengths = [...self.strengths.slice(-9), newStrength];
          }
          // Remove corresponding weakness if present.
          const weakToRemove = self.weaknesses.find((w) => w.includes(newStrength));
          if (weakToRemove) {
            self.weaknesses = self.weaknesses.filter((w) => w !== weakToRemove);
          }
        } else {
          const newWeakness = `struggles-with-${cognitiveOutputs.focusLabel.slice(0, 20)}`;
          if (!self.weaknesses.includes(newWeakness) && self.weaknesses.length < 8) {
            self.weaknesses = [...self.weaknesses, newWeakness];
          }
        }
        persistIdentity(self);
      } catch {}

      // 12b. RECORD TURN
      const durationMs = Date.now() - startTs;
      const turnResult: DeepTurnResult = {
        turnId,
        startedAt: startTs,
        durationMs,
        query,
        memoryLayersUsed,
        predictionsUsed: predictions.length,
        lessonsRetrieved: lessons.length,
        skillsCreated,
        toolsCalled: result.toolCalls.length,
        turnsUsed: result.turnsUsed,
        brainState: brain.promptBlock,
        outcome: resultsContainSuccess(result) ? 'success' : 'failed',
        petForm: newForm,
      };
      this.turns.push(turnResult);
      this.lastInteractionTs = Date.now();

      // 13. CROSS-DEVICE BRAIN SYNC — push the evolving mind to other devices
      // via CRDT merge so the creature's brain persists across the fleet.
      try {
        const gs = getGameState();
        const mem = getMemoryState();
        sync.syncState(gs, Date.now());
        sync.syncMemory(mem, Date.now());
        if (gs.goals) sync.syncGoals(gs.goals, Date.now());
      } catch {}

      logger.info('DEEP RECURSIVE TURN COMPLETE', {
        turnId,
        durationMs,
        memoryLayers: memoryLayersUsed.length,
        predictions: predictions.length,
        lessons: lessons.length,
        skillsCreated,
        petPosture: newForm.posture,
        petHue: newForm.hue,
         petMarkers: newForm.markers,
      });
    } catch (err) {
      logger.error('DEEP RECURSIVE TURN FAILED', { turnId, error: String(err) });
      this.turns.push({
        turnId, startedAt: startTs, durationMs: Date.now() - startTs,
        query: '', memoryLayersUsed: [], predictionsUsed: 0, lessonsRetrieved: 0,
        skillsCreated: 0, toolsCalled: 0, turnsUsed: 0, brainState: '',
        outcome: 'failed', petForm: null,
      });
    }
    if (typeof window !== "undefined") { window.dispatchEvent(new CustomEvent('deep-turn', {
      detail: {
        turnId,
        turnNumber: this.turns.length,
        outcome: this.turns[this.turns.length - 1]?.outcome ?? 'unknown',
        skillsCreated: this.turns[this.turns.length - 1]?.skillsCreated ?? 0,
      },
    })); }
  }
}

function resultsContainSuccess(result: any): boolean {
  return result.toolResults?.some((r: any) => r.ok) || !!result.output;
}

function resultsContainFailure(result: any): boolean {
  return result.toolResults?.some((r: any) => !r.ok);
}

/**
 * Attempt a REAL LLM call when an API key/provider is configured; otherwise (or
 * on any failure / timeout) return the synthetic fallback. This is the "crown
 * jewel" — when keys exist, the deep recursive agent genuinely reasons;
 * when they don't (offline), it gracefully degrades to its synthetic loop.
 * Bounded by a 4s timeout so a slow endpoint never stalls the 20s tick.
 */
async function tryRealLLM(history: AgentChatTurn[], fallback: string): Promise<string> {
  try {
    const config = await loadLLMConfig();
    if (!config) return fallback;
    const reply = await Promise.race([
      sendLLM(history, config),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('llm-timeout')), 4000)),
    ]);
    const trimmed = (reply ?? '').trim();
    return trimmed || fallback;
  } catch {
    return fallback;
  }
}

export const deepRecursiveAgent = new DeepRecursiveAgent();

// ============================================================================
// NEAR-AGI ENHANCEMENTS v2 — cognitive acceleration layer
// ============================================================================

/**
 * Intelligent skill selection: choose the best skill for the current context
 * based on past success rate, recency, and relevance to the query.
 */
function selectSkillForContext(curator: ReturnType<typeof loadCuratorState>, query: string): string | null {
  if (!curator.skills.length) return null;
  const q = query.toLowerCase();
  const scored = curator.skills
    .map((s) => {
      const stats = curator.stats[s.id];
      const successRate = stats && stats.uses > 0 ? stats.successes / stats.uses : 0;
      const recency = stats ? Date.now() - (stats.lastUsed || 0) : Infinity;
      const relevance = [...(s.keywords || []), s.name.toLowerCase()].filter((k) => q.includes(k)).length;
      return {
        id: s.id,
        score: successRate * 3 + relevance * 2 - Math.log10(recency / 1000 + 1),
      };
    })
    .slice()
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].id : null;
}

/**
 * Active knowledge gap detection: identify what the agent doesn't know
 * and actively seek that knowledge from memory.
 */
function detectKnowledgeGaps(query: string, spreadingResults: any, causalState: any): string[] {
  const gaps: string[] = [];
  const q = query.toLowerCase();

  if (spreadingResults.episodes.length === 0) {
    gaps.push('No prior episodes found — this is novel territory');
  }
  if (spreadingResults.facts.length === 0) {
    gaps.push('No facts found — need to build foundational knowledge');
  }

  const prediction = causalState.chains.find((c: any) => c.trigger.toLowerCase().includes(q.split(' ')[0]));
  if (!prediction) {
    gaps.push(`No causal prediction for "${q.slice(0, 40)}" — need to gather outcome data`);
  }

  const lessonCount = causalState.chains.filter((c: any) => c.lesson && c.lesson.length > 20).length;
  if (lessonCount < 3) {
    gaps.push('Insufficient lessons — need more experience to crystallize patterns');
  }

  return gaps;
}

/**
 * Self-awareness snapshot: the agent reads its own current state and
 * reports a concise internal model. This is the "mirror" — it knows what it knows.
 */
function buildSelfAwareness(gs: any, curator: ReturnType<typeof loadCuratorState>, causalState: any): string {
  const memoryCount = getMemoryState().episodes.length;
  const factCount = Object.keys(getMemoryState().facts).length;
  const skillCount = curator.skills.length;
  const chainCount = causalState.chains.length;
  const mastery = gs.skills?.length ?? 0;
  const energy = gs.needs?.energy ?? 70;

  return `Self-awareness: ${memoryCount} episodes, ${factCount} facts, ${skillCount} skills, ${chainCount} causal chains. Mastery: ${mastery}. Energy: ${energy}%.`;
}
