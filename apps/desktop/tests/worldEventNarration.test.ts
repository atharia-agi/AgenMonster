import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWorldEventNarration, type WorldEventContext } from '../src/lib/worldEventNarration.ts';
import { PERSONALITY_PROFILES } from '../src/lib/personality.ts';

const profiles = Object.values(PERSONALITY_PROFILES);
const eventTypes: WorldEventContext['eventType'][] = [
  'ambient', 'travel', 'encounter', 'victory', 'retreat', 'legendary', 'npc', 'weather', 'item',
];

const sampleTitles: Record<WorldEventContext['eventType'], string> = {
  ambient: 'Ambient',
  travel: 'Area Change',
  encounter: 'Wild Monster',
  victory: 'Victory!',
  retreat: 'Retreated...',
  legendary: 'Legendary Encounter',
  npc: 'NPC Nearby',
  weather: 'Weather Change',
  item: 'Found Item',
};

for (const profile of profiles) {
  for (const eventType of eventTypes) {
    test(`returns narration for ${eventType} event (${profile.type})`, () => {
      const ctx: WorldEventContext = { title: sampleTitles[eventType], message: 'test', eventType };
      const text = getWorldEventNarration(ctx, profile);
      assert.equal(typeof text, 'string');
      assert.ok(text.length > 0);
    });
  }
}
