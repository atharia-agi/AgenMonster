import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ACPBridge,
  createACPConfig,
  ACP_AGENT_REGISTRY,
  type ACPAgentKind,
} from '../src/lib/acpBridge.ts';

describe('acpBridge', () => {
  it('creates config for claude-code', () => {
    const config = createACPConfig('claude-code', 'claude-sonnet-4-6', '/projects');
    assert.strictEqual(config.kind, 'claude-code');
    assert.ok(config.command.length > 0);
    assert.ok(Array.isArray(config.args));
  });

  it('creates config for codex', () => {
    const config = createACPConfig('codex');
    assert.strictEqual(config.kind, 'codex');
  });

  it('creates config for gemini', () => {
    const config = createACPConfig('gemini', 'gemini-pro');
    assert.strictEqual(config.kind, 'gemini');
  });

  it('creates config for custom', () => {
    const config = createACPConfig('custom', 'custom-model', '/workdir');
    assert.strictEqual(config.kind, 'custom');
    assert.strictEqual(config.command, '');
  });

  it('connects and reports connected', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code'));
    const connected = await bridge.connect();
    assert.strictEqual(connected, true);
    assert.strictEqual(bridge.isConnected(), true);
  });

  it('disconnects cleanly', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code'));
    await bridge.connect();
    await bridge.disconnect();
    assert.strictEqual(bridge.isConnected(), false);
  });

  it('send returns agent info for agent.info', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code'));
    await bridge.connect();
    const result = await bridge.send('agent.info') as Record<string, unknown>;
    assert.ok(result);
    assert.ok('name' in result);
  });

  it('send returns chat response for agent.chat', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code'));
    await bridge.connect();
    const result = await bridge.send('agent.chat', { message: 'hello' }) as Record<string, unknown>;
    assert.ok(result);
    assert.ok('content' in result);
  });

  it('send returns queued for unknown methods', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code'));
    await bridge.connect();
    const result = await bridge.send('unknown.method');
    assert.ok(result);
    assert.strictEqual((result as Record<string, unknown>).status, 'queued');
  });

  it('throws when not connected', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code'));
    await assert.rejects(() => bridge.send('agent.info'), /not connected/);
  });

  it('getConfig returns a copy of config', async () => {
    const bridge = new ACPBridge(createACPConfig('claude-code', 'claude-3-opus', '/test'));
    const config = bridge.getConfig();
    assert.strictEqual(config.kind, 'claude-code');
    assert.strictEqual(config.model, 'claude-3-opus');
  });

  it('registry has all agent kinds', () => {
    const kinds: ACPAgentKind[] = ['claude-code', 'codex', 'gemini', 'custom'];
    for (const kind of kinds) {
      assert.ok(kind in ACP_AGENT_REGISTRY, `Expected ${kind} in registry`);
    }
  });
});
