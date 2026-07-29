<script lang="ts">
  // Skill Tree  --  visual branching skill progression.
  import type { Skill } from '$lib/gameState';

  let { skills } = $props<{ skills: Skill[] }>();

  interface SkillBranch {
    name: string;
    icon: string;
    color: string;
    skills: Skill[];
  }

  const branches: SkillBranch[] = $derived.by(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const cat = s.category || 'general';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    const branchConfig: Record<string, { icon: string; color: string }> = {
      research: { icon: '', color: 'var(--gb-text)' },
      coding: { icon: '', color: 'var(--gb-dark)' },
      automation: { icon: '', color: 'var(--gb-text)' },
      general: { icon: '', color: 'var(--gb-dark)' },
    };
    const result: SkillBranch[] = [];
    for (const [name, items] of map) {
      const cfg = branchConfig[name] || branchConfig.general;
      result.push({ name, icon: cfg.icon, color: cfg.color, skills: items });
    }
    return result;
  });

  function xpPct(s: Skill): number {
    return Math.round((s.xp / s.xpToNext) * 100);
  }

  function barWidth(s: Skill): number {
    return (s.level / 20) * 100; // max level 20
  }
</script>

<div class="skill-tree-panel">
  <div class="panel-header">
    <span class="panel-title">SKILL TREE</span>
    <span class="skill-count">{skills.length}</span>
  </div>
  <div class="branches">
    {#each branches as branch}
      <div class="branch">
        <div class="branch-header" style="border-color:{branch.color}">
          <span class="branch-icon">{branch.icon}</span>
          <span class="branch-name" style="color:{branch.color}">{branch.name.toUpperCase()}</span>
          <span class="branch-count">{branch.skills.length}</span>
        </div>
        <div class="branch-skills">
          {#each branch.skills as skill, i}
            <div class="skill-node" style="--branch-color:{branch.color}">
              {#if i > 0}
                <div class="connector" style="background:{branch.color}"></div>
              {/if}
              <div class="skill-card">
                <div class="skill-top">
                  <span class="skill-icon">◆</span>
                  <div class="skill-info">
                    <span class="skill-name">{skill.name}</span>
                    <span class="skill-lv">Lv.{skill.level}</span>
                  </div>
                </div>
                <div class="skill-bar-row">
                  <div class="skill-bar">
                    <div class="fill" style="width:{barWidth(skill)}%;background:{branch.color}"></div>
                  </div>
                  <span class="skill-xp">{xpPct(skill)}%</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .skill-tree-panel {
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    height: 100%;
    overflow: hidden;
    background: var(--gb-bg);
    image-rendering: pixelated;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid var(--gb-border);
    padding-bottom: 4px;
  }
  .panel-title {
    font-family: var(--font-body);
    font-size: 8px;
    color: var(--gb-text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .skill-count { font-size: 10px; color: var(--gb-text); font-family: var(--font-body); }
  .branches {
    display: flex;
    gap: 10px;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    image-rendering: pixelated;
  }
  .branch {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 130px;
  }
  .branch-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
    border-bottom: 3px solid;
    font-size: 8px;
  }
  .branch-icon { font-size: 10px; }
  .branch-name {
    font-family: var(--font-body);
    font-size: 8px;
    flex: 1;
    text-transform: uppercase;
  }
  .branch-count {
    font-size: 9px;
    color: var(--gb-dark);
    font-family: var(--font-body);
  }
  .branch-skills {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .skill-node {
    position: relative;
    padding-left: 14px;
  }
  .connector {
    position: absolute;
    left: 4px;
    top: -2px;
    width: 3px;
    height: 10px;
    background: var(--gb-border);
  }
  .skill-card {
    padding: 4px 6px;
    border: 3px solid var(--gb-border);
    background: var(--gb-panel);
    margin-bottom: 3px;
    image-rendering: pixelated;
  }
  .skill-card:hover {
    background: var(--gb-bg);
  }
  .skill-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .skill-icon { font-size: 10px; }
  .skill-info { flex: 1; }
  .skill-name { font-size: 8px; color: var(--gb-text); display: block; font-family: var(--font-body); }
  .skill-lv { font-size: 7px; color: var(--gb-dark); font-family: var(--font-body); }
  .skill-bar-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .skill-bar {
    flex: 1;
    height: 8px;
    background: var(--gb-bg);
    border: 3px solid var(--gb-border);
    overflow: hidden;
    image-rendering: pixelated;
  }
  .fill {
    height: 100%;
    background: var(--gb-border);
    transition: width 0.3s steps(8);
  }
  .skill-xp { font-size: 8px; color: var(--gb-dark); min-width: 22px; text-align: right; font-family: var(--font-body); }
</style>
