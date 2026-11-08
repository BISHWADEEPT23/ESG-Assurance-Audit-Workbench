# Auditor & Sustainability Controller User Guide (`v1.0.0`)

## 1. Navigation & Global Scope Bar

- **Global Engagement Scope**: Use the top-right **Engagement Scope** and **Reporting Period** selectors to filter across all engagements or focus on a specific engagement (e.g., `ENG-2025-002 — FY 2025 CSRD / ESRS Assurance Readiness Assessment`).
- **Active Actor Selector**: Switch between preparer and independent reviewer personas (e.g., `Martina Bergmann` vs. `Dr. Elena Rostova`) to test 4-eyes review workflows.

---

## 2. Workspace Walkthrough (15 Workspaces)

1. **Executive Assurance Dashboard (`/`)**: Inspect deterministic readiness KPIs, applicable assertion coverage, control documentation coverage, binary evidence acceptance rate, and `DQ-01`..`DQ-10` validation alerts.
2. **Engagement Management (`/engagements`)**: Create, edit, and transition internal ESG audit and assurance-readiness engagements.
3. **ESG Assertions & Data (`/assertions`)**: Manage quantitative metrics with strict `Reported`, `Estimated`, `Missing (null)`, `Verified Zero (0)`, and `Not Applicable` bases, and export sanitized CSV workpapers.
4. **Control Library (`/controls`)**: Document preventive, detective, and corrective controls across Environmental, Social, and Governance pillars.
5. **Audit Planning (`/audit-planning`)**: Define planning materiality, evaluate the 5x5 Inherent & Conditional Residual Risk Heatmap, and generate reproducible samples via `Mulberry32` seeded PRNG (`SRS`, `Systematic`, `MUS`, `Judgmental`).
6. **Evidence Register (`/evidence`)**: Upload binary evidence files (`PDF`, `CSV`, `TXT`, `JSON`, `PNG`, `JPEG` up to 5 MB) with magic-byte and SHA-256 verification.
7. **Control Testing (`/control-testing`)**: Execute Test of Design walkthroughs and sample-based Test of Operating Effectiveness with 4-eyes review guardrails.
8. **GHG Verification (`/ghg-verification`)**: Run ISO 14064-3 shadow recalculations across Scope 1, Scope 2 (Location-Based & Market-Based), and Scope 3 (Categories 1, 3, 4, 6, 7).
9. **Findings & Remediation (`/findings-remediation`)**: Track internal audit findings, assign Corrective Action Plans (CAPs), and verify retesting before closure.
10. **Disclosure Traceability (`/disclosure-traceability`)**: Map `ESRS`, `GRI`, `IFRS S1/S2`, and `BRSR` requirements across the 9-stage traceability chain.
11. **Materiality Workbench (`/materiality`)**: Score Financial Materiality, Impact Materiality (`Actual` with `likelihoodScore = null` vs. `Potential`), Double-Materiality Matrix, and Audit Materiality thresholds.
12. **Assurance Reports (`/assurance-reports`)**: Generate 7 types of internal readiness reports, freeze canonical SHA-256 snapshots, enforce 4-eyes approval, and export `PDF`, `XLSX`, `CSV`, and `JSON` packages.
13. **Advanced Analytics (`/advanced-analytics`)**: Explore Recharts visualizations for testing status, Dual Scope 2 comparison, findings aging, and framework coverage.
14. **AI Audit Copilot (`/ai-copilot`)**: Run engagement-grounded AI assistance across 10 audit capabilities with citation verification and human-reviewed workpaper saving.
15. **Backup & Resilience (`/backup-restore`)**: Export full or single-engagement `.json` backups (including Base64 binary evidence blobs with SHA-256 checksums), preview conflicts, and execute transactional `Merge` or `Replace` restores.
