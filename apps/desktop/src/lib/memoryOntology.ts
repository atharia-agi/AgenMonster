// Memory ontology — typed fact namespaces with validation.
// Replaces the flat `upsertFact(key, value)` API with a typed envelope
// that distinguishes kinds: `user.*`, `project.*`, `tool.*`, `note.*`.
// Each kind enforces a value shape (string / number / one-of) so retrieval
// can be trusted in the system prompt.

export type FactKind = 'user' | 'project' | 'tool' | 'note';

export interface FactSpec {
  prefix: string; // 'user'
  description: string;
  // Value validator: returns string for storage, or throws if invalid.
  validate: (raw: string) => string;
}

// Fact kind specifications
const USER_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const PROJECT_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const TOOL_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;
const NOTE_PATTERN = /[\s\S]{1,2000}/; // free text up to 2KB

export const SPECS: Record<FactKind, FactSpec> = {
  user: {
    prefix: 'user',
    description: 'User identity/preference (e.g. user.lang = typescript)',
    validate: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) throw new Error('user.* value cannot be empty');
      if (trimmed.length > 200) throw new Error('user.* value > 200 chars');
      return trimmed;
    },
  },
  project: {
    prefix: 'project',
    description: 'Project context (e.g. project.framework = sveltekit)',
    validate: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) throw new Error('project.* value cannot be empty');
      if (trimmed.length > 200) throw new Error('project.* value > 200 chars');
      return trimmed;
    },
  },
  tool: {
    prefix: 'tool',
    description: 'Tool usage preference (e.g. tool.linter = oxlint)',
    validate: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) throw new Error('tool.* value cannot be empty');
      if (trimmed.length > 200) throw new Error('tool.* value > 200 chars');
      return trimmed;
    },
  },
  note: {
    prefix: 'note',
    description: 'Free-text note (any content up to 2KB)',
    validate: (raw) => {
      if (typeof raw !== 'string') throw new Error('note.* must be a string');
      if (raw.length > 2000) throw new Error('note.* value > 2KB');
      return raw;
    },
  },
};

// Map key prefix → FactKind
export function classifyKey(key: string): FactKind | null {
  const prefix = key.split('.')[0];
  if (prefix in SPECS) return prefix as FactKind;
  return null;
}

export function validateKeyForKind(key: string, kind: FactKind): { ok: boolean; error?: string } {
  const expectedPrefix = `${kind}.`;
  if (!key.startsWith(expectedPrefix)) {
    return { ok: false, error: `Key "${key}" must start with "${expectedPrefix}" for kind ${kind}` };
  }
  const rest = key.slice(expectedPrefix.length);
  const PATTERNS: Record<FactKind, RegExp> = {
    user: USER_PATTERN,
    project: PROJECT_PATTERN,
    tool: TOOL_PATTERN,
    note: NOTE_PATTERN,
  };
  if (!PATTERNS[kind].test(rest)) {
    return { ok: false, error: `Key suffix "${rest}" doesn't match ${kind} pattern` };
  }
  return { ok: true };
}

// Validate value for a given kind
export function validateValue(kind: FactKind, raw: string): { ok: boolean; value?: string; error?: string } {
  try {
    const v = SPECS[kind].validate(raw);
    return { ok: true, value: v };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'invalid value' };
  }
}

export interface ValidationResult {
  ok: boolean;
  kind?: FactKind;
  value?: string;
  error?: string;
}

export function validateFact(key: string, value: string): ValidationResult {
  const kind = classifyKey(key);
  if (!kind) return { ok: false, error: `Unknown fact kind in key "${key}". Use one of: ${Object.keys(SPECS).map((k) => k + '.*').join(', ')}.` };
  const keyCheck = validateKeyForKind(key, kind);
  if (!keyCheck.ok) return { ok: false, error: keyCheck.error };
  const valCheck = validateValue(kind, value);
  if (!valCheck.ok) return { ok: false, error: valCheck.error };
  return { ok: true, kind, value: valCheck.value };
}
