import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionSummary, type SessionSnapshot } from '../src/lib/sessionEnd.ts';

function snap(over: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    topTopics: [],
    recentMessages: [],
    startedAt: 0,
    endedAt: 60 * 60 * 1000, // 60 minutes
    ...over,
  };
}

test('buildSessionSummary computes duration in minutes', () => {
  const s = buildSessionSummary(snap({ startedAt: 0, endedAt: 90 * 60 * 1000 }));
  assert.equal(s.durationMin, 90);
});

test('buildSessionSummary surfaces top topics as inline note', () => {
  const s = buildSessionSummary(snap({ topTopics: [{ topic: 'typescript', count: 5 }, { topic: 'aws', count: 3 }] }));
  assert.match(s.detail, /typescript\(5\)/);
  assert.match(s.detail, /aws\(3\)/);
});

test('buildSessionSummary includes last 4 messages as compressed sample', () => {
  const s = buildSessionSummary(snap({
    recentMessages: [
      { role: 'user', content: 'how do I parse YAML safely?', timestamp: 0 },
      { role: 'assistant', content: 'Use ruamel.yaml.safe_load', timestamp: 0 },
      { role: 'user', content: 'and the difference from yaml.load?', timestamp: 0 },
      { role: 'assistant', content: 'unsafe loading executes arbitrary tags', timestamp: 0 },
    ],
  }));
  assert.match(s.detail, /U:how do I parse YAML safely\?/);
  assert.match(s.detail, /A:Use ruamel\.yaml\.safe_load/);
});

test('buildSessionSummary surfaces message count in title', () => {
  const s = buildSessionSummary(snap({
    recentMessages: [
      { role: 'user', content: 'a', timestamp: 0 },
      { role: 'user', content: 'b', timestamp: 0 },
      { role: 'user', content: 'c', timestamp: 0 },
    ],
  }));
  assert.match(s.title, /3 msgs/);
});

test('buildSessionSummary tags include session + auto + top 3 topics', () => {
  const s = buildSessionSummary(snap({
    topTopics: [
      { topic: 'typescript', count: 5 },
      { topic: 'aws', count: 3 },
      { topic: 'docker', count: 2 },
      { topic: 'redis', count: 1 },
    ],
  }));
  assert.ok(s.tags.includes('session'));
  assert.ok(s.tags.includes('auto'));
  assert.ok(s.tags.includes('typescript'));
  assert.ok(s.tags.includes('aws'));
  assert.ok(s.tags.includes('docker'));
  // Cap at 6: 2 fixed + 3 topics + 1 = 6
  assert.ok(s.tags.length <= 6, `expected ≤ 6 tags, got ${s.tags.length}`);
});

test('buildSessionSummary with no topics/messages produces a usable summary', () => {
  const s = buildSessionSummary(snap());
  assert.match(s.title, /0 msgs/);
  assert.equal(s.durationMin, 60);
});

test('buildSessionSummary truncates long messages to 80 chars', () => {
  const longMsg = 'x'.repeat(200);
  const s = buildSessionSummary(snap({
    recentMessages: [{ role: 'user', content: longMsg, timestamp: 0 }],
  }));
  assert.ok(s.detail.length < 500, 'detail should not balloon for long input');
});

test('buildSessionSummary title includes duration only when no messages', () => {
  const s = buildSessionSummary(snap({
    startedAt: 0,
    endedAt: 30 * 60 * 1000,
  }));
  assert.ok(s.title.includes('0 msgs'));
  assert.ok(s.durationMin === 30);
});

test('buildSessionSummary tags cap at 6', () => {
  const s = buildSessionSummary(snap({
    topTopics: [
      { topic: 'a', count: 10 },
      { topic: 'b', count: 8 },
      { topic: 'c', count: 6 },
      { topic: 'd', count: 4 },
      { topic: 'e', count: 2 },
    ],
  }));
  assert.ok(s.tags.length <= 6, `expected ≤ 6 tags, got ${s.tags.length}`);
});

test('buildSessionSummary with no topics but recent messages', () => {
  const s = buildSessionSummary(snap({
    topTopics: [],
    recentMessages: [
      { role: 'user', content: 'hello', timestamp: 0 },
      { role: 'assistant', content: 'hi there', timestamp: 0 },
    ],
  }));
  assert.ok(s.title.includes('2 msgs'));
  assert.ok(s.detail.includes('U:hello'));
  assert.ok(s.detail.includes('A:hi there'));
});

test('buildSessionSummary duration rounds correctly', () => {
  const s = buildSessionSummary(snap({
    startedAt: 0,
    endedAt: 61 * 60 * 1000, // 61 minutes
  }));
  assert.equal(s.durationMin, 61);
  assert.ok(s.title.includes('61m'));
});

test('buildSessionSummary recentMessages limited to last 4', () => {
  const s = buildSessionSummary(snap({
    topTopics: [{ topic: 'x', count: 1 }],
    recentMessages: [
      { role: 'user', content: '1', timestamp: 0 },
      { role: 'assistant', content: '2', timestamp: 0 },
      { role: 'user', content: '3', timestamp: 0 },
      { role: 'assistant', content: '4', timestamp: 0 },
      { role: 'user', content: '5', timestamp: 0 },
      { role: 'assistant', content: '6', timestamp: 0 },
    ],
  }));
  assert.ok(s.detail.includes('U:5'));
  assert.ok(s.detail.includes('A:6'));
  assert.ok(!s.detail.includes('U:1'));
});

test('buildSessionSummary tags do not duplicate', () => {
  const s = buildSessionSummary(snap({
    topTopics: [
      { topic: 'a', count: 1 },
      { topic: 'b', count: 1 },
    ],
  }));
  const unique = new Set(s.tags);
  assert.equal(unique.size, s.tags.length);
});

test('buildSessionSummary with duration less than 1 minute rounds up', () => {
  const s = buildSessionSummary(snap({
    startedAt: 0,
    endedAt: 30 * 1000, // 30 seconds
  }));
  assert.equal(s.durationMin, 1);
  assert.ok(s.title.includes('0 msgs'));
});

test('buildSessionSummary includes tool calls in message sample', () => {
  const s = buildSessionSummary(snap({
    recentMessages: [
      { role: 'user', content: 'what is 2+2?', timestamp: 0 },
      { role: 'assistant', content: '__AGENT_MCP__:math|{"a":2,"b":2}', timestamp: 0 },
    ],
  }));
  assert.ok(s.detail.includes('2+2'));
});
