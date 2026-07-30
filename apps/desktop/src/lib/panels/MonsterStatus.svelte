<script lang="ts">
  import Icon from '$lib/ui/Icon.svelte';
  import { pickActiveGoal, type Goal } from '$lib/goals';

  let { state, goals = [], onFeed, onPlay, onTalk, onGoalClick, streaming = false } = $props<{
    state: any;
    goals?: Goal[];
    onFeed?: (e: MouseEvent) => void;
    onPlay?: (e: MouseEvent) => void;
    onTalk?: (e: MouseEvent) => void;
    onGoalClick?: (e: MouseEvent) => void;
    streaming?: boolean;
  }>();

  const activeGoal = $derived(pickActiveGoal(goals));

  const stageIcon = $derived('stage_' + (state.stage || 'egg'));
  const relationshipLabel = $derived(
    String(state.relationshipLevel || 'stranger').replace('_', ' ').toUpperCase()
  );
  function getPresence(ts: number): string {
    const idleMs = Date.now() - ts;
    return idleMs > 8 * 3600000 ? 'dormant' : idleMs > 2 * 3600000 ? 'idle' : 'awake';
  }
</script>

<div class="status-panel">
  <div class="ribbon-header" class:streaming>
    <Icon name={stageIcon} size={20} color="var(--gb-text)" />
    <div class="ribbon-info">
      <div class="ribbon-name">{state.name.toUpperCase()}</div>
      <div class="ribbon-meta">
        <span class="ribbon-chip">{state.stage.toUpperCase()}</span>
        <span class="ribbon-chip">LV.{state.level}</span>
        <span class="ribbon-chip accent">{relationshipLabel}</span>
        {#if activeGoal && !activeGoal.doneAt}
          <span
            class="ribbon-chip goal-chip"
            role="button"
            tabindex="0"
            aria-label="Active goal: {activeGoal.title}"
            title="Active goal"
            onclick={onGoalClick}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick?.(e); } }}
          >▶ {activeGoal.title.slice(0, 20)}</span>
        {/if}
      </div>
    </div>
    <div class="ribbon-knot">◆</div>
  </div>

  <div class="xp-row">
    <span class="label">XP</span>
    <div class="bar"><div class="fill xp-fill" style="width:{state.xpToNext > 0 ? (state.xp / state.xpToNext) * 100 : 0}%"></div></div>
    <span class="val">{state.xp}/{state.xpToNext}</span>
  </div>

  <div class="stat-row">
    <span class="label">MOOD</span>
    <span class="mood-icon ico ico-mood-{state.mood}"></span>
    <span class="val mood-val">{state.mood.toUpperCase()}</span>
  </div>

  <div class="stat-row">
    <span class="label">ACTIVITY</span>
    <span class="val">{state.activity.toUpperCase()}</span>
  </div>

    <div class="stat-row">
      <span class="label">BOND</span>
      <span class="val">{String(state.relationshipLevel || 'stranger').replace('_', ' ').toUpperCase()}</span>
    </div>

  <div class="stat-row">
    <span class="label">PRESENCE</span>
    <span class="presence-dot presence-{getPresence(state.lastActivityTs ?? Date.now())}"></span>
    <span class="val">{getPresence(state.lastActivityTs ?? Date.now()).toUpperCase()}</span>
  </div>

  <div class="actions">
    <button class="action-btn feed" onclick={onFeed} title="Feed">
      <span class="ico ico-sm ico-dot"></span> FEED
    </button>
    <button class="action-btn play" onclick={onPlay} title="Play">
      <span class="ico ico-sm ico-dot"></span> PLAY
    </button>
    <button class="action-btn talk" onclick={onTalk} title="Talk">
      <span class="ico ico-sm ico-dot"></span> TALK
    </button>
  </div>
</div>

<style>
  .status-panel { padding: 0; font-family: var(--font-body); image-rendering: pixelated; }

  .ribbon-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--gb-bg);
    border-bottom: var(--gb-stroke) solid var(--gb-border);
    position: relative;
  }
  .ribbon-header::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gb-border);
    z-index: 1;
  }
  .ribbon-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .ribbon-name {
    font-size: 9px;
    color: var(--gb-text);
    letter-spacing: 1px;
    line-height: 1;
  }
  .ribbon-meta {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }
  .ribbon-chip {
    font-size: 6px;
    color: var(--gb-dark);
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
    padding: 1px 4px;
  }
  .ribbon-chip.accent {
    background: var(--gb-border);
    color: var(--gb-bg);
  }
  .goal-chip {
    background: var(--gb-text);
    color: var(--gb-bg);
    cursor: pointer;
    border-color: var(--gb-border);
  }
  .ribbon-knot {
    font-size: 10px;
    color: var(--gb-border);
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    flex-shrink: 0;
  }
  .ribbon-header.streaming {
    animation: headerPulse 1.2s steps(2) infinite;
  }
  @keyframes headerPulse {
    0%, 100% { background: var(--gb-bg); }
    50% { background: #1a2a1a; }
  }
  .presence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    image-rendering: pixelated;
  }
  .presence-awake { background: #0f380f; }
  .presence-idle { background: #6a6; }
  .presence-dormant { background: #555; }
</style>
