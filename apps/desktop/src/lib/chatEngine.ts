// chatEngine — pure, testable units of the chat send pipeline.
// Streaming orchestration (Svelte-rune-bound) stays in ChatPanel.svelte;
// everything side-effect-light and logic-dense lives here.

import { estimateCost, getDailySpend, getTokenState } from './tokenTracker.ts';
import { loadCaps, decideCall, type CallDecision } from './costGuard.ts';
import { rememberEvent } from './memory.ts';
import { handleTool } from './mcp.ts';
import { parseAgentToolCall } from './agentToolCall.ts';

export interface CostGuardResult {
  decision: CallDecision;
  estimatedCost: number;
  totalProvSpend: number;
}

/**
 * Evaluate whether an LLM call may proceed under the configured budget caps.
 * Uses a pre-flight cost estimate so over-budget calls are hard-blocked
 * BEFORE any network request fires.
 */
export function evaluateCostGuard(
  provider: string,
  model: string,
  promptText: string,
  estimatedCompletionChars = 700,
): CostGuardResult {
  const caps = loadCaps();
  const dailySpend = getDailySpend();
  const state = getTokenState();
  const totalProvSpend = Object.entries(state.byRoute).reduce(
    (acc, [k, r]) => (k.startsWith(provider) ? acc + (r as any).cost : acc),
    0,
  );
  const estimatedCost = estimateCost(provider, model, promptText, estimatedCompletionChars);
  const decision = decideCall(caps, {
    callUsd: estimatedCost,
    provider,
    totalUsdProvider: totalProvSpend,
    dailyUsdProvider: dailySpend.byProvider[provider] || 0,
    dailyUsdTotal: dailySpend.total,
  });
  return { decision, estimatedCost, totalProvSpend };
}

/** Classify an LLM stream error as transient (worth one silent retry) or fatal. */
export function isTransientError(e: any): boolean {
  const msg = String(e?.message || '').toLowerCase();
  return (
    e?.name === 'AbortError' ||
    msg.includes('aborted') ||
    msg.includes('429') ||
    msg.includes('rate') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('500')
  );
}

export function isAbortError(e: any): boolean {
  const msg = String(e?.message || '').toLowerCase();
  return e?.name === 'AbortError' || msg.includes('aborted');
}

export interface ToolDispatchResult {
  /** Reply text with the raw `__AGENT_MCP__` marker stripped. */
  stripped: string;
  /** Render note for the chat bubble (tool JSON or error), '' if no tool call. */
  toolNote: string;
  /** Whether a tool call was found and executed. */
  called: boolean;
}

/**
 * Parse an LLM reply for an `__AGENT_MCP__:name|json` tool call, execute it
 * via the MCP dispatcher, and produce the display note for the chat bubble.
 * Logs a memory episode for successful tool calls (same as pre-refactor).
 */
export function dispatchAgentTool(reply: string): ToolDispatchResult {
  const toolCall = parseAgentToolCall(reply);
  if (!toolCall) return { stripped: reply, toolNote: '', called: false };

  const stripped = reply.replace(toolCall.raw, '').trim();
  let toolNote: string;
  try {
    const r = handleTool(toolCall.name, toolCall.params);
    if (r.ok) {
      rememberEvent({
        kind: 'success',
        title: `tool:${toolCall.name}`,
        detail: JSON.stringify(r.data).slice(0, 120),
        tags: ['agent-tool', toolCall.name.split('.')[0]],
        confidence: 0.85,
      });
      toolNote = `\n\n🔧 [tool: ${toolCall.name}]\n\`\`\`json\n${JSON.stringify(r.data, null, 2).slice(0, 600)}\n\`\`\``;
    } else {
      toolNote = `\n\n⚠️ [tool error: ${toolCall.name}] ${r.error}`;
    }
  } catch (e: any) {
    toolNote = `\n\n⚠️ [tool error: ${toolCall.name}] ${e?.message || 'unknown'}`;
  }
  return { stripped, toolNote, called: true };
}
