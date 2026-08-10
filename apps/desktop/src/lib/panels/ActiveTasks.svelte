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
    padding: var(--sp-2);
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    height: 100%;
    font-family: var(--font-body);
  }
  .panel-title {
    font-size: var(--fs-xs);
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-default);
    padding-bottom: var(--sp-1);
    margin-bottom: var(--sp-1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    flex: 1;
    overflow-y: auto;
  }
  .task-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-2);
    border-bottom: 1px solid var(--border-subtle);
    font-size: var(--fs-xs);
    transition: background var(--duration-fast) var(--ease-default);
    border-radius: var(--radius-sm);
  }
  .task-status { font-size: var(--fs-2xs); min-width: 56px; flex-shrink: 0; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; }
  .task-status.running { color: var(--success); background: var(--success-subtle); padding: 2px var(--sp-1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-sm); }
  .task-status.pending { color: var(--text-secondary); }
  .task-status.queued { color: var(--text-muted); }
  .task-title { color: var(--text-secondary); text-transform: uppercase; font-size: var(--fs-2xs); letter-spacing: 0.02em; }
  .empty-text { font-size: var(--fs-xs); color: var(--text-disabled); font-style: italic; }
</style>
