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

<div class="top-nav" role="banner">
  <div class="brand">
    <Icon name={logoIcon} size={16} />
    <span class="title">AGENMONSTER</span>
    <span class="version">{version}</span>
  </div>

  <nav class="tabs" aria-label="Main tabs">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
        aria-label={tab.label}
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
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
    height: 48px;
    position: relative;
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    position: relative;
    z-index: 1;
  }
  .title {
    font-family: var(--font-body);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.05em;
  }
  .version {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    padding: 1px var(--sp-1);
    background: var(--bg-overlay);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
  }
  .tabs {
    display: flex;
    gap: var(--sp-1);
    position: relative;
    z-index: 1;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--fs-xs);
    font-family: var(--font-body);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .tab:hover { background: var(--bg-hover); color: var(--text-primary); }
  .tab.active {
    background: var(--accent-subtle);
    color: var(--accent);
    border-color: rgba(99, 102, 241, 0.2);
    font-weight: 600;
  }
  .tab-label {
    font-family: var(--font-body);
    font-size: var(--fs-xs);
    letter-spacing: 0.02em;
  }
  .clock-area {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    position: relative;
    z-index: 1;
  }
  .clock { font-size: var(--fs-sm); color: var(--text-primary); font-family: var(--font-mono); font-weight: 600; }
  .date { font-size: var(--fs-2xs); color: var(--text-muted); font-family: var(--font-mono); }
</style>
