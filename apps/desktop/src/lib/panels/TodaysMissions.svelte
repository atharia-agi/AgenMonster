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
  .missions-panel { padding: var(--sp-1) 0; font-family: var(--font-body); }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-1);
    border-bottom: 1px solid var(--border-default);
    padding-bottom: var(--sp-1);
  }
  .panel-title { font-size: var(--fs-xs); color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
  .count { font-size: var(--fs-xs); color: var(--text-muted); font-family: var(--font-mono); font-weight: 600; }
  .missions-list { display: flex; flex-direction: column; gap: var(--sp-1); }
  .mission-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-2);
    border-bottom: 1px solid var(--border-subtle);
    transition: all var(--duration-fast) var(--ease-default);
    border-radius: var(--radius-sm);
  }
  .mission-row.done { opacity: 0.4; }
  .check { font-size: var(--fs-sm); color: var(--text-muted); width: 16px; text-align: center; font-weight: 700; }
  .mission-row.done .check { color: var(--success); }
  .mission-info { flex: 1; min-width: 0; }
  .mission-title { font-size: var(--fs-xs); color: var(--text-secondary); letter-spacing: 0.02em; }
  .mission-bar {
    width: 48px;
    height: 6px;
    background: var(--bg-overlay);
    overflow: hidden;
    border: 1px solid var(--border-default);
    border-radius: 3px;
  }
  .fill { height: 100%; background: var(--accent); transition: width 0.3s var(--ease-default); border-radius: 3px; }
</style>
