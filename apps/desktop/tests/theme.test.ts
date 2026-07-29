import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, describeTheme, THEME_STORAGE_KEY } from '../src/lib/theme.ts';

test('THEMES includes the default and the variants', () => {
  assert.ok(THEMES.includes('gb'));
  assert.ok(THEMES.includes('gb-night'));
  assert.ok(THEMES.includes('gb-dawn'));
});

test('describeTheme returns a non-empty string for every theme', () => {
  for (const t of THEMES) {
    const desc = describeTheme(t);
    assert.ok(desc.length > 0);
  }
});

test('describeTheme differentiates default vs variants', () => {
  assert.notEqual(describeTheme('gb'), describeTheme('gb-night'));
  assert.notEqual(describeTheme('gb'), describeTheme('gb-dawn'));
});

test('THEME_STORAGE_KEY is stable', () => {
  assert.equal(THEME_STORAGE_KEY, 'agenmonster_theme');
});
