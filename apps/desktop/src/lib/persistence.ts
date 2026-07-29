import { exportState, importState } from './gameState.ts';

// Browser-only helpers for exporting/importing pet state as a JSON file.
// `serializeChatMarkdown` is pure and accepts the state bag explicitly so it
// can be tested without coupling this file to the live singleton. The browser
// caller (downloadChatMarkdown) loads the singleton internally.

export type ChatSnapshot = {
  stage: string;
  level: number;
  xp: number;
  xpToNext?: number;
  mood: string;
  relationshipLevel: number;
  chatMessages: any[];
};

export function downloadState(filename = `agenmonster-state-${Date.now()}.json`): void {
  if (typeof window === 'undefined') return;
  const json = exportState();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function pickAndImportState(onDone?: (ok: boolean) => void): void {
  if (typeof window === 'undefined') return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) {
      onDone?.(false);
      return;
    }
    try {
      const text = await file.text();
      importState(text);
      onDone?.(true);
    } catch (e) {
      console.error('[importState]', e);
      onDone?.(false);
    }
  };
  input.click();
}

// Export just the conversation as a human-readable Markdown file. Lightweight
// renderer: code fences are escaped, JSON in messages is JSON-stringified, and
// anything that looks like code (backticks) is left intact so the LLM's snippets
// survive the export.
export function serializeChatMarkdown(gs: ChatSnapshot): string {
  const msgs = (gs.chatMessages || []).filter((m: any) => m?.role !== 'system');
  const lines: string[] = [];
  lines.push(`# AgenMonster Chat Export`);
  lines.push('');
  lines.push(`- Stage: **${gs.stage}** (lvl ${gs.level}, XP ${gs.xp})`);
  lines.push(`- Pet mood: ${gs.mood}`);
  lines.push(`- Bond: ${gs.relationshipLevel}`);
  lines.push(`- Exported: ${new Date().toISOString()}`);
  lines.push(`- Messages: ${msgs.length}`);
  lines.push('');
  if (msgs.length === 0) {
    lines.push('_(no messages yet)_');
  } else {
    for (const m of msgs) {
      const ts = m.timestamp ? new Date(m.timestamp).toISOString() : '';
      const tag = (m.role || 'user').toUpperCase();
      const body = String(m.content ?? '');
      lines.push(`## ${tag}${ts ? ' · ' + ts : ''}`);
      lines.push('');
      // Code fences are absolute; if the body itself contains triple backticks
      // we switch to a 4-tick fence to avoid breaking the document.
      const fence = body.includes('```') ? '````' : '```';
      lines.push(`${fence}`);
      lines.push(body);
      lines.push(`${fence}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function downloadChatMarkdown(filename = `agenmonster-chat-${Date.now()}.md`): void {
  if (typeof window === 'undefined') return;
  // Lazy-load the singleton only on the browser side; keeps this module
  // importable from Node test runs without extension glue.
  import('./gameState.ts').then(({ getGameState }) => {
    const md = serializeChatMarkdown(getGameState());
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}
