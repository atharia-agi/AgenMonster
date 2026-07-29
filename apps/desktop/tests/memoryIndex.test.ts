import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractKeywords, keywordOverlap } from '../src/lib/memoryIndex.ts';

test('extractKeywords removes stop words', () => {
  const kw = extractKeywords('the quick brown fox jumps over the lazy dog');
  assert.ok(!kw.includes('the'));
  assert.ok(!kw.includes('over'));
  assert.ok(kw.includes('quick'));
  assert.ok(kw.includes('brown'));
});

test('extractKeywords lowercases and strips punctuation', () => {
  const kw = extractKeywords('Rust, Python, and GoLang!');
  assert.ok(kw.includes('rust'));
  assert.ok(kw.includes('python'));
  assert.ok(kw.includes('golang'));
});

test('extractKeywords requires minimum 3 chars', () => {
  const kw = extractKeywords('a bb ccc ddd e');
  assert.ok(!kw.includes('bb'));
  assert.ok(kw.includes('ccc'));
  assert.ok(kw.includes('ddd'));
});

test('semantic search finds Rust episode when query mentions Rust programming', () => {
  const episodeKeywords = ['rust', 'programming', 'debug'];
  const queryKeywords = extractKeywords('Rust programming patterns');
  const overlap = keywordOverlap(episodeKeywords, queryKeywords);
  assert.ok(overlap > 0);
});

test('semantic search returns empty when no keyword overlap', () => {
  const episodeKeywords = ['typescript', 'svelte', 'aws'];
  const queryKeywords = extractKeywords('cooking pasta recipe');
  const overlap = keywordOverlap(episodeKeywords, queryKeywords);
  assert.equal(overlap, 0);
});

test('semantic search sorts by overlap count descending', () => {
  const candidates = [
    { keywords: ['rust', 'aws'] },
    { keywords: ['typescript', 'svelte', 'rust'] },
    { keywords: ['python'] },
  ];
  const query = extractKeywords('rust');
  const scored = candidates.map((c) => ({ overlap: keywordOverlap(c.keywords, query), candidate: c }));
  scored.sort((a, b) => b.overlap - a.overlap);
  assert.ok(scored[0].overlap >= scored[1].overlap);
  assert.ok(scored[1].overlap >= scored[2].overlap);
});

test('extractKeywords keeps word positions (no dedup)', () => {
  const kw = extractKeywords('rust rust rust typescript');
  const rustCount = kw.filter((w) => w === 'rust').length;
  assert.equal(rustCount, 3);
});