# Changelog v0.6.1

## Added

### Computer-Use full agent loop
- `vision_planner.rs`: sends screenshots to Claude/GPT-4o vision endpoints,
  parses structured ActionPlan (click/type/hotkey/scroll/drag/wait/done).
- `computer_use.rs`: complete autonomous loop — screenshot → vision → action → repeat.
  15-step hard limit with full trace history.

### Per-stage animated backgrounds
- `monster-pixel::background`: 7 stage-specific patterns (dots, waves, stars, aurora, etc.)
  with correct palettes.
- `bg_animator.rs`: scrolling pixel-art backgrounds, outputs raw RGB888 buffers or
  CSS gradient strings for Svelte rendering.

### Evolution cutscene overlay
- `cutscene.rs`: 48-frame particle burst animation — burst → spin → reveal → settle.
  Per-frame particle positions, alpha blending, "EVOLVED!" text flash.
- `EvolutionCutscene.svelte`: renders cutscene on top of pet canvas.

### Per-stage speech accents
- `speechStyles.ts`: each of 7 stages has its own dialog box colors, border, and tail.
- `SpeechBubble.svelte`: pixel-perfect 8-bit RPG dialog box with word-wrap.

### Stage personality profiles
- `personality.rs`: per-stage behavioral traits, blink rates, bob amplitudes,
  attention-grab phrases, preferred moods.
- `idle_engine.rs`: drives background scroll, bob, blink, and attention-grab speech.

### Idle engine
- Drives idle animations based on personality profiles.
- Regens energy during idle time.

### E2E tests
- `desktop.spec.ts`: Playwright — pet renders, chat works, mood updates, keyboard shortcut.
- `registry.spec.ts`: Playwright — healthz, index, 404, bad-sig rejection, star, static HTML.

## Fixed
- `monster-ffi` Cargo.toml had truncated `chrono` dep; now complete.
- `monster-runtime` lib.rs now exports all new modules (monitor, economy, webhook, etc.).
- `monster-pixel` lib.rs exports background and bg_animator modules.
