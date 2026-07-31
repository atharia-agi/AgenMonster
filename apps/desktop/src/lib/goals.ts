// Goal-oriented loop — the pet's "agent" half. Pure logic.
//
// A Goal is a multi-step objective the user has assigned to the pet.
// Goals are inferred from imperative chat intent (`"deploy X"`, `"fix this"`),
// or created manually via `/goal <title> [step1 | step2 | ...]`.
// Goals persist in `state.goals`. The active goal (most recent unfinished)
// surfaces in the system prompt so the LLM has shared context.

const GOALS_KEY = 'agenmonster_goals';

export function persistGoals(goals: Goal[]): void {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {}
  syncGoalsToState(goals);
}

export function loadGoals(): Goal[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stateRaw = localStorage.getItem('agenmonster_state');
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      if (Array.isArray(parsed?.goals)) return parsed.goals;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function syncGoalsToState(goals: Goal[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const stateRaw = localStorage.getItem('agenmonster_state');
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      if (typeof parsed === 'object' && parsed !== null) {
        parsed.goals = goals;
        localStorage.setItem('agenmonster_state', JSON.stringify(parsed));
      }
    }
  } catch {}
}

export type GoalSource = 'chat' | 'manual' | 'tool';

export interface GoalStep {
  id: string;
  title: string;
  done: boolean;
  doneAt?: number;
}

export interface Goal {
  id: string;
  title: string;
  steps: GoalStep[];
  createdAt: number;
  doneAt?: number;
  source: GoalSource;
  completedStepCount?: number;
}

export const MAX_GOAL_TITLE = 80;
export const MAX_STEP_TITLE = 60;
export const MAX_GOALS = 30;
export const MAX_STEPS_PER_GOAL = 8;

// Imperative-verb list that suggests the user wants action → goal.
const INTENT_VERBS = [
  'deploy',
  'build',
  'fix',
  'refactor',
  'migrate',
  'test',
  'write',
  'add',
  'create',
  'implement',
  'setup',
  'configure',
  'convert',
  'optimize',
  'integrate',
  'ship',
  'do',
  'run',
];

const STEP_VERB_PATTERN = /^(?:step|then|next|after that|finally)\s+/i;

// Heuristic: only treat as a goal-intent when the message STARTS with an
// imperative verb, OR ends with an imperative verb (with at most 80 chars).
export function isGoalIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (t.length > 200) return false; // too long → not a directive
  const first = t.split(/\s+/, 1)[0];
  if (INTENT_VERBS.includes(first)) return true;
  // Detect "can you deploy X" / "please refactor Y"
  if (/(please|can you|could you|let'?s|i want|i need|help me)\s+(deploy|build|fix|refactor|migrate|test|write|add|create|implement|setup|configure|convert|optimize|integrate|ship)\b/.test(t)) return true;
  return false;
}

// Pull candidate noun-phrase out of "deploy this to AWS" → "this".
// Returns a trimmed version of the message with leading imperative verb
// and tail filler stripped.
export function deriveGoalTitle(text: string): string {
  const t = text.trim().replace(/[.!?]+$/g, '');
  if (t.length === 0) return 'Untitled goal';
  // Strip leading imperative verb.
  const parts = t.split(/\s+/);
  if (INTENT_VERBS.includes(parts[0].toLowerCase())) parts.shift();
  // Strip "this", "the X" prefixes that add no info.
  let cleaned = parts.join(' ').trim();
  // Strip leading filler phrases.
  cleaned = cleaned.replace(/^(this|the|a|an|it|that|to|for|please|now|then|next)\b/i, '').trim();
  if (!cleaned) cleaned = t;
  return cleaned.slice(0, MAX_GOAL_TITLE);
}

// Try to split a goal into ordered steps from a `|` or numbered list.
export function splitGoalSteps(text: string): string[] {
  // First, try `|` separator: "fix bug | add test | deploy"
  if (text.includes('|')) {
    const pieces = text
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= MAX_STEP_TITLE);
    if (pieces.length > 1) return pieces.slice(0, MAX_STEPS_PER_GOAL);
  }
  // Then, try numbered: "1. ... 2. ... 3."
  const numbered = text.match(/(?:\d+\.\s+)([^\n\d][^\n]+)/g);
  if (numbered && numbered.length > 1) {
    return numbered
      .map((s) => s.replace(/^\d+\.\s+/, '').trim())
      .filter((s) => s.length > 0 && s.length <= MAX_STEP_TITLE)
      .slice(0, MAX_STEPS_PER_GOAL);
  }
  return [];
}

// Build a new goal from a free-text directive.
export function buildGoalFromText(text: string): Goal | null {
  if (!isGoalIntent(text)) return null;
  const title = deriveGoalTitle(text);
  const steps = splitGoalSteps(text);
  return {
    id: crypto.randomUUID(),
    title,
    steps: steps.length > 0
      ? steps.map((s, i) => ({ id: crypto.randomUUID(), title: s, done: i === 0 ? false : false }))
      : [],
    createdAt: Date.now(),
    source: 'chat',
  };
}

export function buildGoal(title: string, stepTitles: string[] = []): Goal {
  return {
    id: crypto.randomUUID(),
    title: title.trim().slice(0, MAX_GOAL_TITLE) || 'Untitled goal',
    steps: stepTitles.slice(0, MAX_STEPS_PER_GOAL).map((t) => ({
      id: crypto.randomUUID(),
      title: t.trim().slice(0, MAX_STEP_TITLE),
      done: false,
    })),
    createdAt: Date.now(),
    source: 'manual',
  };
}

export function markStep(goal: Goal, stepId: string, done: boolean = true): Goal {
  return {
    ...goal,
    steps: goal.steps.map((s) => (s.id === stepId ? { ...s, done, doneAt: done ? Date.now() : undefined } : s)),
    completedStepCount: undefined, // recomputed lazily
  };
}

export function addStep(goal: Goal, title: string): Goal {
  if (goal.steps.length >= MAX_STEPS_PER_GOAL) return goal;
  return {
    ...goal,
    steps: [
      ...goal.steps,
      { id: crypto.randomUUID(), title: title.trim().slice(0, MAX_STEP_TITLE), done: false },
    ],
  };
}

export function completeGoal(goal: Goal): Goal {
  return {
    ...goal,
    doneAt: Date.now(),
    steps: goal.steps.map((s) => (s.done ? s : { ...s, done: true, doneAt: Date.now() })),
  };
}

export function isGoalActive(goal: Goal): boolean {
  return !isGoalComplete(goal);
}

export function isGoalComplete(g: Goal): boolean {
  if (!!g.doneAt) return true;
  if (!g.steps.length) return false;
  return g.steps.every((s) => s.done);
}

export function goalProgress(goal: Goal): { done: number; total: number; ratio: number } {
  const total = goal.steps.length || 1;
  const done = goal.steps.filter((s) => s.done).length;
  return { done, total, ratio: total > 0 ? done / total : 0 };
}

// Heuristic completion detection: if the reply mentions the goal step's
// completion (e.g. "I've finished step 2"), mark that step done.
const COMPLETION_PHRASES = [
  "i've done",
  "i've finished",
  "i've completed",
  'done with',
  'finished step',
  'completed step',
  'step done',
  'i just shipped',
  'i implemented',
  'i fixed it',
  'fix is in',
  'deployed to',
  'merged into',
  'tests pass',
];

export function detectCompletionFromReply(goal: Goal, reply: string): Goal {
  const lowered = reply.toLowerCase();
  if (!goal.steps.length || isGoalComplete(goal)) return goal;
  let next: Goal | null = null;
  for (const step of goal.steps) {
    if (step.done) continue;
    const stepKey = step.title.toLowerCase().slice(0, 12);
    const completionHit = COMPLETION_PHRASES.some((p) => lowered.includes(p));
    const stepHit = stepKey && lowered.includes(stepKey);
    if (completionHit && stepHit) {
      next = markStep(next ?? goal, step.id, true);
    }
  }
  return next ?? goal;
}

// Select the most-relevant active goal for system-prompt injection.
export function pickActiveGoal(goals: Goal[]): Goal | null {
  const active = goals.filter(isGoalActive);
  if (active.length === 0) return null;
  return active.sort((a, b) => b.createdAt - a.createdAt)[0];
}
