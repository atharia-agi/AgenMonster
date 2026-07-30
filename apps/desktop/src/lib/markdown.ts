// Tiny dependency-free Markdown "lite" renderer for chat bubbles.
// Supports a deliberately small subset that real LLM replies actually emit:
//   - Fenced code blocks (\u0060\u0060\u0060 ... \u0060\u0060\u0060)        -> pre/code
//   - Inline code (\u0060...\u0060)                       -> code
//   - Bold        (**...** or __...__)         -> strong
//   - Italic      (*...*   or _..._)           -> em
// All other characters are HTML-escaped. The output is an array of typed
// segments so the Svelte template can render each one without ever ingesting
// raw HTML, eliminating XSS surface from LLM output.
//
// Limits:
//   - No nesting of inline rules inside style markers.
//   - No headings/lists/links/images -- out of scope for chat bubbles.
//   - Fenced code blocks do NOT support language tags.
//   - Code fences without a closing fence swallow to end of input.

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'pre'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string };

function escHtml(s: string): string {
  return s
    .replace(/&/g, String.fromCharCode(38) + 'amp;')
    .replace(/</g, String.fromCharCode(38) + 'lt;')
    .replace(/>/g, String.fromCharCode(38) + 'gt;')
    .replace(/"/g, String.fromCharCode(38) + 'quot;')
    .replace(/'/g, String.fromCharCode(38) + 'apos;');
}

function applyInline(line: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '`') {
      const end = line.indexOf('`', i + 1);
      if (end !== -1) {
        out.push({ type: 'code', value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const rest = line.slice(i);
    let m = /^\*\*([^*\n][^*\n]*?)\*\*/.exec(rest);
    if (!m) m = /^__([^_\n][^_\n]*?)__/.exec(rest);
    if (m) {
      const inner = m[1];
      if (!(inner.startsWith('`') && inner.endsWith('`') && inner.length >= 3)) {
        out.push({ type: 'bold', value: inner });
        i += m[0].length;
        continue;
      }
      out.push({ type: 'text', value: m[0] });
      i += m[0].length;
      continue;
    }
    m = /^\*([^*\n][^*\n]*?)\*/.exec(rest);
    if (!m) m = /^_([^_\n][^_\n]*?)_/.exec(rest);
    if (m) {
      const inner = m[1];
      if (!(inner.startsWith('`') && inner.endsWith('`') && inner.length >= 3)) {
        out.push({ type: 'italic', value: inner });
        i += m[0].length;
        continue;
      }
      out.push({ type: 'text', value: m[0] });
      i += m[0].length;
      continue;
    }
    let j = i;
    while (j < line.length && line[j] !== '`' && line[j] !== '*' && line[j] !== '_') j++;
    if (j === i) {
      out.push({ type: 'text', value: line[i] });
      i++;
    } else {
      out.push({ type: 'text', value: line.slice(i, j) });
      i = j;
    }
  }
  return out;
}

export function renderMarkdownLite(src: string): Segment[] {
  if (!src) return [];
  const out: Segment[] = [];
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      const fenceInfo = line.replace(/^\s*```/, '').trim();
      const block: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        block.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      let body = block.join('\n');
      if (fenceInfo && block.length === 0) body = fenceInfo;
      out.push({ type: 'pre', value: body });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i] !== '' && !/^\s*```/.test(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    const inlineSegs = applyInline(paragraph.join('\n'));
    for (const seg of inlineSegs) out.push(seg);
    if (i < lines.length && lines[i] === '') {
      out.push({ type: 'text', value: '\n' });
      i++;
    }
  }
  return out;
}

export function renderMarkdownToText(src: string): string {
  return renderMarkdownLite(src)
    .map((seg) => {
      const escaped = escHtml(seg.value);
      switch (seg.type) {
        case 'pre': return '<pre>' + escaped + '</pre>';
        case 'code': return '<code>' + escaped + '</code>';
        case 'bold': return '<strong>' + escaped + '</strong>';
        case 'italic': return '<em>' + escaped + '</em>';
        default: return escaped;
      }
    })
    .join('');
}

export function escape(s: string): string {
  return escHtml(s);
}
