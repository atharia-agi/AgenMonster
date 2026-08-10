// Agent skills registry — progressive disclosure pattern from OpenCode + Deep Agents.
// Skills are loaded lazily; only the description is injected into the system prompt
// until the agent actually invokes the skill.

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  whenToUse: string;
  prompt?: string;
  tools?: string[];
  model?: string;
  temperature?: number;
  maxSteps?: number;
  permissions?: Record<string, 'allow' | 'ask' | 'deny'>;
  metadata?: Record<string, string>;
}

const DEFAULT_SKILLS: AgentSkill[] = [
  {
    id: 'code-review',
    name: 'Code Reviewer',
    description: 'Review code for bugs, security issues, and best practices. Use when user asks to review, audit, or check code.',
    keywords: ['review', 'audit', 'check', 'inspect', 'security', 'bug', 'vulnerability'],
    whenToUse: 'User asks to review, audit, inspect, or check code quality',
    prompt: 'You are a senior code reviewer. Focus on: 1) Security vulnerabilities, 2) Logic bugs, 3) Performance issues, 4) Maintainability, 5) Best practices. Provide constructive feedback with specific line references.',
    model: 'claude-sonnet',
    temperature: 0.1,
  },
  {
    id: 'test-writer',
    name: 'Test Writer',
    description: 'Write unit tests, integration tests, and E2E tests for existing code. Use when user asks to test or add tests.',
    keywords: ['test', 'testing', 'unit test', 'integration test', 'e2e', 'coverage'],
    whenToUse: 'User asks to write tests, add test coverage, or verify code with tests',
    prompt: 'You are a test engineering expert. Write comprehensive tests covering: happy path, edge cases, error handling, and integration points. Use the project\'s existing test framework.',
    model: 'claude-sonnet',
    temperature: 0.2,
  },
  {
    id: 'debugger',
    name: 'Debugger',
    description: 'Diagnose errors, trace stack traces, and fix bugs. Use when user reports an error or bug.',
    keywords: ['debug', 'error', 'bug', 'fix', 'trace', 'stack trace', 'exception'],
    whenToUse: 'User reports an error, bug, or unexpected behavior',
    prompt: 'You are a debugging expert. systematically: 1) Read the error message and stack trace, 2) Locate the relevant code, 3) Identify the root cause, 4) Propose a minimal fix, 5) Verify the fix doesn\'t break related code.',
    model: 'claude-sonnet',
    temperature: 0.1,
  },
  {
    id: 'refactorer',
    name: 'Refactorer',
    description: 'Refactor code for better readability, performance, or architecture. Use when user asks to refactor or improve code.',
    keywords: ['refactor', 'clean', 'improve', 'optimize', 'restructure', 'reorganize'],
    whenToUse: 'User asks to refactor, clean up, or improve existing code',
    prompt: 'You are a refactoring expert. Improve code without changing behavior: 1) Extract functions, 2) Remove duplication, 3) Improve naming, 4) Simplify complex logic, 5) Apply design patterns where appropriate. Preserve all existing functionality.',
    model: 'claude-sonnet',
    temperature: 0.2,
  },
  {
    id: 'doc-writer',
    name: 'Documentation Writer',
    description: 'Write or update documentation, README, API docs, and comments. Use when user asks for documentation.',
    keywords: ['docs', 'documentation', 'readme', 'api docs', 'comments', 'explain'],
    whenToUse: 'User asks to document, write README, add comments, or explain code',
    prompt: 'You are a technical writer. Create clear, comprehensive documentation: 1) Overview and purpose, 2) Installation/setup, 3) Usage examples, 4) API reference, 5) Configuration options. Use markdown with code examples.',
    model: 'claude-haiku',
    temperature: 0.3,
  },
  {
    id: 'security-auditor',
    name: 'Security Auditor',
    description: 'Perform security audits, identify vulnerabilities, and suggest fixes. Use when user asks about security.',
    keywords: ['security', 'audit', 'vulnerability', 'xss', 'sql injection', 'csrf', 'owasp'],
    whenToUse: 'User asks for security review, audit, or mentions security concerns',
    prompt: 'You are a security expert. Audit code for: 1) OWASP Top 10 vulnerabilities, 2) Authentication/authorization flaws, 3) Data exposure risks, 4) Dependency vulnerabilities, 5) Configuration security. Provide severity ratings and fix recommendations.',
    model: 'claude-sonnet',
    temperature: 0.1,
  },
  {
    id: 'perf-optimizer',
    name: 'Performance Optimizer',
    description: 'Analyze and optimize performance: bundle size, render time, memory usage. Use when user asks about performance.',
    keywords: ['performance', 'optimize', 'slow', 'bundle', 'memory', 'cpu', 'render'],
    whenToUse: 'User asks to optimize performance, reduce bundle size, or fix slowness',
    prompt: 'You are a performance optimization expert. Analyze for: 1) Bundle size bloat, 2) Unnecessary re-renders, 3) Memory leaks, 4) N+1 queries, 5) Caching opportunities. Provide before/after metrics and implementation steps.',
    model: 'claude-sonnet',
    temperature: 0.2,
  },
  {
    id: 'migrator',
    name: 'Code Migrator',
    description: 'Migrate code between frameworks, versions, or patterns. Use when user asks to upgrade or migrate.',
    keywords: ['migrate', 'upgrade', 'port', 'convert', 'v2', 'v3', 'modernize'],
    whenToUse: 'User asks to migrate, upgrade, port, or modernize code',
    prompt: 'You are a migration expert. Plan and execute migrations: 1) Inventory affected files, 2) Map old APIs to new APIs, 3) Handle breaking changes, 4) Preserve behavior, 5) Update tests. Provide a migration checklist.',
    model: 'claude-sonnet',
    temperature: 0.2,
  },
];

let skillRegistry: AgentSkill[] = [...DEFAULT_SKILLS];
const skillUsage = new Map<string, { count: number; lastUsed: number }>();

export function registerSkill(skill: AgentSkill): void {
  const idx = skillRegistry.findIndex((s) => s.id === skill.id);
  if (idx >= 0) {
    skillRegistry[idx] = skill;
  } else {
    skillRegistry.push(skill);
  }
}

export function unregisterSkill(id: string): void {
  skillRegistry = skillRegistry.filter((s) => s.id !== id);
  skillUsage.delete(id);
}

export function getSkill(id: string): AgentSkill | undefined {
  return skillRegistry.find((s) => s.id === id);
}

export function getAllSkills(): AgentSkill[] {
  return [...skillRegistry];
}

export function getSkillsForQuery(query: string): AgentSkill[] {
  const lowered = query.toLowerCase();
  const words = lowered.split(/[\s,;.!?]+/).filter((w) => w.length > 2);

  const scored = skillRegistry.map((skill) => {
    let score = 0;
    for (const kw of skill.keywords) {
      if (lowered.includes(kw.toLowerCase())) score += 2;
    }
    for (const word of words) {
      if (skill.keywords.some((kw) => kw.toLowerCase().includes(word))) score += 1;
    }
    if (skill.whenToUse && lowered.includes(skill.whenToUse.toLowerCase().slice(0, 20))) score += 3;
    const usage = skillUsage.get(skill.id);
    if (usage) score += Math.min(usage.count * 0.1, 1);
    return { skill, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.skill);
}

export function recordSkillUsage(id: string): void {
  const existing = skillUsage.get(id);
  skillUsage.set(id, {
    count: (existing?.count || 0) + 1,
    lastUsed: Date.now(),
  });
}

export function getSkillDescriptionsForPrompt(): string {
  return skillRegistry
    .map((s) => `- **${s.name}** (${s.id}): ${s.description}`)
    .join('\n');
}

export function buildSkillPromptSection(query: string): string {
  const matched = getSkillsForQuery(query);
  if (matched.length === 0) return '';

  const lines = matched.map((s) => `## ${s.name}\n${s.description}\nWhen to use: ${s.whenToUse}`);
  return `\n\n## Relevant Skills\n${lines.join('\n\n')}\n\nInvoke a skill by name when it matches the task.`;
}

export function resetSkillRegistry(): void {
  skillRegistry = [...DEFAULT_SKILLS];
  skillUsage.clear();
}

export function isGeneratedSkill(skill: AgentSkill): boolean {
  return skill.metadata?.generated === 'true';
}

export function getGeneratedSkills(): AgentSkill[] {
  return skillRegistry.filter((s) => s.metadata?.generated === 'true');
}

export function getGeneratedSkillCount(): number {
  return skillRegistry.filter((s) => s.metadata?.generated === 'true').length;
}

export function getSkillUsage(): Map<string, { count: number; lastUsed: number }> {
  return new Map(skillUsage);
}

export function clearGeneratedSkills(): void {
  skillRegistry = skillRegistry.filter((s) => s.metadata?.generated !== 'true');
  for (const id of skillUsage.keys()) {
    if (!skillRegistry.some((s) => s.id === id)) skillUsage.delete(id);
  }
}
