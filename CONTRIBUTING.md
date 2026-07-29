# Contributing

1. Open an issue or RFC (in `docs/rfcs/`).
2. Fork → branch `feat/<slug>` → PR.
3. CI must pass: `cargo fmt`, `cargo clippy -- -D warnings`,
   `cargo test --workspace`, `flutter analyze`, `flutter test`.
4. New tools must implement `monster-tools::registry::Tool`.
5. New skills must follow the Anthropic Skills format (YAML frontmatter
   `name`, `description`) and live in `/skills/<topic>/SKILL.md`.
6. No commits of secrets, API keys, or license-bypassing vendored deps.

Maintainers merge PRs by label:
- `agent:core` — crate owners
- `agent:ui`   — frontends
- `agent:skills` — Skills library
- `agent:infra` — CI/CD, releases
