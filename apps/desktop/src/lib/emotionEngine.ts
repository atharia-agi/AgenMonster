// Continuous Emotional Engine — PAD (Pleasure-Arousal-Dominance) model + CTEM
// (Cross-Temporal Emotional Memory) closed loop.
//
// Enhances the discrete mood state machine in `emotion.ts` with a continuous
// 3-axis emotional space and a cross-temporal memory that carries emotional
// momentum between events. The continuous state drives:
//   - mood mapping (backward-compatible with the existing `Mood` type)
//   - model routing hints (frustration escalates model, boredom downgrades)
//   - proactivity/behavior coupling
//
// Pure + testable. No DOM/browser dependencies.

import type { Mood } from './gameState.ts';
import type { EmotionEvent } from './emotion.ts';
import type { PersonalityProfile } from './personality.ts';

// ---------- continuous state ----------

export interface PADState {
  pleasure: number;   // -1 (unpleasant) .. +1 (pleasant)
  arousal: number;    // -1 (calm) .. +1 (excited)
  dominance: number;  // -1 (controlled/helpless) .. +1 (in control)
  ts: number;         // last update timestamp (ms)
}

// Cross-temporal emotional memory — carries momentum between events.
export interface CTEMState {
  recent: PADState;        // fast-decaying short-term emotion
  integrated: PADState;    // slow-decaying cumulative emotional memory
  valenceMomentum: number; // running average of event valence (-1..1)
  eventCount: number;
  lastEvent: EmotionEvent | null;
  lastEventTs: number;
}

export interface EmotionalState {
  pad: PADState;
  ctem: CTEMState;
  personality: PersonalityProfile;
}

export interface RoutingHint {
  modelTier: 'economy' | 'standard' | 'premium' | 'expert';
  temperature: number;
  reason: string;
  escalate: boolean;   // true when a harder task / frustrated state suggests upgrading
  relax: boolean;      // true when simple, low-energy states suggest downgrading
}

// ---------- event deltas ----------

// PAD deltas per discrete emotion event (Meador/PAD mapping of affect).
const EVENT_DELTAS: Record<EmotionEvent, { p: number; a: number; d: number; val: number }> = {
  task_success:   { p: +0.5, a: +0.3, d: +0.2, val: +1 },
  task_fail:      { p: -0.5, a: +0.2, d: -0.3, val: -1 },
  task_complete:  { p: +0.4, a: +0.2, d: +0.3, val: +1 },
  token_eat:      { p: +0.3, a: +0.1, d: +0.1, val: +1 },
  token_low:      { p: -0.2, a: -0.1, d: -0.1, val: -1 },
  user_praise:    { p: +0.6, a: +0.3, d: +0.4, val: +1 },
  user_ignored:   { p: -0.4, a: -0.2, d: -0.3, val: -1 },
  long_task:      { p: +0.1, a: +0.4, d: +0.2, val: +0.5 },
  bug_found:      { p: -0.3, a: +0.4, d: -0.1, val: -0.5 },
  deploy_success: { p: +0.5, a: +0.5, d: +0.4, val: +1 },
  tool_error:     { p: -0.4, a: +0.2, d: -0.2, val: -0.5 },
  tool_success:   { p: +0.4, a: +0.2, d: +0.3, val: +1 },
  sleep_start:    { p: -0.1, a: -0.5, d: -0.2, val: -0.5 },
  sleep_end:      { p: +0.2, a: +0.4, d: +0.1, val: +0.5 },
  evolve_start:   { p: +0.2, a: +0.5, d: +0.3, val: +0.5 },
  evolve_complete:{ p: +0.5, a: +0.4, d: +0.5, val: +1 },
  idle_long:      { p: -0.2, a: -0.4, d: -0.2, val: -0.5 },
  interaction:    { p: +0.3, a: +0.3, d: +0.2, val: +1 },
  energy_high:    { p: +0.2, a: +0.3, d: +0.2, val: +1 },
  energy_low:     { p: -0.2, a: -0.3, d: -0.1, val: -0.5 },
  energy_critical:{ p: -0.3, a: -0.5, d: -0.3, val: -1 },
};

export function createEmotionalState(personality: PersonalityProfile, now = Date.now()): EmotionalState {
  const baseline = baselinePAD(personality);
  const pad: PADState = { ...baseline, ts: now };
  return {
    pad,
    ctem: {
      recent: { ...pad },
      integrated: { ...pad },
      valenceMomentum: 0,
      eventCount: 0,
      lastEvent: null,
      lastEventTs: now,
    },
    personality,
  };
}

// Baseline PAD derived from personality traits — the monster's resting emotional set-point.
export function baselinePAD(personality: PersonalityProfile): PADState {
  const warmth = personality.energyEfficiency ?? 0.5;   // nurture baseline
  const boldness = personality.riskTolerance ?? 0.5;    // dominance baseline
  const liveliness = personality.learningSpeed ?? 0.5;  // arousal baseline
  return {
    pleasure: clamp(warmth * 2 - 1),
    arousal: clamp(liveliness * 2 - 1),
    dominance: clamp(boldness * 2 - 1),
    ts: Date.now(),
  };
}

// ---------- processing ----------

const PERSONALITY_SCALE = 0.7;    // how much personality dampens raw deltas
const MOMENTUM_COUPLING = 0.25;   // cross-temporal coupling: prior emotion resists change
const RECENT_HALF_LIFE = 30_000;  // ms — recent emotion decays quickly
const INTEGRATED_HALF_LIFE = 6 * 60 * 60_000; // ms — integrated mood is sticky

export function processEmotionEvent(
  state: EmotionalState,
  event: EmotionEvent,
  now = Date.now()
): EmotionalState {
  const delta = EVENT_DELTAS[event];
  if (!delta) return state;

  // Personality modulates sensitivity per axis.
  const scale = {
    p: delta.p * PERSONALITY_SCALE * (0.8 + personalityAxis(state, 'p') * 0.4),
    a: delta.a * PERSONALITY_SCALE * (0.8 + personalityAxis(state, 'a') * 0.4),
    d: delta.d * PERSONALITY_SCALE * (0.8 + personalityAxis(state, 'd') * 0.4),
  };

  // Cross-temporal loop: previous emotional state resists displacement (momentum).
  const momentum = state.ctem.integrated;

  const next: PADState = {
    pleasure: clamp(
      state.pad.pleasure + scale.p + MOMENTUM_COUPLING * (momentum.pleasure - state.pad.pleasure)
    ),
    arousal: clamp(
      state.pad.arousal + scale.a + MOMENTUM_COUPLING * (momentum.arousal - state.pad.arousal)
    ),
    dominance: clamp(
      state.pad.dominance + scale.d + MOMENTUM_COUPLING * (momentum.dominance - state.pad.dominance)
    ),
    ts: now,
  };

  const valenceTarget = clamp(delta.val);
  const MOMENTUM_RETAIN = 0.7; // EMA retention — repeated events accumulate regardless of timing

  return {
    ...state,
    pad: next,
    ctem: {
      recent: next,
      integrated: {
        pleasure: clamp(state.ctem.integrated.pleasure * 0.98 + next.pleasure * 0.02),
        arousal: clamp(state.ctem.integrated.arousal * 0.98 + next.arousal * 0.02),
        dominance: clamp(state.ctem.integrated.dominance * 0.98 + next.dominance * 0.02),
        ts: now,
      },
      valenceMomentum: clamp(
        state.ctem.valenceMomentum * MOMENTUM_RETAIN + valenceTarget * (1 - MOMENTUM_RETAIN)
      ),
      eventCount: state.ctem.eventCount + 1,
      lastEvent: event,
      lastEventTs: now,
    },
  };
}

function personalityAxis(state: EmotionalState, axis: 'p' | 'a' | 'd'): number {
  const { personality } = state;
  if (axis === 'p') return personality.energyEfficiency ?? 0.5;
  if (axis === 'a') return personality.learningSpeed ?? 0.5;
  return personality.riskTolerance ?? 0.5;
}

// Decay the continuous state toward baseline over time (emotion fades).
export function decayEmotion(state: EmotionalState, now = Date.now()): EmotionalState {
  const elapsed = Math.max(0, now - state.pad.ts);
  const recentDecay = Math.exp(-elapsed / RECENT_HALF_LIFE);
  const base = baselinePAD(state.personality);

  return {
    ...state,
    pad: {
      pleasure: clamp(base.pleasure + (state.pad.pleasure - base.pleasure) * recentDecay),
      arousal: clamp(base.arousal + (state.pad.arousal - base.arousal) * recentDecay),
      dominance: clamp(base.dominance + (state.pad.dominance - base.dominance) * recentDecay),
      ts: now,
    },
  };
}

// ---------- mapping to discrete mood ----------

const CLAMPED: Record<Mood, [number, number, number]> = {
  happy:      [0.55, 0.3, 0.3],
  excited:    [0.5, 0.8, 0.4],
  proud:      [0.5, 0.3, 0.7],
  focused:    [0.2, 0.6, 0.4],
  thinking:   [0.1, 0.4, 0.2],
  idle:       [0.0, 0.0, 0.0],
  neutral:    [0.1, 0.0, 0.0],
  sleepy:     [0.0, -0.7, -0.3],
  tired:      [-0.2, -0.5, -0.3],
  sad:        [-0.6, -0.2, -0.4],
  frustrated: [-0.4, 0.5, -0.4],
  angry:      [-0.7, 0.7, -0.5],
};

// Map continuous PAD to the nearest discrete Mood.
export function padToMood(pad: PADState): Mood {
  let best: Mood = 'neutral';
  let bestDist = Infinity;
  for (const [mood, vec] of Object.entries(CLAMPED) as [Mood, [number, number, number]][]) {
    const d = Math.hypot(pad.pleasure - vec[0], pad.arousal - vec[1], pad.dominance - vec[2]);
    if (d < bestDist) {
      bestDist = d;
      best = mood;
    }
  }
  return best;
}

// ---------- behavior coupling ----------

export interface BehavioralTone {
  proactivity: number;     // 0-1, how eager the agent is to act unprompted
  verbosity: number;       // 0-1, how talkative the reply should be
  assertiveness: number;   // 0-1, how decisive/confident to sound
  empathy: number;         // 0-1, how attuned to the user's needs
  toneLabel: string;
}

export function getBehavioralTone(state: EmotionalState): BehavioralTone {
  const { pad } = state;
  const proactivity = clamp((pad.arousal + pad.dominance) / 2 + 0.5);
  const verbosity = clamp(pad.arousal / 2 + 0.6);
  const assertiveness = clamp(pad.dominance / 2 + 0.55);
  const empathy = clamp((pad.pleasure + 1) / 2);
  return {
    proactivity,
    verbosity,
    assertiveness,
    empathy,
    toneLabel: toneForPAD(pad),
  };
}

function toneForPAD(pad: PADState): string {
  if (pad.pleasure < -0.3 && pad.arousal > 0.4) return 'frustrated and urgent';
  if (pad.pleasure < -0.3) return 'down and quiet';
  if (pad.arousal > 0.6 && pad.pleasure > 0.3) return 'excited and energized';
  if (pad.arousal < -0.4) return 'calm and restful';
  if (pad.dominance > 0.5) return 'confident and decisive';
  if (pad.dominance < -0.4) return 'hesitant and cautious';
  return 'balanced and helpful';
}

// ---------- model routing ----------

export function getModelRoutingHint(state: EmotionalState): RoutingHint {
  const { pad } = state;
  const frustration = -pad.pleasure + Math.max(0, pad.arousal) + -Math.max(0, -pad.dominance);
  const challenge = -pad.dominance + Math.max(0, -pad.pleasure);

  // Frustration / repeated failure → escalate to stronger model.
  if (frustration > 1.0 || state.ctem.valenceMomentum < -0.5) {
    return {
      modelTier: 'expert',
      temperature: 0.1,
      reason: 'Emotional signal indicates repeated failure or frustration; escalating to a stronger model with lower temperature.',
      escalate: true,
      relax: false,
    };
  }

  // Confident + calm + high dominance → standard, keep temperature moderate.
  if (pad.dominance > 0.5 && pad.arousal < 0.4) {
    return {
      modelTier: 'standard',
      temperature: 0.3,
      reason: 'Calm and in control; standard model is sufficient.',
      escalate: false,
      relax: true,
    };
  }

  // Bored / low energy → cheaper model is fine.
  if (pad.arousal < -0.3 && pad.dominance > 0) {
    return {
      modelTier: 'economy',
      temperature: 0.4,
      reason: 'Low-arousal state; a cheaper model keeps costs down without quality loss.',
      escalate: false,
      relax: true,
    };
  }

  return {
    modelTier: 'standard',
    temperature: 0.3,
    reason: 'Balanced emotional state; standard routing.',
    escalate: false,
    relax: false,
  };
}

// ---------- helpers ----------

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export function describePAD(pad: PADState): string {
  return `P ${pad.pleasure.toFixed(2)} / A ${pad.arousal.toFixed(2)} / D ${pad.dominance.toFixed(2)}`;
}

export function getValenceSummary(state: EmotionalState): string {
  const m = state.ctem.valenceMomentum;
  if (m > 0.4) return 'on a good streak';
  if (m < -0.4) return 'in a rough patch';
  if (m > 0.1) return 'trending positive';
  if (m < -0.1) return 'trending negative';
  return 'emotionally stable';
}

// ---------- persistence ----------

const EMOTION_STORAGE_KEY = 'agenmonster_emotional_state';

export function persistEmotionalState(state: EmotionalState): void {
  try {
    localStorage.setItem(
      EMOTION_STORAGE_KEY,
      JSON.stringify({ pad: state.pad, ctem: state.ctem })
    );
  } catch {
    // localStorage unavailable — skip
  }
}

export function loadEmotionalState(personality: PersonalityProfile): EmotionalState {
  try {
    const raw = localStorage.getItem(EMOTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { pad?: PADState; ctem?: CTEMState };
      if (parsed?.pad && parsed?.ctem) {
        return {
          pad: parsed.pad,
          ctem: parsed.ctem,
          personality,
        };
      }
    }
  } catch {
    // fall through to fresh state
  }
  return createEmotionalState(personality);
}
