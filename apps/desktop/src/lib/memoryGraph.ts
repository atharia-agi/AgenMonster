// Memory graph layout — pure, deterministic. Turns the current memory
// state into a flat list of nodes + edges for visualization. Fact nodes
// represent memory facts; tag-nodes are hubs that connect facts sharing a
// tag; episode-nodes cluster their tag hubs.
//
// Layout: a deterministic concentric placement around the dominant
// topics. No real physics simulation — just positions that look sensible.

import type { MemoryState, Fact, Episode } from './memory.ts';
import { searchMemory } from './memory.ts';

export type GraphNodeKind = 'fact' | 'tag' | 'episode';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  x: number;
  y: number;
  radius: number;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  label?: string;
}

export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export interface LegacyMemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const COLOR_BY_KIND = {
  user: '#88ccf0',
  project: '#90c878',
  tool: '#ffc860',
  note: '#d8c8f0',
  legacy: '#c8c8c8',
} as const;

function kindFromKey(key: string): keyof typeof COLOR_BY_KIND {
  const prefix = key.split('.')[0] as keyof typeof COLOR_BY_KIND;
  return prefix in COLOR_BY_KIND ? prefix : 'legacy';
}

export function buildMemoryGraph(
  state: MemoryState,
  width = 480,
  height = 320,
): MemoryGraph {
  const cx = width / 2;
  const cy = height / 2;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Tag hubs: derive a single node per top topic.
  const topTags = state.topics.slice(0, 8);
  const tagIds = new Map<string, string>();
  topTags.forEach((t, i) => {
    const angle = (i / Math.max(1, topTags.length)) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.32;
    const id = `tag:${t.topic}`;
    tagIds.set(t.topic, id);
    nodes.push({
      id,
      kind: 'tag',
      label: t.topic,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      radius: 6 + Math.min(20, t.count * 1.2),
      color: '#e85050',
      meta: { count: t.count },
    });
  });

  // Fact nodes, orbit closer to the center.
  const facts = Object.values(state.facts);
  facts.slice(0, 24).forEach((f, i) => {
    const angle = (i / Math.max(1, facts.length)) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.18;
    const id = `fact:${f.key}`;
    nodes.push({
      id,
      kind: 'fact',
      label: f.key,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      radius: 4,
      color: COLOR_BY_KIND[kindFromKey(f.key)],
      meta: { confidence: f.confidence, value: f.value },
    });
    // Edge to matching tag (if any) — match against key OR value so a
    // `user.lang = typescript` fact still attaches to the `typescript`
    // tag when the user has been on TypeScript-heavy topics.
    for (const tag of topTags) {
      if (f.key.includes(tag.topic) || f.value.toLowerCase().includes(tag.topic)) {
        edges.push({ from: id, to: tagIds.get(tag.topic)!, weight: 1 });
      }
    }
  });

  // Episode nodes, drawn slightly outside the tag ring.
  state.episodes.slice(0, 12).forEach((ep, i) => {
    const angle = (i / Math.max(1, state.episodes.length)) * Math.PI * 2 + Math.PI / topTags.length;
    const radius = Math.min(width, height) * 0.42;
    const id = `ep:${ep.id}`;
    nodes.push({
      id,
      kind: 'episode',
      label: ep.title.slice(0, 24),
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      radius: 4,
      color: ep.kind === 'error' ? '#e85050' : ep.kind === 'lesson' ? '#d8c8f0' : '#90c878',
      meta: { kind: ep.kind, confidence: ep.confidence },
    });
    for (const tag of topTags) {
      if (ep.tags.includes(tag.topic)) {
        edges.push({ from: id, to: tagIds.get(tag.topic)!, weight: 1 });
      }
    }
  });

  return { nodes, edges, width, height };
}

export interface SpreadingActivationOptions {
  depth?: number;
  temporalDecay?: boolean;
  lateralInhibition?: boolean;
  topK?: number;
}

export interface SpreadingActivationResult {
  episodes: any[];
  facts: any[];
}

export function retrieveBySpreadingActivation(
  query: string,
  _opts: SpreadingActivationOptions = {},
): SpreadingActivationResult {
  const opts = { depth: 2, temporalDecay: true, lateralInhibition: false, topK: 6, ..._opts };
  const hits = searchMemory(query);
  const episodes = hits.episodes.slice(0, opts.topK).map((e) => ({
    id: e.id,
    title: e.title,
    detail: e.detail,
    confidence: e.confidence,
    sourceLayer: 'episodic',
  }));
  const facts = hits.facts.slice(0, opts.topK).map((f) => ({
    key: f.key,
    value: f.value,
    confidence: f.confidence,
  }));
  return { episodes, facts };
}
