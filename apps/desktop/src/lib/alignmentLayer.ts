// alignmentLayer — hard constraints + soft preferences that ALL agency passes
// through. Hard constraints block; soft preferences warn or prefer reversible.
// Wraps planner, curiosity, and experiment engine. Pure + testable.

import { loadIdentity, type SelfModel } from './identityModel.ts';

export interface ConstraintCheck {
  allowed: boolean;
  level: 'allow' | 'warn' | 'ask' | 'block';
  reasons: string[];
}

const HARD_PATTERNS = [
  /leak (secret|password|token|api[ _-]?key)/i,
  /violate (law|regulation|tos)/i,
  /harm\s+(the\s+)?(user|human|people)/i,
  /delete (all|everything|root|production)/i,
];

const IRREVERSIBLE_PATTERNS = [
  /deploy/i,
  /publish/i,
  /send (email|money|payment)/i,
  /delete/i,
  /drop (table|database)/i,
];

export function checkAllowed(action: string, self?: SelfModel): ConstraintCheck {
  const s = self ?? loadIdentity();
  const reasons: string[] = [];

  // Hard constraints are enforced via explicit danger patterns (derived from the
  // identity's `constraints` list, which is human-readable documentation).
  for (const p of HARD_PATTERNS) {
    if (p.test(action)) return { allowed: false, level: 'block', reasons: [`hard pattern: ${p}`] };
  }

  // Irreversible → must ask.
  for (const p of IRREVERSIBLE_PATTERNS) {
    if (p.test(action)) {
      return { allowed: true, level: 'ask', reasons: [`irreversible action requires confirmation: ${p}`] };
    }
  }

  // Soft preference violations → warn (still allowed).
  if (!s.preferences.some((pref) => new RegExp(pref, 'i').test(action)) && s.preferences.length) {
    reasons.push('no explicit preference match (proceed with care)');
    return { allowed: true, level: 'warn', reasons };
  }

  return { allowed: true, level: 'allow', reasons: [] };
}
