// worldModelGraph — the persistent entity graph (the "world model" camp of
// AGI research). Not a vector DB: a typed graph of entities and relations
// that the dream cycle consolidates and the simulation layer rolls out.
//
//   Entity: people | projects | companies | places | concepts
//   Relation: works_on | owns | depends_on | causes | blocked_by | scheduled_for
//
// Pure + testable. No DOM.

export type EntityType = 'person' | 'project' | 'company' | 'place' | 'concept' | 'action' | 'event';
export type RelationType =
  | 'works_on'
  | 'owns'
  | 'depends_on'
  | 'causes'
  | 'blocked_by'
  | 'scheduled_for';

export interface EntityNode {
  id: string;
  type: EntityType;
  label: string;
  /** Free attributes (role, status, etc.). */
  attrs?: Record<string, string>;
}

export interface RelationEdge {
  from: string;
  to: string;
  type: RelationType;
  weight: number;
}

export interface WorldGraph {
  entities: Record<string, EntityNode>;
  edges: RelationEdge[];
}

export function createWorldGraph(): WorldGraph {
  return { entities: {}, edges: [] };
}

export function addEntity(g: WorldGraph, e: EntityNode): WorldGraph {
  if (g.entities[e.id]) return g;
  return { ...g, entities: { ...g.entities, [e.id]: e } };
}

export function link(g: WorldGraph, from: string, to: string, type: RelationType, weight = 1): WorldGraph {
  if (!g.entities[from] || !g.entities[to]) return g;
  const edge: RelationEdge = { from, to, type, weight };
  // Dedupe identical edges, keep max weight.
  const existing = g.edges.find((e) => e.from === from && e.to === to && e.type === type);
  if (existing) {
    return {
      ...g,
      edges: g.edges.map((e) => (e === existing ? { ...e, weight: Math.max(e.weight, weight) } : e)),
    };
  }
  return { ...g, edges: [...g.edges, edge] };
}

export function getNeighbors(g: WorldGraph, id: string, type?: RelationType): EntityNode[] {
  const out = g.edges
    .filter((e) => e.from === id && (!type || e.type === type))
    .map((e) => g.entities[e.to])
    .filter(Boolean);
  return out;
}

/** Merge two entities that refer to the same thing (keep relations of both). */
export function mergeDuplicate(g: WorldGraph, keepId: string, dropId: string): WorldGraph {
  const drop = g.entities[dropId];
  if (!drop || !g.entities[keepId] || keepId === dropId) return g;
  const remapped = g.edges.map((e) => {
    if (e.from === dropId) return { ...e, from: keepId };
    if (e.to === dropId) return { ...e, to: keepId };
    return e;
  });
  // Dedupe parallel edges (same from/to/type) keeping the stronger weight.
  const seen = new Map<string, RelationEdge>();
  for (const e of remapped) {
    const key = `${e.from}|${e.to}|${e.type}`;
    const prev = seen.get(key);
    if (!prev || e.weight > prev.weight) seen.set(key, e);
  }
  const edges = [...seen.values()];
  const entities = { ...g.entities };
  delete entities[dropId];
  return { entities, edges };
}

/** Shortest relation path (BFS) between two entities — used by simulation. */
export function shortestPath(g: WorldGraph, a: string, b: string): string[] | null {
  if (!g.entities[a] || !g.entities[b]) return null;
  const queue: Array<{ id: string; path: string[] }> = [{ id: a, path: [a] }];
  const seen = new Set([a]);
  while (queue.length) {
    const { id, path } = queue.shift()!;
    if (id === b) return path;
    for (const e of g.edges.filter((x) => x.from === id)) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push({ id: e.to, path: [...path, e.to] });
      }
    }
  }
  return null;
}

const WORLD_GRAPH_KEY = 'agenmonster_world_graph';

/** Persist the world graph (guarded for SSR/tests). */
export function persistWorldGraph(g: WorldGraph): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WORLD_GRAPH_KEY, JSON.stringify(g));
  } catch {}
}

/** Load the world graph, or empty if none / unavailable. */
export function loadWorldGraph(): WorldGraph {
  if (typeof localStorage === 'undefined') return createWorldGraph();
  try {
    const raw = localStorage.getItem(WORLD_GRAPH_KEY);
    if (!raw) return createWorldGraph();
    const parsed = JSON.parse(raw) as WorldGraph;
    if (parsed && parsed.entities && parsed.edges) return parsed;
  } catch {}
  return createWorldGraph();
}
