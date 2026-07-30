version: "0.2"

What's new since 0.1:

### persistence
- `monster-memory`: three-tier persistence via SQLite (rusqlite). Schema
  in `crates/monster-memory/src/{block,recall,archival}.rs`.

### tools
- `voice.speak` via fal.ai CSM-1B
- `voice.listen` via local whisper.cpp subprocess (zero-config fallback to
  fal.ai whisper).
- `mcp.call`: real JSON-RPC 2.0 stdio client; enumerates 6 servers at
  boot (`playwright`, `browseros`, `firecrawl`, `exa`, `github`,
  `filesystem`).
- `web.deep_research` now uses iterative multi-pass synthesis with
  per-iteration budget.
- `os.shell_safe` allow-list + 30s timeout + forbidden-pattern blocking.
- `python.eval_sandbox` and `node.eval_sandbox`: env-cleared subprocess.

### agent
- real streaming consumption in `monster-agent::loop_main`; emits
  `AgentThinkDelta` events per token to the bus.
- memory commit + skill-evolution acknowledge after each user task.

### evolution
- `SkillLoader` discovers skills under `/skills/`.
- `SkillAuthoring` validates kebab-case ids, ≥40 char descriptions,
  numbered-step bodies, optional code fences.
- `monster-evolve` writes skills to `~/.config/agenmonster/skills/`.

### scheduler
- `cron` validator; supports both 5-field Unix cron and 6-field with
  seconds.
- one-shot timestamp via `at_iso`.
- due-tracking on each entry.

### tests
- `crates/monster-tests` smoke + behavioural tests for bus, tools,
  scheduler, evolution.
