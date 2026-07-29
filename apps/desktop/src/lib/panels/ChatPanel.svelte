<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
  import ChatInput from './ChatInput.svelte';
  import { sendLLMStream, getAvailableProviders, saveLLMConfig, loadPersistedLLMChoice, type LLMConfig, type ProviderInfo } from '$lib/llm';
  import { routeMessage } from '$lib/router';
  import { getGameState, addAssistantMessage } from '$lib/gameState';
  import { soundPlayer } from '$lib/audio';
  import { getPersonalityForStage, getEvolvedPersonality, PERSONALITY_PROFILES } from '$lib/personality';
  import { emptyStats, recordCall, type ChatStatsState } from '$lib/chatStats';
  import { pushChatCall, getChatStats, msLabel } from '$lib/chatStatsStore.svelte';
  import { rememberEvent, recordTopic, getMemoriesForPrompt, upsertFact, forgetFact, getTopTopics, serializeMemoryMarkdown, downloadMemoryMarkdown, getMemoryState, exportMemoryJSON, importMemoryJSON, getPersona } from '$lib/memory';
  import { runDailyRecap } from '$lib/dailyRecap';
  import { downloadChatMarkdown } from '$lib/persistence';
  import { recordTokenUsage, formatCost, formatTokens, getDailySpend, getTokenState } from '$lib/tokenTracker';
  import { loadCaps, saveCaps, decideCall, describeCaps } from '$lib/costGuard';
  import { installSessionEndHook } from '$lib/sessionEnd';
  import { evaluateReply } from '$lib/selfCorrect';
  import {
    getThreadState,
    switchThread,
    deleteThread,
    renameThread,
    createThread,
    ensureThreadState,
    THREAD_TITLE_MAX,
  } from '$lib/threads';
  import { pickActiveGoal, buildGoalFromText, isGoalActive, detectCompletionFromReply, type Goal } from '$lib/goals';
  import { onMount } from 'svelte';
  import { TOOLS, handleTool } from '$lib/mcp';
  import { parseAgentToolCall } from '$lib/agentToolCall';
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
    const goals = ((gs as any).goals || []) as Goal[];
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
    const gs = getGameState() as any;
    const ts = ensureThreadState(gs);
    const fresh = createThread('New thread');
    gs.chatThreads[fresh.id] = fresh;
    gs.chatActiveThreadId = fresh.id;
    gs.chatThreadOrder = [fresh.id, ...ts.order];
    syncThreadState();
    window.dispatchEvent(new Event('gamestate-change'));
  }

  function switchToThread(id: string) {
    const gs = getGameState() as any;
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
        const gsG = getGameState() as any;
        if (!Array.isArray(gsG.goals)) gsG.goals = [];
        if (gsG.goals.length < 30) {
          gsG.goals.unshift(inferred);
          if (gsG.goals.length > 30) gsG.goals.length = 30;
          window.dispatchEvent(new Event('gamestate-change'));
        }
      }
    } catch {}

    // Slash commands — handled locally without hitting the LLM.
    const slash = text.trim().split(/\s+/);
    if (slash[0] === '/remember' && slash[1]) {
      const rest = slash.slice(1).join(' ');
      const idx = rest.indexOf(':');
      if (idx > 0) {
        const key = rest.slice(0, idx).trim();
        const value = rest.slice(idx + 1).trim();
        if (key && value) {
          upsertFact(key, value, 0.9);
          messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Remembered: ${key} = ${value}`, timestamp: Date.now(), xpEarned: 0 }];
          return;
        }
      }
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Usage: /remember key: value', timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/forget' && slash[1]) {
      const key = slash[1];
      const existed = !!getMemoryState().facts[key];
      forgetFact(key);
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: existed ? `Forgot: ${key}` : `No fact found: ${key}`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/export' && slash[1] === 'chat') {
      downloadChatMarkdown();
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Chat exported as Markdown.', timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/export' && slash[1] === 'memory') {
      // Export as portable JSON (preferred for portability) + Markdown variant.
      const json = exportMemoryJSON();
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agenmonster-memory-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {}
      downloadMemoryMarkdown();
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Memory exported as JSON + Markdown. Use /import memory to load a backup.`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/import' && slash[1] === 'memory') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        try {
          const text = await f.text();
          const result = importMemoryJSON(text);
          if (!result.ok) {
            messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Import failed: ${result.reason}`, timestamp: Date.now() }];
          } else {
            messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Memory imported.`, timestamp: Date.now() }];
          }
        } catch (e: any) {
          messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Import error: ${e?.message || 'unknown'}`, timestamp: Date.now() }];
        }
      };
      input.click();
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Pick a memory JSON file…', timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/stats') {
      const s = getChatStats();
      messages = [...messages, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Stats: ${s.totalCalls} calls · ${s.totalSuccess} ok · ${s.totalFail} err · avg ${msLabel(s.rollingMsAvg)} · last ${msLabel(s.lastMs)}`,
        timestamp: Date.now(),
      }];
      return;
    }
    if (slash[0] === '/topics') {
      const topics = getTopTopics(10);
      const text = topics.length
        ? 'Topics: ' + topics.map((t) => `${t.topic}(${t.count})`).join(', ')
        : 'No topics yet.';
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: text, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/help') {
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant',       content: 'Commands: /remember · /forget · /goal · /goals · /mood · /recap · /persona · /preset · /mode · /write · /export chat · /export memory · /import memory · /budget · /threads · /new · /switch · /delete · /rename · /stats · /topics · /help', timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/budget') {
      const desc = describeCaps(loadCaps());
      const t = getTokenState();
      const d = getDailySpend();
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Budget: ${desc}. Today spent: $${d.total.toFixed(4)} (lifetime $${t.totalCost.toFixed(2)}).`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/threads') {
      const gs2 = getGameState() as any;
      const ts2 = ensureThreadState(gs2);
      const lines = ts2.order.map((id: string, i: number) => {
        const t2 = ts2.threads[id];
        const mark = id === ts2.activeId ? '▶' : ' ';
        const title = t2.title || 'Untitled';
        return `${mark} [${i}] ${title} (${t2.messages.length} msgs)`;
      }).join('\n');
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Threads (${ts2.order.length}):\n${lines}`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/new') {
      const title = slash.slice(1).join(' ').trim();
      const gs3 = getGameState() as any;
      const ts3 = ensureThreadState(gs3);
      const fresh = createThread(title || 'New thread');
      gs3.chatThreads[fresh.id] = fresh;
      gs3.chatActiveThreadId = fresh.id;
      gs3.chatThreadOrder = [fresh.id, ...ts3.order];
      window.dispatchEvent(new Event('gamestate-change'));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Created thread "${fresh.title}"`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/switch') {
      const idx = parseInt(slash[1] || '-1', 10);
      const gs4 = getGameState() as any;
      const ts4 = ensureThreadState(gs4);
      const target = ts4.order[idx];
      if (!target) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `No thread at index ${idx}`, timestamp: Date.now() }];
        return;
      }
      const after = switchThread(ts4, target);
      gs4.chatThreads = after.threads;
      gs4.chatActiveThreadId = after.activeId;
      gs4.chatThreadOrder = after.order;
      window.dispatchEvent(new Event('gamestate-change'));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Switched to "${ts4.threads[target].title}"`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/delete') {
      const idx = parseInt(slash[1] || '-1', 10);
      const gs5 = getGameState() as any;
      const ts5 = ensureThreadState(gs5);
      const target = ts5.order[idx];
      if (!target) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `No thread at index ${idx}`, timestamp: Date.now() }];
        return;
      }
      const after = deleteThread(ts5, target);
      gs5.chatThreads = after.threads;
      gs5.chatActiveThreadId = after.activeId;
      gs5.chatThreadOrder = after.order;
      window.dispatchEvent(new Event('gamestate-change'));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Deleted.`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/rename') {
      const title = slash.slice(1).join(' ').trim();
      if (!title) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Usage: /rename <title>`, timestamp: Date.now() }];
        return;
      }
      const gs6 = getGameState() as any;
      const ts6 = ensureThreadState(gs6);
      const after = renameThread(ts6, ts6.activeId, title);
      gs6.chatThreads = after.threads;
      gs6.chatActiveThreadId = after.activeId;
      gs6.chatThreadOrder = after.order;
      window.dispatchEvent(new Event('gamestate-change'));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Renamed.`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/goal') {
      const rest = slash.slice(1).join(' ').trim();
      if (!rest) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Usage: /goal <title> [step1 | step2 | ...]', timestamp: Date.now() }];
        return;
      }
      const inferred = buildGoalFromText(rest);
      const manual = inferred ?? (() => {
        const steps = rest.includes('|') ? rest.split('|').map((s) => s.trim()).filter(Boolean) : [];
        const title = steps.length > 0 ? steps.shift()! : rest;
        return {
          id: crypto.randomUUID(),
          title: title.slice(0, 80),
          steps: steps.map((s) => ({ id: crypto.randomUUID(), title: s.slice(0, 60), done: false })),
          createdAt: Date.now(),
          source: 'manual' as const,
        };
      })();
      const gsG = getGameState() as any;
      if (!Array.isArray(gsG.goals)) gsG.goals = [];
      gsG.goals.unshift(manual);
      if (gsG.goals.length > 30) gsG.goals.length = 30;
      window.dispatchEvent(new Event('gamestate-change'));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Goal "${manual.title}" added${manual.steps.length ? ` (${manual.steps.length} steps)` : ''}.`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/goals') {
      const gsG2 = getGameState() as any;
      const goals = (gsG2.goals || []) as Goal[];
      if (!goals.length) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'No goals yet.', timestamp: Date.now() }];
        return;
      }
      const lines = goals.slice(0, 8).map((g) => {
        const total = g.steps.length;
        const done = g.steps.filter((s) => s.done).length;
        const status = g.doneAt ? '✓' : total > 0 && done === total ? '✓' : total > 0 ? `${done}/${total}` : '·';
        return `${g.doneAt || (!g.steps.length) ? '✓' : '·'} [${status}] ${g.title}`;
      }).join('\n');
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Goals:\n${lines}`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/persona') {
      const persona = slash.slice(1).join(' ').trim();
      if (typeof window === 'undefined') return;
      try {
        if (!persona) localStorage.removeItem('agenmonster_persona');
        else localStorage.setItem('agenmonster_persona', persona);
      } catch {}
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: persona ? `Persona updated. Shape locked in.` : 'Persona cleared. Back to stage default.', timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/preset') {
      const p = (slash[1] || '').toLowerCase();
      if (!p) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Presets: /preset terse | helpful | sarcastic | indonesian | pirate', timestamp: Date.now() }];
        return;
      }
      const valid = ['terse', 'helpful', 'sarcastic', 'indonesian', 'pirate'];
      if (!valid.includes(p)) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Unknown preset "${p}". Try: ${valid.join(', ')}`, timestamp: Date.now() }];
        return;
      }
      try {
        import('$lib/memory').then((m) => { m.setPersonaPreset(p); });
      } catch {}
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Persona preset: ${p}.`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/mode') {
      const mode = (slash[1] || '').toLowerCase();
      const supported = ['chat', 'goal'];
      if (!supported.includes(mode)) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Modes: ${supported.join(', ')}. Current: chat.`, timestamp: Date.now() }];
        return;
      }
      const gsM = getGameState();
      gsM.chatMode = mode as 'chat' | 'goal';
      window.dispatchEvent(new Event('gamestate-change'));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Mode: ${mode}${mode === 'goal' ? ' — every message becomes a goal step.' : ''}`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/write') {
      const rest = slash.slice(1).join(' ').trim();
      if (!rest) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Usage: /write <filename> — downloads the conversation as a .txt file.', timestamp: Date.now() }];
        return;
      }
      const safe = rest.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 60);
      const text = messages.map((m) => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = safe.endsWith('.txt') ? safe : safe + '.txt';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Downloaded: ${a.download}`, timestamp: Date.now() }];
      return;
    }

    if (slash[0] === '/mood') {
      const gs = getGameState();
      if (slash[1] === 'set' && slash[2]) {
        const valid = ['idle', 'happy', 'sleepy', 'proud', 'excited', 'focused', 'thinking', 'sad', 'angry', 'frustrated', 'tired'];
        const want = slash[2].toLowerCase();
        if (!valid.includes(want)) {
          messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Unknown mood "${want}". Try: ${valid.join(', ')}`, timestamp: Date.now() }];
          return;
        }
        gs.mood = want as 'idle' | 'happy' | 'sleepy' | 'proud' | 'excited' | 'focused' | 'thinking' | 'sad' | 'angry' | 'frustrated' | 'tired';
        window.dispatchEvent(new Event('gamestate-change'));
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Mood set to ${want}.`, timestamp: Date.now() }];
        return;
      }
      if (slash[1] === 'reset') {
        gs.mood = 'idle';
        gs.needs.energy = 100;
        window.dispatchEvent(new Event('gamestate-change'));
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'Mood reset to idle, energy restored.', timestamp: Date.now() }];
        return;
      }
      const rel = Math.min(1, gs.relationshipXp / Math.max(1, gs.relationshipXpToNext));
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `Mood: ${gs.mood} | Energy: ${gs.needs.energy}% | Relationship: ${rel.toFixed(2)}`, timestamp: Date.now() }];
      return;
    }
    if (slash[0] === '/recap') {
      const gs = getGameState();
      const recap = runDailyRecap((gs as any).chatMessages?.length ?? 0, 0);
      if (!recap) {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: 'No activity today to recap.', timestamp: Date.now() }];
      } else {
        messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `${recap.title}: ${recap.detail}`, timestamp: Date.now() }];
      }
      return;
    }

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
      ? { provider: pinnedProvider.id, model: pinnedProvider.models[0], taskType: 'CHAT' as any, topicBias: undefined }
      : routeMessage(text, providers);
    const routeForStats = rawRoute as any;
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
    const caps2 = loadCaps();
    const dailySpendNow = getDailySpend();
    const state2 = getTokenState();
    const totalProvSpend = Object.entries(state2.byRoute).reduce(
      (acc, [k, r]) => (k.startsWith(activeConfig.provider) ? acc + (r as any).cost : acc),
      0,
    );
    const decision = decideCall(caps2, {
      callUsd: 0, // unknown until recordTokenUsage; per-call block is for after-stream hooks
      provider: activeConfig.provider,
      totalUsdProvider: totalProvSpend,
      dailyUsdProvider: dailySpendNow.byProvider[activeConfig.provider] || 0,
      dailyUsdTotal: dailySpendNow.total,
    });
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
        const msg = (e?.message || '').toLowerCase();
        const isAbort = e?.name === 'AbortError' || msg.includes('aborted');
        if (isAbort) {
          // Silent cancel — drop placeholder, surface tasteful hint.
          messages = messages.filter((m) => m.id !== placeholderId);
          error = 'cancelled by user';
          return;
        }
        const transient =
          isAbort ||
          msg.includes('429') ||
          msg.includes('rate') ||
          msg.includes('timeout') ||
          msg.includes('network') ||
          msg.includes('fetch') ||
          msg.includes('503') ||
          msg.includes('504') ||
          msg.includes('500');
        if (!transient) throw e;
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
      const toolCall = parseAgentToolCall(reply);
      const stripped = toolCall ? reply.replace(toolCall.raw, '').trim() : reply;
      const toolNote = toolCall
        ? (() => {
            try {
              const r = handleTool(toolCall.name, toolCall.params);
              if (r.ok) {
                rememberEvent({ kind: 'success', title: `tool:${toolCall.name}`, detail: JSON.stringify(r.data).slice(0, 120), tags: ['agent-tool', toolCall.name.split('.')[0]], confidence: 0.85 });
                return `\n\n🔧 [tool: ${toolCall.name}]\n\`\`\`json\n${JSON.stringify(r.data, null, 2).slice(0, 600)}\n\`\`\``;
              }
              return `\n\n⚠️ [tool error: ${toolCall.name}] ${r.error}`;
            } catch (e: any) {
              return `\n\n⚠️ [tool error: ${toolCall.name}] ${e?.message || 'unknown'}`;
            }
          })()
        : '';
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
        const gsG3 = getGameState() as any;
        const goalsArr = (gsG3.goals || []) as Goal[];
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
              rememberEvent({ kind: 'lesson', title: 'AUTO-RETRY failed', detail: String((retryErr as any)?.message || retryErr), tags: ['self-correct', 'retry-fail'], confidence: 0.7 });
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

    rememberEvent({ kind: 'error', title: 'LLM error', detail: (error as any)?.message || 'stream failed', tags: [taskType.toLowerCase(), 'error'], confidence: 0.7 });
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
      ? { provider: pinnedProvider.id, model: pinnedProvider.models[0], taskType: 'CHAT' as any, topicBias: undefined }
      : routeMessage(text, providers);
    const route = raw as any;
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
