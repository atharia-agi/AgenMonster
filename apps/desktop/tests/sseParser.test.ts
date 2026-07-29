import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeSSEStream } from '../src/lib/llm.ts';

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

async function* chunksOf(...parts: string[]): AsyncIterable<Uint8Array> {
  for (const p of parts) yield enc(p);
}

test('SSE parser: assembles delta tokens across events', async () => {
  const ticks: Array<[string, string]> = [];
  const full = await consumeSSEStream(
    chunksOf(
      'data: {"choices":[{"delta":{"content":"hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
      'data: [DONE]\n\n',
    ),
    new TextDecoder(),
    (delta, sofar) => ticks.push([delta, sofar]),
  );
  assert.equal(full, 'hello');
  assert.deepEqual(ticks.map((t) => t[0]), ['hel', 'lo']);
  assert.deepEqual(ticks.map((t) => t[1]), ['hel', 'hello']);
});

test('SSE parser: tolerates fragments split across chunks', async () => {
  const full = await consumeSSEStream(
    chunksOf(
      'data: {"choices":[{"delta":',
      '{"content":"x"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"y"}}]}\n',
      '\n',
      'data: [DONE]\n',
    ),
    new TextDecoder(),
    () => {},
  );
  assert.equal(full, 'xy');
});

test('SSE parser: ignores comment lines and non-data lines', async () => {
  const full = await consumeSSEStream(
    chunksOf(
      ': ping\n\n',
      'event: message\n',
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: [DONE]\n',
    ),
    new TextDecoder(),
    () => {},
  );
  assert.equal(full, 'ok');
});

test('SSE parser: stops on [DONE] sentinel even mid-stream', async () => {
  const ticks: string[] = [];
  const full = await consumeSSEStream(
    chunksOf(
      'data: {"choices":[{"delta":{"content":"a"}}]}\n\ndata: {"choices":[{"delta":{"content":"b"}}]}\n\ndata: [DONE]\n',
    ),
    new TextDecoder(),
    (d) => ticks.push(d),
  );
  assert.equal(full, 'ab');
  assert.deepEqual(ticks, ['a', 'b']);
});
