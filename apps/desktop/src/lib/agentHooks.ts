// Agent hooks — interceptor system inspired by Claude Agent SDK + Vercel AI SDK.
//
// Hook events:
//   PreToolUse   — before tool executes (can deny/allow/ask)
//   PostToolUse  — after tool succeeds (can log/retry/notify)
//   PostToolFailure — after tool fails
//   Stop         — agent decided to stop (can inspect/override)
//   Notification — agent wants to surface a message
//   Lifecycle    — agent started, step started, step ended, agent ended (Vercel pattern)

import { DoomLoopDetector } from './doomLoop.ts';
import { runInputGuardrails, runOutputGuardrails, createDangerousCommandGuardrail, createSensitiveFileGuardrail, createReadOnlyModeGuardrail, createOutputLengthGuardrail, type InputGuardrail, type OutputGuardrail } from './guardrails.ts';
import { getSkillsForQuery, registerSkill } from './agentSkills.ts';

export type PermissionDecision = 'allow' | 'deny' | 'ask' | 'defer' | 'retry';

export interface HookContext {
  signal?: AbortSignal;
  turnCount?: number;
  retryCount?: number;
  step?: number;
  runtimeContext?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PreToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id?: string;
}

export interface PostToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_result: unknown;
  tool_use_id?: string;
}

export interface HookOutput {
  permissionDecision?: PermissionDecision;
  permissionDecisionReason?: string;
  additionalContext?: string;
  async?: boolean;
  asyncTimeout?: number;
  modelOverride?: string;
  [key: string]: unknown;
}

export type PreToolUseHook = (input: PreToolUseInput, toolUseId: string | undefined, ctx: HookContext) => Promise<HookOutput> | HookOutput;
export type PostToolUseHook = (input: PostToolUseInput, toolUseId: string | undefined, ctx: HookContext) => Promise<HookOutput> | HookOutput;
export type StopHook = (input: { reason?: string; output?: string }, ctx: HookContext) => Promise<HookOutput> | HookOutput;
export type NotificationHook = (input: { message: string; level?: 'info' | 'warn' | 'error' }, ctx: HookContext) => Promise<HookOutput> | HookOutput;

// Vercel AI SDK lifecycle callbacks
export type LifecycleCallback = (ctx: HookContext) => void | Promise<void>;
export interface LifecycleHooks {
  onAgentStart?: LifecycleCallback;
  onStepStart?: LifecycleCallback;
  onStepEnd?: LifecycleCallback;
  onAgentEnd?: LifecycleCallback;
  onToolStart?: (toolName: string, input: Record<string, unknown>) => void | Promise<void>;
  onToolEnd?: (toolName: string, result: unknown) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

export interface HookMatcher {
  matcher: string;
  hooks: (PreToolUseHook | PostToolUseHook | StopHook | NotificationHook)[];
  timeout?: number;
}

export type HookEventType = 'PreToolUse' | 'PostToolUse' | 'PostToolFailure' | 'Stop' | 'Notification';

export interface HookRegistry {
  PreToolUse: HookMatcher[];
  PostToolUse: HookMatcher[];
  PostToolFailure: HookMatcher[];
  Stop: HookMatcher[];
  Notification: HookMatcher[];
}

export type PermissionMode = 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'auto';

export interface AgentHooksOptions {
  mode?: PermissionMode;
  allowedTools?: string[];
  disallowedTools?: string[];
  askRules?: string[];
  denyRules?: string[];
  canUseTool?: (toolName: string, input: Record<string, unknown>) => Promise<PermissionDecision> | PermissionDecision;
  hooks?: Partial<HookRegistry>;
  lifecycle?: LifecycleHooks;
}

// Tool classification for permission policies
const READ_ONLY_TOOLS = new Set([
  'memory.recall', 'memory.search', 'memory.episodes', 'memory.facts',
  'memory.topics', 'memory.graph', 'chat.stats', 'chat.tokens',
  'chat.budget', 'chat.theme', 'secondbrain.search', 'secondbrain.list',
  'secondbrain.read', 'secondbrain.recent', 'secondbrain.health',
  'secondbrain.graph_stats', 'secondbrain.recall', 'secondbrain.expand',
  'secondbrain.remember', 'secondbrain.timeline', 'secondbrain.audit',
  'secondbrain.inbox', 'secondbrain.commitments', 'secondbrain.next_moves',
  'browseros.take_snapshot', 'browseros.take_enhanced_snapshot',
  'browseros.take_screenshot', 'browseros.get_page_content',
  'browseros.get_page_links', 'browseros.get_dom', 'browseros.search_dom',
  'browseros.list_pages', 'browseros.list_windows',
  'browseros.list_tab_groups', 'browseros.get_active_page',
  'browseros.get_recent_history', 'browseros.search_history',
  'browseros.browseros_info', 'browseros.discover_categories_or_actions',
  'browseros.get_category_actions', 'browseros.get_action_details',
  'browseros.search_documentation',
]);

const EDIT_TOOLS = new Set([
  'memory.record', 'memory.topic.record', 'memory.episode.record',
  'memory.export', 'chat.budget.set', 'goal.create', 'goal.markdone',
  'goal.complete', 'secondbrain.append_note', 'secondbrain.create_note',
  'secondbrain.file_knowledge', 'secondbrain.log_session', 'secondbrain.run_sync',
  'secondbrain.graduate', 'secondbrain.promote', 'secondbrain.synthesize',
  'secondbrain.remote_sync', 'browseros.click', 'browseros.click_at',
  'browseros.double_click', 'browseros.right_click', 'browseros.fill',
  'browseros.clear', 'browseros.select_option', 'browseros.hover',
  'browseros.focus', 'browseros.press_key', 'browseros.scroll',
  'browseros.drag', 'browseros.upload_file', 'browseros.navigate',
  'browseros.go_back', 'browseros.go_forward', 'browseros.reload',
  'browseros.new_page', 'browseros.new_hidden_page', 'browseros.close_page',
  'browseros.show_page', 'browseros.activate_window', 'browseros.create_window',
  'browseros.create_hidden_window', 'browseros.close_window',
  'browseros.group_tabs', 'browseros.ungroup_tabs', 'browseros.move_page',
  'browseros.update_tab_group', 'browseros.close_tab_group',
  'browseros.create_bookmark', 'browseros.update_bookmark',
  'browseros.move_bookmark', 'browseros.remove_bookmark',
  'browseros.search_bookmarks', 'browseros.delete_history_url',
  'browseros.delete_history_range', 'browseros.save_pdf',
  'browseros.save_screenshot', 'browseros.download_file',
  'browseros.check', 'browseros.uncheck', 'browseros.handle_dialog',
  'browseros.handle_auth_failure', 'browseros.suggest_app_connection',
  'browseros.suggest_schedule', 'browseros.evaluate_script',
]);

const DANGEROUS_TOOLS = new Set([
  'browseros.execute_action',
]);

function toolMatches(matcher: string, toolName: string): boolean {
  if (matcher === '*') return true;
  if (matcher.startsWith('^') && matcher.endsWith('$')) {
    return new RegExp(matcher).test(toolName);
  }
  if (matcher.includes('*')) {
    const regex = new RegExp('^' + matcher.replace(/\*/g, '.*') + '$');
    return regex.test(toolName);
  }
  return matcher === toolName;
}

async function runHookMatchers(matchers: HookMatcher[], toolName: string, input: PreToolUseInput | PostToolUseInput | Record<string, unknown>, toolUseId: string | undefined, ctx: HookContext): Promise<HookOutput[]> {
  const results: HookOutput[] = [];
  for (const matcher of matchers) {
    if (!toolMatches(matcher.matcher, toolName)) continue;
    for (const hook of matcher.hooks) {
      try {
        const timeout = matcher.timeout || 30_000;
        const result = await Promise.race([
          Promise.resolve((hook as any)(input as any, toolUseId || '', ctx)),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('hook timeout')), timeout)),
        ]);
        if (result && typeof result === 'object') {
          results.push(result as HookOutput);
        }
      } catch (e) {
        console.warn(`[hooks] hook error for ${toolName}:`, e);
      }
    }
  }
  return results;
}

const DEFAULT_GUARDRAILS: InputGuardrail[] = [
  createDangerousCommandGuardrail(),
  createSensitiveFileGuardrail(),
];

const DEFAULT_OUTPUT_GUARDRAILS: OutputGuardrail[] = [
  createOutputLengthGuardrail(50000),
];

export class AgentHooks {
  private registry: HookRegistry;
  private mode: PermissionMode;
  private allowedTools: Set<string>;
  private disallowedTools: Set<string>;
  private askRules: RegExp[];
  private denyRules: RegExp[];
  private canUseTool?: (toolName: string, input: Record<string, unknown>) => Promise<PermissionDecision> | PermissionDecision;
  private lifecycle: LifecycleHooks;

  constructor(opts: AgentHooksOptions = {}) {
    this.mode = opts.mode || 'default';
    this.allowedTools = new Set(opts.allowedTools || []);
    this.disallowedTools = new Set(opts.disallowedTools || []);
    this.askRules = (opts.askRules || []).map(r => new RegExp(r));
    this.denyRules = (opts.denyRules || []).map(r => new RegExp(r));
    this.canUseTool = opts.canUseTool;
    this.lifecycle = opts.lifecycle || {};
    this.registry = {
      PreToolUse: [],
      PostToolUse: [],
      PostToolFailure: [],
      Stop: [],
      Notification: [],
      ...opts.hooks,
    };
  }

  addHook(event: HookEventType, matcher: HookMatcher): void {
    this.registry[event].push(matcher);
  }

  setLifecycleHooks(hooks: LifecycleHooks): void {
    this.lifecycle = { ...this.lifecycle, ...hooks };
  }

  getLifecycleHooks(): LifecycleHooks {
    return this.lifecycle;
  }

  async onAgentStart(ctx: HookContext = {}): Promise<void> {
    if (this.lifecycle.onAgentStart) {
      await this.lifecycle.onAgentStart(ctx);
    }
  }

  async onAgentEnd(ctx: HookContext = {}): Promise<void> {
    if (this.lifecycle.onAgentEnd) {
      await this.lifecycle.onAgentEnd(ctx);
    }
  }

  async onStepStart(step: number, toolName?: string, ctx: HookContext = {}): Promise<void> {
    if (this.lifecycle.onStepStart) {
      await this.lifecycle.onStepStart({ ...ctx, step });
    }
    if (toolName && this.lifecycle.onToolStart) {
      await this.lifecycle.onToolStart(toolName, {});
    }
  }

  async onStepEnd(step: number, result: unknown, ctx: HookContext = {}): Promise<void> {
    if (this.lifecycle.onStepEnd) {
      await this.lifecycle.onStepEnd({ ...ctx, step });
    }
    if (this.lifecycle.onToolEnd) {
      await this.lifecycle.onToolEnd('unknown', result);
    }
  }

  async onError(error: unknown, ctx: HookContext = {}): Promise<void> {
    if (this.lifecycle.onError) {
      await this.lifecycle.onError(error);
    }
  }

  async onPreToolUse(toolName: string, input: Record<string, unknown>, toolUseId?: string, ctx: HookContext = {}): Promise<HookOutput> {
    const preInput: PreToolUseInput = { tool_name: toolName, tool_input: input, tool_use_id: toolUseId };

    // 1. Run PreToolUse hooks
    const hookResults = await runHookMatchers(this.registry.PreToolUse, toolName, preInput, toolUseId, ctx);
    for (const result of hookResults) {
      if (result.permissionDecision === 'deny') {
        return { permissionDecision: 'deny', permissionDecisionReason: result.permissionDecisionReason || 'Denied by hook' };
      }
      if (result.permissionDecision === 'allow') {
        return { permissionDecision: 'allow', additionalContext: result.additionalContext };
      }
      if (result.permissionDecision === 'retry') {
        return { permissionDecision: 'retry', additionalContext: result.additionalContext, modelOverride: result.modelOverride };
      }
    }

    // 2. Check deny rules
    for (const rule of this.denyRules) {
      if (rule.test(toolName)) {
        return { permissionDecision: 'deny', permissionDecisionReason: `Denied by deny rule: ${rule}` };
      }
    }

    // 3. Check ask rules
    for (const rule of this.askRules) {
      if (rule.test(toolName)) {
        return { permissionDecision: 'ask', permissionDecisionReason: `Asking due to rule: ${rule}` };
      }
    }

    // 4. Apply permission mode
    if (this.mode === 'bypassPermissions') {
      return { permissionDecision: 'allow' };
    }
    if (this.mode === 'dontAsk') {
      if (this.allowedTools.size === 0 || this.allowedTools.has(toolName)) {
        return { permissionDecision: 'allow' };
      }
      return { permissionDecision: 'deny', permissionDecisionReason: 'Not in allowed tools' };
    }
    if (this.mode === 'acceptEdits') {
      if (READ_ONLY_TOOLS.has(toolName) || EDIT_TOOLS.has(toolName)) {
        return { permissionDecision: 'allow' };
      }
      return { permissionDecision: 'ask', permissionDecisionReason: 'acceptEdits mode: non-file tool requires approval' };
    }
    if (this.mode === 'plan') {
      if (READ_ONLY_TOOLS.has(toolName)) {
        return { permissionDecision: 'allow' };
      }
      return { permissionDecision: 'ask', permissionDecisionReason: 'Plan mode: edits require approval' };
    }
    if (this.mode === 'auto') {
      if (DANGEROUS_TOOLS.has(toolName)) {
        return { permissionDecision: 'ask', permissionDecisionReason: 'Auto mode: dangerous tool requires approval' };
      }
      return { permissionDecision: 'allow' };
    }

    // 5. Default: ask for non-read-only tools
    if (this.allowedTools.size > 0 && !this.allowedTools.has(toolName)) {
      return { permissionDecision: 'deny', permissionDecisionReason: 'Not in allowed tools list' };
    }
    if (this.disallowedTools.has(toolName)) {
      return { permissionDecision: 'deny', permissionDecisionReason: 'Explicitly disallowed' };
    }

    if (READ_ONLY_TOOLS.has(toolName)) {
      return { permissionDecision: 'allow' };
    }

    if (EDIT_TOOLS.has(toolName) || DANGEROUS_TOOLS.has(toolName)) {
      return { permissionDecision: 'ask', permissionDecisionReason: 'Default mode: edit/dangerous tool requires approval' };
    }

    // 6. canUseTool callback
    if (this.canUseTool) {
      const decision = await this.canUseTool(toolName, input);
      return { permissionDecision: decision };
    }

    return { permissionDecision: 'ask', permissionDecisionReason: 'Default mode: unknown tool requires approval' };
  }

  async onPostToolUse(toolName: string, input: Record<string, unknown>, result: unknown, toolUseId?: string, ctx: HookContext = {}): Promise<HookOutput[]> {
    const postInput: PostToolUseInput = { tool_name: toolName, tool_input: input, tool_result: result, tool_use_id: toolUseId };
    return runHookMatchers(this.registry.PostToolUse, toolName, postInput, toolUseId, ctx);
  }

  async onPostToolFailure(toolName: string, input: Record<string, unknown>, error: Error, toolUseId?: string, ctx: HookContext = {}): Promise<HookOutput[]> {
    const postInput: PostToolUseInput = { tool_name: toolName, tool_input: input, tool_result: { error: error.message }, tool_use_id: toolUseId };
    return runHookMatchers(this.registry.PostToolFailure, toolName, postInput, toolUseId, ctx);
  }

  async onStop(reason?: string, output?: string, ctx: HookContext = {}): Promise<HookOutput[]> {
    return runHookMatchers(this.registry.Stop, 'stop', { reason, output }, undefined, ctx);
  }

  async onNotification(message: string, level: 'info' | 'warn' | 'error' = 'info', ctx: HookContext = {}): Promise<HookOutput[]> {
    return runHookMatchers(this.registry.Notification, 'notification', { message, level }, undefined, ctx);
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode;
  }

  getAllowedTools(): string[] {
    return Array.from(this.allowedTools);
  }

  getDisallowedTools(): string[] {
    return Array.from(this.disallowedTools);
  }
}
