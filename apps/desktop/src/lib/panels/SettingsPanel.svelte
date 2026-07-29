<script lang="ts">
import type { GameState } from "$lib/gameState";
import { getEvolutionProgress, selectBestPrompt, evolve } from "$lib/evolution";
import { getAdaptationReport } from "$lib/gameState";

let { state: petState, onClose, onOpenAbout }: { state: GameState; onClose: () => void; onOpenAbout: () => void } = $props();

let showResetConfirm = $state(false);
let resetText = $state("");
let resetCosmeticsClicked = $state(false);
let resetAuth = $state(false);
let resetMaster = $state(false);
let resetEvolutionClicked = $state(false);
let resetEvolution = $state(false);

let gameState = $derived(petState);

const SECTIONS = [
  { id: "cosmetics", label: "COSMETICS", icon: "🎨" },
  { id: "data", label: "DATA & PERSISTENCE", icon: "💾" },
  { id: "companion", label: "COMPANION", icon: "🧬" },
  { id: "ai", label: "AI & TOOLS", icon: "🤖" },
  { id: "cost", label: "COST GUARD", icon: "🛡️" },
  { id: "memory", label: "MEMORY", icon: "🧠" },
  { id: "goals", label: "GOALS", icon: "🎯" },
  { id: "interface", label: "INTERFACE", icon: "🎛️" },
  { id: "privacy", label: "PRIVACY & SECURITY", icon: "🔒" },
  { id: "system", label: "SYSTEM", icon: "⚙️" },
  { id: "analytics", label: "ANALYTICS", icon: "📊" },
  { id: "evolution", label: "SELF-EVOLUTION", icon: "🧬" },
  { id: "about", label: "ABOUT", icon: "ℹ️" },
] as const;

let activeSection = $state<string>("companion");

type Toggle = Record<string, boolean>;
let toggles = $state<Toggle>({
  audioEnabled: true,
  hapticEnabled: false,
  ritualSound: true,
  idleAnimation: true,
  costToasts: true,
  costGuardEnabled: true,
  memoryIndexEnabled: true,
  memoryPurgeOnFail: false,
  goalsAutoSave: true,
  goalsStreak: true,
  morningWakeup: false,
  dailyRecap: false,
  dailyCompanionEngagement: true,
  slashCommands: true,
  threadAutoTitle: true,
  presenceIndicator: true,
  selfAdaptEnabled: true,
  autoEvolution: true,
  backupEnabled: true,
});

const aboutRows = [
  { label: "AgenMonster", accent: true },
  { label: "Version: __desktop", accent: false },
  { label: "Arch: Tauri 2 + Svelte 5 + Rust Core", accent: false },
  { label: "Tests: 427 passing", accent: false },
  { label: "MCP: 19 tools", accent: false },
  { label: "Transport: stdio JSON", accent: false },
  { label: "DAILY COMPANION: 5 levels", accent: false },
  { label: "ENGINE: Self-Adaptive + Evolving", accent: true },
  { label: "Self-Adapt: bandit + Bayesian", accent: false },
  { label: "Self-Evolve: prompt + routine GA", accent: false },
  { label: "Native persistence: %APPDATA%/agenmonster/", accent: false },
  { label: "Global shortcut: Ctrl+Shift+A", accent: false },
  { label: "EXPORT · JSON & MARKDOWN", accent: false },
];

function toggle(key: string): void {
  toggles[key] = !toggles[key];
}

function handleBackupExport(): void {
  try {
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      threads: JSON.parse(localStorage.getItem("agenmonster_threads") || "[]"),
      memory: JSON.parse(localStorage.getItem("agenmonster_memory") || "{}"),
      goals: JSON.parse(localStorage.getItem("agenmonster_goals") || "[]"),
      evolution: JSON.parse(localStorage.getItem("agenmonster_evolution") || "{}"),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenmonster-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // silent
  }
}

function triggerEvolution(): void {
  if (!gameState) return;
  const feedbackScores = gameState.feedbackLog.slice(-10).map((f: { score: number }) => f.score);
  const routineScores = gameState.activeRoutines.map((r: { fitness: number }) => r.fitness);
  const result = evolve(gameState.evolution, feedbackScores, routineScores);
}

function getEvolutionStats() {
  if (!gameState) return null;
  return getEvolutionProgress(gameState.evolution);
}

function getAdaptStats() {
  if (!gameState) return null;
  return getAdaptationReport(gameState);
}
</script>

<div class="panel">
  <header class="panel-header">
    <h2 class="panel-title">Settings</h2>
    <button class="button-ghost close" onclick={onClose} aria-label="Close settings">✕</button>
  </header>

  <nav class="tabs" aria-label="Settings sections">
    {#each SECTIONS as section (section.id)}
      <button
        class="tab"
        class:active={activeSection === section.id}
        onclick={() => (activeSection = section.id)}
      >
        <span class="tab-icon">{section.icon}</span>
        <span class="tab-label">{section.label}</span>
      </button>
    {/each}
  </nav>

  <div class="body">
    {#if activeSection === "companion"}
      <section class="section">
        <h3 class="section-title">🧬 Companion Personality</h3>
        <div class="row">
          <div>
            <div class="label">Proactivity</div>
            <div class="hint">How often it speaks unprompted</div>
          </div>
          <div class="control">
            <input type="range" min="0" max="100" value={Math.round((gameState?.proactivity ?? 0.5) * 100)} />
            <span class="muted">{Math.round((gameState?.proactivity ?? 0.5) * 100)}%</span>
          </div>
        </div>
        <div class="row">
          <div>
            <div class="label">System Prompt</div>
            <div class="hint">Active companion behavior</div>
          </div>
          <div class="control">
            <span class="pill">{gameState?.selectedPromptVariant || "casual"}</span>
          </div>
        </div>
        <button class="button-secondary" onclick={triggerEvolution}>🧬 Trigger Evolution Now</button>
      </section>
    {/if}

    {#if activeSection === "evolution"}
      <section class="section">
        <h3 class="section-title">🧬 Self-Evolution Engine</h3>
        <div class="status-row">
          <span class="label">Auto-Evolution</span>
          <label class="toggle">
            <input type="checkbox" checked={toggles.autoEvolution} onclick={() => toggle("autoEvolution")} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="status-row">
          <span class="label">Self-Adaptation (Bandit + Bayesian)</span>
          <label class="toggle">
            <input type="checkbox" checked={toggles.selfAdaptEnabled} onclick={() => toggle("selfAdaptEnabled")} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="info-block">
          {#if gameState}
            {@const stats = getEvolutionStats()}
            {@const adapt = getAdaptStats()}
            <div class="row"><span class="label">Generation</span><span class="mono">{stats?.generation ?? "—"}</span></div>
            <div class="row"><span class="label">Total Mutations</span><span class="mono">{stats?.mutations ?? 0}</span></div>
            <div class="row"><span class="label">Best Fitness</span><span class="mono">{(stats?.bestFitness ?? 0).toFixed(3)}</span></div>
            <div class="row"><span class="label">Prompt Variants</span><span class="mono">{stats?.promptVariants ?? 0}</span></div>
            <div class="row"><span class="label">Routines Evolving</span><span class="mono">{stats?.routines ?? 0}</span></div>
            <div class="row"><span class="label">Active Prompt</span><span class="mono">{gameState.selectedPromptVariant}</span></div>
            <div class="row"><span class="label">Total Interactions</span><span class="mono">{adapt?.totalInteractions ?? 0}</span></div>
            <div class="row"><span class="label">Last Evolution</span><span class="mono">{new Date(gameState.evolution.lastEvolutionTs).toLocaleString()}</span></div>
          {:else}
            <div class="muted">Start a conversation to see evolution stats.</div>
          {/if}
        </div>
      </section>
    {/if}

    {#if activeSection === "analytics"}
      <section class="section">
        <h3 class="section-title">📊 Analytics</h3>
        {#if gameState}
          <div class="row"><span class="label">Days Active</span><span class="mono">{gameState._moodHistory.length}</span></div>
          <div class="row"><span class="label">Total Messages</span><span class="mono">{gameState.totalInteractions}</span></div>
          <div class="row"><span class="label">Goals Completed</span><span class="mono">{gameState.goals.filter((g: any) => g.completed).length}</span></div>
          <div class="row"><span class="label">Relationship</span><span class="mono">LVL {gameState.relationshipLevel}</span></div>
          <div class="row"><span class="label">Stage</span><span class="mono">{gameState.currentStage}</span></div>
          <div class="row"><span class="label">Total XP</span><span class="mono">{gameState._accumulatedXP}</span></div>
        {:else}
          <div class="muted">No analytics yet.</div>
        {/if}
      </section>
    {/if}

    {#if activeSection === "cosmetics"}
      <section class="section">
        <h3 class="section-title">🎨 Cosmetics</h3>
        <div class="row">
          <span class="label">Theme</span>
          <div class="control">
            <select><option>Cyber Dark</option><option>Dawn</option><option>Neon</option></select>
          </div>
        </div>
        <div class="row">
          <span class="label">Audio</span>
          <label class="toggle"><input type="checkbox" checked={toggles.audioEnabled} onclick={() => toggle("audioEnabled")} /><span class="slider"></span></label>
        </div>
        <div class="row">
          <span class="label">Ritual Sound</span>
          <label class="toggle"><input type="checkbox" checked={toggles.ritualSound} onclick={() => toggle("ritualSound")} /><span class="slider"></span></label>
        </div>
      </section>
    {/if}

    {#if activeSection === "data"}
      <section class="section">
        <h3 class="section-title">💾 Data & Persistence</h3>
        <div class="row">
          <span class="label">Backup Enabled</span>
          <label class="toggle"><input type="checkbox" checked={toggles.backupEnabled} onclick={() => toggle("backupEnabled")} /><span class="slider"></span></label>
        </div>
        <button class="button-primary" onclick={handleBackupExport}>📥 Export Backup Now</button>
        {#if showResetConfirm}
          <div class="confirm-box">
            <p class="muted">Type <b>COSMETICS</b> to confirm reset.</p>
            <input class="input" bind:value={resetText} placeholder="COSMETICS" />
            <div class="row-buttons">
              <button class="button-danger" onclick={() => { resetCosmeticsClicked = true; }} disabled={resetCosmeticsClicked}>Reset</button>
              <button class="button-ghost" onclick={() => { showResetConfirm = false; resetText = ""; }}>Cancel</button>
            </div>
          </div>
        {:else}
          <button class="button-danger" onclick={() => { showResetConfirm = true; }}>⚠ Reset Cosmetics</button>
        {/if}
      </section>
    {/if}

    {#if activeSection === "about"}
      <section class="section">
        <h3 class="section-title">ℹ️ About</h3>
        {#each aboutRows as row (row.label)}
          <div class="about-row" class:accent={row.accent}>{row.label}</div>
        {/each}
        <div class="muted" style="margin-top:10px">Native desktop companion — Tauri 2 + Rust core</div>
      </section>
    {/if}
  </div>
</div>

<style>
  .panel {
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 14px;
    max-width: 860px;
    width: 100%;
    color: #e2e8f0;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .panel-title {
    font-size: 0.9rem;
    margin: 0;
    color: #e2e8f0;
  }
  .close {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.95);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.65rem;
    transition: all 200ms ease;
  }
  .tab.active {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
    border-color: rgba(56, 189, 248, 0.4);
    color: #e2e8f0;
  }
  .tab-icon { font-size: 1rem; line-height: 1; }
  .tab-label { letter-spacing: 0.05em; }
  .body {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 10px;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .label { color: #e2e8f0; font-size: 0.72rem; }
  .hint { font-size: 0.65rem; color: #94a3b8; }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: #38bdf8;
    font-size: 0.75rem;
  }
  .muted { color: #64748b; font-size: 0.75rem; }
  .control { display: flex; align-items: center; gap: 8px; }
  input[type="range"] { width: 140px; accent-color: #38bdf8; }
  .info-block {
    background: rgba(255, 255, 255, 0.03);
    padding: 10px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .about-row {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.72rem;
    color: #64748b;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .about-row.accent { color: #38bdf8; font-weight: 700; }
  .pill {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.7rem;
    background: linear-gradient(180deg, #38bdf8, #2563eb);
    color: white;
    padding: 4px 10px;
    border-radius: 999px;
    font-weight: 700;
  }
  .toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }
  .toggle input { opacity: 0; }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #334155;
    border-radius: 999px;
    transition: 300ms;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 300ms;
  }
  input:checked + .slider { background: linear-gradient(180deg, #38bdf8, #2563eb); }
  input:checked + .slider:before { transform: translateX(18px); }
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
  }
  .button-primary {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    background: linear-gradient(180deg, #38bdf8, #2563eb);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.78rem;
    cursor: pointer;
  }
  .button-secondary {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    background: linear-gradient(180deg, #a78bfa, #7c3aed);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.78rem;
    margin-top: 8px;
    cursor: pointer;
  }
  .button-danger {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    background: linear-gradient(180deg, #ef4444, #b91c1c);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.78rem;
    cursor: pointer;
  }
  .button-ghost {
    padding: 8px 12px;
    border-radius: 10px;
    background: transparent;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
  }
  .confirm-box {
    margin-top: 8px;
    padding: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .input {
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 0.75rem;
    font-family: inherit;
  }
  .row-buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
