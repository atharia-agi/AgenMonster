# Changelog v0.5 — Mega

## Added

### Marketplace registry (real HTTP server)
- `agenmonster-registry` (axum + SQLx + SQLite) boots an HTTPS-style
  registry on `127.0.0.1:7777` (configurable via `REGISTRY_ADDR`).
- Endpoints: `GET /v1/index`, `GET /v1/skill/:id`, `GET /v1/skill/:id/:vN`,
  `POST /v1/skill`, `POST /v1/skill/:id/star`, `GET /v1/healthz`.
- `POST /v1/skill` validates Ed25519 signature over body, hashes with
  SHA-256, persists to disk + SQLite.
- File-server under `/` serves the bundled static `index.html` admin UI.

### Accessibility tree extraction
- `monster-a11y::root_tree()` returns the full OS-native a11y tree:
  - macOS: AppleScript System Events AX hierarchy
  - Windows: PowerShell + UIAutomationClient
  - Linux: AT-SPI via `dbus-send`
- Returns a uniform `A11yTree` struct compatible with the
  `computer.snapshot` tool's vision-augmented mode.

### Performance benchmarking harness
- `agenmonster-bench` runs 6 micro-benchmarks against real crates:
  - `bus_publish_subscribe_roundtrip`
  - `memory_core_set_get_roundtrip`
  - `memory_archival_add`
  - `tool_registry_lookup`
  - `skill_authoring_validate`
  - `skill_loader_discover`
- Reports cold/warm/median/p99 in JSON or human form, filterable
  with `--only`.

### Tauri capabilities hardening
- `apps/desktop/src-tauri/capabilities/default.json` formalises window
  capabilities:
  - `pet-floating` allows only `core:event:default`, `core:webview:default`, `core:window:default`, `monster:invoke:user`.
  - `chat-main` adds `core:fs:allow-read`/`allow-write` for
    `~/.config/agenmonster`.
- All invoke handlers whitelisted by name.

## CLI surface additions
- `agenmonster registry [--addr 127.0.0.1:7777] [--db ./registry.db] [--dir ./bundles]`
- `agenmonster bench [--json] [--only <filter>]`
- `agenmonster sync-demo <mode>` placeholder for two-node live sync.
