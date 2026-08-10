<script lang="ts">
  import type { ThemeName, ThemeVariant } from '$lib/theme';
  import { loadTheme, saveTheme, applyTheme, THEMES, loadVariant, saveVariant, applyVariant, VARIANTS } from '$lib/theme';
  import { loadColorBlind, saveColorBlind, applyColorBlind, COLOR_BLIND_TYPES } from '$lib/colorBlind';
  import { getGameState } from '$lib/gameState';
  import { onMount } from 'svelte';

  let { defaultTheme = 'gb', defaultVariant = 'cinematic', children } = $props<{ defaultTheme: ThemeName; defaultVariant: ThemeVariant; children: any }>();

  let currentTheme = $state<ThemeName>('gb');
  let currentVariant = $state<ThemeVariant>('cinematic');
  let colorBlindType = $state<string>('none');
  let reducedMotion = $state(false);
  let highContrast = $state(false);
  let isInitialized = $state(false);

  // Available options
  const themes: ThemeName[] = THEMES;
  const variants: ThemeVariant[] = VARIANTS;
  const colorBlindOptions = ['none', ...Object.keys(COLOR_BLIND_TYPES).filter(k => k !== 'none')];

  // Initialize from localStorage and system preferences
  onMount(() => {
    // Load saved theme
    const savedTheme = loadTheme();
    const savedVariant = loadVariant();
    const savedColorBlind = loadColorBlind();
    
    currentTheme = savedTheme;
    currentVariant = savedVariant;
    colorBlindType = savedColorBlind;
    
    // Detect system preferences
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    // Listen for changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    motionQuery.addEventListener('change', (e) => reducedMotion = e.matches);
    contrastQuery.addEventListener('change', (e) => highContrast = e.matches);
    
    // Apply initial theme
    applyTheme(savedTheme);
    applyVariant(savedVariant);
    document.documentElement.setAttribute('data-color-blind', savedColorBlind);
    
    if (reducedMotion) document.documentElement.classList.add('reduced-motion');
    if (highContrast) document.documentElement.classList.add('high-contrast');
    
    isInitialized = true;
  });

  // Apply theme to document
  function setTheme(theme: ThemeName) {
    currentTheme = theme;
    saveTheme(theme);
    applyTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update stage-specific theme
    const gs = getGameState();
    if (gs?.stage) {
      document.documentElement.setAttribute('data-stage', gs.stage);
    }
  }

  function setVariant(variant: ThemeVariant) {
    currentVariant = variant;
    saveVariant(variant);
    applyVariant(variant);
  }

  function setColorBlind(type: string) {
    colorBlindType = type;
    saveColorBlind(type);
    applyColorBlind(type);
    document.documentElement.setAttribute('data-color-blind', type);
  }

  // Auto-switch variant based on stage
  function updateStageTheme(stage: string) {
    document.documentElement.setAttribute('data-stage', stage);
  }

  // Auto-switch variant based on mood
  function updateMoodTheme(mood: string) {
    document.documentElement.setAttribute('data-mood', mood);
  }

  // Get computed theme for current context
  function getComputedTheme(): string {
    return `${currentVariant}-${currentTheme}`;
  }

  // Reset to defaults
  function resetToDefaults() {
    setTheme(defaultTheme);
    setVariant(defaultVariant);
    setColorBlind('none');
  }

  // Export for external use
  export function getTheme(): ThemeName { return currentTheme; }
  export function getVariant(): ThemeVariant { return currentVariant; }
  export function getColorBlind(): string { return colorBlindType; }
  export function isReducedMotion(): boolean { return reducedMotion; }
  export function isHighContrast(): boolean { return highContrast; }
</script>

<div class="theme-provider" data-theme-provider>
  {children}
</div>

<style>
  .theme-provider {
    display: contents;
  }
</style>