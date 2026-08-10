// Agent mode system: plan vs build modes
// Plan mode = read-only, no file writes or bash
// Build mode = full access

export type AgentMode = 'plan' | 'build' | 'review' | 'explore';

export interface ModeConfig {
  mode: AgentMode;
  label: string;
  description: string;
  permissions: PermissionConfig;
  color: string;
}

export interface PermissionConfig {
  read: PermissionAction;
  edit: PermissionAction;
  bash: PermissionAction;
  glob: PermissionAction;
  grep: PermissionAction;
  list: PermissionAction;
  task: PermissionAction;
  skill: PermissionAction;
  webfetch: PermissionAction;
  websearch: PermissionAction;
  doom_loop: PermissionAction;
  external_directory: PermissionAction;
  question: PermissionAction;
  lsp: PermissionAction;
}

export type PermissionAction = 'allow' | 'ask' | 'deny' | { [pattern: string]: PermissionAction };

export interface PermissionRule {
  tool: string;
  action: PermissionAction;
  pattern?: string;
}

export interface PermissionContext {
  toolName: string;
  toolInput?: string;
  filePath?: string;
  bashCommand?: string;
  subagentType?: string;
  skillName?: string;
  url?: string;
}

export function resolvePermission(
  config: PermissionConfig,
  ctx: PermissionContext
): PermissionAction {
  const toolKey = ctx.toolName as keyof PermissionConfig;
  const raw = config[toolKey];
  if (!raw) return 'ask';

  if (typeof raw === 'string') return raw;

  const input = ctx.toolInput || ctx.bashCommand || ctx.filePath || ctx.url || '';
  const entries = Object.entries(raw);
  let matched: PermissionAction = 'ask';
  for (const [pattern, action] of entries) {
    if (pattern === '*') {
      matched = action;
    } else if (matchPattern(pattern, input)) {
      matched = action;
    }
  }
  return matched;
}

export function matchPattern(pattern: string, input: string): boolean {
  const regex = new RegExp(
    '^' + pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{DOUBLE_STAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/{{DOUBLE_STAR}}/g, '.*') + '$'
  );
  return regex.test(input);
}

export const DEFAULT_MODES: Record<AgentMode, ModeConfig> = {
  plan: {
    mode: 'plan',
    label: 'Plan',
    description: 'Analysis and planning without making changes',
    color: '#50b8a0',
    permissions: {
      read: 'allow',
      edit: 'deny',
      bash: 'deny',
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      task: { '*': 'deny' },
      skill: 'ask',
      webfetch: 'ask',
      websearch: 'ask',
      doom_loop: 'ask',
      external_directory: 'ask',
      question: 'ask',
      lsp: 'allow',
    },
  },
  build: {
    mode: 'build',
    label: 'Build',
    description: 'Full development work with all tools enabled',
    color: '#e85050',
    permissions: {
      read: 'allow',
      edit: 'allow',
      bash: 'ask',
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      task: 'ask',
      skill: 'ask',
      webfetch: 'ask',
      websearch: 'ask',
      doom_loop: 'ask',
      external_directory: 'ask',
      question: 'ask',
      lsp: 'allow',
    },
  },
  review: {
    mode: 'review',
    label: 'Review',
    description: 'Code review with read-only access plus documentation tools',
    color: '#90c878',
    permissions: {
      read: 'allow',
      edit: 'deny',
      bash: { '*': 'ask', 'git diff*': 'allow', 'git log*': 'allow', 'grep *': 'allow' },
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      task: { '*': 'deny' },
      skill: 'ask',
      webfetch: 'deny',
      websearch: 'ask',
      doom_loop: 'ask',
      external_directory: 'ask',
      question: 'ask',
      lsp: 'allow',
    },
  },
  explore: {
    mode: 'explore',
    label: 'Explore',
    description: 'Fast read-only exploration of codebase',
    color: '#8888ff',
    permissions: {
      read: 'allow',
      edit: 'deny',
      bash: 'deny',
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      task: { '*': 'deny' },
      skill: 'ask',
      webfetch: 'ask',
      websearch: 'ask',
      doom_loop: 'ask',
      external_directory: 'ask',
      question: 'ask',
      lsp: 'allow',
    },
  },
};

export function getModeConfig(mode: AgentMode): ModeConfig {
  return DEFAULT_MODES[mode];
}

export function isModeReadOnly(mode: AgentMode): boolean {
  return mode === 'plan' || mode === 'review' || mode === 'explore';
}
