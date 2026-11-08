# Security Architecture & 5-Zone Threat Model (`v1.0.0`)

## 1. Five-Zone Agentic Threat Model

### Zone 1 — Input Surfaces
- **Schema Validation**: Every user form and API payload is validated via strict Zod schemas (`src/validation/schemas.ts`).
- **Magic-Byte File Signature Verification**: `validateFileMagicBytes` (`src/utils/security.ts`) inspects binary headers (`%PDF-`, `\x89PNG\r\n\x1a\n`, `0xFFD8FF`, UTF-8 printable validation) and immediately rejects disguised Windows PE (`MZ`), Linux ELF (`\x7FELF`), shell scripts (`#!`), and embedded `<script>` tags.
- **CSV & Spreadsheet Formula Injection Prevention**: `sanitizeCsvCell` and `sanitizeSpreadsheetValue` prefix dangerous trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote while preserving valid negative numbers and `null` values.
- **Safe Export Filenames & URLs**: `sanitizeExportFilename` neutralizes path traversal (`..`, `/`, `\`, null bytes); `validateSafeExternalUrl` rejects `javascript:`, `data:`, `vbscript:`, `file:`, and SSRF cloud metadata targets (`169.254.169.254`, `localhost`).

### Zone 2 — Planning & Reasoning (OWASP LLM01 / LLM02)
- **Prompt-Injection Detection & Neutralization**: `detectAndNeutralizePromptInjection` inspects user prompts and grounded record summaries for instruction-override, role-hijacking, secret-exfiltration, and forced-opinion patterns. Direct injection attempts are blocked with validation status `'Blocked — Prompt Injection or Scope Violation'`.
- **Source Citation Verification**: `verifyAndSanitizeAiCitations` parses all entity IDs cited in AI output and strips any fabricated or out-of-scope ID (`[UNVERIFIED-CITATION-STRIPPED:...]`) not present in `allowedRecordIds`.
- **Mandatory Review Labeling**: Every AI response is stamped with `"AI-generated draft — requires professional review."`

### Zone 3 — Tool Execution
- **Read-Only AI Grounding Assembly**: The AI Copilot has zero direct write access to IndexedDB stores.
- **Human Approval Gate**: `validateHumanApprovedAiDraftApplication` requires `humanConfirmedReview === true` before saving a draft procedure or finding and strictly forbids AI from approving `AuditPlan`, `InternalControl`, `AssuranceReport`, or mutating `FrozenReportSnapshot`.

### Zone 4 — Memory & State
- **Engagement-Scoped Isolation**: `assembleEngagementScopedGroundingContext` verifies `item.engagementId === params.engagementId` for every selected record ID and throws a deterministic Zone 4 security error on any cross-engagement access attempt.
- **Canonical Snapshot Hashing**: `FrozenReportSnapshot` computes a 64-character SHA-256 hex digest over canonical JSON payloads so any post-freeze tampering is immediately detected.
- **Pre-Restore Checksum Verification**: `validateBackupArchiveForRestore` verifies both the archive SHA-256 digest and every Base64 binary evidence file's SHA-256 digest before touching local data.

### Zone 5 — Inter-System Communication
- **Server-Side `GEMINI_API_KEY` Isolation**: `GEMINI_API_KEY` is read exclusively in `server.ts` via `process.env.GEMINI_API_KEY` and never appears in `VITE_*` variables, client bundles, exports, or browser storage.
- **Rate Limiting, Timeouts & Payload Caps**: `server.ts` enforces `express.json({ limit: '1mb' })`, per-IP rate limiting (`30 requests / 60s`), `15,000ms` generation timeouts, restricted CORS, and secret-redacted structured logs (`writeStructuredAuditLog`).

---

## 2. Explicit Governance & Local-First Security Boundary Disclosures

1. **Simulated Local Actor Control**:
   - In local-first browser mode, the active actor selector enforces application-level 4-eyes segregation of duties (preventing the same actor from preparing and approving procedures, control tests, findings, or reports). Without a server-side identity provider, this is a **simulated workflow control** rather than cryptographic multi-user authentication.
2. **Browser-Local Audit Trail**:
   - The append-only `auditEvents` object store and SHA-256 frozen report snapshots provide application-level auditability and accidental-modification detection, but browser-resident IndexedDB data is not independently tamper-proof against a user with local browser DevTools access.
