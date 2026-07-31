<script lang="ts">
import type { GameState } from "$lib/gameState";
import { getEvolutionProgress, selectBestPrompt, evolve } from "$lib/evolution";
import { getAdaptationReport } from "$lib/gameState";
import { loadTheme, saveTheme, applyTheme, describeTheme, type ThemeName } from "$lib/theme.ts";
import { loadConfig, saveConfig, type AppConfig } from "$lib/config";
import { loadLLMConfig, saveLLMConfig, getAvailableProviders, loadPersistedLLMChoice, type LLMConfig } from "$lib/llm";

let { state: petState, onClose, onOpenAbout }: { state: GameState; onClose: () => void; onOpenAbout: () => void } = $props();

let showResetConfirm = $state(false);
let resetText = $state("");
let resetCosmeticsClicked = $state(false);

let gameState = $derived(petState);

let readabilityMode = $state(localStorage.getItem("agenmonster_readability") === "1");
let currentTheme = $state<ThemeName>(loadTheme());
let useAutoDetect = $state(true);
let llmConfig = $state<LLMConfig>({ provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey: '' });
let savingLLM = $state(false);
let llmSaveError = $state('');

(function initLLMSettings(): void {
  const cfg = loadConfig();
  useAutoDetect = !cfg.llmApiKey;
  llmConfig = {
    provider: (cfg.llmProvider || 'groq') as LLMConfig['provider'],
    model: cfg.model || 'llama-3.3-70b-versatile',
    apiKey: cfg.llmApiKey || '',
  };
  const persisted = loadPersistedLLMChoice();
  if (persisted?.provider) llmConfig.provider = persisted.provider;
  if (persisted?.model) llmConfig.model = persisted.model;
})();

function saveLLMSettings(): void {
  llmSaveError = '';
  if (!useAutoDetect) {
    if (!llmConfig.apiKey.trim()) {
      llmSaveError = 'API key is required when not using auto-detect.';
      return;
    }
    if (!llmConfig.model.trim()) {
      llmSaveError = 'Model name is required when not using auto-detect.';
      return;
    }
  }
  const cfg = loadConfig();
  cfg.llmProvider = llmConfig.provider;
  cfg.model = llmConfig.model;
  cfg.llmApiKey = llmConfig.apiKey;
  saveConfig(cfg);
  saveLLMConfig(llmConfig);
  savingLLM = true;
  setTimeout(() => { savingLLM = false; }, 1500);
}

async function autoDetectProviders(): Promise<void> {
  try {
    const providers = await getAvailableProviders();
    if (providers.length > 0) {
      llmConfig.provider = providers[0].id;
      llmConfig.model = providers[0].models[0] || 'llama-3.3-70b-versatile';
    }
  } catch {
    // no provider endpoint reachable
  }
}

function setTheme(t: ThemeName): void {
  currentTheme = t;
  saveTheme(t);
  applyTheme(t);
}

function toggleReadability(): void {
  readabilityMode = !readabilityMode;
  localStorage.setItem("agenmonster_readability", readabilityMode ? "1" : "0");
  applyReadability();
}

function applyReadability(): void {
  document.documentElement.classList.toggle("readability-mode", readabilityMode);
}

$effect(() => {
  if (readabilityMode) applyReadability();
});

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
  { label: "Tests: 439 passing", accent: false },
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
          <div class="row"><span class="label">Goals Completed</span><span class="mono">{gameState.goals.filter((g) => g.doneAt).length}</span></div>
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
            <select bind:value={currentTheme} onchange={() => setTheme(currentTheme)}>
              <option value="gb">GB Default</option>
              <option value="gb-night">GB Night</option>
              <option value="gb-dawn">GB Dawn</option>
            </select>
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

    {#if activeSection === "interface"}
      <section class="section">
        <h3 class="section-title">🎛️ Interface</h3>
        <div class="status-row">
          <span class="label">Readability Mode</span>
          <label class="toggle"><input type="checkbox" checked={readabilityMode} onclick={toggleReadability} /><span class="slider"></span></label>
        </div>
        <div class="hint" style="margin-top:6px">Larger text, same pixel-art aesthetic. Saved per browser.</div>
      </section>
    {/if}

    {#if activeSection === "ai"}
      <section class="section">
        <h3 class="section-title">🤖 AI Configuration</h3>

        <div class="status-row">
          <span class="label">Auto-Detect Model</span>
          <label class="toggle">
            <input type="checkbox" checked={useAutoDetect} onclick={() => { useAutoDetect = !useAutoDetect; }} />
            <span class="slider"></span>
          </label>
        </div>

        {#if useAutoDetect}
          <div class="info-block">
            <div class="row"><span class="label">Mode</span><span class="mono">Auto</span></div>
            <div class="row"><span class="label">Provider</span><span class="mono">First available from server env</span></div>
            <button class="button-secondary" onclick={autoDetectProviders}>🔍 Detect Providers Now</button>
            <div class="muted" style="margin-top:4px">Keys read from server-side .env only. Browser never sees them.</div>
          </div>
        {:else}
          <div class="info-block">
            <div class="row"><span class="label">Provider</span>
              <select bind:value={llmConfig.provider}>
                <option value="groq">Groq</option>
                <option value="mistral">Mistral</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div class="row"><span class="label">Model</span>
              <input class="input" bind:value={llmConfig.model} placeholder="e.g. llama-3.3-70b-versatile" style="flex:1;min-width:0" />
            </div>
            <div class="row"><span class="label">API Key</span>
              <input class="input" bind:value={llmConfig.apiKey} type="password" placeholder="Paste key here" style="flex:1;min-width:0" />
            </div>
            {#if llmSaveError}
              <div class="muted" style="color:var(--gb-dark)">{llmSaveError}</div>
            {/if}
            <button class="button-primary" onclick={saveLLMSettings}>
              {savingLLM ? '✓ Saved' : '💾 Save LLM Config'}
            </button>
            <div class="muted" style="margin-top:4px">
              Key saved to localStorage for this session. Proxy routes server-side — key never leaves the server.
            </div>
          </div>
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
  :global(.settings-panel), .panel {
    background: var(--gb-panel);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 8px;
    max-width: 860px;
    width: 100%;
    color: var(--gb-text);
    font-family: var(--font-body);
    font-size: 10px;
    image-rendering: pixelated;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: var(--gb-stroke) solid var(--gb-border);
  }
  .panel-title {
    font-size: 10px;
    margin: 0;
    color: var(--gb-text);
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  .close {
    width: 24px;
    height: 24px;
    background: var(--gb-bg);
    color: var(--gb-dark);
    border: var(--gb-stroke) solid var(--gb-border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 9px;
  }
  .close:hover { background: var(--gb-border); color: var(--gb-bg); }
  .tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
    margin-bottom: 6px;
  }
  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 4px 2px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    font-size: 6px;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .tab.active {
    background: var(--gb-text);
    color: var(--gb-bg);
    border-color: var(--gb-text);
  }
  .tab:hover:not(.active) { background: var(--gb-dark); color: var(--gb-bg); }
  .tab-icon { font-size: 8px; line-height: 1; }
  .tab-label { letter-spacing: 0.3px; }
  .body {
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 6px;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .section-title {
    font-size: 8px;
    font-weight: bold;
    color: var(--gb-text);
    margin: 0;
    padding-bottom: 3px;
    border-bottom: 2px solid var(--gb-border);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  }
  .label { color: var(--gb-text); font-size: 8px; font-weight: bold; }
  .hint { font-size: 7px; color: var(--gb-dark); }
  .mono {
    font-family: var(--font-body);
    color: var(--gb-text);
    font-size: 8px;
    font-weight: bold;
  }
  .muted { color: var(--gb-dark); font-size: 8px; }
  .control { display: flex; align-items: center; gap: 6px; }
  input[type="range"] { width: 120px; accent-color: var(--gb-text); image-rendering: pixelated; }
  select {
    background: var(--gb-bg);
    color: var(--gb-text);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 3px 6px;
    font-family: var(--font-body);
    font-size: 8px;
    cursor: pointer;
    image-rendering: pixelated;
  }
  .info-block {
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .about-row {
    font-family: var(--font-body);
    font-size: 8px;
    color: var(--gb-dark);
    padding: 2px 4px;
    border-bottom: 1px dashed var(--gb-border);
  }
  .about-row.accent { color: var(--gb-text); font-weight: bold; }
  .pill {
    font-family: var(--font-body);
    font-size: 7px;
    background: var(--gb-text);
    color: var(--gb-bg);
    padding: 2px 6px;
    font-weight: bold;
    image-rendering: pixelated;
  }
  .toggle {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 16px;
    flex-shrink: 0;
  }
  .toggle input { opacity: 0; }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--gb-dark);
    border: 2px solid var(--gb-border);
    image-rendering: pixelated;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 10px;
    width: 10px;
    left: 2px;
    bottom: 2px;
    background: var(--gb-bg);
    border: 1px solid var(--gb-border);
    image-rendering: pixelated;
  }
  input:checked + .slider { background: var(--gb-text); }
  input:checked + .slider:before { transform: translateX(14px); }
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px dashed var(--gb-border);
  }
  .button-primary {
    width: 100%;
    padding: 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-text);
    color: var(--gb-text);
    font-size: 8px;
    font-weight: bold;
    font-family: var(--font-body);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .button-primary:hover { background: var(--gb-text); color: var(--gb-bg); }
  .button-secondary {
    width: 100%;
    padding: 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-text);
    font-size: 8px;
    font-weight: bold;
    font-family: var(--font-body);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .button-secondary:hover { background: var(--gb-border); color: var(--gb-bg); }
  .button-danger {
    width: 100%;
    padding: 6px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-dark);
    color: var(--gb-dark);
    font-size: 8px;
    font-weight: bold;
    font-family: var(--font-body);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .button-danger:hover { background: var(--gb-dark); color: var(--gb-bg); }
  .button-ghost {
    padding: 4px 8px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-dark);
    font-size: 8px;
    font-family: var(--font-body);
    cursor: pointer;
    image-rendering: pixelated;
  }
  .button-ghost:hover { background: var(--gb-border); color: var(--gb-bg); }
  .confirm-box {
    margin-top: 6px;
    padding: 6px;
    border: var(--gb-stroke) solid var(--gb-dark);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .input {
    padding: 4px;
    background: var(--gb-bg);
    border: var(--gb-stroke) solid var(--gb-border);
    color: var(--gb-text);
    font-size: 8px;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .row-buttons {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
</style>
