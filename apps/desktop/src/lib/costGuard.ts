// Runaway cost guard — pure decision module. The tokenTracker owns the
// accounting; costGuard owns the policy. Persisted budget lives in
// localStorage under `agenmonster_budget`. Decision levels:
//   - allow  : proceed normally
//   - warn   : proceed + emit a UI warning (e.g. approach threshold)
//   - block  : refuse the call

export interface BudgetCaps {
  perCallUsd: number;
  dailyUsdTotal: number;
  perProviderDailyUsd: Record<string, number>;
  perProviderTotalUsd: Record<string, number>;
  perCallWarnRatio: number;
}

export interface SpendSnapshot {
  callUsd: number;
  provider: string;
  totalUsdProvider: number;
  dailyUsdProvider: number;
  dailyUsdTotal: number;
}

export type DecisionLevel = 'allow' | 'warn' | 'block';

export interface CallDecision {
  level: DecisionLevel;
  reason: string;
  ratio?: number;
}

export const DEFAULT_CAPS: BudgetCaps = {
  perCallUsd: 0.25,
  dailyUsdTotal: 5,
  perProviderDailyUsd: {},
  perProviderTotalUsd: {},
  perCallWarnRatio: 0.7,
};

export const BUDGET_STORAGE_KEY = 'agenmonster_budget';

export function loadCaps(): BudgetCaps {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CAPS };
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CAPS };
    const parsed = JSON.parse(raw) as Partial<BudgetCaps>;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CAPS };
    return {
      perCallUsd: typeof parsed.perCallUsd === 'number' ? parsed.perCallUsd : DEFAULT_CAPS.perCallUsd,
      dailyUsdTotal: typeof parsed.dailyUsdTotal === 'number' ? parsed.dailyUsdTotal : DEFAULT_CAPS.dailyUsdTotal,
      perCallWarnRatio: typeof parsed.perCallWarnRatio === 'number' ? parsed.perCallWarnRatio : DEFAULT_CAPS.perCallWarnRatio,
      perProviderDailyUsd: parsed.perProviderDailyUsd && typeof parsed.perProviderDailyUsd === 'object' ? { ...parsed.perProviderDailyUsd } : {},
      perProviderTotalUsd: parsed.perProviderTotalUsd && typeof parsed.perProviderTotalUsd === 'object' ? { ...parsed.perProviderTotalUsd } : {},
    };
  } catch {
    return { ...DEFAULT_CAPS };
  }
}

export function saveCaps(caps: BudgetCaps): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(caps));
  } catch {}
}

export function decideCall(caps: BudgetCaps, snap: SpendSnapshot): CallDecision {
  const callRatio = caps.perCallUsd > 0 ? snap.callUsd / caps.perCallUsd : 0;

  // Hard ceiling: per-call.
  if (caps.perCallUsd > 0 && callRatio >= 1) {
    return {
      level: 'block',
      reason: `Per-call cost $${snap.callUsd.toFixed(4)} ≥ cap $${caps.perCallUsd.toFixed(4)}`,
      ratio: callRatio,
    };
  }
  if (caps.perCallUsd > 0 && callRatio >= caps.perCallWarnRatio) {
    return {
      level: 'warn',
      reason: `Approaching per-call cap (${(callRatio * 100).toFixed(0)}%)`,
      ratio: callRatio,
    };
  }

  // Daily global cap.
  if (caps.dailyUsdTotal > 0 && snap.dailyUsdTotal >= caps.dailyUsdTotal) {
    return { level: 'block', reason: `Daily total $${snap.dailyUsdTotal.toFixed(4)} ≥ cap $${caps.dailyUsdTotal.toFixed(4)}` };
  }
  if (caps.dailyUsdTotal > 0 && snap.dailyUsdTotal >= caps.dailyUsdTotal * caps.perCallWarnRatio) {
    return { level: 'warn', reason: `Approaching daily total cap (${(snap.dailyUsdTotal / caps.dailyUsdTotal * 100).toFixed(0)}%)` };
  }

  // Per-provider daily cap.
  const provDailyCap = caps.perProviderDailyUsd[snap.provider];
  if (provDailyCap && snap.dailyUsdProvider >= provDailyCap) {
    return {
      level: 'block',
      reason: `Daily ${snap.provider} $${snap.dailyUsdProvider.toFixed(4)} ≥ cap $${provDailyCap.toFixed(4)}`,
    };
  }

  // Per-provider lifetime cap.
  const provTotalCap = caps.perProviderTotalUsd[snap.provider];
  if (provTotalCap && snap.totalUsdProvider >= provTotalCap) {
    return {
      level: 'block',
      reason: `Lifetime ${snap.provider} $${snap.totalUsdProvider.toFixed(4)} ≥ cap $${provTotalCap.toFixed(4)}`,
    };
  }

  return { level: 'allow', reason: 'within budget' };
}

export function describeCaps(caps: BudgetCaps): string {
  const parts: string[] = [];
  parts.push(`Per-call: $${caps.perCallUsd.toFixed(2)}`);
  if (caps.dailyUsdTotal > 0) parts.push(`Daily total: $${caps.dailyUsdTotal.toFixed(2)}`);
  const provCaps = Object.entries(caps.perProviderDailyUsd);
  if (provCaps.length) {
    parts.push(`Daily per-provider: ` + provCaps.map(([k, v]) => `${k}=$${v.toFixed(2)}`).join(', '));
  }
  const provTotals = Object.entries(caps.perProviderTotalUsd);
  if (provTotals.length) {
    parts.push(`Lifetime per-provider: ` + provTotals.map(([k, v]) => `${k}=$${v.toFixed(2)}`).join(', '));
  }
  return parts.length ? parts.join(' · ') : 'No caps set';
}
