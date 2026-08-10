<script lang="ts">
  let { items = [] } = $props<{ items: Array<{ id: string; text: string; x: number; y: number; color?: string }> }>();
</script>

<div class="floating-layer">
  {#each items as item (item.id)}
    <div
      class="floating-text"
      style="left:{item.x}px; top:{item.y}px; color:{item.color || '#88cc88'}"
    >
      {item.text}
    </div>
  {/each}
</div>

<style>
  .floating-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
  }
  .floating-text {
    position: absolute;
    font-size: var(--fs-sm);
    font-weight: 700;
    font-family: var(--font-body);
    color: var(--text-primary);
    animation: floatUp 1.2s var(--ease-default) forwards;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  @keyframes floatUp {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-30px); }
  }
</style>
