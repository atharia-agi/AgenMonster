# Sound

> Chiptune only. NES-APU / SNES-SPC statically synthesised square waves
> via 1-bit leadsheet. No sample chunks.

## Rules
- Square / triangle / noise channels only. No sine waves.
- Single channel per event (no chords), volume 60-80% peak.
- Normalised: every sound asset in `apps/desktop/static/ogg/` is
  max 4 seconds, 32 kHz, mono.
- 4-beat-quantised when played during pet speech — no half-step.

## Inventory
1. **click**   — 60 ms square pluck (filtered with envelope)
2. **bark**    — 120 ms dual ramp (click-and-respond)
3. **happy**   — 4-note rising arpeggio
4. **evolve**  — 8-note bright rising scale + crackle noise burst
5. **busy**    — 90 ms busy-noise tock
6. **error**   — triangle-falling 4-note pattern

## Pattern
- Volume at 0 dB FS, no compression.
- Each asset ships as `.ogg` 32 kHz mono, max 60 kB.
- Pet speech does NOT use audio SFX — voice.speak is the only audio
  for chat reply.

## Implementation
- `crates/monster-tiny-audio/` (skipped in v0.1) plans to emit these
  from a SunVox-like pattern file. For now we use sfxr export and
  embed.
