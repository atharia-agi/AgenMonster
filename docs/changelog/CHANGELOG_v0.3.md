# Changelog v0.3 — Teen

## Designed

### Audio UX (end-to-end)
- `monster-runtime::audio_loop`: cpal-based mic capture → voice-activity-gated WAV → `voice.listen` → bus → agent → `voice.speak` → platform audio backend (`afplay`/`paplay`/Windows SoundPlayer/`ffplay`).
- iOS Live Activity (Swift WidgetKit) for the Dynamic Island pet.

### Computer-Use gestures
- `computer.snapshot` — platform-aware screenshot (PowerShell + System.Drawing on Win, `screencapture` on mac, `grim`/`maim`/`scrot` on Linux).
- `computer.mouse_click` — `SendInput` (Win) / AppleScript (mac) / `xdotool` (Linux).
- `computer.keyboard.tap` — `SendKeys` (Win) / AppleScript (mac) / `xdotool type` (Linux).
- `computer.mouse_move`.

### Autonomous evolver
- `monster-runtime::evoluer`: walks recent successful tasks, asks LLM
  to formalise a new skill YAML, validates with `SkillAuthoring`,
  writes to `~/.config/agenmonster/skills/<id>/SKILL.md`, publishes a
  `SkillEvolved { delta: Created }` event.

### Marketplace skeleton
- `SkillManifest` with content-hash + signature fields.
- `MarketplaceStore::install()` (UI server not yet wired).

### macOS Liquid Glass
- `apps/desktop/src-tauri/vibrancy.rs` calls `window-vibrancy::apply_vibrancy` with
  `Sidebar` material → liquid-glass feel on macOS 26+; no-op elsewhere.

## Quality

- New behavioural test module `audio_computer.rs` verifying:
  - Computer-use tools register.
  - `voice.speak` returns graceful error when `FAL_KEY` is unset.
  - `voice.listen` returns graceful error without audio input.
