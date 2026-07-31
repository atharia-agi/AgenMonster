import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, saveConfig, resetConfig, toLLMConfig } from '../src/lib/config.ts';

// Minimal localStorage so the persistence paths exercise.
class LS {
  store: Record<string, string> = {};
  getItem(k: string) { return k in this.store ? this.store[k] : null; }
  setItem(k: string, v: string) { this.store[k] = v; }
  removeItem(k: string) { delete this.store[k]; }
}
const ls = new LS();
(globalThis as any).window = {};
(globalThis as any).localStorage = ls;

test('loadConfig returns defaults when nothing stored', () => {
  const c = loadConfig();
  assert.equal(c.soundEnabled, true);
  assert.equal(c.llmProvider, 'nousresearch');
  assert.equal(c.volume, 0.8);
});

test('saveConfig then loadConfig round-trips', () => {
  const c = loadConfig();
  c.volume = 0.5;
  c.soundEnabled = false;
  saveConfig(c);
  const loaded = loadConfig();
  assert.equal(loaded.volume, 0.5);
  assert.equal(loaded.soundEnabled, false);
});

test('resetConfig clears stored config and restores defaults', () => {
  const c = loadConfig();
  saveConfig(c);
  const r = resetConfig();
  assert.equal(r.volume, 0.8);
  assert.equal(r.soundEnabled, true);
  assert.equal(ls.getItem('agenmonster_config'), null);
});

test('toLLMConfig maps config to LLMConfig shape', () => {
  const c = loadConfig();
  c.llmProvider = 'groq';
  c.model = 'llama-3.3-70b-versatile';
  c.llmApiKey = 'secret';
  const l = toLLMConfig(c);
  assert.equal(l.provider, 'groq');
  assert.equal(l.model, 'llama-3.3-70b-versatile');
  assert.equal(l.apiKey, 'secret');
});

test('loadConfig defaults volume to 0.8 and soundEnabled to true', () => {
  ls.store = {};
  const c = loadConfig();
  assert.equal(c.volume, 0.8);
  assert.equal(c.soundEnabled, true);
});

test('resetConfig restores all defaults and clears localStorage', () => {
  const c = loadConfig();
  c.volume = 0.3;
  c.soundEnabled = false;
  saveConfig(c);
  const r = resetConfig();
  assert.equal(r.volume, 0.8);
  assert.equal(r.soundEnabled, true);
  assert.equal(ls.getItem('agenmonster_config'), null);
});

test('loadConfig returns defaults when nothing stored', () => {
  ls.store = {};
  const c = loadConfig();
  assert.equal(c.soundEnabled, true);
  assert.equal(c.llmProvider, 'nousresearch');
  assert.equal(c.volume, 0.8);
});

test('toLLMConfig maps config to LLMConfig shape', () => {
  const c = loadConfig();
  c.llmProvider = 'groq';
  c.model = 'llama-3.3-70b-versatile';
  c.llmApiKey = 'secret';
  const l = toLLMConfig(c);
  assert.equal(l.provider, 'groq');
  assert.equal(l.model, 'llama-3.3-70b-versatile');
  assert.equal(l.apiKey, 'secret');
});

test('loadConfig defaults volume to 0.8 and soundEnabled to true', () => {
  ls.store = {};
  const c = loadConfig();
  assert.equal(c.volume, 0.8);
  assert.equal(c.soundEnabled, true);
});

test('saveConfig preserves unknown keys', () => {
  const c = loadConfig();
  c.volume = 0.3;
  saveConfig(c);
  const raw = ls.getItem('agenmonster_config');
  assert.ok(raw?.includes('0.3'));
});

test('saveConfig then loadConfig round-trips all standard fields', () => {
  const c = loadConfig();
  c.volume = 0.5;
  c.soundEnabled = false;
  c.llmProvider = 'mistral';
  saveConfig(c);
  const loaded = loadConfig();
  assert.equal(loaded.volume, 0.5);
  assert.equal(loaded.soundEnabled, false);
  assert.equal(loaded.llmProvider, 'mistral');
});
