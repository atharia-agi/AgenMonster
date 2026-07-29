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
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--gb-text);
    animation: floatUp 1.2s steps(8) forwards;
    white-space: nowrap;
    image-rendering: pixelated;
  }
  @keyframes floatUp {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-30px); }
  }
</style>
