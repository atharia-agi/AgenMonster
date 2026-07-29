# RFC-0001: Architecture
status: accepted
deciders: @agenmonster/core
date: 2026-07-19

## Decision

Adopt the **bus-first, three-tier-memory, layered skill-library**
architecture. See `ARCHITECTURE.md` and `README.md`. The infra is:

1. 13 Rust crates + 2 app shells (Tauri desktop + Flutter mobile)
2. `monster-bus` as the in-process typed event bus
3. Three-tier memory (`monster-memory`)
4. Anthropic Skills filesystem layout under `/skills/`
5. Voyager-style evolution with cost caps

## Considered

- **Pure-agent single-binary** (Claude Agent SDK wrapper) — rejected for
  lacking evolution and persistence
- **Single Tauri-only desktop app, no Flutter** — rejected because iOS +
  Android overlays are uniquely Flutter
- **Hard-skinned pet, no actual growth** — rejects the central thesis of
  this project
- **Build a new LLM transport from scratch** — rejected, use the official
  Anthropic + OpenAI + Gemini SDKs.

## Consequences

- We commit to a Tokio multi-thread runtime in the desktop shell.
- Mobile shell depends on `monster-ffi` cdylib; must compile as cdylib+rlib.
