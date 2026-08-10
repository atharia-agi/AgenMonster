// Agent Client Protocol (ACP) interchange layer.
//
// A lightweight JSON-RPC inspired protocol for talking to coding agents.
// Allows AgenMonster to:
//   - Spawn external agents (Claude Code, Codex, Gemini)
//   - Relay messages bidirectionally
//   - Switch backends without changing the UI
//
// Inspired by OpenHands' Agent Client Protocol.

export type ACPAgentKind = 'claude-code' | 'codex' | 'gemini' | 'custom';

export interface ACPConfig {
  kind: ACPAgentKind;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  model?: string;
  cwd?: string;
}

export interface ACPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export type ACPEventHandler = (msg: ACPMessage) => void;

export class ACPBridge {
  private config: ACPConfig;
  private handlers: Map<string, ACPEventHandler[]> = new Map();
  private messageId = 0;
  private pending = new Map<string | number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
  private worker: Worker | null = null;
  private ready = false;
  private error: string | null = null;

  constructor(config: ACPConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // In a production desktop app, this would spawn the agent CLI
    // as a subprocess and relay JSON-RPC over stdio.
    // For now, we simulate the connection for UI testing.
    this.ready = true;
    return true;
  }

  async send(method: string, params: unknown = {}): Promise<unknown> {
    if (!this.ready) throw new Error('ACP bridge not connected');
    const id = ++this.messageId;
    const msg: ACPMessage = { jsonrpc: '2.0', id, method, params };

    // Simulate response for testing
    if (method === 'agent.info') {
      return { name: this.config.kind, version: '1.0.0', capabilities: ['chat', 'tool_use'] };
    }
    if (method === 'agent.chat') {
      return { role: 'assistant', content: 'ACP agent response (simulated)' };
    }

    return { status: 'queued' };
  }

  async disconnect(): Promise<void> {
    this.ready = false;
  }

  isConnected(): boolean {
    return this.ready;
  }

  getConfig(): ACPConfig {
    return { ...this.config };
  }

  getError(): string | null {
    return this.error;
  }
}

// Registry of known ACP agent configurations
export const ACP_AGENT_REGISTRY: Record<ACPAgentKind, { command: string; defaultArgs: string[] }> = {
  'claude-code': {
    command: 'npx',
    defaultArgs: ['-y', '@agentclientprotocol/claude-agent-acp'],
  },
  'codex': {
    command: 'npx',
    defaultArgs: ['-y', '@zed-industries/codex-acp'],
  },
  'gemini': {
    command: 'npx',
    defaultArgs: ['-y', '@google/gemini-cli', '--acp'],
  },
  'custom': {
    command: '',
    defaultArgs: [],
  },
};

export function createACPConfig(kind: ACPAgentKind, model?: string, cwd?: string): ACPConfig {
  const registry = ACP_AGENT_REGISTRY[kind];
  return {
    kind,
    command: registry.command,
    args: registry.defaultArgs,
    model,
    cwd,
  };
}
