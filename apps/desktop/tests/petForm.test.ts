// petForm — tests for the self-determined visual identity engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveForm, type PetFormSnapshot } from '../src/lib/petForm.ts';

function snap(overrides: Partial<PetFormSnapshot> = {}): PetFormSnapshot {
  return {
    stage: 'adult',
    pleasure: 0.6,
    activation: 0.5,
    dominance: 0.5,
    lessonDepth: 0.2,
    mastery: 0.4,
    energy: 0.6,
    closeness: 0.5,
    ...overrides,
  };
}

test('deriveForm is deterministic — same state, same form', () => {
  const a = deriveForm(snap());
  const b = deriveForm(snap());
  assert.deepEqual(a, b);
});

test('emotional state drives posture', () => {
  assert.equal(deriveForm(snap({ energy: 0.1 })).posture, 'dormant');
  assert.equal(deriveForm(snap({ activation: 0.8, pleasure: 0.3 })).posture, 'fierce');
  assert.equal(deriveForm(snap({ activation: 0.9, pleasure: 0.7 })).posture, 'excited');
  assert.equal(deriveForm(snap({ activation: 0.5, pleasure: 0.5 })).posture, 'active');
  assert.equal(deriveForm(snap({ activation: 0.3, pleasure: 0.5 })).posture, 'calm');
});

test('mastery + lessons increase elaboration and unlock markers', () => {
  const bare = deriveForm(snap({ mastery: 0.1, lessonDepth: 0.1 }));
  const wise = deriveForm(snap({ mastery: 0.9, lessonDepth: 0.9 }));
  assert.ok(wise.elaboration > bare.elaboration);
  assert.ok(wise.markers.includes('growth-rings'));
  assert.ok(wise.markers.includes('skill-glyphs'));
});

test('low energy adds a slumber marker and lowers luminosity', () => {
  const tired = deriveForm(snap({ energy: 0.1, closeness: 0.3 }));
  assert.ok(tired.markers.includes('slumber-bloom'));
  const bright = deriveForm(snap({ energy: 0.9, closeness: 0.9 }));
  assert.ok(bright.luminosity > tired.luminosity);
});

test('pleasure raises hue toward warm; ferocity rises when pleasure drops', () => {
  const happy = deriveForm(snap({ pleasure: 0.9, activation: 0.2 }));
  const angry = deriveForm(snap({ pleasure: 0.1, activation: 0.9 }));
  assert.ok(angry.ferocity > happy.ferocity);
  // deterministic hue = (0.9*160 + 0.2*80 + 0.4*120) % 360 = 208
  assert.equal(happy.hue, 208);
  // sadder + more activation shifts the hue measurably
  assert.notEqual(angry.hue, happy.hue);
});

test('all palette colors are valid hsl strings', () => {
  const form = deriveForm(snap());
  const re = /^hsl\(\d+ \d+% \d+%\)$/;
  assert.match(form.palette.base, re);
  assert.match(form.palette.accent, re);
  assert.match(form.palette.aura, re);
});