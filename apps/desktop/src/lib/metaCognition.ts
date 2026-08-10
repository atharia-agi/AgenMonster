// metaCognition — the creature's ability to think about its own thinking.
// Every belief is annotated with confidence, missing info, and a recommended
// next action. Prevents hallucination: low-confidence → search/experiment
// instead of acting. Pure + testable.

export type NextAction = 'act' | 'verify' | 'search' | 'experiment';

export interface BeliefAssessment {
  belief: string;
  confidence: number; // 0..1
  evidenceCount: number;
  missing: string[];
  assumptions: string[];
  nextAction: NextAction;
}

export function assessBelief(
  belief: string,
  evidence: string[] = [],
  missing: string[] = [],
  assumptions: string[] = [],
): BeliefAssessment {
  const evidenceCount = evidence.length;
  // Confidence grows with evidence but is discounted by missing info & assumptions.
  const base = Math.min(1, 0.3 + evidenceCount * 0.18);
  const penalty = Math.min(0.5, missing.length * 0.12 + assumptions.length * 0.06);
  const confidence = Math.max(0, Math.min(1, base - penalty));

  let nextAction: NextAction;
  if (confidence < 0.4) nextAction = 'experiment';
  else if (confidence < 0.6) nextAction = 'search';
  else if (confidence < 0.85) nextAction = 'verify';
  else nextAction = 'act';

  return { belief, confidence, evidenceCount, missing, assumptions, nextAction };
}

/** Aggregate several beliefs into an overall uncertainty report. */
export function aggregateUncertainty(beliefs: BeliefAssessment[]): {
  avgConfidence: number;
  weakest: BeliefAssessment | null;
  shouldPause: boolean;
} {
  if (!beliefs.length) return { avgConfidence: 0, weakest: null, shouldPause: true };
  const avg = beliefs.reduce((a, b) => a + b.confidence, 0) / beliefs.length;
  const weakest = beliefs.slice().sort((a, b) => a.confidence - b.confidence)[0];
  // Pause if the weakest belief is too uncertain to act on.
  const shouldPause = weakest.confidence < 0.4;
  return { avgConfidence: avg, weakest, shouldPause };
}
