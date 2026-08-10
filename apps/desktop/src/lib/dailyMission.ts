// dailyMission — the "Daily Mission" agent flow.
//
// This is the flagship workflow that ONLY works because of the layered memory
// tower + SecondBrain vault. It:
//   1. Pulls the five memory layers (working / short / semantic / episodic /
//      vault) anchored to "today".
//   2. Reads active goals + causal lessons + emotional state.
//   3. Asks the LLM to synthesize a Morning Briefing with the most relevant
//      next moves — where "relevant" is decided by the tower, not by a fresh
//      context window.
//
// Pure where possible; everything async is injected so it is unit-testable
// without a browser. Returns a structured briefing the UI can render.

import { buildLayeredContext, consolidateToVault, type LayeredContext } from './layeredContext.ts';
import { getBrainEmotion } from './brainContext.ts';
import { getBehavioralTone, type RoutingHint } from './emotionEngine.ts';
import { loadCausalMemory, getLessonsForQuery } from './causalMemory.ts';
import { getGameState, type GameState } from './gameState.ts';
import { deriveForm } from './petForm.ts';
import { executeToolAsync } from './mcp.ts';

export interface MissionInput {
  userText: string;
  getGoals: () => Array<{ id: string; title: string; done: boolean; stepsDone: number; stepsTotal: number }>;
  // LLM bridge — streaming-capable reply used to compose the briefing.
  getReply: (history: Array<{ role: string; content: string }>) => Promise<string>;
  // Optional tool executor for any follow-up the model wants (defaults to
  // the real bridge).
  executeTool?: (name: string, params: Record<string, unknown>) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  includeVault?: boolean;
  maxTurns?: number;
}

export interface MissionBriefing {
  ok: boolean;
  error?: string;
  heading: string;
  tone: string;
  posture: string;
  lessons: string[];
  goals: Array<{ title: string; done: boolean; stepsDone: number; stepsTotal: number }>;
  nextMoves: string[];
  recall: LayeredContext;
  body: string;
  /** Layers that contributed recall — for the UI "tower meter". */
  layers: string[];
}

const DEFAULT_GET_GOALS = () => {
  const gs = getGameState();
  return (gs.goals ?? [])
    .slice(0, 6)
    .map((g) => ({
      id: g.id,
      title: g.title,
      done: !!g.doneAt,
      stepsDone: (g.steps ?? []).filter((s) => s.done).length,
      stepsTotal: (g.steps ?? []).length,
    }));
};

function formatGoals(goals: Array<{ title: string; done: boolean; stepsDone: number; stepsTotal: number }>): string {
  if (!goals.length) return 'No active goals yet.';
  return goals
    .map((g) => `- ${g.done ? '[done]' : `[${g.stepsDone}/${g.stepsTotal}]`} ${g.title}`)
    .join('\n');
}

/**
 * Run a Daily Mission briefing. Gathers the tower + goals + emotion, then asks
 * the model for next moves. Never throws: any failure degrades to a graceful
 * local briefing so the flow always answers.
 */
export async function runDailyMission(input: MissionInput): Promise<MissionBriefing> {
  const executeTool = input.executeTool ?? (async (name, params) => executeToolAsync(name, params));

  let recall: LayeredContext = { query: input.userText, hits: [], contributed: [], text: '' };
  try {
    recall = await buildLayeredContext(input.userText, input.includeVault !== false);
  } catch {
    recall = { query: input.userText, hits: [], contributed: [], text: '' };
  }

  let lessons: string[] = [];
  let tone = 'calm & present';
  let posture = 'calm';
  try {
    const emotion = getBrainEmotion();
    tone = getBehavioralTone(emotion).toneLabel;
    const form = deriveForm(formSnapshotFromGame());
    posture = form.posture;
    const causal = loadCausalMemory();
    lessons = getLessonsForQuery(causal, input.userText, 3).map((c) => c.lesson);
  } catch {}

  const goals = input.getGoals();
  const goalsText = formatGoals(goals);
  const recallText = recall.text || 'No layered memory matched today yet.';

  const systemPrompt = [
    "You are the companion's Daily Mission navigator. Today you will decide what matters.",
    '',
    `Emotional state: ${tone}. Current posture: ${posture}.`,
    '',
    'Layered memory recall (working → short → semantic → episodic → vault):',
    recallText,
    '',
    lessons.length ? 'Lessons learned that apply today:\n' + lessons.map((l) => `- ${l}`).join('\n') : 'No relevant lessons yet.',
    '',
    'Active goals:',
    goalsText,
    '',
    'Produce a SHORT briefing (max 220 words) with EXACTLY these sections:',
    '## Headline',
    '## Why today matters',
    '## Next moves (numbered, most concrete first)',
    '## What to watch out for',
  ].join('\n');

  const userMessage = input.userText || "Give me today's mission and the next moves that matter most.";

  let body = '';
  let nextMoves: string[] = [];
  try {
    const history = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    const reply = await input.getReply(history);
    body = reply;
    nextMoves = extractNextMoves(reply);
  } catch (e: any) {
    // Graceful degradation: still surface what we know.
    body = '';
    nextMoves = recall.hits.slice(0, 3).map((h) => `[${h.layer}] ${h.text}`);
  }

  // After a successful briefing, push a "daily mission" memory into the vault
  // layer so tomorrow's tower already knows today's intent.
  try {
    if (body && input.includeVault !== false) {
      void consolidateToVault(
        `[daily] ${userMessage.slice(0, 120)} → ${body.slice(0, 220)}`,
        ['daily', 'mission'],
      );
    }
  } catch {}

  const heading = 'Daily Mission · ' + new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return {
    ok: true,
    heading,
    tone,
    posture,
    lessons,
    goals,
    nextMoves,
    recall,
    body,
    layers: recall.contributed,
  };
}

function formSnapshotFromGame() {
  const gs = getGameState();
  return {
    stage: gs.stage,
    pleasure: clamp01(0.5 + (gs.needs?.mood ?? 50) / 100 * 0.5),
    activation: clamp01((gs.needs?.energy ?? 50) / 100 * 0.6 + (gs.needs?.focus ?? 50) / 100 * 0.4),
    dominance: clamp01(0.5),
    lessonDepth: clamp01((gs.shortMemory?.length ?? 0) / 24),
    mastery: clamp01((gs.skills ?? []).filter((s) => (s as any)?.level >= 2).length / Math.max(1, (gs.skills ?? []).length)),
    energy: clamp01((gs.needs?.energy ?? 50) / 100),
    closeness: clamp01((gs.relationshipXp ?? 0) / Math.max(1, gs.relationshipXpToNext ?? 1)),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function extractNextMoves(text: string): string[] {
  const lines = text.split('\n');
  const moves: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    const m = t.match(/^\s*(?:\d+[\.\)]|\-|\*)\s+(.*)$/);
    if (m && m[1] && m[1].length > 2) moves.push(m[1]);
    if (moves.length >= 5) break;
  }
  return moves;
}
