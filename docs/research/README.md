# Research Synthesis (2026-07-19)

Compiled from internal research sub-agents. Full reports under
`docs/research/{engines,desktop-frameworks,agents,memory,mobile}.md`
TODO: lift reports here as they are produced.

## TL;DR choices

- Pet engine: **Macroquad** (def) or **raylib** (alt) — both Rust-friendly.
- Desktop shell: **Tauri 2** with Flutter mobile hybrid.
- Mobile: **flutter_overlay_window** (Android) / in-app+LIVE (iOS).
- Memory: **SQLite + Qdrant Edge (+ optional Graphiti for temporal).
- Agent framework: **Custom** AgentLoop (Anthropic Messages) on top of
  tools + skills — leaning into the bus-first approach.
- Self-evolution: Voyager loop + Anthropic Skills YAML.
