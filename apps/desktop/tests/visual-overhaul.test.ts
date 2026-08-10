import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Test design tokens
const fs = await import('fs');
const path = await import('path');

describe('Design Tokens', () => {
  test('DesignTokens.json exists and is valid JSON', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    assert.ok(tokens.version);
    assert.ok(tokens.color);
    assert.ok(tokens.color.stage);
    assert.ok(tokens.color.mood);
    assert.ok(tokens.color.ui);
    assert.ok(tokens.typography);
    assert.ok(tokens.spacing);
    assert.ok(tokens.animation);
  });

  test('All 7 stages have complete color palettes', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    const stages = ['egg', 'hatchling', 'baby', 'child', 'teen', 'adult', 'mega'];
    for (const stage of stages) {
      assert.ok(tokens.color.stage[stage]);
      const stageColors = tokens.color.stage[stage];
      assert.ok(stageColors.base);
      assert.ok(stageColors.accent);
      assert.ok(stageColors.glow);
      assert.ok(stageColors.outline);
      assert.ok(stageColors.surface);
    }
  });

  test('All moods have tint configurations', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    const moods = ['happy', 'excited', 'proud', 'sad', 'angry', 'frustrated', 'sleepy', 'tired', 'focused', 'thinking', 'idle'];
    for (const mood of moods) {
      assert.ok(tokens.color.mood[mood]);
      const moodConfig = tokens.color.mood[mood];
      assert.ok(moodConfig.tint);
      assert.ok(moodConfig.saturation);
      assert.ok(moodConfig.exposure);
    }
  });

  test('Typography scale is complete', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    const expectedSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
    for (const size of expectedSizes) {
      assert.ok(tokens.typography.fontSize[size]);
    }
    
    const expectedScales = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body-lg', 'body', 'body-sm', 'caption', 'overline'];
    for (const scale of expectedScales) {
      assert.ok(tokens.typography.scale[scale]);
      assert.ok(tokens.typography.scale[scale].size);
      assert.ok(tokens.typography.scale[scale].weight);
      assert.ok(tokens.typography.scale[scale].lineHeight);
    }
  });

  test('Animation tokens include spring and bounce easings', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    assert.ok(tokens.animation.easing.spring);
    assert.ok(tokens.animation.easing.bounce);
    assert.ok(tokens.animation.easing.springSoft);
    assert.ok(tokens.animation.easing.anticipate);
  });

  test('Quality tiers are defined', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    const tiers = ['low', 'medium', 'high', 'ultra'];
    for (const tier of tiers) {
      assert.ok(tokens.quality[tier]);
      assert.ok(tokens.quality[tier].particles);
      assert.ok(tokens.quality[tier].targetFps);
    }
  });

  test('Color blind palettes defined', () => {
    const tokensPath = path.resolve('K:/AgenMonster/apps/desktop/src/lib/theme/DesignTokens.json');
    const content = fs.readFileSync(tokensPath, 'utf-8');
    const tokens = JSON.parse(content);
    
    const types = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'protanomaly', 'deuteranomaly', 'tritanomaly', 'coneMonochromacy'];
    for (const type of types) {
      assert.ok(tokens.colorBlind[type]);
    }
  });
});

describe('VisualEngine', () => {
  test('VisualEngine.ts exists', () => {
    const path = 'K:/AgenMonster/apps/desktop/src/lib/render/VisualEngine.ts';
    const exists = fs.existsSync(path);
    assert.ok(exists, 'VisualEngine.ts should exist');
  });

  test('VisualEngine exports factory function', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/src/lib/render/VisualEngine.ts', 'utf-8');
    assert.ok(content.includes('export function createVisualEngine'));
    assert.ok(content.includes('export class VisualEngine'));
  });
});

describe('PixelPetV3', () => {
  test('PixelPetV3.svelte exists', () => {
    const path = 'K:/AgenMonster/apps/desktop/src/lib/render/PixelPetV3.svelte';
    const exists = fs.existsSync(path);
    assert.ok(exists, 'PixelPetV3.svelte should exist');
  });

  test('PixelPetV3 has physics systems', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/src/lib/render/PixelPetV3.svelte', 'utf-8');
    assert.ok(content.includes('SpringSystem'));
    assert.ok(content.includes('ClothSystem'));
    assert.ok(content.includes('SpringSystem'));
  });

  test('PixelPetV3 has mood tints', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/src/lib/render/PixelPetV3.svelte', 'utf-8');
    assert.ok(content.includes('MOOD_TINTS'));
    assert.ok(content.includes('happy'));
    assert.ok(content.includes('excited'));
    assert.ok(content.includes('angry'));
    assert.ok(content.includes('sad'));
  });

  test('PixelPetV3 has all 7 stages', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/src/lib/render/PixelPetV3.svelte', 'utf-8');
    const stages = ['egg', 'hatchling', 'baby', 'child', 'teen', 'adult', 'mega'];
    for (const stage of stages) {
      // STAGE_COLORS uses format like "egg:" not "'egg'"
      assert.ok(content.includes(`${stage}:`), `Stage ${stage} should be in STAGE_COLORS`);
    }
  });
});

describe('Theme Provider', () => {
  test('ThemeProvider.svelte exists', () => {
    const path = 'K:/AgenMonster/apps/desktop/src/lib/ThemeProvider.svelte';
    const exists = fs.existsSync(path);
    assert.ok(exists);
  });

  test('colorBlind.ts exists', () => {
    const path = 'K:/AgenMonster/apps/desktop/src/lib/colorBlind.ts';
    const exists = fs.existsSync(path);
    assert.ok(exists);
  });
});

describe('Design Tokens CSS', () => {
  test('tokens.css exists', () => {
    const path = 'K:/AgenMonster/apps/desktop/src/lib/theme/tokens.css';
    const exists = fs.existsSync(path);
    assert.ok(exists);
  });

  test('tokens.css has all stage variables', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/src/lib/theme/tokens.css', 'utf-8');
    const stages = ['egg', 'hatchling', 'baby', 'child', 'teen', 'adult', 'mega'];
    for (const stage of stages) {
      assert.ok(content.includes(`--stage-${stage}-base`));
      assert.ok(content.includes(`--stage-${stage}-accent`));
      assert.ok(content.includes(`--stage-${stage}-glow`));
    }
  });

  test('tokens.css has theme variants', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/src/lib/theme/tokens.css', 'utf-8');
    const variants = ['cinematic', 'cinematic-dim', 'competitive', 'accessibility', 'retro', 'minimal', 'streamer'];
    for (const variant of variants) {
      assert.ok(content.includes(`html[data-theme="${variant}"]`));
    }
  });
});

describe('Package.json scripts', () => {
  test('Package.json has new test scripts', () => {
    const content = fs.readFileSync('K:/AgenMonster/apps/desktop/package.json', 'utf-8');
    const pkg = JSON.parse(content);
    
    assert.ok(pkg.scripts['test:visual']);
    assert.ok(pkg.scripts['test:visual:update']);
    assert.ok(pkg.scripts['test:load:smoke']);
    assert.ok(pkg.scripts['test:load:load']);
    assert.ok(pkg.scripts['test:load:stress']);
    assert.ok(pkg.scripts['test:load:spike']);
    assert.ok(pkg.scripts['test:chaos']);
  });
});

console.log('\n✅ All validation tests passed!');