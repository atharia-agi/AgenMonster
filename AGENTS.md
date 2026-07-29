# AgenMonster — Agent Compact

## Current State
- **Web-only SvelteKit 5 + Svelte runes** app in `apps/desktop`
- **389 tests PASSING**, 0 failures. Build: green. svelte-check: 0 errors, 0 warnings.
- **About panel**: 45 rows (all shipped features documented)
- **MCP tools**: 19 (memory.*, chat.*, goal.*, config.*, theme.*, etc.)
- **MCP server**: `src/mcp-server.mjs` — stdio JSON-lines transport (zero-dep)
- **Agent tool-call loop**: `src/lib/agentToolCall.ts` — pure parser for `__AGENT_MCP__:name|json` marker

## Key Features Shipped
- Goal-oriented loop (`goals.ts`) — auto-detect intent, sub-step tracking, completion detection
- Cost guard progress bars in Diagnostics (per-call, daily, per-provider, warn/block tiers)
- Active goal chip in MonsterStatus ribbon
- MCP goal.* tools (`goal.list/create/markdone/complete`)
- Thread management + slash commands
- Self-correction retry (different provider on weak replies)
- Graph search/filter + node click detail
- Dark/dawn themes, persona presets, `/preset`, `/mode`, `/write` slash
- Cost-guard toast, memory pressure indicator, AdvancedSettings
- Mobile responsive CSS
- Playwright e2e scaffolding (5 smoke tests, 3 projects)
- Daily Companion (5 levels, 389 tests) — moodEnergy, systemPrompt, proactivity, routine, importance, relationship, dailyRecap, morningWakeup, memoryIndex, suggestions, analytics, backup automation, presence indicator

## Architecture
- All keys server-side (`.env` + `process.env`)
- LLM proxy: `vite.config.ts` (dev) + `server.mjs` (prod)
- `node --test --experimental-strip-types tests/*.test.ts` runs tests
- `npm run build` for production SPA

## Offline Constraints
- No `npm install` — all deps pre-installed
- Windows PowerShell (no `&&`, no `grep`, no `wc`, no `tail`)
- Use `cmd /c` for bash commands or use native PowerShell cmdlets

## Next Steps
1. DAILY_COMPANION.md all 5 levels shipped ✅
   - Level 1: moodEnergy, systemPrompt, proactivity ✅
   - Level 2: routine, importance, dailyRecap, morningWakeup ✅
   - Level 3: relationship, systemPrompt integration ✅
   - Level 4: memoryIndex, suggestions, goals persistence, export enhancement ✅
   - Level 5: presence indicator, analytics, backup automation ✅
2. Playwright e2e execution once online
3. README.md refreshed to reflect web-only architecture ✅







