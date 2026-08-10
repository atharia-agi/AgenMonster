<script lang="ts">
  import type { MemoryCrystal } from '$lib/gameState';
  let { crystals = [], max = 50 } = $props<{ crystals?: MemoryCrystal[]; max?: number }>();

  const displaySlots = $derived(Math.min(max, Math.max(crystals.length + 3, 8)));
</script>

<div class="crystals-panel">
  <div class="panel-header">
    <span class="panel-title">CRYSTALS</span>
    <span class="count">{crystals.length}/{max}</span>
  </div>
  <div class="crystals-grid">
    {#each crystals as crystal}
      <div class="crystal" title="{crystal.title}: {crystal.description}">
        <div class="crystal-shape"></div>
        <span class="crystal-label">{crystal.title.toUpperCase()}</span>
      </div>
    {/each}
    {#each Array(displaySlots - crystals.length) as _}
      <div class="crystal empty">
        <div class="crystal-shape empty-shape"></div>
      </div>
    {/each}
  </div>
</div>

<style>
  .crystals-panel { padding: var(--sp-1) 0; font-family: var(--font-body); }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-2);
    border-bottom: 1px solid var(--border-default);
    padding-bottom: var(--sp-1);
  }
  .panel-title { font-size: var(--fs-xs); color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
  .count { font-size: var(--fs-xs); color: var(--text-muted); font-family: var(--font-mono); font-weight: 600; }
  .crystals-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sp-1);
  }
  .crystal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .crystal:hover { background: var(--bg-hover); }
  .crystal-shape {
    width: 18px;
    height: 20px;
    border: 1px solid var(--accent);
    background: var(--accent-subtle);
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .empty-shape { border-color: var(--border-default); background: var(--bg-overlay); }
  .crystal-label {
    font-size: var(--fs-2xs);
    color: var(--text-secondary);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 48px;
    font-family: var(--font-mono);
  }
  .crystal.empty { opacity: 0.3; }
</style>
