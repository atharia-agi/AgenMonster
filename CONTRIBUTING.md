# Contributing

1. Open an issue or RFC (in `docs/rfcs/`).
2. Fork → branch `feat/<slug>` → PR.
3. CI must pass: `npm test` (518 tests), `npm run lint` (svelte-check), `npm run build` (green).
4. New MCP tools must implement the `handleTool` interface in `src/lib/mcp.ts`.
5. New slash commands must be added to `src/lib/commands/slashCommands.ts`.
6. No commits of secrets, API keys, or license-bypassing vendored deps.
7. All new features must have ≥1 unit test.
8. `svelte-check` must be 0 errors, 0 warnings before merging.

Maintainers merge PRs by label:
- `agent:core` — gameState, engines, logic modules
- `agent:ui` — Svelte panels, CSS, interactions
- `agent:skills` — MCP tools, slash commands
- `agent:infra` — CI/CD, releases, e2e
- `agent:docs` — documentation updates
