<script lang="ts">
  // Achievements Tab — celebratory panel of earned crystals + locked badges.
  import type { MemoryCrystal } from '$lib/gameState';

  let { crystals = [], max = 50 } = $props<{
    crystals?: MemoryCrystal[];
    max?: number;
  }>();

  const TOTAL_BADGES = [
    { id: 'first_chat', title: 'FIRST WORDS', desc: 'Send 1 message', color: '#88ccf0', icon: '◆' },
    { id: 'chatterbox', title: 'CHATTERBOX', desc: 'Send 10 messages', color: '#90c878', icon: '◆◆' },
    { id: 'tool_user',  title: 'TOOL USER',  desc: 'Use first tool', color: '#d8c8f0', icon: '◆◆◆' },
    { id: 'first_task', title: 'FIRST TASK', desc: 'Complete first task', color: '#ffc860', icon: '★' },
    { id: 'task_master', title: 'TASK MASTER', desc: 'Complete 10 tasks', color: '#e06070', icon: '★★' },
  ];

  const earnedIds = $derived(new Set((crystals as MemoryCrystal[]).map(c => c.label.toLowerCase().replace(/\s+/g, '_'))));
  const earnedCount = $derived(crystals.length);
  const progress = $derived(Math.min(100, (earnedCount / TOTAL_BADGES.length) * 100));
</script>

<div class="achievements-panel">
  <div class="ach-header">
    <div>
      <span class="ach-title">ACHIEVEMENTS</span>
      <span class="ach-sub">{earnedCount}/{TOTAL_BADGES.length} UNLOCKED</span>
    </div>
    <div class="ach-progress">
      <div class="progress-track">
        <div class="progress-fill" style="width:{progress}%"></div>
      </div>
      <span class="progress-pct">{Math.round(progress)}%</span>
    </div>
  </div>

  <div class="ach-grid">
    {#each TOTAL_BADGES as badge}
       {@const isEarned = earnedIds.has(badge.id.replace(/_/g, ' ')) || crystals.some((c: MemoryCrystal) => c.label.toLowerCase().split(' ').join('_') === badge.id)}
      <div class="badge" class:earned={isEarned} class:locked={!isEarned}>
        <div class="badge-icon" style="color:{badge.color}">{badge.icon}</div>
        <div class="badge-body">
          <span class="badge-title">{badge.title}</span>
          <span class="badge-desc">{badge.desc}</span>
        </div>
        {#if isEarned}
          <div class="badge-check" title="Earned">✓</div>
        {:else}
          <div class="badge-lock" title="Locked">🔒</div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="ach-footer">
    <span class="footer-text">EARN CRYSTALS BY CHATTING, USING TOOLS & COMPLETING TASKS.</span>
  </div>
</div>

<style>
  .achievements-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    font-family: var(--font-body);
    image-rendering: pixelated;
  }

  .ach-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 6px;
    border-bottom: var(--gb-stroke) solid var(--gb-border);
  }
  .ach-title {
    font-size: 11px;
    color: var(--gb-text);
    letter-spacing: 1px;
    display: block;
    margin-bottom: 4px;
  }
  .ach-sub {
    font-size: 7px;
    color: var(--gb-dark);
  }
  .ach-progress {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    max-width: 220px;
  }
  .progress-track {
    flex: 1;
    height: 12px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--gb-border);
    transition: width 0.3s steps(8);
  }
  .progress-pct {
    font-size: 8px;
    color: var(--gb-text);
    min-width: 32px;
    text-align: right;
  }

  .ach-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
  }
  .badge {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
  }
  .badge.locked {
    opacity: 0.45;
    filter: grayscale(0.5);
  }
  .badge.earned {
    animation: badge-pop 0.2s steps(2) forwards;
  }
  @keyframes badge-pop {
    from { transform: scale(0.95); }
    to { transform: scale(1); }
  }
  .badge-icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 28px;
    text-align: center;
  }
  .badge-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .badge-title {
    font-size: 8px;
    color: var(--gb-text);
    letter-spacing: 0.5px;
  }
  .badge-desc {
    font-size: 6px;
    color: var(--gb-dark);
    line-height: 1.6;
  }
  .badge-check {
    position: absolute;
    top: 4px;
    right: 6px;
    font-size: 9px;
    color: var(--gb-bg);
    background: var(--gb-text);
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .badge-lock {
    position: absolute;
    top: 4px;
    right: 6px;
    font-size: 9px;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ach-footer {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 2px dashed var(--gb-dark);
  }
  .footer-text {
    font-size: 6px;
    color: var(--gb-dark);
    letter-spacing: 0.5px;
  }
</style>
