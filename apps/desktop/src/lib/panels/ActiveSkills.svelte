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
  .skills-panel { padding: var(--sp-1) 0; font-family: var(--font-body); }
  .skills-list { display: flex; flex-direction: column; gap: var(--sp-1); }
  .skill-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-2);
    border-bottom: 1px solid var(--border-subtle);
    transition: background var(--duration-fast) var(--ease-default);
    border-radius: var(--radius-sm);
  }
  .skill-info { flex: 1; min-width: 0; display: flex; gap: var(--sp-1); align-items: baseline; }
  .skill-name { font-size: var(--fs-xs); color: var(--text-primary); font-weight: 600; letter-spacing: 0.02em; }
  .skill-level { font-size: var(--fs-2xs); color: var(--text-muted); font-family: var(--font-mono); }
  .skill-bar {
    width: 48px;
    height: 6px;
    background: var(--bg-overlay);
    overflow: hidden;
    border: 1px solid var(--border-default);
    border-radius: 3px;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s var(--ease-default);
    border-radius: 3px;
  }
  .skill-pct { font-size: var(--fs-2xs); color: var(--text-muted); min-width: 28px; text-align: right; font-family: var(--font-mono); font-weight: 600; }
  .empty { font-size: var(--fs-xs); color: var(--text-disabled); font-style: italic; }
</style>
