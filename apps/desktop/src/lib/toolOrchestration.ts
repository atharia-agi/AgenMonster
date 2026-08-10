// toolOrchestration — transactional tool execution: plan → dry-run → execute →
// verify → rollback if needed. Wraps the 106 MCP tools so autonomous actions are
// safe and reversible where possible. Pure + testable (executor injected).

export interface ToolStep {
  tool: string;
  params: Record<string, unknown>;
}

export interface OrchestrationDeps {
  dryRun: (step: ToolStep) => { ok: boolean; reason?: string };
  execute: (step: ToolStep) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  verify: (step: ToolStep, result: unknown) => boolean;
  rollback?: (step: ToolStep) => Promise<void>;
}

export type StepStatus = 'planned' | 'dry-run-ok' | 'dry-run-fail' | 'executed' | 'verified' | 'rolled-back' | 'failed';

export interface StepOutcome {
  step: ToolStep;
  status: StepStatus;
  error?: string;
}

export async function orchestrate(
  steps: ToolStep[],
  deps: OrchestrationDeps,
): Promise<{ outcomes: StepOutcome[]; committed: boolean }> {
  const outcomes: StepOutcome[] = [];

  for (const step of steps) {
    // 1. dry-run
    const dry = deps.dryRun(step);
    if (!dry.ok) {
      outcomes.push({ step, status: 'dry-run-fail', error: dry.reason });
      return { outcomes, committed: false };
    }
    outcomes.push({ step, status: 'dry-run-ok' });

    // 2. execute
    const res = await deps.execute(step);
    if (!res.ok) {
      outcomes.push({ step, status: 'failed', error: res.error });
      if (deps.rollback) await deps.rollback(step);
      return { outcomes, committed: false };
    }
    outcomes.push({ step, status: 'executed' });

    // 3. verify
    const ok = deps.verify(step, res.data);
    if (!ok) {
      if (deps.rollback) await deps.rollback(step);
      outcomes.push({ step, status: 'rolled-back', error: 'verification failed' });
      return { outcomes, committed: false };
    }
    outcomes.push({ step, status: 'verified' });
  }

  return { outcomes, committed: true };
}
