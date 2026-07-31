<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
  import ChatInput from './ChatInput.svelte';
  import { sendLLMStream, getAvailableProviders, saveLLMConfig, loadPersistedLLMChoice, type LLMConfig, type ProviderInfo } from '$lib/llm';
  import { routeMessage } from '$lib/router';
  import { getGameState, addAssistantMessage, saveState } from '$lib/gameState';
  import { soundPlayer } from '$lib/audio';
  import { getPersonalityForStage, getEvolvedPersonality, PERSONALITY_PROFILES } from '$lib/personality';
  import { emptyStats, recordCall, type ChatStatsState } from '$lib/chatStats';
  import { pushChatCall, msLabel } from '$lib/chatStatsStore.svelte';
  import { rememberEvent, recordTopic, getMemoriesForPrompt, getTopTopics, getPersona } from '$lib/memory';
  import { recordTokenUsage } from '$lib/tokenTracker';
  import { evaluateCostGuard, dispatchAgentTool, isTransientError, isAbortError } from '$lib/chatEngine.ts';
  import { installSessionEndHook } from '$lib/sessionEnd';
  import { evaluateReply } from '$lib/selfCorrect';
  import { getThreadState, switchThread, deleteThread, renameThread, createThread, ensureThreadState, appendToActive, THREAD_TITLE_MAX } from '$lib/threads';
  import { pickActiveGoal, buildGoalFromText, isGoalActive, detectCompletionFromReply, type Goal } from '$lib/goals';
  import { handleSlashCommand } from '$lib/commands/slashCommands.ts';
  import { onMount } from 'svelte';
  import { TOOLS } from '$lib/mcp';
  import { buildSystemPrompt, toPetMood, type SystemPromptContext } from '$lib/systemPrompt';
  import type { GameState, Mood, RelationshipLevel, Stage } from '$lib/gameState';

  let { stage = 'egg', mood = 'idle', onMessageSent = () => {}, onStreamState = (_s: { streaming: boolean; route: string; ms: number }) => {} } = $props<{
    stage?: string; mood?: string; onMessageSent?: (text: string) => void;
    onStreamState?: (s: { streaming: boolean; route: string; ms: number }) => void;
  }>();

  type ChatMsg = { id: string; role: string; content: string; timestamp: number; xpEarned?: number };

  function getSystemPrompt(userText: string): string {
    const gs = getGameState();
    const topics = getTopTopics(5);
    const evolved = getEvolvedPersonality(gs.stage, topics);
    const personality = evolved.shift ? PERSONALITY_PROFILES[evolved.shift] : evolved.base;
    const memoryLines = getMemoriesForPrompt(userText, 3);
    const goals = gs.goals ?? [];
    const activeGoal = pickActiveGoal(goals);
    const persona = getPersona();
    const personaBlock = persona
      ? `\nUser-authored persona override (this wins over personality defaults):\n${persona}\n`
      : '';

    const ctx: SystemPromptContext = {
      mood: toPetMood(gs.mood as Mood),
      energy: gs.needs.energy / 100,
      relationship: Math.min(1, gs.relationshipXp / Math.max(1, gs.relationshipXpToNext)),
      relationshipLevel: String(gs.relationshipLevel) as RelationshipLevel,
      stage: gs.stage as Stage,
    };

    const base = buildSystemPrompt(
      ctx,
      personality,
      activeGoal,
      memoryLines,
      evolved.shift ? { shift: evolved.shift, reason: evolved.reason } : null
    );

    return `${base}${personaBlock}

Speaking style:
- Match the ${personality.name} personality — vocabulary and tone should reflect it.
- Speech examples: ${personality.greetings[0]} / ${personality.idlePhrases[0]}
- Keep replies under 3 sentences unless asked.
- No disclaimers. No markdown unless asked.
- Refer to yourself in 1st person; refer to user as "you".

Tool use:
- When you need live data (memory, stats, budget, goals), emit a tool call at the END of your reply on its own line:
  __AGENT_MCP__:tool.name|{"param":"value"}
- Available tools: ${TOOLS.join(', ')}
- After the system runs the tool, the result is shown to you and the user. Never invent tool output.

You are genuinely a dynamic digital creature — your traits come through in every reply, not via quotes or stage directions.`;
  }

  let messages = $state<ChatMsg[]>([]);
  let loading = $state(false);
  let cancelledByUser = $state(false);
  let chatEl: HTMLDivElement;
  let lastUserMsgText = $state('');
  let threadState = $state(getThreadState());

  function syncThreadState() {
    threadState = getThreadState();
    const active = threadState.threads[threadState.activeId];
    messages = (active?.messages ?? []).map((m: any) => ({
      id: m.id || crypto.randomUUID(),
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || Date.now(),
      xpEarned: m.xpEarned,
    }));
  }

  function createNewThread() {
    const gs = getGameState();
    const ts = ensureThreadState(gs);
    const fresh = createThread('New thread');
    gs.chatThreads![fresh.id] = fresh;
    gs.chatActiveThreadId = fresh.id;
    gs.chatThreadOrder = [fresh.id, ...ts.order];
    syncThreadState();
    window.dispatchEvent(new Event('gamestate-change'));
  }

  function switchToThread(id: string) {
    const gs = getGameState();
    const ts = ensureThreadState(gs);
    const after = switchThread(ts, id);
    gs.chatThreads = after.threads;
    gs.chatActiveThreadId = after.activeId;
    gs.chatThreadOrder = after.order;
    syncThreadState();
    window.dispatchEvent(new Event('gamestate-change'));
  }
  let error = $state<string | null>(null);
  const persisted = loadPersistedLLMChoice();
  let llmConfig = $state<LLMConfig>({
    provider: (persisted?.provider as LLMConfig['provider']) || 'groq',
    model: persisted?.model || 'llama-3.3-70b-versatile',
    apiKey: '',
  });
  let providers = $state<ProviderInfo[]>([]);
  let pinnedProvider = $state<ProviderInfo | null>(null);
  let lastRoute = $state<string>('');
  let proxyReady = $state(false);
  const costWarnings: string[] = [];
  const sessionStartedAt = Date.now();
  let stats = $state<ChatStatsState>(emptyStats());
  let inFlightAbort: AbortController | null = null;

  async function initLLM() {
    providers = await getAvailableProviders();
    if (providers.length) {
      const p = providers[0];
      llmConfig = { provider: p.id, model: p.models[0], apiKey: '' };
    }
    proxyReady = true;
  }
  onMount(initLLM);

  let sessionHookDisposer: (() => void) | null = null;
  let petInitiateDisposer: (() => void) | null = null;
  onMount(() => {
    sessionHookDisposer = installSessionEndHook({
      snapshot: {
        topTopics: getTopTopics(5),
        recentMessages: messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-12)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content, timestamp: m.timestamp })),
        startedAt: sessionStartedAt,
        endedAt: Date.now(),
      },
      persist: (title, detail, tags) => {
        rememberEvent({ kind: 'milestone', title, detail, tags, confidence: 0.85 });
      },
    });
    return () => sessionHookDisposer?.();
  });

  onMount(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.message) return;
      const gs = getGameState();
      const ts = ensureThreadState(gs);
      const updated = appendToActive(ts, { id: crypto.randomUUID(), role: 'assistant', content: detail.message, timestamp: Date.now() });
      gs.chatThreads = updated.threads;
      gs.chatActiveThreadId = updated.activeId;
      gs.chatThreadOrder = updated.order;
      saveState(gs);
      window.dispatchEvent(new Event('gamestate-change'));
    };
    window.addEventListener('pet-initiate', handler);
    petInitiateDisposer = () => window.removeEventListener('pet-initiate', handler);
    return petInitiateDisposer;
  });

  const gameState = getGameState();
  function reloadMessages() {
    syncThreadState();
  }
  reloadMessages();

  function syncFromParent(el: HTMLElement) {
    const handler = () => reloadMessages();
    window.addEventListener('gamestate-change', handler);
    return { destroy() { window.removeEventListener('gamestate-change', handler); } };
  }

  function cancelInFlight() {
    if (inFlightAbort) {
      cancelledByUser = true;
      inFlightAbort.abort();
    }
  }

  async function handleSend(text: string) {
    if (!text.trim() || loading) return;

    // Goal-oriented auto-detect: if the user is issuing an imperative directive,
    // auto-create a goal in `state.goals`. Done silently unless verbose.
    try {
      const inferred = buildGoalFromText(text);
      if (inferred) {
        const gsG = getGameState();
        if (!Array.isArray(gsG.goals)) gsG.goals = [];
        if (gsG.goals.length < 30) {
          gsG.goals.unshift(inferred);
          if (gsG.goals.length > 30) gsG.goals.length = 30;
          window.dispatchEvent(new Event('gamestate-change'));
        }
      }
    } catch {}

    // Slash commands — handled locally without hitting the LLM.
    const slashResult = handleSlashCommand(text, (m) => {
      messages = [...messages, { id: crypto.randomUUID(), role: m.role, content: m.content, timestamp: Date.now() }];
    }, {
      getTranscript: () => messages.map((m) => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n'),
    });
    if (slashResult) return;

    const deduped = messages.length > 0 && messages[messages.length - 1].role === 'user' && messages[messages.length - 1].content === text;
    const trimmed = deduped && messages.length >= 2 && messages[messages.length - 2].role === 'assistant'
      ? messages.slice(0, -2)
      : messages;
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    messages = [...trimmed, userMsg];
    lastUserMsgText = text;
    loading = true;
    error = null;
    onStreamState({ streaming: true, route: lastRoute, ms: 0 });

    const gameStateBefore = getGameState();
    const systemPrompt = getSystemPrompt(text);
    const rawRoute = pinnedProvider
      ? { provider: pinnedProvider.id, model: pinnedProvider.models[0], taskType: 'chat' as const, topicBias: undefined }
      : routeMessage(text, providers);
    const routeForStats = rawRoute;
    const topicBias = routeForStats?.topicBias;
    const historyForLLM: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...gameStateBefore.chatMessages
        .filter((m: any) => m.role !== 'system')
        .slice(-20)
        .map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const activeConfig: LLMConfig = resolveConfigForText(text);
    const taskType = (routeForStats?.taskType || 'CHAT').toUpperCase();
    recordTopic(taskType.toLowerCase());

    const placeholderId = crypto.randomUUID();
    messages = [...messages, { id: placeholderId, role: 'assistant', content: '', timestamp: Date.now() }];

    const startedAt = performance.now();

    async function streamOnce(): Promise<string> {
      const ac = new AbortController();
      inFlightAbort = ac;
      try {
        const finalReply = await sendLLMStream(
          historyForLLM,
          activeConfig,
          (_delta, fullSoFar) => {
            messages = messages.map((m) =>
              m.id === placeholderId ? { ...m, content: fullSoFar } : m
            );
            if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
          },
          ac.signal,
        );
        return finalReply.trim();
      } finally {
        if (inFlightAbort === ac) inFlightAbort = null;
      }
    }

    let reply = '';
    let ok = false;
    let ms = 0;

    // Cost guard: refuse or warn the call before it fires, based on caps.
    const estimatedPromptText = historyForLLM.map((m) => m.content).join('\n');
    const { decision } = evaluateCostGuard(activeConfig.provider, activeConfig.model, estimatedPromptText, 700);
    if (decision.level === 'block') {
      messages = [...messages, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `Budget guard: ${decision.reason}. Open Settings → 09 / BUDGET to lift.`,
        timestamp: Date.now(),
      }];
      try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'BUDGET BLOCK', message: decision.reason, color: '#c03030' } })); } catch {}
      loading = false;
      return;
    }
    if (decision.level === 'warn') {
      costWarnings.push(decision.reason);
      try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'BUDGET WARN', message: decision.reason, color: 'var(--gb-text)' } })); } catch {}
    }

    try {
      try {
        reply = await streamOnce();
      } catch (e: any) {
        if (isAbortError(e)) {
          // Silent cancel — drop placeholder, surface tasteful hint.
          messages = messages.filter((m) => m.id !== placeholderId);
          error = 'cancelled by user';
          return;
        }
        if (!isTransientError(e)) throw e;
        await new Promise((r) => setTimeout(r, 800));
        reply = await streamOnce();
      }
      if (!reply) throw new Error('Empty response from LLM');
      ok = true;
    } catch (e: any) {
      messages = messages.filter((m) => m.id !== placeholderId);
      error = e?.message || 'Failed to send message';
      console.error('[LLM]', e);
    } finally {
      ms = performance.now() - startedAt;
      stats = recordCall(stats, {
        provider: activeConfig.provider,
        model: activeConfig.model,
        task: taskType,
        ms,
        ok,
      });
      pushChatCall({ provider: activeConfig.provider, model: activeConfig.model, task: taskType, ms, ok });
      const routeLabel = pinnedProvider
        ? `PINNED · ${pinnedProvider.label}`
        : `AUTO · ${taskType} · ${activeConfig.provider}/${activeConfig.model}`;
      const evo = getEvolvedPersonality(getGameState().stage, getTopTopics(5));
      const driftLabel = evo.shift ? ` · DRIFTED → ${PERSONALITY_PROFILES[evo.shift].name.toUpperCase()}` : '';
      lastRoute = `${routeLabel}${topicBias ? ' · ' + topicBias.toUpperCase() : ''}${driftLabel} · ${ok ? 'OK' : 'ERR'} · ${msLabel(ms)} · avg ${msLabel(stats.rollingMsAvg)} · ${stats.totalCalls}calls`;
      loading = false;
      cancelledByUser = false;
      onStreamState({ streaming: false, route: lastRoute, ms });
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }

    if (ok) {
      const recalled = getMemoriesForPrompt(text, 1);
      const reflection = recalled.length && recalled[0].length > 30
        ? `💭 I remember: ${recalled[0]}\n\n`
        : '';
      const { stripped, toolNote } = dispatchAgentTool(reply);
      const finalReply = reflection + stripped + toolNote;
      const tokensApprox = Math.round((text.length + finalReply.length) / 4);
      messages = messages.map((m) =>
        m.id === placeholderId
          ? { ...m, content: finalReply, xpEarned: 5, tokens: tokensApprox, timestamp: Date.now() }
          : m
      );
      saveLLMConfig({ provider: activeConfig.provider, model: activeConfig.model, apiKey: '' });
      onMessageSent(text);
      addAssistantMessage(getGameState(), finalReply);
      recordTokenUsage({
        provider: activeConfig.provider,
        model: activeConfig.model,
        task: taskType,
        promptText: historyForLLM.map((m) => m.role + ': ' + m.content).join('\n'),
        completionText: finalReply,
      });
      rememberEvent({ kind: 'success', title: text.slice(0, 40), detail: reply.slice(0, 120), tags: [taskType.toLowerCase()], confidence: 0.9 });
      try { soundPlayer.play('levelup'); } catch {}

      // Goal-oriented: if the reply mentions completing a step, mark the
      // step done in the active goal. Persists immediately so the next
      // system-prompt pick shows the updated progress.
      try {
        const gsG3 = getGameState();
        const goalsArr = gsG3.goals ?? [];
        const active = pickActiveGoal(goalsArr);
        if (active && !active.doneAt) {
          const updated = detectCompletionFromReply(active, reply);
          if (updated !== active) {
            const idx = goalsArr.findIndex((g) => g.id === active.id);
            if (idx >= 0) {
              goalsArr[idx] = updated;
              gsG3.goals = goalsArr;
              window.dispatchEvent(new Event('gamestate-change'));
            }
          }
        }
      } catch {}

      try {
        const clipped = clipForBubble(reply);
        const s = getGameState();
        s._pendingSpeech = clipped;
        window.dispatchEvent(new Event('gamestate-change'));
      } catch {}

      // Self-correction: if the reply looks weak (empty, very short, weak
      // disclaimer, fast+high failure rate), retry once with a different
      // route. Capped per session via the chat stats counters.
      try {
        const recentFailureRate = stats.totalCalls > 0 ? stats.totalFail / Math.max(1, stats.totalCalls) : 0;
        const correctionsUsed = stats.totalCalls > 0 ? Math.max(0, stats.totalCalls - stats.totalSuccess) : 0;
        const dec = evaluateReply({
          reply: finalReply,
          durationMs: ms,
          provider: activeConfig.provider,
          model: activeConfig.model,
          recentFailureCount: stats.totalFail,
          costGuardBlocked: costWarnings.length > 0,
          correctionsUsedThisSession: correctionsUsed,
          maxCorrectionsPerSession: 2,
        });
        if (dec.verdict === 'retry') {
          rememberEvent({ kind: 'lesson', title: 'AUTO-RETRY', detail: dec.reason, tags: ['self-correct', taskType.toLowerCase()], confidence: 0.9 });

          // Real retry: pick a different provider/model and re-stream.
          const fallback = pickFallbackRoute(activeConfig, providers, pinnedProvider);
          if (fallback) {
            try {
              const ac2 = new AbortController();
              inFlightAbort = ac2;
              const retried = await sendLLMStream(
                historyForLLM,
                fallback,
                (_delta, fullSoFar) => {
                  messages = messages.map((m) =>
                    m.id === placeholderId ? { ...m, content: fullSoFar } : m
                  );
                },
                ac2.signal,
              );
              const retriedClean = retried.trim();
              if (retriedClean && retriedClean !== reply.trim()) {
                const retriedFinal = finalReply.split('\n\n')[1] || '';
                messages = messages.map((m) =>
                  m.id === placeholderId
                    ? { ...m, content: retriedClean + (retriedFinal ? `\n\n${retriedFinal}` : ''), timestamp: Date.now() }
                    : m
                );
                rememberEvent({ kind: 'lesson', title: 'AUTO-RETRY success', detail: `via ${fallback.provider}/${fallback.model}`, tags: ['self-correct', 'retry-ok'], confidence: 0.85 });
              }
            } catch (retryErr) {
              rememberEvent({ kind: 'lesson', title: 'AUTO-RETRY failed', detail: String(retryErr), tags: ['self-correct', 'retry-fail'], confidence: 0.7 });
            } finally {
              inFlightAbort = null;
            }
          }
        } else if (dec.verdict === 'none') {
          // No-op — reply is fine.
        }
      } catch {}
      return;
    }

    rememberEvent({ kind: 'error', title: 'LLM error', detail: String(error) || 'stream failed', tags: [taskType.toLowerCase(), 'error'], confidence: 0.7 });
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && loading) {
      e.preventDefault();
      cancelInFlight();
    }
  }

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loading) cancelInFlight();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function retryLastUserMessage() {
    if (loading || !lastUserMsgText) return;
    const text = lastUserMsgText;
    lastUserMsgText = '';
    handleSend(text);
  }

  function handleReport(msg: ChatMsg) {
    rememberEvent({
      kind: 'lesson',
      title: `👎 ${msg.content.slice(0, 40)}`,
      detail: `User reported: ${msg.content.slice(0, 200)}`,
      tags: ['lesson', 'feedback'],
      confidence: 0.85,
    });
  }

  function clipForBubble(text: string): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= 64) return flat;
    return flat.slice(0, 61) + '...';
  }

  function togglePin(p: ProviderInfo) {
    pinnedProvider = pinnedProvider?.id === p.id ? null : p;
    error = null;
  }

  function resolveConfigForText(text: string): LLMConfig {
    const raw = pinnedProvider
      ? { provider: pinnedProvider.id, model: pinnedProvider.models[0], taskType: 'chat' as const, topicBias: undefined }
      : routeMessage(text, providers);
    const route = raw;
    const activeConfig: LLMConfig = route
      ? { provider: route.provider as LLMConfig['provider'], model: route.model, apiKey: '' }
      : llmConfig;
    return activeConfig;
  }

  // Pick the first available provider/model DIFFERENT from the current one
  // (and not pinned if pinning is active). Returns null if no alternative.
  function pickFallbackRoute(current: LLMConfig, all: ProviderInfo[], pinned: ProviderInfo | null): LLMConfig | null {
    for (const p of all) {
      if (pinned && p.id === pinned.id) continue;
      if (p.id === current.provider) continue;
      const model = p.models[0];
      if (!model) continue;
      return { provider: p.id as LLMConfig['provider'], model, apiKey: '' };
    }
    return null;
  }
</script>

<div class="chat-panel" use:syncFromParent role="region" aria-label="Chat">
  <div class="chat-messages" bind:this={chatEl} role="log" aria-live="polite">
    <div class="thread-bar">
      {#each threadState.order as id, i (id)}
        {@const t2 = threadState.threads[id]}
        <button
          class="thread-btn"
          class:active={id === threadState.activeId}
          onclick={() => switchToThread(id)}
          title={t2?.title || 'Untitled'}
        >
          <span class="thread-idx">{i}</span>
          <span class="thread-title">{(t2?.title || 'Untitled').slice(0, 16)}</span>
        </button>
      {/each}
      <button class="new-thread-btn" onclick={createNewThread} title="New thread">+</button>
    </div>
    {#if providers.length > 0}
      <div class="provider-bar">
        <span class="route-label">ROUTE</span>
        {#each providers as p}
          <button class="prov-btn" class:active={pinnedProvider?.id === p.id} onclick={() => togglePin(p)}>
            {p.label}
          </button>
        {/each}
        <button class="prov-btn auto" class:active={!pinnedProvider} onclick={() => (pinnedProvider = null)}>AUTO</button>
      </div>
    {/if}
    {#if error}
      <div class="error-msg">
        <span class="ico ico-sm ico-cross" style="color:#e85050"></span>
        {error}
      </div>
    {/if}
    {#if proxyReady && providers.length === 0}
      <div class="proxy-hint">
        <span class="ico ico-sm ico-cross" style="color:#e85050"></span>
        LLM proxy not reachable — run via <code>npm run dev</code>, <code>npm run preview</code>, or <code>npm run start</code>.
      </div>
    {/if}
    {#if lastRoute}
      <div class="route-status">↳ {lastRoute}</div>
    {/if}
    {#each messages.filter(m => m.role !== 'system') as msg (msg.id)}
      <ChatMessage message={msg} onReport={handleReport} />
    {/each}
    {#if loading}
      <div class="typing">
        <div class="dots"><span></span><span></span><span></span></div>
        {#if stats.totalCalls > 0}
          <span class="typing-stat">last {msLabel(stats.lastMs)} · avg {msLabel(stats.rollingMsAvg)}</span>
        {/if}
      </div>
    {/if}
  </div>
  <ChatInput {messages} onSend={handleSend} onCancel={cancelInFlight} disabled={loading} />
</div>

<style>
  .chat-panel { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--gb-bg); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 6px 0; display: flex; flex-direction: column; gap: 4px; image-rendering: pixelated; }
  .chat-messages::-webkit-scrollbar { width: 8px; }
  .chat-messages::-webkit-scrollbar-track { background: var(--gb-panel); border: 2px solid var(--gb-border); }
  .chat-messages::-webkit-scrollbar-thumb { background: var(--gb-border); }

  .thread-bar {
    display: flex;
    gap: 4px;
    padding: 4px 6px;
    background: var(--gb-panel);
    border-bottom: 3px solid var(--gb-border);
    overflow-x: auto;
  }
  .thread-bar::-webkit-scrollbar { height: 4px; }
  .thread-btn, .new-thread-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 5px;
    background: var(--gb-bg);
    border: 3px solid var(--gb-border);
    color: var(--gb-dark);
    font-family: var(--font-body);
    font-size: 7px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .thread-btn.active { background: var(--gb-text); color: var(--gb-bg); }
  .thread-btn:hover { background: var(--gb-border); color: var(--gb-bg); }
  .thread-idx { color: var(--gb-text); font-weight: bold; }
  .thread-btn.active .thread-idx { color: var(--gb-bg); }
  .new-thread-btn { padding: 2px 8px; font-weight: bold; }

  .provider-bar {
    display: flex;
    gap: 4px;
    padding: 4px 6px;
    background: var(--gb-panel);
    border-bottom: 3px solid var(--gb-border);
  }
  .prov-btn {
    font-size: 8px;
    padding: 3px 6px;
    background: var(--gb-bg);
    border: 3px solid var(--gb-border);
    color: var(--gb-dark);
    cursor: pointer;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .prov-btn.active { color: var(--gb-bg); background: var(--gb-border); border-color: var(--gb-text); }
  .prov-btn:hover { background: var(--gb-dark); color: var(--gb-bg); }
  .route-label { font-size: 7px; color: var(--gb-dark); text-transform: uppercase; letter-spacing: 0.5px; }

  .error-msg {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    margin: 0 6px 4px;
    background: var(--gb-panel);
    border: 3px solid var(--gb-text);
    color: var(--gb-bg);
    font-size: 8px;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .proxy-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    margin: 0 6px 4px;
    background: var(--gb-panel);
    border: 3px solid var(--gb-text);
    color: var(--gb-dark);
    font-size: 8px;
    font-family: var(--font-body);
    image-rendering: pixelated;
  }
  .proxy-hint code {
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    padding: 0 3px;
    color: var(--gb-text);
  }
  .route-status {
    font-size: 7px;
    color: var(--gb-dark);
    padding: 2px 8px 4px;
    letter-spacing: 0.3px;
    word-break: break-all;
  }
  .typing { display: flex; align-items: center; gap: 6px; padding: 6px 10px; flex-wrap: wrap; }
  .dots { display: flex; gap: 4px; padding: 6px 10px; background: var(--gb-panel); border: 3px solid var(--gb-border); image-rendering: pixelated; }
  .dots span {
    width: 5px; height: 5px; background: var(--gb-border);
    animation: dotBounce 1s steps(2) infinite;
    image-rendering: pixelated;
  }
  .dots span:nth-child(2) { animation-delay: 0.2s; }
  .dots span:nth-child(3) { animation-delay: 0.4s; }
  .typing-stat {
    font-size: 7px;
    color: var(--gb-dark);
    font-family: var(--font-body);
    letter-spacing: 0.3px;
  }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0); opacity: 1; }
    50% { transform: translateY(-3px); opacity: 0.4; }
  }
</style>
