// Multi-conversation threads — chat history scoped per thread, with a
// pointer in `chatActiveThreadId`. Threads persist alongside the rest of
// the game state and migrate cleanly with the existing v1 migration.
//
// Single-conversation shape (legacy):
//   chatMessages: Array<{...}>
//
// New multi-conversation shape:
//   chatThreads: Record<string, { id, title, messages, createdAt, updatedAt }>
//   chatActiveThreadId: string
//
// On first load we migrate legacy `chatMessages` into a single thread
// titled "Main". On every send we mutate the *active* thread only; on
// thread switch we swap what `getActiveMessages()` returns.

import { getGameState } from './gameState.ts';

export interface ChatThread {
  id: string;
  title: string;
  messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number; xpEarned?: number }>;
  createdAt: number;
  updatedAt: number;
}

export interface ThreadState {
  threads: Record<string, ChatThread>;
  activeId: string;
  order: string[]; // recent-first
}

export const THREAD_TITLE_MAX = 32;

export function createThread(title?: string): ChatThread {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: (title || 'New thread').slice(0, THREAD_TITLE_MAX),
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function newThreadState(): ThreadState {
  const id = crypto.randomUUID();
  return {
    threads: { [id]: { id, title: 'Main', messages: [], createdAt: Date.now(), updatedAt: Date.now() } },
    activeId: id,
    order: [id],
  };
}

export function getActiveMessages(thread: ThreadState): ChatThread['messages'] {
  return thread.threads[thread.activeId]?.messages ?? [];
}

export function appendToActive(
  thread: ThreadState,
  msg: ChatThread['messages'][number],
): ThreadState {
  const active = thread.threads[thread.activeId];
  if (!active) return thread;
  const nextMessages = [...active.messages, msg];
  const updated: ChatThread = { ...active, messages: nextMessages, updatedAt: Date.now() };
  return {
    ...thread,
    threads: { ...thread.threads, [updated.id]: updated },
  };
}

export function replaceActive(
  thread: ThreadState,
  predicate: (m: ChatThread['messages'][number], idx: number, arr: ChatThread['messages']) => boolean,
  replacement: ChatThread['messages'][number] | null,
): ThreadState {
  const active = thread.threads[thread.activeId];
  if (!active) return thread;
  const out: ChatThread['messages'] = [];
  let replaced = false;
  for (let i = 0; i < active.messages.length; i++) {
    const m = active.messages[i];
    if (!replaced && predicate(m, i, active.messages)) {
      if (replacement) out.push(replacement);
      replaced = true;
      continue;
    }
    out.push(m);
  }
  const updated: ChatThread = { ...active, messages: out, updatedAt: Date.now() };
  return {
    ...thread,
    threads: { ...thread.threads, [updated.id]: updated },
  };
}

export function switchThread(thread: ThreadState, id: string): ThreadState {
  if (!thread.threads[id]) return thread;
  // Move id to front of order.
  const order = [id, ...thread.order.filter((x) => x !== id)];
  return { ...thread, activeId: id, order };
}

export function deleteThread(thread: ThreadState, id: string): ThreadState {
  if (!thread.threads[id]) return thread;
  const threads = { ...thread.threads };
  delete threads[id];
  let order = thread.order.filter((x) => x !== id);
  if (order.length === 0) {
    const fresh = createThread('Main');
    threads[fresh.id] = fresh;
    order = [fresh.id];
  }
  const activeId = thread.activeId === id ? order[0] : thread.activeId;
  return { threads, activeId, order };
}

export function renameThread(thread: ThreadState, id: string, title: string): ThreadState {
  if (!thread.threads[id]) return thread;
  const cleaned = title.trim().slice(0, THREAD_TITLE_MAX);
  const updated: ChatThread = { ...thread.threads[id], title: cleaned || 'Untitled', updatedAt: Date.now() };
  return { ...thread, threads: { ...thread.threads, [id]: updated } };
}

// --- gameState integration ---

export function ensureThreadState(state: any): ThreadState {
  if (state.chatThreads && typeof state.chatThreads === 'object' && state.chatActiveThreadId) {
    return {
      threads: state.chatThreads,
      activeId: state.chatActiveThreadId,
      order: state.chatThreadOrder || Object.keys(state.chatThreads),
    };
  }
  // Migration from legacy chatMessages.
  const id = crypto.randomUUID();
  const now = Date.now();
  const legacy: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number; xpEarned?: number }> =
    state.chatMessages || [];
  const t: ChatThread = {
    id,
    title: 'Main',
    messages: legacy,
    createdAt: now,
    updatedAt: now,
  };
  state.chatThreads = { [id]: t };
  state.chatActiveThreadId = id;
  state.chatThreadOrder = [id];
  return { threads: state.chatThreads, activeId: id, order: [id] };
}

export function getThreadState(): ThreadState {
  const gs = getGameState() as any;
  return ensureThreadState(gs);
}
