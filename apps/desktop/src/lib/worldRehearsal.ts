export type RehearsalMode = 'skip' | 'light' | 'full';

export interface RehearsalResult {
  predictedResponse: string;
  confidence: number;
  source: 'causal-memory' | 'world-graph' | 'llm-simulation';
  latencyMs: number;
}

export interface RehearsalConfig {
  mode: RehearsalMode;
  confidenceThreshold: number;
  maxLatencyMs: number;
  enabled: boolean;
}

export const DEFAULT_REHEARSAL_CONFIG: RehearsalConfig = {
  mode: 'light',
  confidenceThreshold: 0.6,
  maxLatencyMs: 500,
  enabled: true,
};

export async function rehearseToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  config: RehearsalConfig,
  getCausalOutcome: (tool: string, input: any) => { outcome: string; confidence: number } | null,
  getWorldGraphContext: (tool: string) => string | null,
  llmSimulate: (tool: string, input: any) => Promise<string>
): Promise<RehearsalResult | null> {
  if (!config.enabled || config.mode === 'skip') {
    return null;
  }

  const start = performance.now();

  if (config.mode === 'light') {
    const causal = getCausalOutcome(toolName, toolInput);
    if (causal && causal.confidence >= config.confidenceThreshold) {
      return {
        predictedResponse: causal.outcome,
        confidence: causal.confidence,
        source: 'causal-memory',
        latencyMs: performance.now() - start,
      };
    }

    const graphCtx = getWorldGraphContext(toolName);
    if (graphCtx) {
      return {
        predictedResponse: graphCtx,
        confidence: 0.5,
        source: 'world-graph',
        latencyMs: performance.now() - start,
      };
    }
  }

  if (config.mode === 'full') {
    try {
      const simulated = await llmSimulate(toolName, toolInput);
      return {
        predictedResponse: simulated,
        confidence: 0.7,
        source: 'llm-simulation',
        latencyMs: performance.now() - start,
      };
    } catch {
      return null;
    }
  }

  return null;
}

export function shouldRehearse(
  toolName: string,
  toolInput: Record<string, unknown>,
  config: RehearsalConfig,
  highStakesTools: string[] = ['goal.create', 'goal.complete', 'memory.record', 'agent.start']
): boolean {
  if (!config.enabled || config.mode === 'skip') return false;

  const isHighStakes = highStakesTools.includes(toolName);
  const hasDestructiveInput = JSON.stringify(toolInput).includes('delete') ||
                              JSON.stringify(toolInput).includes('remove') ||
                              JSON.stringify(toolInput).includes('drop');

  return isHighStakes || hasDestructiveInput;
}
