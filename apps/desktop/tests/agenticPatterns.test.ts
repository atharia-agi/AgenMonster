import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getModeConfig, isModeReadOnly, resolvePermission, matchPattern } from '../src/lib/agentMode.ts';
import { DoomLoopDetector } from '../src/lib/doomLoop.ts';
import { runInputGuardrails, createDangerousCommandGuardrail, createSensitiveFileGuardrail, createReadOnlyModeGuardrail } from '../src/lib/guardrails.ts';
import { resetSkillRegistry, getSkillsForQuery, registerSkill, getSkill, getAllSkills, recordSkillUsage } from '../src/lib/agentSkills.ts';
import { shouldCompact, compactMessages, estimateCompactionSavings } from '../src/lib/compaction.ts';

// Agent mode system
describe('agentMode', () => {
  it('getModeConfig returns plan mode with deny for edits', () => {
    const plan = getModeConfig('plan');
    assert.strictEqual(plan.mode, 'plan');
    assert.strictEqual(plan.permissions.edit, 'deny');
    assert.strictEqual(isModeReadOnly('plan'), true);
  });

  it('getModeConfig returns build mode with allow for edits', () => {
    const build = getModeConfig('build');
    assert.strictEqual(build.mode, 'build');
    assert.strictEqual(build.permissions.edit, 'allow');
    assert.strictEqual(isModeReadOnly('build'), false);
  });

  it('resolvePermission returns deny for plan mode edit', () => {
    const plan = getModeConfig('plan');
    const result = resolvePermission(plan.permissions, { toolName: 'edit', toolInput: '/tmp/test.ts' });
    assert.strictEqual(result, 'deny');
  });

  it('resolvePermission returns allow for build mode read', () => {
    const build = getModeConfig('build');
    const result = resolvePermission(build.permissions, { toolName: 'read', toolInput: '/tmp/test.ts' });
    assert.strictEqual(result, 'allow');
  });

  it('matchPattern handles wildcards', () => {
    assert.strictEqual(matchPattern('git *', 'git status'), true);
    assert.strictEqual(matchPattern('git *', 'npm install'), false);
    assert.strictEqual(matchPattern('*', 'anything'), true);
  });
});

// Doom loop detection
describe('doomLoop', () => {
  it('detects identical repeated calls', () => {
    const detector = new DoomLoopDetector({ maxIdenticalCalls: 3, maxNearIdenticalRatio: 0.8, windowMs: 60000 });
    detector.record('bash', 'npm test');
    detector.record('bash', 'npm test');
    detector.record('bash', 'npm test');
    const result = detector.check('bash', 'npm test');
    assert.strictEqual(result.isDoomLoop, true);
    assert.strictEqual(result.identicalCount, 4);
  });

  it('does not flag non-repeated calls', () => {
    const detector = new DoomLoopDetector({ maxIdenticalCalls: 3, maxNearIdenticalRatio: 0.8, windowMs: 60000 });
    detector.record('bash', 'npm test');
    detector.record('bash', 'npm run build');
    const result = detector.check('bash', 'npm test');
    assert.strictEqual(result.isDoomLoop, false);
  });

  it('resets correctly', () => {
    const detector = new DoomLoopDetector({ maxIdenticalCalls: 3, maxNearIdenticalRatio: 0.8, windowMs: 60000 });
    detector.record('bash', 'npm test');
    detector.reset();
    const result = detector.check('bash', 'npm test');
    assert.strictEqual(result.isDoomLoop, false);
  });
});

// Guardrails
describe('guardrails', () => {
  it('blocks dangerous bash commands', async () => {
    const guardrail = createDangerousCommandGuardrail();
    const result = await runInputGuardrails([guardrail], {
      toolName: 'bash',
      toolInput: { command: 'rm -rf /' },
      userMessage: 'test',
      systemPrompt: 'test',
      agentMode: 'build',
    });
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'block');
  });

  it('blocks sensitive file edits', async () => {
    const guardrail = createSensitiveFileGuardrail();
    const result = await runInputGuardrails([guardrail], {
      toolName: 'edit',
      toolInput: { path: '.env' },
      userMessage: 'test',
      systemPrompt: 'test',
      agentMode: 'build',
    });
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'block');
  });

  it('blocks edits in plan mode', async () => {
    const guardrail = createReadOnlyModeGuardrail();
    const result = await runInputGuardrails([guardrail], {
      toolName: 'edit',
      toolInput: { path: '/tmp/test.ts' },
      userMessage: 'test',
      systemPrompt: 'test',
      agentMode: 'plan',
    });
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'block');
  });
});

// Agent skills
describe('agentSkills', () => {
  beforeEach(() => {
    resetSkillRegistry();
  });

  it('getSkillsForQuery returns matching skills', () => {
    const skills = getSkillsForQuery('review this code for security issues');
    assert.ok(skills.length > 0);
    assert.ok(skills.some(s => s.id === 'code-review' || s.id === 'security-auditor'));
  });

  it('registerSkill adds new skill', () => {
    registerSkill({
      id: 'custom-skill',
      name: 'Custom',
      description: 'A custom skill',
      keywords: ['custom'],
      whenToUse: 'When custom is needed',
    });
    const skill = getSkill('custom-skill');
    assert.ok(skill);
    assert.strictEqual(skill.name, 'Custom');
    assert.ok(getAllSkills().some(s => s.id === 'custom-skill'));
  });

  it('recordSkillUsage tracks usage', () => {
    recordSkillUsage('code-review');
    const skill = getSkill('code-review');
    assert.ok(skill);
  });
});

// Session compaction
describe('compaction', () => {
  it('shouldCompact returns true for long conversations', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'This is a test message with some content. '.repeat(50),
    }));
    assert.strictEqual(shouldCompact(messages), true);
  });

  it('shouldCompact returns false for short conversations', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    assert.strictEqual(shouldCompact(messages), false);
  });

  it('compactMessages produces summary', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: (i % 2 === 0 ? 'User message ' : 'Assistant response ').repeat(50),
    }));
    const result = compactMessages(messages);
    assert.ok(result.summary.length > 0);
    assert.ok(result.compressedCharCount > 0);
    assert.ok(result.originalTurnCount >= 10);
  });

  it('estimateCompactionSavings returns positive savings', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'Message '.repeat(100),
    }));
    const savings = estimateCompactionSavings(messages);
    assert.ok(savings.savings > 0);
    assert.ok(savings.currentChars > 0);
  });
});
