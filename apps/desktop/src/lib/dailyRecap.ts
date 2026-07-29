import type { Episode, TopicCount } from './memory.ts';
import { getMemoryState, getTopTopics, rememberEvent } from './memory.ts';

export interface DailyRecapInput {
  episodes: Episode[];
  topics: TopicCount[];
  messageCount: number;
  goalsCompleted: number;
  factsLearned: number;
}

export interface DailyRecapResult {
  title: string;
  detail: string;
  tags: string[];
  confidence: number;
}

export function buildDailyRecap(input: DailyRecapInput): DailyRecapResult {
  const top3 = input.topics.slice(0, 3).map((t) => t.topic);
  const topicPart = top3.length ? `worked on ${top3.join(', ')}` : 'no topics yet';
  const detail =
    `Today you ${topicPart}, ${input.messageCount} messages, ${input.goalsCompleted} goals completed, ${input.factsLearned} facts learned.`;
  const tags = ['daily-recap', ...top3].slice(0, 6);
  return {
    title: 'Daily Recap',
    detail,
    tags,
    confidence: 0.9,
  };
}

export function runDailyRecap(messageCount: number, goalsCompleted: number): DailyRecapResult | null {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const state = getMemoryState();
  const todayEpisodes = state.episodes.filter((ep) => ep.ts >= startOfDay.getTime());
  if (todayEpisodes.length === 0) return null;
  const topics = getTopTopics(3);
  const factsLearned = Object.values(state.facts).filter((f) => f.updatedAt >= startOfDay.getTime()).length;
  const recap = buildDailyRecap({
    episodes: todayEpisodes,
    topics,
    messageCount,
    goalsCompleted,
    factsLearned,
  });
  rememberEvent({ kind: 'milestone', title: recap.title, detail: recap.detail, tags: recap.tags, confidence: recap.confidence });
  return recap;
}