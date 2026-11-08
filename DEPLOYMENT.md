# Production Deployment & Operations Guide (`v1.0.0`)

## 1. Build & Runtime Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Starts unified Express + Vite middleware server on port `3000` |
| `npm run build` | `vite build` | Compiles production frontend assets into `dist/` |
| `npm start` | `node server.ts` | Runs production Express server serving `dist/` and `/api/*` |
| `npm run lint` | `tsc --noEmit` | Runs zero-error TypeScript compiler verification |
| `npm test` | `vitest run` | Executes all 51 automated verification tests |

---

## 2. Environment Variables (`.env.example`)

```ini
# Server-side Gemini API key (never exposed to browser client)
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# Hosted Cloud Run service URL for restricted CORS origin matching
APP_URL="https://your-service-url.run.app"
```

- **Offline / Missing Key Resilience**: If `GEMINI_API_KEY` is omitted or unreachable, `/api/ai/copilot` returns HTTP `503` with code `GEMINI_UNAVAILABLE_FALLBACK` and the client-side `executeGroundedAiCopilotTask` automatically synthesizes a deterministic evidence-grounded readiness draft so all 15 workspaces remain 100% operational.

---

## 3. Health Check Endpoint (`/api/health`)

```bash
curl -s http://localhost:3000/api/health | jq .
```

Expected response:

```json
{
  "status": "ok",
  "service": "ESG Assurance & Audit Workbench API",
  "version": "1.0.0",
  "phase": "Phase 4 — AI Integration, Security Hardening, Validation & Production Release",
  "indexedDbSchemaVersion": 4,
  "geminiServerConfigured": false,
  "timestamp": "2026-11-08T07:00:00.000Z"
}
```
