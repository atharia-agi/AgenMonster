<script lang="ts">
  import { getGameState, dispatchEvent, feedPet, playWithPet, talkToPet, type GameState } from '$lib/gameState';
  import MonsterHeader from '$lib/panels/MonsterHeader.svelte';
  import ChatPanel from '$lib/panels/ChatPanel.svelte';
  import SidebarPanel from '$lib/panels/SidebarPanel.svelte';
  import BottomStatusBar from '$lib/panels/BottomStatusBar.svelte';
  import MonsterStatus from '$lib/panels/MonsterStatus.svelte';
  import NeedsPanel from '$lib/panels/NeedsPanel.svelte';
  import ActiveSkills from '$lib/panels/ActiveSkills.svelte';
  import TodaysMissions from '$lib/panels/TodaysMissions.svelte';
  import MemoryCrystals from '$lib/panels/MemoryCrystals.svelte';
  import FriendshipLevel from '$lib/panels/FriendshipLevel.svelte';
  import FloatingFeedback from '$lib/panels/FloatingFeedback.svelte';
  import MonsterRoom from '$lib/panels/MonsterRoom.svelte';
  import TopNav from '$lib/panels/TopNav.svelte';
  import SettingsPanel from '$lib/panels/SettingsPanel.svelte';
  import ActiveTasks from '$lib/panels/ActiveTasks.svelte';
  import Toast from '$lib/panels/Toast.svelte';
  import WelcomeTab from '$lib/panels/WelcomeTab.svelte';
  import Achievements from '$lib/panels/Achievements.svelte';
  import LevelUpModal from '$lib/panels/LevelUpModal.svelte';
  import Diagnostics from '$lib/panels/Diagnostics.svelte';
  import { useDailyLife } from '$lib/dailyLifeEngine';
  import { startProactivityTimer } from '$lib/proactivity';
  import { rememberEvent, getTopTopics } from '$lib/memory';
  import { soundPlayer } from '$lib/audio';
  import { setupShortcuts } from '$lib/shortcuts';
  import { downloadState, pickAndImportState } from '$lib/persistence';
  import { APP_VERSION } from '$lib/version';
  import { exportMemoryJSON } from '$lib/memory';
  import { deriveForm, type PetForm } from '$lib/petForm';

  let gs = $state<GameState>(getGameState());
  let petForm = $state<PetForm | null>(null);
  $effect(() => {
    const moodVal = gs.needs?.mood ?? 50;
    const energyVal = gs.needs?.energy ?? 50;
    const focusVal = gs.needs?.focus ?? 50;
    const pleasure = Math.max(0, Math.min(1, 0.5 + moodVal / 100 * 0.5));
    const activation = Math.max(0, Math.min(1, energyVal / 100 * 0.6 + focusVal / 100 * 0.4));
    const dominance = 0.5;
    const lessonDepth = 0.3;
    const mastery = gs.skills?.length ? Math.max(...gs.skills.map(s => s.level)) / 100 : 0;
    const energy = energyVal / 100;
    const levelKey = typeof gs.relationshipLevel === 'number' ? ['stranger','friend','buddy','best_friend','soul_companion'][Math.min(4, Math.max(0, gs.relationshipLevel))] : String(gs.relationshipLevel);
    const closeness = levelKey === 'soul_companion' ? 1 : levelKey === 'best_friend' ? 0.8 : levelKey === 'buddy' ? 0.6 : levelKey === 'friend' ? 0.4 : 0.2;
    petForm = deriveForm({
      stage: gs.stage || 'egg',
      pleasure, activation, dominance, lessonDepth, mastery, energy, closeness
    });
  });
  let leftOpen = $state(true);
  let rightOpen = $state(true);
  // Persist the active tab so a reload returns to where the user left off.
  // The welcome/onboarding tab only shows until the user first leaves it.
  function loadActiveTab(): string {
    try {
      if (!window.localStorage.getItem('agenmonster_welcomed')) return 'welcome';
      const t = window.localStorage.getItem('agenmonster_active_tab');
      if (t) return t;
    } catch {}
    return 'workspace';
  }
  let activeTab = $state(loadActiveTab());
  let floatingItems = $state<Array<{ id: string; text: string; x: number; y: number; color?: string }>>([]);
  let toasts = $state<Array<{ id: string; title: string; message: string; color?: string }>>([]);
  let levelUpOpen = $state(false);
  let clock = $state('');
  let streamInfo = $state<{ streaming: boolean; route: string; ms: number }>({ streaming: false, route: '', ms: 0 });
  let onOpenAbout = $state<() => void>(() => { activeTab = 'settings'; });

  // Track timeouts for safe cleanup on unmount
  const floatTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function setupIdleTimer(_el: HTMLElement) {
    const interval = setInterval(() => {
      gs = dispatchEvent({ type: 'idle' });
    }, 30000);
    return { destroy() { clearInterval(interval); } };
  }

  function setupProactivity(_el: HTMLElement) {
    return startProactivityTimer({
      getPet: () => ({
        energy: gs.needs.energy / 100,
        lastInteractionTs: Date.now(),
        mood: gs.mood,
      }),
      getTopics: () => getTopTopics(10).map(t => t.topic),
      sendMessage: (message) => {
        window.dispatchEvent(new CustomEvent('pet-initiate', { detail: { message } }));
      },
      recordEvent: () => {
        rememberEvent({ kind: 'success', title: 'pet-initiated', detail: '', tags: ['pet'], confidence: 1 });
      },
    });
  }

  function showFloat(text: string, e: MouseEvent, color?: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const item = { id: crypto.randomUUID(), text, x: rect.left + rect.width / 2 - 20, y: rect.top - 10, color };
    floatingItems = [...floatingItems, item];
    // Track the timer so it can be cleared on unmount
    const t = setTimeout(() => {
      floatingItems = floatingItems.filter(i => i.id !== item.id);
      floatTimers.delete(item.id);
    }, 1200);
    floatTimers.set(item.id, t);
  }

  function dismissToast(id: string) {
    const t = toastTimers.get(id);
    if (t) {
      clearTimeout(t);
      toastTimers.delete(id);
    }
    toasts = toasts.filter(t => t.id !== id);
  }

  function pushToast(toast: { id: string; title: string; message: string; color?: string }) {
    toasts = [...toasts, toast];
    const t = setTimeout(() => {
      toasts = toasts.filter(x => x.id !== toast.id);
      toastTimers.delete(toast.id);
    }, 5000);
    toastTimers.set(toast.id, t);
  }
  window.addEventListener('agenmonster:toast', (e: any) => pushToast(e.detail));

  function handleChatSend(text: string) {
    gs = dispatchEvent({ type: 'chat', data: { text } });
    try { soundPlayer.play('chat'); } catch {}
  }

  function handleStreamState(s: { streaming: boolean; route: string; ms: number }) {
    streamInfo = s;
  }

  function handleFeed(e: MouseEvent) {
    feedPet(gs);
    gs = getGameState();
    showFloat('+20 Hunger  +3 XP', e, '#cc8844');
    try { soundPlayer.play('happy'); } catch {}
  }

  function handlePlay(e: MouseEvent) {
    playWithPet(gs);
    gs = getGameState();
    showFloat('+15 Affection  +3 XP', e, '#44aacc');
    try { soundPlayer.play('levelup'); } catch {}
  }

  function handleTalk(e: MouseEvent) {
    talkToPet(gs);
    gs = getGameState();
    showFloat('+10 Affection  +2 XP', e, '#aa66cc');
    try { soundPlayer.play('chat'); } catch {}
  }

  $effect(() => {
    import('$lib/chatStatsStore.svelte').then(m => m.hydrateChatStats?.());
    import('$lib/tokenTracker').then(m => m.hydrateTokenState?.());
    import('$lib/memory').then(m => {
      const gs = getGameState();
      const key = 'agenmonster_recap_' + (gs._sessionStart || '');
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        const eps = m.recallTopEpisodes(3);
        if (eps.length) {
          pushToast({
            id: crypto.randomUUID(),
            title: '◆ Welcome Back',
            message: `Remembered ${eps.length}: ${eps[0].title}`,
            color: '#88ccf0',
          });
        }
      }
    });
  });

  $effect(() => {
    const onCrystal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      pushToast({
        id: crypto.randomUUID(),
        title: '◆ ' + detail.title,
        message: detail.description,
        color: detail.color,
      });
    };
    window.addEventListener('agenmonster:crystal-earned', onCrystal);
    return () => window.removeEventListener('agenmonster:crystal-earned', onCrystal);
  });

  // Final unmount cleanup: kill any lingering timer handles
  $effect(() => {
    return () => {
      for (const t of floatTimers.values()) clearTimeout(t);
      floatTimers.clear();
      for (const t of toastTimers.values()) clearTimeout(t);
      toastTimers.clear();
    };
  });

  $effect(() => {
    function updateClock() {
      const now = new Date();
      clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  });

  // ENHANCED: clear _pendingSpeech once the pet has consumed it via the prop
  $effect(() => {
    const pending = gs._pendingSpeech;
    if (!pending) return;
    const t = setTimeout(() => {
      const s = getGameState();
      // Only clear if no new pending speech arrived in the meantime
      if (s._pendingSpeech === pending) {
        s._pendingSpeech = undefined;
        window.dispatchEvent(new Event('gamestate-change'));
      }
    }, 7000);
    return () => clearTimeout(t);
  });

  // ENHANCED: detect stage transitions and fire level-up modal
  let lastStage = $state<string>('');
  $effect(() => {
    if (gs.stage !== lastStage && lastStage !== '') {
      levelUpOpen = true;
      try { soundPlayer.play('evolve'); } catch {}
    }
    lastStage = gs.stage;
  });

  // Keyboard shortcuts: export/import, tab switching, focus chat, escape.
  $effect(() => {
    return setupShortcuts({
      focusChat: () => {
        const ta = document.querySelector('textarea');
        if (ta) (ta as HTMLTextAreaElement).focus();
      },
      exportState: () => downloadState(),
      importState: () =>
        pickAndImportState((ok) => {
          if (ok) {
            pushToast({
              id: crypto.randomUUID(),
              title: '◆ State Imported',
              message: 'Loaded saved progress',
              color: '#90c878',
            });
          } else {
            pushToast({
              id: crypto.randomUUID(),
              title: '◆ Import Failed',
              message: 'Invalid state file',
              color: '#e85050',
            });
          }
        }),
      setTab: (tab) => {
        activeTab = tab;
      },
      escape: () => {
        if (levelUpOpen) {
          levelUpOpen = false;
        } else {
          (document.activeElement as HTMLElement | null)?.blur?.();
        }
      },
    });
  });

  $effect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'agenmonster_state' && ev.newValue) {
        gs = JSON.parse(ev.newValue) as GameState;
      }
    };
    const onGameStateChange = () => {
      gs = getGameState();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('gamestate-change', onGameStateChange);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      window.removeEventListener('storage', onStorage);
       window.removeEventListener('gamestate-change', onGameStateChange);
    };
   });

  // Backup automation — export memory to localStorage daily. Track last backup date
  // to avoid missing backups if app is closed at midnight.
  $effect(() => {
      const lastBackupKey = 'agenmonster_lastBackupDate';
      const runBackup = () => {
        try {
          const payload = exportMemoryJSON(true);
          localStorage.setItem('agenmonster_backup', payload);
          localStorage.setItem(lastBackupKey, new Date().toDateString());
        } catch {}
      };
      const checkBackup = () => {
        const lastBackup = localStorage.getItem(lastBackupKey);
        const today = new Date().toDateString();
        if (lastBackup !== today) runBackup();
      };
      // Run immediately on app start if we haven't backed up today
      checkBackup();
      // Then check hourly for subsequent backups
      const interval = setInterval(checkBackup, 60 * 60 * 1000);
      return () => clearInterval(interval);
  });

  // Self-adaptation loop - trigger adapt every 10 interactions
  $effect(() => {
    let lastTrigger = 0;
    const adapt = () => {
      if (window.__AM_ADAPT) {
        window.__AM_ADAPT();
      }
      try { localStorage.setItem('agenmonster_adaptation', JSON.stringify(gs.adaptationWeights)); } catch {}
    };
    const onChat = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const signals = [
        { type: detail.success ? 'goal_complete' : 'goal_fail', timestamp: Date.now(), detail: detail.text?.slice(0, 50) || 'chat', value: detail.success ? 1 : -0.3 }
      ];
      for (const sig of signals) {
        window.__AM_INTERACT?.(sig, detail.success ? 0.8 : -0.2);
      }
      if (gs.totalInteractions - lastTrigger >= 10) {
        adapt();
        lastTrigger = gs.totalInteractions;
      }
    };
    window.addEventListener('agenmonster:chat', onChat as EventListener);
    return () => window.removeEventListener('agenmonster:chat', onChat as EventListener);
  });

  let autonomousActive = $state(false);
  let autonomousTurnCount = $state(0);
  let deepActive = $state(false);
  let deepTurnCount = $state(0);
  let deepStartTime = $state(0);
  let deepNow = $state(0);
  let deepSkills = $state(0);
  let deepErrors = $state(0);

  function formatRuntime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  async function startAutonomous() {
    autonomousActive = true;
    autonomousTurnCount = 0;
  }
  function stopAutonomous() {
    autonomousActive = false;
  }
  async function startDeepRecursive() {
    deepActive = true;
    deepStartTime = Date.now();
    deepTurnCount = 0;
    deepSkills = 0;
    deepErrors = 0;
    deepNow = 0;
  }
  function stopDeepRecursive() {
    deepActive = false;
  }
</script>

<div class="app-shell" use:setupIdleTimer use:setupProactivity use:useDailyLife>
  <TopNav bind:activeTab version={APP_VERSION} {clock} date={new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} />
  <FloatingFeedback items={floatingItems} />
  <Toast bind:toasts />
  <LevelUpModal
    open={levelUpOpen}
    stage={gs.stage}
    level={gs.level}
    xpToNext={gs.xpToNext}
    onComplete={() => { levelUpOpen = false; window.dispatchEvent(new Event('gamestate-change')); }}
  />

  <div class="layout">
    <aside class="sidebar left" class:collapsed={!leftOpen}>
      <button class="sidebar-toggle-btn" aria-label="Toggle left sidebar" onclick={() => leftOpen = !leftOpen}>
        <svg width="10" height="10" viewBox="0 0 10 10" class:flipped={!leftOpen}><path d="M3 1l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    {#if leftOpen}
      <div class="sidebar-scroll">
      <SidebarPanel title="Status" icon="⬡" open={true}>
        <MonsterStatus
          state={gs}
          goals={gs.goals ?? []}
          onFeed={handleFeed}
          onPlay={handlePlay}
          onTalk={handleTalk}
          streaming={streamInfo.streaming}
          onGoalClick={() => {}}
        />
      </SidebarPanel>
          <SidebarPanel title="Needs" icon="◈" open={true}>
            <NeedsPanel needs={gs.needs} />
          </SidebarPanel>
          {#if gs.missions.length > 0}
            <SidebarPanel title="Missions" icon="◇">
              <TodaysMissions missions={gs.missions} completed={gs.completedMissions} total={gs.missions.length} />
            </SidebarPanel>
          {/if}
        </div>
      {/if}
    </aside>

    <main class="center" aria-label="AgenMonster main content">
  <h1 class="sr-only">AgenMonster</h1>
      <MonsterHeader
        stage={gs.stage}
        mood={gs.mood}
        activity={gs.activity}
        level={gs.level}
        xp={gs.xp}
        xpToNext={gs.xpToNext}
      />
      {#if activeTab === 'workspace'}
        <ChatPanel
          stage={gs.stage}
          mood={gs.mood}
          onMessageSent={handleChatSend}
          onStreamState={handleStreamState}
        />
      {:else if activeTab === 'skills'}
        <div class="tab-content">
          <ActiveSkills skills={gs.skills} />
        </div>
      {:else if activeTab === 'missions'}
        <div class="tab-content">
          <TodaysMissions missions={gs.missions} completed={gs.completedMissions} total={gs.missions.length} />
        </div>
      {:else if activeTab === 'memory'}
        <div class="tab-content">
          <MemoryCrystals crystals={gs.crystals} max={gs.maxCrystals} />
        </div>
      {:else if activeTab === 'inventory'}
        <div class="tab-content">
          <ActiveTasks tasks={gs.activeTasks} />
          <div class="inventory-extra">
            <div class="panel-title">CRYSTALS</div>
            <MemoryCrystals crystals={gs.crystals} max={gs.maxCrystals} />
          </div>
        </div>
      {:else if activeTab === 'settings'}
        <div class="tab-content">
          <SettingsPanel state={gs} onClose={() => activeTab = 'workspace'} {onOpenAbout} />
        </div>
      {:else if activeTab === 'achievements'}
        <div class="tab-content">
          <Achievements crystals={gs.crystals} max={gs.maxCrystals} />
        </div>
      {:else if activeTab === 'diagnostics'}
        <div class="tab-content">
          <Diagnostics />
        </div>
      {:else if activeTab === 'welcome'}
        <div class="tab-content">
          <WelcomeTab onDismiss={() => activeTab = 'workspace'} form={petForm} />
        </div>
{:else}
        <div class="tab-content empty-tab">
          <div class="empty-state">
            <span class="ico ico-lg ico-mood-neutral" style="color:#666"></span>
            <span>Panel under construction</span>
          </div>
        </div>
      {/if}
    </main>

    <aside class="sidebar right" class:collapsed={!rightOpen}>
      <button class="sidebar-toggle-btn right-toggle" aria-label="Toggle right sidebar" onclick={() => rightOpen = !rightOpen}>
        <svg width="10" height="10" viewBox="0 0 10 10" class:flipped={rightOpen}><path d="M3 1l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      {#if rightOpen}
        <div class="sidebar-scroll">
          <SidebarPanel title="Pet" icon="★" open={true}>
            <MonsterRoom stage={gs.stage} mood={gs.mood} level={gs.level} name={gs.name} externalSpeech={gs._pendingSpeech ?? ''} form={petForm} />
          </SidebarPanel>
          <SidebarPanel title="Skills" icon="▲" open={true}>
            <ActiveSkills skills={gs.skills} />
          </SidebarPanel>
          {#if gs.crystals.length > 0}
            <SidebarPanel title="Crystals" icon="◈">
              <MemoryCrystals crystals={gs.crystals} max={gs.maxCrystals} />
            </SidebarPanel>
          {/if}
          <SidebarPanel title="Bond" icon="♡">
            <FriendshipLevel level={gs.relationshipLevel} xp={gs.relationshipXp} xpToNext={gs.relationshipXpToNext} />
          </SidebarPanel>
        </div>
      {/if}
    </aside>
  </div>

  <BottomStatusBar
    tasks={gs.activeTasks}
    tools={gs.tools}
    mood={gs.mood}
    stage={gs.stage}
    level={gs.level}
    consoleLog={gs.chatMessages.slice(-5)}
    streaming={streamInfo.streaming}
    streamRoute={streamInfo.route}
  />
</div>

<style>
  .app-shell {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-base);
    overflow: hidden;
    font-family: var(--font-body);
    }

  .layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
    border-top: 1px solid var(--border-default);
    border-bottom: 1px solid var(--border-default);
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    background: var(--bg-surface);
    transition: width 0.15s ease-in-out;
  }
  .sidebar.right {
    width: 200px;
    border-left: 1px solid var(--border-default);
  }
  .sidebar.collapsed {
    width: 0;
    border: none;
  }
  .sidebar.collapsed .sidebar-toggle-btn {
    position: absolute;
    left: 100%;
    top: 0;
    width: 16px;
    height: auto;
    min-height: 24px;
  }

  .sidebar-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 4px 0;
    background: var(--bg-base);
    border: none;
    border-bottom: 3px solid var(--border-default);
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
    z-index: 10;
    position: relative;
  }
  .sidebar-toggle-btn:hover { background: var(--border-default); color: var(--bg-base); }
  .sidebar-toggle-btn svg {
    transition: transform 0.1s ease-in-out;
  }
  .sidebar-toggle-btn svg.flipped {
    transform: rotate(180deg);
  }
  .right-toggle {
    border-bottom: none;
    border-top: 1px solid var(--border-default);
  }

  .sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px;
    min-height: 0;
  }
  .sidebar-scroll::-webkit-scrollbar { width: 6px; }
  .sidebar-scroll::-webkit-scrollbar-track { background: var(--bg-surface); }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: var(--text-muted); border: 1px solid var(--border-default); }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tab-content::-webkit-scrollbar { width: 8px; }
  .tab-content::-webkit-scrollbar-track { background: var(--bg-surface); border: 2px solid var(--border-default); }
  .tab-content::-webkit-scrollbar-thumb { background: var(--border-default); }

  .empty-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    color: var(--text-muted);
    font-size: 10px;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px;
    border: 1px dashed var(--text-muted);
    color: var(--text-muted);
    background: var(--bg-base);
    max-width: 360px;
    text-align: center;
  }

  .inventory-extra {
    margin-top: 8px;
    padding: 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

