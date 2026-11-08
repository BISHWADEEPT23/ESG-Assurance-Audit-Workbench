# ESG Assurance & Audit Methodology (`v1.0.0`)

## 1. Core Epistemic & Quantitative Principles

1. **Missing vs. Verified Zero vs. Not Applicable Integrity**:
   - `Missing` (`valueBasis === 'Missing'`) requires `reportedValue === null` and is never coerced to `0`.
   - `Verified Zero` (`valueBasis === 'Verified Zero'`) requires `reportedValue === 0` backed by evidence.
   - `Not Applicable` (`valueBasis === 'Not Applicable'`) requires `reportedValue === null` and is excluded from applicable coverage denominators.
2. **Evidence Verification Guardrail**:
   - Synthetic demonstration references (`isMetadataOnlyDemo === true`) cannot be marked `Accepted` and do not count as available binary evidence. Only uploaded files with verified magic bytes and SHA-256 checksums (`evidenceBlobs`) satisfy evidence requirements.
3. **4-Eyes Segregation of Duties**:
   - Across `AuditProcedure`, `DesignTest`, `OperatingTest`, `AuditFinding`, and `AssuranceReport`, the approving reviewer must be distinct from the preparer (`preparedBy !== reviewedBy`).

---

## 2. Deterministic Engine Equations

### 2.1 Assurance-Readiness Coverage Equations (`src/methodology/readinessCalculator.ts`)

- **Applicable Assertions**:
  $$N_{\text{app}} = \text{count}(\{a \in \text{Assertions} \mid a.\text{valueBasis} \neq \text{'Not Applicable'} \land a.\text{reviewStatus} \neq \text{'Archived'}\})$$
- **Assertion Review Coverage (%)**:
  $$\text{AssertionCoveragePct} = \frac{\text{count}(\{a \in \text{Applicable} \mid a.\text{reviewStatus} = \text{'Reviewed'}\})}{N_{\text{app}}} \times 100$$
- **Evidence Availability Coverage (%)**:
  $$\text{EvidenceCoveragePct} = \frac{\text{count}(\{a \in \text{ApplicableRequiringEvidence} \mid \exists e \in a.\text{linkedEvidenceIds} \text{ with } \neg e.\text{isMetadataOnlyDemo}\})}{N_{\text{reqEv}}} \times 100$$

### 2.2 Risk Assessment Engine (`src/services/riskEngine.ts`)

- **Inherent Risk Score ($1..25$)**:
  $$\text{InherentRiskScore} = \text{Likelihood} \times \text{Impact} \quad (\text{where } L, I \in \{1,2,3,4,5\})$$
  - Bands: $1..4 \rightarrow \text{Low}$, $5..9 \rightarrow \text{Moderate}$, $10..15 \rightarrow \text{High}$, $16..25 \rightarrow \text{Critical}$.
- **Conditional Residual Risk Score**:
  - If the linked control lacks a documented effectiveness basis (`controlEffectivenessBasis === null`) or is untested, `residualRiskScore = null` and `residualRiskBand = 'Unassessed'`.
  - When supported by documented testing and `controlRiskScore` ($C \in \{1..5\}$):
    $$\text{ResidualRiskScore} = \text{round}\left(\text{InherentRiskScore} \times \frac{C}{5}\right)$$

### 2.3 Reproducible Audit Sampling Engine (`src/services/samplingEngine.ts`)

- Uses a deterministic seeded **Mulberry32** 32-bit PRNG initialized with `randomSeed`.
- **Simple Random Sampling (SRS)**: Fisher-Yates partial shuffle using the seeded PRNG (`isStatistical = true`).
- **Systematic Sampling**: Interval $k = N / n$, seeded random start $s \in [0, k)$, selecting indices $\lfloor s + i \cdot k \rfloor$ (`isStatistical = true`).
- **Monetary-Unit Sampling (MUS)**: Monetary interval $I_m = V_{\text{total}} / n$, seeded start $s_m \in (0, I_m]$, accumulating book values and incrementing `hitCount` whenever a large item spans multiple triggers (`isStatistical = true`).
- **Risk-Based Judgmental Selection**: Prioritizes `riskFlagged` items and highest book value; explicitly labeled `isStatistical = false`.

### 2.4 ISO 14064-3 GHG Shadow-Recalculation Engine (`src/services/ghgEngine.ts`)

- **Activity Normalization**: Converts `Wh -> kWh`, `MWh -> kWh`, `GJ -> kWh`, `lb -> kg`, `km -> passenger-km`, and applies `currencyConversionRate × priceYearDeflator` for Scope 3 spend-based records.
- **Shadow Emissions ($\text{tCO}_2\text{e}$)**:
  $$E_{\text{calc}} = \frac{Q_{\text{norm}} \times EF \times \text{GWP}_{100}}{1000}$$
  (when numerator unit is `kgCO2e` or raw gas `kgCH4`, `kgN2O`, `kgHFC-134a`, `kgSF6`).
- **Variance Calculation**:
  $$\Delta_{\text{abs}} = E_{\text{calc}} - E_{\text{rep}}, \qquad \Delta_{\%} = \begin{cases} \text{null} & \text{if } E_{\text{rep}} = 0 \\ \frac{E_{\text{calc}} - E_{\text{rep}}}{E_{\text{rep}}} \times 100 & \text{if } E_{\text{rep}} \neq 0 \end{cases}$$

### 2.5 Double-Materiality & Audit Materiality Engine (`src/services/materialityEngine.ts`)

- **Financial Materiality ($1..25$)**: $\text{Magnitude} \times \text{Likelihood} \ge \text{Threshold}$.
- **Impact Materiality ($1..5$)**:
  $$\text{Severity} = \frac{\text{Scale} + \text{Scope} + \text{IrremediableCharacter}}{3}$$
  - For **Actual** impacts: `likelihoodScore` **must be `null`**, and $\text{ImpactScore} = \text{Severity}$.
  - For **Potential** impacts: `likelihoodScore` $\in \{1..5\}$, and $\text{ImpactScore} = \text{Severity} \times (\text{Likelihood} / 5)$.
- **Audit Materiality Hierarchy**: Enforces $\text{Planning Materiality} \ge \text{Performance Materiality} > \text{Clearly Trivial Threshold} > 0$.
