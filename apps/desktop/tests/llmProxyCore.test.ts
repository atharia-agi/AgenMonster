import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PROVIDERS, resolveKey, availableProviders, prepareUpstreamRequest, readBody } from '../llmProxyCore.ts';

const ENV: Record<string, string> = {
  GROQ_API_KEY: 'gk',
  MISTRAL_API_KEY_1: 'mk',
  VITE_OPENAI_API_KEY: 'ok',
};

test('resolveKey picks the first matching env key', () => {
  assert.equal(resolveKey(ENV, 'groq'), 'gk');
  assert.equal(resolveKey(ENV, 'mistral'), 'mk');
  assert.equal(resolveKey(ENV, 'openai'), 'ok');
  assert.equal(resolveKey(ENV, 'openrouter'), '');
});

test('availableProviders only lists providers with keys', () => {
  const list = availableProviders(ENV);
  const ids = list.map((p) => p.id);
  assert.ok(ids.includes('groq'));
  assert.ok(ids.includes('mistral'));
  assert.ok(ids.includes('openai'));
  assert.ok(!ids.includes('openrouter'));
  assert.ok(list.every((p) => p.hasKey));
});

test('prepareUpstreamRequest rejects unknown provider', () => {
  assert.throws(() => prepareUpstreamRequest(ENV, { provider: 'nope' }), /unknown provider/);
});

test('prepareUpstreamRequest rejects missing key', () => {
  assert.throws(() => prepareUpstreamRequest(ENV, { provider: 'openrouter' }), /No API key/);
});

test('prepareUpstreamRequest builds the correct upstream call', () => {
  const r = prepareUpstreamRequest(ENV, {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: 'hi' }],
  });
  assert.equal(r.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(r.headers.Authorization, 'Bearer gk');
  assert.equal(r.payload.model, 'llama-3.1-8b-instant');
  assert.equal(r.payload.messages[0].content, 'hi');
  assert.equal(r.payload.stream, false);
  assert.equal(r.payload.max_tokens, 1024);
});

test('prepareUpstreamRequest defaults the model when omitted', () => {
  const r = prepareUpstreamRequest(ENV, { provider: 'groq', messages: [] });
  assert.equal(r.payload.model, PROVIDERS.groq.def);
});

test('readBody collects the request stream', async () => {
  const req = new EventEmitter();
  const p = readBody(req);
  req.emit('data', '{"a":');
  req.emit('data', '1}');
  req.emit('end');
  assert.equal(await p, '{"a":1}');
});
