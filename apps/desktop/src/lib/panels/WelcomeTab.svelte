<script lang="ts">
  // Welcome Tab — onboarding / quick-start. Auto-shown on first session.
  import { getGameState } from '$lib/gameState';
  import { getPersonalityForStage } from '$lib/personality';
  import { soundPlayer } from '$lib/audio';
  import PixelPetV2 from '$lib/render/PixelPetV2.svelte';

  let { onDismiss, form = undefined } = $props<{ onDismiss?: () => void; form?: any }>();

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
      <PixelPetV2 width={140} height={90} mood={gs.mood} {stage} facing="left" externalSpeech={isFirstLaunch ? 'hi!' : ''} {form} />
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
    gap: var(--sp-3);
    padding: var(--sp-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    font-family: var(--font-body);
    border-radius: var(--radius-lg);
  }
  .welcome-panel.intro {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent-subtle);
  }

  .welcome-header {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding-bottom: var(--sp-2);
    border-bottom: 1px dashed var(--border-default);
  }
  .welcome-pet {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    padding: var(--sp-1);
    flex-shrink: 0;
    border-radius: var(--radius-md);
  }
  .welcome-titles {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    flex: 1;
    min-width: 0;
  }
  .welcome-label {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.05em;
  }
  .welcome-stage {
    font-size: var(--fs-2xs);
    color: var(--text-secondary);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    padding: 2px var(--sp-1);
    align-self: flex-start;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .welcome-personality {
    font-size: var(--fs-xs);
    color: var(--text-primary);
    font-weight: 600;
  }
  .welcome-desc {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    line-height: 1.6;
  }

  .welcome-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--sp-2);
  }
  .step {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .step:hover { background: var(--bg-hover); border-color: var(--border-strong); }
  .step-num {
    font-size: var(--fs-sm);
    color: var(--text-primary);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    padding: var(--sp-1) var(--sp-2);
    min-width: 28px;
    text-align: center;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .step-body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }
  .step-title {
    font-size: var(--fs-xs);
    color: var(--text-primary);
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .step-desc {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    line-height: 1.6;
  }

  .welcome-tip {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
  }
  .tip-label {
    font-size: var(--fs-2xs);
    color: #fff;
    background: var(--accent);
    padding: 2px var(--sp-1);
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .tip-text {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .welcome-footer {
    display: flex;
    justify-content: flex-end;
  }
  .dismiss-btn {
    background: var(--accent);
    color: #fff;
    border: 1px solid var(--accent);
    padding: var(--sp-2) var(--sp-3);
    font-family: var(--font-body);
    font-size: var(--fs-sm);
    cursor: pointer;
    letter-spacing: 0.05em;
    border-radius: var(--radius-md);
    font-weight: 600;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .dismiss-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); transform: translateY(-1px); }
</style>
