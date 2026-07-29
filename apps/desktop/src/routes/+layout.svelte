<script lang="ts">
  import '../app.css';
  import { APP_VERSION } from '$lib/version';
  let { children } = $props();
  let error = $state<string | null>(null);
  let loading = $state(true);

  $effect(() => {
    function handleError(e: ErrorEvent) {
      console.error('[AgenMonster Error]', e.error);
      const msg = e.error?.message || 'Unknown error';
      const stack = e.error?.stack || '';
      error = stack ? `${msg}\n${stack.substring(0, 800)}` : msg;
    }
    function handleRejection(e: PromiseRejectionEvent) {
      console.error('[AgenMonster Unhandled]', e.reason);
    }
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Simulate loading delay for splash screen
    const t = setTimeout(() => { loading = false; }, 1800);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      clearTimeout(t);
    };
  });
</script>

{#if error}
  <div class="error-boundary">
    <div class="error-icon"><span class="ico ico-lg ico-cross" style="color:#e85050"></span></div>
    <div class="error-title">AgenMonster crashed</div>
    <div class="error-msg">{error}</div>
    <button class="error-retry" onclick={() => { error = null; location.reload(); }}>RESTART</button>
  </div>
{:else if loading}
  <div class="splash">
    <div class="splash-content">
      <div class="splash-icon"><span class="ico ico-lg ico-stage-egg" style="color:var(--active-primary)"></span></div>
      <div class="splash-title">AGENMONSTER</div>
      <div class="splash-version">{APP_VERSION}</div>
      <div class="splash-loader">
        <div class="loader-bar"></div>
      </div>
      <div class="splash-hint">Self-Evolving AI Monster Agent</div>
    </div>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .splash {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0d0d1a;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .splash-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .splash-icon {
    font-size: 48px;
    animation: bounce 1s step-end infinite;
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .splash-title {
    font-size: 16px;
    color: var(--active-primary, #50b848);
    letter-spacing: 4px;
  }
  .splash-version {
    font-size: 8px;
    color: #555;
  }
  .splash-loader {
    width: 200px;
    height: 4px;
    background: #1a1a2e;
    border: 1px solid #333;
    overflow: hidden;
    margin-top: 8px;
  }
  .loader-bar {
    width: 30%;
    height: 100%;
    background: var(--active-primary, #50b848);
    animation: load 1.5s step-end infinite;
  }
  @keyframes load {
    0% { width: 0%; }
    50% { width: 80%; }
    100% { width: 100%; }
  }
  .splash-hint {
    font-size: 7px;
    color: #444;
    margin-top: 4px;
  }

  .error-boundary {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0d0d1a;
    color: #e85050;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    gap: 12px;
    padding: 20px;
    text-align: center;
  }
  .error-icon { font-size: 32px; }
  .error-title { font-size: 12px; color: #e85050; }
  .error-msg { font-size: 9px; color: #888; max-width: 400px; word-break: break-word; }
  .error-retry {
    margin-top: 12px;
    padding: 8px 20px;
    background: #1a1a2e;
    border: 1px solid #e85050;
    color: #e85050;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 10px;
    cursor: pointer;
  }
  .error-retry:hover { background: #252540; }
</style>
