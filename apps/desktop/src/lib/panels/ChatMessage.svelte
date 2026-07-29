<script lang="ts">
  import { renderMarkdownLite, escape, type Segment } from '$lib/markdown';
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
      {escape(seg.value)}
    {:else if seg.type === 'pre'}
      <div class="pre-wrap">
        <pre class="md-pre">{escape(seg.value)}</pre>
        <button class="copy-btn" class:copied={copiedIdx === idx} onclick={() => copyPre(idx, seg.value)}>
          {copiedIdx === idx ? 'COPIED!' : 'COPY'}
        </button>
      </div>
    {:else if seg.type === 'code'}
      <code class="md-inline">{escape(seg.value)}</code>
    {:else if seg.type === 'bold'}
      <strong class="md-strong">{escape(seg.value)}</strong>
    {:else if seg.type === 'italic'}
      <em class="md-em">{escape(seg.value)}</em>
    {/if}
  {/each}
{/snippet}

<style>
  .chat-msg {
    display: flex;
    gap: 6px;
    padding: 4px 8px;
    max-width: 100%;
    image-rendering: pixelated;
  }
  .chat-msg.user { flex-direction: row-reverse; }
  .chat-msg.system { justify-content: center; padding: 4px 8px; }
  .chat-msg.system .bubble {
    background: var(--gb-panel);
    border: 2px solid var(--gb-dark);
    padding: 2px 8px;
    font-size: 8px;
    color: var(--gb-dark);
    text-align: center;
    font-style: normal;
    font-family: var(--font-body);
  }

  .avatar {
    width: 22px;
    height: 22px;
    border: 3px solid var(--gb-border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--gb-panel);
    image-rendering: pixelated;
  }
  .pet-icon { width: 14px; height: 14px; }
  .user-icon { font-size: 10px; color: var(--gb-border); font-family: var(--font-body); }
  .user-avatar { background: var(--gb-bg); border-color: var(--gb-border); }

  .bubble {
    max-width: 75%;
    padding: 6px 8px;
    border: 3px solid var(--gb-border);
    font-size: 9px;
    line-height: 1.8;
    color: var(--gb-text);
    background: var(--gb-panel);
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .user .bubble {
    background: var(--gb-border);
    border-color: var(--gb-text);
    color: var(--gb-bg);
  }

  .sender {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .name { font-size: 8px; color: var(--gb-text); text-transform: uppercase; }
  .time { font-size: 7px; color: var(--gb-dark); margin-left: auto; font-family: var(--font-body); }
  .xp-badge {
    font-size: 7px;
    color: var(--gb-bg);
    background: var(--gb-border);
    padding: 1px 4px;
    border: 2px solid var(--gb-text);
    font-family: var(--font-body);
  }
  .report-btn {
    margin-left: auto;
    font-size: 8px;
    padding: 0 4px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    font-family: var(--font-body);
    image-rendering: pixelated;
    opacity: 0.6;
    transition: opacity 0.1s steps(2), color 0.1s steps(2);
  }
  .report-btn:hover { opacity: 1; color: #e85050; }
  .report-btn.reported { opacity: 1; color: var(--gb-text); background: var(--gb-border); }

  .content { white-space: pre-wrap; word-break: break-word; font-family: var(--font-body); font-size: 9px; line-height: 1.8; }
  .pre-wrap { position: relative; }
  .md-pre { display: block; margin: 4px 0; padding: 4px 6px; background: var(--gb-bg); border: 2px solid var(--gb-dark); font-family: var(--font-body); font-size: 8px; white-space: pre-wrap; word-break: break-all; image-rendering: pixelated; }
  .copy-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    font-family: var(--font-body);
    font-size: 6px;
    padding: 1px 4px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .copy-btn:hover { background: var(--gb-border); color: var(--gb-bg); }
  .copy-btn.copied { background: var(--gb-text); color: var(--gb-bg); border-color: var(--gb-text); }
  .md-inline { background: var(--gb-bg); border: 2px solid var(--gb-dark); padding: 0 3px; font-family: var(--font-body); font-size: 8px; image-rendering: pixelated; }
  .md-strong { color: var(--gb-text); font-weight: bold; letter-spacing: 0.3px; }
  .md-em { font-style: italic; color: var(--gb-dark); }
</style>
