<script lang="ts">
  let { level = 'stranger', xp = 0, xpToNext = 100 } = $props<{
    level?: number | string; xp?: number; xpToNext?: number;
  }>();

  const levelLabels: Record<string, string> = {
    stranger: 'STRANGER',
    friend: 'FRIEND',
    buddy: 'BUDDY',
    best_friend: 'BEST FRIEND',
    soul_companion: 'SOUL LINK',
  };

  const hearts = $derived(() => {
    const pct = xpToNext > 0 ? xp / xpToNext : 0;
    const filled = Math.round(pct * 5);
    return Array.from({ length: 5 }, (_, i) => i < filled);
  });

  const levelKey = $derived(String(level));
</script>

<div class="bond-panel">
  <div class="level-name">{levelLabels[levelKey] || levelKey.toUpperCase()}</div>
  <div class="hearts-row">
    {#each hearts() as filled}
      <span class="heart" class:filled>{filled ? '♥' : '♡'}</span>
    {/each}
  </div>
  <div class="xp-row">
    <div class="bar">
      <div class="fill" style="width:{xpToNext > 0 ? Math.min(100, (xp / xpToNext) * 100) : 0}%"></div>
    </div>
    <span class="val">{xp}/{xpToNext}</span>
  </div>
</div>

<style>
  .bond-panel { padding: var(--sp-2) 0; text-align: center; font-family: var(--font-body); }
  .level-name { font-size: var(--fs-xs); font-weight: 700; margin-bottom: var(--sp-1); color: var(--text-primary); letter-spacing: 0.05em; }
  .hearts-row {
    display: flex;
    justify-content: center;
    gap: var(--sp-1);
    margin-bottom: var(--sp-1);
  }
  .heart {
    font-size: var(--fs-sm);
    color: var(--bg-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .heart.filled { color: var(--error); background: var(--error-subtle); border-color: rgba(239, 68, 68, 0.3); }
  .xp-row { display: flex; align-items: center; gap: var(--sp-1); }
  .bar { flex: 1; height: 8px; background: var(--bg-overlay); overflow: hidden; border: 1px solid var(--border-default); border-radius: 4px; }
  .fill { height: 100%; background: var(--error); transition: width 0.3s var(--ease-default); border-radius: 4px; }
  .val { font-size: var(--fs-2xs); color: var(--text-muted); white-space: nowrap; font-family: var(--font-mono); font-weight: 600; }
</style>
