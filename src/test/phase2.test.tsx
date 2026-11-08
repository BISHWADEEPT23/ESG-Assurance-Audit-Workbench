import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  calculateInherentRisk,
  classifyRiskBand,
  evaluateRiskAssessment,
} from '../services/riskEngine';
import {
  executeAuditSampling,
  createSeededPrng,
} from '../services/samplingEngine';
import {
  validateDesignTestGuardrails,
  validateOperatingTestGuardrails,
  validateReviewTransition,
  createReviewTransitionRecord,
  validateAuditFindingClosure,
} from '../services/controlTestingEngine';
import {
  executeGhgShadowRecalculation,
  summarizeGhgInventory,
} from '../services/ghgEngine';
import { buildEvidenceLineageChains } from '../services/lineageEngine';
import {
  openWorkbenchDb,
  initializeOrLoadDataset,
  saveSamplingPlanWithItems,
  saveEntityWithAuditAndRevalidate,
  STORES,
} from '../db/repository';
import {
  AuditFinding,
  DesignTest,
  EmissionActivityRecord,
  EmissionFactorRecord,
  EvidenceRecord,
  OperatingTest,
  PopulationItemRecord,
} from '../types/domain';

describe('Phase 2 (v0.2.0) — Audit Planning, Control Testing & GHG Verification Suite', () => {
  beforeEach(async () => {
    await initializeOrLoadDataset(true);
  });

  // 1. Audit Plan & Procedure CRUD + IndexedDB v2 Persistence
  it('1. persists AuditPlan and AuditProcedure CRUD updates and appends AuditEvents in IndexedDB v2', async () => {
    const state = await initializeOrLoadDataset();
    expect(state.auditPlans.length).toBeGreaterThanOrEqual(3);
    expect(state.auditProcedures.length).toBeGreaterThanOrEqual(6);

    const targetPlan = state.auditPlans[0];
    const updatedPlan = {
      ...targetPlan,
      planningMateriality: 4200,
      materialityRationale: 'Updated to 4.5% of consolidated Scope 1+2 Location-Based inventory',
      updatedAt: new Date().toISOString(),
    };

    const result = await saveEntityWithAuditAndRevalidate({
      storeName: STORES.AUDIT_PLANS,
      entity: updatedPlan,
      auditEvent: {
        engagementId: updatedPlan.engagementId,
        entityType: 'AuditPlan',
        entityId: updatedPlan.auditPlanId,
        action: 'UPDATE_AUDIT_PLAN_MATERIALITY',
        actor: 'Dr. Helena Vance (Lead ESG Assurance Partner)',
        previousValue: String(targetPlan.planningMateriality),
        newValue: '4200',
      },
    });

    expect(result.auditEvent.entityType).toBe('AuditPlan');
    expect(result.auditEvent.newValue).toBe('4200');
    expect(result.savedEntity.planningMateriality).toBe(4200);

    const db = await openWorkbenchDb();
    expect(db.objectStoreNames.length).toBeGreaterThanOrEqual(22);
  });

  // 2. Risk Assessment Calculation & Residual Risk Guardrail
  it('2. computes Inherent Risk = Likelihood × Impact (1..25), classifies bands, and enforces Residual Risk null guardrail when untested', () => {
    expect(calculateInherentRisk(1, 5)).toEqual({
      inherentRiskScore: 5,
      inherentRiskBand: 'Low',
    });
    expect(classifyRiskBand(5)).toBe('Low');
    expect(classifyRiskBand(6)).toBe('Moderate');
    expect(classifyRiskBand(10)).toBe('Moderate');
    expect(classifyRiskBand(12)).toBe('High');
    expect(classifyRiskBand(16)).toBe('Critical');
    expect(classifyRiskBand(25)).toBe('Critical');

    // Without documented control effectiveness basis, residual risk MUST remain null / Unassessed
    const unassessed = evaluateRiskAssessment({
      riskAssessmentId: 'RSK-TEST-01',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-001',
      linkedControlId: 'AST-CTL-001',
      riskCategory: 'Measurement & Calibration',
      likelihood: 5,
      impact: 4,
      controlEffectivenessBasis: null,
      controlRiskScore: null,
      controlIsTestedAndEffective: false,
      assessmentRationale: 'High complexity thermal metering without completed operating test.',
      evidenceReferences: ['EVD-001'],
      assessedBy: 'Dr. Helena Vance',
    });
    expect(unassessed.inherentRiskScore).toBe(20);
    expect(unassessed.inherentRiskBand).toBe('Critical');
    expect(unassessed.residualRiskScore).toBeNull();
    expect(unassessed.residualRiskBand).toBe('Unassessed');

    // With verified Operating Effectively basis, residual risk is deterministically reduced
    const mitigated = evaluateRiskAssessment({
      riskAssessmentId: 'RSK-TEST-02',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-001',
      linkedControlId: 'AST-CTL-001',
      riskCategory: 'Measurement & Calibration',
      likelihood: 5,
      impact: 4,
      controlEffectivenessBasis: 'Operating Test OT-001 Approved (0 exceptions across 12 samples)',
      controlRiskScore: 2,
      controlIsTestedAndEffective: true,
      assessmentRationale: 'Control operating effectively verified.',
      evidenceReferences: ['EVD-001'],
      assessedBy: 'Dr. Helena Vance',
    });
    expect(mitigated.residualRiskScore).toBe(8);
    expect(mitigated.residualRiskBand).toBe('Moderate');
  });

  // 3. Reproducible Seeded Random Sampling & MUS Multiplicity Preservation
  it('3. produces 100% reproducible Simple Random Samples without replacement from a numeric seed and preserves MUS multiplicity', () => {
    const prngA = createSeededPrng(20250214);
    const prngB = createSeededPrng(20250214);
    expect(prngA()).toBe(prngB());
    expect(prngA()).toBe(prngB());

    const candidates: PopulationItemRecord[] = Array.from({ length: 20 }, (_, idx) => ({
      recordId: `INV-2025-${String(idx + 1).padStart(3, '0')}`,
      label: `Billing Ledger #${idx + 101}`,
      bookValue: idx === 0 ? 50000 : 1000 + idx * 100, // First item is a large value item for MUS
      facilityId: idx % 2 === 0 ? 'FAC-DE-01' : 'FAC-US-02',
      riskFlagged: idx < 3,
    }));

    const srsRun1 = executeAuditSampling({
      samplingPlanId: 'SMP-TEST-SRS',
      procedureId: 'PROC-001',
      populationId: 'POP-2025-01',
      populationRecords: candidates,
      samplingMethod: 'Simple Random Sampling',
      requestedSampleSize: 5,
      randomSeed: 987654,
    });

    const srsRun2 = executeAuditSampling({
      samplingPlanId: 'SMP-TEST-SRS',
      procedureId: 'PROC-001',
      populationId: 'POP-2025-01',
      populationRecords: candidates,
      samplingMethod: 'Simple Random Sampling',
      requestedSampleSize: 5,
      randomSeed: 987654,
    });

    expect(srsRun1.items.map((i) => i.populationRecordId)).toEqual(
      srsRun2.items.map((i) => i.populationRecordId)
    );
    // Verify without replacement (unique populationRecordIds)
    expect(new Set(srsRun1.items.map((i) => i.populationRecordId)).size).toBe(5);

    // Verify Monetary-Unit Sampling (MUS) preserves multiplicity hitCount on large item
    const musRun = executeAuditSampling({
      samplingPlanId: 'SMP-TEST-MUS',
      procedureId: 'PROC-002',
      populationId: 'POP-2025-02',
      populationRecords: candidates,
      samplingMethod: 'Monetary-Unit Sampling',
      requestedSampleSize: 6,
      randomSeed: 42,
    });

    const totalHits = musRun.items.reduce((acc, item) => acc + item.hitCount, 0);
    expect(totalHits).toBe(6);
    const largeItem = musRun.items.find((i) => i.populationRecordId === 'INV-2025-001');
    expect(largeItem).toBeDefined();
    expect(largeItem!.hitCount).toBeGreaterThanOrEqual(2);
  });

  // 4. Control Design Test Validation Guardrail
  it('4. blocks Control Design Test from concluding Adequately Designed without walkthrough and evidence', () => {
    const invalidDesign: DesignTest = {
      designTestId: 'DT-999',
      controlId: 'AST-CTL-001',
      procedureId: 'PROC-001',
      testObjective: 'Verify automated meter threshold alert design',
      designCriteria: 'ISO 14064-1 Sec 7',
      walkthroughDescription: 'Short', // Less than 10 chars
      evidenceIds: [], // Missing evidence
      testResult: 'Adequately Designed',
      preparer: 'Maya Lin',
      reviewer: 'Dr. Helena Vance',
      reviewStatus: 'Submitted for Review',
      conclusionRationale: 'Adequate design.',
      testedAt: new Date().toISOString(),
    };

    const emptyEvMap = new Map<string, EvidenceRecord>();
    const check = validateDesignTestGuardrails(invalidDesign, emptyEvMap);
    expect(check.valid).toBe(false);
    expect(check.errors.length).toBeGreaterThanOrEqual(2);
  });

  // 5. Control Operating Effectiveness Guardrails (All 7 Mandatory Conditions)
  it('5. enforces all 7 mandatory guardrails before a control can be marked Operating Effectively', () => {
    const acceptedEvidence: EvidenceRecord = {
      evidenceId: 'EVD-ACCEPTED-01',
      engagementId: 'ENG-2025-002',
      linkedEntityType: 'OperatingTest',
      linkedEntityId: 'OT-100',
      evidenceType: 'Calculation Workpaper',
      documentName: 'Quarterly_Reconciliation_Workpaper.pdf',
      mimeType: 'application/pdf',
      fileSize: 24500,
      checksum: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      verificationStatus: 'Accepted',
      isMetadataOnlyDemo: false,
      reviewerNotes: 'Verified',
      uploadedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
    };
    const evMap = new Map<string, EvidenceRecord>([['EVD-ACCEPTED-01', acceptedEvidence]]);

    // Attempt to mark Operating Effectively when reviewer === preparer (self-review violation)
    const selfReviewedOperating: OperatingTest = {
      operatingTestId: 'OT-100',
      controlId: 'AST-CTL-001',
      samplingPlanId: 'SMP-001',
      testingPeriod: 'FY 2025 (Q1-Q4)',
      testProcedure: 'Inspected all 4 quarterly reconciliations and meter calibration logs.',
      sampleResults: [
        { sampleItemId: 'SMP-001-ITM-001', passed: true, exceptionDetail: 'No exception' },
      ],
      exceptions: 0,
      exceptionsEvaluated: true,
      exceptionEvaluationNotes: 'Zero exceptions noted across all sampled quarters.',
      evidenceIds: ['EVD-ACCEPTED-01'],
      preparer: 'Maya Lin',
      reviewer: 'Maya Lin', // Self-approval attempt!
      conclusion: 'Operating Effectively',
      conclusionRationale: 'Control operated effectively throughout FY 2025 without deviation.',
      reviewStatus: 'Approved',
      testedAt: new Date().toISOString(),
    };

    const failSelfReview = validateOperatingTestGuardrails({
      test: selfReviewedOperating,
      linkedSampleItems: [],
      availableEvidenceMap: evMap,
    });
    expect(failSelfReview.valid).toBe(false);
    expect(failSelfReview.errors.some((e) => e.includes('Reviewer Independence Violation'))).toBe(true);

    // Valid independent reviewer
    const validOperating: OperatingTest = {
      ...selfReviewedOperating,
      reviewer: 'Dr. Helena Vance',
    };
    const passCheck = validateOperatingTestGuardrails({
      test: validOperating,
      linkedSampleItems: [],
      availableEvidenceMap: evMap,
    });
    expect(passCheck.valid).toBe(true);
  });

  // 6. GHG Scope 1 Direct Recalculation & Gas GWP Conversion
  it('6. deterministically recalculates Scope 1 emissions including gas-specific GWP conversion and variance classification', () => {
    const ch4Activity: EmissionActivityRecord = {
      activityId: 'ACT-S1-CH4',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-DE-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 1',
      scope3Category: null,
      activityType: 'Fugitive Emissions',
      activityQuantity: 100, // 100 kg CH4 fugitive leak
      activityUnit: 'kg',
      valueStatus: 'Reported',
      calculationMethod: 'Direct Measurement / Mass Balance',
      sourceReference: 'Maintenance Leak Log #14',
      reportedEmissions: 2.8, // 100 kg * 1 kgCH4/kg * 28 GWP / 1000 = 2.8 tCO2e
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-001',
      evidenceIds: ['EVD-001'],
    };

    const ch4Factor: EmissionFactorRecord = {
      emissionFactorId: 'EF-CH4-AR5',
      factorName: 'Fugitive Methane Direct Factor',
      factorSource: 'IPCC AR5',
      factorVersion: '2024.1',
      geography: 'Global',
      applicableYear: 'FY 2025',
      gas: 'CH4',
      factorValue: 1,
      numeratorUnit: 'kgCH4',
      denominatorUnit: 'kg',
      gwpBasis: 'IPCC AR5 (100-yr)',
      gwpValue: 28,
      sourceReference: 'IPCC Fifth Assessment Report',
    };

    const result = executeGhgShadowRecalculation({
      recalculationId: 'REC-TEST-CH4',
      activity: ch4Activity,
      factor: ch4Factor,
    });
    expect(result.calculatedEmissions).toBeCloseTo(2.8, 4);
    expect(result.absoluteVariance).toBeCloseTo(0, 4);
    expect(result.varianceStatus).toBe('Within Tolerance');
  });

  // 7. GHG Scope 2 Dual Reporting (Location vs Market Separation + Contractual Guardrail)
  it('7. keeps Scope 2 Location-Based and Market-Based totals strictly separate and flags unavailable Market-Based factors', () => {
    const locActivity: EmissionActivityRecord = {
      activityId: 'ACT-S2-LOC',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-DE-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 2 Location-Based',
      scope3Category: null,
      activityType: 'Grid Electricity (Location-Based)',
      activityQuantity: 1000,
      activityUnit: 'MWh',
      valueStatus: 'Reported',
      calculationMethod: 'Location-Based Grid Average',
      sourceReference: 'Grid Meter Summary',
      reportedEmissions: 380,
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-002',
      evidenceIds: ['EVD-002'],
    };

    const mktUnavailableFactorActivity: EmissionActivityRecord = {
      ...locActivity,
      activityId: 'ACT-S2-MKT-UNAVAIL',
      scope: 'Scope 2 Market-Based',
      activityType: 'Contractual / Residual Electricity (Market-Based)',
      contractualInstrumentStatus: 'Factor Unavailable',
      reportedEmissions: 120,
    };

    const gridFactor: EmissionFactorRecord = {
      emissionFactorId: 'EF-DE-GRID',
      factorName: 'Germany Grid Average Factor',
      factorSource: 'UBA / IEA',
      factorVersion: '2025',
      geography: 'Germany',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.38,
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'kWh',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'IEA 2025',
    };

    const locRecalc = executeGhgShadowRecalculation({
      recalculationId: 'REC-TEST-LOC',
      activity: locActivity,
      factor: gridFactor,
    });
    expect(locRecalc.calculatedEmissions).toBeCloseTo(380, 2);

    const mktBlockedRecalc = executeGhgShadowRecalculation({
      recalculationId: 'REC-TEST-MKT-LIM',
      activity: mktUnavailableFactorActivity,
      factor: gridFactor,
    });
    expect(mktBlockedRecalc.varianceStatus).toBe('Blocked / Flagged Limitation');

    const summary = summarizeGhgInventory(
      [locActivity, mktUnavailableFactorActivity],
      [locRecalc, mktBlockedRecalc]
    );
    expect(summary.scope2LocationRecalculated).toBeCloseTo(380, 2);
    expect(summary.scope2MarketRecalculated).toBe(0);
  });

  // 8. GHG Scope 3 Spend-Based Currency/Deflator Guardrail & Zero-Reported Variance Edge Case
  it('8. throws on Spend-Based Scope 3 missing currency conversion and returns null percentageVariance when reportedEmissions is 0', () => {
    const spendMismatchActivity: EmissionActivityRecord = {
      activityId: 'ACT-S3-SPEND',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-DE-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 3',
      scope3Category: 'Category 1: Purchased Goods and Services',
      activityType: 'Spend-Based Economic',
      activityQuantity: 100000,
      activityUnit: 'EUR',
      valueStatus: 'Reported',
      spendCurrency: 'EUR',
      // Missing currencyConversionRate when factorCurrency is USD
      calculationMethod: 'EEIO Spend-Based',
      sourceReference: 'SAP Procurement Ledger',
      reportedEmissions: 45,
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-003',
      evidenceIds: ['EVD-003'],
    };

    const usdSpendFactor: EmissionFactorRecord = {
      emissionFactorId: 'EF-EEIO-USD',
      factorName: 'USEEIO Industrial Spend Factor',
      factorSource: 'US EPA EEIO',
      factorVersion: 'v2.1',
      geography: 'Global',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.45,
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'USD',
      factorCurrency: 'USD',
      factorBaseYear: 2024,
      gwpBasis: 'IPCC AR5 (100-yr)',
      gwpValue: 1,
      sourceReference: 'EPA Supply Chain Factors',
    };

    expect(() =>
      executeGhgShadowRecalculation({
        recalculationId: 'REC-TEST-SPEND-ERR',
        activity: spendMismatchActivity,
        factor: usdSpendFactor,
      })
    ).toThrow(/currencyConversionRate/);

    // Now provide currency conversion & deflator, with reportedEmissions = 0
    const zeroReportedActivity: EmissionActivityRecord = {
      ...spendMismatchActivity,
      activityId: 'ACT-S3-ZERO',
      currencyConversionRate: 1.1,
      priceYearDeflator: 1.0,
      reportedEmissions: 0,
    };

    const zeroReportedResult = executeGhgShadowRecalculation({
      recalculationId: 'REC-TEST-ZERO-REP',
      activity: zeroReportedActivity,
      factor: usdSpendFactor,
    });
    expect(zeroReportedResult.calculatedEmissions).toBeCloseTo(49.5, 2);
    expect(zeroReportedResult.percentageVariance).toBeNull();
  });

  // 9. Finding Closure Guardrail & Reviewer Independence (Self-Approval Block)
  it('9. blocks closing an AuditFinding without remediation evidence + Retest Passed, and blocks reviewer self-approval', () => {
    const unverifiedFinding: AuditFinding = {
      auditFindingId: 'AF-TEST-01',
      engagementId: 'ENG-2025-002',
      procedureId: 'PROC-001',
      linkedAssertionId: 'AST-ASN-001',
      linkedControlId: 'AST-CTL-001',
      findingType: 'Control Operating Exception',
      severity: 'High',
      description: 'Missing quarterly calibration sign-off',
      rootCause: 'Manual calendar reminder missed',
      impact: 'Potential drift in meter readings',
      evidenceIds: [], // No remediation evidence!
      responsibleOwner: 'Plant Manager',
      remediationAction: 'Implemented automated calibration ticket',
      targetDate: '2025-05-01',
      remediationStatus: 'Closed',
      retestStatus: 'Not Retested', // Not retested!
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const emptyEvMap = new Map<string, EvidenceRecord>();
    const closureCheck = validateAuditFindingClosure(unverifiedFinding, emptyEvMap);
    expect(closureCheck.valid).toBe(false);
    expect(closureCheck.errors.length).toBeGreaterThanOrEqual(2);

    // Verify self-approval block in ReviewRecord workflow
    const selfApprovalCheck = validateReviewTransition({
      preparedBy: 'Maya Lin',
      reviewedBy: 'Maya Lin',
      targetStatus: 'Approved',
      reviewComments: 'Looks good to me',
    });
    expect(selfApprovalCheck.valid).toBe(false);

    // Valid 4-eyes review record creation
    const validReview = createReviewTransitionRecord({
      reviewId: 'REV-TEST-01',
      engagementId: 'ENG-2025-002',
      entityType: 'AuditProcedure',
      entityId: 'PROC-001',
      preparedBy: 'Maya Lin',
      reviewedBy: 'Dr. Helena Vance',
      targetStatus: 'Approved',
      reviewComments: 'Independently verified sample workpapers and SHA-256 digests.',
    });
    expect(validReview.reviewId).toBe('REV-TEST-01');
    expect(validReview.reviewStatus).toBe('Approved');
  });

  // 10. Evidence Lineage Chain & Transactional Sampling Persistence
  it('10. constructs end-to-end Evidence Lineage chains and persists SamplingPlans transactionally', async () => {
    const state = await initializeOrLoadDataset();
    const chains = buildEvidenceLineageChains({
      assertions: state.assertions,
      controls: state.controls,
      evidence: state.evidence,
      procedures: state.auditProcedures,
      sampleItems: state.sampleItems,
      designTests: state.designTests,
      operatingTests: state.operatingTests,
      emissionActivities: state.emissionActivities,
      ghgRecalculations: state.ghgRecalculations,
      auditFindings: state.auditFindings,
    });

    expect(chains.length).toBeGreaterThan(0);
    expect(chains[0].assertionIndependentlyVerifiedNote).toBeTruthy();

    // Test transactional saveSamplingPlanWithItems
    const samplePlan = state.samplingPlans[0];
    const items = state.sampleItems.filter((i) => i.samplingPlanId === samplePlan.samplingPlanId);
    const txResult = await saveSamplingPlanWithItems({
      plan: samplePlan,
      items,
      actor: 'Dr. Helena Vance',
    });
    expect(txResult.auditEvent.entityType).toBe('SamplingPlan');
  });
});
