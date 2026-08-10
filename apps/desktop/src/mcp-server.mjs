#!/usr/bin/env node
// mcp-server.mjs — stdio JSON-lines transport for MCP tools.
// Reads `{"id":..., "method":"tool.name","params":{...}}` lines from stdin,
// writes `{"jsonrpc":"2.0","id":...,"ok":true,"data":{...}}` to stdout.
// Local tools dispatch through handleTool; secondbrain.* / browseros.* bridge
// to the SecondBrain om-mcp process and the BrowserOS MCP endpoint.
import { handleTool, TOOLS } from './lib/mcp.ts';
import { spawn } from 'node:child_process';

const OM_MCP = 'K:\\SecondBrain\\.claude\\scripts\\om-mcp.mjs';
const OM_CWD = 'K:\\SecondBrain\\.mcp';
const OM_TIMEOUT = 15000;
const BROWSEROS_URL = 'http://127.0.0.1:9001/mcp';
const BROWSEROS_TIMEOUT = 30000;

async function callBrowserOS(name, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BROWSEROS_TIMEOUT);
  try {
    const resp = await fetch(BROWSEROS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: params },
      }),
      signal: controller.signal,
    });
    const data = await resp.json();
    return { content: data?.result?.content ?? [] };
  } finally {
    clearTimeout(timer);
  }
}

function callSecondBrain(name, params) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [OM_MCP], {
      cwd: OM_CWD,
      env: { ...process.env, OBSIDIAN_VAULT: 'K:\\SecondBrain\\Monster_Brain' },
    });
    let collected = '';
    let msgId;
    try {
      msgId = Date.now();
    } catch {
      msgId = 1;
    }
    const msg = JSON.stringify({
      jsonrpc: '2.0',
      id: msgId,
      method: 'tools/call',
      params: { name, arguments: params },
    });
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error('secondbrain timeout'));
    }, OM_TIMEOUT);
    child.stdout.on('data', (chunk) => {
      collected += chunk.toString();
      let idx;
      while ((idx = collected.indexOf('\n')) >= 0) {
        const line = collected.slice(0, idx).trim();
        collected = collected.slice(idx + 1);
        if (!line.startsWith('{"jsonrpc"')) continue;
        try {
          const resp = JSON.parse(line);
          if (resp.id === msgId) {
            clearTimeout(timer);
            try { child.kill(); } catch {}
            resolve(resp.result);
            return;
          }
        } catch {}
      }
    });
    child.stderr.on('data', () => {});
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    try {
      child.stdin.write(msg + '\n');
    } catch (e) {
      clearTimeout(timer);
      reject(new Error('secondbrain write failed: ' + (e instanceof Error ? e.message : String(e))));
    }
  });
}

async function route(name, params) {
  if (TOOLS.includes(name)) return handleTool(name, params);
  if (name.startsWith('secondbrain.')) {
    const sbName = name.slice('secondbrain.'.length);
    const result = await callSecondBrain(sbName, params);
    const text = result?.content?.[0]?.text ?? '';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
    return { ok: true, data };
  }
  if (name.startsWith('browseros.')) {
    const boName = name.slice('browseros.'.length);
    const result = await callBrowserOS(boName, params);
    const text = result?.content?.[0]?.text ?? '';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
    return { ok: true, data };
  }
  return { ok: false, error: `Unknown tool: ${name}` };
}

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
    (async () => {
      try {
        const msg = JSON.parse(line);
        const id = msg.id;
        const name = String(msg.method || msg.name || '');
        const params = msg.params || {};
        const res = await route(name, params);
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ...res }) + '\n');
      } catch (e) {
        process.stderr.write('ERR: ' + (e instanceof Error ? e.message : String(e)) + '\n');
        try {
          const msg = JSON.parse(line);
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, ok: false, error: e instanceof Error ? e.message : String(e) }) + '\n');
        } catch {}
      }
    })();
  }
});
process.stdin.on('end', () => process.exit(0));
process.stdin.resume();
