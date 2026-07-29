export interface FactImportance {
  importance: number;
  minConfidence: number;
}

export function getFactImportance(key: string): FactImportance {
  if (key.startsWith('user.')) return { importance: 3, minConfidence: 0.5 };
  if (key.startsWith('project.')) return { importance: 2, minConfidence: 0.3 };
  if (key.startsWith('tool.')) return { importance: 1.5, minConfidence: 0 };
  if (key.startsWith('note.')) return { importance: 1, minConfidence: 0 };
  return { importance: 1, minConfidence: 0 };
}

export function importanceDecay(baseDecay: number, importance: number): number {
  if (importance >= 3) return 0;
  return baseDecay * (importance / 3);
}

export function importanceBump(baseBump: number, importance: number): number {
  return baseBump * (importance / 3);
}