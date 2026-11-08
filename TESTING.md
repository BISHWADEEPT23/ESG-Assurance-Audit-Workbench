# Verification & Automated Testing Guide (`v1.0.0`)

## 1. Automated Test Suite Summary (51 Passing Tests)

Execute the complete Vitest verification suite via:

```bash
npm test
```

| Test Suite File | Phase | Test Count | Coverage Scope |
| :--- | :---: | :---: | :--- |
| `src/test/workbench.test.tsx` | Phase 1 | **20** | Synthetic dataset initialization, `Missing (null)` vs. `Verified Zero (0)` vs. `Not Applicable`, `DQ-01`..`DQ-10` validation engine, binary SHA-256 evidence upload, CSV formula-injection escaping, append-only audit events. |
| `src/test/phase2.test.tsx` | Phase 2 | **10** | Audit Plan & Procedure validation, 5x5 Risk Engine & untested control residual risk blocking, seeded `Mulberry32` PRNG & MUS multi-hit sampling, Control Design & Operating guardrails, 4-eyes self-approval block, ISO 14064-3 GHG Scope 1/2/3 recalculations, Finding closure guardrails, IndexedDB migration. |
| `src/test/phase3.test.tsx` | Phase 3 | **11** | 4-Framework catalog (`ESRS`, `GRI`, `IFRS S1/S2`, `BRSR`), 9-stage disclosure traceability, Financial/Impact (Actual vs. Potential)/Audit Materiality, Frozen Report Snapshots & SHA-256 tamper detection, Recharts analytics, PDF/XLSX/CSV/JSON exports, report self-approval block. |
| `src/test/phase4.test.tsx` | Phase 4 | **10** | All 10 AI Copilot capabilities, missing-evidence & fabricated citation stripping, prompt-injection neutralization, Zone 4 cross-engagement isolation, timeout/offline fallback & unauthorized mutation block, magic-byte file verification, full backup & binary restore with SHA-256 checksums, IndexedDB `v4` (`33` stores) migration, independent numerical reference cases, 24-step E2E workflow, and large-scale synthetic performance benchmark (`100` engagements, `1,000` assertions, `500` controls, `2,000` evidence records, `1,000` findings). |
| **Total** | **v1.0.0** | **51** | **100% Passing** |

---

## 2. Independent Numerical Reference Cases Verified (`src/test/phase4.test.tsx`)

1. **Risk Engine**:
   - $L=4, I=5 \implies \text{Inherent}=20\ (\text{Critical})$. Untested control $\implies \text{Residual}=\text{null}\ (\text{Unassessed})$.
   - Tested effective control ($C=2$) $\implies \text{Residual}=\text{round}(20 \times 2/5) = 8\ (\text{Moderate})$.
2. **Sampling Engine**:
   - MUS population value $9,500$, sample size $5 \implies I_m = 1,900$; item with book value $5,000$ receives `hitCount >= 2` (`isStatistical = true`).
   - Risk-Based Judgmental selection sets `isStatistical = false`.
3. **GHG Engine**:
   - Scope 1 Fugitive `HFC-134a`: $10\text{ kg} \times 1\text{ kgHFC-134a/kg} \times \text{GWP } 1530 / 1000 = 15.3\text{ tCO}_2\text{e}$ ($\Delta_{\text{abs}} = 0$).
   - Scope 3 Cat 1 Spend-Based: $100,000\text{ EUR} \times 1.10\text{ USD/EUR} \times 0.95\text{ deflator} \times 0.4\text{ kgCO}_2\text{e/USD} / 1000 = 41.8\text{ tCO}_2\text{e}$; when `reportedEmissions = 0`, `percentageVariance === null`.
4. **Materiality Engine**:
   - Financial: $4 \times 4 = 16 \ge 12 \implies \text{true}$.
   - Impact (Actual): $\text{Scale}=5, \text{Scope}=4, \text{Irremediable}=3 \implies \text{Severity}=4.0$, `likelihoodScore = null`, $\text{ImpactScore}=4.0 \ge 3.5 \implies \text{Double Material}$.
