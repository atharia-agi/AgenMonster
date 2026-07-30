<script lang="ts">
  import type { Mission } from '$lib/gameState';
  let { missions = [], completed = 0, total = 0 } = $props<{
    missions?: Mission[];
    completed?: number;
    total?: number;
  }>();
</script>

<div class="missions-panel">
  <div class="panel-header">
    <span class="panel-title">MISSIONS</span>
    <span class="count">{completed}/{total}</span>
  </div>
  <div class="missions-list">
    {#each missions as mission}
      <div class="mission-row" class:done={mission.completed}>
        <span class="check">{mission.completed ? '✓' : '○'}</span>
        <div class="mission-info">
          <div class="mission-title">{mission.title.toUpperCase()}</div>
        </div>
        {#if !mission.completed && mission.maxProgress > 0}
          <div class="mission-bar">
            <div class="fill" style="width:{Math.min(100, (mission.progress / mission.maxProgress) * 100)}%"></div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .missions-panel { padding: 2px 0; font-family: var(--font-body); image-rendering: pixelated; }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
    border-bottom: 3px solid var(--gb-border);
    padding-bottom: 4px;
  }
  .panel-title { font-size: 8px; color: var(--gb-text); text-transform: uppercase; letter-spacing: 0.5px; }
  .count { font-size: 8px; color: var(--gb-dark); }
  .missions-list { display: flex; flex-direction: column; gap: 2px; }
  .mission-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    border-bottom: 2px solid var(--gb-dark);
  }
  .mission-row.done { opacity: 0.3; }
  .check { font-size: 10px; color: var(--gb-dark); width: 12px; text-align: center; }
  .mission-row.done .check { color: var(--gb-text); }
  .mission-info { flex: 1; min-width: 0; }
  .mission-title { font-size: 7px; color: var(--gb-text); }
  .mission-bar {
    width: 36px;
    height: 10px;
    background: var(--gb-bg);
    overflow: hidden;
    border: 3px solid var(--gb-border);
    image-rendering: pixelated;
  }
  .fill { height: 100%; background: var(--gb-border); transition: width 0.3s steps(8); }
</style>
