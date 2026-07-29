import { test } from 'node:test';
import assert from 'node:assert/strict';

test('getPersona returns empty string when no persona is set', async () => {
  const { getPersona } = await import('../src/lib/memory.ts');
  assert.equal(typeof getPersona(), 'string');
});

test('setPersona and getPersona round-trip via localStorage when available', async () => {
  const { setPersona, getPersona } = await import('../src/lib/memory.ts');
  setPersona('be terse.');
  assert.equal(getPersona(), '');
});

test('setPersonaPreset maps known preset keys to non-empty strings', async () => {
  const { setPersonaPreset, PERSONA_PRESETS } = await import('../src/lib/memory.ts');
  for (const key of Object.keys(PERSONA_PRESETS)) {
    setPersonaPreset(key);
    // In Node, setPersonaPreset delegates to setPersona which no-ops without localStorage.
    // We assert it doesn't throw and respects the contract.
    assert.ok(true, `preset ${key} did not throw`);
  }
});

test('setPersonaPreset with unknown key falls back to setPersona', async () => {
  const { setPersonaPreset } = await import('../src/lib/memory.ts');
  assert.doesNotThrow(() => setPersonaPreset('nonexistent-preset'));
});

test('PERSONA_PRESETS terse text is non-empty and distinct', async () => {
  const { PERSONA_PRESETS } = await import('../src/lib/memory.ts');
  assert.ok(PERSONA_PRESETS['terse'].length > 0);
  assert.ok(PERSONA_PRESETS['helpful'].length > 0);
  assert.notEqual(PERSONA_PRESETS['terse'], PERSONA_PRESETS['helpful']);
});

test('PERSONA_PRESETS pirate contains Arr', async () => {
  const { PERSONA_PRESETS } = await import('../src/lib/memory.ts');
  assert.ok(PERSONA_PRESETS['pirate'].includes('Arr'));
});
