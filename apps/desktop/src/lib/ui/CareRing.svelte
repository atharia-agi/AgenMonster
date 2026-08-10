<script lang="ts">
  // CareRingSvelte: circular need gauge (Tamagotchi-style 5-segment ring)
  let { value = 50, max = 100, color = '#0f380f', size = 44 } = $props<{
    value?: number;
    max?: number;
    color?: string;
    size?: number;
  }>();

  const pct = $derived(Math.max(0, Math.min(1, value / max)));
  const segments = 5;
  const cx = $derived(size / 2);
  const cy = $derived(size / 2);
  const r = $derived(size / 2 - 3);
  const stroke = $derived(size / 8);
  const gap = 0.18; // 18% of circumference per segment

  function arcPath(index: number): string {
    const totalGap = gap * segments;
    const startAngle = (index / segments) * (2 * Math.PI - totalGap) - Math.PI / 2;
    const endAngle = ((index + 1) / segments) * (2 * Math.PI - totalGap) - Math.PI / 2 - 0.08;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Determine how many segments should glow (lit)
  const litCount = $derived(Math.round(pct * segments));

  const low = $derived(pct < 0.25);
  const mid = $derived(pct >= 0.25 && pct < 0.6);
  const high = $derived(pct >= 0.6);
  const ringColor = $derived(low ? '#e85050' : mid ? '#e8a830' : color);
</script>

<div class="care-ring" class:low class:mid class:high style="width:{size}px;height:{size}px">
  <svg viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
    {#each Array(segments) as _, i}
      <path
        d={arcPath(i)}
        stroke={i < litCount ? ringColor : '#8bac0f'}
        stroke-width={stroke}
        stroke-linecap="square"
        fill="none"
        class="ring-seg"
        class:lit={i < litCount}
      />
    {/each}
    <text
      x={cx}
      y={cy + stroke / 2}
      text-anchor="middle"
      dominant-baseline="middle"
      class="ring-text"
    >
      {Math.round(value)}
    </text>
  </svg>
</div>

<style>
  .care-ring {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    flex-shrink: 0;
  }
  .care-ring.low .ring-seg.lit {
    animation: ring-pulse 1s ease-in-out infinite;
  }
  .ring-seg {
    transition: stroke 0.2s var(--ease-default);
  }
  .ring-seg.lit {
    filter: drop-shadow(0 0 1px currentColor);
  }
  .ring-text {
    font-family: var(--font-body);
    font-size: 7px;
    fill: var(--text-primary);
    font-weight: 700;
  }
  @keyframes ring-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
