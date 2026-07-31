export interface ProviderDefinition {
  keyEnv: string;
  keyEnvPrefix: string;
  api: string;
  def: string;
}

export interface ProviderInfo {
  id: string;
  label: string;
  models: string[];
  hasKey: boolean;
}

export const PROVIDERS: Record<string, ProviderDefinition> = {
  groq: {
    keyEnv: 'GROQ_API_KEY',
    keyEnvPrefix: 'GROQ_',
    api: 'https://api.groq.com/openai/v1/chat/completions',
    def: 'llama-3.1-8b-instant',
  },
  mistral: {
    keyEnv: 'MISTRAL_API_KEY',
    keyEnvPrefix: 'MISTRAL_',
    api: 'https://api.mistral.ai/v1/chat/completions',
    def: 'mistral-small-latest',
  },
  openai: {
    keyEnv: 'OPENAI_API_KEY',
    keyEnvPrefix: 'OPENAI_',
    api: 'https://api.openai.com/v1/chat/completions',
    def: 'gpt-4o-mini',
  },
  openrouter: {
    keyEnv: 'OPENROUTER_API_KEY',
    keyEnvPrefix: 'OPENROUTER_',
    api: 'https://openrouter.ai/api/v1/chat/completions',
    def: 'openrouter/auto',
  },
};

interface UpstreamPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  max_tokens: number;
}

export function resolveKey(env: Record<string, string>, provider: string): string {
  const def = PROVIDERS[provider];
  if (!def) return '';
  const variants: string[] = [];
  for (let i = 0; i < 10; i++) {
    variants.push(`${def.keyEnvPrefix}API_KEY${i === 0 ? '' : `_${i}`}`);
  }
  variants.push(`VITE_${def.keyEnvPrefix}API_KEY`);
  for (const key of variants) {
    if (env[key]) return env[key];
  }
  return '';
}

export function availableProviders(env: Record<string, string>): ProviderInfo[] {
  return Object.entries(PROVIDERS)
    .filter(([id]) => resolveKey(env, id) !== '')
    .map(([id, def]) => ({
      id: id as ProviderInfo['id'],
      label: id.charAt(0).toUpperCase() + id.slice(1),
      models: [def.def],
      hasKey: true,
    }));
}

export function prepareUpstreamRequest(
  env: Record<string, string>,
  body: { provider?: string; model?: string; messages?: Array<{ role: string; content: string }>; stream?: boolean },
  stream = false,
): { url: string; headers: Record<string, string>; payload: UpstreamPayload } {
  const provider = body.provider || 'groq';
  const def = PROVIDERS[provider];
  if (!def) throw new Error('unknown provider');
  const key = resolveKey(env, provider);
  if (!key) throw new Error(`No API key for ${provider}`);
  const model = body.model || def.def;
  return {
    url: def.api,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(provider === 'openrouter' ? { HTTP_Referer: 'https://agenmonster.local' } : {}),
    },
    payload: {
      model,
      messages: body.messages ?? [],
      stream,
      max_tokens: 1024,
    },
  };
}

export function readBody(req: { on(event: string, fn: (data: unknown) => void): void; once(event: string, fn: () => void): void }): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    req.on('data', (chunk) => {
  chunks.push(typeof chunk === 'string' ? chunk : (chunk as Buffer).toString('utf8'));
});
    req.on('end', () => resolve(chunks.join('')));
    req.on('error', reject);
  });
}