// goalHierarchy — upgrade the flat Goal list into a tiered tree so the
// creature has long-term direction, not just a to-do stack.
//   core   → the mission decomposed into standing directives
//   long   → 100–1000 day objectives
//   mid    → weekly/monthly projects
//   daily  → task-level intentions
//
// Pure + testable. Reuses Goal from goals.ts and scoreAgainstIdentity from
// identityModel.ts so all layers stay consistent.

import type { Goal, GoalStep } from './goals.ts';
import { splitGoalSteps } from './goals.ts';
import { type SelfModel, scoreAgainstIdentity } from './identityModel.ts';

export type GoalTier = 'core' | 'long' | 'mid' | 'daily';

export interface TieredGoal extends Goal {
  tier: GoalTier;
  parentId?: string;
}

const TIER_RANK: Record<GoalTier, number> = { core: 0, long: 1, mid: 2, daily: 3 };

export function toTiered(g: Goal, tier: GoalTier = 'daily', parentId?: string): TieredGoal {
  return { ...g, tier, parentId };
}

export function addGoalTiered(
  goals: TieredGoal[],
  goal: Goal,
  tier: GoalTier,
  parentId?: string,
): TieredGoal[] {
  return [...goals, toTiered(goal, tier, parentId)];
}

export function getGoalsByTier(goals: TieredGoal[], tier: GoalTier): TieredGoal[] {
  return goals.filter((g) => g.tier === tier);
}

/** Build the parent→child tree from a flat tiered list. */
export function buildGoalTree(goals: TieredGoal[]): Map<string | undefined, TieredGoal[]> {
  const tree = new Map<string | undefined, TieredGoal[]>();
  for (const g of goals) {
    const key = g.parentId;
    const list = tree.get(key) ?? [];
    list.push(g);
    tree.set(key, list);
  }
  return tree;
}

/** Decompose free text into steps (reuses goals.ts splitter). */
export function decomposeIntoSteps(text: string): string[] {
  return splitGoalSteps(text);
}

/** Score a tiered goal against the creature's identity (0..1). */
export function scoreGoal(goal: TieredGoal, self: SelfModel): number {
  return scoreAgainstIdentity(goal.title, self);
}

/** Pick the most identity-aligned, highest-tier active goal. */
export function pickActiveTieredGoal(goals: TieredGoal[], self: SelfModel): TieredGoal | null {
  const active = goals.filter((g) => !g.doneAt);
  if (!active.length) return null;
  return active
    .map((g) => ({ g, s: scoreGoal(g, self) - TIER_RANK[g.tier] * 0.05 }))
    .sort((a, b) => b.s - a.s)[0].g;
}

export function sortByTier(goals: TieredGoal[]): TieredGoal[] {
  return [...goals].sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
}
