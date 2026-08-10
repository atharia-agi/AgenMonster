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
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    overflow: hidden;
    flex-shrink: 0;
    border-radius: var(--radius-lg);
    margin-bottom: var(--sp-2);
  }

  .sidebar-toggle {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-elevated);
    border: none;
    border-bottom: 1px solid var(--border-default);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-default);
    flex-shrink: 0;
    font-family: var(--font-body);
    width: 100%;
    text-align: left;
  }
  .sidebar-toggle:hover { background: var(--bg-hover); }

  .toggle-icon { font-size: var(--fs-xs); color: var(--text-secondary); }
  .toggle-title {
    flex: 1;
    text-align: left;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-body);
  }
  .toggle-arrow {
    color: var(--text-muted);
    transition: transform var(--duration-fast) var(--ease-default);
    display: flex;
  }
  .toggle-arrow.rotated { transform: rotate(90deg); }

  .sidebar-body {
    padding: var(--sp-1) var(--sp-2) var(--sp-2);
    overflow-y: auto;
    min-height: 0;
  }
  .sidebar-body::-webkit-scrollbar { width: 6px; }
  .sidebar-body::-webkit-scrollbar-track { background: transparent; }
  .sidebar-body::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
  .sidebar-body::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
</style>
