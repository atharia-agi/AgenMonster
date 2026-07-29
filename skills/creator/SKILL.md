---
name: monster-tool-creator
description: Self-improve loop for the agent's own tool belt. Use whenever the agent needs a tool that does not exist in the registry, when authoring a new Rust tool, when wiring a new MCP server, when writing a new YAML skill body, or when asking "could I do this without the user having to leave the chat?". Triggers on phrases like "build me a tool", "I want a custom action", or any time the agent fails to find a matching tool after 2 attempts.
---

# Tool & Skill Creator

The agent's *meta-capability*: it can write its own tools.

## Decision tree

```
need_tool?
├─ not found in registry (after `web.search` for prior art)
├─ is it safe (no exfiltration, no OS privilege without consent)?
│   └─ no → ASK USER
│       yes ↓
└─ write `propose_tool_spec(name, desc, schema)`
    ├─ Rust: register in `monster-tools/src/`, hot-test in `tools tests`
    └─ YAML: register as a new skill under `/skills/<topic>/SKILL.md`
```

## Sandbox tests

Before promoting:
1. Run `tool_test_pass(input_fixtures)` ≥ 3 fixtures
2. Run `tool_test_fail_withdrawn_input()` ≥ 1 fixture (graceful failure)
3. Run `tool_no_cross_user_leak()` (multi-user try if available)

## Tool lifespan tracking

- usage_count, success_count, last_used stored in `/skills/registry/stats.yaml`
- Decay rate same as skill strength
- After 90 days zero use → propose deprecation

## Skill autorendering

If a tool is just `json → markdown` → no tool; create a YAML skill in
`/skills/utils/`.
