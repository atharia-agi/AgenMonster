// Session compaction: summarizes long agent conversations
// Inspired by OpenCode compaction agent + OpenAI Agents SDK compaction

import { rememberEvent, getMemoriesForPrompt } from './memory.ts';

export interface CompactionConfig {
  maxChars: number;
  maxTurns: number;
  summaryPrompt?: string;
}

export interface CompactionResult {
  summary: string;
  originalTurnCount: number;
  compressedCharCount: number;
  originalCharCount: number;
  ratio: number;
  messages: Array<{ role: string; content: string }>;
}

const DEFAULT_CONFIG: CompactionConfig = {
  maxChars: 8000,
  maxTurns: 20,
  summaryPrompt: `Summarize this conversation concisely. Preserve:
- Key decisions made
- Files modified
- Errors encountered and fixes
- Current task status
- Next steps

Format as a brief bullet list.`,
};

export function shouldCompact(
  messages: Array<{ role: string; content: string }>,
  config: CompactionConfig = DEFAULT_CONFIG
): boolean {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const userAssistant = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  return (
    totalChars > config.maxChars ||
    userAssistant.length > config.maxTurns
  );
}

export function compactMessages(
  messages: Array<{ role: string; content: string }>,
  config: CompactionConfig = DEFAULT_CONFIG
): CompactionResult {
  const originalCharCount = messages.reduce((sum, m) => sum + m.content.length, 0);
  const originalTurnCount = messages.filter((m) => m.role === 'user' || m.role === 'assistant').length;

  const summary = generateSummary(messages, config);

  const compacted: Array<{ role: string; content: string }> = [
    { role: 'system', content: `[Compacted session summary]\n${summary}\n[End summary]` },
  ];

  const recent = messages.slice(-6);
  for (const msg of recent) {
    if (msg.role !== 'system') {
      compacted.push(msg);
    }
  }

  const compressedCharCount = compacted.reduce((sum, m) => sum + m.content.length, 0);
  const ratio = originalCharCount > 0 ? compressedCharCount / originalCharCount : 1;

  return {
    summary,
    originalTurnCount,
    compressedCharCount,
    originalCharCount,
    ratio,
    messages: compacted,
  };
}

function generateSummary(
  messages: Array<{ role: string; content: string }>,
  config: CompactionConfig
): string {
  const userMessages = messages.filter((m) => m.role === 'user').slice(-10);
  const assistantMessages = messages.filter((m) => m.role === 'assistant').slice(-10);

  const bullets: string[] = [];

  bullets.push(`- Conversation turns: ${userMessages.length} user, ${assistantMessages.length} assistant`);

  for (const msg of userMessages.slice(-5)) {
    bullets.push(`- User: ${msg.content.slice(0, 120)}${msg.content.length > 120 ? '...' : ''}`);
  }

  for (const msg of assistantMessages.slice(-3)) {
    const snippet = msg.content.slice(0, 120);
    bullets.push(`- Assistant: ${snippet}${msg.content.length > 120 ? '...' : ''}`);
  }

  if (bullets.length === 1) {
    bullets.push('- No significant activity');
  }

  return bullets.join('\n');
}

export function estimateCompactionSavings(
  messages: Array<{ role: string; content: string }>,
  config: CompactionConfig = DEFAULT_CONFIG
): { currentChars: number; estimatedAfterChars: number; savings: number } {
  const currentChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const recentChars = messages.slice(-6).reduce((sum, m) => sum + m.content.length, 0);
  const summaryChars = 500;
  const estimatedAfterChars = summaryChars + recentChars;
  const savings = currentChars - estimatedAfterChars;

  return {
    currentChars,
    estimatedAfterChars,
    savings: Math.max(0, savings),
  };
}
