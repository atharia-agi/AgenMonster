# AgenMonster

**A fully self-evolving, cross-platform AI monster companion — web edition.**

A floating 8-bit pet that lives on your desktop, browses the web, controls your apps, does deep research, and evolves skills over time. Built as a pure SvelteKit 5 + Svelte runes web app with a zero-dep Node production server.

## Quick Start

```bash
cd apps/desktop
npm install
npm run dev          # http://localhost:1420  (LLM proxy runs here)
npm run build        # static SPA in build/
npm run preview      # preview the production build (LLM proxy runs here too)
npm run start        # zero-dep Node server for the built SPA + LLM proxy
npm test             # happy-path unit tests
npm run lint         # svelte-check type/lint
```

## Architecture

- **Web-only SvelteKit 5 + Svelte runes** — no Tauri, no Rust, no Flutter. Pure web app with `adapter-static`.
- **Production server via `server.mjs`** — zero-dep Node.js server that serves the built SPA and proxies LLM requests.
- **All keys server-side** — provider API keys live only in `.env` / `process.env`. The browser never holds a key and never calls provider APIs directly, closing the key-exposure / CORS hole.
- **LLM proxy** — `vite.config.ts` dev middleware (`POST /api/llm`) and `server.mjs` production proxy route. Both enforce key confinement.
- **Tests**: 389/389 passing. svelte-check: 0 errors, 0 warnings. Build: green.
- **About panel** = source of truth. Every visible feature must appear there (45 rows).
- **MCP tools**: 19 tools (memory.*, chat.*, goal.*, config.*, theme.*, etc.) accessible via HTTP `POST /api/mcp` or stdio via `mcp-server.mjs`.
- **Typography**: Press Start 2P for titles only; Share Tech Mono for body. `--font-title` double-quoted in `app.css`.

## Key Features

| Feature | Status | Notes |
|---|---|---|
| SSE streaming + abort/cancel | Shipped | 120s timeout safety |
| State persistence + migration | Shipped | localStorage versioned |
| 3-tier memory brain | Shipped | Episodic + facts + topics, decay, reconsolidation |
| Slash commands | Shipped | /remember, /forget, /export, /import, /persona, /budget, /topics, /help, /goal, /goal done, /goal list, /goal create, /preset, /mode, /write |
| Cost guard + progress bars | Shipped | Per-call, daily, per-provider with warn/block tiers |
| Goal-oriented loop | Shipped | goals.ts — auto-detect intent, sub-step tracking, completion detection |
| Agent self-tool-call loop | Shipped | `__AGENT_MCP__:name|json` marker in LLM replies, auto-executed |
| Memory graph (SVG) | Shipped | Search + filter, node click → detail, opacity dimming |
| Thread management | Shipped | Multi-conversation threads with UI chip row + slash commands |
| Self-correction retry | Shipped | Falls back to different provider/model on weak replies |
| Dark + dawn themes | Shipped | `html[data-theme='gb-night']` / `gb-dawn` |
| MCP stdio runner | Shipped | `mcp-server.mjs` zero-dep Node stdio transport |
 - Playwright e2e scaffolding (5 smoke tests, 3 projects) | Scaffolded | `tests/e2e/` | | Daily Companion (5 levels) | Shipped | moodEnergy, systemPrompt, proactivity, routine, importance, relationship, dailyRecap, morningWakeup, memoryIndex, suggestions, analytics, backup, presence indicator |
| Advanced settings | Shipped | iterateDecay, chatMode toggle, memory pressure indicator |
| Persona presets | Shipped | terse, helpful, sarcastic, indonesian, pirate |
| `/write` download | Shipped | Downloads conversation as `.txt` |
| Cost-guard toast | Shipped | Red/yellow toast via `agenmonster:toast` event |

## LLM Proxy Security

Provider API keys live **only** in `.env` and are read server-side — by the Vite dev/preview middleware (`POST /api/llm`) and by the production `npm run start` server (`server.mjs`). The browser never sees a key and never calls provider APIs directly, which closes the key-exposure / CORS hole. To use chat, run via `npm run dev`, `npm run preview`, or `npm run start`. A pure static host without the proxy won't be able to reach the LLM.

## State Persistence

Pet progress persists to `localStorage` and is versioned + migrated against current defaults, so older saves don't break on schema changes. Use the Export/Import buttons in Settings (or Ctrl/Cmd+E / Ctrl/Cmd+I) to back up or move progress between machines.

## Task-Aware Routing

The chat uses a Router/ModelSelector (`src/lib/router.ts`) that detects the task type from each message (chat / code / creative / vision / fast / summarize / analyze) and picks the best available provider+model (server-decided from `.env` keys). The provider buttons act as pins; `AUTO` re-enables automatic routing.

## Typography

The pixel font (`Press Start 2P`) is reserved for titles only; all body / subtitle / chat text uses a readable monospace (`Share Tech Mono`).

## Testing

```bash
npm test             # 384 unit tests (node --test, no deps)
npm run lint          # svelte-check (0 errors, 0 warnings)
npm run build         # production build (green)
npm run test:e2e      # Playwright e2e (requires `npx playwright install` first)
```

## Roadmap

See [docs/PLAN.md](docs/PLAN.md) for the forward plan.

## License

MIT OR Apache-2.0








