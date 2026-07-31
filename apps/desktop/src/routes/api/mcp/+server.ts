import { handleTool, TOOLS, SECOND_BRAIN_TOOLS, type ToolResult } from '$lib/mcp.ts';
import { spawn } from 'child_process';

const OM_MCP = 'K:\\SecondBrain\\.claude\\scripts\\om-mcp.mjs';
const OM_CWD = 'K:\\SecondBrain\\.mcp';
const OM_TIMEOUT = 15000;

function callSecondBrain(
  name: string,
  params: Record<string, unknown> = {},
): Promise<{ content: Array<{ type: string; text: string }> }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [OM_MCP], {
      cwd: OM_CWD,
      env: { ...process.env, OBSIDIAN_VAULT: 'K:\\SecondBrain\\Monster_Brain' },
    });
    let collected = '';
    let msgId: number;
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

export const POST = async ({ request }: { request: Request }) => {
  try {
    const { name, params } = (await request.json()) as {
      name?: string;
      params?: Record<string, unknown>;
    };

    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'missing name' } as ToolResult), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    if ((TOOLS as readonly string[]).includes(name)) {
      const result: ToolResult = handleTool(name, params ?? {});
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json' },
      });
    }

    if (name.startsWith('secondbrain.')) {
      const sbName = name.slice('secondbrain.'.length);
      try {
        const result = await callSecondBrain(sbName, params ?? {});
        const text = result.content?.[0]?.text ?? '';
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = { text };
        }
        return new Response(JSON.stringify({ ok: true, data } satisfies ToolResult), {
          headers: { 'content-type': 'application/json' },
        });
      } catch (e: unknown) {
        return new Response(
          JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) } as ToolResult),
          { status: 502, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    return new Response(JSON.stringify({ ok: false, error: `Unknown tool: ${name}` } as ToolResult), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) } as ToolResult),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
};

export const GET = async () => {
  return new Response(
    JSON.stringify({
      local: TOOLS,
      secondbrain: SECOND_BRAIN_TOOLS,
      all: [...TOOLS, ...SECOND_BRAIN_TOOLS],
    }),
    { headers: { 'content-type': 'application/json' } },
  );
};
