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

  const earnedIds = $derived(new Set((crystals as MemoryCrystal[]).map((c) => c.title.toLowerCase().replace(/\s+/g, '_'))));
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
       {@const isEarned = earnedIds.has(badge.id.replace(/_/g, ' ')) || crystals.some((c: MemoryCrystal) => c.title.toLowerCase().split(' ').join('_') === badge.id)}
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
    gap: var(--sp-3);
    padding: var(--sp-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    font-family: var(--font-body);
    border-radius: var(--radius-lg);
  }

  .ach-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding-bottom: var(--sp-2);
    border-bottom: 1px solid var(--border-default);
  }
  .ach-title {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: var(--sp-1);
  }
  .ach-sub {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.05em;
  }
  .ach-progress {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex: 1;
    max-width: 220px;
  }
  .progress-track {
    flex: 1;
    height: 8px;
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    overflow: hidden;
    border-radius: 4px;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s var(--ease-default);
    border-radius: 4px;
  }
  .progress-pct {
    font-size: var(--fs-xs);
    color: var(--text-primary);
    min-width: 32px;
    text-align: right;
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .ach-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--sp-2);
  }
  .badge {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .badge.locked {
    opacity: 0.45;
    filter: grayscale(0.5);
  }
  .badge.earned {
    animation: badge-pop 0.2s ease-out forwards;
    border-color: rgba(16, 185, 129, 0.3);
    background: var(--success-subtle);
  }
  @keyframes badge-pop {
    from { transform: scale(0.98); }
    to { transform: scale(1); }
  }
  .badge-icon {
    font-size: 18px;
    flex-shrink: 0;
    width: 32px;
    text-align: center;
  }
  .badge-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }
  .badge-title {
    font-size: var(--fs-xs);
    color: var(--text-primary);
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .badge-desc {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    line-height: 1.5;
  }
  .badge-check {
    position: absolute;
    top: var(--sp-1);
    right: var(--sp-1);
    font-size: var(--fs-xs);
    color: #fff;
    background: var(--success);
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 700;
  }
  .badge-lock {
    position: absolute;
    top: var(--sp-1);
    right: var(--sp-1);
    font-size: var(--fs-xs);
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
  }

  .ach-footer {
    margin-top: var(--sp-2);
    padding-top: var(--sp-2);
    border-top: 1px dashed var(--border-default);
  }
  .footer-text {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    letter-spacing: 0.02em;
    font-family: var(--font-mono);
  }
</style>
