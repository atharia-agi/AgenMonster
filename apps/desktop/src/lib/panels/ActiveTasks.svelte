<script lang="ts">
  // Active Tasks  --  running/pending/queued tasks.
  import type { ActiveTask } from '$lib/gameState';

  let { tasks } = $props<{ tasks: ActiveTask[] }>();
</script>

<div class="tasks-panel">
  <div class="panel-title">ACTIVE TASKS</div>
  <div class="tasks-list">
    {#each tasks as task}
      <div class="task-row">
        <span class="task-status" class:running={task.status === 'running'} class:pending={task.status === 'pending'} class:queued={task.status === 'queued'}>{task.status.toUpperCase()}</span>
        <span class="task-title">{task.title.toUpperCase()}</span>
      </div>
    {/each}
    {#if tasks.length === 0}
      <span class="empty-text">NO TASKS</span>
    {/if}
  </div>
</div>

<style>
  .tasks-panel {
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .panel-title {
    font-size: 8px;
    color: var(--gb-text);
    border-bottom: 3px solid var(--gb-border);
    padding-bottom: 4px;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    overflow-y: auto;
  }
  .task-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
    border-bottom: 2px solid var(--gb-dark);
    font-size: 7px;
  }
  .task-status { font-size: 8px; min-width: 48px; flex-shrink: 0; color: var(--gb-dark); }
  .task-status.running { color: var(--gb-text); background: var(--gb-border); padding: 1px 4px; border: 2px solid var(--gb-text); }
  .task-status.pending { color: var(--gb-text); }
  .task-status.queued { color: var(--gb-dark); }
  .task-title { color: var(--gb-text); text-transform: uppercase; }
  .empty-text { font-size: 7px; color: var(--gb-dark); }
</style>
