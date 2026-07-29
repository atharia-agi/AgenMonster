<script lang="ts">
  let { messages, onSend, disabled = false, onCancel } = $props<{
    messages: Array<{ id: string; role: string; content: string }>;
    onSend: (text: string) => void;
    disabled?: boolean;
    onCancel?: () => void;
  }>();

  let text = $state('');
  let inputEl: HTMLTextAreaElement;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      send();
    }
  }

  function send() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    text = '';
    if (inputEl) inputEl.style.height = 'auto';
  }

  function cancel() {
    if (onCancel) onCancel();
  }

  function retryLastMessage() {
    const last = [...messages].reverse().find((m: any) => m.role === 'user' && m.content.trim());
    if (last) {
      text = last.content;
      send();
    }
  }

  function autoResize() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }

  export function focus() {
    inputEl?.focus();
  }
</script>

<div class="chat-input-wrap">
  <div class="chat-input">
    <textarea
      bind:this={inputEl}
      bind:value={text}
      onkeydown={handleKeydown}
      oninput={autoResize}
      placeholder={disabled ? 'Generating reply… press STOP to cancel' : 'Message AgenMonster...'}
      rows="1"
      {disabled}
    ></textarea>
    {#if disabled && onCancel}
      <button class="stop-btn" onclick={cancel} aria-label="Stop generation">
        <span class="stop-sq"></span>
        <span class="stop-lbl">STOP</span>
      </button>
    {:else if !disabled && messages.some((m: any) => m.role === 'assistant')}
      <button class="retry-btn" onclick={retryLastMessage} aria-label="Retry last message" title="Re-send last user message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>
      <button class="send-btn" onclick={send} disabled={!text.trim()} aria-label="Send message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    {/if}
  </div>
  <div class="input-hint">
    <span>Enter to send</span>
    <span>Shift+Enter for newline{disabled && onCancel ? ' · Stop cancels' : ''}</span>
  </div>
</div>

<style>
  .chat-input-wrap {
    padding: 4px;
    background: var(--gb-panel);
    border-top: 3px solid var(--gb-border);
    image-rendering: pixelated;
  }
  .chat-input {
    display: flex;
    gap: 4px;
    background: var(--gb-bg);
    border: 3px solid var(--gb-border);
    padding: 3px;
    image-rendering: pixelated;
  }
  textarea {
    flex: 1;
    background: var(--gb-bg);
    border: none;
    color: var(--gb-text);
    font-family: var(--font-body);
    font-size: 9px;
    padding: 4px;
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 60px;
    image-rendering: pixelated;
  }
  textarea::placeholder { color: var(--gb-dark); }
  textarea:disabled { color: var(--gb-dark); }

  .send-btn {
    width: 34px;
    height: 34px;
    border: 3px solid var(--gb-text);
    background: var(--gb-border);
    color: var(--gb-bg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    image-rendering: pixelated;
  }
  .send-btn:hover:not(:disabled) { background: var(--gb-text); }
  .send-btn:disabled { background: var(--gb-dark); color: var(--gb-panel); cursor: not-allowed; }

  .stop-btn {
    width: auto;
    height: 34px;
    border: 3px solid var(--gb-text);
    background: var(--gb-text);
    color: var(--gb-bg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 8px;
    flex-shrink: 0;
    image-rendering: pixelated;
    animation: stopPulse 1.2s steps(2) infinite;
  }
  .stop-btn:hover { background: #c93030; }
  .stop-sq {
    width: 10px;
    height: 10px;
    background: var(--gb-bg);
    border: 1px solid var(--gb-bg);
    display: inline-block;
  }
  .stop-lbl {
    font-family: var(--font-body);
    font-size: 9px;
    letter-spacing: 1px;
    color: var(--gb-bg);
  }
  @keyframes stopPulse {
    0%, 100% { background: var(--gb-text); }
    50% { background: #c93030; }
  }

  .retry-btn {
    width: 34px;
    height: 34px;
    border: 3px solid var(--gb-text);
    background: var(--gb-bg);
    color: var(--gb-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    image-rendering: pixelated;
  }
  .retry-btn:hover { background: var(--gb-border); color: var(--gb-bg); }
  .retry-btn svg { image-rendering: pixelated; }

  .input-hint {
    display: flex;
    justify-content: space-between;
    padding: 2px 4px;
    font-size: 7px;
    color: var(--gb-dark);
    font-family: var(--font-body);
  }
</style>
