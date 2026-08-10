// Virtual filesystem for Deep Agents — localStorage-backed implementation.
//
// Provides pluggable filesystem backend for agent tools:
//   - ls, read_file, write_file, edit_file, delete, glob, grep

export interface FileSystemEntry {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
}

export interface FileSystemBackend {
  listDirectory(dir: string): Promise<FileSystemEntry[]>;
  readFile(path: string): Promise<{ content: string; error?: string }>;
  writeFile(path: string, content: string): Promise<{ ok: boolean; error?: string }>;
  editFile(path: string, oldText: string, newText: string): Promise<{ ok: boolean; error?: string }>;
  delete(path: string): Promise<{ ok: boolean; error?: string }>;
  glob(pattern: string, dir?: string): Promise<string[]>;
  grep(query: string, dir?: string): Promise<string[]>;
}

const STORAGE_KEY = 'agenmonster_vfs';
const MAX_VFS_SIZE = 5 * 1024 * 1024;

function loadVFS(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function persistVFS(fs: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
  } catch (e: unknown) {
    if ((e as Error)?.name === 'QuotaExceededError') {
      console.warn('[vfs] quota exceeded');
    }
  }
}

export class LocalStorageFileSystem implements FileSystemBackend {
  private fs: Record<string, string>;

  constructor() {
    this.fs = loadVFS();
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  private key(path: string): string {
    return this.normalize(path);
  }

  async listDirectory(dir: string): Promise<FileSystemEntry[]> {
    const prefix = this.normalize(dir);
    const entries: FileSystemEntry[] = [];
    const seen = new Set<string>();

    for (const path of Object.keys(this.fs)) {
      if (!path.startsWith(prefix)) continue;
      const relative = path.slice(prefix.length);
      if (!relative) continue;

      const parts = relative.split('/').filter((p) => p.length > 0);
      if (parts.length === 0) continue;

      const name = parts[0];
      const fullPath = prefix === '/' ? `/${name}` : `${prefix}/${name}`;
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);

      const isDir = parts.length > 1 || this.fs[fullPath] === '__DIR__';
      entries.push({
        path: fullPath,
        name,
        type: isDir ? 'directory' : 'file',
        size: isDir ? undefined : this.fs[fullPath]?.length,
        modifiedAt: Date.now(),
      });
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(path: string): Promise<{ content: string; error?: string }> {
    const k = this.key(path);
    if (!(k in this.fs)) {
      return { content: '', error: `File not found: ${path}` };
    }
    if (this.fs[k] === '__DIR__') {
      return { content: '', error: `Is a directory: ${path}` };
    }
    return { content: this.fs[k] || '' };
  }

  async writeFile(path: string, content: string): Promise<{ ok: boolean; error?: string }> {
    const k = this.key(path);
    if (k === '/' || k.endsWith('/')) {
      return { ok: false, error: `Cannot write to directory: ${path}` };
    }
    const existing = this.fs[k];
    this.fs[k] = content;
    this.persist();
    return { ok: true };
  }

  async editFile(path: string, oldText: string, newText: string): Promise<{ ok: boolean; error?: string }> {
    const k = this.key(path);
    if (!(k in this.fs)) {
      return { ok: false, error: `File not found: ${path}` };
    }
    if (this.fs[k] === '__DIR__') {
      return { ok: false, error: `Is a directory: ${path}` };
    }
    const current = this.fs[k];
    if (!current.includes(oldText)) {
      return { ok: false, error: 'oldText not found in file' };
    }
    this.fs[k] = current.replace(oldText, newText);
    this.persist();
    return { ok: true };
  }

  async delete(path: string): Promise<{ ok: boolean; error?: string }> {
    const k = this.key(path);
    if (!(k in this.fs)) {
      return { ok: false, error: `Path not found: ${path}` };
    }
    delete this.fs[k];
    this.persist();
    return { ok: true };
  }

  async glob(pattern: string, dir = '/'): Promise<string[]> {
    const results: string[] = [];
    const regex = this.globToRegex(pattern);
    for (const path of Object.keys(this.fs)) {
      if (dir !== '/' && !path.startsWith(this.normalize(dir))) continue;
      const relative = dir === '/' ? path.slice(1) : path.slice(this.normalize(dir).length + 1);
      if (regex.test(relative) || regex.test(path)) {
        results.push(path);
      }
    }
    return results.sort();
  }

  async grep(query: string, dir = '/'): Promise<string[]> {
    const results: string[] = [];
    const lowered = query.toLowerCase();
    for (const [path, content] of Object.entries(this.fs)) {
      if (dir !== '/' && !path.startsWith(this.normalize(dir))) continue;
      if (content.toLowerCase().includes(lowered)) {
        results.push(path);
      }
    }
    return results.sort();
  }

  private globToRegex(pattern: string): RegExp {
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{DOUBLE_STAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{DOUBLE_STAR}}/g, '.*');
    return new RegExp(`^${regexStr}$`);
  }

  private persist(): void {
    this.fs = this.trim(this.fs);
    persistVFS(this.fs);
  }

  private trim(fs: Record<string, string>): Record<string, string> {
    const entries = Object.entries(fs);
    if (entries.length <= 500) return fs;
    return Object.fromEntries(entries.slice(-500));
  }
}

const DEFAULT_BACKEND = new LocalStorageFileSystem();

export function getDefaultFileSystem(): FileSystemBackend {
  return DEFAULT_BACKEND;
}
