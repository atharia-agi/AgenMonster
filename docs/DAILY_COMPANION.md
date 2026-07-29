# AgenMonster -- Daily Companion Implementation Plan

> From smart tool to proactive companion. This is the full execution roadmap
> for making AgenMonster actually "alive" as a daily companion.
>
> Each item has a "done" definition, effort estimate, and test requirements.
>
> Current state: 300 unit tests, web-only SvelteKit 5, svelte-check clean, build green.

---

## Level 0 -- Foundation (already done)

| Item | Status |
|---|---|
| Zero-dep Node server (server.mjs) | DONE |
| Pure logic modules (no Svelte imports in src/lib/) | DONE |
| All keys server-side | DONE |
| svelte-check 0 errors / 0 warnings | DONE |
| 300 tests passing | DONE |
| 3-tier memory (episodes + facts + topics) | DONE |
| Cost guard (per-call, daily, per-provider) | DONE |
| MCP tools (19 tools) | DONE |
| Agent tool-call loop (__AGENT_MCP__:name|json) | DONE |
| Thread management + slash commands | DONE |
| Self-correction retry | DONE |
| Goal-oriented loop | DONE |
| Mobile responsive CSS | DONE |
| Dark/dawn themes + persona presets | DONE |

---

## Level 1 -- Companion Personality (Week 1)

Goal: the pet FEELS like a presence, not just a tool.

### 1.1 Mood & Energy State (src/lib/moodEnergy.ts)

Pure module. Exports: createPetState(), updateMood(), decayEnergy(), getMoodSummary(), getRelationshipScore().

Types:
```
interface PetState {
  mood: 'happy' | 'neutral' | 'tired' | 'bored' | 'frustrated';
  energy: number;            // 0.0 - 1.0
  relationship: number;      // 0.0 - 1.0 (trust + interaction score)
  lastInteractionTs: number;
  conversationCount: number;
  totalTokensToday: number;
  moodHistory: MoodEntry[];
}
interface MoodEntry { ts: number; mood: PetState['mood']; source: string; }
```

Logic:
- updateMood(pet, interaction) shifts mood based on interaction quality, frequency, user response time
- decayEnergy(pet, hoursSinceLast) drops energy if no interaction for >4h
- relationshipScore interactionHistory computes weighted score

Tests (tests/moodEnergy.test.ts): 8 tests total
- Mood shifts to tired after 8h idle
- Energy decays linearly over 24h
- Relationship +0.1 per followed suggestion, -0.05 per ignored
- Mood history capped at 30 entries (FIFO)
- getMoodSummary() returns today's dominant mood
- createPetState() has correct defaults
- Multiple interactions in sequence compound correctly
- Mood doesn't flip more than +-1 step per interaction

### 1.2 System Prompt Enrichment (src/lib/systemPrompt.ts)

Pure module. Exports: buildSystemPrompt(petState, activeGoal, memories) -> string.

Assembles full system prompt with:
- Base persona (from PERSONA_PRESETS)
- Active goal block (if any)
- Top-3 recalled memories
- Mood/energy summary -> modulates tone in the prompt
- Relationship context -> modulates formality/familiarity
- Drift note (if personality drift triggered)

Tests (tests/systemPrompt.test.ts): 5 tests
- Returns non-empty string
- Includes mood tone words when energy is low
- Includes goal block when active goal exists
- Includes recalled memories
- Relationship score affects greeting formality

### 1.3 Mood Slash Commands

/mood         -> shows current mood, energy, relationship score
/mood set <m> -> manual override (records as explicit user action)
/mood reset   -> resets mood to neutral, energy to 1.0

### 1.4 Pet-Initiated Interaction (Proactivity)

In +page.svelte onMount, start setInterval every 5 minutes:
- If energy > 0.6 AND lastInteraction > 60min -> pet initiates "Hey, how's it going?"
- If energy < 0.3 AND lastInteraction > 4h -> "You've been away a while -- come back when ready"
- If mood === 'bored' AND lastInteraction > 2h -> suggest topic from memory
- Each initiative logs rememberEvent({kind:'success', title:'pet-initiated', ...})

Tests (tests/proactivity.test.ts): 6 tests
- Timer callback fires when energy > 0.6 and idle > 60min
- Timer callback does NOT fire when energy < 0.3
- Timer callback does NOT fire within 60min of last interaction
- Initiative message appears in chat UI
- Initiative message recorded as memory episode
- Rate-limit: max 1 initiative per 30 minutes

---

## Level 2 -- Companion Memory (Week 2)

Goal: pet actually REMEMBERS and LEARNS from patterns.

### 2.1 Routine Detection (src/lib/routine.ts)

Pure module. Exports: detectRoutine(episodes) -> RoutinePattern[].

Logic:
- Scans episode timestamps for day-of-week + hour clustering
- Uses simple histogram: bucket episodes by (dayOfWeek, hourBucket)
- Find top clusters. Minimum 3 occurrences for a pattern
- Confidence = occurrences / total episodes

Types:
```
interface RoutinePattern {
  task: string;
  daysOfWeek: number[];
  hourRange: [number, number];
  confidence: number;
}
```

Tests (tests/routine.test.ts): 7 tests
- Empty episodes returns empty array
- 5 TypeScript episodes all on Mondays at 10am -> detects Monday 10am routine with confidence 1.0
- 3 episodes scattered across different days -> no routine (confidence < threshold)
- Minimum 3 occurrences required
- Returns sorted routines (highest confidence first)
- getRoutineForToday() returns only today's matching routine
- Routine with 3/10 episodes -> confidence 0.3 (filtered out)

### 2.2 Importance-Weighted Decay (src/lib/importance.ts)

Problem: currently all facts decay the same rate. User facts ("I prefer TypeScript") should persist longer.

Logic:
- Every fact has implicit importance from its namespace prefix:
  - user.*  -> importance 3 (never decay below 0.5)
  - project.* -> importance 2 (never decay below 0.3)
  - tool.*   -> importance 1.5
  - note.*   -> importance 1 (normal decay)
- importanceMultiplier = importance / 3 -> applied to decay rate
- Facts with importance >= 3 excluded from iterateDecay pruning entirely

Tests (tests/importance.test.ts): 6 tests
- user.* keys have importance 3
- project.* keys have importance 2
- tool.* keys have importance 1.5
- note.* keys have importance 1
- Importance 3 facts don't decay at all
- Importance 1 fact decays at full rate (backward compat)

### 2.3 Importance-Aware bumpFact

bumpFact now considers importance: when bumping user.* fact, confidence gain is 0.04 * importanceMultiplier.

Tests (add to memoryCurate.test.ts or new importanceCurate.test.ts): 2 tests
- user fact confidence grows faster than note fact on repeated bumps
- project fact has intermediate growth rate

---

## Level 3 -- Companion Relationships (Week 3)

Goal: pet KNOWS you and adapts to you.

### 3.1 Relationship Score Engine (src/lib/relationship.ts)

Pure module. Exports: recordInteraction(), computeRelationship(), getRelationshipLevel().

Logic:
Each chat interaction gets scored:
- User follows pet suggestion -> +0.1
- User ignores pet suggestion -> -0.05
- User manually changes pet behavior (preset, mode) -> +0.05
- User sends positive emoji (+1, thumbs up) -> +0.2
- User sends negative emoji (-1, thumbs down) -> -0.15
- User abandons chat mid-interaction -> -0.02

computeRelationship(records) -> weighted average, decaying old interactions (60-day half-life)
Score maps to level:
- Stranger (0-0.3): formal, no familiarity assumptions
- Acquaintance (0.3-0.6): helpful but reserved
- Friend (0.6-0.8): casual, slightly familiar
- Trusted Companion (0.8-1.0): personal, warm, knows your preferences

Tests (tests/relationship.test.ts): 7 tests
- Single positive interaction -> score ~0.1
- 10 positive, 0 negative -> score approaches 0.8 (Friend tier)
- 5 negative, 0 positive -> score approaches 0.2 (Stranger tier)
- Old interactions (61+ days) decay to near-zero weight
- Empty records returns 0 (Stranger tier)
- recordInteraction() rejects invalid action types
- Mixed actions (3 positive, 1 negative) -> weighted average correct

### 3.2 Relationship-Aware System Prompt

buildSystemPrompt now appends relationship context:
- Trusted Companion -> casual, familiar tone
- Acquaintance -> professional, helpful but reserved
- Stranger -> concise, no familiarity assumptions

Tests (add to systemPrompt.test.ts): 2 tests
- Tone changes based on relationship level in output
- Stranger tier does NOT use casual language

### 3.3 Daily Recap Auto-Generated (src/lib/dailyRecap.ts)

Called at session end (via installSessionEndHook in sessionEnd.ts).

Logic:
- Scans today's episodes (grouped by date)
- Generates compact summary: "Today you worked on [top 3 topics], [X] messages, [Y] goals completed, [Z] facts learned"
- Saves as rememberEvent({kind:'milestone', title:'Daily Recap', detail: summary, tags:['daily-recap'], confidence:0.9})

Tests (tests/dailyRecap.test.ts): 4 tests
- Returns summary string with topic names when episodes exist today
- Returns "No activity today" when no episodes
- Tags include daily-recap
- Confidence is 0.9 (high - recaps are reliable summaries)

### 3.4 Morning Wake-Up Message

When session starts AND it's the first interaction of the day:
1. Check if dailyRecap exists for yesterday -> reference it ("Yesterday you worked on X...")
2. Check if routine exists for today -> reference it ("It's Monday, your usual TypeScript time")
3. Check mood/energy -> match tone
4. Surface any pending goals ("You had [Y] goal in progress -- want to pick it up?")

Tests (tests/morningWakeup.test.ts): 4 tests
- First interaction of day triggers wake-up message
- Second+ interaction of same day does NOT trigger
- Wake-up includes yesterday's recap when available
- Wake-up excludes recap when no prior episodes exist

### 3.5 /recap Slash Command

User can manually trigger a day recap at any time via /recap.

About panel: +1 row -- "DAILY RECAP -- AUTOMATIC + MANUAL"

---

## Level 4 -- Companion Intelligence (Week 4)

Goal: pet gets SMARTER over time and anticipates needs.

### 4.1 Semantic Memory Index (src/lib/memoryIndex.ts)

Problem: searchMemory is substring match. "I debug Rust" stored but "how was my Rust work yesterday?" doesn't match.

Solution: Lightweight keyword extraction + inverted index (no external deps).

Logic:
- On every rememberEvent/upsertFact/recordTopic: extract keywords (split on spaces, remove stop words, lowercase, 3+ char)
- Store keywords: string[] on every episode in getMemoryState()
- searchMemory(query): tokenize query -> extract keywords -> match episode.keywords intersection
- recallTopEpisodes(limit) now also sorts by keyword overlap with recent context

Tests (tests/memoryIndex.test.ts): 6 tests
- extractKeywords removes stop words (the, a, is)
- extractKeywords lowercases and strips punctuation
- extractKeywords requires minimum 3 chars
- Semantic search finds "Rust" episode when query mentions "Rust programming"
- Semantic search returns empty array when no keyword overlap
- Semantic search sorts by overlap count (descending)

### 4.2 Habit Suggestions (src/lib/suggestions.ts)

Logic: getSuggestions(petState, routines, memories) -> Suggestion[]:
- If routine detected for today -> "Based on your Monday routine, want to start with TypeScript?"
- If memory contains a pending goal -> "You had a goal: deploy to AWS -- want to check progress?"
- If user ignored last suggestion -> don't suggest again (cooldown 24h)
- If it's Friday afternoon -> "Happy Friday! Want to review the week's accomplishments?"

Tests (tests/suggestions.test.ts): 5 tests
- Routine-based suggestion returned when routine exists
- Suggestion cooldown prevents repeat suggestions
- Friday suggestion returned only on Fridays (mockable date)
- Goal-pending suggestion returned when active goal exists
- Ignored suggestion triggers cooldown

### 4.3 Goal Persistence Beyond Session

Goals currently exist only in gameState. With daily companion, goals should survive browser refresh.

Logic:
- Store active goals in localStorage under agenmonster_goals
- On session start, load goals -> merge into gameState.goals
- On goal completion, persist doneAt timestamp

Tests (tests/goalPersistence.test.ts): 4 tests
- Goals persist to localStorage on completeGoal()
- Goals load from localStorage on session start
- Completed goals marked with doneAt timestamp
- localStorage corruption/JSON-parsing error handled gracefully (falls back to empty goals)

### 4.4 Memory Export with Context

Enhance exportMemoryJSON to optionally include moodHistory, relationshipScore, routines, goal status.

Tests (tests/exportEnhancement.test.ts): 3 tests
- Export with includeContext:true includes moodHistory
- Export with includeContext:false (default) -> backward compat, no moodHistory
- Import of enhanced export preserves context fields

---

## Level 5 -- Polish & Shipping (Week 5+)

### 5.1 Browser Notification API Integration
Request notification permission on first visit (settings -> Notifications toggle).
Morning wake-up messages trigger browser notifications when tab is backgrounded.

### 5.2 Companion Presence Indicator
Subtle animated indicator in MonsterStatus showing: awake / idle / dormant.
Dormant after 24h of inactivity -> gentle "I'll be here when you're ready" message on return.

### 5.3 Companion Analytics Dashboard (Settings -> Section 12 / Companion)
- Days active (streak)
- Total conversations
- Goals completed (lifetime)
- Mood distribution pie (happy/neutral/tired/bored/frustrated)
- Relationship level history (30-day)
- Top 5 routines detected

### 5.4 Companion Backup Automation
- Auto-export memory JSON daily at midnight -> localStorage backup slot
- Keep last 7 daily backups -> user can restore any of them
- /backup slash command -> manual export to file

### 5.5 Mobile Companion App (Phase 2 - Flutter)
Mirror of the web app + native notification support.
Companion appears in notification shade on mobile.
Quick-capture slash: /note "idea" -> saved to memory immediately from mobile.

### 5.6 Offline Intelligence (Phase 3 - WebAssembly LLM)
Embed a tiny LLM (like distilled Phi-3-mini via WebAssembly) for offline context.
Pet can still recall memories, summarize today, suggest routines without internet.
WebWorker runs offline model so it doesn't block the UI.

---

## Acceptance Criteria: "Daily Companion Gate"

When ALL Level 1 items are done AND ALL Level 2 items are done, the pet passes the Daily Companion Gate:

[ ] Pet initiates conversation within 2 hours of user being idle (energy > 0)
[ ] Pet remembers yesterday's recap this morning without being asked
[ ] Pet's mood shifts based on interaction patterns over the past week
[ ] User can run /mood and see a meaningful status
[ ] svelte-check remains 0 errors / 0 warnings
[ ] All new tests pass (target: 300 + 40 = 340+ tests)
[ ] npm run build is green
[ ] About panel has 50+ rows (all new features documented)

---

## Week-by-Week Rollout

Week 1:
  Mon:  moodEnergy.ts (core) + 8 tests
  Tue:  systemPrompt.ts enrichment + 5 tests
  Wed:  /mood slash commands + About panel rows
  Thu:  Proactivity timer (proactivity.test.ts -- 6 tests)
  Fri:  Integrate all Level 1 into ChatPanel
  Sat:  Full svelte-check + lint + build + 340 tests passing
  Sun:  Buffer day for fixes

Week 2:
  Mon:  routine.ts (core) + 7 tests
  Tue:  Routine block in system prompt + 2 tests
  Wed:  importance.ts + importance-aware bumpFact + 8 tests (importance: 3 + memoryCurate: 2 + memory.test.ts: 3)
  Thu:  Integrate into ChatPanel + sessionEnd + memory.ts
  Fri:  Full test suite -- target 360+ tests
  Weekend: Fix bugs, polish

Week 3:
  Mon:  relationship.ts (core) + 7 tests
  Tue:  Relationship-aware system prompt + 2 tests
  Wed:  dailyRecap.ts + morningWakeup + 8 tests
  Thu:  /recap slash command + About panel rows
  Fri:  Full integration test -- simulate 7 days of interactions
  Weekend: Fix bugs

Week 4:
  Mon:  memoryIndex.ts (keyword extraction + semantic search) + 6 tests
  Tue:  Suggestions engine (suggestions.ts) + 5 tests
  Wed:  Goal persistence (localStorage) + 4 tests
  Thu:  Export enhancement + 3 tests
  Fri:  Full svelte-check + lint + build
  Weekend: Bug fixes, about panel update to 50+ rows, docs/PROGRESS.md update

Week 5+:
  P5.1-5.6: Notifications, presence indicator, analytics dashboard, backup, mobile, offline

---

## Quick Reference: File Manifest

### New Files to Create
| File | Purpose | Tests |
|---|---|---|
| src/lib/moodEnergy.ts | Mood/energy/relationship state management | tests/moodEnergy.test.ts (8) |
| src/lib/systemPrompt.ts | Dynamic system prompt assembly | tests/systemPrompt.test.ts (5) |
| src/lib/routine.ts | Day-of-week pattern detection | tests/routine.test.ts (7) |
| src/lib/importance.ts | Importance-weighted decay | tests/importance.test.ts (6) |
| src/lib/relationship.ts | Interaction scoring + relationship levels | tests/relationship.test.ts (7) |
| src/lib/dailyRecap.ts | Auto-generated daily summaries | tests/dailyRecap.test.ts (4) |
| src/lib/memoryIndex.ts | Keyword extraction + semantic search | tests/memoryIndex.test.ts (6) |
| src/lib/suggestions.ts | Routine/goal/friday suggestions | tests/suggestions.test.ts (5) |
| tests/moodEnergy.test.ts | 8 tests | |
| tests/systemPrompt.test.ts | 5 tests | |
| tests/proactivity.test.ts | 6 tests | |
| tests/routine.test.ts | 7 tests | |
| tests/importance.test.ts | 6 tests | |
| tests/relationship.test.ts | 7 tests | |
| tests/dailyRecap.test.ts | 4 tests | |
| tests/morningWakeup.test.ts | 4 tests | |
| tests/memoryIndex.test.ts | 6 tests | |
| tests/suggestions.test.ts | 5 tests | |
| tests/goalPersistence.test.ts | 4 tests | |
| tests/exportEnhancement.test.ts | 3 tests | |

Total new tests from Level 1-4: 8+5+6+7+6+7+4+6+5+4+6+5+4+3 = 80 tests
300 current + 80 new = 380 target tests

### Modified Files
| File | What changes |
|---|---|
| src/lib/memory.ts | Import getFactImportance, apply to bumpFact and iterateDecay |
| src/lib/sessionEnd.ts | Call dailyRecap hook on session end |
| src/lib/goals.ts | Persist goals to localStorage on complete |
| ChatPanel.svelte | Proactivity timer, morning wake-up, mood-aware greeting |
| MemoryPanel.svelte | Show routine context in episode detail |
| SettingsPanel.svelte | Section 12 / COMPANION (mood, notifications, backup, analytics) |
| app.css | Companion presence indicator styles |
| README.md | Update test count + feature table |
| docs/PROGRESS.md | Session 9+ entries |
| docs/PLAN.md | Mark "Daily Companion Plan" as in-progress |
| AGENTS.md | Update compact summary |
| docs/DAILY_COMPANION.md | This file (NEW) |

---

## Invariant Rules (never break these)

1. Tests grow monotonically -- every feature ships with tests
2. svelte-check always green -- no warnings accepted
3. Pure logic + DOM glue -- src/lib/ modules NEVER import Svelte/SvelteKit
4. All keys server-side -- no provider keys in localStorage or exported JSON
5. About panel = source of truth -- every visible feature has an About row
6. Zero-dep -- no npm install required at runtime
7. npm test must pass before any commit-equivalent action

---

## Final Target Stats (Week 5)

| Metric | Current | Target |
|---|---|---|
| Unit tests | 300 | 380 |
| svelte-check errors | 0 | 0 |
| Build status | green | green |
| About panel rows | 45 | 55 |
| MCP tools | 19 | 22 (+3: mood, recap, suggest) |
| Personality dimensions | 1 (preset) | 3 (preset + mood + relationship) |
| Proactive features | 0 | 4 (morning wakeup, idle check-in, routine suggestion, Friday recap) |
| Memory intelligence | keyword only | keyword + semantic |
| User relationship | none | scored tiers (Stranger -> Companion) |

---

*This plan is the single source of truth for the daily companion phase. Read it top-down. Pick the highest-priority item in Level 1. Ship it fully. Update docs/PROGRESS.md with completion status. Move on.*
