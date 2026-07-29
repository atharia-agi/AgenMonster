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
    gap: 6px;
    z-index: 9998;
    pointer-events: none;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .toast {
    display: flex;
    align-items: stretch;
    min-width: 220px;
    max-width: 320px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    pointer-events: auto;
    animation: toast-in 0.15s steps(2) forwards;
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .toast-bar {
    width: 6px;
    flex-shrink: 0;
    image-rendering: pixelated;
  }
  .toast-body {
    flex: 1;
    padding: 6px 8px;
  }
  .toast-title {
    font-size: 8px;
    color: var(--gb-text);
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .toast-msg {
    font-size: 7px;
    color: var(--gb-dark);
    line-height: 1.6;
  }
  .toast-x {
    background: var(--gb-panel);
    border: none;
    border-left: var(--gb-stroke) solid var(--gb-border);
    width: 20px;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 10px;
    color: var(--gb-text);
    padding: 0;
    line-height: 1;
  }
  .toast-x:hover {
    background: var(--gb-text);
    color: var(--gb-bg);
  }
</style>
