<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="route-error">
  <div class="err-icon"><span class="ico ico-lg ico-cross" style="color:#e85050"></span></div>
  <div class="err-code">{$page.status}</div>
  <div class="err-title">{$page.error?.message || 'Something went wrong'}</div>
  <a class="err-home" href="/">BACK TO BASE</a>
</div>

<style>
  .route-error {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #0d0d1a;
    color: #e85050;
    font-family: var(--font-body);
    text-align: center;
    padding: 20px;
  }
  .err-code { font-size: 28px; color: #50b848; }
  .err-title { font-size: 9px; color: #888; max-width: 420px; word-break: break-word; }
  .err-home {
    margin-top: 12px;
    padding: 8px 16px;
    border: 2px solid #50b848;
    color: #50b848;
    text-decoration: none;
    font-size: 9px;
  }
  .err-home:hover { background: #50b848; color: #0d0d1a; }
</style>
