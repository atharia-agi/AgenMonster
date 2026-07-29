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
        <span class="need-val" class:warn={low}>{val}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .needs-panel { padding: 2px 0; font-family: var(--font-body); image-rendering: pixelated; }
  .needs-list { display: flex; flex-direction: column; gap: 2px; }
  .need-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    border-bottom: 2px solid var(--gb-dark);
  }
  .need-row.low { animation: pulse 1.5s steps(2) infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .ring-wrap { width: 36px; height: 36px; flex-shrink: 0; }
  .need-label {
    color: var(--gb-text);
    width: 28px;
    font-size: 7px;
    font-family: var(--font-body);
  }
  .need-val { color: var(--gb-text); width: 24px; text-align: right; font-size: 7px; font-family: var(--font-body); }
  .need-val.warn { color: #e85050; }
</style>
