# AgenMonster
### Agent Companion Desktop App

## Synopsis
SvelteKit 5 + Svelte runes web-only desktop app — PixelPetV2 animated companion with MCP server-side AI proxy, cost guard, daily companion, goal tracking, and full memory system.

## Description
Web-only desktop app built with SvelteKit 5 and Svelte runes. Canvas 2D pixel-art pet renderer (PixelPetV2) with mood-driven visual stages, cost-guarded LLM proxy, and persistent memory via secondbrain MCP. Zero `as any` casts, strict TypeScript, all API keys server-side only.

## Architecture
- **Frontend**: Svelte 5 runes (web-only, no Tauri UI)
- **LLM Proxy**: `vite.config.ts` (dev) + `server.mjs` (prod) + `llmProxyCore.ts` (shared)
- **MCP Server**: `src/mcp-server.mjs` — stdio JSON-lines transport, 19 tools
- **Memory**: secondbrain vault (`~/.claude/`) + localStorage app state
- **Key Management**: `.env` at repo root, keys never ship to browser

## Build & Test
```
npx svelte-check --tsconfig tsconfig.json   # 0 errors, 0 warnings
node --test --experimental-strip-types tests/*.test.ts   # 439 passing
npm run build   # production SPA to build/
```

## Features
- **PixelPetV2**: 8-color scientific palette, 4 growth stages (egg/teen/adult/mega), mood-driven visuals, squash-stretch animation, dt-based render loop
- **MCP Tools**: 19 tools — memory.*, chat.*, goal.*, config.*, theme.*
- **Daily Companion**: 5 levels (moodEnergy → automation + analytics)
- **Cost Guard**: per-call, daily, per-provider progress bars with warn/block tiers
- **Goal-Oriented Loop**: auto-detect intent, sub-step tracking, completion detection
- **AI & Tools Config**: settings panel with auto-detect, provider dropdown, manual API key, custom endpoint

## Key Modules
- `llmProxyCore.ts` — shared proxy core (PROVIDERS, resolveKey, prepareUpstreamRequest, readBody)
- `src/lib/render/PixelPetV2.svelte` — main canvas renderer
- `src/lib/panels/SettingsPanel.svelte` — configuration UI (themes, audio, AI config, backup)
- `src/lib/panels/Diagnostics.svelte` — cost guard + token/latency dashboard
- `src/lib/mcp-server.mjs` — MCP stdio server

## Install
`npm install agenmonster-desktop`

## License
MIT
