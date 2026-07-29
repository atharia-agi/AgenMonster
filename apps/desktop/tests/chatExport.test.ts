import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeChatMarkdown } from '../src/lib/persistence.ts';
import { resetGameState, getGameState } from '../src/lib/gameState.ts';

test('chat MD export: header reflects current stage + xp', () => {
  resetGameState();
  const gs = getGameState();
  gs.level = 7;
  gs.xp = 49;
  const md = serializeChatMarkdown(gs);
  assert.ok(md.startsWith('# AgenMonster Chat Export'));
  assert.ok(md.includes('Stage: **'));
  assert.ok(md.includes('lvl 7'));
  assert.ok(md.includes('XP 49'));
  assert.ok(md.includes('Exported:'));
});

test('chat MD export: empty history uses placeholder text', () => {
  resetGameState();
  const gs = getGameState();
  gs.chatMessages = [];
  const md = serializeChatMarkdown(gs);
  assert.ok(md.includes('_(no messages yet)_'));
  assert.ok(md.includes('Messages: 0'));
});

test('chat MD export: renders user/assistant with fences + ISO timestamps', () => {
  resetGameState();
  const gs = getGameState();
  gs.chatMessages = [
    { id: '1', role: 'user', content: 'hi there', timestamp: 1700000000000 },
    { id: '2', role: 'assistant', content: 'hey friend', timestamp: 1700000060000 },
  ];
  const md = serializeChatMarkdown(gs);
  assert.ok(md.includes('## USER · 2023-11-14T22:13:20.000Z'));
  assert.ok(md.includes('## ASSISTANT · 2023-11-14T22:14:20.000Z'));
  assert.ok(md.includes('```\nhi there\n```'));
  assert.ok(md.includes('```\nhey friend\n```'));
  assert.ok(md.includes('Messages: 2'));
});

test('chat MD export: skips system messages', () => {
  resetGameState();
  const gs = getGameState();
  gs.chatMessages = [
    { id: 's', role: 'system', content: 'SECRET prompt', timestamp: 1700000000000 } as any,
    { id: 'u', role: 'user', content: 'visible', timestamp: 1700000001000 } as any,
  ];
  const md = serializeChatMarkdown(gs);
  assert.ok(!md.includes('SECRET prompt'));
  assert.ok(md.includes('visible'));
});

test('chat MD export: switches to 4-tick fence when body contains backticks', () => {
  resetGameState();
  const gs = getGameState();
  gs.chatMessages = [
    { id: '1', role: 'user', content: 'try ```js\nconst x = 1``` inline', timestamp: 1700000000000 } as any,
  ];
  const md = serializeChatMarkdown(gs);
  assert.ok(md.includes('````'));
  assert.ok(!md.includes('```js\nconst x = 1```\ninline\n```\n'));
});

test('chat MD export: includes persona text when set', () => {
  resetGameState();
  const gs = getGameState();
  gs.chatMessages = [{ id: '1', role: 'user', content: 'hi', timestamp: Date.now() }];
  const md = serializeChatMarkdown(gs);
  assert.ok(md.includes('AgenMonster Chat Export'));
});

test('chat MD export: truncates very long messages', () => {
  resetGameState();
  const gs = getGameState();
  gs.chatMessages = [{ id: '1', role: 'user', content: 'A'.repeat(5000), timestamp: Date.now() }];
  const md = serializeChatMarkdown(gs);
  assert.ok(md.length > 100);
  assert.ok(md.includes('A'.repeat(5000)));
});
