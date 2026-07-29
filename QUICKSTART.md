# Quickstart

```bash
# 1. The full stack in dev (Windows / macOS / Linux)
cargo run -p agenmonster-desktop
#  → 256×256 floating pet + a chat panel, ready
#  → Right-click pet to summon chat
#  → Hotkey Ctrl+Shift+A also summons

# 2. Headless CLI on a server (SSH friendly)
ANTHROPIC_API_KEY=sk-... cargo run -p monster-cli -- ask "Plan my weekend"

# 3. Marketplace in one terminal
cargo run -p marketplace-registry --bin agenmonster-registry
#  → http://127.0.0.1:7777/v1/index

# 4. Bench any hot path
cargo run -p monster-bench --bin agenmonster-bench -- --only memory
#  median 0.85ms · cold 234.5ms · p99 1.32ms

# 5. Self-evolve: ask a real task and watch a new skill be authored
ANTHROPIC_API_KEY=sk-... cargo run -p agenmonster-desktop
#  → after first user task, monster-runtime spawns the evoluer (24h tick)
#  → check ~/.config/agenmonster/skills/<id>/SKILL.md
```

# Architecture

```
crates/
├── monster-bus        the typed in-process event bus
├── monster-runtime    boot, telemetry, scheduler, audio, evoluer, agent
├── monster-agent      occupy middle of pipeline; stream consumer
├── monster-llm        streaming transport (Anthropic + OpenAI + Ollama)
│                       includes adaptive router with cost ledger
├── monster-tools      tool belt: web / deep_research / shell / voice /
│                       computer-use / mcp / sandboxed code
├── monster-memory     3-tier (core / recall / archival), SQLite backed
├── monster-evolve     SkillLibrary + SkillLoader + SkillAuthoring +
│                       SkillHub (Ed25519) + marketplace (signed bundles)
├── monster-render     cross-platform voxel/pixel renderer
├── monster-telemetry  sys metrics
├── monster-scheduler  cron + one-shot
├── monster-sync       libp2p peer-to-peer (mDNS, request-response,
│                       gossipsub)
├── monster-wayland    wlr-layer-shell (Linux true overlay)
├── monster-a11y       platform AX tree extraction
├── monster-ffi        cdylib for Flutter
├── monster-bench      real micro-benchmark harness
├── monster-cli        worked build/dev/release/skills/registry/bench/doctor
├── marketplace-registry   axum HTTP server for skill registry
├── apps/desktop       Tauri 2 + Svelte 5
└── apps/mobile        Flutter 3.24 w/ flutter_overlay_window
```

# Self-evolution

`monster-runtime::evoluer` runs once per day (configurable) and:

1. Walks the last N tasks in recall memory.
2. Asks the LLM to pick a recurring pattern and draft a new skill YAML.
3. Validates with `SkillAuthoring` — kebab-case id, ≥40 char description,
   numbered-step body.
4. Writes to `~/.config/agenmonster/skills/<id>/SKILL.md`.
5. Emits `SkillEvolved { delta: Created }`.

The user sees a 1-line caption on the pet speech bubble:

> "I just learned how to debug Cargo.toml errors quickly."

# Cross-device sync

Run `monster-sync` on two devices:

```bash
agenmonster sync-demo mode=lan
```

Both peers:
- Discover each other via mDNS (`_agenmonster._udp.local`).
- Exchange skill bundles via `monster-sync/1.0.0` request-response.
- Hero patterns update broadcast via gossipsub.

# Marketplace registry

```bash
# Publish a signed bundle
agenmonster skills sign-install my-skill ./SKILL.md --key-b64 =base64secret=
#  → outputs base64sig + base64pubkey

curl -XPOST http://127.0.0.1:7777/v1/skill \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "my-skill", "version": "0.1.0", "author": "you",
    "author_pubkey": "<base64>", "signature_b64": "<base64>",
    "description": "...", "body_markdown": "...", "changelog": "..."
  }'

# Discover it:
curl http://127.0.0.1:7777/v1/index |
  jq '.[] | select(.id=="my-skill")'
```
