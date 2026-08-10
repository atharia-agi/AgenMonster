// experimentEngine — active learning loop: form a hypothesis, design + run an
// experiment, measure the outcome, and update the causal graph + store as a
// skill/policy. Pure + testable. Causal update delegates to causalMemory.

import { recordCausalChain, loadCausalMemory, persistCausalMemory, type CausalMemoryState } from './causalMemory.ts';
import { type SelfModel, loadIdentity, scoreAgainstIdentity } from './identityModel.ts';

export interface Experiment {
  id: string;
  hypothesis: string;
  design: string;
  run: () => { outcome: 'success' | 'fail'; metric: number };
  measure: (r: { outcome: string; metric: number }) => number;
}

export interface ExperimentResult {
  id: string;
  hypothesis: string;
  outcome: 'success' | 'fail';
  metric: number;
  causalUpdated: boolean;
  lesson: string;
}

export function runExperiment(
  exp: Experiment,
  opts: { self?: SelfModel; state?: CausalMemoryState } = {},
): ExperimentResult {
  const self = opts.self ?? loadIdentity();
  const state = opts.state ?? loadCausalMemory();

  const raw = exp.run();
  const measured = exp.measure(raw);

  // Update causal graph: trigger→goal→approach→outcome→lesson.
  const updated = recordCausalChain(state, {
    trigger: exp.hypothesis,
    goal: 'active experimentation',
    approach: [exp.design],
    outcome: raw.outcome,
    lesson: `Experiment "${exp.hypothesis}" → ${raw.outcome} (metric ${measured.toFixed(2)}).`,
    tags: ['experiment', raw.outcome],
    confidence: 0.8,
  });
  persistCausalMemory(state);

  return {
    id: exp.id,
    hypothesis: exp.hypothesis,
    outcome: raw.outcome,
    metric: measured,
    causalUpdated: true,
    lesson: `Experiment "${exp.hypothesis}" → ${raw.outcome} (metric ${measured.toFixed(2)}).`,
  };
}

/**
 * A/B compare two approaches and return which won by metric. Used by the agent
 * to auto-test e.g. "prompt X vs prompt Y for coding accuracy".
 */
export function abTest(
  nameA: string,
  runA: () => number,
  nameB: string,
  runB: () => number,
): { winner: string; a: number; b: number } {
  const a = runA();
  const b = runB();
  return { winner: a >= b ? nameA : nameB, a, b };
}
