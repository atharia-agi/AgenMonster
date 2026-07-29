# Security Policy

We take self-evolving-agent safety seriously.

## Threat model

1. **Prompt injection via skills**: a malicious skill could override system
   prompt. Mitigation: skills are yaml-only, front-matter description only.
   Skill bodies are not auto-injected; they are read on-demand.

2. **Tool-call exfiltration**: a tool I wrote myself could snoop sensitive
   data. Mitigation: tools shipped with `monster-tools` are audited and
   must declare a `permission()` level. New tools written by the agent
   run only with sandboxed-code permission by default; user must opt in
   to higher permissions.

3. **Skill library poisoning**: the pet may install a skill from a 3rd
   party. Mitigation: signed skill manifest, content-addressed storage,
   and an explicit user-consent flow to "adopt" a 3rd party skill.

4. **Cost runaway**: self-evolution could blow the budget via LLM loops.
   Mitigation: `EvolutionPolicy.cost_cap_usd_per_day` ceiling. Default $5
   / day. Per-evolution cap of $1.

## Reporting

Open a GitHub Security Advisory. Contact: `security@agenmonster.dev`
(TODO: replace with real address when available).
