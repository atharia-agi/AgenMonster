<script lang="ts">
  import { renderMarkdownLite, type Segment } from '$lib/markdown';
  let { message, onReport }: { message: { id: string; role: string; content: string; timestamp: number; xpEarned?: number }; onReport?: (m: any) => void } = $props();

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const seggy = $derived(message.role === 'assistant' ? renderMarkdownLite(message.content) : null);
  let copiedIdx = $state<number | null>(null);
  let reported = $state(false);

  async function copyPre(idx: number, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
    copiedIdx = idx;
    setTimeout(() => { if (copiedIdx === idx) copiedIdx = null; }, 1200);
  }

  function report() {
    if (reported) return;
    reported = true;
    onReport?.(message);
    setTimeout(() => { reported = false; }, 3000);
  }
</script>

<div class="chat-msg" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'} class:system={message.role === 'system'}>
  {#if message.role === 'assistant'}
    <div class="avatar">
      <div class="pet-icon ico ico-stage-child"></div>
    </div>
  {/if}

  <div class="bubble">
    {#if message.role === 'assistant'}
      <div class="sender">
        <span class="name">AgenMonster</span>
        <span class="time">{formatTime(message.timestamp)}</span>
        <button class="report-btn" class:reported onclick={report} title="Mark this reply as a lesson for future me">
          {reported ? 'LOGGED' : '👎'}
        </button>
      </div>
    {:else if message.role === 'user'}
      <div class="sender">
        <span class="time">{formatTime(message.timestamp)}</span>
        {#if message.xpEarned}
          <span class="xp-badge">+{message.xpEarned} XP</span>
        {/if}
      </div>
    {/if}

    {#if message.role === 'assistant' && seggy}
      {@render segRendered(seggy)}
    {:else}
      <div class="content">{message.content}</div>
    {/if}
  </div>

  {#if message.role === 'user'}
    <div class="avatar user-avatar">
      <div class="user-icon">Y</div>
    </div>
  {/if}
</div>

{#snippet segRendered(segs: Segment[])}
  {#each segs as seg, idx}
    {#if seg.type === 'text'}
      {seg.value}
    {:else if seg.type === 'pre'}
      <div class="pre-wrap">
        <pre class="md-pre">{seg.value}</pre>
        <button class="copy-btn" class:copied={copiedIdx === idx} onclick={() => copyPre(idx, seg.value)}>
          {copiedIdx === idx ? 'COPIED!' : 'COPY'}
        </button>
      </div>
    {:else if seg.type === 'code'}
      <code class="md-inline">{seg.value}</code>
    {:else if seg.type === 'bold'}
      <strong class="md-strong">{seg.value}</strong>
    {:else if seg.type === 'italic'}
      <em class="md-em">{seg.value}</em>
    {/if}
  {/each}
{/snippet}

<style>
  .chat-msg {
    display: flex;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    max-width: 100%;
  }
  .chat-msg.user { flex-direction: row-reverse; }
  .chat-msg.system { justify-content: center; padding: var(--sp-2) var(--sp-3); }
  .chat-msg.system .bubble {
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-xs);
    color: var(--text-muted);
    text-align: center;
    font-family: var(--font-body);
    border-radius: var(--radius-md);
  }

  .avatar {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--bg-overlay);
    border-radius: var(--radius-md);
  }
  .pet-icon { width: 16px; height: 16px; }
  .user-icon { font-size: 11px; color: var(--text-secondary); font-family: var(--font-body); font-weight: 700; }
  .user-avatar { background: var(--bg-overlay); border-color: var(--border-default); }

  .bubble {
    max-width: 75%;
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--border-default);
    font-size: var(--fs-sm);
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-elevated);
    font-family: var(--font-body);
    border-radius: var(--radius-lg);
  }
  .user .bubble {
    background: var(--accent-subtle);
    border-color: rgba(99, 102, 241, 0.2);
    color: var(--text-primary);
  }

  .sender {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-1);
  }
  .name { font-size: var(--fs-xs); color: var(--text-primary); font-weight: 600; }
  .time { font-size: var(--fs-2xs); color: var(--text-muted); margin-left: auto; font-family: var(--font-body); }
  .xp-badge {
    font-size: var(--fs-2xs);
    color: var(--success);
    background: var(--success-subtle);
    padding: 1px var(--sp-1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    font-family: var(--font-body);
    border-radius: var(--radius-sm);
    font-weight: 600;
  }
  .report-btn {
    margin-left: auto;
    font-size: var(--fs-2xs);
    padding: var(--sp-1) var(--sp-1);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-muted);
    cursor: pointer;
    font-family: var(--font-body);
    border-radius: var(--radius-sm);
    opacity: 0.6;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .report-btn:hover { opacity: 1; color: var(--error); border-color: rgba(239, 68, 68, 0.3); }
  .report-btn.reported { opacity: 1; color: var(--success); background: var(--success-subtle); border-color: rgba(16, 185, 129, 0.2); }

  .content { white-space: pre-wrap; word-break: break-word; font-family: var(--font-body); font-size: var(--fs-sm); line-height: 1.6; color: var(--text-primary); }
  .pre-wrap { position: relative; }
  .md-pre {
    display: block;
    margin: var(--sp-2) 0;
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    white-space: pre-wrap;
    word-break: break-all;
    border-radius: var(--radius-md);
    overflow-x: auto;
  }
  .copy-btn {
    position: absolute;
    top: var(--sp-1);
    right: var(--sp-1);
    font-family: var(--font-body);
    font-size: var(--fs-2xs);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .copy-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .copy-btn.copied { background: var(--accent-subtle); color: var(--accent); border-color: rgba(99, 102, 241, 0.2); }
  .md-inline {
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    padding: 1px var(--sp-1);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    border-radius: var(--radius-sm);
  }
  .md-strong { color: var(--text-primary); font-weight: 700; }
  .md-em { font-style: italic; color: var(--text-secondary); }
</style>
