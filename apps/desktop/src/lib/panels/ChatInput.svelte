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
      aria-label="Chat message input"
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
    margin-top: auto;
    padding: var(--sp-2);
    background: var(--bg-elevated);
    border-top: 1px solid var(--border-default);
    flex-shrink: 0;
  }
  .chat-input {
    display: flex;
    gap: var(--sp-1);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--sp-1);
    transition: border-color var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default);
  }
  .chat-input:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-subtle);
  }
  textarea {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--fs-sm);
    padding: var(--sp-1) var(--sp-2);
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 120px;
    line-height: 1.5;
  }
  textarea::placeholder { color: var(--text-disabled); }
  textarea:disabled { color: var(--text-disabled); cursor: not-allowed; }

  .send-btn {
    width: 32px;
    height: 32px;
    background: var(--accent);
    border: none;
    color: #fff;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .send-btn:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
  .send-btn:active:not(:disabled) { transform: translateY(0); }
  .send-btn:disabled { background: var(--bg-overlay); color: var(--text-disabled); cursor: not-allowed; opacity: 0.5; }

  .stop-btn {
    height: 32px;
    padding: 0 var(--sp-2);
    background: var(--error);
    border: none;
    color: #fff;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-1);
    flex-shrink: 0;
    font-size: var(--fs-xs);
    font-weight: 600;
    font-family: var(--font-body);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .stop-btn:hover { background: #dc2626; }

  .retry-btn {
    width: 32px;
    height: 32px;
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .retry-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-strong); }

  .input-hint {
    display: flex;
    justify-content: space-between;
    padding: var(--sp-1) var(--sp-2) 0;
    font-size: var(--fs-2xs);
    color: var(--text-disabled);
  }
</style>
