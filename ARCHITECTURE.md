# System Architecture — ESG Assurance & Audit Workbench (`v1.0.0`)

## 1. High-Level Architecture

The **ESG Assurance & Audit Workbench (`v1.0.0`)** follows a deterministic, local-first, layered architecture with a hardened Express + `@google/genai` backend proxy:

1. **Presentation & Workspace Layer (`src/pages/*`, `src/components/AppShell.tsx`)**:
   - 15 enterprise Material UI workspaces with responsive navigation drawer, global engagement/period/facility/pillar filters, dark/light theme persistence, and explicit retryable error escalation banners.
2. **State & Workflow Orchestration Layer (`src/context/WorkbenchContext.tsx`)**:
   - Coordinates transactional entity persistence, automatic deterministic DQ revalidation (`DQ-01`..`DQ-10`), 4-eyes review transitions, frozen report snapshots, AI Copilot grounding, and backup/restore operations.
3. **Deterministic Assurance & Quantitative Engines (`src/methodology/*`, `src/services/*`, `src/validation/*`)**:
   - `readinessCalculator.ts`: Denominator-safe readiness metrics (`Not Applicable` excluded from denominators; `Missing` preserved as `null`).
   - `dqEngine.ts`: Deterministic `DQ-01`..`DQ-10` validation engine.
   - `riskEngine.ts`: 5x5 Inherent Risk ($L \times I$) and conditional Residual Risk engine.
   - `samplingEngine.ts`: Seeded `Mulberry32` PRNG for Simple Random, Systematic, Monetary-Unit Sampling (MUS with `hitCount` multiplicity), and Risk-Based Judgmental sampling.
   - `controlTestingEngine.ts`: Design & Operating test guardrails and 4-eyes segregation of duties.
   - `ghgEngine.ts`: ISO 14064-3 shadow recalculation across Scope 1, Scope 2 (Location & Market-Based), and Scope 3 (Categories 1, 3, 4, 6, 7).
   - `disclosureFrameworkEngine.ts`: 4-framework catalog (`ESRS`, `GRI`, `IFRS S1/S2`, `BRSR`) and 9-stage traceability engine.
   - `materialityEngine.ts`: Financial, Impact (Actual vs. Potential), Double-Materiality Matrix, and Audit Materiality hierarchy engine.
   - `assuranceReportingEngine.ts` & `exportEngine.ts`: Canonical SHA-256 frozen report snapshots and sanitized PDF/XLSX/CSV/JSON exports.
   - `aiCopilotEngine.ts`: Engagement-scoped grounding, prompt-injection defense, citation verification, human review gate, and deterministic offline fallback.
   - `backupRestoreEngine.ts`: Full and engagement-scoped backups with Base64 binary evidence blobs and SHA-256 verification.
4. **Local-First Transactional Persistence Layer (`src/db/repository.ts`)**:
   - IndexedDB database `ESGAssuranceWorkbenchDB` at **Version 4 (`DB_VERSION = 4`)** containing **33 object stores** with non-destructive schema migration (`v1 -> v4`, `v2 -> v4`, `v3 -> v4`).
5. **Server-Side AI & Security Proxy (`server.ts`)**:
   - Express server on port `3000` providing `/api/health`, `/api/ai/copilot`, and `/api/audit-assistant/readiness-brief` with IP rate limiting (`30 req/60s`), `15,000ms` timeouts, `1mb` body limit, restricted CORS, and `@google/genai` fallback ladder (`gemini-3.8-flash` -> `gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`).

---

## 2. IndexedDB `v4` Object Store Catalog (33 Stores)

| Phase | Store Name | Key Path | Purpose |
| :--- | :--- | :--- | :--- |
| **Phase 1 (10)** | `organizations` | `organizationId` | Reporting entity profile and consolidation boundary |
| | `facilities` | `facilityId` | Operational sites and boundary inclusion status |
| | `engagements` | `engagementId` | Internal audit & assurance-readiness engagements |
| | `assertions` | `assertionId` | Quantitative & qualitative ESG assertions |
| | `controls` | `controlId` | Internal control catalog across E, S, and G pillars |
| | `evidence` | `evidenceId` | Evidence metadata and SHA-256 checksums |
| | `evidenceBlobs` | `evidenceId` | Raw `ArrayBuffer` binary payloads for uploaded files |
| | `findings` | `findingId` | Deterministic `DQ-01`..`DQ-10` validation findings |
| | `auditEvents` | `eventId` | Append-only chronological audit trail |
| | `preferences` | `key` | UI theme mode and pre-reset backup metadata |
| **Phase 2 (12)** | `auditPlans` | `auditPlanId` | Engagement audit plans and planning materiality |
| | `auditProcedures` | `procedureId` | Testing procedures with preparer/reviewer assignment |
| | `riskAssessments` | `riskAssessmentId` | 5x5 inherent and conditional residual risk records |
| | `samplingPlans` | `samplingPlanId` | Seeded statistical & judgmental sampling plans |
| | `sampleItems` | `sampleItemId` | Selected sample items with `hitCount` multiplicity |
| | `designTests` | `designTestId` | Control walkthrough & design evaluations |
| | `operatingTests` | `operatingTestId` | Sample-based operating effectiveness evaluations |
| | `emissionActivities` | `activityId` | Scope 1, Scope 2, and Scope 3 activity records |
| | `emissionFactors` | `emissionFactorId` | Versioned emission factors and IPCC GWP values |
| | `ghgRecalculations` | `recalculationId` | Shadow recalculation outputs and variance flags |
| | `auditFindings` | `auditFindingId` | Internal audit findings, CAPs, and retest records |
| | `reviews` | `reviewId` | 4-eyes independent review decision ledger |
| **Phase 3 (8)** | `disclosureFrameworks` | `frameworkId` | ESRS, GRI, IFRS S1/S2, BRSR, and custom frameworks |
| | `disclosureRequirements` | `requirementId` | Granular disclosure requirements and applicability |
| | `disclosureMappings` | `mappingId` | Engagement mappings to assertions, controls, evidence |
| | `financialMateriality` | `assessmentId` | Financial magnitude × likelihood assessments |
| | `impactMateriality` | `impactAssessmentId` | Actual vs. Potential impact severity assessments |
| | `auditMateriality` | `auditMaterialityId` | Planning, Performance & Clearly Trivial thresholds |
| | `assuranceReports` | `reportId` | Generated readiness reports and review statuses |
| | `reportSnapshots` | `snapshotId` | Immutable canonical SHA-256 frozen report snapshots |
| **Phase 4 (3)** | `aiAuditRequests` | `requestId` | Grounded AI Copilot request parameters & record IDs |
| | `aiAuditResponses` | `responseId` | Verified AI Copilot outputs, citations & review status |
| | `backupManifests` | `manifestId` | Cryptographically checksummed backup archive manifests |
