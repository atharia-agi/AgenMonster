// Global keyboard shortcuts for the desktop/web shell.
// - Ctrl/Cmd+E : export state
// - Ctrl/Cmd+I : import state
// - Esc        : close modal / blur focus
// - 1..7       : switch tabs (ignored while typing in an input)

export interface ShortcutHandlers {
  focusChat?: () => void;
  exportState?: () => void;
  importState?: () => void;
  setTab?: (tab: string) => void;
  escape?: () => void;
}

export const TAB_SHORTCUTS: Record<string, string> = {
  '1': 'welcome',
  '2': 'workspace',
  '3': 'skills',
  '4': 'missions',
  '5': 'memory',
  '6': 'inventory',
  '7': 'settings',
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function setupShortcuts(handlers: ShortcutHandlers): () => void {
  const onKey = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      handlers.exportState?.();
      return;
    }
    if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handlers.importState?.();
      return;
    }
    if (e.key === 'Escape') {
      handlers.escape?.();
      return;
    }

    // Don't hijack single-key shortcuts while the user is typing.
    if (isTypingTarget(e.target)) return;

    if (!mod && TAB_SHORTCUTS[e.key]) {
      handlers.setTab?.(TAB_SHORTCUTS[e.key]);
      return;
    }
    // Enter focuses the chat composer when not already in a field.
    if (!mod && e.key === 'Enter' && (e.target === document.body || e.target === null)) {
      handlers.focusChat?.();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKey);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKey);
    }
  };
}
