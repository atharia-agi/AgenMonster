// Guardrails: input/output/tool validation for agentic coding
// Inspired by OpenAI Agents SDK guardrails pattern

export interface GuardrailContext {
  toolName: string;
  toolInput: unknown;
  toolOutput?: unknown;
  userMessage: string;
  systemPrompt: string;
  agentMode: string;
}

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
  severity: 'info' | 'warn' | 'block';
  metadata?: Record<string, unknown>;
}

export type InputGuardrail = (ctx: GuardrailContext) => GuardrailResult | Promise<GuardrailResult>;
export type OutputGuardrail = (ctx: GuardrailContext) => GuardrailResult | Promise<GuardrailResult>;
export type ToolGuardrail = (ctx: GuardrailContext) => GuardrailResult | Promise<GuardrailResult>;

const DANGEROUS_BASH_PATTERNS = [
  /\brm\s+-rf\s+\//,
  /\bmv\s+\/etc\//,
  /\bsudo\b/,
  /\bchmod\s+777\b/,
  /\bdd\s+if=/,
  /\bformat\b/,
  /\bmkfs\b/,
  /\b shred\b/,
  /\bcurl\s+.*\|\s*sh\b/,
  /\bwget\s+.*\|\s*sh\b/,
];

const DANGEROUS_EDIT_PATTERNS = [
  /\.env$/,
  /\.env\./,
  /credentials/,
  /secrets/,
  /private_key/,
  /password/,
  /token/,
];

export function createDangerousCommandGuardrail(): InputGuardrail {
  return (ctx: GuardrailContext) => {
    if (ctx.toolName !== 'bash') return { passed: true, severity: 'info' };
    const input = ctx.toolInput as any;
    const cmd = String(input?.command || input?.args || input?.script || ctx.toolInput || '');
    for (const pattern of DANGEROUS_BASH_PATTERNS) {
      if (pattern.test(cmd)) {
        return {
          passed: false,
          reason: `Blocked dangerous bash command: ${cmd.slice(0, 100)}`,
          severity: 'block',
          metadata: { pattern: pattern.source },
        };
      }
    }
    return { passed: true, severity: 'info' };
  };
}

export function createSensitiveFileGuardrail(): InputGuardrail {
  return (ctx: GuardrailContext) => {
    const editTools = ['edit', 'write', 'apply_patch'];
    if (!editTools.includes(ctx.toolName)) return { passed: true, severity: 'info' };
    const input = ctx.toolInput as any;
    const path = input?.path || input?.file_path || input?.filename || '';
    for (const pattern of DANGEROUS_EDIT_PATTERNS) {
      if (pattern.test(path)) {
        return {
          passed: false,
          reason: `Blocked edit to sensitive file: ${path}`,
          severity: 'block',
          metadata: { pattern: pattern.source },
        };
      }
    }
    return { passed: true, severity: 'info' };
  };
}

export function createReadOnlyModeGuardrail(): InputGuardrail {
  return (ctx: GuardrailContext) => {
    const writeTools = ['edit', 'write', 'apply_patch', 'bash'];
    if (ctx.agentMode === 'plan' && writeTools.includes(ctx.toolName)) {
      return {
        passed: false,
        reason: `Plan mode blocks ${ctx.toolName}. Switch to Build mode to make changes.`,
        severity: 'block',
        metadata: { mode: ctx.agentMode },
      };
    }
    return { passed: true, severity: 'info' };
  };
}

export function createOutputLengthGuardrail(maxChars = 50000): OutputGuardrail {
  return (ctx: GuardrailContext) => {
    if (ctx.toolOutput == null) return { passed: true, severity: 'info' };
    const output = JSON.stringify(ctx.toolOutput);
    if (output.length > maxChars) {
      return {
        passed: true,
        reason: `Tool output truncated from ${output.length} to ${maxChars} chars`,
        severity: 'warn',
        metadata: { originalLength: output.length, truncatedLength: maxChars },
      };
    }
    return { passed: true, severity: 'info' };
  };
}

export async function runInputGuardrails(
  guardrails: InputGuardrail[],
  ctx: GuardrailContext
): Promise<GuardrailResult> {
  for (const guardrail of guardrails) {
    const result = await guardrail(ctx);
    if (!result.passed) return result;
  }
  return { passed: true, severity: 'info' };
}

export async function runOutputGuardrails(
  guardrails: OutputGuardrail[],
  ctx: GuardrailContext
): Promise<GuardrailResult> {
  for (const guardrail of guardrails) {
    const result = await guardrail(ctx);
    if (!result.passed) return result;
  }
  return { passed: true, severity: 'info' };
}
