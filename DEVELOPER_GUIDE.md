# Developer Guide

Welcome — you're going to add a subsystem to AgenMonster. This guide
walks through the principles and conventions.

## The 5 rules

1. **Bus-first.** No crate crosses dependencies except through
   `monster-bus::Bus`. Crates receive their bus handle at boot.

2. **Stream-only LLMs.** `monster-llm` produces streaming events. The
   agent loop consumes them token-by-token and may dispatch tools
   mid-stream.

3. **Append-only memory.** No truncation. Decay, never delete.

4. **Cost-capped evolution.** Self-evolution will refuse to run past
   daily budgets and requires user consent for stage changes.

5. **One runtime.** All crates share one `tokio::runtime::Runtime`. This
   is what makes "1 brain, 2 bodies" work — desktop and mobile share
   state via FFI rather than spawning separate processes.

## CLI Commands

```bash
# Start the pet
cargo run -p monster-cli -- run [--stage <stage>]

# Health checks
cargo run -p monster-cli -- doctor

# Show detected API keys
cargo run -p monster-cli -- keys

# List available models + auto-selection
cargo run -p monster-cli -- models

# Quick LLM chat test (streaming)
cargo run -p monster-cli -- chat "Hello, what are you?"

# Quick web search test
cargo run -p monster-cli -- search "what is rust programming"

# Full runtime state dump
cargo run -p monster-cli -- status

# Manually trigger evolution
cargo run -p monster-cli -- evolve

# Run benchmarks
cargo run -p monster-cli -- bench

# Export SFX files
cargo run -p monster-cli -- sfx [--output static/ogg]
```

## API Key Configuration

Create a `.env` file in the project root:

```env
# Groq (free tier, 11 keys for rotation)
GROQ_API_KEY=gsk_...
GROQ_API_KEY_1=gsk_...
# ... up to GROQ_API_KEY_10

# Mistral (10 keys)
MISTRAL_API_KEY_1=...
# ... up to MISTRAL_API_KEY_10

# Other providers (optional)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Search APIs
TAVILY_API_KEY=tvly-...
BRAVE_API_KEY=BSA...
```

Keys are auto-loaded via `dotenvy` at startup. The ModelSelector detects
which providers are available and picks the best model per task.

## Model Selection

The `ModelSelector` picks models based on task type:

| Task Type | Selection Logic |
|-----------|----------------|
| `chat` | Balanced quality + cost |
| `code` | Prefers code-specialized models |
| `creative` | Flagship models |
| `vision` | Only vision-capable models |
| `fast` | Ultra-fast providers |
| `summarize` | Cost-effective for large context |
| `analyze` | Large context + high quality |

## Building a new tool

Add a new tool in `crates/monster-tools/src/`. Use the `Tool` trait:

```rust
use crate::registry::{Tool, ToolInput, ToolOutput, ToolKind, ToolRegistry};

pub struct MyTool;
#[async_trait::async_trait]
impl Tool for MyTool {
    fn kind(&self) -> ToolKind { ToolKind::Browser }
    fn name(&self) -> &'static str { "my.tool" }
    fn description(&self) -> &'static str { "What it does, semantically clear." }
    fn permission(&self) -> Permission { Permission::Safe }
    async fn run(&self, input: ToolInput) -> ToolOutput {
        ToolOutput::ok(serde_json::json!({}))
    }
}

pub fn register(reg: &ToolRegistry) {
    reg.register(MyTool);
}
```

Then call `register` from `bootstrap_global()` in `Cargo.toml::web`.

### Safety

- `Permission::Safe` — no consent prompt
- `Permission::LocalFile` — single confirmation if first time today
- `Permission::SandboxedCode` — runs in subprocess; requires user OK
- `Permission::OsControl` — needs user OK EACH call

## Building a new skill

Skills live as `SKILL.md` files under `/skills/<topic>/`. Format:

```markdown
---
name: <kebab-case>
description: <pushy, full-sentence, ≥40 chars>
---
# Title

## Workflow
1. step
2. step

## Examples
**Example 1:**
Input: ...
Output: ...
```

After authoring, run `cargo run -p monster-cli -- skills validate`.

## Building a new game-stage

Stages are defined in `stages.json` and drive:

- Palette (7 colors, strict NES/SNES discipline)
- Sprite personality (eye style, tail, wings, accent)
- Tile background pattern
- Energy stats (cap, regen, max skills)
- Personality description
- Dream text templates

## Token-Driven Evolution

Every API call feeds XP to the monster:

```rust
// In your agent loop after an LLM call:
let response = router.route_stream(prompt, task, |chunk| {}).await?;
runtime.feed_tokens(response.total_tokens);

// Check if evolution happened
if let Some(new_stage) = runtime.try_evolve() {
    // Monster evolved! Trigger cutscene, update render, etc.
}
```

## Running Tests

```bash
# Run all 134 tests
cargo test --workspace

# Check for warnings
cargo check --workspace

# Run specific crate tests
cargo test -p monster-llm
cargo test -p monster-runtime
cargo test -p monster-tools
```

## Project Structure

```
agenmonster/
├── crates/
│   ├── monster-bus/        # Typed event bus
│   ├── monster-core/       # Common types
│   ├── monster-llm/        # LLM routing + ModelSelector
│   ├── monster-memory/     # SQLite memory
│   ├── monster-tools/      # 15+ tools
│   ├── monster-agent/      # Agent loop
│   ├── monster-evolve/     # Skill library
│   ├── monster-pixel/      # Pixel art engine
│   ├── monster-audio/      # Chiptune synth
│   ├── monster-tile/       # Tile patterns
│   ├── monster-render/     # Render subsystem
│   ├── monster-runtime/    # System boot
│   ├── monster-cli/        # CLI interface
│   ├── monster-ffi/        # C ABI
│   ├── monster-sync/       # libp2p sync
│   ├── monster-a11y/       # Accessibility
│   ├── monster-bench/      # Benchmarks
│   ├── monster-scheduler/  # Cron jobs
│   ├── monster-telemetry/  # Metrics
│   ├── monster-skills/     # Skill registry
│   ├── monster-asset/      # Asset pipeline
│   ├── monster-optim/      # Optimizations
│   ├── monster-tests/      # Integration tests
│   └── marketplace-registry/ # HTTP server
├── skills/                 # Shipped skills
├── apps/
│   ├── desktop/            # Tauri + Svelte
│   └── mobile/             # Flutter
├── docs/
│   ├── rfcs/               # Architecture RFCs
│   └── design/             # Design docs
└── .env                    # API keys (not committed)
```
