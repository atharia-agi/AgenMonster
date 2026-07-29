<script lang="ts">
  // Top navigation bar -- tabs + version + clock.
  import Icon from '$lib/ui/Icon.svelte';
  import { APP_VERSION } from '$lib/version';

  let { activeTab = $bindable('workspace'), version = APP_VERSION, clock = '22:48', date = '20 JUN 2025' } = $props<{
    activeTab?: string;
    version?: string;
    clock?: string;
    date?: string;
  }>();

  const tabs = [
    { id: 'welcome', label: 'HOME', icon: 'stage_egg' },
    { id: 'workspace', label: 'WORKSPACE', icon: 'stage_baby' },
    { id: 'skills', label: 'SKILLS', icon: 'need_energy' },
    { id: 'achievements', label: 'ACHIEVE', icon: 'star' },
    { id: 'inventory', label: 'INVENTORY', icon: 'need_knowledge' },
    { id: 'memory', label: 'MEMORY', icon: 'mood_thinking' },
    { id: 'missions', label: 'MISSIONS', icon: 'check' },
    { id: 'diagnostics', label: 'DIAG', icon: 'activity' },
    { id: 'settings', label: 'SETTINGS', icon: 'settings' },
  ];

  const logoIcon = 'stage_egg';
</script>

<div class="top-nav">
  <div class="brand">
    <Icon name={logoIcon} size={16} />
    <span class="title">AGENMONSTER</span>
    <span class="version">{version}</span>
  </div>

  <nav class="tabs">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
      >
        <Icon name={tab.icon} size={12} />
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </nav>

  <div class="clock-area">
    <span class="clock">{clock}</span>
    <span class="date">{date}</span>
  </div>
</div>

<style>
  .top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    background: var(--gb-panel);
    border-bottom: var(--gb-stroke) solid var(--gb-border);
    height: 36px;
    position: relative;
  }
  .top-nav::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 100%;
    height: var(--gb-stroke);
    background: var(--gb-border);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
    z-index: 1;
  }
  .title {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--gb-text);
    letter-spacing: 1px;
  }
  .version {
    font-size: 7px;
    color: var(--gb-dark);
    border: 2px solid var(--gb-border);
    padding: 1px 4px;
    background: var(--gb-bg);
  }
  .tabs {
    display: flex;
    gap: 3px;
    position: relative;
    z-index: 1;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    font-size: 7px;
    font-family: var(--font-body);
    image-rendering: pixelated;
    position: relative;
    transition: background 0.1s steps(2), color 0.1s steps(2);
  }
  .tab:hover { background: var(--gb-dark); color: var(--gb-bg); }
  .tab.active {
    background: var(--gb-border);
    color: var(--gb-bg);
    border-bottom-width: 4px;
  }
  .tab-label {
    font-family: var(--font-body);
    font-size: 7px;
    letter-spacing: 0.5px;
  }
  .clock-area {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 1;
  }
  .clock { font-size: 10px; color: var(--gb-text); font-family: var(--font-body); }
  .date { font-size: 7px; color: var(--gb-dark); }
</style>
