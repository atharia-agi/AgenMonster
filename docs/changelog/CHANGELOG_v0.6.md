# Changelog v0.6

## Added

### Audio synthesis (real chiptune)
- `monster-audio` crate: square/triangle/saw/noise oscillator + ADSR
  envelope + WAV export (16-bit 11025 Hz mono).
- 6 SFX presets: click, bark, happy, evolve, error, busy.
- `agenmonster-sfx` CLI writes all presets to
  `apps/desktop/static/ogg/*.wav`.

### Per-stage tile patterns
- `monster-tile` crate: 7 procedural tile patterns (cream-speck, grass,
  waves, mist, hearts, sun-rays, aurora) + accent, dialog, bloom tiles.

### Per-stage sprite metadata
- `apps/desktop/static/img/sprites/stages.json` — 7-stage config
  declaring palette swap, eye style, tail length, wing state, weapon,
  accent dots, and scroll-background per stage.
- Individual `stages/{egg,hatchling,...,mega}.json` — personality traits,
  preferred mood, default speech, idle bob amplitude.

### Runtime observability monitor
- `monster-runtime::monitor` — subscribes to all bus topics, logs
  structured events, provides `snapshot()` + `dump_json()` for
  `agenmonster doctor`.

### Energy economy
- `monster-runtime::economy` — atomic energy bar (1000 max, regen
  25/hr). LLM calls cost 5, tools cost 1, evo attempts cost 50,
  skill writes cost 20. Prevents runaway evolution loops.

### Outbound webhooks
- `monster-runtime::webhook` — Discord / Slack / HTTP POST webhooks
  fire on bus events, filterable by topic. Secret signing via
  `X-Signature` header.

### Computer-Use agent loop
- `monster-runtime::computer_use` — screenshot → vision plan → click/type
  loop. 15-step limit, structured trace log.

### Cross-device sync demo
- `monster-runtime::sync_demo` — two in-process peer nodes exercise
  the monster-sync protocol over TCP.

### E2E test suites
- `tests/e2e/desktop.spec.ts` — Playwright: pet renders, chat works,
  mood updates, keyboard shortcut.
- `tests/e2e/registry.spec.ts` — Playwright: healthz, index, 404,
  bad-sig rejection, star endpoint, static HTML.

## Fixed
- `monster-ffi` Cargo.toml had truncated `chrono` dep; now complete.
- `monster-tools/src/lib.rs` no longer references deleted `lib_mod.rs`.
