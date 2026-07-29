// Tauri IPC bridge — uses native commands when available, localStorage fallback otherwise.

const Tauri = (typeof window !== 'undefined' && (window as any).__TAURI__) ? (window as any).__TAURI__ : null;
const invoke = Tauri?.invoke?.bind(Tauri) || null;

function lsGet(key: string): any {
  try {
    const raw = localStorage.getItem(`agenmonster_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSet(key: string, value: any): void {
  try { localStorage.setItem(`agenmonster_${key}`, JSON.stringify(value)); } catch {}
}

export function isTauri(): boolean {
  return invoke !== null;
}

export async function loadStateNative(): Promise<any> {
  if (invoke) {
    try { return await invoke('load_state_native'); } catch {}
  }
  return lsGet('state');
}

export async function saveStateNative(value: any): Promise<void> {
  if (invoke) {
    try { await invoke('save_state_native', { payload: JSON.stringify(value) }); return; } catch {}
  }
  lsSet('state', value);
}

export async function loadMemoryNative(): Promise<any> {
  if (invoke) {
    try { return await invoke('load_memory_native'); } catch {}
  }
  return lsGet('memory');
}

export async function saveMemoryNative(value: any): Promise<void> {
  if (invoke) {
    try { await invoke('save_memory_native', { payload: JSON.stringify(value) }); return; } catch {}
  }
  lsSet('memory', value);
}

export async function loadGoalsNative(): Promise<any> {
  if (invoke) {
    try { return await invoke('load_goals_native'); } catch {}
  }
  return lsGet('goals');
}

export async function saveGoalsNative(value: any): Promise<void> {
  if (invoke) {
    try { await invoke('save_goals_native', { payload: JSON.stringify(value) }); return; } catch {}
  }
  lsSet('goals', value);
}

export async function tauriSendChat(message: string): Promise<any> {
  if (invoke) {
    try { return await invoke('send_task', { message }); } catch {}
  }
  return null;
}

export async function tauriTriggerEvent(event: string): Promise<any> {
  if (invoke) {
    try { return await invoke('trigger_event', { event }); } catch {}
  }
  return null;
}

export async function tauriGetAppPaths(): Promise<any> {
  if (invoke) {
    try { return await invoke('get_app_paths'); } catch {}
  }
  return null;
}

export async function tauriExportBackup(): Promise<any> {
  if (invoke) {
    try { return await invoke('export_backup_native'); } catch {}
  }
  return null;
}
