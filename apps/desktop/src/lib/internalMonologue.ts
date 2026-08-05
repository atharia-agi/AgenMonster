// Internal Monologue Engine — generates pet's background thoughts.
// Triggers every 5-10 minutes based on mood, energy, goals, and personality.

import type { GameState } from './gameState.ts';
import { getEvolvedPersonality, PERSONALITY_PROFILES } from './personality.ts';
import { getTopTopics } from './memory.ts';
import type { LLMConfig } from './llm.ts';

const MAX_MONOLOGUE = 20;

export interface MonologueContext {
  mood: string;
  energy: number;
  activity: string;
  stage: string;
  personalityType: string;
  goals: Array<{ title: string; progress?: number }>;
  topics: string[];
  lastInteractionMs: number;
}

export function buildMonologuePrompt(ctx: MonologueContext): string {
  const idleMs = Date.now() - ctx.lastInteractionMs;
  const idleMin = Math.floor(idleMs / 60000);
  const topGoal = ctx.goals[0];
  const topTopic = ctx.topics[0];

  return [
    `You are a living AI pet companion having an internal thought.`,
    `Current state:`,
    `- Mood: ${ctx.mood}`,
    `- Energy: ${Math.round(ctx.energy * 100)}%`,
    `- Activity: ${ctx.activity}`,
    `- Stage: ${ctx.stage}`,
    `- Personality: ${ctx.personalityType}`,
    `- Idle for: ${idleMin} minutes`,
    topGoal ? `- Active goal: ${topGoal.title} (${Math.round((topGoal.progress ?? 0) * 100)}%)` : '- No active goal',
    topTopic ? `- Recent focus: ${topTopic}` : '- No recent topics',
    ``,
    `Generate a single short thought (1 sentence, max 100 chars) in the pet's voice.`,
    `Make it feel organic, not template-y. Reference something specific if possible.`,
    `Examples: "Wonder if there's more TypeScript tips out there...", "That coding session was fun!", "Hmm, should I explore the forest or work on my goal?"`,
    `Return ONLY the thought text, no quotes, no formatting.`,
  ].join('\n');
}

export function generateMonologueFallback(ctx: MonologueContext): string {
  const profiles = PERSONALITY_PROFILES as Record<string, { idlePhrases: string[] }>;
  const profile = profiles[ctx.personalityType];
  const pool = profile?.idlePhrases || ['...'];
  const base = pool[Math.floor(Math.random() * pool.length)];

  const topicSuffix = ctx.topics.length ? ` About ${ctx.topics[0]}...` : '';
  const goalSuffix = ctx.goals.length ? ` Gotta work on ${ctx.goals[0].title}...` : '';
  const energySuffix = ctx.energy < 0.3 ? ' So tired...' : ctx.energy > 0.8 ? ' Full of energy!' : '';

  const maxLen = 100;
  let result = base + topicSuffix + goalSuffix + energySuffix;
  if (result.length > maxLen) result = result.slice(0, maxLen - 3) + '...';
  return result;
}

export async function generateInternalMonologue(
  state: GameState,
  getLLMConfig: () => LLMConfig | Promise<LLMConfig>
): Promise<string> {
  const ctx: MonologueContext = {
    mood: state.mood,
    energy: state.needs.energy / 100,
    activity: state.activity,
    stage: state.stage,
    personalityType: state.personalityType,
    goals: (state.goals ?? []).slice(0, 3).map((g: any) => ({ title: g.title, progress: g.progress })),
    topics: getTopTopics(5).map((t: any) => t.topic),
    lastInteractionMs: state.lastActivityTs,
  };

  try {
    const config = await getLLMConfig();
    if (!config?.apiKey && config?.provider !== 'nousresearch') {
      return generateMonologueFallback(ctx);
    }

    const prompt = buildMonologuePrompt(ctx);
    const text = await callLLMProxy(config, prompt);
    const trimmed = text.trim().replace(/^["']|["']$/g, '').split('\n')[0]!;
    if (trimmed.length > 120) return trimmed.slice(0, 117) + '...';
    return trimmed || generateMonologueFallback(ctx);
  } catch {
    return generateMonologueFallback(ctx);
  }
}

async function callLLMProxy(config: LLMConfig, prompt: string): Promise<string> {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM proxy ${res.status}: ${text}`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export function addMonologue(state: GameState, thought: string): GameState {
  const next = [...(state.internalMonologue ?? []), thought];
  const trimmed = next.slice(-MAX_MONOLOGUE);
  return { ...state, internalMonologue: trimmed };
}

export function getLatestMonologue(state: GameState): string | null {
  const arr = state.internalMonologue ?? [];
  return arr.length > 0 ? arr[arr.length - 1]! : null;
}
