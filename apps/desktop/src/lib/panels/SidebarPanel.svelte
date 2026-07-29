<script lang="ts">
  let { title, side = 'left', open = $bindable(true), children, icon = '' } = $props<{
    title: string; side?: 'left' | 'right'; open?: boolean;
    children?: any; icon?: string;
  }>();

  let isOpen = $state(open);

  function toggle() { isOpen = !isOpen; }
</script>

<div class="sidebar-panel" class:left={side === 'left'} class:right={side === 'right'} class:collapsed={!isOpen}>
  <button class="sidebar-toggle" onclick={toggle}>
    {#if icon}
      <span class="toggle-icon">{icon}</span>
    {/if}
    <span class="toggle-title">{title}</span>
    <span class="toggle-arrow" class:rotated={isOpen}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <path d="M3 2l4 3-4 3z"/>
      </svg>
    </span>
  </button>

  {#if isOpen}
    <div class="sidebar-body">
      {@render children?.()}
    </div>
  {/if}
</div>

<style>
  .sidebar-panel {
    display: flex;
    flex-direction: column;
    border: var(--gb-stroke) solid var(--gb-border);
    background: var(--gb-bg);
    border-radius: 0 !important;
    overflow: hidden;
    flex-shrink: 0;
    image-rendering: pixelated;
  }

  .sidebar-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    background: var(--gb-panel);
    border: none;
    border-bottom: var(--gb-stroke) solid var(--gb-border);
    cursor: pointer;
    transition: background 0.1s steps(2);
    flex-shrink: 0;
    image-rendering: pixelated;
    font-family: var(--font-body);
  }
  .sidebar-toggle:hover { background: var(--gb-border); color: var(--gb-bg); }

  .toggle-icon { font-size: 10px; color: var(--gb-text); }
  .toggle-title {
    flex: 1;
    text-align: left;
    font-size: 8px;
    font-weight: bold;
    color: var(--gb-text);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-family: var(--font-body);
  }
  .toggle-arrow {
    color: var(--gb-dark);
    transition: transform 0.1s steps(2);
    display: flex;
  }
  .toggle-arrow.rotated { transform: rotate(90deg); }

  .sidebar-body {
    padding: 2px 4px 4px;
    overflow-y: auto;
    min-height: 0;
  }
  .sidebar-body::-webkit-scrollbar { width: 6px; }
  .sidebar-body::-webkit-scrollbar-track { background: var(--gb-bg); border: var(--gb-stroke) solid var(--gb-border); }
  .sidebar-body::-webkit-scrollbar-thumb { background: var(--gb-border); border-radius: 0; }
</style>
