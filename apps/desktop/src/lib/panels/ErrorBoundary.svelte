<script lang="ts">
  import { logger } from '$lib/logger';

  let { children, fallback, onError, componentName = 'Component' } = $props<{
    children: import('svelte').Snippet;
    fallback?: import('svelte').Snippet<[Error, () => void]>;
    onError?: (error: Error, errorInfo: { componentStack: string }) => void;
    componentName?: string;
  }>();

  let error: Error | null = $state(null);
  let errorInfo: { componentStack: string } | null = $state(null);

  $effect(() => {
    function handleError(event: ErrorEvent) {
      const err = event.error || new Error(event.message);
      error = err;
      errorInfo = { componentStack: err.stack || 'No stack trace' };
      logger.error(`Error in ${componentName}`, {
        component: componentName,
        error: { message: err.message, stack: err.stack },
      });
      onError?.(err, errorInfo);
      event.preventDefault();
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      error = err;
      errorInfo = { componentStack: err.stack || 'No stack trace' };
      logger.error(`Unhandled rejection in ${componentName}`, {
        component: componentName,
        error: { message: err.message, stack: err.stack },
      });
      onError?.(err, errorInfo);
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  });

  function retry() {
    error = null;
    errorInfo = null;
  }
</script>

{#if error}
  {#if fallback}
    {@render fallback(error, retry)}
  {:else}
    <div class="error-boundary" role="alert">
      <div class="error-icon"><span class="ico ico-lg ico-cross" style="color:#e85050"></span></div>
      <div class="error-title">{componentName} crashed</div>
      <div class="error-msg">{error.message}</div>
      {#if errorInfo?.componentStack}
        <details class="error-details">
          <summary>Stack Trace</summary>
          <pre>{errorInfo.componentStack}</pre>
        </details>
      {/if}
      <div class="error-actions">
        <button class="error-retry" onclick={retry}>RETRY</button>
        <button class="error-report" onclick={() => {
          if (error) {
            navigator.clipboard.writeText(`${error.name}: ${error.message}\n\n${errorInfo?.componentStack}`);
            logger.info('Error copied to clipboard', { component: componentName });
          }
        }}>COPY ERROR</button>
      </div>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}

<style>
  .error-boundary {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--sp-6);
    gap: var(--sp-3);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    font-family: var(--font-body);
    text-align: center;
    min-height: 200px;
  }
  .error-icon { font-size: var(--fs-2xl); }
  .error-title { font-size: var(--fs-lg); font-weight: 700; color: var(--error); }
  .error-msg { font-size: var(--fs-sm); color: var(--text-muted); max-width: 400px; word-break: break-word; line-height: 1.5; }
  .error-details {
    margin-top: var(--sp-3);
    text-align: left;
    width: 100%;
    max-width: 500px;
  }
  .error-details summary {
    cursor: pointer;
    font-size: var(--fs-xs);
    color: var(--text-muted);
    margin-bottom: var(--sp-2);
    font-weight: 600;
  }
  .error-details pre {
    font-size: var(--fs-xs);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    padding: var(--sp-3);
    overflow: auto;
    max-height: 300px;
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    line-height: 1.5;
  }
  .error-actions {
    display: flex;
    gap: var(--sp-2);
    margin-top: var(--sp-2);
  }
  .error-retry, .error-report {
    padding: var(--sp-2) var(--sp-3);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--fs-sm);
    cursor: pointer;
    border-radius: var(--radius-md);
    font-weight: 600;
    transition: all var(--duration-fast) var(--ease-default);
  }
  .error-retry:hover { background: var(--bg-hover); border-color: var(--border-strong); }
  .error-report { border-color: rgba(16, 185, 129, 0.3); color: var(--success); }
  .error-report:hover { background: var(--success-subtle); }
</style>