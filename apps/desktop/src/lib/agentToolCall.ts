// Agent self-tool-call — pure parser.
//
// When the LLM emits a tool call at the end of a reply, it uses the marker:
//
//   __AGENT_MCP__:tool.name|{"param":"value"}
//
// This module extracts the marker so the UI layer can dispatch it.

const AGENT_MCP_RE = /__AGENT_MCP__:([a-z]+\.[a-z.]+)\|/g;

function extractJson(input: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"' && !escape) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }
  return null;
}

export interface AgentToolCall {
  raw: string;
  name: string;
  params: Record<string, unknown>;
}

export function parseAgentToolCall(reply: string): AgentToolCall | null {
  if (typeof reply !== 'string') return null;
  const matches = [...reply.matchAll(AGENT_MCP_RE)];
  if (matches.length === 0) return null;
  const m = matches[matches.length - 1];
  const jsonStart = m.index! + m[0].length;
  const jsonStr = extractJson(reply, jsonStart);
  if (!jsonStr) return null;
  let params: Record<string, unknown> = {};
  try {
    params = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  const raw = (m[0] + jsonStr).trim();
  if (!raw) return null;
  return { raw, name: m[1], params };
}
