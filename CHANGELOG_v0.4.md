# Changelog v0.4 — Adult

## Added

### Cross-device sync (`monster-sync`)
- libp2p + mDNS + identify + request-response + gossipsub protocol
  `monster-sync/1.0.0`. Peers discover on local network automatically
  and exchange skill YAML, memory digests, and schedules via custom
  protocol.

### Linux Wayland connector (`monster-wayland`)
- Real `gtk4-layer-shell` binding; pin pet to any screen edge with
  exclusive zone management. No-op on other platforms.

### Full CLI surface
- `agenmonster build verify|dev|build|release` — format, clippy, test,
  build, tag, version-bumping CHANGELOG.
- `agenmonster skills list|validate|show|open|sign-install` — discovery,
  validation, signing.
- `agenmonster doctor` — comprehensive env / binary / API key scanner.

### Adaptive routing (`monster-llm::adaptive`)
- Computes TaskComplexity from prompt tokens + tool count.
- Picks provider/model by complexity; falls back to local Ollama on
  cost-cap overflow; logs every call to a `CostLedger`.

### Skill Hub (`monster-evolve::skill_hub`)
- Ed25519-signed skill bundles. `SkillHub::verify()` rechecks
  signature + blake3 content hash. `SkillHub::install()` validates
  then writes into the local registry.

### WASM demo
- `wasm/` workspace with a `wasm-pack`-style static-renderable HTML.
- Reads API keys from localStorage, boots a partial runtime in the
  browser (no OS controls); useful as a web preview.

### Ed25519 signing pipeline
- CLI `skills sign-install` produces a signed `SkillManifest` —
  base64 ed25519 secret → ed25519 signature body.
