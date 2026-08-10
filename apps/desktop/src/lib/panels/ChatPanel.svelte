<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
  import ChatInput from './ChatInput.svelte';
  import { sendLLMStream, getAvailableProviders, saveLLMConfig, loadPersistedLLMChoice, type LLMConfig, type ProviderInfo } from '$lib/llm';
  import { routeMessage } from '$lib/router';
   import { getGameState, addAssistantMessage, saveState, addXP, type ChatMessage as ChatMessageType } from '$lib/gameState';
  import { soundPlayer } from '$lib/audio';
  import { logger } from '$lib/logger';
  import { getPersonalityForStage, getEvolvedPersonality, PERSONALITY_PROFILES } from '$lib/personality';
  import { emptyStats, recordCall, type ChatStatsState } from '$lib/chatStats';
  import { pushChatCall, msLabel } from '$lib/chatStatsStore.svelte';
  import { rememberEvent, recordTopic, getMemoriesForPrompt, getTopTopics, getPersona } from '$lib/memory';
  import { recordTokenUsage } from '$lib/tokenTracker';
  import { evaluateCostGuard, dispatchAgentTool, dispatchAgentToolWithHooks, isTransientError, isAbortError } from '$lib/chatEngine.ts';
  import { getDailySpend } from '$lib/tokenTracker';
  import { createDefaultHooks as createAgentLoopHooks } from '$lib/agentLoop.ts';
  import { getModeConfig, isModeReadOnly, type AgentMode } from '$lib/agentMode.ts';
import { getSkillsForQuery, type AgentSkill, recordSkillUsage } from '$lib/agentSkills.ts';
import { shouldCompact, compactMessages } from '$lib/compaction.ts';
import { DoomLoopDetector } from '$lib/doomLoop.ts';
import { installSessionEndHook } from '$lib/sessionEnd';
import { evaluateReply } from '$lib/selfCorrect';
import { processEmotion } from '$lib/gameLoop';
import { tickSelfHealing, getHealingSummary, createInitialSelfHealingState } from '$lib/selfHealing';
  import { getThreadState, switchThread, deleteThread, renameThread, createThread, ensureThreadState, appendToActive, THREAD_TITLE_MAX } from '$lib/threads';
  import { pickActiveGoal, buildGoalFromText, isGoalActive, detectCompletionFromReply, type Goal } from '$lib/goals';
  import { handleSlashCommand } from '$lib/commands/slashCommands.ts';
  import { onMount } from 'svelte';
  import { ALL_TOOLS } from '$lib/mcp';
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
- Available tools: ${ALL_TOOLS.join(', ')}
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

  let agentMode = $state<AgentMode>('build');
  let showSkillPicker = $state(false);
  let messageQueue: string[] = $state([]);
  let isSteering = $state(false);
  let isProcessingQueue = $state(false);
  const doomLoopDetector = new DoomLoopDetector({ maxIdenticalCalls: 3, maxNearIdenticalRatio: 0.8, windowMs: 60000 });
  let healingSummary = $state('');

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

  function makeHooks(provider: string): ReturnType<typeof createAgentLoopHooks> {
    return createAgentLoopHooks({
      callUsd: 0.01,
      provider,
      totalUsdProvider: 0,
      dailyUsdProvider: 0,
      dailyUsdTotal: 0,
    });
  }

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

  function cycleMode() {
    const modes: AgentMode[] = ['build', 'plan', 'review', 'explore'];
    const idx = modes.indexOf(agentMode);
    agentMode = modes[(idx + 1) % modes.length];
    const modeConfig = getModeConfig(agentMode);
    const hooks = makeHooks(llmConfig.provider);
    if (isModeReadOnly(agentMode)) {
      hooks.setMode('plan');
    } else {
      hooks.setMode('default');
    }
    try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'MODE', message: `Switched to ${modeConfig.label} mode`, color: modeConfig.color } })); } catch {}
  }

  function queueMessage(text: string) {
    messageQueue = [...messageQueue, text];
      try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'QUEUED', message: `${messageQueue.length} message(s) in queue`, color: 'var(--text-primary)' } })); } catch {}
  }

  async function processQueue() {
    if (isSteering || messageQueue.length === 0 || isProcessingQueue) return;
    isSteering = true;
    isProcessingQueue = true;
    while (messageQueue.length > 0 && !cancelledByUser) {
      const next = messageQueue[0];
      messageQueue = messageQueue.slice(1);
      await handleSend(next, true);
      if (loading) {
        await new Promise((resolve) => {
          const check = setInterval(() => {
            if (!loading) { clearInterval(check); resolve(true); }
          }, 100);
        });
      }
    }
    isProcessingQueue = false;
    isSteering = false;
    if (messageQueue.length === 0) {
      try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'STEER DONE', message: 'All queued messages processed', color: '#50b8a0' } })); } catch {}
    }
  }

  function startSteerMode() {
    isSteering = true;
    try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'STEER MODE', message: 'Queue messages with /queue or paste multiple lines', color: '#e85050' } })); } catch {}
  }

  function stopSteerMode() {
    isSteering = false;
    isProcessingQueue = false;
    messageQueue = [];
      try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'STEER STOPPED', message: 'Steer mode deactivated', color: 'var(--text-primary)' } })); } catch {}
  }

  async function handleSend(text: string, fromQueue = false) {
    if (!text.trim()) return;

    // Steer mode: queue messages instead of sending immediately
    if (isSteering && !fromQueue) {
      queueMessage(text);
      messages = [...messages, { id: crypto.randomUUID(), role: 'user', content: `[QUEUED] ${text}`, timestamp: Date.now() }];
      if (!loading && messageQueue.length === 1) {
        processQueue();
      }
      return;
    }

    if (loading) return;

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
      ...messages
        .filter((m: any) => m.role !== 'system')
        .slice(-20)
        .map((m: any) => ({ role: m.role, content: m.content })),
    ];

    let activeConfig: LLMConfig = resolveConfigForText(text);
    const taskType = (routeForStats?.taskType || 'CHAT').toUpperCase();
    recordTopic(taskType.toLowerCase());
    let hooks = makeHooks(activeConfig.provider);

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
    let retryMs = 0;

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
      try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'BUDGET WARN', message: decision.reason, color: 'var(--text-primary)' } })); } catch {}
    }

    try {
      await hooks.onAgentStart({ step: 0, turnCount: 0 });
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
      logger.error('[LLM]', { error: String(e) });
    }

    // Tool dispatch + optional retry happens AFTER first stream completes,
    // but BEFORE we finalize stats so retry latency is captured.
    if (ok) {
      const recalled = getMemoriesForPrompt(text, 1);
      const reflection = recalled.length && recalled[0].length > 30
        ? `💭 I remember: ${recalled[0]}\n\n`
        : '';
      const pickFallback = () => {
        const fallback = pickFallbackRoute(activeConfig, providers, pinnedProvider);
        if (!fallback) return activeConfig.provider;
        activeConfig = fallback;
        llmConfig = { provider: fallback.provider, model: fallback.model, apiKey: '' };
        hooks = makeHooks(fallback.provider);
        return fallback.provider;
      };
      const { stripped, toolNote, needsRetry } = await dispatchAgentToolWithHooks(reply, {
        provider: activeConfig.provider,
        riskTolerance: getGameState().personalityTraits?.riskTolerance ?? 0.5,
        dailySpend: getDailySpend().total,
        doomLoopDetector,
        providerFallback: pickFallback,
        onToolCall: (call, _result) => {
          hooks.onStepStart(1, call.name);
        },
        onRetry: (attempt, reason) => {
          rememberEvent({ kind: 'lesson', title: 'AUTO-RETRY', detail: reason, tags: ['agent-hook', 'retry'], confidence: 0.9 });
        },
        onNotification: (message, level) => {
              try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: level.toUpperCase(), message, color: level === 'error' ? 'var(--error)' : 'var(--text-primary)' } })); } catch {}
        },
      });

      let retryStripped = stripped;
      let retryToolNote = toolNote;
      let retryAttempt = 0;
      if (needsRetry) {
        const retryStart = performance.now();
        try {
          const backoffMs = Math.min(500 * Math.pow(2, retryAttempt) + Math.random() * 200, 3000);
          await new Promise((r) => setTimeout(r, backoffMs));
          retryAttempt++;
          const fallbackProvider = pickFallback();
          hooks.onAgentStart({ step: 0, turnCount: 0 });
          reply = await streamOnce();
          if (!reply) throw new Error('Empty retry response from LLM');
          const retryResult = await dispatchAgentToolWithHooks(reply, {
            provider: activeConfig.provider,
            riskTolerance: getGameState().personalityTraits?.riskTolerance ?? 0.5,
            dailySpend: getDailySpend().total,
            doomLoopDetector,
            onToolCall: (call, _result) => {
              hooks.onStepStart(1, call.name);
            },
            onRetry: (attempt, reason) => {
              rememberEvent({ kind: 'lesson', title: 'AUTO-RETRY', detail: reason, tags: ['agent-hook', 'retry'], confidence: 0.9 });
            },
            onNotification: (message, level) => {
          try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: level.toUpperCase(), message, color: level === 'error' ? 'var(--error)' : 'var(--text-primary)' } })); } catch {}
            },
          });
          retryStripped = retryResult.stripped;
          retryToolNote = retryResult.toolNote;
        } catch (e: any) {
          recordProviderFailure(activeConfig.provider);
          logger.error('[LLM retry]', { error: String(e) });
        } finally {
          try { await hooks.onAgentEnd({ step: 0 }); } catch {}
        }
        retryMs = performance.now() - retryStart;
      }

      hooks.onStepEnd(1, { ok: true });
      const finalReply = reflection + retryStripped + retryToolNote;
      const tokensApprox = Math.round((text.length + finalReply.length) / 4);
      messages = messages.map((m) =>
        m.id === placeholderId
          ? { ...m, content: finalReply, xpEarned: 5, tokens: tokensApprox, timestamp: Date.now() }
          : m
      );
      saveLLMConfig({ provider: activeConfig.provider, model: activeConfig.model, apiKey: '' });
      const gsChat = getGameState();
      const xpGain = 5;
      const xpUpdated = addXP(gsChat, xpGain);
      const userMsgForState: ChatMessageType = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
      saveState({
        ...xpUpdated,
        chatMessages: [...(xpUpdated.chatMessages || []), userMsgForState],
        _totalMessages: xpUpdated._totalMessages + 1,
        lastActivityTs: Date.now(),
      });
      addAssistantMessage(getGameState(), finalReply);
      recordTokenUsage({
        provider: activeConfig.provider,
        model: activeConfig.model,
        task: taskType,
        promptText: historyForLLM.map((m) => m.role + ': ' + m.content).join('\n'),
        completionText: finalReply,
      });
      rememberEvent({ kind: 'success', title: text.slice(0, 40), detail: finalReply.slice(0, 120), tags: [taskType.toLowerCase()], confidence: 0.9 });
      try { processEmotion('task_success'); } catch {}
      try { soundPlayer.play('levelup'); } catch {}

      // Goal-oriented: if the reply mentions completing a step, mark the
      // step done in the active goal. Persists immediately so the next
      // system-prompt pick shows the updated progress.
      try {
        const gsG3 = getGameState();
        const goalsArr = gsG3.goals ?? [];
        const active = pickActiveGoal(goalsArr);
        if (active && !active.doneAt) {
          const updated = detectCompletionFromReply(active, finalReply);
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

      // Self-healing tick — auto-apply healing when needs are critical
      try {
        const gsHeal = getGameState();
        const healResult = tickSelfHealing(gsHeal.needs, gsHeal.selfHealing ?? createInitialSelfHealingState(), Date.now());
        if (healResult.actionTaken) {
          saveState({ ...gsHeal, needs: healResult.needs, selfHealing: healResult.healingState });
          healingSummary = getHealingSummary(healResult.healingState);
          try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'HEALING', message: `Auto-healed: ${healResult.actionTaken}`, color: '#90c878' } })); } catch {}
          window.dispatchEvent(new Event('gamestate-change'));
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

      // Finalize stats AFTER tool dispatch + retry so ms includes retry latency.
      ms = performance.now() - startedAt + retryMs;
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
      try { await hooks.onAgentEnd({ step: 0 }); } catch {}
      return;
    }

    rememberEvent({ kind: 'error', title: 'LLM error', detail: String(error) || 'stream failed', tags: [taskType.toLowerCase(), 'error'], confidence: 0.7 });
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && loading) {
      e.preventDefault();
      cancelInFlight();
    }
    if (e.key === 'Tab' && !(e.target as HTMLElement)?.closest('input, textarea')) {
      e.preventDefault();
      cycleMode();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      showSkillPicker = !showSkillPicker;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
      e.preventDefault();
      if (isSteering) stopSteerMode();
      else startSteerMode();
    }
  }

  let keyboardHandlerInstalled = false;
  onMount(() => {
    if (keyboardHandlerInstalled) return;
    keyboardHandlerInstalled = true;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loading) cancelInFlight();
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        showSkillPicker = !showSkillPicker;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
        e.preventDefault();
        if (isSteering) stopSteerMode();
        else startSteerMode();
      }
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
  let fallbackRotation = 0;
  const failedProviders = new Set<string>();
  const FAILED_PROVIDER_TTL = 60_000;
  const FALLBACK_STORAGE_KEY = 'agenmonster_fallback_state';

  interface FallbackPersist {
    rotation: number;
    failedProviders: { id: string; ts: number }[];
  }

  function loadFallbackState(): FallbackPersist {
    try {
      const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (!raw) return { rotation: 0, failedProviders: [] };
      const parsed = JSON.parse(raw) as FallbackPersist;
      const now = Date.now();
      return {
        rotation: typeof parsed.rotation === 'number' ? parsed.rotation : 0,
        failedProviders: Array.isArray(parsed.failedProviders)
          ? parsed.failedProviders.filter((f: { id: string; ts: number }) => now - f.ts < FAILED_PROVIDER_TTL)
          : [],
      };
    } catch {
      return { rotation: 0, failedProviders: [] };
    }
  }

  function saveFallbackState() {
    try {
      const failed = Array.from(failedProviders.entries()).map(([id, ts]) => ({ id, ts }));
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify({ rotation: fallbackRotation, failedProviders: failed }));
    } catch {}
  }

  onMount(() => {
    const state = loadFallbackState();
    fallbackRotation = state.rotation;
    for (const f of state.failedProviders) failedProviders.add(f.id);
  });

  function pickFallbackRoute(current: LLMConfig, all: ProviderInfo[], pinned: ProviderInfo | null): LLMConfig | null {
    const candidates = all.filter((p) => {
      if (pinned && p.id === pinned.id) return false;
      if (p.id === current.provider) return false;
      if (failedProviders.has(p.id)) return false;
      const model = p.models[0];
      return !!model;
    });
    if (candidates.length === 0) return null;
    const start = fallbackRotation % candidates.length;
    for (let i = 0; i < candidates.length; i++) {
      const idx = (start + i) % candidates.length;
      const p = candidates[idx];
      fallbackRotation = (idx + 1) % candidates.length;
      saveFallbackState();
      return { provider: p.id as LLMConfig['provider'], model: p.models[0], apiKey: '' };
    }
    return null;
  }

  function recordProviderFailure(providerId: string) {
    failedProviders.add(providerId);
    saveFallbackState();
    setTimeout(() => {
      failedProviders.delete(providerId);
      saveFallbackState();
    }, FAILED_PROVIDER_TTL);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="chat-panel" use:syncFromParent aria-label="Chat" onkeydown={onKeydown}>
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

    <div class="mode-bar">
      <span class="route-label">MODE</span>
      {#each ['build', 'plan', 'review', 'explore'] as m}
        {@const mode = m as AgentMode}
        <button class="mode-btn" class:active={agentMode === mode} onclick={() => { agentMode = mode; const mc = getModeConfig(mode); const hooks = makeHooks(llmConfig.provider); if (isModeReadOnly(mode)) hooks.setMode('plan'); else hooks.setMode('default'); }} style="--mode-color: {getModeConfig(mode).color}">
          {mode.toUpperCase()}
        </button>
      {/each}
      <span class="mode-hint">TAB to switch</span>
    </div>

    {#if showSkillPicker}
      <div class="skill-picker">
        <span class="route-label">SKILLS</span>
        {#each getSkillsForQuery(lastUserMsgText || '') as skill}
          <button class="skill-tag" onclick={() => { recordSkillUsage(skill.id); try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'SKILL', message: `Activated: ${skill.name}`, color: 'var(--text-primary)' } })); } catch {} }}>
            {skill.name}
          </button>
        {/each}
        <button class="skill-close" onclick={() => showSkillPicker = false}>×</button>
      </div>
    {/if}

    {#if isSteering}
      <div class="steer-bar">
        <span class="route-label">STEER</span>
        <span class="queue-count">{messageQueue.length} queued</span>
        <button class="prov-btn" onclick={stopSteerMode}>STOP</button>
      </div>
    {/if}

    {#if messages.length > 20}
      <div class="compaction-bar">
        <button class="prov-btn" onclick={() => {
          const compacted = compactMessages(messages);
          messages = compacted.messages.map((m) => ({
            ...m,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            xpEarned: 0,
          })) as any;
          const savings = compacted.originalCharCount - compacted.compressedCharCount;
          try { window.dispatchEvent(new CustomEvent('agenmonster:toast', { detail: { id: crypto.randomUUID(), title: 'COMPACTED', message: `Saved ${savings} chars`, color: '#90c878' } })); } catch {}
        }}>COMPACT</button>
        <span class="route-label">{messages.length} msgs</span>
      </div>
    {/if}
    {#if healingSummary}
      <div class="healing-bar">
        <span class="route-label">HEAL</span>
        <span class="healing-text">{healingSummary}</span>
        <button class="prov-btn" onclick={() => { healingSummary = ''; }}>×</button>
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
  </section>

<style>
  .chat-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--bg-surface);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-height: 0;
  }

  .chat-messages::-webkit-scrollbar { width: 6px; }
  .chat-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-messages::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
  .chat-messages::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  .thread-bar {
    display: flex;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    overflow-x: auto;
  }
  .thread-bar::-webkit-scrollbar { height: 4px; }
  .thread-btn, .new-thread-btn {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    font-size: var(--fs-xs);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--font-body);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .thread-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .thread-btn.active { background: var(--accent-subtle); color: var(--accent); border-color: rgba(99, 102, 241, 0.2); }
  .thread-idx { color: var(--text-muted); font-weight: 600; }
  .thread-btn.active .thread-idx { color: var(--accent); }
  .new-thread-btn { font-weight: 600; }

  .provider-bar {
    display: flex;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    align-items: center;
  }
  .prov-btn {
    font-size: var(--fs-xs);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .prov-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .prov-btn.active { color: var(--accent); background: var(--accent-subtle); border-color: rgba(99, 102, 241, 0.2); }
  .route-label { font-size: var(--fs-2xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }

  .error-msg {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    margin: 0 var(--sp-2) var(--sp-2);
    background: var(--error-subtle);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--error);
    font-size: var(--fs-xs);
    font-family: var(--font-body);
    border-radius: var(--radius-md);
  }
  .proxy-hint {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    margin: 0 var(--sp-2) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-family: var(--font-body);
    border-radius: var(--radius-md);
  }
  .proxy-hint code {
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    padding: 1px var(--sp-1);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--fs-2xs);
  }
  .route-status {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    padding: var(--sp-1) var(--sp-2) var(--sp-2);
    letter-spacing: 0.3px;
    word-break: break-all;
  }
  .typing { display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); flex-wrap: wrap; }
  .dots { display: flex; gap: var(--sp-1); padding: var(--sp-2) var(--sp-3); background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); }
  .dots span {
    width: 6px; height: 6px; background: var(--border-strong);
    border-radius: 50%;
    animation: dotBounce 1s ease-in-out infinite;
  }
  .dots span:nth-child(2) { animation-delay: 0.2s; }
  .dots span:nth-child(3) { animation-delay: 0.4s; }
  .typing-stat {
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    font-family: var(--font-body);
    letter-spacing: 0.3px;
  }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0); opacity: 1; }
    50% { transform: translateY(-3px); opacity: 0.4; }
  }

  .mode-bar, .steer-bar, .skill-picker {
    display: flex;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    align-items: center;
  }
  .mode-btn {
    font-size: var(--fs-xs);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .mode-btn.active { color: var(--accent); background: var(--accent-subtle); border-color: rgba(99, 102, 241, 0.2); }
  .mode-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .mode-hint { font-size: var(--fs-2xs); color: var(--text-muted); margin-left: auto; }
  .skill-tag {
    font-size: var(--fs-xs);
    padding: var(--sp-1) var(--sp-2);
    background: var(--bg-overlay);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all var(--duration-fast) var(--ease-default);
  }
  .skill-tag:hover { background: var(--accent-subtle); color: var(--accent); border-color: rgba(99, 102, 241, 0.2); }
  .skill-close {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: var(--fs-lg);
    line-height: 1;
  }
  .steer-bar { justify-content: space-between; }
  .queue-count { font-size: var(--fs-2xs); color: var(--text-muted); }
  .compaction-bar { display: flex; gap: var(--sp-1); padding: var(--sp-1) var(--sp-2); background: var(--bg-elevated); border-bottom: 1px solid var(--border-default); align-items: center; justify-content: space-between; }
  .healing-bar { display: flex; gap: var(--sp-1); padding: var(--sp-1) var(--sp-2); background: var(--bg-elevated); border-bottom: 1px solid var(--border-default); align-items: center; }
  .healing-text { font-size: var(--fs-xs); color: var(--text-muted); flex: 1; }
</style>





