# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AgenMonster, please report it responsibly by emailing the maintainers directly. Do not open a public issue for security vulnerabilities.

## Security Model

- **API Keys**: All LLM provider API keys are stored server-side in `.env` and are never exposed to the browser. The browser communicates with the local server proxy at `/api/llm`.
- **Sync Transport**: Cross-device sync uses a transport priority chain: libp2p WebRTC > BroadcastChannel (same-origin) > ServerRelay (with optional `SYNC_SECRET` authentication).
- **CORS**: The production server (`server.mjs`) restricts CORS to localhost and Tauri origins.
- **Cost Guards**: Per-call, daily, and per-provider budget caps are enforced client-side with localStorage persistence.

## Best Practices

- Never commit `.env` to version control
- Rotate API keys regularly
- Use `SYNC_SECRET` in production for sync relay authentication
- Review `npm audit` output before deploying
