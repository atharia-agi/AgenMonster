// Self-healing / self-improving system for the pet agent.
// Monitors needs, detects unhealthy patterns, and generates
// self-healing actions. Tracks improvement over time.

import type { Needs } from './gameState.ts';

export type HealingAction =
  | 'rest'
  | 'eat'
  | 'play'
  | 'learn'
  | 'socialize'
  | 'meditate'
  | 'exercise'
  | 'create';

export interface HealingPlan {
  action: HealingAction;
  reason: string;
  priority: number;
  needsTarget: Partial<Needs>;
  effectiveness: number;
}

export interface SelfHealingState {
  totalHeals: number;
  successfulHeals: number;
  failedHeals: number;
  lastHealTs: number;
  healHistory: HealRecord[];
  learnedPatterns: LearnedPattern[];
  improvementScore: number;
}

export interface HealRecord {
  action: HealingAction;
  needsBefore: Needs;
  needsAfter: Needs;
  success: boolean;
  timestamp: number;
  reason: string;
}

export interface LearnedPattern {
  trigger: string;
  action: HealingAction;
  successRate: number;
  attempts: number;
  lastUsed: number;
}

const CRITICAL_THRESHOLD = 20;
const WARNING_THRESHOLD = 40;
const HEAL_COOLDOWN_MS = 30000;
const MAX_HISTORY = 50;
const MAX_PATTERNS = 15;

const NEEDS_LABELS: Record<keyof Needs, string> = {
  hunger: 'hunger',
  affection: 'affection',
  energy: 'energy',
  focus: 'focus',
  mood: 'mood',
  motivation: 'motivation',
  knowledge: 'knowledge',
};

function clampNeed(value: number, min = 0, max = 100): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

export function createInitialSelfHealingState(): SelfHealingState {
  return {
    totalHeals: 0,
    successfulHeals: 0,
    failedHeals: 0,
    lastHealTs: 0,
    healHistory: [],
    learnedPatterns: [],
    improvementScore: 0,
  };
}

export function detectNeeds(needs: Needs): { critical: (keyof Needs)[]; warning: (keyof Needs)[]; healthy: boolean } {
  const critical: (keyof Needs)[] = [];
  const warning: (keyof Needs)[] = [];

  for (const [key, value] of Object.entries(needs) as [keyof Needs, number][]) {
    if (value <= CRITICAL_THRESHOLD) {
      critical.push(key);
    } else if (value <= WARNING_THRESHOLD) {
      warning.push(key);
    }
  }

  return { critical, warning, healthy: critical.length === 0 };
}

export function generateHealingPlan(needs: Needs, state: SelfHealingState): HealingPlan[] {
  const { critical, warning } = detectNeeds(needs);
  const plans: HealingPlan[] = [];
  const now = Date.now();

  if (critical.includes('energy') || critical.includes('hunger')) {
    plans.push({
      action: 'rest',
      reason: critical.includes('energy') ? 'Energy is critical — rest immediately' : 'Hunger is critical — eat and rest',
      priority: 10,
      needsTarget: { energy: 60, hunger: critical.includes('hunger') ? 50 : undefined },
      effectiveness: 0.9,
    });
  }

  if (critical.includes('mood') || critical.includes('affection')) {
    plans.push({
      action: 'play',
      reason: critical.includes('mood') ? 'Mood is critical — play to lift spirits' : 'Affection is critical — socialize',
      priority: 9,
      needsTarget: { mood: 55, affection: critical.includes('affection') ? 50 : undefined },
      effectiveness: 0.85,
    });
  }

  if (critical.includes('focus') || warning.includes('focus')) {
    plans.push({
      action: 'meditate',
      reason: 'Focus is low — meditate to restore concentration',
      priority: 7,
      needsTarget: { focus: 60 },
      effectiveness: 0.8,
    });
  }

  if (critical.includes('motivation')) {
    plans.push({
      action: 'create',
      reason: 'Motivation is critical — create something to spark momentum',
      priority: 8,
      needsTarget: { motivation: 55, mood: 50 },
      effectiveness: 0.75,
    });
  }

  if (critical.includes('knowledge') || warning.includes('knowledge')) {
    plans.push({
      action: 'learn',
      reason: 'Knowledge is low — learn something new',
      priority: 6,
      needsTarget: { knowledge: 60, focus: 40 },
      effectiveness: 0.7,
    });
  }

  if (warning.includes('hunger')) {
    plans.push({
      action: 'eat',
      reason: 'Hunger is warning level — eat soon',
      priority: 5,
      needsTarget: { hunger: 55 },
      effectiveness: 0.85,
    });
  }

  if (warning.includes('mood')) {
    plans.push({
      action: 'socialize',
      reason: 'Mood is warning level — socialize to improve',
      priority: 5,
      needsTarget: { mood: 55, affection: 40 },
      effectiveness: 0.75,
    });
  }

  if (warning.includes('energy')) {
    plans.push({
      action: 'exercise',
      reason: 'Energy is warning level — light exercise to boost',
      priority: 4,
      needsTarget: { energy: 55, mood: 45 },
      effectiveness: 0.7,
    });
  }

  const dominated = new Set<number>();
  for (let i = 0; i < plans.length; i++) {
    for (let j = 0; j < plans.length; j++) {
      if (i === j || dominated.has(j)) continue;
      const a = plans[i].needsTarget;
      const b = plans[j].needsTarget;
      const aKeys = Object.keys(a).filter((k) => a[k as keyof Needs] !== undefined) as (keyof Needs)[];
      const bKeys = Object.keys(b).filter((k) => b[k as keyof Needs] !== undefined) as (keyof Needs)[];
      const aDomB = aKeys.length > 0 && aKeys.every((k) => bKeys.includes(k) && (a[k] ?? 0) >= (b[k] ?? 0));
      if (aDomB && plans[i].priority > plans[j].priority) {
        dominated.add(j);
      }
    }
  }

  const filtered = plans.filter((_, i) => !dominated.has(i));

  const sorted = filtered.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.effectiveness - a.effectiveness;
  });

  return sorted;
}

export function applyHealing(
  needs: Needs,
  action: HealingAction,
  healingState: SelfHealingState,
): { needs: Needs; success: boolean; healingState: SelfHealingState } {
  const now = Date.now();
  if (now - healingState.lastHealTs < HEAL_COOLDOWN_MS) {
    return { needs, success: false, healingState };
  }

  const needsBefore = { ...needs };
  let newNeeds = { ...needs };

  switch (action) {
    case 'rest':
      newNeeds = { ...newNeeds, energy: clampNeed(newNeeds.energy + 35), hunger: clampNeed(newNeeds.hunger + 10) };
      break;
    case 'eat':
      newNeeds = { ...newNeeds, hunger: clampNeed(newNeeds.hunger + 30), energy: clampNeed(newNeeds.energy + 10) };
      break;
    case 'play':
      newNeeds = { ...newNeeds, mood: clampNeed(newNeeds.mood + 25), affection: clampNeed(newNeeds.affection + 20) };
      break;
    case 'learn':
      newNeeds = { ...newNeeds, knowledge: clampNeed(newNeeds.knowledge + 25), focus: clampNeed(newNeeds.focus + 15) };
      break;
    case 'socialize':
      newNeeds = { ...newNeeds, mood: clampNeed(newNeeds.mood + 20), affection: clampNeed(newNeeds.affection + 15), motivation: clampNeed(newNeeds.motivation + 10) };
      break;
    case 'meditate':
      newNeeds = { ...newNeeds, focus: clampNeed(newNeeds.focus + 30), mood: clampNeed(newNeeds.mood + 10), energy: clampNeed(newNeeds.energy + 5) };
      break;
    case 'exercise':
      newNeeds = { ...newNeeds, energy: clampNeed(newNeeds.energy + 20), mood: clampNeed(newNeeds.mood + 15), hunger: clampNeed(newNeeds.hunger + 5) };
      break;
    case 'create':
      newNeeds = { ...newNeeds, motivation: clampNeed(newNeeds.motivation + 30), mood: clampNeed(newNeeds.mood + 15), knowledge: clampNeed(newNeeds.knowledge + 10) };
      break;
  }

  const success = Object.values(newNeeds).every((v) => v > CRITICAL_THRESHOLD);

  const record: HealRecord = {
    action,
    needsBefore,
    needsAfter: newNeeds,
    success,
    timestamp: now,
    reason: `Applied ${action} healing`,
  };

  const newHistory = [...healingState.healHistory, record].slice(-MAX_HISTORY);
  const newTotal = healingState.totalHeals + 1;
  const newSuccessful = healingState.successfulHeals + (success ? 1 : 0);
  const newFailed = healingState.failedHeals + (success ? 0 : 1);

  const patternKey = `${action}_${needsBefore.energy < 30 ? 'low_energy' : needsBefore.mood < 30 ? 'low_mood' : needsBefore.hunger < 30 ? 'low_hunger' : 'default'}`;
  const existingPattern = healingState.learnedPatterns.find((p) => p.trigger === patternKey && p.action === action);
  let newPatterns = [...healingState.learnedPatterns];
  if (existingPattern) {
    newPatterns = newPatterns.map((p) =>
      p.trigger === patternKey && p.action === action
        ? { ...p, successRate: (p.successRate * p.attempts + (success ? 1 : 0)) / (p.attempts + 1), attempts: p.attempts + 1, lastUsed: now }
        : p,
    );
  } else {
    newPatterns.push({ trigger: patternKey, action, successRate: success ? 1 : 0, attempts: 1, lastUsed: now });
  }
  if (newPatterns.length > MAX_PATTERNS) newPatterns = newPatterns.slice(-MAX_PATTERNS);

  const avgSuccess = newTotal > 0 ? newSuccessful / newTotal : 0;
  const recentSuccess = newHistory.length > 0 ? newHistory.filter((h) => h.success).length / newHistory.length : 0;
  const improvementScore = Math.round((avgSuccess * 0.6 + recentSuccess * 0.4) * 100);

  const newState: SelfHealingState = {
    totalHeals: newTotal,
    successfulHeals: newSuccessful,
    failedHeals: newFailed,
    lastHealTs: now,
    healHistory: newHistory,
    learnedPatterns: newPatterns,
    improvementScore,
  };

  return { needs: newNeeds, success, healingState: newState };
}

export function getBestHealingAction(
  needs: Needs,
  healingState: SelfHealingState,
): HealingAction | null {
  const plans = generateHealingPlan(needs, healingState);
  if (plans.length === 0) return null;

  const best = plans[0];
  const pattern = healingState.learnedPatterns.find(
    (p) => p.action === best.action && p.successRate > 0.5,
  );

  if (pattern && Date.now() - pattern.lastUsed > 60000) {
    return pattern.action;
  }

  return best.action;
}

export function getHealingSummary(healingState: SelfHealingState): string {
  if (healingState.totalHeals === 0) return 'No healing actions taken yet.';
  const rate = healingState.totalHeals > 0
    ? Math.round((healingState.successfulHeals / healingState.totalHeals) * 100)
    : 0;
  return `Self-healing: ${healingState.totalHeals} actions, ${rate}% success, improvement score ${healingState.improvementScore}`;
}

export function tickSelfHealing(
  needs: Needs,
  healingState: SelfHealingState,
  now: number = Date.now(),
): { needs: Needs; healingState: SelfHealingState; actionTaken: HealingAction | null } {
  const { critical } = detectNeeds(needs);

  if (critical.length === 0) {
    return { needs, healingState, actionTaken: null };
  }

  if (now - healingState.lastHealTs < HEAL_COOLDOWN_MS) {
    return { needs, healingState, actionTaken: null };
  }

  const action = getBestHealingAction(needs, healingState);
  if (!action) {
    return { needs, healingState, actionTaken: null };
  }

  const result = applyHealing(needs, action, healingState);
  return { needs: result.needs, healingState: result.healingState, actionTaken: action };
}