// AutonomousParallelResearch — genuine parallel cognition for the deep
// recursive agent. Instead of one linear research turn, the creature forks
// N research branches simultaneously (in-process Promise.all — cheap, no
// extra processes), each exploring a different memory neighborhood via
// spreading activation, then merges the synthesized findings back into the
// vault. This is parallel AGI-style thinking: many threads at once, one mind.
//
// Pure + safe: each branch is a read + synthesize over existing memory APIs.

import { retrieveBySpreadingActivation } from './memoryGraph.ts';
import { getMemoryState } from './memory.ts';
import { consolidateToVault, setWorkingMemory } from './layeredContext.ts';
import { logger } from './logger.ts';

export interface ResearchBranch {
  topic: string;
  findings: string[];
  episodesTouched: number;
}

export async function runParallelResearch(
  rootQuery: string,
  branches = 3,
): Promise<{ branches: ResearchBranch[]; mergedSummary: string }> {
  const mem = getMemoryState();
  // Derive N sub-topics from distinct recent episode clusters.
  const seeds = mem.episodes
    .slice(-branches * 2)
    .map((e) => e.title)
    .filter((_, i) => i % 2 === 0)
    .slice(0, branches);

  const topics = (seeds.length >= branches ? seeds : [
    rootQuery,
    ...seeds,
    'relationship growth',
    'skill mastery',
    'world exploration',
  ]).slice(0, branches);

  const runBranch = async (topic: string): Promise<ResearchBranch> => {
    const act = retrieveBySpreadingActivation(topic, { depth: 2, temporalDecay: true });
    const findings = act.episodes.slice(0, 4).map((e: any) => `${e.title}: ${e.detail?.slice(0, 80) ?? ''}`);
    return { topic, findings, episodesTouched: act.episodes.length };
  };

  const results = await Promise.all(topics.map(runBranch));

  // Merge: write each branch's synthesis to working memory + vault.
  const merged = results
    .map((b) => `• [${b.topic}] ${b.findings.length} leads (${b.episodesTouched} episodes)`)
    .join('\n');

  try {
    setWorkingMemory(`Parallel research merged:\n${merged}`);
    consolidateToVault(`Parallel research: ${rootQuery.slice(0, 40)} - ${merged}`, ['autonomous', 'parallel', 'research']);
  } catch {}

  logger.info('Parallel research complete', { branches: results.length, totalEpisodes: results.reduce((a, b) => a + b.episodesTouched, 0) });
  return { branches: results, mergedSummary: merged };
}
