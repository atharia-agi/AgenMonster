// TypeScript config — app configuration with localStorage persistence.

export interface AppConfig {
  alwaysOnTop: boolean;
  opacity: number;
  scale: number;
  energyMax: number;
  regenPerHour: number;
  llmProvider: string;
  model: string;
  llmApiKey: string;
  customEndpoint: string;
  volume: number;
  soundEnabled: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  alwaysOnTop: true,
  opacity: 1.0,
  scale: 1.0,
  energyMax: 1000,
  regenPerHour: 25,
  llmProvider: 'nousresearch',
  model: 'stepfun/step-3.7-flash:free',
  llmApiKey: '',
  customEndpoint: '',
  volume: 0.8,
  soundEnabled: true,
};

const STORAGE_KEY = 'agenmonster_config';

export function loadConfig(): AppConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function resetConfig(): AppConfig {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { ...DEFAULT_CONFIG };
}

export function toLLMConfig(config: AppConfig): import('./llm').LLMConfig {
  return {
    provider: (config.llmProvider as import('./llm').LLMConfig['provider']) || 'nousresearch',
    model: config.model || 'stepfun/step-3.7-flash:free',
    apiKey: config.llmApiKey || '',
    customEndpoint: config.customEndpoint || undefined,
  };
}
