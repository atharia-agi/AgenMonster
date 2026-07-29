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

### Deprecated
- Removed nested `apps/desktop/src-tauri/src-tauri/` — stray duplicate of the real src dir

### Security
- All secrets migration paths updated: `.env`confirmed gitignored and absent from all commits
- `.env.example` committed as zero-secret template only

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
