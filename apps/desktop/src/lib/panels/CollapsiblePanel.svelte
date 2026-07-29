<script lang="ts">
  let { title, children } = $props<{
    title: string;
    children?: any;
  }>();
</script>

<details class="collapsible" open>
  <summary class="collapse-toggle">
    <span class="arrow">{'▼'}</span>
    <span class="collapse-title">{title}</span>
  </summary>
  <div class="collapse-body">
    {@render children()}
  </div>
</details>

<style>
  .collapsible {
    display: flex;
    flex-direction: column;
    border: var(--gb-stroke) solid var(--gb-border);
    background: var(--gb-bg);
    border-radius: 0 !important;
    min-height: 0;
    flex-shrink: 1;
    image-rendering: pixelated;
  }
  .collapse-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    color: var(--gb-dark);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 8px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    list-style: none;
    flex-shrink: 0;
    user-select: none;
    border-bottom: var(--gb-stroke) solid var(--gb-border);
    transition: background 0.1s steps(2);
    image-rendering: pixelated;
  }
  .collapse-toggle::-webkit-details-marker { display: none; }
  .collapse-toggle:hover {
    background: var(--gb-border);
    color: var(--gb-bg);
  }
  .arrow {
    font-size: 8px;
    transition: transform 0.1s steps(2);
    display: inline-block;
    width: 10px;
    text-align: center;
  }
  .collapsible[open] .arrow { transform: rotate(0deg); }
  .collapsible:not([open]) .arrow { transform: rotate(-90deg); }
  .collapse-title {
    flex: 1;
    text-align: left;
    font-weight: bold;
  }
  .collapse-body {
    overflow-y: auto;
    padding: 8px;
    min-height: 0;
    flex: 1;
  }
  .collapse-body::-webkit-scrollbar { width: 6px; }
  .collapse-body::-webkit-scrollbar-track { background: var(--gb-bg); border: var(--gb-stroke) solid var(--gb-border); }
  .collapse-body::-webkit-scrollbar-thumb { background: var(--gb-border); }
</style>
