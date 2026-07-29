<script lang="ts">
  // LevelUpModal — full-screen evolution cutscene (Pokémon evo vibe).
  let { stage, level, xpToNext, open = false, onComplete } = $props<{
    stage: string;
    level: number;
    xpToNext: number;
    open?: boolean;
    onComplete?: () => void;
  }>();

  let phase = $state('flash'); // flash → text → card → done
  let frame = $state(0);

  $effect(() => {
    if (!open) return;
    frame = 0;
    phase = 'flash';
    const t1 = setTimeout(() => { phase = 'text'; }, 900);
    const t2 = setTimeout(() => { phase = 'card'; }, 1800);
    const t3 = setTimeout(() => { phase = 'done'; onComplete?.(); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  });

  const stageLabels: Record<string, string> = {
    egg: 'EGG', hatchling: 'HATCHLING', baby: 'BABY', child: 'CHILD',
    teen: 'TEEN', adult: 'ADULT', mega: 'MEGA',
  };
</script>

{#if open}
  <div class="modal-layer" class:flash={phase === 'flash'} class:text-phase={phase === 'text'} class:card-phase={phase === 'card'}>
    <div class="flash-overlay"></div>
    {#if phase === 'text'}
      <div class="evo-text">
        <div class="evo-label">LEVEL UP</div>
        <div class="evo-stage">{stageLabels[stage] || stage.toUpperCase()}</div>
      </div>
    {/if}
    {#if phase === 'card'}
      <div class="evo-card">
        <div class="evo-rank">LV.{level}</div>
        <div class="evo-name">{stage.toUpperCase()}</div>
        <div class="evo-next">NEXT · {xpToNext} XP</div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .modal-layer {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .flash-overlay {
    position: absolute;
    inset: 0;
    background: var(--gb-bg);
    opacity: 0;
  }
  .modal-layer.flash .flash-overlay {
    animation: evo-flash 0.9s steps(2) forwards;
  }
  @keyframes evo-flash {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }
  .evo-text {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: evo-pop 0.4s steps(3) forwards;
  }
  .evo-label {
    font-size: 14px;
    color: var(--gb-text);
    letter-spacing: 4px;
  }
  .evo-stage {
    font-size: 24px;
    color: var(--gb-border);
    animation: evo-bounce 0.6s steps(4) forwards;
  }
  @keyframes evo-pop {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes evo-bounce {
    0% { transform: translateY(10px); }
    50% { transform: translateY(-4px); }
    100% { transform: translateY(0); }
  }
  .evo-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 32px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    outline: 4px solid var(--gb-border);
    outline-offset: -10px;
    animation: evo-card-in 0.5s steps(3) forwards;
  }
  .evo-rank {
    font-size: 11px;
    color: var(--gb-dark);
  }
  .evo-name {
    font-size: 20px;
    color: var(--gb-text);
    letter-spacing: 3px;
  }
  .evo-next {
    font-size: 8px;
    color: var(--gb-dark);
    letter-spacing: 0.5px;
  }
  @keyframes evo-card-in {
    from { opacity: 0; transform: scale(0.8) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
</style>
