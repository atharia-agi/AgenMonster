<script lang="ts">
  let { skills = [] } = $props<{ skills?: Array<{ name: string; category: string; level: number; xp: number; xpToNext: number }> }>();
</script>

<div class="skills-panel">
  <div class="skills-list">
    {#each skills as skill}
      {@const pct = skill.xpToNext > 0 ? Math.round((skill.xp / skill.xpToNext) * 100) : 0}
      <div class="skill-row">
        <div class="skill-info">
          <span class="skill-name">{skill.name.toUpperCase()}</span>
          <span class="skill-level">Lv.{skill.level}</span>
        </div>
        <div class="skill-bar">
          <div class="fill" style="width:{pct}%"></div>
        </div>
        <span class="skill-pct">{pct}%</span>
      </div>
    {/each}
    {#if skills.length === 0}
      <span class="empty">NO SKILLS YET</span>
    {/if}
  </div>
</div>

<style>
  .skills-panel { padding: 2px 0; font-family: var(--font-body); image-rendering: pixelated; }
  .skills-list { display: flex; flex-direction: column; gap: 2px; }
  .skill-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    border-bottom: 2px solid var(--gb-dark);
  }
  .skill-info { flex: 1; min-width: 0; display: flex; gap: 4px; align-items: baseline; }
  .skill-name { font-size: 7px; color: var(--gb-text); }
  .skill-level { font-size: 6px; color: var(--gb-dark); }
  .skill-bar {
    width: 36px;
    height: 8px;
    background: var(--gb-bg);
    overflow: hidden;
    border: 3px solid var(--gb-border);
    image-rendering: pixelated;
  }
  .fill {
    height: 100%;
    background: var(--gb-border);
    transition: width 0.3s steps(8);
  }
  .skill-pct { font-size: 6px; color: var(--gb-dark); min-width: 20px; text-align: right; }
  .empty { font-size: 7px; color: var(--gb-dark); }
</style>
