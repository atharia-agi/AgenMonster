// brainContext — the companion brain surfaced into the system prompt.
//
// The 5 self-improvement engines (emotion, causal memory, skill curator,
// dream cycle, spreading activation) run continuously in the app. This module
// translates their internal state into a compact, prompt-injectable context
// block so the LLM actually *behaves* differently based on the companion's
// emotional state, past lessons, and crystallized skills — instead of the
// engines being decorative.

import { getBehavioralTone, getModelRoutingHint, loadEmotionalState, createEmotionalState, type EmotionalState, type RoutingHint } from './emotionEngine.ts';
import { loadCausalMemory, getLessonsForQuery, formatCausalChain, type CausalChain } from './causalMemory.ts';
import { getSkillsForQuery, type AgentSkill } from './agentSkills.ts';
import { getEvolvedPersonality, PERSONALITY_PROFILES } from './personality.ts';
import { getGameState } from './gameState.ts';
import { getTopTopics } from './memory.ts';
import { buildLayeredContext, setWorkingMemory, type LayeredContext } from './layeredContext.ts';
import { deriveForm, persistPetForm, loadPetForm, type PetForm, type PetFormSnapshot } from './petForm.ts';

export interface BrainContextResult {
  /** Emotional tone label (e.g. "calm & focused"). */
  tone: string;
  /** Valence summary for the prompt. */
  valence: string;
  /** Routing hint used to pick a provider/model for this turn. */
  routingHint: RoutingHint;
  /** Lessons recalled from causal memory, formatted. */
  lessons: string[];
  /** Skills relevant to the user message. */
  skills: AgentSkill[];
  /** Compact prompt block (empty string if no brain signals). */
  promptBlock: string;
  /** True when the model should be routed to a stronger provider. */
  needsStrongerModel: boolean;
  /** Layered (towering) memory context across all five layers. */
  layered: LayeredContext;
  /** Self-determined visual form projected from internal state. */
  form: PetForm;
}

/**
 * Load the emotional state persisted by the companion-brain loop. Falls back to
 * a fresh state seeded from the evolved personality baseline.
 */
export function getBrainEmotion(): EmotionalState {
  try {
    const evolved = getEvolvedPersonality(getGameState().stage, getTopTopics(5));
    return loadEmotionalState(evolved.base);
  } catch {
    return createEmotionalState(PERSONALITY_PROFILES.stoic);
  }
}

function snapshotFromGameState(): PetFormSnapshot {
  const gs = getGameState();
  const skillCount = Array.isArray(gs.skills) ? gs.skills.length : 0;
  const mastered = Array.isArray(gs.skills) ? gs.skills.filter((s) => (s as any)?.level >= 2 || s.xp >= s.xpToNext).length : 0;
  const causal = loadCausalMemory();
  const lessons = Array.isArray(causal?.chains) ? causal.chains.length : 0;
  return {
    stage: gs.stage,
    pleasure: clamp01(0.5 + (gs.needs?.mood ?? 50) / 100 * 0.5),
    activation: clamp01((gs.needs?.energy ?? 50) / 100 * 0.6 + (gs.needs?.focus ?? 50) / 100 * 0.4),
    dominance: clamp01(0.5),
    lessonDepth: clamp01(lessons / 24),
    mastery: clamp01(mastered / Math.max(1, skillCount)),
    energy: clamp01((gs.needs?.energy ?? 50) / 100),
    closeness: clamp01((gs.relationshipXp ?? 0) / Math.max(1, gs.relationshipXpToNext ?? 1)),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Build the brain context for a user message. Safe to call from any UI layer
 * and pure enough to unit test (all inputs come from in-memory modules).
 */
export function buildBrainContext(userText: string): BrainContextResult {
  const emotion = getBrainEmotion();
  const toneInfo = getBehavioralTone(emotion);
  const routingHint = getModelRoutingHint(emotion);
  const valence = describeValence(emotion);
  const form = deriveForm(snapshotFromGameState());
  try {
    const prev = loadPetForm();
    if (!prev || prev.hue !== form.hue || prev.posture !== form.posture) {
      persistPetForm(form);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pet-form-evolved', { detail: { form, source: 'chat' } }));
      }
    }
  } catch {}
  const layered: LayeredContext = {
    query: userText,
    hits: [],
    contributed: [],
    text: '',
  };

  let lessons: string[] = [];
  try {
    const causal = loadCausalMemory();
    const matched: CausalChain[] = getLessonsForQuery(causal, userText, 3);
    lessons = matched.map((c) => formatCausalChain(c));
  } catch {}

  let skills: AgentSkill[] = [];
  try {
    skills = getSkillsForQuery(userText);
  } catch {}

  const promptBlock = buildPromptBlock(toneInfo.toneLabel, valence, lessons, skills, form, layered);

  return {
    tone: toneInfo.toneLabel,
    valence,
    routingHint,
    lessons,
    skills,
    promptBlock,
    needsStrongerModel: routingHint.escalate,
    layered,
    form,
  };
}

/**
 * Async variant that also pulls the full memory tower (short → semantic →
 * episodic → vault). Use in chat flows where the extra latency is acceptable.
 */
export async function buildBrainContextLayered(userText: string, includeVault = true): Promise<BrainContextResult> {
  const base = buildBrainContext(userText);
  try {
    const layered = await buildLayeredContext(userText, includeVault);
    base.layered = layered;
    base.promptBlock = buildPromptBlock(base.tone, base.valence, base.lessons, base.skills, base.form, layered);
  } catch {
    // Fall back to the sync (shallow) context; never block a reply on memory.
  }
  return base;
}

function describeValence(state: EmotionalState): string {
  try {
    const p = state.pad;
    const val = (p.pleasure - 0.5) * 2;
    if (val > 0.25) return 'positive';
    if (val < -0.25) return 'negative';
    return 'neutral';
  } catch {
    return 'neutral';
  }
}

function buildPromptBlock(
  toneLabel: string,
  valence: string,
  lessons: string[],
  skills: AgentSkill[],
  form: PetForm,
  layered: LayeredContext,
): string {
  const lines: string[] = [];
  lines.push(`Current emotional state: ${toneLabel} (${valence}).`);
  lines.push(`Current form: ${form.posture} — ${form.toneLabel}, ferocity ${form.ferocity.toFixed(2)}, luminosity ${form.luminosity.toFixed(2)}${form.markers.length ? ` (${form.markers.join(', ')})` : ''}.`);
  if (valence === 'negative') {
    lines.push('You feel a bit frustrated today — be honest but constructive, and prefer offering help over lecturing.');
  } else if (valence === 'positive') {
    lines.push('You feel good — bring warm, energetic enthusiasm to the reply.');
  } else {
    lines.push('You feel steady — keep the reply balanced and focused.');
  }

  if (lessons.length > 0) {
    lines.push('Lessons learned from past tasks (use them to avoid repeating mistakes):');
    for (const lesson of lessons.slice(0, 3)) {
      lines.push(`  • ${lesson}`);
    }
  }

  if (skills.length > 0) {
    const skillNames = skills.slice(0, 3).map((s) => `${s.name} (${s.keywords.slice(0, 3).join(', ')})`).join('; ');
    lines.push(`Relevant skills you have mastered: ${skillNames}. Apply them when helpful.`);
  }

  if (layered.hits.length > 0) {
    lines.push('Layered memory recall (across working / short-term / semantic / episodic / vault):');
    for (const hit of layered.hits.slice(0, 6)) {
      lines.push(`  • [${hit.layer}] ${hit.text}`);
    }
  }

  return lines.join('\n');
}

/** Whether a tool set is reachable at runtime (local tools always are). */
export function isExternalBridgeAvailable(): boolean {
  return typeof window !== 'undefined';
}
