<script lang="ts">
  import type { ActiveTask, ToolInfo } from '$lib/gameState';
  let { tasks = [], tools = [], mood = 'idle', stage = 'egg', level = 1, consoleLog = [], streaming = false, streamRoute = '' } = $props<{
    tasks?: ActiveTask[];
    tools?: ToolInfo[];
    mood?: string;
    stage?: string;
    level?: number;
    consoleLog?: Array<{ role: string; content: string; timestamp: number }>;
    streaming?: boolean;
    streamRoute?: string;
  }>();

  let activeTab = $state<'status' | 'tools' | 'console'>('status');

  const runningTasks = $derived(tasks.filter((t: { id: string; title: string; status: string }) => t.status === 'running'));
  const onlineTools = $derived(tools.filter((t: { name: string; available: boolean }) => t.available));
</script>

<div class="status-bar">
  <div class="status-tabs">
    <button class="tab" class:active={activeTab === 'status'} onclick={() => activeTab = 'status'}>
      <span class="tab-icon">●</span>
      {#if runningTasks.length > 0}
        <span class="badge">{runningTasks.length}</span>
      {/if}
      TASKS
    </button>
    <button class="tab" class:active={activeTab === 'tools'} onclick={() => activeTab = 'tools'}>
      <span class="tab-dot" class:online={onlineTools.length > 0}></span>
      TOOLS {onlineTools.length}/{tools.length}
    </button>
    <button class="tab" class:active={activeTab === 'console'} onclick={() => activeTab = 'console'}>
      <span class="tab-icon">›</span>
      CONSOLE
    </button>
  </div>

  <div class="status-content">
    {#if activeTab === 'status'}
      <div class="task-list">
        {#if tasks.length === 0}
          <span class="empty-text">NO ACTIVE TASKS</span>
        {:else}
          {#each tasks.slice(0, 4) as task}
            <span class="task-chip" class:running={task.status === 'running'} class:pending={task.status === 'pending'}>
              <span class="task-dot"></span>
              {task.title.toUpperCase()}
            </span>
          {/each}
        {/if}
      </div>
    {:else if activeTab === 'tools'}
      <div class="tool-list">
        {#each tools as tool}
          <span class="tool-chip" class:online={tool.available}>
            <span class="tool-dot"></span>
            {tool.name.toUpperCase()}
          </span>
        {/each}
      </div>
    {:else}
      <div class="console-log">
        {#if consoleLog.length === 0}
          <span class="empty-text">NO MSGS</span>
        {:else}
          {#each consoleLog.slice(-3) as msg}
            <span class="console-line">
              <span class="console-role">{msg.role === 'user' ? 'YOU' : 'AI'}</span>
              <span class="console-text">{msg.content.slice(0, 60)}{msg.content.length > 60 ? '...' : ''}</span>
            </span>
          {/each}
        {/if}
      </div>
    {/if}
  </div>

  <div class="pet-indicator">
    <span class="stage-badge">{stage.toUpperCase()}</span>
    <span class="level-badge">Lv.{level}</span>
    <span class="mood-badge">{mood.toUpperCase()}</span>
    {#if streaming}
      <span class="stream-badge">LIVE</span>
    {/if}
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
    flex-shrink: 0;
    height: 36px;
    font-family: var(--font-body);
  }

  .status-tabs {
    display: flex;
    border-right: 1px solid var(--border-default);
    height: 100%;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: 0 var(--sp-2);
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    background: var(--bg-overlay);
    border: none;
    border-right: 1px solid var(--border-default);
    cursor: pointer;
    font-family: var(--font-body);
    white-space: nowrap;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .tab:hover { background: var(--bg-hover); color: var(--text-primary); }
  .tab.active { background: var(--accent-subtle); color: var(--accent); font-weight: 600; }

  .tab-icon { font-size: var(--fs-xs); }
  .badge {
    background: var(--bg-overlay);
    color: var(--text-primary);
    font-size: var(--fs-2xs);
    padding: 1px var(--sp-1);
    border: 1px solid var(--border-default);
    font-family: var(--font-mono);
    border-radius: var(--radius-sm);
    font-weight: 600;
  }
  .tab-dot {
    width: 6px;
    height: 6px;
    background: var(--text-muted);
    border-radius: 50%;
    flex-shrink: 0;
  }
  .tab-dot.online { background: var(--success); box-shadow: 0 0 4px rgba(16, 185, 129, 0.4); }

  .status-content {
    flex: 1;
    padding: 0 var(--sp-2);
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }

  .task-list, .tool-list, .console-log {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
    align-items: center;
    width: 100%;
  }

  .task-chip, .tool-chip {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    font-size: var(--fs-xs);
    font-family: var(--font-body);
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .task-dot, .tool-dot {
    width: 5px;
    height: 5px;
    background: var(--text-muted);
    border-radius: 50%;
    flex-shrink: 0;
  }
  .task-chip.running { background: var(--accent-subtle); color: var(--accent); border-color: rgba(99, 102, 241, 0.2); }
  .task-chip.pending { background: var(--bg-overlay); color: var(--text-muted); border-style: dashed; }

  .console-line {
    display: flex;
    gap: var(--sp-1);
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--text-muted);
  }
  .console-role { color: var(--text-primary); font-weight: 600; min-width: 24px; }
  .console-text { color: var(--text-muted); }

  .empty-text {
    font-size: var(--fs-xs);
    color: var(--text-disabled);
    font-family: var(--font-body);
    font-style: italic;
  }

  .pet-indicator {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-2);
    border-left: 1px solid var(--border-default);
    height: 100%;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .stage-badge, .level-badge, .mood-badge {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
  .stream-badge {
    font-size: var(--fs-xs);
    padding: 1px var(--sp-1);
    background: var(--success);
    color: #fff;
    border: 1px solid var(--success);
    border-radius: var(--radius-sm);
    animation: streamPulse 1.2s ease-in-out infinite;
    font-weight: 700;
  }
  @keyframes streamPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
