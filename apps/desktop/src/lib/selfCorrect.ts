// Self-correction loop — heuristic quality detection over a streamed reply.
// Pure logic: takes the assembled reply text + recent memory context, and
// returns `RetryDecision`:
//
//   - none       : reply is fine, no retry
//   - retry      : retry once with a different provider/model
//   - block      : too many retries in this session, surface the original
//
// The decision is conservative: only retry if the reply is unmistakably
// weak. False positives are expensive (token cost); false negatives are
// cosmetic (user can hit the UI retry button).

import type { Fact } from './memory.ts';

export interface QualitySignals {
  reply: string;
  durationMs: number;
  provider: string;
  model: string;
  recentFailureCount: number; // failure-rate over recent calls
  costGuardBlocked: boolean; // true if cost guard already warned
  correctionsUsedThisSession: number;
  maxCorrectionsPerSession: number;
}

export type RetryVerdict = 'none' | 'retry' | 'block';

export interface RetryDecision {
  verdict: RetryVerdict;
  reason: string;
}

const WEEK_PHRASES = [
  "i don't know",
  "i'm not sure",
  "i am not sure",
  "as an ai",
  "as a language model",
  "i cannot",
  "i can't help",
  "no information",
  "unable to assist",
  "i'm just a",
  "i am just a",
];

function countWeakPhrases(reply: string): number {
  const lowered = reply.toLowerCase();
  let n = 0;
  for (const phrase of WEEK_PHRASES) if (lowered.includes(phrase)) n++;
  return n;
}

export function evaluateReply(s: QualitySignals): RetryDecision {
  // Already capped.
  if (s.correctionsUsedThisSession >= s.maxCorrectionsPerSession) {
    return { verdict: 'block', reason: `Hit session retry cap of ${s.maxCorrectionsPerSession}` };
  }

  // Cost guard already warned: do not pile up with another auto-retry.
  if (s.costGuardBlocked) {
    return { verdict: 'none', reason: 'Cost guard already intervened; leaving decision to user.' };
  }

  // Pure anti-signals: empty reply, or trivially short.
  const trimmed = s.reply.trim();
  if (!trimmed) return { verdict: 'retry', reason: 'Empty reply — retry with a different provider.' };
  if (trimmed.length < 30) return { verdict: 'retry', reason: 'Reply too short (<30 chars); retry.' };

  // Weak phrases that suggest the model gave up.
  if (countWeakPhrases(s.reply) >= 1) {
    return { verdict: 'retry', reason: 'Reply contains a weak/disclaimer phrase; retry.' };
  }

  // Very fast reply with high recent failure rate: probably a cheap model
  // pattern. Not strict, just useful when paired with other signals.
  if (s.durationMs < 600 && s.recentFailureCount >= 2) {
    return { verdict: 'retry', reason: 'Fast reply + recent failure rate ≥ 2; retry.' };
  }

  return { verdict: 'none', reason: 'within quality threshold' };
}

interface RetryRecord {
  verdict: RetryVerdict;
  confidence: number;
  success: boolean;
}

const _retryRecords: RetryRecord[] = [];

export function recordRetryOutcome(verdict: RetryVerdict, confidence: number, success: boolean): void {
  _retryRecords.push({ verdict, confidence, success });
  if (_retryRecords.length > 200) _retryRecords.splice(0, _retryRecords.length - 200);
}

export function getRetryConfidenceStats(): { total: number; successRate: number; avgConfidence: number } {
  const total = _retryRecords.length;
  if (total === 0) return { total: 0, successRate: 0, avgConfidence: 0 };
  const successes = _retryRecords.filter((r) => r.success).length;
  const avgConfidence = _retryRecords.reduce((acc, r) => acc + r.confidence, 0) / total;
  return { total, successRate: successes / total, avgConfidence };
}
