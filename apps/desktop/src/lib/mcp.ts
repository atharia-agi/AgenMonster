// MCP-style tool bridge — pure dispatcher. Lets external agents query and
// mutate the agent state. Each tool takes JSON params and returns a
// JSON-safe result. Wire to `/api/mcp` (HTTP) or `mcp-server.mjs` (stdio)
// by the transport layer; this module is transport-agnostic.
//
// Tools implemented (v1):
//   memory.recall    — returns top episodes + facts matching a query
//   memory.record    — upsert a typed fact (validates ontology)
//   memory.search    — keyword search across episodes + facts
//   memory.episodes  — returns recent episodes
//   memory.facts     — returns all facts (paginated later)
//   memory.topics    — returns top topics
//   memory.graph     — returns the memory graph payload (for viz)
//   chat.stats       — returns chat stats state
//   chat.tokens      — returns token state (route + cost)
//   chat.budget      — returns current caps + decision for a hypothetical call
//   chat.budget.set  — persists new caps
//   chat.theme       — returns/sets theme name

import { getMemoryState, getMemoriesForPrompt, upsertTypedFact, upsertFact, forgetEpisode, searchMemory, recallTopEpisodes, getTopTopics, recordTopic, exportMemoryJSON, rememberEvent } from './memory.ts';
import { getTokenState, getDailySpend } from './tokenTracker.ts';
import { loadCaps, saveCaps, decideCall, type SpendSnapshot } from './costGuard.ts';
import { loadTheme, saveTheme, applyTheme, describeTheme, type ThemeName } from './theme.ts';
import { getGameState, saveState } from './gameState.ts';
import { type Goal, type GoalStep, pickActiveGoal, buildGoal, buildGoalFromText, markStep, completeGoal, addStep, goalProgress, isGoalActive, isGoalComplete } from './goals.ts';

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

function ok<T>(data: T): ToolResult { return { ok: true, data }; }
function err(message: string): ToolResult { return { ok: false, error: message }; }

export function handleTool(name: string, params: any = {}): ToolResult {
  switch (name) {
    case 'memory.recall': {
      const query = String(params.query || '');
      const limit = typeof params.limit === 'number' ? Math.max(1, Math.min(8, params.limit)) : 3;
      return ok({ recalled: getMemoriesForPrompt(query, limit), state: getMemoryState() });
    }
    case 'memory.record': {
      const key = String(params.key || '');
      const value = String(params.value || '');
      const confidence = typeof params.confidence === 'number' ? params.confidence : 0.9;
      const r = upsertTypedFact(key, value, confidence);
      return r.ok ? ok({ stored: true }) : err(r.error || 'failed');
    }
    case 'memory.search': {
      const query = String(params.query || '');
      return ok(searchMemory(query));
    }
    case 'memory.episodes': {
      return ok({ episodes: recallTopEpisodes(12) });
    }
    case 'memory.facts': {
      return ok({ facts: Object.values(getMemoryState().facts) });
    }
    case 'memory.topics': {
      return ok({ topics: getTopTopics(10) });
    }
    case 'memory.graph': {
      return ok({ state: getMemoryState() });
    }
    case 'chat.stats': {
      return ok({ state: getTokenState(), daily: getDailySpend() });
    }
    case 'chat.tokens': {
      return ok({ state: getTokenState() });
    }
    case 'chat.budget': {
      return ok({ caps: loadCaps() });
    }
    case 'chat.budget.set': {
      const caps = params.caps;
      if (!caps) return err('missing caps');
      saveCaps(caps);
      return ok({ caps: loadCaps() });
    }
    case 'chat.theme': {
      const t = String(params.theme || '');
      if (t && (t === 'gb' || t === 'gb-night' || t === 'gb-dawn')) {
        saveTheme(t as ThemeName);
        applyTheme(t as ThemeName);
      }
      return ok({ theme: loadTheme(), label: describeTheme(loadTheme()) });
    }
    case 'memory.topic.record': {
      const topic = String(params.topic || '');
      const count = typeof params.count === 'number' ? params.count : 1;
      if (!topic) return err('missing topic');
      recordTopic(topic, count);
      return ok({ recorded: true });
    }
    case 'memory.episode.record': {
      const title = String(params.title || '');
      const detail = String(params.detail || '');
      const tags = Array.isArray(params.tags) ? params.tags : [];
      if (!title) return err('missing title');
      rememberEvent({ kind: 'user_note', title, detail, tags, confidence: 0.85 });
      return ok({ stored: true });
    }
    case 'memory.export': {
      return ok({ json: exportMemoryJSON() });
    }
    case 'goal.list': {
      const gs = getGameState();
      const goals = gs.goals ?? [];
      return ok({ goals: goals.map((g) => ({ ...g, progress: goalProgress(g) })) });
    }
    case 'goal.create': {
      const title = String(params.title || '').trim();
      const stepsRaw = String(params.steps || '');
      const stepTitles = stepsRaw ? stepsRaw.split('|').map((s) => s.trim()).filter(Boolean).map((s) => s.slice(0, 60)) : [];
      if (!title) return err('missing title');
      const goal = { ...buildGoal(title, stepTitles), source: 'tool' as const };
      const gs2 = getGameState();
      if (!Array.isArray(gs2.goals)) gs2.goals = [];
      gs2.goals.unshift(goal);
      if (gs2.goals.length > 30) gs2.goals.length = 30;
      saveState(gs2);
      return ok({ created: goal, progress: goalProgress(goal) });
    }
    case 'goal.markdone': {
      const goalId = String(params.goalId || '');
      const stepTitle = String(params.stepTitle || '').trim().toLowerCase();
      if (!goalId) return err('missing goalId');
      const gs3 = getGameState();
      const goals3 = gs3.goals ?? [];
      const idx = goals3.findIndex((g: Goal) => g.id === goalId);
      if (idx < 0) return err('goal not found');
      const step = goals3[idx].steps.find((s: GoalStep) => s.title.toLowerCase().includes(stepTitle));
      if (!step) return err('step not found');
      const updated = markStep(goals3[idx], step.id);
      gs3.goals[idx] = updated;
      saveState(gs3);
      return ok({ goal: updated, progress: goalProgress(updated) });
    }
    case 'goal.complete': {
      const goalId2 = String(params.goalId || '');
      if (!goalId2) return err('missing goalId');
      const gs4 = getGameState();
      const goals4 = gs4.goals ?? [];
      const idx4 = goals4.findIndex((g: Goal) => g.id === goalId2);
      if (idx4 < 0) return err('goal not found');
      const done = completeGoal(goals4[idx4]);
      gs4.goals[idx4] = done;
      saveState(gs4);
      return ok({ goal: done, progress: goalProgress(done) });
    }
    default:
      return err(`Unknown tool: ${name}`);
  }
}

export const TOOLS = [
  'memory.recall', 'memory.record', 'memory.search',
  'memory.episodes', 'memory.facts', 'memory.topics', 'memory.graph',
  'chat.stats', 'chat.tokens', 'chat.budget', 'chat.budget.set', 'chat.theme',
  'memory.topic.record', 'memory.episode.record', 'memory.export',
  'goal.list', 'goal.create', 'goal.markdone', 'goal.complete',
] as const;
