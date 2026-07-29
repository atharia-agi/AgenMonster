<script lang="ts">
  // MemoryGraph — pure SVG canvas. Receives a `MemoryGraph` payload from
  // memoryGraph.ts and renders tags (red hub) + facts (color-coded) +
  // episodes (kind-colored). Edges drawn as translucent lines.
  import type { MemoryGraph, GraphNode } from '$lib/memoryGraph';

  let { graph, height = 320, onNodeClick, searchQuery = '', filterKinds } = $props<{
    graph: MemoryGraph;
    height?: number;
    onNodeClick?: (node: GraphNode) => void;
    searchQuery?: string;
    filterKinds?: Set<GraphNode['kind']>;
  }>();

  const q = $derived(searchQuery.trim().toLowerCase());
  const shown = $derived(
    graph.nodes.filter((n: GraphNode) => {
      if (filterKinds && !filterKinds.has(n.kind)) return false;
      if (!q) return true;
      return n.label.toLowerCase().includes(q);
    })
  );
  const shownIds = $derived(new Set(shown.map((n: GraphNode) => n.id)));
</script>

<svg viewBox="0 0 {graph.width} {height}" class="mem-graph" preserveAspectRatio="xMidYMid meet" aria-label="Memory graph">
  <line x1="0" y1={height / 2} x2={graph.width} y2={height / 2} class="axis" />

  {#each graph.edges as e}
    {@const from = graph.nodes.find((n: GraphNode) => n.id === e.from)}
    {@const to = graph.nodes.find((n: GraphNode) => n.id === e.to)}
    {#if from && to && shownIds.has(from.id) && shownIds.has(to.id)}
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} class="edge" stroke="var(--gb-dark)" stroke-opacity="0.45" stroke-width="0.5" />
    {/if}
  {/each}

  {#each graph.nodes as n (n.id)}
    {@const visible = shownIds.has(n.id)}
    <g
      class="node {n.kind}"
      role="button"
      tabindex={visible ? 0 : -1}
      aria-label={n.label}
      onclick={() => visible && onNodeClick?.(n)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick?.(n); } }}
      style="cursor:{visible ? 'pointer' : 'default'}; opacity:{visible ? 1 : 0.15}"
    >
      <circle cx={n.x} cy={n.y} r={n.radius} fill={n.color || 'var(--gb-border)'} stroke={visible ? 'var(--gb-text)' : 'var(--gb-dark)'} stroke-width="0.5" />
      {#if visible}
        <text x={n.x + n.radius + 2} y={n.y + 3} font-size="6" fill="var(--gb-text)" font-family="var(--font-body)">{n.label}</text>
      {/if}
    </g>
  {/each}
</svg>

<style>
  .mem-graph {
    width: 100%;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    image-rendering: pixelated;
  }
  .axis { stroke: var(--gb-dark); stroke-opacity: 0.15; stroke-dasharray: 2 2; }
</style>
