---
name: monster-memory
description: Memory consolidation, recall expansion, and forget-decisions for the AgenMonster agent. Use when deciding whether to remember a turn into archival, when running DecayPromoter, when choosing a memory tier for a new piece of info, or when the user asks "do you remember…". Triggers on: "remember", "don't forget", "do you recall", or any time the agent decides to write to long-term memory.
---

# Memory Subsystem Skill

Decides what to remember, where, and how strongly.

## Tiers

```
CORE      → always injected into system prompt, capped at ~2k tokens
RECALL    → last 64 turns, vector-indexed
ARCHIVAL  → long-term, vector-indexed, topic-clustered
```

## When to promote

| Event                    | Tier                          |
|--------------------------|-------------------------------|
| User says "remember X"   | ARCHIVAL (full confidence)    |
| User introduces self     | CORE (selfid or human-prof)   |
| LLM is unsure of fact    | ARCHIVAL (strength 0.5)       |
| Recurring preference     | CORE (after 2nd confirmation) |
| Successful tool result   | RECALL                        |
| Failed tool result       | RECALL (decay × 2)            |

## When to forget

Items below `strength 0.05` for >30 days move to "forget-decision" queue.
An LLM verdict removes them physically.

Forget categories NEVER to remove:
- consent state (whether user agreed to something)
- skill definitions
- evolution history
- pet identity / name

## Embedding strategy

`monster-llm` calls the user's preferred embedding (text-embedding-3-small
by default). Embeddings cached for 7 days per content-hash.

## Cost cap

Memory writes cost 1 LLM call per 5 issues. If budget hit, queue writes
and process on idle.
