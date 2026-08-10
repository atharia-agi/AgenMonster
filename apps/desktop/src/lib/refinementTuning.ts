export interface RefinementPair {
  id: string;
  originalTrajectory: string;
  refinedTrajectory: string;
  outcome: 'success' | 'failure' | 'partial';
  context: string;
  timestamp: number;
  source: 'self-correct' | 'dream-cycle' | 'agent-loop';
}

export interface RefinementCorpus {
  pairs: RefinementPair[];
  successRate: number;
  totalRefinements: number;
}

const MAX_PAIRS = 500;

export function createRefinementCorpus(): RefinementCorpus {
  return { pairs: [], successRate: 0, totalRefinements: 0 };
}

export function addRefinementPair(
  corpus: RefinementCorpus,
  pair: Omit<RefinementPair, 'id' | 'timestamp'>
): RefinementPair {
  const newPair: RefinementPair = {
    ...pair,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  corpus.pairs = [...corpus.pairs, newPair].slice(-MAX_PAIRS);
  corpus.totalRefinements++;

  const successes = corpus.pairs.filter((p) => p.outcome === 'success').length;
  corpus.successRate = successes / corpus.pairs.length;

  return newPair;
}

export function refineFailedTrajectory(
  failedTrajectory: string,
  outcome: string,
  context: string,
  llmRefine: (failed: string, outcome: string, context: string) => Promise<string>
): Promise<RefinementPair | null> {
  return llmRefine(failedTrajectory, outcome, context).then((refined) => {
    const pair: RefinementPair = {
      id: crypto.randomUUID(),
      originalTrajectory: failedTrajectory,
      refinedTrajectory: refined,
      outcome: 'success',
      context,
      timestamp: Date.now(),
      source: 'self-correct',
    };
    return pair;
  }).catch(() => null);
}

export function getRefinementsByContext(
  corpus: RefinementCorpus,
  context: string,
  limit = 5
): RefinementPair[] {
  return corpus.pairs
    .filter((p) => p.context.includes(context) || context.includes(p.context))
    .slice(-limit);
}

export function getTopRefinements(
  corpus: RefinementCorpus,
  limit = 10
): RefinementPair[] {
  return [...corpus.pairs]
    .filter((p) => p.outcome === 'success')
    .reverse()
    .slice(0, limit);
}

export function persistCorpus(corpus: RefinementCorpus): void {
  try {
    localStorage.setItem('refinement_corpus', JSON.stringify(corpus));
  } catch {
    // storage unavailable
  }
}

export function loadCorpus(): RefinementCorpus {
  try {
    const stored = localStorage.getItem('refinement_corpus');
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return createRefinementCorpus();
}
