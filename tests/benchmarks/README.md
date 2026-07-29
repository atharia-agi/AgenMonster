# Benchmarks

We don't run a full benchmark suite yet — this is the placeholder for
custom Criterion/Hyperfine workloads.

Suggested benchmarks:

| Name | What it measures | Expected |
|------|------------------|----------|
| `agent_loop_cold` | wall-clock from prompt → first token | <800ms |
| `agent_loop_warm` | Prompt cache hit → first token | <250ms |
| `web_search_ddg` | realtime latency, cold | <300ms |
| `evolution_write` | write skill YAML to disk | <20ms |
| `memory_decay` | decay 10k recall items | <200ms |
