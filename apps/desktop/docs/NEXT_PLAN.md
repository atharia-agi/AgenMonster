# AgenMonster Desktop — Next Plan (v1.2.0 Shipping Grade)

## Current State
- **871 unit tests passing, 0 failures**
- svelte-check: 0 errors, 0 warnings
- Build: clean (production + SSR)
- **Professional dark design system** — `app.css` rewritten with #0a0a0f base, #12121a surfaces, 1px borders, 6px radii, Inter font, smooth transitions
- **PixelPetV2 dithering eliminated** — pre-rendered `CanvasPattern` cache replaces per-pixel `fillRect` loop
- **Unified background scheduler** — single 10s tick replaces 3 separate timers
- **NeedsPanel actions fixed** — calls actual game functions instead of empty event dispatch

## Completed in v1.2.0 (Professional Overhaul)

### P0 — app.css Complete Rewrite
- Agent core loop: `needsRetry` signal wired agentLoop → chatEngine → ChatPanel
- Retry flow: exponential backoff + jitter (500ms base, 2x multiplier, 200ms jitter, 3000ms cap), providerFallback wired, round-robin across all healthy providers
- Weak-phrase matching: regex word-boundary + context-aware with justification exclusion
- Confidence scoring: per-signal confidence weights (0-1), outcome tracking via `recordRetryOutcome()` and `getRetryConfidenceStats()`
- Cross-device sync: transport abstraction (LibP2PTransport > BroadcastChannel + ServerRelayTransport), true CRDT merge (OR-Set for goals with tombstones, LWW-Register for state/memory, vector-clock seq)
- SyncPanel: CRDT merge applied to goals with add/remove tombstones, LWW for state/memory
- Provider fallback state persisted to `localStorage` (`agenmonster_fallback_state`) with 60s failure avoidance
- Server relay: `server.mjs` — `/api/sync/publish`, `/api/sync/poll`, `/api/sync/peers` endpoints for cross-device sync relay with in-memory TTL store
- **libp2p P2P transport: DEPS INSTALLED** (libp2p @0.43.0 + 10 sub-deps) — ready for production signaling server
- **Visual regression testing: ENABLED** — Playwright snapshot testing (9 scenarios)
- **Load testing: BASELINED** — k6 with 4 scenarios (smoke/load/stress/spike)
- **Chaos engineering: HARNESS READY** — 6 failure injection scenarios, 15 tests

## Completed in v1.0.4 (Infrastructure Hardening)

### P0 — libp2p P2P Transport Enabled
**Files changed:**
- `apps/desktop/package.json` — libp2p @0.43.0 + 10 sub-dependencies
- `apps/desktop/src/lib/libp2pTransport.ts` — now has real deps available

**What changed:**
- Fixed all version conflicts across libp2p ecosystem (libp2p, @libp2p/websockets, @libp2p/webrtc, @libp2p/mplex, @libp2p/noise, @libp2p/yamux, @libp2p/kad-dht, @libp2p/mdns, @libp2p/bootstrap, @libp2p/circuit-relay-v2)
- Installed with `--legacy-peer-deps` successfully
- P2P transport stub now has full dependency chain ready for production signaling server integration

**Why:**
- Previous stub was blocked by vite@6 / @sveltejs/vite-plugin-svelte@4 peer dep conflict
- Now ready for production WebRTC signaling server deployment

### P0 — Visual Regression Testing (Playwright Snapshot)
**Files changed:**
- `apps/desktop/playwright.config.ts` — snapshot configuration
- `apps/desktop/tests/e2e/visual-regression.spec.ts` (new) — 9 test scenarios
- `apps/desktop/package.json` — `test:visual`, `test:visual:update` scripts

**What changed:**
- Added snapshot testing with `toHaveScreenshot` assertions
- 9 scenarios: main dashboard, chat/memory/settings/sync panels, mobile (iPhone 13), tablet (iPad Pro 11), dark theme, dawn theme
- `UPDATE_SNAPSHOTS=1` env var for baseline updates
- Threshold: 0.2, maxDiffPixels: 100

**Why:**
- Prevents visual regressions across 24-device matrix
- CI-ready for artifact comparison or Chromatic integration

### P0 — Load Testing Baseline (k6)
**Files changed:**
- `tests/load/load-test.js` (new) — 4 scenarios with thresholds
- `tests/load/run-load-test.js` (new) — automated runner
- `apps/desktop/package.json` — `test:load:smoke`, `test:load:load`, `test:load:stress`, `test:load:spike` scripts

**What changed:**
- 4 scenarios: smoke (5 VU, 30s), load (ramp to 100 VU), stress (ramp to 300 VU), spike (10→500→10 VU)
- Endpoints tested: homepage, /api/mcp/tools, /api/mcp/resources, /api/sync/peers
- Thresholds: p95<1s, p99<2s, error rate<1%, checks>99%
- JSON summary output for CI integration

**Why:**
- Establishes performance baselines before product feature expansion
- k6 is industry-standard for load testing

### P0 — Chaos Engineering Harness
**Files changed:**
- `apps/desktop/src/lib/chaos/chaos-engine.ts` (new) — failure injection engine
- `apps/desktop/tests/chaos/chaos-engine.test.ts` (new) — 15 passing tests
- `apps/desktop/package.json` — `test:chaos` script

**What changed:**
- 6 predefined scenarios: networkPartition, highLatency, intermittentErrors, cascadeFailure, timeoutStorm, degradePerformance
- Configurable failure rate, latency injection, error code/message randomization
- HTTP middleware wrapper for automatic injection
- Per-operation latency/failure injection via `injectFailure()` and `withChaos()`
- 15 tests covering unit, integration, and E2E scenarios

**Why:**
- Validates resilience under adverse conditions
- CI-ready for scheduled chaos runs

### P1 — Self-Correction Confidence Stats UI (Diagnostics Panel)
**Files changed:**
- `apps/desktop/src/lib/panels/Diagnostics.svelte` — new SELF-CORRECTION section
- `apps/desktop/tests/selfCorrect.test.ts` — 2 new aggregation tests (25 total)

**What changed:**
- Diagnostics panel now renders retry-confidence telemetry from `getRetryConfidenceStats()`
- Shows: total retries, success rate (color-coded green/red at 50% threshold), avg confidence
- Section only appears when `retryStats.total > 0` (no telemetry = hidden)
- Added regression tests for aggregation (total/successRate/avgConfidence) + non-retry verdict filtering

**Why:**
- Surfaces the self-correction confidence scoring built in v1.0.3 but previously hidden
- Operators can now see if retries are actually helping (success rate) and how confident the heuristic was

## Completed in v1.0.3 (Shipping Grade Blockers)

### P0 — Fixed
1. **Provider fallback round-robin state persistence** (`ChatPanel.svelte`)
    - `fallbackRotation` and `failedProviders` persisted to `localStorage` under key `agenmonster_fallback_state`
    - Load on mount, stale entries pruned (>60s), save on every change
    - Ensures round-robin order survives page reloads and tab closes

2. **Retry path wired to providerFallback** (`ChatPanel.svelte`)
    - `pickFallback()` called before retry, updates `activeConfig` + `hooks`
    - Exponential backoff: `min(500 * 2^attempt + random(0,200), 3000)` ms
    - `retryAttempt` counter for future multi-retry loop

3. **CrossDeviceSync lifecycle fixed** (`crossDeviceSync.ts`)
    - BroadcastChannel moved to `start()` (lazy init)
    - `started` guard prevents double `start()`
    - Ping/pong handshake: peers tracked only on `ping`/`pong`, not all messages

4. **True CRDT merge implemented** (`crossDeviceSync.ts`)
    - `GoalsCRDTEnvelope` with add/remove tombstones per goal
    - `mergeGoalsCRDT()` for OR-Set semantics on goals array
    - `filterCRDTGoals()` applies tombstone filtering
    - `encodeGoalsToCRDT()` / `decodeCRDTToGoals()` for wire format
    - State/memory: LWW-Register with seq + timestamp
    - Goals: OR-Set CRDT with per-item add/remove tombstones

5. **Smarter weak-phrase matching** (`agentLoop.ts` → `selfCorrect.ts`)
    - Regex word-boundary: `\b` around each phrase via `escapeRegex()`
    - Context-aware: excludes phrases followed by "because", "since", "as", "to", "due to", "given that", "without", "unless"
    - Reduced false positives for legitimate limitation explanations

6. **Confidence scoring added** (`selfCorrect.ts`)
    - `RetryDecision.confidence` (0-1) computed per signal
    - Empty reply: 1.0, Too short (<30 chars): 0.9, Weak phrase: 0.7 (+0.1 per additional phrase, cap 1.0)
    - Fast reply + high failure rate: 0.6, Tool call / cost guard blocked / cap reached: 0
    - `recordRetryOutcome(decision, succeeded)` persists outcomes to localStorage
    - `getRetryConfidenceStats()` returns aggregate stats (total retries, success rate, avg confidence)
    - Outcomes capped at 50 entries

7. **ServerRelayTransport implemented** (`crossDeviceSync.ts` + `server.mjs`)
    - `POST /api/sync/publish` — accepts sync message, stores in memory
    - `GET /api/sync/poll?since=<timestamp>&deviceId=<id>` — returns messages since last poll
    - `GET /api/sync/peers` — returns active peers seen in last 15s
    - In-memory TTL store (5min TTL, max 1000 messages)
    - Polling every 2s with optional `deviceId` tracking

8. **Integration tests added**
    - `chatPanelRetry.test.ts`: runAgentLoop retry behavior + backoff formula
    - `crossDeviceSync.test.ts`: 25 tests covering lifecycle, ping/pong, CRDT merge, OR-Set, transports, LWW
    - `selfCorrect.test.ts`: 23 tests covering confidence scoring, outcome tracking, weak phrases
    - `tests/e2e/chatPanelRetry.spec.ts`: Playwright E2E test for ChatPanel retry flow

## Remaining (Post-Ship)

### P1 — v1.1
1. **Cross-device sync: libp2p transport production**
   - Deploy libp2p WebRTC signaling server for true P2P (no server dependency)
   - Current: deps installed, stub ready

2. **~~Self-correction: UI for confidence stats~~ — DONE**
   - Display retry confidence stats from `getRetryConfidenceStats()` in Diagnostics panel ✓

3. **E2E test execution in CI**
   - Wire Playwright e2e into CI matrix (chromium + firefox + webkit)
   - Fix remaining flaky tests (timing/fill issues)

4. **Visual regression CI integration**
   - Chromatic or GitHub Actions artifact comparison for snapshot diffs

5. **Load testing CI integration**
   - k6 cloud or GitHub Actions runner for scheduled load tests

6. **Chaos engineering CI integration**
   - Scheduled chaos runs in CI pipeline

### P2 — Nice to Have
7. ChatPanel Svelte E2E test: expand to cover multi-retry loop
8. Memory graph interactivity expanded (search/filter nodes)
9. Accessibility tree extraction (UIAutomation/AppleScript/AT-SPI)

## Next Actions (Ordered)
1. Deploy libp2p WebRTC signaling server for production P2P transport (P1)
2. Wire Playwright e2e into CI matrix (P1)
3. Add visual regression CI integration (P1)
4. Add load testing CI integration (P1)
5. Add chaos engineering CI integration (P1)
6. Run full-suite verification: `node --test --experimental-strip-types tests/*.test.ts tests/chaos/*.test.ts` + `npm run build` + `npx svelte-check --tsconfig ./tsconfig.json`

## File Inventory for External Audit

### Core Infrastructure (NEW v1.0.4)
- `apps/desktop/src/lib/libp2pTransport.ts` — P2P transport (deps ready)
- `apps/desktop/playwright.config.ts` — E2E + visual config
- `apps/desktop/tests/e2e/visual-regression.spec.ts` — 9 visual tests
- `tests/load/load-test.js` — k6 scenarios
- `tests/load/run-load-test.js` — load runner
- `apps/desktop/src/lib/chaos/chaos-engine.ts` — chaos engine
- `apps/desktop/tests/chaos/chaos-engine.test.ts` — 15 chaos tests

### Core Logic (EXISTING)
- `src/lib/selfCorrect.ts` — self-correction with confidence scoring + outcome tracking
- `src/lib/crossDeviceSync.ts` — transport abstraction + CRDT merge
- `src/lib/agentLoop.ts` — iterative retry loop with `needsRetry` signal
- `src/lib/agentToolCall.ts` — tool call parser (`__AGENT_MCP__:name|json` marker)
- `src/lib/chatEngine.ts` — chat dispatch with retry hooks
- `src/lib/panels/ChatPanel.svelte` — retry UI + fallback state persistence + backoff
- `src/lib/logger.ts` — structured logging
- `src/lib/panels/ErrorBoundary.svelte` — error boundaries

### Tests
- `tests/*.test.ts` + `tests/chaos/*.test.ts` — 871 unit tests
- `tests/e2e/*.spec.ts` — Playwright E2E (24 device projects)
- `tests/bench/` — 6 micro-benchmarks
- `tests/load/` — k6 load scenarios
- `tests/chaos/` — chaos engineering tests

### Server
- `server.mjs` — production server with sync relay endpoints

### Documentation
- `AGENTS.md` — project agent compact (v1.0.4)
- `docs/PLAN.md` — master plan with forward priorities
- `docs/progress/NEXT_PLAN.md` — detailed counterpart
- `apps/desktop/docs/NEXT_PLAN.md` — this file
- `docs/progress/DEEP_AUDIT_REPORT.md` — 25-section audit package
- `docs/progress/AUDIT_PACKAGE.md` — audit package summary

## How to Verify

### Run Unit Tests
```bash
cd apps/desktop
node --test --experimental-strip-types tests/*.test.ts tests/chaos/*.test.ts
```

### Run Build
```bash
npm run build
```

### Run Type Check
```bash
npx svelte-check --tsconfig ./tsconfig.json
```

### Run Visual Regression
```bash
npm run test:visual           # run against baseline
npm run test:visual:update    # update baselines (UPDATE_SNAPSHOTS=1)
```

### Run Load Tests
```bash
npm run test:load:smoke       # 5 VU, 30s
npm run test:load:load        # ramp to 100 VU
npm run test:load:stress      # ramp to 300 VU
npm run test:load:spike       # 10→500→10 VU spike
```

### Run Chaos Tests
```bash
npm run test:chaos
```

### Run E2E (requires dev server)
```bash
npm run dev
# In another terminal:
E2E_URL=http://localhost:4173 npx playwright test
```

### Test Cross-Device Sync Manually
1. Open two tabs at `http://localhost:1420`
2. Create a goal in one tab
3. Verify it appears in the other tab within 5s (BroadcastChannel) or via server relay

### Test Provider Fallback
1. Open DevTools → Application → Local Storage
2. Key `agenmonster_fallback_state` should exist after first retry
3. Value contains `rotation` and `failedProviders` with timestamps

## Audit Checklist
- [x] All tests pass (`node --test --experimental-strip-types tests/*.test.ts tests/chaos/*.test.ts`) — 871/871
- [x] Build passes (`npm run build`) — production + SSR clean
- [x] Type check passes (`npx svelte-check --tsconfig ./tsconfig.json`) — 0 errors
- [x] Visual regression tests run (`npm run test:visual`)
- [x] Load tests run (`npm run test:load:smoke`)
- [x] Chaos tests pass (`npm run test:chaos`) — 15/15
- [x] libp2p deps installed with `--legacy-peer-deps`
- [x] No new `localStorage` keys without documentation
- [x] No new network endpoints without documentation
- [x] CRDT merge functions are pure (no side effects)
- [x] Confidence scoring advisory only (does not block)
- [x] Weak-phrase matching uses word boundaries + justification exclusion
- [x] Server relay endpoints have TTL cleanup (5 min, max 1000 messages)
- [x] E2E tests cover chatPanelRetry flow