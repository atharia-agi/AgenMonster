export interface BeliefState {
  B0: number;
  ck: number;
  logitB0: number;
  gamma: number;
  lambda_: number;
  b: number;
}

export interface TurnCredit {
  turnIndex: number;
  evidence: number;
  belief: number;
  deltaBelief: number;
  credit: number;
  pivotal: boolean;
}

export interface CreditAssignmentResult {
  turnCredits: TurnCredit[];
  pivotalTurns: number[];
  totalAdvantage: number;
}

export function createBeliefState(
  B0 = 0.5,
  gamma = 0.9,
  lambda_ = 0.5,
  b = 0.3
): BeliefState {
  const logitB0 = logit(B0);
  return { B0, ck: 0, logitB0, gamma, lambda_, b };
}

export function computeTurnCredits(
  beliefState: BeliefState,
  logProbs: number[][],
  sequenceAdvantage: number
): CreditAssignmentResult {
  const turnCredits: TurnCredit[] = [];
  let prevBelief = beliefState.B0;
  const lambda_ = beliefState.lambda_;
  const b = beliefState.b;
  const gamma = beliefState.gamma;

  for (let k = 0; k < logProbs.length; k++) {
    const e_k = sum(logProbs[k]);
    beliefState.ck = gamma * beliefState.ck + e_k;
    const logitBk = beliefState.logitB0 + beliefState.ck;
    const Bk = sigmoid(logitBk);
    const deltaBk = Bk - prevBelief;
    prevBelief = Bk;

    const reshapedAdvantage =
      sequenceAdvantage *
      ((1 - lambda_) + lambda_ * clip(1 + b * deltaBk, 1 - b, 1 + b));

    turnCredits.push({
      turnIndex: k,
      evidence: e_k,
      belief: Bk,
      deltaBelief: deltaBk,
      credit: reshapedAdvantage,
      pivotal: Math.abs(deltaBk) > 0.1,
    });
  }

  const pivotalTurns = turnCredits.filter((t) => t.pivotal).map((t) => t.turnIndex);
  const totalAdvantage = turnCredits.reduce((sum, t) => sum + t.credit, 0);

  return { turnCredits, pivotalTurns, totalAdvantage };
}

export function reshapeAdvantage(
  baseAdvantage: number,
  deltaBelief: number,
  lambda_ = 0.5,
  b = 0.3
): number {
  return (
    baseAdvantage *
    ((1 - lambda_) + lambda_ * clip(1 + b * deltaBelief, 1 - b, 1 + b))
  );
}

export function recordTrajectoryCredit(
  trajectoryId: string,
  turnCredits: TurnCredit[],
  outcome: 'success' | 'failure' | 'partial'
): void {
  const baseAdvantage =
    outcome === 'success' ? 1.0 : outcome === 'failure' ? -1.0 : 0.2;

  for (const turn of turnCredits) {
    const record = {
      trajectoryId,
      turnIndex: turn.turnIndex,
      credit: turn.credit,
      evidence: turn.evidence,
      deltaBelief: turn.deltaBelief,
      pivotal: turn.pivotal,
      outcome,
      timestamp: Date.now(),
    };
    try {
      const key = `credit_${trajectoryId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(record);
      localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
    } catch {
      // storage unavailable
    }
  }
}

export function getTrajectoryCredit(trajectoryId: string): TurnCredit[] {
  try {
    const key = `credit_${trajectoryId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    return existing;
  } catch {
    return [];
  }
}

function logit(p: number): number {
  const eps = 1e-7;
  p = Math.max(eps, Math.min(1 - eps, p));
  return Math.log(p / (1 - p));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function clip(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}
