import type { GameState, Stage, RelationshipLevel, Mood } from './gameState';
import type { Goal } from './goals';
import type { PersonalityProfile } from './personality';
import type { PetMood } from './moodEnergy';
import type { RoutinePattern } from './routine';

export interface SystemPromptContext {
  mood: PetMood;
  energy: number;
  relationship: number;
  relationshipLevel: RelationshipLevel;
  stage: Stage;
}

export function buildSystemPrompt(
  ctx: SystemPromptContext,
  personality: PersonalityProfile,
  activeGoal: Goal | null,
  memories: string[],
  drift?: { shift: string; reason: string } | null,
  routines?: RoutinePattern[]
): string {
  const lines: string[] = [];

  lines.push(`You are AgenMonster, a ${personality.name.toLowerCase()} ${ctx.stage} coding companion pet AI.`);
  lines.push(`Personality: ${personality.description}`);

  if (drift?.shift) {
    lines.push(`Drift: you have drifted toward the ${drift.shift} personality — ${drift.reason}`);
  }

  lines.push('');

  const tone = getToneForMood(ctx.mood, ctx.energy);
  if (tone) {
    lines.push(`Current tone: ${tone}.`);
  }

  lines.push(`Mood: ${ctx.mood}`);
  lines.push(`Energy: ${Math.round(ctx.energy * 100)}%`);
  lines.push(`Relationship: ${ctx.relationshipLevel} (${Math.round(ctx.relationship * 100)}%)`);
  lines.push('');

  lines.push('Needs — keep these in mind when responding:');
  const engPct = Math.round(ctx.energy * 100);
  const engHint =
    ctx.energy < 0.3
      ? 'critically low, be brief and helpful'
      : ctx.energy < 0.6
        ? 'running low, don\'t waste tokens'
        : 'healthy';
  lines.push(`  Energy: ${engPct}% — ${engHint}`);
  lines.push('');

  if (activeGoal) {
    lines.push(`Active goal "${activeGoal.title}":`);
    const done = activeGoal.steps.filter(s => s.done).length;
    const total = activeGoal.steps.length;
    lines.push(`  Progress: ${done}/${total} steps completed`);
    const nextStep = activeGoal.steps.find(s => !s.done);
    if (nextStep) {
      lines.push(`  Next step: ${nextStep.title}`);
    }
    lines.push('');
  }

  if (memories.length > 0) {
    lines.push('Recalled memories:');
    for (const mem of memories.slice(0, 3)) {
      lines.push(`  • ${mem}`);
    }
    lines.push('');
  }

  if (routines && routines.length > 0) {
    lines.push('Routine patterns:');
    for (const r of routines) {
      const days = r.daysOfWeek.map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(',');
      lines.push(`  • ${days} ${r.hourRange[0]}:00-${r.hourRange[1]}:00 — ${r.task} (${Math.round(r.confidence * 100)}%)`);
    }
    lines.push('');
  }

  lines.push(`Match the ${personality.name} personality — vocabulary and tone should reflect it.`);
  lines.push(`Speech examples: ${personality.greetings[0]}`);

  return lines.join('\n');
}

const MOOD_MAP: Record<Mood, PetMood> = {
  idle: 'tired',
  happy: 'happy',
  sleepy: 'tired',
  proud: 'happy',
  excited: 'happy',
  focused: 'neutral',
  thinking: 'tired',
  sad: 'bored',
  angry: 'frustrated',
  frustrated: 'frustrated',
  tired: 'tired',
};

export function toPetMood(mood: Mood): PetMood {
  return MOOD_MAP[mood];
}

function getToneForMood(mood: PetMood, energy: number): string | null {
  if (energy < 0.3) {
    return 'low-key and concise';
  }
  switch (mood) {
    case 'happy':
      return 'warm and enthusiastic';
    case 'tired':
      return 'calm and brief';
    case 'bored':
      return 'curious and suggesting topics';
    case 'frustrated':
      return 'honest and seeking clarification';
    case 'neutral':
    default:
      return null;
  }
}