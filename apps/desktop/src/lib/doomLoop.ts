// Doom loop detection: identifies when the agent is stuck in a repeating pattern
// of identical or near-identical tool calls.

export interface DoomLoopConfig {
  maxIdenticalCalls: number;
  maxNearIdenticalRatio: number;
  windowMs: number;
}

export interface ToolCallRecord {
  toolName: string;
  input: string;
  timestamp: number;
  result?: string;
}

export interface DoomLoopResult {
  isDoomLoop: boolean;
  identicalCount: number;
  nearIdenticalCount: number;
  matchedTool?: string;
  matchedInput?: string;
  suggestion?: string;
}

const DEFAULT_CONFIG: DoomLoopConfig = {
  maxIdenticalCalls: 3,
  maxNearIdenticalRatio: 0.8,
  windowMs: 60000,
};

export class DoomLoopDetector {
  private history: ToolCallRecord[] = [];
  private config: DoomLoopConfig;

  constructor(config: DoomLoopConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  record(toolName: string, input: string, result?: string): void {
    this.history.push({
      toolName,
      input: JSON.stringify(input),
      timestamp: Date.now(),
      result: result?.slice(0, 200),
    });
    this.prune();
  }

  check(toolName: string, input: string): DoomLoopResult {
    const inputStr = JSON.stringify(input);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const recent = this.history.filter(
      (r) => r.toolName === toolName && r.timestamp >= windowStart
    );

    const identical = recent.filter((r) => r.input === inputStr).length;
    if (identical >= this.config.maxIdenticalCalls) {
      return {
        isDoomLoop: true,
        identicalCount: identical + 1,
        nearIdenticalCount: 0,
        matchedTool: toolName,
        matchedInput: inputStr,
        suggestion: `Detected ${identical + 1} identical ${toolName} calls. Try a different approach or ask the user for guidance.`,
      };
    }

    const nearIdentical = recent.filter((r) => {
      if (!r.result) return false;
      const similarity = jaccardSimilarity(inputStr, r.input);
      return similarity >= this.config.maxNearIdenticalRatio;
    }).length;

    if (nearIdentical >= this.config.maxIdenticalCalls) {
      return {
        isDoomLoop: true,
        identicalCount: 0,
        nearIdenticalCount: nearIdentical + 1,
        matchedTool: toolName,
        matchedInput: inputStr,
        suggestion: `Detected ${nearIdentical + 1} near-identical ${toolName} calls. Try a different approach.`,
      };
    }

    return {
      isDoomLoop: false,
      identicalCount: identical,
      nearIdenticalCount: nearIdentical,
    };
  }

  reset(): void {
    this.history = [];
  }

  private prune(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.history = this.history.filter((r) => r.timestamp >= cutoff);
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let intersection = 0;
  for (const c of setA) {
    if (setB.has(c)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
