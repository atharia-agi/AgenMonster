import { logger } from '../logger.ts';

export interface ChaosConfig {
  enabled: boolean;
  failureRate: number;
  latencyMs: { min: number; max: number };
  errorCodes: number[];
  errorMessages: string[];
  networkPartition: boolean;
  cpuThrottle: number;
  memoryPressure: boolean;
}

export const defaultChaosConfig: ChaosConfig = {
  enabled: false,
  failureRate: 0,
  latencyMs: { min: 0, max: 0 },
  errorCodes: [500, 502, 503, 504],
  errorMessages: [
    'Internal Server Error',
    'Bad Gateway',
    'Service Unavailable',
    'Gateway Timeout',
  ],
  networkPartition: false,
  cpuThrottle: 0,
  memoryPressure: false,
};

let currentConfig: ChaosConfig = { ...defaultChaosConfig };
let chaosEnabled = false;

export function setChaosConfig(config: Partial<ChaosConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  chaosEnabled = currentConfig.enabled;
}

export function getChaosConfig(): ChaosConfig {
  return { ...currentConfig };
}

export function enableChaos(): void {
  chaosEnabled = true;
  currentConfig.enabled = true;
}

export function disableChaos(): void {
  chaosEnabled = false;
  currentConfig.enabled = false;
}

export function isChaosEnabled(): boolean {
  return chaosEnabled;
}

export function shouldInjectFailure(): boolean {
  if (!chaosEnabled) return false;
  return Math.random() < currentConfig.failureRate;
}

export function getRandomLatency(): number {
  if (!chaosEnabled) return 0;
  const { min, max } = currentConfig.latencyMs;
  if (min === 0 && max === 0) return 0;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomErrorCode(): number {
  const codes = currentConfig.errorCodes;
  return codes[Math.floor(Math.random() * codes.length)];
}

export function getRandomErrorMessage(): string {
  const messages = currentConfig.errorMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

export function createChaosError(): Error {
  const code = getRandomErrorCode();
  const message = getRandomErrorMessage();
  const error = new Error(`${code}: ${message}`);
  (error as any).statusCode = code;
  (error as any).isChaosError = true;
  return error;
}

export function injectLatency(): Promise<void> {
  const latency = getRandomLatency();
  if (latency > 0) {
    return new Promise((resolve) => setTimeout(resolve, latency));
  }
  return Promise.resolve();
}

export function injectFailure<T>(operation: () => Promise<T>): Promise<T> {
  return injectLatency().then(() => {
    if (shouldInjectFailure()) {
      throw createChaosError();
    }
    return operation();
  });
}

export function withChaos<T>(operation: () => Promise<T>): Promise<T> {
  return injectFailure(operation);
}

export class ChaosMiddleware {
  private config: ChaosConfig;

  constructor(config: Partial<ChaosConfig> = {}) {
    this.config = { ...defaultChaosConfig, ...config };
  }

  private shouldInjectFailure(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.failureRate;
  }

  private getRandomLatency(): number {
    if (!this.config.enabled) return 0;
    const { min, max } = this.config.latencyMs;
    if (min === 0 && max === 0) return 0;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomErrorCode(): number {
    const codes = this.config.errorCodes;
    return codes[Math.floor(Math.random() * codes.length)];
  }

  private getRandomErrorMessage(): string {
    const messages = this.config.errorMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  async handle(request: Request, next: (req: Request) => Promise<Response>): Promise<Response> {
    if (!this.config.enabled) {
      return next(request);
    }

    const latency = this.getRandomLatency();
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    if (this.shouldInjectFailure()) {
      const code = this.getRandomErrorCode();
      const message = this.getRandomErrorMessage();
      return new Response(JSON.stringify({ error: message }), {
        status: code,
        headers: { 'Content-Type': 'application/json', 'X-Chaos-Injected': 'true' },
      });
    }

    return next(request);
  }

  setConfig(config: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ChaosConfig {
    return { ...this.config };
  }
}

export function createChaosMiddleware(config?: Partial<ChaosConfig>): ChaosMiddleware {
  return new ChaosMiddleware(config);
}

export const chaosScenarios = {
  networkPartition: { enabled: true, networkPartition: true, failureRate: 0.3 },
  highLatency: { enabled: true, latencyMs: { min: 1000, max: 5000 } },
  intermittentErrors: { enabled: true, failureRate: 0.15 },
  cascadeFailure: { enabled: true, failureRate: 0.5, latencyMs: { min: 500, max: 2000 } },
  timeoutStorm: { enabled: true, latencyMs: { min: 10000, max: 30000 }, failureRate: 0.4 },
  degradePerformance: { enabled: true, latencyMs: { min: 100, max: 500 }, failureRate: 0.05 },
};

export function applyScenario(name: keyof typeof chaosScenarios): void {
  const scenario = chaosScenarios[name];
  if (scenario) {
    setChaosConfig(scenario);
    logger.info(`[Chaos] Applied scenario: ${name}`, { scenario });
  }
}

export function clearScenarios(): void {
  setChaosConfig(defaultChaosConfig);
  logger.info('[Chaos] Cleared all scenarios');
}