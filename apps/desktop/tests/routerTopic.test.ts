import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeMessage, selectModel, detectTaskType } from '../src/lib/router.ts';
import { recordTopic } from '../src/lib/memory.ts';

const FAKE_PROVIDERS = [
  { id: 'groq' as any, label: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], hasKey: true },
  { id: 'mistral' as any, label: 'Mistral', models: ['mistral-small-latest', 'codestral-latest'], hasKey: true },
  { id: 'openai' as any, label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'], hasKey: true },
];

test('routeMessage returns topicBias when a hot topic matches the task', () => {
  recordTopic('typescript', 5);
  const result = routeMessage('fix this typescript bug', FAKE_PROVIDERS);
  assert.ok(result);
  assert.equal(result.taskType, 'code');
  assert.equal(result.provider, 'mistral');
  assert.equal(result.topicBias, 'typescript');
});

test('routeMessage returns no topicBias when topics are cold', () => {
  const result = routeMessage('hello there', FAKE_PROVIDERS);
  assert.ok(result);
  assert.equal(result.taskType, 'chat');
  assert.equal(result.topicBias, undefined);
});

test('detectTaskType classifies intents including topic keywords', () => {
  assert.equal(detectTaskType('debug the python sql query'), 'code');
  assert.equal(detectTaskType('explain this aws architecture'), 'analyze');
  assert.equal(detectTaskType('summarize this doc'), 'summarize');
  assert.equal(detectTaskType('write a poem'), 'creative');
});
