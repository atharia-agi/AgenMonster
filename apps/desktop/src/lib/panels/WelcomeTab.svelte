<script lang="ts">
  // Welcome Tab — onboarding / quick-start. Auto-shown on first session.
  import { getGameState } from '$lib/gameState';
  import { getPersonalityForStage } from '$lib/personality';
  import { soundPlayer } from '$lib/audio';
  import PixelPetV2 from '$lib/render/PixelPetV2.svelte';

  let { onDismiss } = $props<{ onDismiss?: () => void }>();

  const gs = getGameState();
  const stage = gs.stage || 'egg';
  const personality = getPersonalityForStage(stage);
  const isFirstLaunch = (() => {
    try {
      const raw = window.localStorage.getItem('agenmonster_welcomed');
      return !raw;
    } catch { return true; }
  })();

  function dismiss() {
    try { window.localStorage.setItem('agenmonster_welcomed', '1'); } catch {}
    onDismiss?.();
  }

  const steps = [
    { num: '01', title: 'CHAT',          desc: 'Type anything. Send 5 messages to unlock the first crystal.' },
    { num: '02', title: 'CARE',          desc: 'FEED / PLAY / TALK feed hunger, affection and XP.' },
    { num: '03', title: 'GROW',          desc: 'Pet evolves through 7 stages — EGG → MEGA.' },
    { num: '04', title: 'TIME',          desc: 'Real clock drives the schedule. 22h-5h = sleep.' },
    { num: '05', title: 'CRYSTALS',      desc: 'Milestones unlock crystals forever. Re-color shown.' },
  ];
</script>

<div class="welcome-panel" class:intro={isFirstLaunch}>
  <div class="welcome-header">
    <div class="welcome-pet">
      <PixelPetV2 width={140} height={90} mood={gs.mood} {stage} facing="left" externalSpeech={isFirstLaunch ? 'hi!' : ''} />
    </div>
    <div class="welcome-titles">
      <span class="welcome-label">AGENMONSTER</span>
      <span class="welcome-stage">STAGE&nbsp;·&nbsp;{stage.toUpperCase()}</span>
      <span class="welcome-personality">{personality.name.toUpperCase()} PERSONALITY</span>
      <span class="welcome-desc">{personality.description}</span>
    </div>
  </div>

  <div class="welcome-steps">
    {#each steps as step}
      <div class="step">
        <span class="step-num">{step.num}</span>
        <div class="step-body">
          <span class="step-title">{step.title}</span>
          <span class="step-desc">{step.desc}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="welcome-tip">
    <span class="tip-label">TIP</span>
    <span class="tip-text">SETTINGS TAB lets you toggle sound, reset pet, or inspect personality.</span>
  </div>

  <div class="welcome-footer">
    <button class="dismiss-btn" onclick={() => { try { soundPlayer.play('click'); } catch {} dismiss(); }}>
      {isFirstLaunch ? 'GOT IT' : 'CLOSE'}
    </button>
  </div>
</div>

<style>
  .welcome-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .welcome-panel.intro {
    border-color: var(--gb-text);
    outline: var(--gb-stroke) solid var(--gb-panel);
    outline-offset: -8px;
  }

  .welcome-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 8px;
    border-bottom: var(--gb-stroke) dashed var(--gb-dark);
  }
  .welcome-pet {
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 2px;
    flex-shrink: 0;
  }
  .welcome-titles {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .welcome-label {
    font-size: 11px;
    color: var(--gb-text);
    letter-spacing: 1px;
  }
  .welcome-stage {
    font-size: 7px;
    color: var(--gb-dark);
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 1px 4px;
    align-self: flex-start;
  }
  .welcome-personality {
    font-size: 8px;
    color: var(--gb-text);
  }
  .welcome-desc {
    font-size: 7px;
    color: var(--gb-dark);
    line-height: 1.6;
  }

  .welcome-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 6px;
  }
  .step {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
  }
  .step-num {
    font-size: 11px;
    color: var(--gb-text);
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    padding: 4px 6px;
    min-width: 24px;
    text-align: center;
    flex-shrink: 0;
  }
  .step-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .step-title {
    font-size: 8px;
    color: var(--gb-text);
    letter-spacing: 0.5px;
  }
  .step-desc {
    font-size: 6px;
    color: var(--gb-dark);
    line-height: 1.6;
  }

  .welcome-tip {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
  }
  .tip-label {
    font-size: 7px;
    color: var(--gb-bg);
    background: var(--gb-text);
    padding: 2px 4px;
    flex-shrink: 0;
  }
  .tip-text {
    font-size: 7px;
    color: var(--gb-dark);
    line-height: 1.6;
  }

  .welcome-footer {
    display: flex;
    justify-content: flex-end;
  }
  .dismiss-btn {
    background: var(--gb-border);
    color: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-text);
    padding: 6px 12px;
    font-family: var(--font-body);
    font-size: 9px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: background 0.1s steps(2);
  }
  .dismiss-btn:hover {
    background: var(--gb-text);
  }
</style>
