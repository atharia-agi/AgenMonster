import type { Episode } from './memory';

export interface RoutinePattern {
  task: string;
  daysOfWeek: number[];
  hourRange: [number, number];
  confidence: number;
}

function hourBucket(hour: number): [number, number] {
  return [hour, hour + 1];
}

function mostCommonTitle(episodes: Episode[]): string {
  const counts = new Map<string, number>();
  for (const ep of episodes) {
    counts.set(ep.title, (counts.get(ep.title) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'unknown';
}

export function detectRoutine(episodes: Episode[]): RoutinePattern[] {
  if (episodes.length === 0) return [];

  const buckets = new Map<string, Episode[]>();
  for (const ep of episodes) {
    const date = new Date(ep.ts);
    const day = date.getDay();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(ep);
  }

  const patterns: RoutinePattern[] = [];
  for (const cluster of buckets.values()) {
    if (cluster.length < 3) continue;
    const sample = cluster[0];
    const date = new Date(sample.ts);
    const day = date.getDay();
    const hour = date.getHours();
    const task = mostCommonTitle(cluster);
    patterns.push({
      task,
      daysOfWeek: [day],
      hourRange: hourBucket(hour),
      confidence: cluster.length / episodes.length,
    });
  }

  patterns.sort((a, b) => b.confidence - a.confidence);

  return patterns.filter((p) => p.confidence > 0.3);
}

export function getRoutineForToday(routines: RoutinePattern[]): RoutinePattern[] {
  const today = new Date().getDay();
  return routines.filter((r) => r.daysOfWeek.includes(today));
}