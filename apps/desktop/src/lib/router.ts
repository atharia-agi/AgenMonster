// Task-aware LLM routing — the web "agent loop" Router / ModelSelector.
// Per the architecture RFC, the system picks the best available provider+model
// for each task type (chat / code / creative / vision / fast / summarize /
// analyze), falling back to whatever providers the server actually exposes.
//
// The server (vite.config.ts / server.mjs) decides which providers are
// available from its env keys; this module only chooses among them.

import type { ProviderInfo } from './llm';
import { getTopTopics } from './memory.ts';

export type TaskType =
  | 'chat'
  | 'code'
  | 'creative'
  | 'vision'
  | 'fast'
  | 'summarize'
  | 'analyze';

// Preferred (provider, model) per task type, in priority order.
const ROUTING: Record<TaskType, Array<{ provider: string; model: string }>> = {
  chat: [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  code: [
    { provider: 'mistral', model: 'codestral-latest' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ],
  creative: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ],
  vision: [{ provider: 'openai', model: 'gpt-4o' }],
  fast: [
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ],
  summarize: [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  analyze: [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'openai', model: 'gpt-4o' },
  ],
};

// Keyword heuristics to detect the task type from free text.
const KEYWORDS: Record<TaskType, string[]> = {
  vision: ['image', 'screenshot', 'picture', 'describe this', 'what do you see', 'look at'],
  code: ['code', 'function', 'bug', 'debug', 'typescript', 'javascript', 'python', 'sql', 'regex', 'class', 'compile', 'refactor', 'algorithm'],
  summarize: ['summarize', 'summary', 'tldr', 'key points', 'recap'],
  fast: ['quick', 'short', 'tl;dr', 'briefly', 'one line', 'in one sentence'],
  analyze: ['analyze', 'why', 'explain', 'compare', 'pros and cons', 'evaluate', 'reasoning'],
  creative: ['write', 'story', 'poem', 'song', 'lyrics', 'brainstorm', 'imagine', 'creative', 'joke', 'roleplay'],
  chat: [],
};

// Soft topic map: when one of these topics is among the user's top topics, the
// corresponding task type gets its ROUTING list reordered so the provider that
// best matches the topic rises to the front.
const TOPIC_TO_TASK: Record<string, TaskType> = {
  typescript: 'code',
  javascript: 'code',
  python: 'code',
  rust: 'code',
  go: 'code',
  sql: 'code',
  react: 'code',
  svelte: 'code',
  docker: 'code',
  aws: 'analyze',
  deploy: 'analyze',
  test: 'code',
};

export function detectTaskType(text: string): TaskType {
  const t = ` ${text.toLowerCase()} `;
  const order: TaskType[] = ['vision', 'code', 'summarize', 'fast', 'analyze', 'creative', 'chat'];
  for (const type of order) {
    for (const kw of KEYWORDS[type]) {
      if (t.includes(kw)) return type;
    }
  }
  return 'chat';
}

// Choose the best available (provider, model) for a task type.
// `available` is the list from GET /api/llm/providers (server-decided).
export function selectModel(
  taskType: TaskType,
  available: ProviderInfo[]
): { provider: string; model: string } | null {
  const avail = new Set<string>(available.map((p) => p.id));
  for (const cand of ROUTING[taskType]) {
    if (avail.has(cand.provider)) {
      const provider = available.find((p) => p.id === cand.provider)!;
      const model = provider.models.includes(cand.model) ? cand.model : provider.models[0];
      return { provider: cand.provider, model };
    }
  }
  if (available.length) return { provider: available[0].id, model: available[0].models[0] };
  return null;
}

// Full routing for a message: detect task type, then select the model.
// `available` is the list from GET /api/llm/providers (server-decided).
export function routeMessage(
  text: string,
  available: ProviderInfo[]
): { taskType: TaskType; provider: string; model: string; topicBias?: string } | null {
  const taskType = detectTaskType(text);
  const sel = selectModel(taskType, available);
  if (!sel) return null;

  const avail = new Set<string>(available.map((p) => p.id));
  let topicBias: string | undefined;
  const topTopics = getTopTopics(5);
  for (const topic of topTopics) {
    const mapped = TOPIC_TO_TASK[topic.topic];
    if (mapped && mapped === taskType && topic.count >= 3) {
      topicBias = topic.topic;
      const preferred = ROUTING[taskType].find((c) => c.provider === sel.provider);
      if (preferred) {
        const reordered = [preferred, ...ROUTING[taskType].filter((c) => c.provider !== preferred.provider)];
        for (const cand of reordered) {
          if (avail.has(cand.provider)) {
            const provider = available.find((p) => p.id === cand.provider)!;
            const model = provider.models.includes(cand.model) ? cand.model : provider.models[0];
            return { taskType, provider: cand.provider, model, topicBias };
          }
        }
      }
      break;
    }
  }

  return { taskType, provider: sel.provider, model: sel.model, topicBias };
}
