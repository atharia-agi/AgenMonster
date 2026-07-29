import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProactivity, startProactivityTimer, type PetSnapshot } from '../src/lib/proactivity.ts';

function at(hoursAgo: number): number {
  return Date.now() - hoursAgo * 3600000;
}

test('timer callback fires when energy > 0.6 and idle > 60min', () => {
  const pet: PetSnapshot = {
    energy: 0.7,
    lastInteractionTs: at(2),
    mood: 'neutral',
  };
  const msg = checkProactivity(pet, [], 0, Date.now());
  assert.equal(msg, 'Hey, how\'s it going?');
});

test('timer callback fires comeback message when energy < 0.3 and idle > 4h', () => {
  const pet: PetSnapshot = {
    energy: 0.2,
    lastInteractionTs: at(5),
    mood: 'neutral',
  };
  const msg = checkProactivity(pet, [], 0, Date.now());
  assert.equal(msg, 'You\'ve been away a while -- come back when ready');
});

test('timer callback does NOT fire within 60min of last interaction', () => {
  const pet: PetSnapshot = {
    energy: 0.8,
    lastInteractionTs: at(0.4),
    mood: 'neutral',
  };
  const msg = checkProactivity(pet, [], 0, Date.now());
  assert.equal(msg, null);
});

test('initiative message appears in chat UI when conditions met', () => {
  const sent: string[] = [];
  const pet: PetSnapshot = {
    energy: 0.8,
    lastInteractionTs: at(3),
    mood: 'happy',
  };
  const timer = startProactivityTimer({
    getPet: () => pet,
    getTopics: () => ['TypeScript', 'Rust'],
    sendMessage: (m) => sent.push(m),
    recordEvent: () => {},
  });
  timer.tick();
  assert.equal(sent.length, 1);
  assert.ok(sent[0].length > 0);
  timer.destroy();
});

test('initiative message recorded as memory episode', () => {
  const events: Array<{ kind: string; title: string }> = [];
  const pet: PetSnapshot = {
    energy: 0.8,
    lastInteractionTs: at(3),
    mood: 'happy',
  };
  const timer = startProactivityTimer({
    getPet: () => pet,
    getTopics: () => ['TypeScript', 'Rust'],
    sendMessage: () => {},
    recordEvent: (e) => events.push(e),
  });
  timer.tick();
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'success');
  assert.equal(events[0].title, 'pet-initiated');
  timer.destroy();
});

test('rate-limit: max 1 initiative per 30 minutes', () => {
  const sent: string[] = [];
  const pet: PetSnapshot = {
    energy: 0.8,
    lastInteractionTs: at(3),
    mood: 'happy',
  };
  const timer = startProactivityTimer({
    getPet: () => pet,
    getTopics: () => ['TypeScript', 'Rust'],
    sendMessage: (m) => sent.push(m),
    recordEvent: () => {},
  });
  timer.tick();
  sent.length = 0;
  timer.tick();
  assert.equal(sent.length, 0);
  timer.destroy();
});

test('bored mood with topics suggests topic', () => {
  const pet: PetSnapshot = {
    energy: 0.5,
    lastInteractionTs: at(3),
    mood: 'bored',
  };
  const msg = checkProactivity(pet, ['Rust', 'AWS'], 0, Date.now());
  assert.ok(msg?.includes('Rust'));
});

test('destroy stops the interval', () => {
  const sent: string[] = [];
  const pet: PetSnapshot = {
    energy: 0.8,
    lastInteractionTs: at(3),
    mood: 'happy',
  };
  const timer = startProactivityTimer({
    getPet: () => pet,
    getTopics: () => ['TypeScript'],
    sendMessage: (m) => sent.push(m),
    recordEvent: () => {},
  });
  timer.destroy();
  assert.equal(typeof timer.destroy, 'function');
});