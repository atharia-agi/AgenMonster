import { test } from 'node:test';
import assert from 'node:assert/strict';

function createRateLimiter(windowMs: number, max: number) {
  const buckets = new Map();
  return {
    check: (ip: string) => {
      const now = Date.now();
      const bucket = buckets.get(ip) || { count: 0, resetAt: now + windowMs };
      if (now > bucket.resetAt) {
        bucket.count = 0;
        bucket.resetAt = now + windowMs;
      }
      bucket.count++;
      buckets.set(ip, bucket);
      return { allowed: bucket.count <= max, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
    },
    buckets,
  };
}

test('rate limiter allows requests under limit', () => {
  const limiter = createRateLimiter(60_000, 10);
  for (let i = 0; i < 10; i++) {
    const result = limiter.check('127.0.0.1');
    assert.ok(result.allowed, `Request ${i + 1} should be allowed`);
  }
});

test('rate limiter blocks requests over limit', () => {
  const limiter = createRateLimiter(60_000, 3);
  limiter.check('127.0.0.1');
  limiter.check('127.0.0.1');
  limiter.check('127.0.0.1');
  const result = limiter.check('127.0.0.1');
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
});

test('rate limiter resets after window expires', () => {
  const limiter = createRateLimiter(50, 2);
  limiter.check('127.0.0.1');
  limiter.check('127.0.0.1');
  const blocked = limiter.check('127.0.0.1');
  assert.equal(blocked.allowed, false);

  // Simulate time passing
  const now = Date.now();
  const bucket = limiter.buckets.get('127.0.0.1')!;
  bucket.resetAt = now - 100;
  limiter.check('127.0.0.1');
  const result = limiter.check('127.0.0.1');
  assert.ok(result.allowed, 'Should be allowed after reset');
});

test('rate limiter tracks different IPs independently', () => {
  const limiter = createRateLimiter(60_000, 2);
  limiter.check('192.168.1.1');
  limiter.check('192.168.1.1');
  limiter.check('192.168.1.2');
  limiter.check('192.168.1.2');

  const result1 = limiter.check('192.168.1.1');
  const result2 = limiter.check('192.168.1.2');
  assert.equal(result1.allowed, false);
  assert.equal(result2.allowed, false);
});

test('rate limiter returns correct headers', () => {
  const limiter = createRateLimiter(60_000, 10);
  limiter.check('127.0.0.1');
  limiter.check('127.0.0.1');
  const result = limiter.check('127.0.0.1');
  assert.equal(result.remaining, 7);
  assert.ok(result.resetAt > Date.now());
});
