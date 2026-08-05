<script lang="ts">
  import { getGameState, saveState, exportState, importState } from '$lib/gameState';
  import { getMemoryState, exportMemoryJSON, importMemoryJSON } from '$lib/memory';
  import { tauriExportBackup, isTauri } from '$lib/tauri';
  import { sync, getDeviceId, type SyncMessage, shouldAcceptSync, encodeGoalsToCRDT, decodeCRDTToGoals, mergeGoalsCRDT, type GoalsCRDTEnvelope } from '$lib/crossDeviceSync';

  let status = $state('idle');
  let message = $state('');
  let lastBackupPath = $state('');
  let peers = $state<SyncMessage[]>([]);
  let syncActive = $state(false);
  let deviceId = $state(getDeviceId());
  let lastSyncTime = $state('');
  let localStateSeq = $state(-1);
  let localStateTs = $state(0);
  let localMemorySeq = $state(-1);
  let localMemoryTs = $state(0);
  let localGoalsSeq = $state(-1);
  let localGoalsTs = $state(0);
  let localGoalsEnvelope = $state<GoalsCRDTEnvelope>({ adds: {}, removes: {}, stepRemoves: {}, goals: {} });

  $effect(() => {
    const unsub = sync.onMessage((msg) => {
      if (msg.type === 'pong') {
        peers = [...peers.filter((p) => p.deviceId !== msg.deviceId), msg];
        lastSyncTime = new Date(msg.timestamp).toLocaleTimeString();
        return;
      }
      if (msg.type === 'state' && shouldAcceptSync(msg, localStateSeq, localStateTs)) {
        localStateSeq = msg.seq ?? localStateSeq;
        localStateTs = msg.lastModified ?? msg.timestamp;
        saveState(msg.payload);
        lastSyncTime = new Date(msg.timestamp).toLocaleTimeString();
      } else if (msg.type === 'memory' && shouldAcceptSync(msg, localMemorySeq, localMemoryTs)) {
        localMemorySeq = msg.seq ?? localMemorySeq;
        localMemoryTs = msg.lastModified ?? msg.timestamp;
        importMemoryJSON(JSON.stringify(msg.payload));
        lastSyncTime = new Date(msg.timestamp).toLocaleTimeString();
      } else if (msg.type === 'goals' && shouldAcceptSync(msg, localGoalsSeq, localGoalsTs)) {
        localGoalsSeq = msg.seq ?? localGoalsSeq;
        localGoalsTs = msg.lastModified ?? msg.timestamp;
        const remoteEnvelope = msg.payload as GoalsCRDTEnvelope;
        localGoalsEnvelope = mergeGoalsCRDT(localGoalsEnvelope, remoteEnvelope);
        const mergedGoals = decodeCRDTToGoals(localGoalsEnvelope);
        localStorage.setItem('agenmonster_goals', JSON.stringify(mergedGoals));
        lastSyncTime = new Date(msg.timestamp).toLocaleTimeString();
      }
    });

    return () => unsub();
  });

  function toggleSync() {
    if (syncActive) {
      sync.stop();
      syncActive = false;
    } else {
      sync.start();
      syncActive = true;
      peers = [];
    }
  }

  function syncNow() {
    const now = Date.now();
    const gs = getGameState();
    const mem = getMemoryState();
    sync.syncState(gs, now);
    localStateSeq = (sync as any).seq;
    sync.syncMemory(mem, now);
    localMemorySeq = (sync as any).seq;
    const rawGoals = JSON.parse(localStorage.getItem('agenmonster_goals') || '[]');
    const goalsEnvelope = encodeGoalsToCRDT(rawGoals);
    localGoalsEnvelope = goalsEnvelope;
    sync.syncGoals(goalsEnvelope, now);
    localGoalsSeq = (sync as any).seq;
    lastSyncTime = new Date(now).toLocaleTimeString();
  }

  async function exportBackup() {
    status = 'loading';
    message = 'Exporting backup...';
    try {
      if (isTauri()) {
        const result = await tauriExportBackup();
        const parsed = JSON.parse(result);
        if (parsed.status === 'ok') {
          lastBackupPath = parsed.path || '';
          status = 'ok';
          message = `Backup exported to ${parsed.path}`;
        } else {
          status = 'error';
          message = parsed.error || 'Export failed';
        }
      } else {
        const gs = getGameState();
        const mem = getMemoryState();
        const backup = {
          version: 2,
          exportedAt: new Date().toISOString(),
          state: gs,
          memory: mem,
          goals: JSON.parse(localStorage.getItem('agenmonster_goals') || '[]'),
          evolution: JSON.parse(localStorage.getItem('agenmonster_evolution') || '{}'),
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agenmonster-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        status = 'ok';
        message = 'Backup downloaded';
      }
    } catch (e) {
      status = 'error';
      message = String(e);
    }
  }

  async function importBackup() {
    status = 'loading';
    message = 'Select backup file to import...';
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { status = 'idle'; message = ''; return; }
        const raw = await file.text();
        const backup = JSON.parse(raw);
        if (backup.state) {
          saveState(backup.state);
          window.dispatchEvent(new Event('gamestate-change'));
          message = 'State imported';
        }
        if (backup.memory) {
          const mem = importMemoryJSON(JSON.stringify(backup.memory));
          if (mem.ok) message += ' + memory';
        }
        if (backup.goals) {
          localStorage.setItem('agenmonster_goals', JSON.stringify(backup.goals));
          message += ' + goals';
        }
        status = 'ok';
        message = message.trim();
      };
      input.click();
    } catch (e) {
      status = 'error';
      message = String(e);
    }
  }
</script>

<div class="sync-panel">
  <div class="sync-header">
    <h2>CROSS-DEVICE SYNC</h2>
    <p class="sync-sub">Export / import your full AgenMonster state between devices.</p>
  </div>

  <div class="sync-cards">
    <div class="sync-card">
      <div class="card-icon">📤</div>
      <div class="card-body">
        <h3>Export Backup</h3>
        <p>Save state, memory, goals, and evolution to a portable JSON file.</p>
      </div>
      <button class="sync-btn export" onclick={exportBackup} disabled={status === 'loading'}>
        {status === 'loading' ? '...' : 'EXPORT'}
      </button>
    </div>

    <div class="sync-card">
      <div class="card-icon">📥</div>
      <div class="card-body">
        <h3>Import Backup</h3>
        <p>Restore from a backup file. Merges state, memory, goals, and evolution.</p>
      </div>
      <button class="sync-btn import" onclick={importBackup} disabled={status === 'loading'}>
        {status === 'loading' ? '...' : 'IMPORT'}
      </button>
    </div>
  </div>

  {#if message}
    <div class="sync-status" class:ok={status === 'ok'} class:error={status === 'error'}>
      {message}
    </div>
  {/if}

  <div class="p2p-section">
    <h3>LIVE CROSS-DEVICE SYNC</h3>
    <div class="p2p-controls">
      <button class="sync-btn p2p-toggle" onclick={toggleSync}>
        {syncActive ? 'STOP SYNC' : 'START SYNC'}
      </button>
      <button class="sync-btn p2p-sync" onclick={syncNow} disabled={!syncActive}>
        SYNC NOW
      </button>
    </div>
    <div class="p2p-info">
      <div class="info-row">
        <span>DEVICE ID</span>
        <code>{deviceId.slice(0, 8)}...</code>
      </div>
      {#if lastSyncTime}
        <div class="info-row">
          <span>LAST SYNC</span>
          <span>{lastSyncTime}</span>
        </div>
      {/if}
      {#if peers.length > 0}
        <div class="info-row">
          <span>PEERS</span>
          <span>{peers.length} device{peers.length !== 1 ? 's' : ''}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="sync-info">
    <h4>HOW IT WORKS</h4>
    <ul>
      <li>Export creates a single <code>.json</code> file with all your data.</li>
      <li>Copy the file to another device via USB, cloud, or any transfer method.</li>
      <li>Import merges the backup into the current state.</li>
      <li>In the desktop app, backups are saved to your app data folder.</li>
      <li>No internet required — fully offline operation.</li>
    </ul>
  </div>
</div>

<style>
  .sync-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    height: 100%;
    font-family: var(--font-body);
  }
  .sync-header h2 {
    font-family: var(--font-title);
    font-size: 14px;
    color: var(--gb-text);
    margin: 0;
  }
  .sync-sub {
    font-size: 11px;
    color: var(--gb-dark);
    margin: 4px 0 0;
  }
  .sync-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
  }
  .sync-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
    border-radius: 8px;
  }
  .card-icon { font-size: 28px; }
  .card-body h3 {
    font-size: 12px;
    color: var(--gb-text);
    margin: 0;
  }
  .card-body p {
    font-size: 10px;
    color: var(--gb-dark);
    margin: 4px 0 0;
    line-height: 1.4;
  }
  .sync-btn {
    padding: 8px 12px;
    border: 2px solid;
    border-radius: 6px;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    transition: all 0.15s ease;
  }
  .sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sync-btn.export {
    background: var(--accent-teal);
    color: var(--gb-bg);
    border-color: var(--accent-teal);
  }
  .sync-btn.export:hover:not(:disabled) { background: var(--gb-bg); color: var(--accent-teal); }
  .sync-btn.import {
    background: var(--gb-bg);
    color: var(--accent-teal);
    border-color: var(--accent-teal);
  }
  .sync-btn.import:hover:not(:disabled) { background: var(--accent-teal); color: var(--gb-bg); }
  .sync-status {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 11px;
    border: 2px solid;
  }
  .sync-status.ok {
    background: #e8f5e9;
    border-color: #50b8a0;
    color: #1b5e20;
  }
  .sync-status.error {
    background: #fce4ec;
    border-color: #e8607c;
    color: #b71c1c;
  }
  .sync-info {
    padding: 10px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
    border-radius: 8px;
  }
  .sync-info h4 {
    font-size: 10px;
    color: var(--gb-dark);
    margin: 0 0 6px;
    text-transform: uppercase;
  }
  .sync-info ul {
    margin: 0;
    padding-left: 16px;
    font-size: 10px;
    color: var(--gb-text);
    line-height: 1.6;
  }
  .sync-info code {
    background: var(--gb-bg);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9px;
  }

  .p2p-section {
    margin-top: 8px;
    padding: 12px;
    background: var(--gb-panel);
    border: 2px solid var(--gb-border);
    border-radius: 8px;
  }
  .p2p-section h3 {
    font-size: 11px;
    color: var(--gb-text);
    margin: 0 0 10px;
    text-transform: uppercase;
    font-family: var(--font-title);
  }
  .p2p-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .sync-btn.p2p-toggle {
    background: var(--accent-purple);
    color: var(--gb-bg);
    border-color: var(--accent-purple);
    flex: 1;
  }
  .sync-btn.p2p-toggle:hover:not(:disabled) { background: var(--gb-bg); color: var(--accent-purple); }
  .sync-btn.p2p-sync {
    background: var(--accent-teal);
    color: var(--gb-bg);
    border-color: var(--accent-teal);
    flex: 1;
  }
  .sync-btn.p2p-sync:hover:not(:disabled) { background: var(--gb-bg); color: var(--accent-teal); }
  .p2p-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 10px;
    color: var(--gb-dark);
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .info-row code {
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--gb-dark);
    color: var(--gb-bg);
    padding: 2px 6px;
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    .sync-cards { grid-template-columns: 1fr; }
  }
</style>
