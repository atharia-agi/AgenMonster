<script lang="ts">
  let { tasks = [], tools = [], mood = 'idle', stage = 'egg', level = 1, consoleLog = [], streaming = false, streamRoute = '' } = $props<{
    tasks?: { id: string; title: string; status: string }[];
    tools?: { name: string; available: boolean }[];
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
    background: var(--gb-panel);
    border-top: var(--gb-stroke) solid var(--gb-border);
    flex-shrink: 0;
    height: 32px;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }

  .status-tabs {
    display: flex;
    border-right: var(--gb-stroke) solid var(--gb-border);
    height: 100%;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    font-size: 7px;
    color: var(--gb-dark);
    background: var(--gb-bg);
    border: none;
    border-right: var(--gb-stroke) solid var(--gb-border);
    cursor: pointer;
    font-family: var(--font-body);
    white-space: nowrap;
    image-rendering: pixelated;
  }
  .tab:hover { background: var(--gb-border); color: var(--gb-bg); }
  .tab.active { background: var(--gb-border); color: var(--gb-bg); }

  .tab-icon { font-size: 9px; }
  .badge {
    background: var(--gb-bg);
    color: var(--gb-text);
    font-size: 6px;
    padding: 0 3px;
    border: var(--gb-stroke) solid var(--gb-border);
    font-family: var(--font-body);
  }
  .tab-dot {
    width: 5px;
    height: 5px;
    background: var(--gb-dark);
    border: var(--gb-stroke) solid var(--gb-border);
    image-rendering: pixelated;
  }
  .tab-dot.online { background: var(--gb-border); }

  .status-content {
    flex: 1;
    padding: 0 8px;
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
    font-size: 7px;
    color: var(--gb-text);
  }

  .task-list, .tool-list, .console-log {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    width: 100%;
  }

  .task-chip, .tool-chip {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-text);
    font-size: 7px;
    font-family: var(--font-body);
  }
  .task-dot, .tool-dot {
    width: 5px;
    height: 5px;
    background: var(--gb-border);
    image-rendering: pixelated;
  }
  .task-chip.running { background: var(--gb-border); color: var(--gb-bg); }
  .task-chip.pending { background: var(--gb-panel); color: var(--gb-dark); }

  .console-line {
    display: flex;
    gap: 4px;
    font-size: 7px;
    font-family: var(--font-body);
    color: var(--gb-dark);
  }
  .console-role { color: var(--gb-text); min-width: 20px; }
  .console-text { color: var(--gb-dark); }

  .empty-text {
    font-size: 7px;
    color: var(--gb-dark);
    font-family: var(--font-body);
  }

  .pet-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    border-left: var(--gb-stroke) solid var(--gb-border);
    height: 100%;
    font-size: 7px;
    color: var(--gb-text);
  }
  .stage-badge, .level-badge, .mood-badge {
    font-size: 7px;
    color: var(--gb-text);
    font-family: var(--font-body);
  }
  .stage-badge { color: var(--gb-dark); }
  .stream-badge {
    font-size: 7px;
    padding: 1px 5px;
    background: var(--gb-text);
    color: var(--gb-bg);
    border: 2px solid var(--gb-border);
    animation: streamPulse 1.2s steps(2) infinite;
    image-rendering: pixelated;
  }
  @keyframes streamPulse {
    0%, 100% { background: var(--gb-text); }
    50% { background: #c93030; }
  }
</style>
