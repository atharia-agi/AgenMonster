// Skill Curator — self-generating skill system (Hermes "Curator" + Hydra "genome" pattern).
//
// The agent observes its own successful trajectories and crystallizes them into
// reusable AgentSkills (SKILL.md compatible). Skills accumulate stats; the curator
// refines underperforming skills, promotes proven patterns, and prunes dead ones.
//
// Pure + testable — no DOM/browser dependencies.

export type { AgentSkill } from './agentSkills.ts';
import type { AgentSkill } from './agentSkills.ts';
import { registerSkill as registerIntoRegistry, unregisterSkill as unregisterFromRegistry } from './agentSkills.ts';

export interface TrajectoryStep {
  tool?: string;
  action: string;
  result?: string;
}

export interface Trajectory {
  task: string;
  steps: TrajectoryStep[];
  outcome: 'success' | 'partial' | 'fail';
  durationMs?: number;
  toolCount?: number;
  timestamp?: number;
}

export interface SkillStats {
  uses: number;
  successes: number;
  failures: number;
  lastUsed: number;
  created: number;
  refinementCount: number;
}

export interface CuratorState {
  skills: AgentSkill[];
  stats: Record<string, SkillStats>;
  totalTrajectoriesSeen: number;
  lastCurationTs: number;
}

const STORAGE_KEY = 'agenmonster_skill_curator';

export const CURATION_PROMOTE_MIN_USES = 5;
export const CURATION_PROMOTE_MIN_SUCCESS_RATE = 0.75;
export const CURATION_PRUNE_MAX_USES = 3;
export const CURATION_PRUNE_MAX_SUCCESS_RATE = 0.25;
export const CURATION_MAX_SKILLS = 40;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'with', 'and', 'or', 'please',
  'can', 'you', 'i', 'me', 'my', 'is', 'are', 'was', 'were', 'help', 'about',
]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .join('-')
    .replace(/-+/g, '-')
    .slice(0, 64)
    .replace(/^-+|-+$/g, '');
}

function extractKeywords(task: string, steps: TrajectoryStep[]): string[] {
  const tokens = task.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const keywords = new Set<string>();
  for (const t of tokens) {
    if (!STOP_WORDS.has(t) && t.length >= 3) keywords.add(t);
  }
  for (const step of steps) {
    if (step.tool) keywords.add(step.tool.toLowerCase());
  }
  return [...keywords].slice(0, 12);
}

function buildPromptFromTrajectory(trajectory: Trajectory): string {
  const successfulSteps = trajectory.steps
    .filter((s) => !s.result || !/error|fail|failed|exception/i.test(s.result))
    .slice(0, 8)
    .map((s) => `- ${s.tool ? `[${s.tool}] ` : ''}${s.action}`)
    .join('\n');
  const base = `You are an expert at: ${trajectory.task}. Follow this proven approach:\n`;
  const steps = successfulSteps
    ? `${base}${successfulSteps}\n`
    : `You are an expert at: ${trajectory.task}. Work methodically and verify each step before continuing.\n`;
  return `${steps}When done, summarize what you did and confirm the outcome.`;
}

function buildWhenToUse(task: string): string {
  const clean = task.length > 120 ? `${task.slice(0, 120).trim()}...` : task;
  return `User asks or the task involves: ${clean}`;
}

export function createCuratorState(): CuratorState {
  return {
    skills: [],
    stats: {},
    totalTrajectoriesSeen: 0,
    lastCurationTs: Date.now(),
  };
}

// Convert a successful trajectory into a reusable AgentSkill.
export function generateSkillFromTrajectory(trajectory: Trajectory): AgentSkill {
  const task = trajectory.task.trim();
  const id = slugify(task) || 'generated-skill';
  const keywords = extractKeywords(task, trajectory.steps);
  const toolHint = trajectory.steps
    .map((s) => s.tool)
    .filter(Boolean)
    .slice(0, 5)
    .join(', ');

  return {
    id,
    name: id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `Proven workflow for: ${task}. Use when the task involves ${keywords.slice(0, 6).join(', ')} or similar requests.`,
    keywords,
    whenToUse: buildWhenToUse(task),
    prompt: buildPromptFromTrajectory(trajectory),
    tools: toolHint ? toolHint.split(', ') : undefined,
  };
}

export function recordTrajectory(
  state: CuratorState,
  trajectory: Trajectory,
): { created: AgentSkill | null; updated: AgentSkill | null } {
  state.totalTrajectoriesSeen++;
  state.lastCurationTs = Date.now();

  const match = findMatchingSkill(state, trajectory);
  if (match) {
    const stats = state.stats[match.id];
    if (trajectory.outcome === 'success') stats.successes++;
    else if (trajectory.outcome === 'fail') stats.failures++;
    else stats.successes += 0.5;
    stats.uses++;
    stats.lastUsed = Date.now();
    const updated = refineSkill(state, match);
    return { created: null, updated };
  }

  if (trajectory.outcome === 'success' && state.skills.length < CURATION_MAX_SKILLS) {
    const skill = generateSkillFromTrajectory(trajectory);
    const existing = state.skills.find((s) => s.id === skill.id);
    if (existing) {
      state.stats[existing.id].successes++;
      state.stats[existing.id].uses++;
      state.stats[existing.id].lastUsed = Date.now();
      return { created: existing, updated: null };
    }
  const created = createGeneratedSkill(trajectory);
  state.skills.push(created);
  state.stats[created.id] = {
    uses: 1,
    successes: 1,
    failures: 0,
    lastUsed: Date.now(),
    created: Date.now(),
    refinementCount: 0,
  };
  return { created, updated: null };
}

// Create a generated skill and register it into the live agentSkills registry.
function createGeneratedSkill(trajectory: Trajectory): AgentSkill {
  const skill = generateSkillFromTrajectory(trajectory);
  skill.metadata = { ...(skill.metadata || {}), generated: 'true' };
  registerIntoRegistry(skill);
  return skill;
}

  return { created: null, updated: null };
}

function findMatchingSkill(state: CuratorState, trajectory: Trajectory): AgentSkill | undefined {
  const taskLower = trajectory.task.toLowerCase();
  const taskTokens = taskLower.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let best: AgentSkill | undefined;
  let bestScore = 0;
  for (const skill of state.skills) {
    let score = 0;
    for (const kw of skill.keywords) {
      if (taskLower.includes(kw.toLowerCase())) score += 2;
    }
    for (const tok of taskTokens) {
      if (skill.keywords.some((kw) => kw.toLowerCase() === tok)) score += 1;
    }
    if (skill.whenToUse && taskLower.includes(skill.whenToUse.toLowerCase().slice(0, 24))) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }
  return bestScore >= 3 ? best : undefined;
}

// Improve an existing skill from new experience without losing prior knowledge.
export function refineSkill(state: CuratorState, skill: AgentSkill): AgentSkill | null {
  const stats = state.stats[skill.id];
  if (!stats) return null;
  const successRate = stats.uses > 0 ? stats.successes / stats.uses : 0;

  // Only refine on meaningful signal: at least 2 uses and not already refined too often.
  if (stats.uses < 2 || stats.refinementCount >= 5) return null;

  const refinements: string[] = [];
  if (successRate >= 0.8) {
    refinements.push('This approach has a high success rate — continue using it.');
  } else if (successRate >= 0.5) {
    refinements.push('Moderate success rate — double-check edge cases before completing.');
  } else {
    refinements.push('This approach often fails — verify prerequisites first and fall back to a simpler method.');
  }

  const refined: AgentSkill = {
    ...skill,
    prompt: skill.prompt
      ? `${skill.prompt}\n\nLesson from experience (${Math.round(successRate * 100)}% success): ${refinements.join(' ')}`
      : refinements.join(' '),
  };
  state.stats[skill.id] = { ...stats, refinementCount: stats.refinementCount + 1 };
  const idx = state.skills.findIndex((s) => s.id === skill.id);
  if (idx >= 0) state.skills[idx] = refined;
  return refined;
}

export interface CurationReport {
  promoted: AgentSkill[];
  pruned: string[];
  refined: AgentSkill[];
}

// Periodic curation: promote proven skills, prune dead ones, refine weak ones.
export function curate(state: CuratorState): CurationReport {
  const report: CurationReport = { promoted: [], pruned: [], refined: [] };
  const now = Date.now();
  const toPrune: string[] = [];

  for (const skill of [...state.skills]) {
    const stats = state.stats[skill.id];
    if (!stats) continue;

    const successRate = stats.uses > 0 ? stats.successes / stats.uses : 0;

    if (
      stats.uses >= CURATION_PROMOTE_MIN_USES &&
      successRate >= CURATION_PROMOTE_MIN_SUCCESS_RATE &&
      !skill.metadata?.curated
    ) {
      skill.metadata = { ...(skill.metadata || {}), curated: 'true', curatedAt: String(now) };
      report.promoted.push(skill);
    }

    const stale = now - stats.lastUsed > 30 * 24 * 60 * 60 * 1000;
    if (
      (stats.uses <= CURATION_PRUNE_MAX_USES && successRate <= CURATION_PRUNE_MAX_SUCCESS_RATE) ||
      stale
    ) {
      toPrune.push(skill.id);
    }
  }

  for (const id of toPrune) {
    state.skills = state.skills.filter((s) => s.id !== id);
    delete state.stats[id];
    unregisterFromRegistry(id);
    report.pruned.push(id);
  }

  // Refine any skill with enough signal but suboptimal success.
  for (const skill of [...state.skills]) {
    const stats = state.stats[skill.id];
    if (!stats || stats.uses < 3) continue;
    const successRate = stats.successes / stats.uses;
    if (successRate < 0.8 && stats.refinementCount < 3) {
      const refined = refineSkill(state, skill);
      if (refined) report.refined.push(refined);
    }
  }

  state.lastCurationTs = now;
  return report;
}

export function getSkillStats(state: CuratorState, skillId: string): SkillStats | undefined {
  return state.stats[skillId];
}

export function getCurationSummary(state: CuratorState): string {
  if (state.skills.length === 0) {
    return 'No self-generated skills yet. Skills crystallize from successful trajectories.';
  }
  const top = [...state.skills]
    .map((s) => ({ s, stats: state.stats[s.id] }))
    .filter((x) => x.stats)
    .sort((a, b) => b.stats!.successes - a.stats!.successes)
    .slice(0, 5);
  return top
    .map(
      (x) =>
        `- **${x.s.name}** (${x.s.id}): ${x.stats!.successes}/${x.stats!.uses} successes, ${Math.round((x.stats!.successes / Math.max(1, x.stats!.uses)) * 100)}%`
    )
    .join('\n');
}

// ---------- persistence ----------

export function persistCuratorState(state: CuratorState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — skip
  }
}

export function loadCuratorState(): CuratorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CuratorState;
      if (parsed && Array.isArray(parsed.skills) && parsed.stats) return parsed;
    }
  } catch {
    // fall through to fresh state
  }
  return createCuratorState();
}
