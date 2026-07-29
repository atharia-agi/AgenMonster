# Architecture

This document mirrors RFC-0001 captured decisions in [`docs/rfcs/0001-architecture.md`](docs/rfcs/0001-architecture.md).

## Core invariants

1. **Everything talks through `monster-bus`.** No crate may call another
   crate directly except through a `Bus` handle they were given at boot.
   This lets us run two bodies (desktop GPU crate, mobile Flutter UI) while
   sharing one Rust agent process — *one brain, two bodies*.

2. **All LLM transport is stream-only.** The agent loop consumes tokens
   incrementally; tool calls may interrupt the stream.

3. **All persistence is append-then-decay.** No truncate deletes. Memory
   items have a TTL and decay rate; only the *forget* tool may physically
   drop them (and is auditable).

4. **Self-evolution is cost-capped and consent-gated.** Default budget is
   $5 USD/day on model calls and 3 stage evolutions per day; per-user
   override available.

5. **The renderer is permissionless.** Pet animations cannot touch user
   apps or read clipboard. Only the agent (via `permission.os_control`) can.

6. **One binary ship target = one runtime.** Tauri 2 ships Win/Mac/Linux/
   iOS/Android from one Rust+Web codebase. Flutter mobile ships a separate
   Dart+cdylib binary but reuses all Rust crates via `monster-ffi`.

7. **Token-Driven Evolution.** Every API call returns tokens → tokens become
   XP → XP drives stage evolution. The monster literally "eats" API calls.

8. **Auto-detecting ModelSelector.** Providers are detected from API keys
   in `.env`. No hardcoded model selection — the system picks the best
   model per task type from what's available.

## Token-Driven Evolution Model

```
API Call → LLM Response → tokens (input + output)
  ↓
TokenTracker::track(usage)
  ↓
Runtime::feed_tokens(total)
  ↓
xp += total_tokens  (1 token = 1 XP)
  ↓
if xp >= xp_for_stage(next_stage):
    stage = next_stage
    stats = stats_for_stage(stage)
    // energy cap, regen rate, max skills, memory capacity all scale
```

### Stage Progression

| Stage | XP Threshold | Max Energy | Regen/hr | Max Skills | Memory |
|-------|-------------|------------|----------|------------|--------|
| Egg | 0 | 500 | 10 | 3 | 50 |
| Hatchling | 500 | 1000 | 25 | 8 | 200 |
| Baby | 2,000 | 2000 | 50 | 15 | 500 |
| Child | 8,000 | 3000 | 100 | 25 | 1,000 |
| Teen | 25,000 | 5000 | 200 | 40 | 2,500 |
| Adult | 80,000 | 8000 | 400 | 60 | 5,000 |
| Mega | 250,000 | 12000 | 800 | 100 | 10,000 |

### Unique Features

- **Hunger System**: Monster gets hungry after 30min without API calls, starving after 2hr
- **Dream Mode**: Idle monster generates creative text based on stage personality
- **Personality Drift**: Dominant task type (code/creative/research) affects mood
- **Mood Swings**: Mood changes based on hunger level, activity, and stage

## Model Selector Architecture

```
.env (API keys)
  ↓
ApiKeys::from_env()  [dotenvy]
  ↓
ModelSelector::detect(groq_keys, mistral_keys, anthropic, openai, gemini)
  ↓
TaskType::from_str("code") → Provider::Mistral, model: "codestral-latest"
  ↓
Router::route_stream(prompt, task_type, on_chunk)
  ↓
Groq (fastest) → Mistral (strong) → Anthropic → OpenAI → Gemini
```

### Task-Aware Selection

| Task Type | Selection Logic |
|-----------|----------------|
| `chat` | Balanced quality + cost |
| `code` | Prefers code-specialized models (Codestral, Llama) |
| `creative` | Flagship models (Claude, GPT-4o) |
| `vision` | Only vision-capable models (excludes Groq) |
| `fast` | Ultra-fast providers (Groq, Gemini Flash) |
| `summarize` | Cost-effective for large context |
| `analyze` | Large context + high quality |

## Concurrency model

- One Tokio **multi-thread runtime** owned by `monster-runtime` (on desktop,
  injected into Tauri's runtime via `tauri::async_runtime`).
- Each subsystem spawned as a long-running task: agent loop, scheduler,
  telemetry, eviction, memory consolidator.
- Sub-agent loops spawned per high-level task; tagged with the parent's
  `task_id` via `TraceContext`. Cancelled when parent finishes or vetoes.

## Build

| Target        | Command                                 | Output                  |
|---------------|-----------------------------------------|-------------------------|
| Desktop       | `cargo build -p agenmonster-desktop`    | `target/release/*.exe` (or `.app`/`.AppImage` per platform) |
| Mobile (A)    | `flutter build apk --release`           | `apps/mobile/build/app/outputs/flutter-apk/app-release.apk` |
| Mobile (iOS)  | `flutter build ios`                     | `apps/mobile/build/ios/Runner.app` |
| Headless CLI  | `cargo build -p monster-cli`            | `target/release/agenmonster` |
| Workspace     | `cargo build --workspace`               | `(all of the above` + cdylib) |

## CLI Commands

| Command | Description |
|---------|-------------|
| `agenmonster run [--stage <stage>]` | Start the pet in desktop mode |
| `agenmonster doctor` | Run health checks and report system status |
| `agenmonster keys` | Show detected API providers and key counts |
| `agenmonster models` | List available models + auto-selection per task type |
| `agenmonster chat <message>` | Quick LLM chat test with streaming output |
| `agenmonster search <query>` | Quick web search test (Tavily + Brave fallback) |
| `agenmonster status` | Full runtime state dump (JSON) |
| `agenmonster evolve` | Manually trigger evolution check |
| `agenmonster bench` | Run micro-benchmarks (6 suites) |
| `agenmonster sfx [--output <dir>]` | Export chiptune SFX files |
| `agenmonster skills` | List installed skills |
| `agenmonster version` | Show version info |

## Frontends → Bus producer/consumer table

| Component           | Subscribes to                        | Publishes                         |
|---------------------|--------------------------------------|-----------------------------------|
| Desktop Renderer    | `render.command`                     | `pet.interaction` (click/drag/hover)|
| Desktop Chat        | `agent.think`, `tool_call`, `render` | `user.task`, `pet.interaction`    |
| Mobile App          | `agent.think`, `tool_call`           | `user.task`                       |
| Mobile Overlay       | `render.command`                     | `pet.interaction`                 |
| Voice Service       | —                                    | `user.task (source=voice)`        |
| Memory Subsystem    | `memory.update` (self-loop)          | `memory.update` (when changed)    |
| Agent Loop          | `user.task`, `pet.interaction`       | `agent.think`, `tool_call`, `render` (on stage change) |
| Evolution           | `tool_call.result`                   | `skill.evolved`, `render`         |
| Scheduler           | time-trigger                         | `user.task (source=scheduled)`    |
| Telemetry           | —                                    | `telemetry`                       |
| MCP servers         | per their tool semantics             | `tool_call.result`                |
