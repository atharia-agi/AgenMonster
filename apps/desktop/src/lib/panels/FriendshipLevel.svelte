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
  <div class="level-name" style="color:var(--gb-text)">
    {levelLabels[levelKey] || levelKey.toUpperCase()}
  </div>
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
  .bond-panel { padding: 4px 0; text-align: center; font-family: var(--font-body); image-rendering: pixelated; }
  .level-name { font-size: 8px; margin-bottom: 2px; }
  .hearts-row {
    display: flex;
    justify-content: center;
    gap: 3px;
    margin-bottom: 4px;
  }
  .heart {
    font-size: 10px;
    color: var(--gb-panel);
    border: 2px solid var(--gb-border);
    image-rendering: pixelated;
  }
  .heart.filled { color: var(--gb-text); background: var(--gb-border); }
  .xp-row { display: flex; align-items: center; gap: 4px; }
  .bar { flex: 1; height: 10px; background: var(--gb-bg); overflow: hidden; border: var(--gb-stroke) solid var(--gb-border); image-rendering: pixelated; }
  .fill { height: 100%; transition: width 0.3s steps(8); }
  .val { font-size: 7px; color: var(--gb-dark); white-space: nowrap; font-family: var(--font-body); }
</style>
