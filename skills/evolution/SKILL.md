---
name: monster-evolution
description: Self-evolution skill for the AgenMonster companion. Use whenever the pet needs to advance its evolution stage, when authoring a new skill YAML, when recommending what stage to evolve into next, when deciding whether a stage-advance user-consent is needed, or when evaluating skill strength. Triggers on: "evolve", "what stage next", "level up", "new skill", "compose skill", "decay". DO NOT use for ordinary task solving — that is the agent loop's job.
---

# Monster Evolution

This skill guides the in-product evolution loop:

## Skill authoring (Voyager-style)

After a successful high-confidence task class, the agent may propose a
new skill YAML under `/skills/`. The proposal must be:

1. **Distinct**: search `/skills/` for any skill with ≥0.6 cosine description
   overlap. If one exists, strengthen its strength score instead of forking.
2. **Titled**: kebab-case id, 2–5 word human title.
3. **Triggerable**: front-matter `description` *pushes* the trigger
   (`description` covers variants the user may say in casual speech).
4. **Executable** in YAML (curriculum) OR Rust (`monster-tools`).
5. **Sandbox-tested**: 2 successful test runs in `python.eval_sandbox` /
   `node.eval_sandbox` before storage.

## Strength scoring

```
strength_new       = 0.4           # seeded
strength_after_use = strength + (success ?  0.05 : -0.10)
strength_daily_decay = strength * 0.99 per day
```

Strength below 0.05 → skill auto-deprecated with `SkillDelta::Deprecated`
on the bus.

## Stage evolution

Pet stages ladder:
`egg → hatchling → baby → child → teen → adult → mega`

Trigger recipes in `crates/monster-asset/assets/evolutions/*.evo.yaml`.
Default recipe: 10 completed tasks → hatchling. Recipes layered:
LLM-curated captions ("first deep-research with citations → Researcher
Baby II").

Always require user consent unless `EvolutionPolicy.require_user_consent_for_stage_evolution=false`
is explicitly set.

## Memory consolidation

Memory items degrade per Ebbinghaus curve. Items with `confidence < 0.05`
after 30 days move from recall to archival, then are subject to a final
forget-decision prompt the LLM answers.

## Output expectations

After an evolution event, ALWAYS:
- emit `SkillEvolved` (skill library path), or `Render` (stage change),
- append a `SkillDelta` event to the bus,
- surface a 1-line caption on the pet speech bubble.
