# Release Notes — ESG Assurance & Audit Workbench (`v1.0.0`)

## Version `v1.0.0` (Phase 4 — Final Production Release)

### New Capabilities
- **Module A — Server-Side Gemini AI Audit Copilot (`/ai-copilot`)**:
  - Added 10 ESG audit capabilities (`Audit Procedure Drafting`, `Evidence Summarization`, `Control Deficiency Analysis`, `GHG Variance Explanation`, `Disclosure Gap Analysis`, `Materiality Assessment Assistance`, `Findings Drafting`, `Management Action Recommendations`, `Audit Report Narrative Assistance`, `Methodology Question Answering`).
  - Implemented strict engagement-scoped grounding (`assembleEngagementScopedGroundingContext`), 5-category epistemic fact classification, source citation verification (`verifyAndSanitizeAiCitations`), mandatory `"AI-generated draft — requires professional review."` labeling, human approval gates (`validateHumanApprovedAiDraftApplication`), and deterministic offline fallback synthesis.
- **Module B & C — 5-Zone Security Hardening**:
  - Added magic-byte file signature verification (`validateFileMagicBytes` for PDF, PNG, JPEG, UTF-8 text/CSV/JSON), direct & indirect prompt-injection detection (`detectAndNeutralizePromptInjection`), safe URL / SSRF validation (`validateSafeExternalUrl`), per-IP rate limiting (`30 req/60s`), `15,000ms` request timeouts, and secret-redacted structured server logs.
- **Module D — IndexedDB `v4` (`33` Stores) Backup, Restore & Data Resilience (`/backup-restore`)**:
  - Upgraded IndexedDB to `DB_VERSION = 4` (`33` total stores: added `aiAuditRequests`, `aiAuditResponses`, `backupManifests`) with non-destructive migration from `v1`, `v2`, and `v3`.
  - Implemented full and single-engagement backup archives with Base64-encoded binary `evidenceBlobs`, SHA-256 archive & binary checksum verification, pre-restore conflict preview, and transactional `Merge` and `Replace` restoration.
- **Module E, F & G — Independent Numerical Validation, 24-Step E2E Workflow & Performance Benchmarks**:
  - Added 10 comprehensive Phase 4 automated verification suites (`51` total passing tests across Phases 1–4) including a 24-step end-to-end assurance workflow test and a large-scale synthetic benchmark (`100` engagements, `1,000` assertions, `500` controls, `2,000` evidence records, `1,000` findings).

---

## Previous Releases

- **`v0.3.0` (Phase 3)**: 4-Framework Disclosure Library (`ESRS`, `GRI`, `IFRS S1/S2`, `BRSR`), 9-Stage Traceability Engine, Double-Materiality Workbench, Frozen Report Snapshots with canonical SHA-256 hashing, Recharts Advanced Analytics, and multi-format exports (`PDF`, `XLSX`, `CSV`, `JSON`).
- **`v0.2.0` (Phase 2)**: Audit Planning, 5x5 Risk Heatmap, Seeded `Mulberry32` PRNG & MUS Sampling, Control Design & Operating Testing with 4-Eyes Review, ISO 14064-3 GHG Shadow-Recalculation Engine (Scopes 1, 2 Loc/Mkt, 3), and Findings & CAP Retesting.
- **`v0.1.0` (Phase 1)**: Enterprise Material UI shell, Engagement Management, ESG Assertion Ledger (`Missing` vs. `Verified Zero` vs. `Not Applicable`), Control Matrix, SHA-256 Evidence Register, `DQ-01`..`DQ-10` Validation Engine, and Append-Only Audit Trail.

---

## Known Limitations & Future Roadmap

1. **Local-First Identity & Audit Log Boundary**: Preparation and review roles operate via local persona selection in browser mode; enterprise multi-tenant deployments should pair the workbench with server-enforced OAuth/OIDC identity and Cloud Firestore / Cloud SQL persistence.
2. **Roadmap (`v1.1+`)**: Automated XBRL / CSRD ESEF digital tagging export, live SCADA/ERP webhook connectors, and supplier portal primary Scope 3 data collection workflows.
