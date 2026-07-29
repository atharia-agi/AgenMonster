<script lang="ts">
  let { crystals = [], max = 50 } = $props<{ crystals?: Array<{ id: string; title: string; description: string; color: string; earnedAt: number }>; max?: number }>();

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
  .crystals-panel { padding: 2px 0; font-family: var(--font-body); image-rendering: pixelated; }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    border-bottom: 3px solid var(--gb-border);
    padding-bottom: 4px;
  }
  .panel-title { font-size: 8px; color: var(--gb-text); text-transform: uppercase; letter-spacing: 0.5px; }
  .count { font-size: 8px; color: var(--gb-dark); }
  .crystals-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
  }
  .crystal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 2px;
  }
  .crystal-shape {
    width: 14px;
    height: 16px;
    border: 3px solid var(--gb-text);
    background: var(--gb-border);
    image-rendering: pixelated;
  }
  .empty-shape { border-color: var(--gb-dark); background: var(--gb-panel); }
  .crystal-label {
    font-size: 6px;
    color: var(--gb-text);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 48px;
    font-family: var(--font-body);
  }
  .crystal.empty { opacity: 0.4; }
</style>
