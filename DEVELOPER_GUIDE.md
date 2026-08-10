# Developer Guide

Welcome — you're going to add a subsystem to AgenMonster. This guide
walks through the principles and conventions.

## The 6 rules

1. **Pure logic + DOM glue.** State modules don't import Svelte; UI imports them. Keep `src/lib/*.ts` free of framework coupling.
2. **Server-side keys only.** All LLM calls go through `vite.config.ts` (dev) or `server.mjs` (prod). Never add a direct provider call from the browser.
3. **Tests grow monotonically.** Never delete a test when shipping. Add ≥1 test per new feature.
4. **`svelte-check` always green.** No warnings accepted. Fix them before committing.
5. **State persistence versioned.** Every `GameState` schema change needs a migration path in `gameState.ts`.
6. **About panel = source of truth.** Every visible feature must appear in the About section.

## CLI Commands

```bash
# Start dev server (LLM proxy + HMR)
npm run dev

# Health checks
npm run lint         # svelte-check (0 errors, 0 warnings)

# Run tests
npm test             # 518 unit tests (node --test, no deps)
npm run test:e2e     # Playwright e2e (10/10 pass, needs preview server)

# Build
npm run build        # static SPA to build/
npm run preview      # preview production build
npm run start        # zero-dep Node server (built SPA + LLM proxy)
```

## Environment Variables

Create a `.env` file in the project root:

```env
# LLM Providers
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
NOUS_API_KEY=...

# Search APIs (optional)
TAVILY_API_KEY=tvly-...
BRAVE_API_KEY=BSA...

# Custom provider (optional)
CUSTOM_ENDPOINT=https://your-proxy/v1
CUSTOM_API_KEY=...
```

Keys are loaded via `dotenv` in `vite.config.ts` (dev) and `server.mjs` (prod).
The browser never sees these keys.

## Building a new feature

### 1. Pure logic module (`src/lib/`)
Add a new `.ts` file with no Svelte imports. Export pure functions and types.

```ts
// src/lib/myFeature.ts
export interface MyState {
  count: number;
  lastUpdate: number;
}

export function createInitial(): MyState {
  return { count: 0, lastUpdate: Date.now() };
}

export function increment(state: MyState): MyState {
  return { ...state, count: state.count + 1, lastUpdate: Date.now() };
}
```

### 2. Tests (`tests/`)
Add a corresponding `.test.ts` file. Use `node --test` (built-in test runner).

```ts
// tests/myFeature.test.ts
import { test } from 'node:test';
import { assert } from 'node:assert';
import { createInitial, increment } from '../src/lib/myFeature';

test('increment increases count', () => {
  const state = createInitial();
  const next = increment(state);
  assert.equal(next.count, 1);
});
```

### 3. UI component (`src/lib/panels/`)
Import the pure module and wire it to `GameState`.

```svelte
<!-- src/lib/panels/MyPanel.svelte -->
<script lang="ts">
  import { createInitial, increment } from '$lib/myFeature';
  import type { GameState } from '$lib/gameState';

  let { state }: { state: GameState } = $props();
  let local = $state(createInitial());
</script>
```

### 4. Wire into `+page.svelte`
Add a new tab in `TopNav` and a corresponding `{:else if activeTab === 'mytab'}` block.

## Building a new slash command

Add to `src/lib/commands/slashCommands.ts`:

```ts
export function handleSlashCommand(input: string, gs: GameState): string {
  if (input.startsWith('/mycommand')) {
    // ... logic
    return 'Result message';
  }
}
```

## Building a new MCP tool

Add to `src/lib/mcp.ts`:

```ts
export async function handleTool(name: string, params: any): Promise<{ok: boolean; data?: any; error?: string}> {
  if (name === 'my.tool') {
    return { ok: true, data: { result: 'done' } };
  }
}
```

Then expose via HTTP in `server.mjs` (`POST /api/mcp`) and/or stdio in `src/mcp-server.mjs`.

## Building a new world area

Add to `src/lib/worldEngine.ts`:

```ts
export const AREAS: Area[] = [
  // ... existing areas
  {
    id: 'new_area',
    name: 'New Area',
    minLevel: 10,
    encounterTable: [...],
    weatherChances: { clear: 0.5, rain: 0.3, fog: 0.2 },
    npcs: [],
    decorations: [],
  },
];
```

## Project Structure

```
agenmonster/
├── apps/
│   └── desktop/                # SvelteKit 5 web app
│       ├── src/
│       │   ├── lib/
│       │   │   ├── gameState.ts      # GameState interface + persistence
│       │   │   ├── worldEngine.ts    # World areas, weather, seasons
│       │   │   ├── eventEngine.ts    # NPCs, encounters, story events
│       │   │   ├── petEvolution.ts   # Forms, paths, evolution logic
│       │   │   ├── hubGrowth.ts      # Services, quests, decorations
│       │   │   ├── items.ts          # Item definitions, effects, shop helpers
│       │   │   ├── exploration.ts    # Movement, AI, interactions
│       │   │   ├── gameLoop.ts       # 30s tick for world/evolution/hub
│       │   │   ├── panels/           # Svelte UI components
│       │   │   ├── commands/         # Slash command handlers
│       │   │   └── render/           # Canvas renderers (PixelPetV2)
│       │   └── routes/               # SvelteKit routes
│       ├── tests/
│       │   ├── *.test.ts             # Unit tests (node --test)
│       │   └── e2e/                  # Playwright e2e tests
│       ├── server.mjs                # Production server (zero-dep)
│       └── vite.config.ts            # Dev server + LLM proxy
├── docs/
│   ├── PLAN.md                      # Forward plan
│   ├── DAILY_COMPANION.md           # Daily companion roadmap
│   └── changelog/                   # Historical changelogs
├── .env                             # API keys (not committed)
└── README.md                        # Project overview
```

## Running Tests

```bash
# Unit tests (871 passing)
npm test

# Lint (0 errors, 0 warnings)
npm run lint

# Build (green)
npm run build

# E2E (10/10 pass, needs preview server)
# Terminal 1: npm run preview -- --port 4173
# Terminal 2: E2E_URL=http://localhost:4173 npx playwright test
```

## Conventions

- **No `as any` casts.** Use proper types or `unknown` + type guards.
- **No `border-radius`, `backdrop-filter`, `box-shadow`.** Pixel aesthetic only.
- **No transitions >250ms.** Use `steps()` for pixel animations.
- **All colors from CSS variables.** `--gb-bg`, `--gb-panel`, `--gb-border`, `--gb-text`, `--gb-stroke`.
- **Fonts**: Inter for body, Plus Jakarta Sans for headings. 14px base.
- **Mobile**: media queries at 768px and 480px.
- **Accessibility**: `role`, `tabindex`, `onkeydown` for interactive elements.

## Svelte 5 Runes Cheat Sheet

AgenMonster uses Svelte 5 runes for reactivity. No more `let` + `$:` for reactive declarations.

### `$state` — reactive variable

```svelte
<script lang="ts">
  let count = $state(0);
  let user = $state({ name: 'Monster', level: 1 });
</script>

<button onclick={() => count++}>Count: {count}</button>
<p>{user.name} — Lv{user.level}</p>
```

Rules:
- Mutate properties directly: `user.level = 2` (no spread needed)
- Arrays: `items.push('new')` or `items = [...items, 'new']`
- Objects: assign the whole object to trigger reactivity

### `$derived` — computed value

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<p>Count: {count}, Doubled: {doubled}</p>
```

### `$effect` — side effect

```svelte
<script lang="ts">
  let count = $state(0);
  
  $effect(() => {
    console.log('Count changed to', count);
    return () => console.log('Cleanup');
  });
</script>
```

### `$props` — component props

```svelte
<script lang="ts">
  let { name, age = 18 }: { name: string; age?: number } = $props();
</script>

<p>{name} is {age} years old</p>
```

### `$bindable` — two-way binding prop

```svelte
<script lang="ts">
  let { value = $bindable('') }: { value: string } = $props();
</script>

<input bind:value />
```

### Component patterns

```svelte
<!-- Event forwarding -->
<button onclick={() => dispatch('select', item.id)}>Select</button>

<!-- Slot -->
<div class="panel"><slot /></div>

{#if condition}
  <Child />
{/if}
```

### Anti-patterns to avoid

- DON'T use `$:` for reactive declarations — use `$derived`
- DON'T use `export let` for props — use `$props()`
- DON'T use `on:click` — use `onclick`
- DON'T use `<script context="module">` — not supported in Svelte 5
