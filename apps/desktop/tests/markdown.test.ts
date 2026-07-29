import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownLite, renderMarkdownToText, escape } from '../src/lib/markdown.ts';

function escH(s: string): string {
  return s
    .replace(/&/g, '\x26amp;')
    .replace(/</g, '\x26lt;')
    .replace(/>/g, '\x26gt;')
    .replace(/"/g, '\x26quot;')
    .replace(/'/g, '\x26apos;');
}

test('escape HTML-escapes the dangerous five', () => {
  assert.equal(escape('hi'), 'hi');
  assert.equal(escape('a=1' + String.fromCharCode(38) + '2'), 'a=1' + String.fromCharCode(38) + 'amp;2');
  assert.equal(escape(String.fromCharCode(60) + 'i' + String.fromCharCode(62)), String.fromCharCode(38) + 'lt;i' + String.fromCharCode(38) + 'gt;');
});

test('renders text as a single text segment when no markdown', () => {
  const segs = renderMarkdownLite('hello world');
  assert.equal(segs.length, 1);
  assert.equal(segs[0].type, 'text');
  assert.equal(segs[0].value, 'hello world');
});

test('bold with ** is rendered to <strong>', () => {
  assert.equal(renderMarkdownToText('a **bold** move'), 'a <strong>bold</strong> move');
});

test('bold with __ is rendered to <strong>', () => {
  assert.equal(renderMarkdownToText('a __bold__ move'), 'a <strong>bold</strong> move');
});

test('italic with single * is rendered to <em>', () => {
  assert.equal(renderMarkdownToText('say *hi* loudly'), 'say <em>hi</em> loudly');
});

test('italic with _ is rendered to <em>', () => {
  assert.equal(renderMarkdownToText('please _emphasize_ this'), 'please <em>emphasize</em> this');
});

test('inline code with backticks renders to <code>', () => {
  assert.equal(renderMarkdownToText('try `foo()` here'), 'try <code>foo()</code> here');
});

test('bold-style inside backticks is rendered as literal text, not bold', () => {
  const input = 'show me a **`sum`** call';
  const out = renderMarkdownToText(input);
  assert.ok(out.includes('**'));
  assert.ok(!out.includes('<strong>'));
  assert.ok(!out.includes('<code>'));
});

test('fenced code block captures body unchanged and emits <pre>', () => {
  const md = 'use the helper:\n```\nconst x = 1;\nconst y = x + 2;\n```\ndone.';
  const out = renderMarkdownToText(md);
  assert.ok(out.includes('<pre>const x = 1;\nconst y = x + 2;</pre>'));
  assert.ok(out.includes('use the helper:'));
  assert.ok(out.includes('done.'));
});

test('raw HTML is escaped, never executed', () => {
  const md = 'hey <img src=x onerror=alert(1)> buddy';
  const out = renderMarkdownToText(md);
  assert.ok(out.includes('&lt;img'));
  assert.ok(!/<img\s+src=/.test(out), 'raw <img> tag should not appear unescaped');
});

test('paragraph break inserts a newline segment between groups', () => {
  const md = 'first para\n\nsecond para';
  const segs = renderMarkdownLite(md);
  assert.equal(segs.length, 3);
  assert.equal(segs[0].value, 'first para');
  assert.equal(segs[1].value, '\n');
  assert.equal(segs[2].value, 'second para');
});

test('order matters — bold is recognized before italic on overlap', () => {
  assert.equal(renderMarkdownToText('a**hi**b'), 'a<strong>hi</strong>b');
});

test('empty input renders to empty array', () => {
  assert.deepEqual(renderMarkdownLite(''), []);
});

test('renderMarkdownToText handles code fences', () => {
  const out = renderMarkdownToText('```ts\nconst x = 1;\n```');
  assert.ok(out.includes('const x = 1;'));
});

test('renderMarkdownToText escapes HTML tags', () => {
  const out = renderMarkdownToText('<script>alert(1)</script>');
  assert.ok(!out.includes('<script>'));
});

test('renderMarkdownToText handles lists with dashes', () => {
  const out = renderMarkdownToText('- item1\n- item2');
  assert.ok(out.includes('item1'));
  assert.ok(out.includes('item2'));
});
