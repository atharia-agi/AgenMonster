#!/usr/bin/env node
// mcp-server.mjs — stdio JSON-lines transport for 19 MCP tools.
// Reads `{"id":..., "method":"tool.name","params":{...}}` lines from stdin,
// writes `{"jsonrpc":"2.0","id":...,"ok":true,"data":{...}}` to stdout.
import { handleTool, TOOLS } from './lib/mcp.ts';

const enc = new TextEncoder();
const dec = new TextDecoder();
let buf = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      const id = msg.id;
      const name = String(msg.method || msg.name || '');
      const params = msg.params || {};
      if (!TOOLS.includes(name)) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ok: false, error: `Unknown tool: ${name}` }) + '\n');
        continue;
      }
      const res = handleTool(name, params);
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ...res }) + '\n');
    } catch (e) {
      process.stderr.write('ERR: ' + (e instanceof Error ? e.message : String(e)) + '\n');
    }
  }
});
process.stdin.on('end', () => process.exit(0));
process.stdin.resume();
