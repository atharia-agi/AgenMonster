import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideCall,
  loadCaps,
  saveCaps,
  describeCaps,
  DEFAULT_CAPS,
  type BudgetCaps,
  type SpendSnapshot,
} from '../src/lib/costGuard.ts';

function snap(over: Partial<SpendSnapshot> = {}): SpendSnapshot {
  return {
    callUsd: 0.05,
    provider: 'groq',
    totalUsdProvider: 0.20,
    dailyUsdProvider: 0.40,
    dailyUsdTotal: 0.50,
    ...over,
  };
}

test('decideCall allows when under all caps', () => {
  const d = decideCall(DEFAULT_CAPS, snap());
  assert.equal(d.level, 'allow');
  assert.equal(d.reason, 'within budget');
});

test('decideCall blocks when per-call cost ≥ per-call cap', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perCallUsd: 0.05 };
  const d = decideCall(caps, snap({ callUsd: 0.06 }));
  assert.equal(d.level, 'block');
  assert.match(d.reason, /Per-call/);
});

test('decideCall warns when per-call cost is approaching cap', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perCallUsd: 0.10 };
  const d = decideCall(caps, snap({ callUsd: 0.08 })); // 80% — over 0.7 warn ratio
  assert.equal(d.level, 'warn');
});

test('decideCall blocks when daily total reaches cap', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, dailyUsdTotal: 0.5 };
  const d = decideCall(caps, snap({ dailyUsdTotal: 0.6 }));
  assert.equal(d.level, 'block');
});

test('decideCall warns when approaching daily total', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, dailyUsdTotal: 0.5, perCallWarnRatio: 0.7 };
  const d = decideCall(caps, snap({ dailyUsdTotal: 0.4 }));
  assert.equal(d.level, 'warn');
});

test('decideCall blocks when per-provider daily cap exceeded', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perProviderDailyUsd: { groq: 0.5 } };
  const d = decideCall(caps, snap({ provider: 'groq', dailyUsdProvider: 0.6 }));
  assert.equal(d.level, 'block');
});

test('decideCall blocks when lifetime per-provider cap exceeded', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perProviderTotalUsd: { mistral: 1 } };
  const d = decideCall(caps, snap({ provider: 'mistral', totalUsdProvider: 1.5 }));
  assert.equal(d.level, 'block');
});

test('decideCall treats 0 cap as unlimited', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perCallUsd: 0, dailyUsdTotal: 0 };
  const d = decideCall(caps, snap({ callUsd: 1000, dailyUsdTotal: 1000 }));
  assert.equal(d.level, 'allow');
});

test('describeCaps renders human-readable summary', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS };
  const desc = describeCaps(caps);
  assert.match(desc, /Per-call/);
});

test('loadCaps returns defaults when localStorage has no key', () => {
  const c = loadCaps();
  assert.equal(c.perCallUsd, DEFAULT_CAPS.perCallUsd);
});

test('decideCall warns at exactly warn-ratio boundary (0.7)', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perCallUsd: 0.10, perCallWarnRatio: 0.7 };
  const d = decideCall(caps, snap({ callUsd: 0.07 })); // 70% exactly
  assert.equal(d.level, 'warn');
  assert.ok((d.ratio ?? 0) >= 0.7, `expected ratio >= 0.7, got ${d.ratio}`);
});

test('decideCall warns at 0.95 daily ratio when warnRatio is 0.7', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, dailyUsdTotal: 1, perCallWarnRatio: 0.7 };
  const d = decideCall(caps, snap({ dailyUsdTotal: 0.95 }));
  assert.equal(d.level, 'warn');
});

test('decideCall blocks at exactly per-call cap', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perCallUsd: 0.05 };
  const d = decideCall(caps, snap({ callUsd: 0.05 }));
  assert.equal(d.level, 'block');
});

test('decideCall blocks when per-provider daily spend exactly hits cap', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, perProviderDailyUsd: { groq: 0.5 } };
  const d = decideCall(caps, snap({ provider: 'groq', dailyUsdProvider: 0.5 }));
  assert.equal(d.level, 'block');
});

test('decideCall warns at daily total boundary 70% when warnRatio is 0.7', () => {
  const caps: BudgetCaps = { ...DEFAULT_CAPS, dailyUsdTotal: 1, perCallWarnRatio: 0.7 };
  const d = decideCall(caps, snap({ dailyUsdTotal: 0.7 }));
  assert.equal(d.level, 'warn');
});
