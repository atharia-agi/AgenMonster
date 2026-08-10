// executivePlanner — the PFC (prefrontal cortex) layer. Turns a goal into a
// decomposed task tree with a dependency graph, and replans when something fails.
// This is what separates an "assistant" (answers questions) from an "operator"
// (completes long projects). Pure + testable.

export interface TaskNode {
  id: string;
  title: string;
  dependsOn: string[];
  estimateDays: number;
  status: 'pending' | 'in_progress' | 'done' | 'failed';
}

export function decompose(goal: string, subTasks: Array<{ title: string; dependsOn?: string[]; estimateDays?: number }>): TaskNode[] {
  return subTasks.map((t, i) => ({
    id: `t${i + 1}`,
    title: t.title,
    dependsOn: t.dependsOn ?? [],
    estimateDays: t.estimateDays ?? 1,
    status: 'pending',
  }));
}

/** Returns task ids in a valid execution order (dependencies first). */
export function topologicalOrder(tasks: TaskNode[]): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const order: string[] = [];
  const visit = (id: string, stack: Set<string>) => {
    if (visited.has(id)) return;
    if (stack.has(id)) return; // cycle guard — skip
    stack.add(id);
    const t = byId.get(id);
    for (const dep of t?.dependsOn ?? []) visit(dep, stack);
    stack.delete(id);
    visited.add(id);
    order.push(id);
  };
  for (const t of tasks) visit(t.id, new Set());
  return order;
}

/** Total estimated days for the project (critical-ish sum along dependency chains). */
export function totalEstimate(tasks: TaskNode[]): number {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map<string, number>();
  const calc = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const t = byId.get(id)!;
    const depMax = t.dependsOn.length ? Math.max(...t.dependsOn.map(calc)) : 0;
    const total = depMax + t.estimateDays;
    memo.set(id, total);
    return total;
  };
  return Math.max(...tasks.map((t) => calc(t.id)), 0);
}

/**
 * Replan after a task fails: mark failed, and push all tasks that depend on it
 * (transitively) to the back of the order. Returns a new ordered id list.
 */
export function replanOnFailure(tasks: TaskNode[], failedId: string): { tasks: TaskNode[]; order: string[] } {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  // Find transitive dependents.
  const dependents = new Set<string>();
  const findDeps = (id: string) => {
    for (const t of tasks) {
      if (t.dependsOn.includes(id) && !dependents.has(t.id)) {
        dependents.add(t.id);
        findDeps(t.id);
      }
    }
  };
  findDeps(failedId);

  const updated = tasks.map((t) =>
    t.id === failedId ? { ...t, status: 'failed' as const } : t,
  );
  const order = topologicalOrder(updated).sort((a, b) => {
    const aDelayed = dependents.has(a) ? 1 : 0;
    const bDelayed = dependents.has(b) ? 1 : 0;
    return aDelayed - bDelayed;
  });
  return { tasks: updated, order };
}
