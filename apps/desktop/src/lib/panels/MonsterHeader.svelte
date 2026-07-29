<script lang="ts">
  import PixelPetV2 from '$lib/render/PixelPetV2.svelte';

  let { stage = 'egg', mood = 'idle', activity = 'idle', level = 1, xp = 0, xpToNext = 50 } = $props<{
    stage?: string; mood?: string; activity?: string;
    level?: number; xp?: number; xpToNext?: number;
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
      <PixelPetV2 width={48} height={36} {mood} {stage} facing="left" />
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
        <PixelPetV2 width={120} height={90} {mood} {stage} facing="left" />
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
    gap: 8px;
    padding: 4px 8px;
    background: var(--gb-panel);
    border-bottom: var(--gb-stroke) solid var(--gb-border);
    flex-shrink: 0;
    min-height: 52px;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }

  .pet-toggle {
    cursor: pointer;
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 2px;
    background: var(--gb-bg);
    image-rendering: pixelated;
  }
  .pet-toggle:hover { background: var(--gb-dark); }
  .pet-mini {
    width: 48px;
    height: 36px;
    overflow: hidden;
    background: var(--gb-bg);
    image-rendering: pixelated;
  }

  .pet-info { flex: 1; min-width: 0; }
  .pet-name {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 3px;
  }
  .name {
    font-family: var(--font-body);
    font-size: 9px;
    color: var(--gb-text);
  }
  .level {
    font-size: 7px;
    color: var(--gb-dark);
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 1px 3px;
    font-family: var(--font-body);
  }
  .pet-bar {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .xp-bar {
    flex: 1;
    height: 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    overflow: hidden;
    image-rendering: pixelated;
  }
  .xp-fill {
    height: 100%;
    background: var(--gb-border);
    transition: width 0.3s steps(8);
    image-rendering: pixelated;
  }
  .xp-text {
    font-size: 6px;
    color: var(--gb-dark);
    white-space: nowrap;
    font-family: var(--font-body);
  }

  .pet-status {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    background: var(--gb-border);
    border: var(--gb-stroke) solid var(--gb-dark);
    image-rendering: pixelated;
  }
  .status-dot.idle { background: var(--gb-dark); }
  .activity-text {
    font-size: 7px;
    color: var(--gb-dark);
    font-family: var(--font-body);
  }

  .pet-expanded {
    position: absolute;
    top: 100%;
    right: 8px;
    z-index: 100;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 8px;
    image-rendering: pixelated;
  }
  .pet-large {
    width: 120px;
    height: 90px;
    overflow: hidden;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    margin-bottom: 6px;
    image-rendering: pixelated;
  }
  .pet-details {
    display: flex;
    justify-content: space-between;
    font-size: 7px;
    color: var(--gb-text);
    font-family: var(--font-body);
  }
</style>
