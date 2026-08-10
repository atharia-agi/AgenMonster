<script lang="ts">
  import PixelPetV2 from '$lib/render/PixelPetV2.svelte';

  let { stage = 'egg', mood = 'idle', activity = 'idle', level = 1, xp = 0, xpToNext = 50, form = undefined } = $props<{
    stage?: string; mood?: string; activity?: string;
    level?: number; xp?: number; xpToNext?: number;
    form?: any;
  }>();

  let showPet = $state(false);

  const activityLabel: Record<string, string> = {
    browsing: 'BROWSING', coding: 'CODING', researching: 'RESEARCHING',
    automating: 'AUTO', deploying: 'DEPLOY', sleeping: 'SLEEP',
    eating: 'EAT', idle: 'IDLE', erroring: 'ERR',
  };

  const moodLabel: Record<string, string> = {
    idle: 'IDLE', happy: 'HAPPY', sleepy: 'SLEEPY', proud: 'PROUD',
    excited: 'EXCITED', focused: 'FOCUSED', thinking: 'THINKING',
    sad: 'SAD', angry: 'ANGRY', frustrated: 'FRUSTRATED', tired: 'TIRED',
  };

  const xpPercent = $derived(xpToNext > 0 ? Math.min(100, (xp / xpToNext) * 100) : 0);
</script>

<div class="monster-header">
  <div class="pet-toggle" role="button" tabindex="0" onclick={() => showPet = !showPet} onkeydown={(e) => { if (e.key === 'Enter') showPet = !showPet; }}>
    <div class="pet-mini">
      <PixelPetV2 width={48} height={36} {mood} {stage} facing="left" {form} />
    </div>
  </div>

  <div class="pet-info">
    <div class="pet-name">
      <span class="ico ico-stage-{stage}" style="width:6px;height:6px;border:1px solid #0f380f;background:#0f380f"></span>
      <span class="name">AGENMONSTER</span>
      <span class="level">Lv.{level}</span>
    </div>
    <div class="pet-bar">
      <div class="xp-bar">
        <div class="xp-fill" style="width:{xpPercent}%"></div>
      </div>
      <span class="xp-text">{xp}/{xpToNext}</span>
    </div>
  </div>

  <div class="pet-status">
    <span class="status-dot" class:idle={activity === 'idle'}></span>
    <span class="activity-text">{activityLabel[activity] || 'IDLE'}</span>
  </div>

  {#if showPet}
    <div class="pet-expanded">
      <div class="pet-large">
        <PixelPetV2 width={120} height={90} {mood} {stage} facing="left" {form} />
      </div>
      <div class="pet-details">
        <span class="mood-label">{moodLabel[mood] || mood.toUpperCase()}</span>
        <span class="stage-label">{stage.toUpperCase()}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .monster-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
    min-height: 56px;
    font-family: var(--font-body);
  }

  .pet-toggle {
    cursor: pointer;
    border: 1px solid var(--border-default);
    padding: var(--sp-1);
    background: var(--bg-overlay);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .pet-toggle:hover { background: var(--bg-hover); border-color: var(--border-strong); }
  .pet-mini {
    width: 48px;
    height: 36px;
    overflow: hidden;
    background: var(--bg-overlay);
    border-radius: var(--radius-sm);
  }

  .pet-info { flex: 1; min-width: 0; }
  .pet-name {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    margin-bottom: var(--sp-1);
  }
  .name {
    font-family: var(--font-body);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.02em;
  }
  .level {
    font-size: var(--fs-2xs);
    color: var(--text-primary);
    background: var(--accent-subtle);
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 1px var(--sp-1);
    font-family: var(--font-mono);
    border-radius: var(--radius-sm);
    font-weight: 600;
  }
  .pet-bar {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
  }
  .xp-bar {
    flex: 1;
    height: 6px;
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    overflow: hidden;
    border-radius: 3px;
  }
  .xp-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s var(--ease-default);
    border-radius: 3px;
  }
  .xp-text {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    white-space: nowrap;
    font-family: var(--font-mono);
  }

  .pet-status {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
  }
  .status-dot {
    width: 6px;
    height: 6px;
    background: var(--text-muted);
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.idle { background: var(--text-muted); }
  .activity-text {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pet-expanded {
    position: absolute;
    top: 100%;
    right: var(--sp-3);
    z-index: 100;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    padding: var(--sp-3);
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .pet-large {
    width: 120px;
    height: 90px;
    overflow: hidden;
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    margin-bottom: var(--sp-2);
    border-radius: var(--radius-md);
  }
  .pet-details {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
