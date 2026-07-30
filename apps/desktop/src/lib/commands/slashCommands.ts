// Slash commands — pure command handlers extracted from ChatPanel.
// Each handler receives the parsed input and an `append` callback for chat output.
// Returns 'handled', 'async', or null (not a slash command).

import { upsertFact, forgetFact, getMemoryState, getTopTopics, exportMemoryJSON, importMemoryJSON } from '../memory.ts';
import { downloadMemoryMarkdown } from '../memory.ts';
import { downloadChatMarkdown } from '../persistence.ts';
import { getChatStats, msLabel } from '../chatStatsStore.svelte.ts';
import { loadCaps, describeCaps } from '../costGuard.ts';
import { getDailySpend, getTokenState } from '../tokenTracker.ts';
import { getGameState } from '../gameState.ts';
import {
  getThreadState, switchThread, deleteThread, renameThread, createThread, ensureThreadState,
} from '../threads.ts';
import { buildGoalFromText, type Goal } from '../goals.ts';
import { runDailyRecap } from '../dailyRecap.ts';

export interface SlashMsg {
  role: 'assistant';
  content: string;
}

export type AppendFn = (msg: SlashMsg) => void;

const PERSONA_STORAGE_KEY = 'agenmonster_persona';

function saveGameState(): void {
  try { window.dispatchEvent(new Event('gamestate-change')); } catch {}
}

function downloadBlob(content: string, filename: string, type: string): void {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {}
}

// ---------- individual handlers ----------

function cmdRemember(args: string, append: AppendFn): void {
  const idx = args.indexOf(':');
  if (idx > 0) {
    const key = args.slice(0, idx).trim();
    const value = args.slice(idx + 1).trim();
    if (key && value) {
      upsertFact(key, value, 0.9);
      append({ role: 'assistant', content: `Remembered: ${key} = ${value}` });
      return;
    }
  }
  append({ role: 'assistant', content: 'Usage: /remember key: value' });
}

function cmdForget(args: string, append: AppendFn): void {
  const key = args.trim().split(/\s+/)[0];
  if (!key) { append({ role: 'assistant', content: 'Usage: /forget <key>' }); return; }
  const existed = !!getMemoryState().facts[key];
  forgetFact(key);
  append({ role: 'assistant', content: existed ? `Forgot: ${key}` : `No fact found: ${key}` });
}

function cmdExport(args: string, append: AppendFn): void {
  const sub = args.trim().split(/\s+/)[0];
  if (sub === 'chat') {
    downloadChatMarkdown();
    append({ role: 'assistant', content: 'Chat exported as Markdown.' });
    return;
  }
  if (sub === 'memory') {
    const json = exportMemoryJSON();
    downloadBlob(json, `agenmonster-memory-${Date.now()}.json`, 'application/json');
    downloadMemoryMarkdown();
    append({ role: 'assistant', content: 'Memory exported as JSON + Markdown. Use /import memory to load a backup.' });
    return;
  }
  append({ role: 'assistant', content: 'Usage: /export chat | /export memory' });
}

function cmdImport(args: string, append: AppendFn): 'async' | void {
  const sub = args.trim().split(/\s+/)[0];
  if (sub !== 'memory') { append({ role: 'assistant', content: 'Usage: /import memory' }); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const result = importMemoryJSON(text);
      append({ role: 'assistant', content: result.ok ? 'Memory imported.' : `Import failed: ${result.reason}` });
    } catch (e: any) {
      append({ role: 'assistant', content: `Import error: ${e?.message || 'unknown'}` });
    }
  };
  input.click();
  append({ role: 'assistant', content: 'Pick a memory JSON file…' });
  return 'async';
}

function cmdStats(_args: string, append: AppendFn): void {
  const s = getChatStats();
  append({
    role: 'assistant',
    content: `Stats: ${s.totalCalls} calls · ${s.totalSuccess} ok · ${s.totalFail} err · avg ${msLabel(s.rollingMsAvg)} · last ${msLabel(s.lastMs)}`,
  });
}

function cmdTopics(_args: string, append: AppendFn): void {
  const topics = getTopTopics(10);
  append({
    role: 'assistant',
    content: topics.length ? 'Topics: ' + topics.map((t) => `${t.topic}(${t.count})`).join(', ') : 'No topics yet.',
  });
}

function cmdHelp(_args: string, append: AppendFn): void {
  append({
    role: 'assistant',
    content: 'Commands: /remember · /forget · /goal · /goals · /mood · /recap · /persona · /preset · /mode · /write · /export chat · /export memory · /import memory · /budget · /threads · /new · /switch · /delete · /rename · /stats · /topics · /help',
  });
}

function cmdBudget(_args: string, append: AppendFn): void {
  const desc = describeCaps(loadCaps());
  const t = getTokenState();
  const d = getDailySpend();
  append({
    role: 'assistant',
    content: `Budget: ${desc}. Today spent: $${d.total.toFixed(4)} (lifetime $${t.totalCost.toFixed(2)}).`,
  });
}

// ---------- thread commands ----------

function mutateThreads(mutate: (gs: any) => void): void {
  const gs = getGameState() as any;
  ensureThreadState(gs);
  mutate(gs);
  saveGameState();
}

function cmdThreads(_args: string, append: AppendFn): void {
  const gs = getGameState() as any;
  const ts = ensureThreadState(gs);
  const lines = ts.order.map((id: string, i: number) => {
    const t = ts.threads[id];
    const mark = id === ts.activeId ? '▶' : ' ';
    return `${mark} [${i}] ${t.title || 'Untitled'} (${t.messages.length} msgs)`;
  }).join('\n');
  append({ role: 'assistant', content: `Threads (${ts.order.length}):\n${lines}` });
}

function cmdNew(args: string, append: AppendFn): void {
  const title = args.trim();
  let freshTitle = '';
  mutateThreads((gs) => {
    const fresh = createThread(title || 'New thread');
    gs.chatThreads[fresh.id] = fresh;
    gs.chatActiveThreadId = fresh.id;
    gs.chatThreadOrder = [fresh.id, ...ensureThreadState(gs).order];
    freshTitle = fresh.title;
  });
  append({ role: 'assistant', content: `Created thread "${freshTitle}"` });
}

function cmdSwitch(args: string, append: AppendFn): void {
  const idx = parseInt(args.trim(), 10);
  const gs = getGameState() as any;
  const ts = ensureThreadState(gs);
  const target = ts.order[idx];
  if (!target) { append({ role: 'assistant', content: `No thread at index ${idx}` }); return; }
  mutateThreads((g) => {
    const after = switchThread(ensureThreadState(g), target);
    g.chatThreads = after.threads;
    g.chatActiveThreadId = after.activeId;
    g.chatThreadOrder = after.order;
  });
  append({ role: 'assistant', content: `Switched to "${ts.threads[target].title}"` });
}

function cmdDelete(args: string, append: AppendFn): void {
  const idx = parseInt(args.trim(), 10);
  const gs = getGameState() as any;
  const ts = ensureThreadState(gs);
  const target = ts.order[idx];
  if (!target) { append({ role: 'assistant', content: `No thread at index ${idx}` }); return; }
  mutateThreads((g) => {
    const after = deleteThread(ensureThreadState(g), target);
    g.chatThreads = after.threads;
    g.chatActiveThreadId = after.activeId;
    g.chatThreadOrder = after.order;
  });
  append({ role: 'assistant', content: 'Deleted.' });
}

function cmdRename(args: string, append: AppendFn): void {
  const title = args.trim();
  if (!title) { append({ role: 'assistant', content: 'Usage: /rename <title>' }); return; }
  mutateThreads((g) => {
    const ts = ensureThreadState(g);
    const after = renameThread(ts, ts.activeId, title);
    g.chatThreads = after.threads;
    g.chatActiveThreadId = after.activeId;
    g.chatThreadOrder = after.order;
  });
  append({ role: 'assistant', content: 'Renamed.' });
}

// ---------- goal / persona / mode commands ----------

function cmdGoal(args: string, append: AppendFn): void {
  const rest = args.trim();
  if (!rest) { append({ role: 'assistant', content: 'Usage: /goal <title> [step1 | step2 | ...]' }); return; }
  const inferred = buildGoalFromText(rest);
  const manual = inferred ?? (() => {
    const steps = rest.includes('|') ? rest.split('|').map((s) => s.trim()).filter(Boolean) : [];
    const title = steps.length > 0 ? steps.shift()! : rest;
    return {
      id: crypto.randomUUID(),
      title: title.slice(0, 80),
      steps: steps.map((s) => ({ id: crypto.randomUUID(), title: s.slice(0, 60), done: false })),
      createdAt: Date.now(),
      source: 'manual' as const,
    };
  })();
  const gs = getGameState() as any;
  if (!Array.isArray(gs.goals)) gs.goals = [];
  gs.goals.unshift(manual);
  if (gs.goals.length > 30) gs.goals.length = 30;
  saveGameState();
  append({ role: 'assistant', content: `Goal "${manual.title}" added${manual.steps.length ? ` (${manual.steps.length} steps)` : ''}.` });
}

function cmdGoals(_args: string, append: AppendFn): void {
  const gs = getGameState() as any;
  const goals = (gs.goals || []) as Goal[];
  if (!goals.length) { append({ role: 'assistant', content: 'No goals yet.' }); return; }
  const lines = goals.slice(0, 8).map((g) => {
    const total = g.steps.length;
    const done = g.steps.filter((s) => s.done).length;
    const status = g.doneAt ? '✓' : total > 0 && done === total ? '✓' : total > 0 ? `${done}/${total}` : '·';
    return `${g.doneAt || (!g.steps.length) ? '✓' : '·'} [${status}] ${g.title}`;
  }).join('\n');
  append({ role: 'assistant', content: `Goals:\n${lines}` });
}

function cmdPersona(args: string, append: AppendFn): void {
  const persona = args.trim();
  try {
    if (!persona) localStorage.removeItem(PERSONA_STORAGE_KEY);
    else localStorage.setItem(PERSONA_STORAGE_KEY, persona);
  } catch {}
  append({ role: 'assistant', content: persona ? 'Persona updated. Shape locked in.' : 'Persona cleared. Back to stage default.' });
}

function cmdPreset(args: string, append: AppendFn): void {
  const p = args.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const valid = ['terse', 'helpful', 'sarcastic', 'indonesian', 'pirate'];
  if (!p) { append({ role: 'assistant', content: `Presets: /preset ${valid.join(' | ')}` }); return; }
  if (!valid.includes(p)) { append({ role: 'assistant', content: `Unknown preset "${p}". Try: ${valid.join(', ')}` }); return; }
  try {
    import('../memory.ts').then((m: any) => { m.setPersonaPreset?.(p); });
  } catch {}
  append({ role: 'assistant', content: `Persona preset: ${p}.` });
}

function cmdMode(args: string, append: AppendFn): void {
  const mode = args.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const supported = ['chat', 'goal'];
  if (!supported.includes(mode)) {
    append({ role: 'assistant', content: `Modes: ${supported.join(', ')}. Current: chat.` });
    return;
  }
  const gs = getGameState() as any;
  gs.chatMode = mode as 'chat' | 'goal';
  saveGameState();
  append({ role: 'assistant', content: `Mode: ${mode}${mode === 'goal' ? ' — every message becomes a goal step.' : ''}` });
}

function cmdWrite(args: string, append: AppendFn, ctx: { getTranscript: () => string }): void {
  const rest = args.trim();
  if (!rest) { append({ role: 'assistant', content: 'Usage: /write <filename> — downloads the conversation as a .txt file.' }); return; }
  const safe = rest.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 60);
  const name = safe.endsWith('.txt') ? safe : safe + '.txt';
  downloadBlob(ctx.getTranscript(), name, 'text/plain');
  append({ role: 'assistant', content: `Downloaded: ${name}` });
}

function cmdMood(args: string, append: AppendFn): void {
  const gs = getGameState() as any;
  const parts = args.trim().split(/\s+/);
  if (parts[0] === 'set' && parts[1]) {
    const valid = ['idle', 'happy', 'sleepy', 'proud', 'excited', 'focused', 'thinking', 'sad', 'angry', 'frustrated', 'tired'];
    const want = parts[1].toLowerCase();
    if (!valid.includes(want)) { append({ role: 'assistant', content: `Unknown mood "${want}". Try: ${valid.join(', ')}` }); return; }
    gs.mood = want;
    saveGameState();
    append({ role: 'assistant', content: `Mood set to ${want}.` });
    return;
  }
  if (parts[0] === 'reset') {
    gs.mood = 'idle';
    gs.needs.energy = 100;
    saveGameState();
    append({ role: 'assistant', content: 'Mood reset to idle, energy restored.' });
    return;
  }
  const rel = Math.min(1, gs.relationshipXp / Math.max(1, gs.relationshipXpToNext));
  append({ role: 'assistant', content: `Mood: ${gs.mood} | Energy: ${gs.needs.energy}% | Relationship: ${rel.toFixed(2)}` });
}

function cmdRecap(_args: string, append: AppendFn): void {
  const gs = getGameState() as any;
  const recap = runDailyRecap(gs.chatMessages?.length ?? 0, 0);
  append({
    role: 'assistant',
    content: recap ? `${recap.title}: ${recap.detail}` : 'No activity today to recap.',
  });
}

// ---------- dispatcher ----------

type Handler = (args: string, append: AppendFn, ctx: { getTranscript: () => string }) => 'async' | void;

const HANDLERS: Record<string, Handler> = {
  '/remember': cmdRemember,
  '/forget': cmdForget,
  '/export': cmdExport,
  '/import': cmdImport,
  '/stats': cmdStats,
  '/topics': cmdTopics,
  '/help': cmdHelp,
  '/budget': cmdBudget,
  '/threads': cmdThreads,
  '/new': cmdNew,
  '/switch': cmdSwitch,
  '/delete': cmdDelete,
  '/rename': cmdRename,
  '/goal': cmdGoal,
  '/goals': cmdGoals,
  '/persona': cmdPersona,
  '/preset': cmdPreset,
  '/mode': cmdMode,
  '/write': cmdWrite,
  '/mood': cmdMood,
  '/recap': cmdRecap,
};

export const SLASH_COMMANDS = Object.keys(HANDLERS);

/**
 * Try to handle text as a slash command.
 * Returns 'handled' (sync done), 'async' (background work queued), or null (not a command).
 */
export function handleSlashCommand(
  text: string,
  append: AppendFn,
  ctx: { getTranscript: () => string },
): 'handled' | 'async' | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const handler = HANDLERS[cmd];
  if (!handler) return null;
  const result = handler(rest.join(' '), append, ctx);
  return result === 'async' ? 'async' : 'handled';
}
