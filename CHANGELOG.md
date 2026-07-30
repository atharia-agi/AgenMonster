# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.github/workflows/release.yml` — automatic release-draft creation on any `v*` tag push (cross-compiles GNU-Windows EXE + portable ZIP + SHA256 checksums)
- `.github/workflows/desktop.yml` — upgraded to `tauri-action@v2`; added GNU-Windows cross-compile job
- `PRODUCTION.md` — code-signing setup guide (OV/EV certs, osslsigncode, signtool, signing in CI)
- `CODEOWNERS` — default ownership to `@atharia-agi`
- NSIS Windows installer target in `tauri.conf.json` (user-mode install, desktop + start menu shortcuts)
- SHA256 file verification + code-signing support in `installer/Install-AgenMonster.ps1`
- `agenmonster://` protocol handler registration in installer
- Full VERSIONINFO in `app.rc` (copyright, original filename, product description, URL comment)

### Changed
- `tauri.conf.json` CSP from `null` to permissive localhost + HTTPS policy
- `tauri.conf.json` updater plugin enabled with GitHub Releases endpoint
- `tauri.conf.json` Windows bundle: publisher, copyright, category, NSIS options
- `installer/Install-AgenMonster.ps1` full rewrite with SHA256 QA_HASHES.txt verification, osslsigncode/signtool signing, richer ARP registration, protocol handler installer
- `GameState` interface expanded: Mood / Stage / RelationshipLevel / Needs / Activity / Skill / MemoryCrystal / ActiveTask now exported from `gameState.ts`
- `GameState.needs` expanded from 3 to 7 properties (hunger, affection, energy, focus, mood, motivation, knowledge)
- `FriendshipLevel.svelte` prop `level` accepts `number | string`
- `SettingsPanel.svelte` destructured `state` prop renamed to `petState` to fix Svelte 5 rune ambiguity
- 41 svelte-check errors fixed across 12 files → 0 errors, 0 warnings
- Base font size increased from `10px` to `12px` with `font-weight: 600` for improved readability
- `memory.ts` mutators (`rememberEvent`, `upsertFact`, `upsertTypedFact`, `bumpFact`, `forgetFact`, `forgetEpisode`, `forgetStaleEpisodes`, `recordTopic`, `setPersona`, `importMemoryJSON`) now defer `persist()`/`notify()` via `schedulePersist()`/`scheduleNotify()` to eliminate main-thread blocking during chat
- `getMemoriesForPrompt` reconsolidation now happens synchronously in-memory (no async batch), with persist/notify deferred
- `PixelPetV2.svelte` sprite proportions adjusted: head 5px (was 6), body 5px (was 4), legs 4px (was 3), arms repositioned closer to torso
- Theme system: `applyTheme(loadTheme())` called on app startup in `+layout.svelte` so saved theme persists across reloads
- `SettingsPanel.svelte` theme selector wired to real theme switching (`gb` / `gb-night` / `gb-dawn`) with `saveTheme()` + `applyTheme()`
- `SettingsPanel.svelte` CSS fully rewritten from hardcoded modern glassmorphism to GBA pixel-theme CSS variables (`--gb-bg`, `--gb-panel`, `--gb-border`, `--gb-text`, `--gb-stroke`, `--font-body`)
- `gameState.ts` `saveState` now uses direct `localStorage.setItem` instead of deferred scheduler to prevent state desync

### Deprecated
- Removed nested `apps/desktop/src-tauri/src-tauri/` — stray duplicate of the real src dir

### Security
- All secrets migration paths updated: `.env`confirmed gitignored and absent from all commits
- `.env.example` committed as zero-secret template only
- `tokenTracker.estimateCost()` — pre-flight cost estimation so cost-guard hard-blocks over-budget calls BEFORE any network request
- `src/mcp-server.mjs` import path fixed (`./lib/mcp.ts`) — stdio MCP server actually boots now

### Changed (Round 2 — Shipping-grade refactor)
- `ChatPanel.svelte` god-component decomposed: 1041 → 647 lines
  - 22 slash commands extracted to `src/lib/commands/slashCommands.ts` (pure dispatcher, no Svelte coupling)
  - cost-guard evaluation, transient-error classification, and agent tool dispatch extracted to `src/lib/chatEngine.ts` (+12 unit tests)
  - transient-retry + abort classification now uses shared `isTransientError` / `isAbortError`
- `GameState` fully typed: replaced 9 `any[]` fields with real interfaces (`Mission`, `ChatMessage`, `ToolInfo`, `MemoryItem`, enriched `Skill`, `MemoryCrystal`, `ActiveTask`)
  - `ChatMessage.timestamp` required; crystal identity unified on `title` (legacy `label` dropped)
  - panels (`TodaysMissions`, `MemoryCrystals`, `BottomStatusBar`, `Achievements`) now import shared types from `gameState.ts` instead of declaring local anonymous shapes
- Backup automation: tracks last-backup date in localStorage; no longer misses days if app is closed at midnight
- Repo hygiene: removed ~277MB root binaries (`mingw64.zip`, portable zip, `vs_buildtools.exe`, font zips), junk files `16`/`24`/`8`, all committed log/dump files, 10 one-off Python debug scripts, 5 dead components (`MemoryPanel`, `MemoryGraph`, `MinimizedBar`, `SkillTree`, `CollapsiblePanel`), 5 empty dirs; untracked 85 generated `.svelte-kit/output` files; `CHANGELOG_v0.x.md` history consolidated into `docs/changelog/`
- Test count: 427 → **439 passing** (+12 chatEngine tests); svelte-check 0 errors, 0 warnings; build green

---

## [1.0.0] — 2025-07-29

### Added
- Initial release of AgenMonster Desktop via Tauri 2
- Floating 8-bit pet window with system-tray integration and global shortcut
- Agent tool-call loop (`__AGENT_MCP__:name|json`) 
- 3-tier memory brain (episodic + facts + topics, decay, reconsolidation)
- 427 passing unit tests; svelte-check 0 errors, 0 warnings
- PowerShell installer (`installer/Install-AgenMonster.ps1`)
- Portable bundle (`AgenMonster-portable-win64.zip`)
- NSIS installer script scaffolded in installer/
