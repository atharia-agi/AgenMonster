<script lang="ts">
  // Minimized Bar -- compact taskbar widget showing key stats.
  import type { GameState } from '$lib/gameState';

  let { state, onExpand } = $props<{ state: GameState; onExpand: () => void }>();

  const xpPct = $derived(Math.round((state.xp / state.xpToNext) * 100));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="minimized-bar" onclick={onExpand}>
  <div class="section monster-section">
    <span class="ico ico-sm ico-stage-{state.stage}"></span>
    <div class="mini-info">
      <span class="mini-level">LV.{state.level}</span>
      <span class="mini-xp-pct">{xpPct}%</span>
    </div>
  </div>

  <div class="section xp-section">
    <div class="mini-bar xp-bar">
      <div class="fill" style="width:{xpPct}%"></div>
    </div>
    <span class="mini-val">{state.xp.toLocaleString()} / {state.xpToNext.toLocaleString()}</span>
  </div>

  <div class="section energy-section">
    <span class="ico ico-sm ico-need-energy"></span>
    <span class="mini-val">{state.energy}/{state.maxEnergy}</span>
  </div>

  <div class="section mood-section">
    <span class="ico ico-sm ico-mood-{state.mood}"></span>
    <span class="mini-val">{state.mood}</span>
  </div>

  <div class="section task-section">
    <span class="mini-task-label">Task:</span>
    <span class="mini-task">{state.activeTasks[0]?.title || 'None'}</span>
  </div>
</div>

<style>
  .minimized-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 12px;
    background: #111122;
    border: 1px solid #333;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 10px;
    cursor: pointer;
    height: 36px;
  }
  .section {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .mini-icon { font-size: 0; }
  .mini-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .mini-level {
    font-size: 10px;
    color: var(--active-primary);
    font-weight: bold;
  }
  .mini-xp-pct { font-size: 9px; color: #bbb; }
  .mini-bar {
    width: 50px;
    height: 5px;
    background: #1a1a2e;
    border: 1px solid #555;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--active-primary);
    transition: width 0.3s steps(8);
  }
  .mini-val { color: #ccc; }
  .mini-task-label { color: #999; }
  .mini-task { color: var(--active-primary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
