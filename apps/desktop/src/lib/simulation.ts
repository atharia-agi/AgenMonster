// simulation — episodic simulation / mental time travel (the "world model" camp).
// The creature asks: "if I choose A, what happens 30 days later?" via a
// lightweight counterfactual rollout over the world graph + causal memory.
// Pure + testable. No DOM.

import { type WorldGraph, getNeighbors, shortestPath } from './worldModelGraph.ts';

export interface RolloutStep {
  t: number; // days into the future
  event: string;
  confidence: number;
}

export interface SimulationResult {
  action: string;
  steps: RolloutStep[];
  finalOutcome: string;
  risk: 'low' | 'medium' | 'high';
}

/**
 * Roll out a hypothetical action forward `horizon` days. Uses the world graph to
 * find what the action causes, then chains consequences. Deterministic given the
 * same graph (no randomness) so tests are stable.
 */
export function simulate(action: string, graph: WorldGraph, horizon = 30): SimulationResult {
  const steps: RolloutStep[] = [];
  const startNode = Object.values(graph.entities).find((e) =>
    e.label.toLowerCase().includes(action.toLowerCase().split(' ')[0]),
  );

  let current = startNode?.id;
  let day = 0;
  let confidence = 0.8;

  if (current) {
    const caused = getNeighbors(graph, current, 'causes');
    for (const n of caused.slice(0, 3)) {
      day += Math.max(1, Math.round(horizon / (caused.length || 1)));
      confidence *= 0.85;
      steps.push({ t: day, event: `causes ${n.label}`, confidence });
    }
  } else {
    steps.push({ t: 1, event: `no known causal chain for "${action}"`, confidence: 0.2 });
  }

  const risk: SimulationResult['risk'] =
    confidence < 0.4 ? 'high' : confidence < 0.65 ? 'medium' : 'low';

  const finalOutcome = steps.length
    ? steps[steps.length - 1].event
    : 'unknown';

  return { action, steps, finalOutcome, risk };
}

/** What is the most likely failure mode of an action? */
export function likelyFailureMode(action: string, graph: WorldGraph): string | null {
  // If the action node is blocked_by something, that's the likely failure.
  const node = Object.values(graph.entities).find((e) =>
    e.label.toLowerCase().includes(action.toLowerCase().split(' ')[0]),
  );
  if (!node) return `unknown action "${action}"`;
  const blockers = getNeighbors(graph, node.id, 'blocked_by');
  if (blockers.length) return `blocked by ${blockers.map((b) => b.label).join(', ')}`;
  return null;
}

/** Distance (in relations) between two outcomes in the world graph. */
export function outcomeDistance(a: string, b: string, graph: WorldGraph): number | null {
  const na = Object.values(graph.entities).find((e) => e.label.toLowerCase().includes(a.toLowerCase()));
  const nb = Object.values(graph.entities).find((e) => e.label.toLowerCase().includes(b.toLowerCase()));
  if (!na || !nb) return null;
  const path = shortestPath(graph, na.id, nb.id);
  return path ? path.length - 1 : null;
}
