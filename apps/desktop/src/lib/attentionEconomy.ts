// attentionEconomy — the gating layer that prevents curiosity from becoming a
// rabbit hole. Every candidate action is scored:
//   priority = GoalImpact × Urgency × Confidence − Cost
// and low-priority items are ignored/deferred. Pure + testable.

export interface AttentionItem {
  goalImpact: number; // 0..1 alignment with identity/goals
  urgency: number; // 0..1 time pressure
  confidence: number; // 0..1 belief confidence
  cost: number; // 0..1 compute/time/risk cost
}

export function priorityScore(item: AttentionItem): number {
  const raw = item.goalImpact * item.urgency * item.confidence - item.cost;
  return Math.max(0, Math.min(1, raw));
}

export type AttentionDecision = 'focus' | 'defer' | 'ignore';

export function decideAttention(item: AttentionItem, focusThreshold = 0.4, deferThreshold = 0.15): AttentionDecision {
  const p = priorityScore(item);
  if (p >= focusThreshold) return 'focus';
  if (p >= deferThreshold) return 'defer';
  return 'ignore';
}

/** Pick the highest-priority item from a set (the "what to attend to next"). */
export function selectFocus(items: AttentionItem[]): number {
  let best = -1;
  let bestP = -1;
  items.forEach((it, i) => {
    const p = priorityScore(it);
    if (p > bestP) {
      bestP = p;
      best = i;
    }
  });
  return best;
}
