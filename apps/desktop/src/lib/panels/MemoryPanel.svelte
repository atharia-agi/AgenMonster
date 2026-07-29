<script lang="ts">
  // MemoryPanel — surfaces what the agent remembers: recent episodes, facts,
  // and topic affinity. User-curated: per-episode delete + free-text search.
  import { onMount, onDestroy } from 'svelte';
  import { subscribeMemory, getTopTopics, searchMemory, forgetEpisode, type MemoryState, type Episode } from '$lib/memory';
  import { resetMemory } from '$lib/memory';
  import { buildMemoryGraph } from '$lib/memoryGraph';
  import MemoryGraph from './MemoryGraph.svelte';

  let memory = $state<MemoryState>({ episodes: [], facts: {}, topics: [], totalMemories: 0, lastIndexedAt: 0 });
  let unsubscribe: (() => void) | null = null;
  let query = $state('');
  let showClearConfirm = $state(false);
  let selectedEpisode: Episode | null = $state(null);
  let selectedNode: { label: string; kind: string; detail?: string } | null = $state(null);
  let graphSearch = $state('');
  import type { GraphNodeKind } from '$lib/memoryGraph';
  let graphFilter = $state<Set<GraphNodeKind>>(new Set());

  onMount(() => {
    unsubscribe = subscribeMemory((s) => { memory = s; });
  });
  onDestroy(() => { if (unsubscribe) unsubscribe(); });

  const matches = $derived(query.trim() ? searchMemory(query.trim()) : null);
  const recentEpisodes = $derived(matches?.episodes ?? memory.episodes.slice(0, 8));
  const topFacts = $derived(matches?.facts ?? Object.values(memory.facts).slice(0, 6));
  const topTopics = $derived(getTopTopics(8));

  function fmtTs(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function kindLabel(k: Episode['kind']): string {
    return k.toUpperCase().replace('_', ' ');
  }
  function kindColor(k: Episode['kind']): string {
    if (k === 'success') return 'var(--gb-text)';
    if (k === 'error') return '#e85050';
    if (k === 'milestone') return '#88ccf0';
    return 'var(--gb-dark)';
  }
</script>

<div class="memory-panel">
  <div class="search-row">
    <input
      class="search"
      type="text"
      placeholder="search memories…"
      bind:value={query}
      aria-label="Search memories"
    />
    {#if !showClearConfirm}
      <button class="clear-btn" onclick={() => (showClearConfirm = true)}>CLEAR ALL</button>
    {:else}
      <button class="clear-btn confirm" onclick={() => { resetMemory(); showClearConfirm = false; }}>CONFIRM</button>
      <button class="clear-btn cancel" onclick={() => (showClearConfirm = false)}>CANCEL</button>
    {/if}
  </div>

  {#if matches}
    <div class="match-info">Matched {matches.episodes.length} episodes · {matches.facts.length} facts</div>
  {/if}

  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-val">{memory.totalMemories}</div>
      <div class="kpi-lbl">MEMORIES</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">{memory.episodes.length}</div>
      <div class="kpi-lbl">EPISODES</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">{Object.keys(memory.facts).length}</div>
      <div class="kpi-lbl">FACTS</div>
    </div>
  </div>

  <div class="graph-controls">
    <input
      class="search"
      type="text"
      placeholder="search graph nodes…"
      bind:value={graphSearch}
      aria-label="Search graph nodes"
    />
    <div class="filter-chips">
      {#each ['tag', 'fact', 'episode'] as kind_}
        <button
          class="filter-chip"
          class:on={graphFilter.has(kind_ as any)}
          onclick={() => {
            const next = new Set(graphFilter);
            if (next.has(kind_ as any)) next.delete(kind_ as any); else next.add(kind_ as any);
            graphFilter = next;
          }}
        >{kind_}</button>
      {/each}
    </div>
  </div>
  <MemoryGraph
    graph={buildMemoryGraph(memory, 480, 200)}
    height={200}
    searchQuery={graphSearch}
    filterKinds={graphFilter.size > 0 ? graphFilter : undefined}
    onNodeClick={(n) => { selectedNode = { label: n.label, kind: n.kind, detail: (n.meta?.detail as string | undefined) }; selectedEpisode = null; }}
  />
  {#if selectedNode}
    <div class="node-detail">
      <span class="node-detail-label">{selectedNode.label}</span>
      <span class="node-detail-kind">{selectedNode.kind.toUpperCase()}</span>
      {#if selectedNode.detail}<span class="node-detail-val">{selectedNode.detail}</span>{/if}
      <button class="clear-btn cancel" onclick={() => (selectedNode = null)}>CLOSE</button>
    </div>
  {/if}

  {#if topTopics.length > 0}
    <div class="section-label">TOP TOPICS</div>
    <div class="topic-row">
      {#each topTopics as t}
        <span class="topic-chip">
          <span class="topic-name">{t.topic}</span>
          <span class="topic-count">{t.count}</span>
        </span>
      {/each}
    </div>
  {/if}

  {#if topFacts.length > 0}
    <div class="section-label">FACTS</div>
    <div class="fact-list">
      {#each topFacts as f}
        <div class="fact-row">
          <span class="fact-key">{f.key}</span>
          <span class="fact-val">{f.value}</span>
          <span class="fact-conf">{(f.confidence * 100).toFixed(0)}%</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if recentEpisodes.length > 0}
    <div class="section-label">RECENT EPISODES</div>
    <div class="episode-list">
      {#each recentEpisodes as ep}
        <div
          class="episode-row"
          class:selected={selectedEpisode?.id === ep.id}
          role="button"
          tabindex="0"
          aria-label="Episode: {ep.title}"
          onclick={() => { selectedEpisode = selectedEpisode?.id === ep.id ? null : ep; selectedNode = null; }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedEpisode = selectedEpisode?.id === ep.id ? null : ep; selectedNode = null; } }}
        >
          <span class="ep-kind" style="color:{kindColor(ep.kind)}">{kindLabel(ep.kind)}</span>
          <span class="ep-title">{ep.title}</span>
          <span class="ep-ts">{fmtTs(ep.ts)}</span>
          <button class="ep-del" onclick={(e) => { e.stopPropagation(); forgetEpisode(ep.id); if (selectedEpisode?.id === ep.id) selectedEpisode = null; }} aria-label="Forget this episode">×</button>
        </div>
        {#if selectedEpisode?.id === ep.id}
          <div class="ep-detail">
            <div class="ep-detail-label">DETAIL</div>
            <div class="ep-detail-text">{ep.detail || '(no detail)'}</div>
            {#if ep.tags.length}<div class="ep-detail-tags">{(ep.tags || []).map(t => '#' + t).join(' ')}</div>{/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if memory.totalMemories === 0}
    <div class="empty">No memories yet — start chatting to build memory.</div>
  {/if}
</div>

<style>
  .memory-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .kpi-row {
    display: flex;
    gap: 4px;
    justify-content: space-between;
  }
  .kpi {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
  }
  .kpi-val {
    font-size: 16px;
    color: var(--gb-text);
    line-height: 1;
  }
  .kpi-lbl {
    font-size: 6px;
    color: var(--gb-dark);
    letter-spacing: 0.6px;
    margin-top: 3px;
  }
  .section-label {
    font-size: 7px;
    color: var(--gb-dark);
    letter-spacing: 0.5px;
    border-bottom: 2px dashed var(--gb-dark);
    padding-bottom: 2px;
  }
  .topic-row {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .topic-chip {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 5px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    font-size: 7px;
    color: var(--gb-text);
  }
  .topic-count {
    color: var(--gb-dark);
    font-size: 6px;
  }
  .fact-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .fact-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-bg);
    font-size: 7px;
  }
  .fact-key {
    color: var(--gb-dark);
    min-width: 50px;
  }
  .fact-val {
    flex: 1;
    color: var(--gb-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fact-conf {
    color: var(--gb-dark);
    font-size: 6px;
  }
  .episode-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 180px;
    overflow-y: auto;
  }
  .episode-list::-webkit-scrollbar { width: 6px; }
  .episode-list::-webkit-scrollbar-thumb { background: var(--gb-dark); }
  .episode-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 4px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-bg);
    font-size: 7px;
  }
  .ep-kind {
    font-size: 6px;
    letter-spacing: 0.3px;
    min-width: 44px;
  }
  .ep-title {
    flex: 1;
    color: var(--gb-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ep-ts {
    color: var(--gb-dark);
    font-size: 6px;
  }
  .empty {
    padding: 8px;
    text-align: center;
    font-size: 8px;
    color: var(--gb-dark);
    border: 2px dashed var(--gb-dark);
  }
  .ep-del {
    width: 16px;
    height: 16px;
    line-height: 1;
    font-family: var(--font-body);
    font-size: 9px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .ep-del:hover { background: #e85050; color: var(--gb-bg); border-color: var(--gb-text); }
  .search-row {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .search {
    flex: 1;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-text);
    font-family: var(--font-body);
    font-size: 9px;
    padding: 3px 6px;
    outline: none;
    image-rendering: pixelated;
  }
  .search::placeholder { color: var(--gb-dark); }
  .search:focus { border-color: var(--gb-text); }
  .clear-btn, .clear-btn.confirm, .clear-btn.cancel {
    font-family: var(--font-body);
    font-size: 7px;
    padding: 4px 6px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .clear-btn:hover { background: var(--gb-border); color: var(--gb-bg); }
  .clear-btn.confirm { background: #e85050; color: var(--gb-bg); border-color: var(--gb-text); }
  .clear-btn.confirm:hover { background: #c93030; }
  .clear-btn.cancel { color: var(--gb-text); }
  .graph-controls {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }
  .filter-chips {
    display: flex;
    gap: 3px;
  }
  .filter-chip {
    font-family: var(--font-body);
    font-size: 7px;
    padding: 2px 6px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .filter-chip.on {
    background: var(--gb-border);
    color: var(--gb-bg);
  }

  .match-info {
    font-size: 7px;
    color: var(--gb-dark);
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
    padding: 3px 6px;
    font-family: var(--font-body);
  }
  .episode-row { cursor: pointer; }
  .episode-row:hover { background: var(--gb-bg); }
  .episode-row.selected { border-color: var(--gb-text); background: var(--gb-panel); }
  .ep-detail {
    padding: 4px 6px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-text);
    font-size: 7px;
    color: var(--gb-text);
    line-height: 1.6;
  }
  .ep-detail-label {
    font-size: 6px;
    color: var(--gb-dark);
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .ep-detail-text {
    font-family: var(--font-body);
    margin-bottom: 3px;
  }
  .ep-detail-tags {
    color: var(--gb-dark);
    font-family: var(--font-body);
  }

  .node-detail {
    padding: 6px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-text);
    font-size: 7px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: var(--font-body);
  }
  .node-detail-label { color: var(--gb-text); font-weight: bold; }
  .node-detail-kind { color: var(--gb-dark); letter-spacing: 0.5px; }
  .node-detail-val { color: var(--gb-dark); }
  .clear-btn.cancel { color: var(--gb-text); }
</style>
