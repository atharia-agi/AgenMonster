// Benchmark 5: Model Routing
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeMessage, detectTaskType, selectModel } from '../../src/lib/router.ts';
import { runBenchmark, checkBudgets } from './harness.ts';
import type { ProviderInfo } from '../../src/lib/llm.ts';

const testMessages = [
  'How do I write a TypeScript function?',
  'Deploy my app to AWS using CDK',
  'Explain how React hooks work',
  'Write a test for the login component',
  'Fix the bug in the payment processing',
  'Optimize the database query for users table',
  'Create a new React component for the dashboard',
  'Migrate the API from REST to GraphQL',
  'What is the capital of France?',
  'Tell me a joke about programming',
];

const mockProviders: ProviderInfo[] = [
  { id: 'groq', label: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], hasKey: true },
  { id: 'mistral', label: 'Mistral', models: ['mistral-small-latest', 'mistral-large-latest'], hasKey: true },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'], hasKey: true },
];

test('bench: model routing', async () => {
  const results = await runBenchmark({
    name: 'model-routing',
    fn: () => {
      for (const msg of testMessages) {
        routeMessage(msg, mockProviders);
      }
    },
    iterations: 10000,
    warmup: 1000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for model-routing');
});

test('bench: task type detection', async () => {
  const results = await runBenchmark({
    name: 'task-type-detection',
    fn: () => {
      for (const msg of testMessages) {
        detectTaskType(msg);
      }
    },
    iterations: 50000,
    warmup: 5000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for task-type-detection');
});

test('bench: model selection', async () => {
  // Use valid TaskType values from ROUTING map
  const validTaskTypes = ['chat', 'code', 'creative', 'vision', 'fast', 'summarize', 'analyze'] as const;
  
  const results = await runBenchmark({
    name: 'model-selection',
    fn: () => {
      for (const taskType of validTaskTypes) {
        selectModel(taskType, mockProviders);
      }
    },
    iterations: 20000,
    warmup: 2000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for model-selection');
});