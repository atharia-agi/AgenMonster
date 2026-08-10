// Subagent orchestration — spawn, route, and collect results from
// specialized sub-agents. Inspired by Vercel AI SDK subagents and
// Claude Agent SDK subagent tools.
//
// Architecture:
//   Orchestrator agent → delegates to subagents via tool calls
//   Each subagent has its own: model, tools, system prompt, memory

import type { AgentToolCall } from './agentToolCall.ts';
import { AgentHooks } from './agentHooks.ts';

export type SubagentId = string;

export interface SubagentSpec {
  id: SubagentId;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  model?: string;
  maxTurns?: number;
  temperature?: number;
}

export interface SubagentResult {
  subagentId: SubagentId;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  output: string;
  toolCalls: AgentToolCall[];
  turnsUsed: number;
  startedAt: number;
  finishedAt: number;
  error?: string;
}

export interface SubagentContext {
  parentGoalId?: string;
  parentTaskId?: string;
  workingDir?: string;
  files?: string[];
  constraints?: string[];
}

type SubagentHandler = (spec: SubagentSpec, context: SubagentContext, input: string) => Promise<SubagentResult>;

class SubagentRegistry {
  private specs = new Map<SubagentId, SubagentSpec>();
  private handlers = new Map<SubagentId, SubagentHandler>();
  private results = new Map<SubagentId, SubagentResult>();

  register(spec: SubagentSpec, handler: SubagentHandler): void {
    this.specs.set(spec.id, spec);
    this.handlers.set(spec.id, handler);
  }

  unregister(id: SubagentId): void {
    this.specs.delete(id);
    this.handlers.delete(id);
    this.results.delete(id);
  }

  getSpec(id: SubagentId): SubagentSpec | undefined {
    return this.specs.get(id);
  }

  getAllSpecs(): SubagentSpec[] {
    return Array.from(this.specs.values());
  }

  getHandler(id: SubagentId): SubagentHandler | undefined {
    return this.handlers.get(id);
  }

  recordResult(id: SubagentId, result: SubagentResult): void {
    this.results.set(id, result);
  }

  getResult(id: SubagentId): SubagentResult | undefined {
    return this.results.get(id);
  }
}

const registry = new SubagentRegistry();

export function registerSubagent(spec: SubagentSpec, handler: SubagentHandler): void {
  registry.register(spec, handler);
}

export function unregisterSubagent(id: SubagentId): void {
  registry.unregister(id);
}

export function getSubagentSpec(id: SubagentId): SubagentSpec | undefined {
  return registry.getSpec(id);
}

export function getAllSubagentSpecs(): SubagentSpec[] {
  return registry.getAllSpecs();
}

export async function spawnSubagent(
  id: SubagentId,
  input: string,
  context: SubagentContext = {}
): Promise<SubagentResult> {
  const spec = registry.getSpec(id);
  if (!spec) {
    return {
      subagentId: id,
      status: 'error',
      output: '',
      toolCalls: [],
      turnsUsed: 0,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      error: `Unknown subagent: ${id}`,
    };
  }

  const handler = registry.getHandler(id);
  if (!handler) {
    return {
      subagentId: id,
      status: 'error',
      output: '',
      toolCalls: [],
      turnsUsed: 0,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      error: `No handler registered for subagent: ${id}`,
    };
  }

  try {
    const result = await handler(spec, context, input);
    registry.recordResult(id, result);
    return result;
  } catch (e: unknown) {
    const errorResult: SubagentResult = {
      subagentId: id,
      status: 'error',
      output: '',
      toolCalls: [],
      turnsUsed: 0,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      error: e instanceof Error ? e.message : String(e),
    };
    registry.recordResult(id, errorResult);
    return errorResult;
  }
}

// Built-in subagent specs for common tasks
export const BUILTIN_SUBAGENTS: SubagentSpec[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Deep research on a topic using web search and memory',
    systemPrompt: 'You are a research specialist. Search memory and external sources to gather comprehensive information.',
    tools: ['memory.recall', 'memory.search', 'memory.episodes', 'memory.topics'],
    maxTurns: 10,
  },
  {
    id: 'coder',
    name: 'Coder',
    description: 'Code editing and refactoring specialist',
    systemPrompt: 'You are a coding specialist. Read code, propose edits, and explain changes clearly.',
    tools: ['memory.recall', 'memory.record', 'memory.search'],
    maxTurns: 15,
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Break down complex goals into executable steps',
    systemPrompt: 'You are a planning specialist. Analyze goals and create detailed step-by-step plans.',
    tools: ['goal.list', 'goal.create', 'memory.recall', 'memory.search'],
    maxTurns: 8,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Review and validate outputs from other agents',
    systemPrompt: 'You are a critical reviewer. Evaluate outputs for correctness, completeness, and quality.',
    tools: ['memory.recall', 'memory.search', 'memory.episodes'],
    maxTurns: 6,
  },
];

// Register built-in subagents with default handlers
BUILTIN_SUBAGENTS.forEach((spec) => {
  registerSubagent(spec, async (s, ctx, input) => {
    const start = Date.now();
    // Default handler: return a structured result indicating the subagent
    // was invoked. Real implementation would call the LLM with the
    // subagent's system prompt and tools.
    return {
      subagentId: s.id,
      status: 'success' as const,
      output: `[${s.name}] Processed: ${input.slice(0, 100)}`,
      toolCalls: [],
      turnsUsed: 1,
      startedAt: start,
      finishedAt: Date.now(),
    };
  });
});
