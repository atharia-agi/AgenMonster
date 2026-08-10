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
  }
  .flash-overlay {
    position: absolute;
    inset: 0;
    background: var(--bg-base);
    opacity: 0;
  }
  .modal-layer.flash .flash-overlay {
    animation: evo-flash 0.9s ease-out forwards;
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
    gap: var(--sp-3);
    animation: evo-pop 0.4s var(--ease-default) forwards;
  }
  .evo-label {
    font-size: var(--fs-xl);
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 0.2em;
  }
  .evo-stage {
    font-size: var(--fs-2xl);
    font-weight: 800;
    color: var(--accent);
    animation: evo-bounce 0.6s var(--ease-default) forwards;
  }
  @keyframes evo-pop {
    from { opacity: 0; transform: scale(0.8); }
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
    gap: var(--sp-2);
    padding: var(--sp-6) var(--sp-8);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    box-shadow: 0 0 0 1px var(--accent-subtle), 0 8px 32px rgba(0, 0, 0, 0.2);
    animation: evo-card-in 0.5s var(--ease-default) forwards;
  }
  .evo-rank {
    font-size: var(--fs-sm);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .evo-name {
    font-size: var(--fs-2xl);
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 0.1em;
  }
  .evo-next {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    letter-spacing: 0.02em;
    font-family: var(--font-mono);
  }
  @keyframes evo-card-in {
    from { opacity: 0; transform: scale(0.9) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
</style>
