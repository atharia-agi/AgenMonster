import type { PersonalityProfile } from './personality.ts';
import type { GameState } from './gameState.ts';

export interface WorldEventContext {
  title: string;
  message: string;
  eventType: 'ambient' | 'travel' | 'encounter' | 'victory' | 'retreat' | 'legendary' | 'npc' | 'weather' | 'item';
  areaName?: string;
  success?: boolean;
}

const FALLBACK_NARRATIONS: Record<WorldEventContext['eventType'], string[]> = {
  ambient: [
    'Something is happening nearby...',
    'The world feels alive today.',
    'Did you see that?',
  ],
  travel: [
    'Onward! New territory awaits.',
    'Moving to a new area...',
    'Let\'s see what\'s ahead.',
  ],
  encounter: [
    'Something approached us!',
    'I sense something nearby...',
    'Stay alert!',
  ],
  victory: [
    'We won! That felt great!',
    'Victory! Well done!',
    'Another triumph!',
  ],
  retreat: [
    'We got away safely.',
    'Sometimes discretion is the better part of valor.',
    'Let\'s regroup and try again.',
  ],
  legendary: [
    'This is incredible! A legendary presence!',
    'I can hardly believe what we just encountered!',
    'This moment will be remembered!',
  ],
  npc: [
    'Looks like someone is nearby.',
    'I see a familiar face in the distance.',
    'Hello there!',
  ],
  weather: [
    'The weather is changing...',
    'Feel that? The air is different now.',
    'Nature shifts around us.',
  ],
  item: [
    'Hey, look what I found!',
    'Is this for us?',
    'A treasure!',
  ],
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getWorldEventNarration(
  ctx: WorldEventContext,
  profile: PersonalityProfile
): string {
  const lower = ctx.title.toLowerCase();
  let category: keyof PersonalityProfile = 'idlePhrases';

  if (ctx.eventType === 'victory' || lower.includes('victory') || lower.includes('won') || lower.includes('success')) {
    category = 'successPhrases';
  } else if (ctx.eventType === 'retreat' || lower.includes('retreat') || lower.includes('failed')) {
    category = 'errorPhrases';
  } else if (ctx.eventType === 'legendary' || lower.includes('legendary')) {
    category = 'excitedPhrases';
  } else if (ctx.eventType === 'travel' || lower.includes('area') || lower.includes('arrived')) {
    category = 'excitedPhrases';
  } else if (ctx.eventType === 'encounter' || lower.includes('wild') || lower.includes('approached')) {
    category = 'thinkingPhrases';
  } else if (ctx.eventType === 'weather' || lower.includes('weather')) {
    category = 'thinkingPhrases';
  } else if (ctx.eventType === 'item' || lower.includes('found')) {
    category = 'excitedPhrases';
  } else if (ctx.eventType === 'npc' || lower.includes('npc') || lower.includes('nearby')) {
    category = 'greetings';
  }

  const phrases = profile[category];
  if (Array.isArray(phrases) && phrases.length > 0) {
    return pick(phrases);
  }

  return pick(FALLBACK_NARRATIONS[ctx.eventType]);
}

export function dispatchWorldEventNarration(
  ctx: WorldEventContext,
  getProfile: () => PersonalityProfile
): void {
  try {
    const narration = getWorldEventNarration(ctx, getProfile());
    window.dispatchEvent(new CustomEvent('pet-initiate', { detail: { message: narration } }));
  } catch {}
}
