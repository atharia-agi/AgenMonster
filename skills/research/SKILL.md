---
name: monster-deep-research
description: Multi-hop recursive web research with intermediate synthesis. Use when the user asks for deep investigation, market sizing, competitive analysis, fact-verification chains, citation-rich reports, or "research this and cite your sources". Triggers on phrases like "deep dive", "thoroughly research", "I want facts with citations", "investigate", "find everything about". DO NOT use for simple single-step web fetches; those are handled by `web.fetch` directly.
---

# Deep Research Skill

End-to-end pipeline for *recursive, multi-source* research with rigorous
citation. Used both by the user and by the agent's own internal
self-evolution ("would using a research skill here be better than
answering off the cuff? Use this skill if yes.").

## Algorithm

```
loop up to N=8 iterations:
  1. Pick a sub-question from queue (breadth-first)
  2. web.search(query) → top 8 results
  3. for each, web.fetch(url) → markdown (jina → browser if blocked)
  4. Filter: keep claims where ≥2 independent sources agree
  5. Append verified claims into shared synthesis buffer (with source URLs)
  6. Expand queue: 3 new sub-questions from current gaps
  7. If budget exhausted OR claims are high-confidence enough, break
final:
  8. Compose final report in Markdown
  9. Inline citations as [n] with matching URL bibliography
```

## Sources priority

1. **Primary**: arxiv, official docs, github releases (.git commits w/
   `--no-merges`)
2. **Secondary**: wikipedia, news outlets, substack
3. **Tertiary**: blogs, marketing pages (only used for product analyses)

For marketing pages, capture page metadata + created_at and treat any
quantitative claim as unverified unless corroborated.

## Citations

Every fact carries `[{n}] -> {url} {accessed_at_iso}`. Bibliography at
the end sorted by `[n]`. If a fact is only single-sourced, mark it
`[single-source]`.

## Cost caps

- Max 64 search calls / task
- Max 256 fetch calls / task
- Max 8 iterations
- 90-second wall-clock cap unless user opts in to "go deeper"
- After 20 unique URLs fetched in 60s, switch to Exa-only mode

## Output

Final markdown report. Top of file: 2-line TLDR. Then sections. Then
bibliography. Then "limitations / known unknowns" section.

If researching code: cite line numbers and commit hashes.
If researching people: cite bios only, NEVER scrape private profiles.
