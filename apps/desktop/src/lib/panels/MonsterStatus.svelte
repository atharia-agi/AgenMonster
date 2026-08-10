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
    <Icon name={stageIcon} size={20} color="var(--text-primary)" />
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
  .status-panel { padding: 0; font-family: var(--font-body); }

  .ribbon-header {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    position: relative;
  }
  .ribbon-header::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--border-strong);
    z-index: 1;
  }
  .ribbon-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }
  .ribbon-name {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.05em;
    line-height: 1;
  }
  .ribbon-meta {
    display: flex;
    gap: var(--sp-1);
    flex-wrap: wrap;
  }
  .ribbon-chip {
    font-size: var(--fs-2xs);
    color: var(--text-secondary);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    padding: 1px var(--sp-1);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .ribbon-chip.accent {
    background: var(--accent-subtle);
    color: var(--accent);
    border-color: rgba(99, 102, 241, 0.2);
  }
  .goal-chip {
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    border-color: var(--accent);
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .goal-chip:hover { background: var(--accent-hover); }
  .ribbon-knot {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    flex-shrink: 0;
    border-radius: var(--radius-md);
  }
  .ribbon-header.streaming {
    animation: headerPulse 1.2s ease-in-out infinite;
  }
  @keyframes headerPulse {
    0%, 100% { background: var(--bg-elevated); }
    50% { background: var(--accent-subtle); }
  }
  .presence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .presence-awake { background: var(--success); box-shadow: 0 0 4px rgba(16, 185, 129, 0.4); }
  .presence-idle { background: var(--warning); }
  .presence-dormant { background: var(--text-muted); }
</style>
