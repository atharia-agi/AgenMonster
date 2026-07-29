// Agent self-tool-call — pure parser.
//
// When the LLM emits a tool call at the end of a reply, it uses the marker:
//
//   __AGENT_MCP__:tool.name|{"param":"value"}
//
// This module extracts the marker so the UI layer can dispatch it.

const AGENT_MCP_RE = /__AGENT_MCP__:([a-z]+\.[a-z.]+)\|(.+?)(?:\s|$)/g;

export interface AgentToolCall {
  raw: string;
  name: string;
  params: Record<string, unknown>;
}

export function parseAgentToolCall(reply: string): AgentToolCall | null {
  const matches = [...reply.matchAll(AGENT_MCP_RE)];
  if (matches.length === 0) return null;
  const m = matches[matches.length - 1];
  let params: Record<string, unknown> = {};
  try {
    params = JSON.parse(m[2]);
  } catch {
    return null;
  }
  const raw = (m[0] || '').trim();
  if (!raw) return null;
  return { raw, name: m[1], params };
}
