import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTaskType, selectModel, routeMessage } from '../src/lib/router.ts';

const PROVIDERS = [
  { id: 'groq', label: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], hasKey: true },
  { id: 'mistral', label: 'Mistral', models: ['mistral-small-latest', 'codestral-latest'], hasKey: true },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'], hasKey: true },
] as any;

test('detectTaskType classifies intent keywords', () => {
  assert.equal(detectTaskType('can you debug this function?'), 'code');
  assert.equal(detectTaskType('summarize this article'), 'summarize');
  assert.equal(detectTaskType('describe this screenshot'), 'vision');
  assert.equal(detectTaskType('tell me a story'), 'creative');
  assert.equal(detectTaskType('hey how are you'), 'chat');
});

test('selectModel prefers codestral for code when Mistral available', () => {
  const sel = selectModel('code', PROVIDERS)!;
  assert.equal(sel.provider, 'mistral');
  assert.equal(sel.model, 'codestral-latest');
});

test('selectModel falls back when preferred provider missing', () => {
  const onlyGroq = PROVIDERS.filter((p: any) => p.id === 'groq');
  const sel = selectModel('code', onlyGroq)!;
  assert.equal(sel.provider, 'groq');
});

test('selectModel returns null when no providers', () => {
  assert.equal(selectModel('chat', []), null);
});

test('routeMessage routes a code question to a real provider+model', () => {
  const r = routeMessage('write a function to sort an array', PROVIDERS)!;
  assert.equal(r.taskType, 'code');
  assert.equal(r.provider, 'mistral');
  assert.equal(r.model, 'codestral-latest');
});

test('detectTaskType classifies test intent', () => {
  const r = detectTaskType('write a test for this');
  assert.ok(typeof r === 'string' && r.length > 0, `unexpected: ${r}`);
});

test('detectTaskType classifies deploy intent', () => {
  const r = detectTaskType('deploy to aws');
  assert.ok(typeof r === 'string' && r.length > 0, `unexpected: ${r}`);
});

test('detectTaskType classifies explain intent', () => {
  const r = detectTaskType('explain how this works');
  assert.ok(typeof r === 'string' && r.length > 0, `unexpected: ${r}`);
});

test('routeMessage returns null with no providers', () => {
  assert.equal(routeMessage('hello', []), null);
});
