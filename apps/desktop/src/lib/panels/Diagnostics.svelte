<script lang="ts">
  // DiagnosticsPanel — reads from the shared chatStats store and renders the
  // per-route outcome table plus totals. Pure presentation: no mutations here.
  import { subscribeChatStats, resetChatStats, msLabel, type ChatStatsState } from '$lib/chatStatsStore.svelte';
  import { getTokenState, resetTokenState, formatCost, formatTokens, type TokenState, hydrateTokenState, getDailySpend } from '$lib/tokenTracker';
  import { loadCaps, type BudgetCaps } from '$lib/costGuard';
  import { getRetryConfidenceStats } from '$lib/selfCorrect';
  import { getPerformanceState, subscribePerformance, type TurnMeasure, type ToolMeasure } from '$lib/performanceMonitor';

  let stats = $state<ChatStatsState>({
    entries: [],
    byRoute: {},
    totalCalls: 0,
    totalSuccess: 0,
    totalFail: 0,
    lastMs: 0,
    lastOk: false,
    rollingMsAvg: 0,
  });
  let tokens = $state<TokenState>(getTokenState());
  let caps = $state<BudgetCaps>(loadCaps());
  let daily = $state(getDailySpend());
  let retryStats = $state(getRetryConfidenceStats());
  let perf = $state(getPerformanceState());

  $effect(() => {
    hydrateTokenState();
    tokens = getTokenState();
    daily = getDailySpend();
    retryStats = getRetryConfidenceStats();
    perf = getPerformanceState();
    const unsub = subscribeChatStats((s) => { stats = s; });
    const unsubPerf = subscribePerformance((s) => { perf = s; });
    return () => {
      try { unsub(); } catch {}
      try { unsubPerf(); } catch {}
    };
  });

  function pct(n: number, d: number): string {
    if (!d) return '0%';
    return `${Math.round((n / d) * 100)}%`;
  }
  function barColor(ratio: number, warnRatio: number): string {
    if (ratio >= 1) return 'block';
    if (ratio >= warnRatio) return 'warn';
    return 'ok';
  }
  function ratioPct(used: number, cap: number): number {
    if (!cap) return 0;
    return Math.min(1, used / cap);
  }
</script>

<div class="diag">
  <div class="diag-row totals">
    <div class="kpi">
      <div class="kpi-val">{stats.totalCalls}</div>
      <div class="kpi-lbl">CALLS</div>
    </div>
    <div class="kpi">
      <div class="kpi-val ok">{stats.totalSuccess}</div>
      <div class="kpi-lbl">OK</div>
    </div>
    <div class="kpi">
      <div class="kpi-val err">{stats.totalFail}</div>
      <div class="kpi-lbl">ERR</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">{msLabel(stats.rollingMsAvg)}</div>
      <div class="kpi-lbl">AVG</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">{msLabel(stats.lastMs)}</div>
      <div class="kpi-lbl">LAST</div>
    </div>
  </div>

  {#if stats.totalCalls === 0}
    <div class="empty">No telemetry yet — start a chat to populate.</div>
  {:else}
    <div class="table-title">PER ROUTE</div>
    <table>
      <thead>
        <tr>
          <th>ROUTE</th>
          <th>CALLS</th>
          <th>OK%</th>
          <th>LAST</th>
          <th>AVG</th>
          <th>TOK</th>
          <th>COST</th>
        </tr>
      </thead>
      <tbody>
        {#each Object.entries(stats.byRoute) as [key, r] (key)}
          {@const tk = tokens.byRoute[key]}
          <tr>
            <td class="route">{key}</td>
            <td>{r.calls}</td>
            <td>{pct(r.successes, r.calls)}</td>
            <td>{msLabel(r.msLast)}</td>
            <td>{msLabel(r.msAvg)}</td>
            <td>{tk ? formatTokens(tk.total) : '—'}</td>
            <td>{tk ? formatCost(tk.cost) : '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  {#if tokens.totalTokens > 0}
    <div class="table-title">TOKENS / COST</div>
    <div class="diag-row totals">
      <div class="kpi">
        <div class="kpi-val">{formatTokens(tokens.totalTokens)}</div>
        <div class="kpi-lbl">TOTAL</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{formatTokens(tokens.promptTokens)}</div>
        <div class="kpi-lbl">IN</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{formatTokens(tokens.completionTokens)}</div>
        <div class="kpi-lbl">OUT</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{formatCost(tokens.totalCost)}</div>
        <div class="kpi-lbl">COST</div>
      </div>
    </div>
  {/if}

  {#if caps.perCallUsd > 0 || caps.dailyUsdTotal > 0}
    <div class="table-title">COST GUARD</div>
    <div class="guard-bars">
      {#if caps.perCallUsd > 0}
        <div class="guard-row">
          <div class="guard-lbl">PER-CALL</div>
          <div class="guard-track"><div class="guard-fill {barColor(ratioPct(tokens.lastCallCost, caps.perCallUsd), caps.perCallWarnRatio)}" style="width:{Math.max(1, ratioPct(tokens.lastCallCost, caps.perCallUsd) * 100)}%"></div></div>
          <div class="guard-val">{formatCost(tokens.lastCallCost)} / ${caps.perCallUsd.toFixed(2)}</div>
        </div>
      {/if}
      {#if caps.dailyUsdTotal > 0}
        <div class="guard-row">
          <div class="guard-lbl">DAILY</div>
          <div class="guard-track"><div class="guard-fill {barColor(ratioPct(daily.total, caps.dailyUsdTotal), caps.perCallWarnRatio)}" style="width:{Math.max(1, ratioPct(daily.total, caps.dailyUsdTotal) * 100)}%"></div></div>
          <div class="guard-val">{formatCost(daily.total)} / ${caps.dailyUsdTotal.toFixed(2)}</div>
        </div>
      {/if}
      {#if Object.keys(caps.perProviderDailyUsd).length > 0}
        {#each Object.entries(caps.perProviderDailyUsd) as [prov, dailyCap]}
          <div class="guard-row">
            <div class="guard-lbl">{prov.toUpperCase()} › DAY</div>
            <div class="guard-track"><div class="guard-fill {barColor(ratioPct(daily.byProvider[prov] || 0, dailyCap), caps.perCallWarnRatio)}" style="width:{Math.max(1, ratioPct(daily.byProvider[prov] || 0, dailyCap) * 100)}%"></div></div>
            <div class="guard-val">{formatCost(daily.byProvider[prov] || 0)} / ${dailyCap.toFixed(2)}</div>
          </div>
        {/each}
      {/if}
      {#each Object.entries(tokens.byRoute) as [route, r]}
        {@const provider = route.split('/')[0] || 'unknown'}
        {@const totalCap = caps.perProviderTotalUsd[provider]}
        {#if totalCap}
          <div class="guard-row">
            <div class="guard-lbl">{provider.toUpperCase()} › ALL</div>
            <div class="guard-track"><div class="guard-fill {barColor(ratioPct(r.cost, totalCap), caps.perCallWarnRatio)}" style="width:{Math.max(1, ratioPct(r.cost, totalCap) * 100)}%"></div></div>
            <div class="guard-val">{formatCost(r.cost)} / ${totalCap.toFixed(2)}</div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if retryStats.total > 0}
    <div class="table-title">SELF-CORRECTION</div>
    <div class="diag-row totals">
      <div class="kpi">
        <div class="kpi-val">{retryStats.total}</div>
        <div class="kpi-lbl">RETRIES</div>
      </div>
      <div class="kpi">
        <div class="kpi-val {retryStats.successRate >= 0.5 ? 'ok' : 'err'}">{pct(retryStats.successRate * 100, 100)}</div>
        <div class="kpi-lbl">SUCCESS</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{Math.round(retryStats.avgConfidence * 100)}%</div>
        <div class="kpi-lbl">CONF</div>
      </div>
    </div>
  {/if}

  {#if perf.totalTurns > 0}
    <div class="table-title">PERFORMANCE</div>
    <div class="diag-row totals">
      <div class="kpi">
        <div class="kpi-val">{perf.totalTurns}</div>
        <div class="kpi-lbl">TURNS</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{msLabel(perf.avgTurnMs)}</div>
        <div class="kpi-lbl">AVG TURN</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{msLabel(perf.lastTurnMs)}</div>
        <div class="kpi-lbl">LAST TURN</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{msLabel(perf.avgToolMs)}</div>
        <div class="kpi-lbl">AVG TOOL</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">{perf.slowestTool ? perf.slowestTool.durationMs + 'ms' : '—'}</div>
        <div class="kpi-lbl">SLOWEST TOOL</div>
      </div>
    </div>
    {#if perf.recentTurns.length > 0}
      <div class="table-title">TURN LATENCY (last {Math.min(perf.recentTurns.length, 10)})</div>
      <table class="perf-table">
        <thead>
          <tr>
            <th>#</th>
            <th>TOTAL</th>
            <th>TOOLS</th>
          </tr>
        </thead>
        <tbody>
          {#each perf.recentTurns.slice(-10) as turn}
            <tr>
              <td>{turn.turn}</td>
              <td>{msLabel(turn.durationMs)}</td>
              <td>{turn.tools.map(t => `${t.name} ${t.durationMs}ms`).join(', ') || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}

  <div class="actions">
    <button class="reset-btn" onclick={() => { resetChatStats(); tokens = (resetTokenState()); perf = { totalTurns: 0, avgTurnMs: 0, lastTurnMs: 0, totalTools: 0, avgToolMs: 0, lastToolMs: 0, slowestTool: null, recentTurns: [] }; }}>RESET STATS</button>
  </div>
</div>

<style>
  .diag {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-text);
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .diag-row.totals {
    display: flex;
    gap: 4px;
    justify-content: space-between;
  }
  .kpi {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    image-rendering: pixelated;
  }
  .kpi-val {
    font-size: 14px;
    line-height: 1;
    color: var(--gb-text);
  }
  .kpi-val.ok { color: var(--gb-text); }
  .kpi-val.err { color: var(--gb-text); }
  .kpi-lbl {
    font-size: 6px;
    color: var(--gb-dark);
    letter-spacing: 0.6px;
    margin-top: 3px;
  }

  .empty {
    padding: 8px;
    text-align: center;
    font-size: 8px;
    color: var(--gb-dark);
    border: 2px dashed var(--gb-dark);
  }

  .table-title {
    font-size: 7px;
    color: var(--gb-dark);
    letter-spacing: 0.5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
    font-family: var(--font-body);
  }
  th, td {
    border: 2px solid var(--gb-bg);
    padding: 3px 4px;
    text-align: left;
    color: var(--gb-text);
    background: var(--gb-panel);
  }
  th {
    background: var(--gb-border);
    color: var(--gb-bg);
    font-size: 7px;
    letter-spacing: 0.5px;
  }
  td.route { word-break: break-all; }

  .actions { display: flex; justify-content: flex-end; }
  .guard-bars {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .guard-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 7px;
    font-family: var(--font-body);
  }
  .guard-lbl {
    min-width: 90px;
    color: var(--gb-dark);
    text-align: right;
    letter-spacing: 0.3px;
  }
  .guard-track {
    flex: 1;
    height: 10px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    overflow: hidden;
    image-rendering: pixelated;
  }
  .guard-fill {
    height: 100%;
    background: var(--gb-border);
    transition: width 0.3s steps(8);
    image-rendering: pixelated;
  }
  .guard-fill.ok { background: var(--gb-border); }
  .guard-fill.warn { background: var(--gb-text); }
  .guard-fill.block { background: #c03030; }
  .guard-val {
    min-width: 120px;
    text-align: right;
    color: var(--gb-text);
  }

  .actions { display: flex; justify-content: flex-end; }
  .reset-btn {
    font-family: var(--font-body);
    font-size: 8px;
    padding: 3px 8px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-text);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .reset-btn:hover { background: var(--gb-border); color: var(--gb-bg); }
  .perf-table td { font-size: 7px; }
</style>
