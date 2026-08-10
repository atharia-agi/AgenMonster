// conceptFormation — the differentiator module (rarely discussed in AGI
// literature, proposed in the 2026 research). Not just retrieve/associate:
// it FORMS new abstractions, building a concept hierarchy over time.
//
//   apel + jeruk + mangga → buah
//   mobil + motor + truk   → kendaraan
//
// This enables transfer learning, cross-domain analogy, and creativity.
// Pure + testable. Uses tag/keyword overlap (no embedding model needed).

import { addEntity, link, type WorldGraph, type EntityType } from './worldModelGraph.ts';

export interface FactItem {
  id: string;
  title: string;
  tags: string[];
}

export interface Concept {
  id: string;
  label: string;
  members: string[]; // source item ids
  tags: string[];
  parentId?: string;
}

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'with', 'and', 'or', 'to']);

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function overlap(a: FactItem, b: FactItem): number {
  const wa = tokenize(a.title + ' ' + a.tags.join(' '));
  const wb = tokenize(b.title + ' ' + b.tags.join(' '));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = new Set([...wa, ...wb]).size || 1;
  return inter / union;
}

/**
 * Decide whether two items should be merged into one concept.
 * False if overlap is low OR they belong to different exclusive categories
 * (e.g. one is "animal" and the other "plant").
 */
export function shouldMerge(a: FactItem, b: FactItem, threshold = 0.3): boolean {
  if (overlap(a, b) < threshold) return false;
  // Exclusive categories: an item can only belong to one. Two items conflict
  // only if they sit in DIFFERENT exclusive categories (no shared category).
  const excl = new Set(['animal', 'plant', 'physical', 'digital', 'abstract']);
  const ea = new Set(a.tags.filter((t) => excl.has(t)));
  const eb = new Set(b.tags.filter((t) => excl.has(t)));
  if (ea.size > 0 && eb.size > 0) {
    const shared = [...ea].some((t) => eb.has(t));
    if (!shared) return false; // different categories → contradict
  }
  return true;
}

/** Cluster items into concept groups using pairwise shouldMerge. */
export function clusterIntoConcepts(items: FactItem[], threshold = 0.3): Concept[] {
  const concepts: Concept[] = [];
  const assigned = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    if (assigned.has(items[i].id)) continue;
    const members = [items[i]];
    assigned.add(items[i].id);
    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(items[j].id)) continue;
      if (shouldMerge(items[i], items[j], threshold)) {
        members.push(items[j]);
        assigned.add(items[j].id);
      }
    }
    if (members.length >= 2) {
      const tags = [...new Set(members.flatMap((m) => m.tags))].slice(0, 8);
      concepts.push({
        id: `concept-${items[i].id}`,
        label: members[0].title,
        members: members.map((m) => m.id),
        tags,
      });
    }
  }
  return concepts;
}

/**
 * Write formed concepts into the world model graph as `concept` entities,
 * linked to their member items. Returns the updated graph + concepts.
 */
export function formConcepts(graph: WorldGraph, items: FactItem[], threshold = 0.3): {
  graph: WorldGraph;
  concepts: Concept[];
} {
  const concepts = clusterIntoConcepts(items, threshold);
  let g = graph;
  for (const c of concepts) {
    g = addEntity(g, { id: c.id, type: 'concept' as EntityType, label: c.label, attrs: { tags: c.tags.join(',') } });
    for (const m of c.members) {
      // Ensure the member fact exists as an entity, then link it under the concept.
      if (!g.entities[m]) {
        const fact = items.find((it) => it.id === m);
        g = addEntity(g, { id: m, type: 'concept' as EntityType, label: fact?.title ?? m, attrs: { tags: (fact?.tags ?? []).join(',') } });
      }
      g = link(g, c.id, m, 'owns', 1);
    }
  }
  return { graph: g, concepts };
}
