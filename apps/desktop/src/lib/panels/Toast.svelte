<script lang="ts">
  // Neo-pop toast — inline floating notification. Pops in from top-right, fades out.
  let { toasts = $bindable([]) } = $props<{
    toasts?: Array<{ id: string; title: string; message: string; color?: string }>;
  }>();

  function dismiss(id: string) {
    toasts = toasts.filter((t: { id: string; title: string; message: string; color?: string }) => t.id !== id);
  }
</script>

<div class="toast-layer" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast" style="border-color:{toast.color || '#0f380f'}">
      <div class="toast-bar" style="background:{toast.color || '#0f380f'}"></div>
      <div class="toast-body">
        <div class="toast-title">{toast.title}</div>
        <div class="toast-msg">{toast.message}</div>
      </div>
      <button class="toast-x" onclick={() => dismiss(toast.id)} aria-label="Dismiss">×</button>
    </div>
  {/each}
</div>

<style>
  .toast-layer {
    position: fixed;
    top: 50px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    z-index: 9998;
    pointer-events: none;
    font-family: var(--font-body);
  }
  .toast {
    display: flex;
    align-items: stretch;
    min-width: 220px;
    max-width: 320px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    pointer-events: auto;
    animation: toast-in 0.2s var(--ease-default) forwards;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .toast-bar {
    width: 4px;
    flex-shrink: 0;
    border-radius: var(--radius-md) 0 0 var(--radius-md);
  }
  .toast-body {
    flex: 1;
    padding: var(--sp-2) var(--sp-3);
  }
  .toast-title {
    font-size: var(--fs-xs);
    color: var(--text-primary);
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-bottom: var(--sp-1);
  }
  .toast-msg {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    line-height: 1.5;
  }
  .toast-x {
    background: var(--bg-overlay);
    border: none;
    border-left: 1px solid var(--border-default);
    width: 28px;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--fs-lg);
    color: var(--text-muted);
    padding: 0;
    line-height: 1;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .toast-x:hover { background: var(--bg-hover); color: var(--text-primary); }
</style>
