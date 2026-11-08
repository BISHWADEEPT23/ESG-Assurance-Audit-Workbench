# ESG Assurance & Audit Workbench (`v1.0.0`)

**Enterprise Sustainability Assurance-Readiness, ISO 14064-3 GHG Verification, Disclosure Traceability & Evidence-Grounded AI Audit Platform**

---

## 1. Executive Overview

**ESG Assurance & Audit Workbench (`v1.0.0`)** is a production-grade internal ESG assurance-readiness and sustainability audit platform built with React 19, TypeScript, Material UI (MUI v7), IndexedDB (`v4`, `33` object stores), Zod, and a hardened Express + `@google/genai` backend.

It supports end-to-end internal sustainability assurance readiness across four integrated engineering phases:
- **Phase 1 (`v0.1.0`) — Enterprise Foundation, Engagement Management & Evidence Intelligence**: Multi-engagement scoping, ESG assertion ledger with strict `Missing (null)` vs. `Verified Zero (0)` vs. `Not Applicable` integrity, internal control matrix, SHA-256 binary evidence register, deterministic `DQ-01`..`DQ-10` validation engine, and append-only audit trail.
- **Phase 2 (`v0.2.0`) — Audit Planning, Control Testing & GHG Verification**: Risk-based materiality & 5x5 risk heatmap, reproducible seeded PRNG (`Mulberry32`) and Monetary-Unit Sampling (`MUS`), Test of Design & Test of Operating Effectiveness with 4-eyes review guardrails, ISO 14064-3 GHG shadow-recalculation engine across Scope 1, Dual Scope 2 (Location-Based & Market-Based), and Scope 3, and Corrective Action Plan (CAP) retesting.
- **Phase 3 (`v0.3.0`) — Disclosure Traceability, Assurance Reporting & Advanced Analytics**: 4-framework disclosure catalog (`ESRS`, `GRI Standards`, `IFRS S1/S2`, `BRSR`), 9-stage disclosure-to-evidence traceability engine, Double-Materiality Workbench (Financial, Impact with strict Actual vs. Potential likelihood rules, and Audit Materiality hierarchy), immutable Frozen Report Snapshots with canonical SHA-256 verification, Recharts analytics, and sanitized `PDF`, `XLSX`, `CSV`, and `JSON` exports.
- **Phase 4 (`v1.0.0`) — AI Integration, Security Hardening, Validation & Production Release**: Server-side Gemini AI Audit Copilot across 10 audit capabilities with engagement-scoped grounding, citation verification, prompt-injection defense, deterministic offline fallback, full/engagement-scoped IndexedDB `v4` backup & binary evidence restore, independent numerical reference validation, 24-step end-to-end automated verification, and large-scale synthetic performance benchmarking.

> **Important Assurance Boundary Disclaimer**: This workbench is an internal sustainability audit and assurance-readiness preparation platform. All outputs, frozen report snapshots, and AI-assisted drafts are for internal readiness evaluation only and **do not** constitute an external limited or reasonable assurance opinion under ISSA 5000, ISAE 3000, or ISO 14064-3.

---

## 2. 5-Zone Agentic Threat Model Summary

| Threat Zone | Risk Scenario | Implemented Countermeasure & Code Enforcement |
| :--- | :--- | :--- |
| **Zone 1: Input Surfaces** | Malicious file uploads (disguised `.exe`/ELF/scripts), XSS in notes, CSV/XLSX formula injection (`=`, `+`, `-`, `@`), or direct prompt injection. | Strict Zod schemas (`src/validation/schemas.ts`), magic-byte signature verification (`validateFileMagicBytes` for `%PDF-`, PNG, JPEG, UTF-8 text/CSV/JSON), HTML/script stripping (`sanitizeDisplayText`), and formula-injection escaping (`sanitizeCsvCell`, `sanitizeSpreadsheetValue`). |
| **Zone 2: Planning & Reasoning** | AI hallucinating unverified ESG metrics, fabricating source citations, or being manipulated via indirect prompt injection in evidence text. | `detectAndNeutralizePromptInjection` scans both user questions and grounded record summaries; `verifyAndSanitizeAiCitations` strips any cited ID not in the selected grounding set; every response carries `"AI-generated draft — requires professional review."` |
| **Zone 3: Tool Execution** | AI autonomously approving audit plans, marking controls operating effectively, closing findings, or mutating frozen report snapshots. | Read-only grounding context assembly (`assembleEngagementScopedGroundingContext`); `validateHumanApprovedAiDraftApplication` blocks unconfirmed saves and strictly prohibits AI from approving plans, controls, findings, or reports. |
| **Zone 4: Memory & State** | Cross-engagement data leakage during AI retrieval, silent overwrites during backup restore, or loss of binary evidence during schema upgrades. | `assembleEngagementScopedGroundingContext` enforces `item.engagementId === engagementId`; IndexedDB `v4` (`33` stores) non-destructively migrates `v1/v2/v3 -> v4`; `validateBackupArchiveForRestore` verifies archive & binary SHA-256 hashes before restore. |
| **Zone 5: Inter-System Communication** | Exposure of `GEMINI_API_KEY` in client bundle, unbounded AI API abuse, hung requests, or secret leakage in server logs. | Server-side `@google/genai` proxy in `server.ts`, IP rate limiting (`30 req/60s`), `15,000ms` request timeout, `1mb` JSON limit, restricted CORS, `writeStructuredAuditLog` secret redaction, and deterministic offline fallback. |

---

## 3. Local Development & Verification Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure optional server-side environment variables
cp .env.example .env
# Edit .env to set GEMINI_API_KEY if live Gemini model synthesis is desired.
# Note: The application remains 100% functional without GEMINI_API_KEY via its deterministic grounded fallback engine.

# 3. Run TypeScript typechecking
npm run lint

# 4. Execute the full automated test suite (51 tests across Phases 1, 2, 3, and 4)
npm test

# 5. Build production bundle
npm run build

# 6. Start unified Express + Vite server on port 3000
npm run dev
```

---

## 4. Google Cloud Run Production Deployment & Security Guide

### 4.1 Environment & Prerequisites

Ensure the Google Cloud CLI (`gcloud`) and Firebase CLI (`firebase`) are installed and authenticated, then enable required APIs:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com
```

### 4.2 Secret Management Setup (Zero Hardcoding)

Never hardcode `GEMINI_API_KEY` in source files or frontend bundles. Store operational credentials in **Google Cloud Secret Manager** and grant accessor permissions to the Cloud Run runtime service account:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Example Python Secret Manager helper pattern for cloud administrative scripts:

```python
from google.cloud import secretmanager

def access_secret(secret_id: str, version_id: str = "latest") -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/your-project-id/secrets/{secret_id}/versions/{version_id}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
```

### 4.3 Optional Cloud Firestore Security Rules (`firestore.rules`)

While the workbench operates local-first using IndexedDB `v4` (`33` object stores), organizations enabling optional Cloud Firestore synchronization must enforce strict owner-bound isolation (`request.auth.uid == userId`) and zero insecure defaults:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/engagements/{engagementId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4.4 Cloud Run Deployment & Verification Binding

Deploy the containerized application to Google Cloud Run with Secret Manager injection and apply the campaign verification label:

```bash
# Deploy to Google Cloud Run
gcloud run deploy esg-assurance-workbench \
  --source . \
  --region=asia-east1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"

# Apply mandatory verification label
gcloud run services update esg-assurance-workbench \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-east1
```

---

## 5. Documentation Index

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture, IndexedDB `v4` (`33`-store) schema, and data-flow diagrams.
- [`METHODOLOGY.md`](./METHODOLOGY.md) — Deterministic formulas for Readiness KPIs, Risk, Sampling, GHG Scopes 1–3, Traceability, and Double Materiality.
- [`SECURITY.md`](./SECURITY.md) — 5-Zone Threat Model, OWASP Web & LLM Top 10 mitigations, and local-first governance disclosures.
- [`TESTING.md`](./TESTING.md) — Automated verification catalog (`51` tests), numerical reference cases, 24-step E2E workflow, and performance benchmarks.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Step-by-step production build, Cloud Run configuration, and health check verification.
- [`USER_GUIDE.md`](./USER_GUIDE.md) — Auditor walkthrough across all 15 workspaces.
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) — Version history (`v0.1.0` → `v0.2.0` → `v0.3.0` → `v1.0.0`), known limitations, and roadmap.
