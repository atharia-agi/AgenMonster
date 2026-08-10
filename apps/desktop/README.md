# AgenMonster
### Agent Companion Desktop App (Web Edition)

## Synopsis
SvelteKit 5 + Svelte runes web-only app — living pixel pet with MCP server-side AI proxy, cost guard, daily companion, goal tracking, world exploration, pet evolution, hub growth, and full memory system. 886 tests passing, 10/10 e2e pass, near-AGI 23-layer cognitive architecture with Deep Recursive Agent.

## Description
Web-only desktop app built with SvelteKit 5 and Svelte runes. Canvas 2D pixel-art pet renderer (PixelPetV2) with mood-driven visual stages, side-scrolling world exploration (6 areas, weather, seasons, NPCs), pet evolution (4 forms × 4 paths), hub growth (6 services, 7 quests), items/shops system (12 items), cost-guarded LLM proxy, and persistent memory via secondbrain MCP. Zero `as any` casts, strict TypeScript, all API keys server-side only.

**Deep Recursive Agent**: 1h near-AGI loop with 23-layer cognition architecture (SELF/THINKING/MEMORY/ACTION/LEARNING), self-narrative autobiography, persistent world graph, live pet form evolution driven by internal state (PAD emotion, mastery, lesson depth).

**Autonomous modes**: START 3H (continuous multi-turn loop with dream cycle + emotion + pet speech) + DEEP 1H (near-AGI with all 12 cognition modules + autonomous world + self-care).

## Architecture
- **Frontend**: Svelte 5 runes (web-only, no Tauri UI)
- **LLM Proxy**: `vite.config.ts` (dev) + `server.mjs` (prod) + `llmProxyCore.ts` (shared)
- **MCP Server**: `src/mcp-server.mjs` — stdio JSON-lines transport, 106 tools (19 local + 23 secondbrain + 64 browseros)
- **Memory**: secondbrain vault (`~/.claude/`) + localStorage app state
- **Key Management**: `.env` at repo root, keys never ship to browser

## Build & Test
```
npx svelte-check --tsconfig tsconfig.json   # 0 errors, 0 warnings
node --test --experimental-strip-types tests/*.test.ts   # 886 passing
npm run build   # production SPA to build/
npm run preview # preview production build on port 4173
npm run test:e2e # Playwright e2e (needs E2E_URL or preview server)
```

## Features
- **PixelPetV2**: 8-color scientific palette, mood-driven visuals, squash-stretch animation, dt-based render loop with adaptive throttling (30fps cap during animation, 10fps idle)
- **Collapsible workspace**: left/right sidebars + bottom bar toggleable (state persisted to localStorage), ChatPanel CONTROLS collapsed by default for a tall chat viewport
- **World exploration**: 6 areas, weather particles, parallax backgrounds, NPC AI patrol, area transitions
- **Pet evolution**: 4 forms, 4 paths (balanced/offensive/defensive/speed), SP regen, care/battle/exploration gates
- **Hub growth**: 6 services, 7 quests, 6 decorations, NPC visits, daily XP, leveling
- **Items & shops**: 12 items (potions, materials, keys, equipment), buy/sell/use, Rin's shoppe + Vee's stall
- **NPC friendship**: persisted friendship levels, repeat dialogue, relationship tracking
- **Story quests**: 13 story events with chained quests, choice effects, rewards
- **Pet mood/energy gameplay**: movement speed, encounter chance, win rate scale with energy
- **MCP Tools**: 106 tools — memory.*, chat.*, goal.*, config.*, theme.*, world.*, browseros.*
- **Daily Companion**: 5 levels (moodEnergy → automation + analytics)
- **Cost Guard**: per-call, daily, per-provider progress bars with warn/block tiers
- **Goal-Oriented Loop**: auto-detect intent, sub-step tracking, completion detection
- **Focus mode**: Ctrl+Shift+F collapses sidebars + bottom bar
- **Mobile responsive**: media queries at 768px/480px
- **Deep Recursive Agent (1h near-AGI)**: 23-layer cognition architecture, self-narrative autobiography, persistent world graph, live pet form evolution
- **Autonomous modes**: START 3H + DEEP 1H buttons with live status tracking turn count, runtime, skills, errors

## Key Modules
- `llmProxyCore.ts` — shared proxy core (PROVIDERS, resolveKey, prepareUpstreamRequest, readBody)
- `src/lib/render/PixelPetV2.svelte` — main canvas renderer (adaptive 30fps/10fps loop)
- `src/routes/+page.svelte` — collapsible workspace shell + rAF-coalesced gamestate re-render
- `src/lib/panels/MonsterHeader.svelte` — static stage icon (no always-on canvas)
- `src/lib/worldEngine.ts` — 6 areas, weather, seasons, travel, questFlags, npcFriendship
- `src/lib/eventEngine.ts` — NPCs, wild encounters, events, story chains, requirement checks
- `src/lib/petEvolution.ts` — forms, paths, evolution logic, SP regen
- `src/lib/hubGrowth.ts` — services, quests, decorations, NPC visits, daily XP
- `src/lib/items.ts` — 12 item definitions, effects, shop helpers
- `src/lib/panels/WorldPanel.svelte` — side-scrolling canvas, parallax, weather particles, NPC sprites
- `src/lib/panels/TopNav.svelte` — focus mode button, expanded tabs (WORLD, EVENTS, EVOLVE, HUB)
- `src/lib/panels/SettingsPanel.svelte` — configuration UI (themes, audio, AI config, backup)

## Install
`npm install agenmonster-desktop`

## License
MIT
