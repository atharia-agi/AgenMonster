<script lang="ts">
  import CareRing from '$lib/ui/CareRing.svelte';

  let { needs } = $props<{ needs: { hunger: number; energy: number; focus: number; mood: number; affection: number; motivation: number; knowledge: number } }>();

  const needConfig = [
    { key: 'hunger' as const, label: 'HGR', icon: 'need_hunger' },
    { key: 'energy' as const, label: 'ENR', icon: 'need_energy' },
    { key: 'focus' as const, label: 'FCS', icon: 'need_focus' },
    { key: 'mood' as const, label: 'MOOD', icon: 'need_mood' },
    { key: 'affection' as const, label: 'AFF', icon: 'need_affection' },
    { key: 'motivation' as const, label: 'MOT', icon: 'need_motivation' },
    { key: 'knowledge' as const, label: 'KNW', icon: 'need_knowledge' },
  ];
</script>

<div class="needs-panel">
  <div class="needs-list">
    {#each needConfig as need}
      {@const val = needs[need.key]}
      {@const low = val < 25}
      <div class="need-row" class:low>
        <div class="ring-wrap">
          <CareRing value={val} max={100} color={low ? '#e85050' : '#0f380f'} size={36} />
        </div>
        <span class="need-label">{need.label}</span>
        <span class="need-val" class:warn={low}>{Math.round(val)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .needs-panel { padding: var(--sp-1) 0; font-family: var(--font-body); }
  .needs-list { display: flex; flex-direction: column; gap: var(--sp-1); }
  .need-row {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    border-bottom: 1px solid var(--border-subtle);
    transition: background var(--duration-fast) var(--ease-default);
  }
  .need-row.low { animation: pulse 1.5s ease-in-out infinite; background: var(--error-subtle); }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  .ring-wrap { width: 36px; height: 36px; flex-shrink: 0; }
  .need-label {
    color: var(--text-secondary);
    width: 32px;
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .need-val { color: var(--text-primary); width: 28px; text-align: right; font-size: var(--fs-sm); font-family: var(--font-mono); font-weight: 600; }
  .need-val.warn { color: var(--error); }
</style>
