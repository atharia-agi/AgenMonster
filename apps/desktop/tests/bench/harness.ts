// Performance Bench Harness — 6 micro-benchmarks for core operations.
// Run with: `node --test --experimental-strip-types tests/bench/*.bench.ts`

import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSec: number;
}

export interface BenchmarkConfig {
  name: string;
  fn: () => void | Promise<void>;
  iterations?: number;
  warmup?: number;
  timeoutMs?: number;
}

export async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const { name, fn, iterations = 1000, warmup = 100, timeoutMs = 30000 } = config;
  
  // Handle both sync and async functions
  const runFn = async () => {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
  };
  
  // Warmup
  for (let i = 0; i < warmup; i++) {
    await runFn();
  }
  
  const times: number[] = [];
  const startTotal = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    await runFn();
    const iterEnd = performance.now();
    times.push(iterEnd - iterStart);
    
    // Timeout check
    if (performance.now() - startTotal > timeoutMs) {
      console.warn(`[${name}] Timeout reached at iteration ${i}, stopping early`);
      break;
    }
  }
  
  const totalMs = performance.now() - startTotal;
  const sorted = [...times].sort((a, b) => a - b);
  
  return {
    name,
    iterations: times.length,
    totalMs,
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p50Ms: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    p99Ms: sorted[Math.floor(sorted.length * 0.99)],
    opsPerSec: (times.length / totalMs) * 1000,
  };
}

export function formatResult(result: BenchmarkResult): string {
  return [
    `  ${result.name}:`,
    `    iterations: ${result.iterations}`,
    `    total: ${result.totalMs.toFixed(2)}ms`,
    `    avg: ${result.avgMs.toFixed(4)}ms`,
    `    min: ${result.minMs.toFixed(4)}ms`,
    `    max: ${result.maxMs.toFixed(4)}ms`,
    `    p50: ${result.p50Ms.toFixed(4)}ms`,
    `    p95: ${result.p95Ms.toFixed(4)}ms`,
    `    p99: ${result.p99Ms.toFixed(4)}ms`,
    `    ops/sec: ${result.opsPerSec.toFixed(0)}`,
  ].join('\n');
}

export async function runBenchmarks(benchmarks: BenchmarkConfig[]): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  console.log('\n🏃 Running benchmarks...\n');
  
  for (const bench of benchmarks) {
    const result = await runBenchmark(bench);
    results.push(result);
    console.log(formatResult(result));
  }
  
  console.log('\n📊 Summary:');
  console.log(results.map(r => 
    `  ${r.name.padEnd(30)} avg: ${r.avgMs.toFixed(4).padStart(8)}ms  p95: ${r.p95Ms.toFixed(4).padStart(8)}ms  ${r.opsPerSec.toFixed(0).padStart(10)} ops/s`
  ).join('\n'));
  
  return results;
}

// Budget thresholds (ms) - CI will fail if exceeded
export const BENCHMARK_BUDGETS: Record<string, { avg: number; p95: number }> = {
  'agent-tool-call-parsing': { avg: 0.5, p95: 1.0 },
  'agent-tool-call-parsing-single': { avg: 0.1, p95: 0.2 },
  'mcp-tool-search': { avg: 3.0, p95: 10.0 },
  'select-relevant-tools': { avg: 1.0, p95: 3.0 },
  'tool-registry-metadata': { avg: 0.03, p95: 0.1 },
  'goal-parsing-from-text': { avg: 1.0, p95: 2.0 },
  'goal-intent-detection': { avg: 0.2, p95: 0.5 },
  'goal-title-derivation': { avg: 0.1, p95: 0.3 },
  'goal-step-splitting': { avg: 0.2, p95: 0.5 },
  'self-correction-evaluation': { avg: 2.0, p95: 5.0 },
  'weak-phrase-matching': { avg: 1.0, p95: 3.0 },
  'model-routing': { avg: 2.0, p95: 5.0 },
  'task-type-detection': { avg: 0.2, p95: 0.5 },
  'model-selection': { avg: 0.5, p95: 1.0 },
  'memory-semantic-search': { avg: 15.0, p95: 40.0 },
  'memory-prompt-retrieval': { avg: 10.0, p95: 30.0 },
  'top-topics': { avg: 0.5, p95: 1.0 },
  'memory-graph-build': { avg: 30.0, p95: 80.0 },
};

export function checkBudgets(results: BenchmarkResult | BenchmarkResult[]): boolean {
  const resultArray = Array.isArray(results) ? results : [results];
  let allPassed = true;
  
  for (const result of resultArray) {
    const budget = BENCHMARK_BUDGETS[result.name];
    if (!budget) continue;
    
    const avgPass = result.avgMs <= budget.avg;
    const p95Pass = result.p95Ms <= budget.p95;
    
    if (!avgPass || !p95Pass) {
      console.error(`\n❌ BUDGET EXCEEDED: ${result.name}`);
      console.error(`   avg: ${result.avgMs.toFixed(4)}ms (budget: ${budget.avg}ms) ${avgPass ? '✅' : '❌'}`);
      console.error(`   p95: ${result.p95Ms.toFixed(4)}ms (budget: ${budget.p95}ms) ${p95Pass ? '✅' : '❌'}`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('\n✅ All benchmarks within budget');
  }
  
  return allPassed;
}