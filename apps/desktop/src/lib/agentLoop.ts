// Agent self-tool-call — production-grade parser with hook integration.
//
// Upgrades from v1 (pure regex parser) to a full agent loop with:
//   - PreToolUse hooks (cost guard, permission system, sandbox)
//   - PostToolUse hooks (logging, self-correction, retry)
//   - Tool search (reduce context bloat from 106 tools)
//   - Retry with provider fallback
//   - Stop detection and output cleaning
//   - Deep Agents patterns: filesystem, skills, task planning, subagent delegation

import { parseAgentToolCall, type AgentToolCall } from './agentToolCall.ts';
import { handleTool, type ToolResult, TOOLS, SECOND_BRAIN_TOOLS, BROWSEROS_TOOLS } from './mcp.ts';
import { AgentHooks, type HookContext, type HookOutput } from './agentHooks.ts';
import { selectRelevantTools, searchTools, type ToolDef } from './toolRegistry.ts';
import { loadCaps, decideCall, type SpendSnapshot } from './costGuard.ts';
import { DoomLoopDetector } from './doomLoop.ts';
import { logger, withTiming } from './logger.ts';
import { createBeliefState, computeTurnCredits, recordTrajectoryCredit, type BeliefState } from './creditAssignment.ts';
import { getComputeBudgetForQuery, getUserComputeDirective, type ComputeBudget } from './adaptiveCompute.ts';
import { shouldRehearse, rehearseToolCall, type RehearsalResult } from './worldRehearsal.ts';
import { addRefinementPair, loadCorpus, type RefinementCorpus } from './refinementTuning.ts';

export interface AgentLoopOptions {
  hooks?: AgentHooks;
  maxTurns?: number;
  retryLimit?: number;
  providerFallback?: () => string;
  onToolCall?: (call: AgentToolCall, result: ToolResult) => void;
  onStop?: (output: string) => void;
  onRetry?: (attempt: number, reason: string) => void;
  onNotification?: (message: string, level: 'info' | 'warn' | 'error') => void;
  onStepStart?: (step: number, toolName?: string) => void;
  onStepEnd?: (step: number, result: ToolResult) => void;
  onError?: (error: unknown) => void;
  doomLoopDetector?: DoomLoopDetector;
}

export interface AgentLoopResult {
  output: string;
  toolCalls: AgentToolCall[];
  toolResults: ToolResult[];
  turnsUsed: number;
  retries: number;
  stopped: boolean;
  needsRetry: boolean;
}

// Weak phrases that indicate the agent should retry.
// Matched with regex word boundaries to reduce false positives from substring hits.
// Context exclusions: if the phrase is followed by a justification clause
// ("because...", "since...", "as...", "to..."), it is treated as a legitimate
// limitation explanation, not a model refusal.
const WEAK_PHRASES = [
  "i'm sorry",
  "i cannot assist",
  "i can't help",
  "i'm unable to assist",
  "as an ai",
  "i don't have access",
  "i'm not able to",
  "i'm not allowed to",
  "i'm not permitted to",
  "i don't have the ability",
  "i'm just a language model",
  "i don't have the capability",
];

const LEGITIMATE_FOLLOW_UPS = [
  'because',
  'since',
  'as',
  'to',
  'due to',
  'given that',
  'as the',
  'in this',
  'in that',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesWeakPhrase(text: string, phrase: string): boolean {
  const escaped = escapeRegex(phrase);
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  const match = regex.exec(text);
  if (!match) return false;
  const after = text.slice(match.index + match[0].length).trim();
  const firstWord = after.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (LEGITIMATE_FOLLOW_UPS.includes(firstWord)) return false;
  return true;
}

function isWeakReply(text: string): boolean {
  return WEAK_PHRASES.some((phrase) => matchesWeakPhrase(text, phrase));
}

function cleanAgentOutput(text: string): string {
  const parsed = parseAgentToolCall(text);
  if (!parsed) return text;
  return text.replace(parsed.raw, '').trim();
}

// ---------- Deep Agents patterns ----------

export interface TaskPlan {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  keywords: string[];
}

export interface FilesystemToolContext {
  rootDir?: string;
  readOnly?: boolean;
  allowedPaths?: string[];
  deniedPaths?: string[];
}

const DEFAULT_SKILLS: AgentSkill[] = [
  {
    id: 'deep-research',
    name: 'Deep Research',
    description: 'Multi-source research with citation tracking',
    keywords: ['research', 'find', 'search', 'investigate', 'explore'],
    content: '# Deep Research Skill\nUse web search, fetch, and memory search to build comprehensive answers with sources.',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Systematic code review with security and performance checks',
    keywords: ['review', 'audit', 'check', 'inspect', 'analyze', 'evaluate'],
    content: '# Code Review Skill\nCheck: security, performance, maintainability, tests, accessibility.',
  },
  {
    id: 'task-planning',
    name: 'Task Planning',
    description: 'Break complex tasks into executable steps',
    keywords: ['plan', 'design', 'architect', 'outline', 'roadmap', 'strategy'],
    content: '# Task Planning Skill\n1. Understand requirements 2. Break into steps 3. Prioritize 4. Execute 5. Verify.',
  },
];

let skillRegistry: AgentSkill[] = DEFAULT_SKILLS;
let taskPlanStore: TaskPlan[] = [];

export function registerSkill(skill: AgentSkill): void {
  skillRegistry = [...skillRegistry.filter((s) => s.id !== skill.id), skill];
}

export function getSkillsForQuery(query: string): AgentSkill[] {
  const lowered = query.toLowerCase();
  return skillRegistry
    .map((s) => ({
      skill: s,
      score: s.keywords.reduce((acc, kw) => acc + (lowered.includes(kw) ? 1 : 0), 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.skill);
}

export function createTaskPlan(title: string): TaskPlan {
  const plan: TaskPlan = {
    id: crypto.randomUUID(),
    title,
    status: 'pending',
    createdAt: Date.now(),
  };
  taskPlanStore = [...taskPlanStore, plan];
  return plan;
}

export function updateTaskPlan(id: string, status: TaskPlan['status']): TaskPlan | null {
  const idx = taskPlanStore.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  taskPlanStore[idx] = { ...taskPlanStore[idx], status };
  return taskPlanStore[idx];
}

export function getTaskPlans(): TaskPlan[] {
  return [...taskPlanStore];
}

export function clearTaskPlans(): void {
  taskPlanStore = [];
}

export function createDefaultHooks(snap: SpendSnapshot): AgentHooks {
  const caps = loadCaps();
  return new AgentHooks({
    mode: 'default',
    hooks: {
      PreToolUse: [
        {
          matcher: '*',
          hooks: [
            async (input: any): Promise<HookOutput> => {
              const toolName = input.tool_name;
              const toolInput = input.tool_input;
              const decision = decideCall(caps, snap);
              if (decision.level === 'block') {
                return {
                  permissionDecision: 'deny',
                  permissionDecisionReason: 'Blocked by cost guard',
                };
              }
              if (decision.level === 'warn') {
                return {
                  permissionDecision: 'ask',
                  permissionDecisionReason: 'Approaching cost cap',
                };
              }
              return { permissionDecision: 'allow' };
            },
          ],
          timeout: 5_000,
        },
      ],
      PostToolUse: [
        {
          matcher: '*',
          hooks: [
            async (input: any): Promise<HookOutput> => {
              if (input.tool_result && typeof input.tool_result === 'object') {
                const result = input.tool_result as ToolResult;
                if (!result.ok) {
                  return {
                    permissionDecision: 'retry',
                    additionalContext: `Tool failed: ${result.error || 'unknown error'}`,
                  };
                }
              }
              return {};
            },
          ],
          timeout: 5_000,
        },
      ],
    },
  });
}

export async function runAgentLoop(
  rawReply: string,
  options: AgentLoopOptions = {},
): Promise<AgentLoopResult> {
  const {
    hooks,
    maxTurns = 20,
    retryLimit = 3,
    providerFallback,
    onToolCall,
    onStop,
    onRetry,
    onNotification,
    onStepStart,
    onStepEnd,
    onError,
  } = options;

  const toolCalls: AgentToolCall[] = [];
  const toolResults: ToolResult[] = [];
  let turnsUsed = 0;
  let retries = 0;
  let stopped = false;
  let currentReply = rawReply;
  let remainingRetries = retryLimit;
  const ctx: HookContext = { turnCount: 0, retryCount: 0 };
  const loopCorrelationId = logger.newCorrelationId();
  const loopLogger = logger.withCorrelationId(loopCorrelationId).child({ component: 'agentLoop' });

  const beliefState = createBeliefState();
  const turnLogProbs: number[][] = [];
  const trajectoryId = loopCorrelationId;

  loopLogger.debug('Agent loop started', { maxTurns, retryLimit, hasProviderFallback: !!providerFallback });

  return withTiming('agentLoop.run', async () => {
    try {
      while (true) {
        const turnMark = `agentLoop.turn.${turnsUsed + 1}`;
        performance.mark(`${turnMark}.start`);
        
        const parsed = parseAgentToolCall(currentReply);
        if (!parsed) {
          performance.mark(`${turnMark}.end`);
          performance.measure(turnMark, `${turnMark}.start`, `${turnMark}.end`);
          
          const cleaned = cleanAgentOutput(currentReply);
          if (isWeakReply(cleaned) && remainingRetries > 0 && providerFallback) {
            retries++;
            remainingRetries--;
            onRetry?.(retries, 'Weak reply detected');
            loopLogger.warn('Weak reply detected, requesting retry', { retries, remainingRetries });
            return {
              output: cleaned,
              toolCalls: [],
              toolResults: [],
              turnsUsed: 1,
              retries,
              stopped: false,
              needsRetry: true,
            };
          }
          return {
            output: cleaned,
            toolCalls: [],
            toolResults: [],
            turnsUsed: 0,
            retries,
            stopped: false,
            needsRetry: false,
          };
        }

        const toolName = parsed.name;
        const toolInput = parsed.params;

        if (hooks) {
          const preResult = await Promise.resolve(
            hooks.onPreToolUse(toolName, toolInput, parsed.raw, ctx)
          );
          if (preResult.permissionDecision === 'deny') {
            const denyResult: ToolResult = {
              ok: false,
              error: preResult.permissionDecisionReason || 'Denied by permission system',
            };
            toolCalls.push(parsed);
            toolResults.push(denyResult);
            onToolCall?.(parsed, denyResult);
            loopLogger.warn('Tool denied by permission system', { toolName, reason: preResult.permissionDecisionReason });
            return {
              output: cleanAgentOutput(currentReply),
              toolCalls,
              toolResults,
              turnsUsed: 1,
              retries,
              stopped: false,
              needsRetry: false,
            };
          }
          if (preResult.permissionDecision === 'ask') {
            onNotification?.(`Approval needed: ${toolName}`, 'warn');
          }
          if (preResult.permissionDecision === 'retry') {
            retries++;
            onRetry?.(retries, preResult.additionalContext || 'Retry requested by hook');
          }
        }

        onStepStart?.(turnsUsed + 1, toolName);
        loopLogger.info('Executing tool', { toolName, turn: turnsUsed + 1 });

        const doomDetector = options.doomLoopDetector;
        if (doomDetector) {
          const doomCheck = doomDetector.check(toolName, JSON.stringify(toolInput));
          if (doomCheck.isDoomLoop) {
            onNotification?.(`🔄 Doom loop detected: ${doomCheck.suggestion}`, 'warn');
            const doomResult: ToolResult = {
              ok: false,
              error: `Doom loop: ${doomCheck.suggestion}`,
            };
            toolCalls.push(parsed);
            toolResults.push(doomResult);
            onToolCall?.(parsed, doomResult);
            loopLogger.warn('Doom loop detected', { toolName, suggestion: doomCheck.suggestion });
            return {
              output: cleanAgentOutput(currentReply),
              toolCalls,
              toolResults,
              turnsUsed: 1,
              retries,
              stopped: false,
              needsRetry: false,
            };
          }
        }

        const toolMark = `agentLoop.tool.${toolName}`;
        performance.mark(`${toolMark}.start`);
        const result = handleTool(toolName, toolInput);
        performance.mark(`${toolMark}.end`);
        performance.measure(toolMark, `${toolMark}.start`, `${toolMark}.end`);
        
        toolCalls.push(parsed);
        toolResults.push(result);
        onToolCall?.(parsed, result);
        loopLogger.info('Tool executed', { toolName, ok: result.ok, durationMs: performance.getEntriesByName(toolMark)[0]?.duration });

        onStepEnd?.(turnsUsed + 1, result);

        if (hooks) {
          const postResults = await Promise.resolve(
            hooks.onPostToolUse(toolName, toolInput, result, parsed.raw, ctx)
          );
          for (const postResult of postResults) {
            if (postResult.permissionDecision === 'retry' && retries < retryLimit) {
              retries++;
              onRetry?.(retries, postResult.additionalContext || 'Post-tool retry');
            }
          }
        }

        if (result.ok && result.data && typeof result.data === 'object') {
          const data = result.data as Record<string, unknown>;
          if ('done' in data || 'complete' in data || 'finished' in data) {
            stopped = true;
            if (hooks) {
              await Promise.resolve(hooks.onStop('Task completed', undefined, ctx));
            }
            onStop?.(cleanAgentOutput(currentReply));
            loopLogger.info('Task completed, stopping loop');
          }
        }

        turnsUsed++;
        performance.mark(`${turnMark}.end`);
        performance.measure(turnMark, `${turnMark}.start`, `${turnMark}.end`);

        return {
          output: cleanAgentOutput(currentReply),
          toolCalls,
          toolResults,
          turnsUsed,
          retries,
          stopped,
          needsRetry: false,
        };
      }
    } catch (e: unknown) {
      onError?.(e);
      loopLogger.error('Agent loop error', { error: String(e) });
      return {
        output: cleanAgentOutput(currentReply),
        toolCalls,
        toolResults,
        turnsUsed,
        retries,
        stopped,
        needsRetry: false,
      };
    }
  }, { component: 'agentLoop', correlationId: loopCorrelationId });
}

export async function runMultiTurnAgentLoop(
  replies: string[],
  options: AgentLoopOptions = {},
): Promise<AgentLoopResult> {
  const allToolCalls: AgentToolCall[] = [];
  const allToolResults: ToolResult[] = [];
  let totalTurns = 0;
  let totalRetries = 0;
  let lastOutput = '';

  for (const reply of replies) {
    const result = await runAgentLoop(reply, options);
    allToolCalls.push(...result.toolCalls);
    allToolResults.push(...result.toolResults);
    totalTurns += result.turnsUsed;
    totalRetries += result.retries;
    lastOutput = result.output;

    if (result.stopped) break;
    if (result.needsRetry) break;
  }

  return {
    output: lastOutput,
    toolCalls: allToolCalls,
    toolResults: allToolResults,
    turnsUsed: totalTurns,
    retries: totalRetries,
    stopped: false,
    needsRetry: false,
  };
}

// ---------- Real multi-turn chat loop ----------
//
// runAgentChatLoop() drives a GENUINE feedback loop: it sends the conversation
// to the LLM, executes any tool call the reply contains, feeds the tool result
// back into the conversation, and asks the LLM for the next turn — repeating
// until the LLM stops emitting tool calls, a `done` flag is returned by a tool,
// or maxTurns is exhausted. This is the difference between a one-shot tool
// invocation and an actual autonomous agent.

export interface AgentChatTurn {
  role: string;
  content: string;
}

export interface RunAgentChatLoopOptions {
  hooks?: AgentHooks;
  maxTurns?: number;
  retryLimit?: number;
  riskTolerance?: number;
  providerFallback?: () => string;
  onToolCall?: (call: AgentToolCall, result: ToolResult) => void;
  onRetry?: (attempt: number, reason: string) => void;
  onNotification?: (message: string, level: 'info' | 'warn' | 'error') => void;
  onStepStart?: (step: number, toolName?: string) => void;
  onStepEnd?: (step: number, result: ToolResult) => void;
  onError?: (error: unknown) => void;
  doomLoopDetector?: DoomLoopDetector;
  /** Override tool execution. Defaults to sync handleTool; pass an async
   *  bridge (e.g. /api/mcp) to reach secondbrain.* and browseros.* tools. */
  executeTool?: (name: string, params: Record<string, unknown>) => Promise<ToolResult> | ToolResult;
}

export interface RunAgentChatLoopResult {
  /** Concatenated clean assistant text across all turns (markers stripped). */
  output: string;
  toolCalls: AgentToolCall[];
  toolResults: ToolResult[];
  turnsUsed: number;
  retries: number;
  stopped: boolean;
  needsRetry: boolean;
  /** The conversation history as it stood when the loop ended. Lets the caller
   *  resume/retry from the exact same context instead of restarting from scratch
   *  (provider switch mid-task must not lose what the agent already did). */
  history: AgentChatTurn[];
}

const HIGH_RISK_AGENT_TOOLS = new Set([
  'memory.export', 'memory.forget', 'memory.episode.forget',
  'goal.complete', 'goal.delete',
  'chat.budget.set',
]);

const MUTATING_AGENT_TOOLS = new Set([
  'memory.record', 'memory.topic.record', 'memory.episode.record',
  'goal.create', 'goal.markdone',
  'chat.theme',
]);

export async function runAgentChatLoop(
  initialReply: string,
  initialHistory: AgentChatTurn[],
  getNextReply: (history: AgentChatTurn[]) => Promise<string>,
  options: RunAgentChatLoopOptions = {},
): Promise<RunAgentChatLoopResult> {
  const {
    hooks,
    maxTurns = 5,
    retryLimit = 1,
    riskTolerance = 0.5,
    providerFallback,
    onToolCall,
    onRetry,
    onNotification,
    onStepStart,
    onStepEnd,
    onError,
  } = options;
  const executeTool = options.executeTool
    ? async (n: string, p: Record<string, unknown>) => await options.executeTool!(n, p)
    : async (n: string, p: Record<string, unknown>) => handleTool(n, p);

  const toolCalls: AgentToolCall[] = [];
  const toolResults: ToolResult[] = [];
  const outputParts: string[] = [];
  let turnsUsed = 0;
  let retries = 0;
  let stopped = false;
  let remainingRetries = retryLimit;
  let currentReply = initialReply;
  let history = [...initialHistory];
  const ctx: HookContext = { turnCount: 0, retryCount: 0 };
  const correlationId = logger.newCorrelationId();
  const loopLogger = logger.withCorrelationId(correlationId).child({ component: 'agentLoop.chat' });
  const trajectoryId = correlationId;

  const beliefState = createBeliefState();
  const turnLogProbs: number[][] = [];
  const refinementCorpus = loadCorpus();

  let adaptiveMaxTurns = maxTurns;
  const userDirective = getUserComputeDirective(initialHistory.filter(t => t.role === 'user').pop()?.content || '');
  if (userDirective === 'deep') adaptiveMaxTurns = maxTurns;
  else if (userDirective === 'quick') adaptiveMaxTurns = Math.min(2, maxTurns);

  loopLogger.debug('Multi-turn agent loop started', { maxTurns, adaptiveMaxTurns, retryLimit });

  return withTiming('agentLoop.chat.run', async () => {
    try {
      while (true) {
        const turn = turnsUsed + 1;
        ctx.turnCount = turn;
        const parsed = parseAgentToolCall(currentReply);
        const cleanTurn = cleanAgentOutput(currentReply);

        // No tool call → the agent is done reasoning; emit final text.
        if (!parsed) {
          const trimmed = cleanTurn.trim();
          if (trimmed) outputParts.push(trimmed);
          const output = outputParts.join('\n\n').trim();
          const weak = isWeakReply(output || trimmed);
          if (weak && remainingRetries > 0 && providerFallback) {
            retries++;
            remainingRetries--;
            onRetry?.(retries, 'Weak reply detected');
            loopLogger.warn('Weak final reply, requesting retry', { retries });
            return { output, toolCalls, toolResults, turnsUsed: Math.max(1, turn - 1), retries, stopped, needsRetry: true, history };
          }
          return { output, toolCalls, toolResults, turnsUsed: Math.max(1, turn - 1), retries, stopped, needsRetry: false, history };
        }

        const toolName = parsed.name;
        const toolInput = parsed.params;

        // Personality gating (parity with dispatchAgentTool).
        if (HIGH_RISK_AGENT_TOOLS.has(toolName) && riskTolerance < 0.7) {
          if (cleanTurn) outputParts.push(cleanTurn);
          outputParts.push(`🛡️ [risk guard] ${toolName} requires higher risk tolerance (current ${Math.round(riskTolerance * 100)}%).`);
          turnsUsed = turn;
          return { output: outputParts.join('\n\n').trim(), toolCalls, toolResults, turnsUsed, retries, stopped, needsRetry: false, history };
        }
        if (MUTATING_AGENT_TOOLS.has(toolName) && riskTolerance < 0.3) {
          if (cleanTurn) outputParts.push(cleanTurn);
          outputParts.push(`⚠️ [caution] ${toolName} modifies state. Low risk tolerance (${Math.round(riskTolerance * 100)}%).`);
          turnsUsed = turn;
          return { output: outputParts.join('\n\n').trim(), toolCalls, toolResults, turnsUsed, retries, stopped, needsRetry: false, history };
        }

        if (hooks) {
          const preResult = await Promise.resolve(hooks.onPreToolUse(toolName, toolInput, parsed.raw, ctx));
          if (preResult.permissionDecision === 'deny') {
            const denyResult: ToolResult = { ok: false, error: preResult.permissionDecisionReason || 'Denied by permission system' };
            toolCalls.push(parsed);
            toolResults.push(denyResult);
            onToolCall?.(parsed, denyResult);
            turnsUsed = turn;
            return { output: outputParts.join('\n\n').trim(), toolCalls, toolResults, turnsUsed, retries, stopped, needsRetry: false, history };
          }
          if (preResult.permissionDecision === 'ask') {
            onNotification?.(`Approval needed: ${toolName}`, 'warn');
          }
        }

        if (options.doomLoopDetector) {
          const doom = options.doomLoopDetector.check(toolName, JSON.stringify(toolInput));
          if (doom.isDoomLoop) {
            onNotification?.(`🔄 Doom loop detected: ${doom.suggestion}`, 'warn');
            const doomResult: ToolResult = { ok: false, error: `Doom loop: ${doom.suggestion}` };
            toolCalls.push(parsed);
            toolResults.push(doomResult);
            onToolCall?.(parsed, doomResult);
            turnsUsed = turn;
            return { output: outputParts.join('\n\n').trim(), toolCalls, toolResults, turnsUsed, retries, stopped, needsRetry: false, history };
          }
        }

        onStepStart?.(turn, toolName);
        loopLogger.info('Executing tool', { toolName, turn });

        if (shouldRehearse(toolName, toolInput, { mode: 'light', confidenceThreshold: 0.6, maxLatencyMs: 500, enabled: true })) {
          const rehearsal = await rehearseToolCall(
            toolName,
            toolInput,
            { mode: 'light', confidenceThreshold: 0.6, maxLatencyMs: 500, enabled: true },
            (t, i) => null,
            (t) => null,
            async (t, i) => `simulated: ${t}`
          );
          if (rehearsal && rehearsal.confidence > 0.7) {
            loopLogger.debug('Rehearsal confidence high', { toolName, confidence: rehearsal.confidence, source: rehearsal.source });
          }
        }

        const result = await executeTool(toolName, toolInput);
        toolCalls.push(parsed);
        toolResults.push(result);
        onToolCall?.(parsed, result);
        onStepEnd?.(turn, result);

        if (cleanTurn) outputParts.push(cleanTurn);
        turnsUsed = turn;

        if (!result.ok && result.error) {
          addRefinementPair(refinementCorpus, {
            originalTrajectory: `${toolName}: ${JSON.stringify(toolInput)}`,
            refinedTrajectory: `retry with adjusted params`,
            outcome: 'failure',
            context: toolName,
            source: 'agent-loop',
          });
        }

        if (hooks) {
          const postResults = await Promise.resolve(hooks.onPostToolUse(toolName, toolInput, result, parsed.raw, ctx));
          for (const postResult of postResults) {
            if (postResult.permissionDecision === 'retry' && retries < retryLimit) {
              retries++;
              onRetry?.(retries, postResult.additionalContext || 'Post-tool retry');
            }
          }
        }

        // Terminal flag from a tool (e.g. goal.complete → {done:true}).
        if (result.ok && result.data && typeof result.data === 'object') {
          const data = result.data as Record<string, unknown>;
          if ('done' in data || 'complete' in data || 'finished' in data) {
            stopped = true;
            if (hooks) await Promise.resolve(hooks.onStop('Task completed', undefined, ctx));
            loopLogger.info('Task completed via tool flag, stopping loop');
            break;
          }
        }

        if (turnsUsed >= maxTurns) {
          loopLogger.warn('Max turns reached', { maxTurns });
          break;
        }

        // Feed the tool result back into the conversation and ask for the next turn.
        history = [
          ...history,
          { role: 'assistant', content: cleanTurn || `[called ${toolName}]` },
          { role: 'tool', content: `${toolName}: ${result.ok ? JSON.stringify(result.data) : result.error}` },
        ];
        loopLogger.info('Requesting next LLM turn', { turn });

        // Provider failure mid-task: retry the SAME next-turn request on a
        // fallback provider so the agent does not lose what it already did.
        // AbortError (user cancel) is rethrown so the caller can cancel cleanly.
        try {
          currentReply = (await getNextReply(history)).trim();
        } catch (err: unknown) {
          const errMsg = String((err as Error)?.message ?? err);
          const isAbort =
            (err as Error)?.name === 'AbortError' ||
            errMsg.toLowerCase().includes('abort') ||
            errMsg.toLowerCase().includes('cancelled');
          if (isAbort) throw err;
          if (remainingRetries > 0 && providerFallback) {
            retries++;
            remainingRetries--;
            onRetry?.(retries, `Provider failed mid-loop (${errMsg})`);
            const nextProvider = providerFallback();
            loopLogger.warn('Provider failed mid-loop, switching and retrying', { nextProvider, error: errMsg });
            try {
              currentReply = (await getNextReply(history)).trim();
            } catch (err2: unknown) {
              loopLogger.error('Fallback provider also failed mid-loop', { error: String(err2) });
              currentReply = '';
            }
          } else {
            currentReply = '';
          }
          if (!currentReply) {
            loopLogger.warn('Stopping loop after provider failure');
            break;
          }
        }
        if (!currentReply) {
          loopLogger.warn('Empty next reply, stopping loop');
          break;
        }
      }

      const output = outputParts.join('\n\n').trim();
      const weak = isWeakReply(output);
      if (weak && remainingRetries > 0 && providerFallback) {
        retries++;
        remainingRetries--;
        onRetry?.(retries, 'Weak reply detected');
        return { output, toolCalls, toolResults, turnsUsed, retries, stopped, needsRetry: true, history };
      }

      const finalOutcome = stopped ? 'success' : toolResults.some(r => !r.ok) ? 'partial' : 'success';
      if (turnLogProbs.length > 0) {
        const credits = computeTurnCredits(beliefState, turnLogProbs, finalOutcome === 'success' ? 1.0 : -0.5);
        recordTrajectoryCredit(trajectoryId, credits.turnCredits, finalOutcome);
      }

      return { output, toolCalls, toolResults, turnsUsed, retries, stopped, needsRetry: false, history };
    } catch (e: unknown) {
      // User cancel must propagate so the caller can drop the placeholder and
      // stop cleanly — never convert an abort into a "finished" agent result.
      const errName = (e as Error)?.name;
      const errMsg = String((e as Error)?.message ?? e).toLowerCase();
      if (errName === 'AbortError' || errMsg.includes('abort') || errMsg.includes('cancel')) {
        throw e;
      }
      onError?.(e);
      loopLogger.error('Multi-turn agent loop error', { error: String(e) });
      return {
        output: outputParts.join('\n\n').trim(),
        toolCalls,
        toolResults,
        turnsUsed,
        retries,
        stopped,
        needsRetry: false,
        history,
      };
    }
  }, { component: 'agentLoop', correlationId });
}

// ---------- Deep Agents: filesystem middleware ----------
import { getDefaultFileSystem, type FileSystemEntry } from './filesystem.ts';

const fs = getDefaultFileSystem();

export async function listFiles(dir = '/'): Promise<FileSystemEntry[]> {
  return fs.listDirectory(dir);
}

export async function readFile(path: string): Promise<{ content: string; error?: string }> {
  return fs.readFile(path);
}

export async function writeFile(path: string, content: string): Promise<{ ok: boolean; error?: string }> {
  return fs.writeFile(path, content);
}

export async function editFile(path: string, oldText: string, newText: string): Promise<{ ok: boolean; error?: string }> {
  return fs.editFile(path, oldText, newText);
}

export async function deleteFile(path: string): Promise<{ ok: boolean; error?: string }> {
  return fs.delete(path);
}

export async function searchFiles(query: string, dir = '/'): Promise<string[]> {
  return fs.grep(query, dir);
}
