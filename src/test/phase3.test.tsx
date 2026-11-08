import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import {
  DB_VERSION,
  initializeOrLoadDataset,
  openWorkbenchDb,
  resetDbConnectionCache,
  saveAssuranceReportWithSnapshot,
  saveEntityWithAuditAndRevalidate,
  STORES,
} from '../db/repository';
import {
  calculateDisclosureCoverageAnalytics,
  evaluateAllDisclosureTraceability,
  evaluateSingleRequirementTraceability,
  validateAndImportRequirementCatalog,
  validateAndPrepareFramework,
  validateAndPrepareRequirement,
  validateDisclosureMappingInput,
} from '../services/disclosureFrameworkEngine';
import {
  buildDoubleMaterialityMatrix,
  evaluateFinancialMateriality,
  evaluateImpactMateriality,
  validateAuditMateriality,
} from '../services/materialityEngine';
import {
  calculateAdvancedAuditAnalytics,
  computeReportSnapshotHash,
  EXCLUDED_HASH_METADATA_FIELDS,
  generateAssuranceReportAndSnapshot,
  MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER,
  ReportGenerationContext,
  validateReportStatusTransition,
  verifyFrozenReportSnapshotIntegrity,
} from '../services/assuranceReportingEngine';
import {
  generateModuleCsvExport,
  generateReportPdfBytes,
  generateReportXlsxBytes,
  generateStructuredJsonExport,
  readXlsxWorkbookFromBytes,
  sanitizeExportRow,
} from '../services/exportEngine';
import { sanitizeExportFilename, sanitizeSpreadsheetValue } from '../utils/security';
import { StructuredJsonExportSchema } from '../validation/schemas';

describe('ESG Assurance & Audit Workbench — Phase 3 (v0.3.0) Automated Verification Suite', () => {
  beforeEach(async () => {
    await initializeOrLoadDataset(true);
  });

  // ============================================================================
  // 1. DISCLOSURE FRAMEWORK LIBRARY TESTS
  // ============================================================================
  it('01. supports all 4 framework families (BRSR, GRI Standards, ESRS, IFRS S1 and IFRS S2), preserves versions, and rejects duplicate requirement codes within the same framework', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const familyNames = dataset.disclosureFrameworks.map((f) => f.frameworkName);
    expect(familyNames).toContain('BRSR');
    expect(familyNames).toContain('GRI Standards');
    expect(familyNames).toContain('ESRS');
    expect(familyNames).toContain('IFRS S1 and IFRS S2');

    // Create a custom versioned framework
    const customFw = validateAndPrepareFramework(
      {
        frameworkName: 'ESRS',
        frameworkVersion: 'ESRS Set 1 Amended 2026.1',
        issuingOrganization: 'EFRAG',
        jurisdiction: 'European Union',
        effectivePeriod: 'FY 2026',
        description: 'Amended ESRS catalog with <script>alert(1)</script> sanitized.',
        isCustomFramework: true,
      },
      'FWK-ESRS-2026'
    );
    expect(customFw.frameworkVersion).toBe('ESRS Set 1 Amended 2026.1');
    expect(customFw.description).not.toContain('<script>');

    // Attempt to add a duplicate requirement code within FWK-ESRS-2023 -> MUST throw
    expect(() =>
      validateAndPrepareRequirement({
        input: {
          frameworkId: 'FWK-ESRS-2023',
          requirementCode: 'ESRS E1-6 (44)', // Already exists in FWK-ESRS-2023
          requirementTitle: 'Duplicate Scope 1 Code',
          pillar: 'Environmental',
          topic: 'GHG Emissions - Scope 1',
          subTopic: 'Duplicate Test',
          requirementType: 'Quantitative',
          mandatoryLevel: 'Mandatory',
          expectedUnit: 'tCO2e',
          guidanceSummary: 'Should be rejected due to duplicate code.',
          applicabilityStatus: 'Applicable',
        },
        existingRequirements: dataset.disclosureRequirements,
        existingFrameworks: dataset.disclosureFrameworks,
      })
    ).toThrow(/Duplicate requirement code/i);
  });

  it('02. imports configurable requirement catalogs, sanitizes script tags, and rejects batch-internal duplicate codes', async () => {
    const dataset = await initializeOrLoadDataset(false);

    const imported = validateAndImportRequirementCatalog({
      rawItems: [
        {
          frameworkId: 'FWK-GRI-2021',
          requirementCode: 'GRI 302-1',
          requirementTitle: 'Energy Consumption Within the Organization <script>evil()</script>',
          pillar: 'Environmental',
          topic: 'Energy Consumption',
          subTopic: 'Internal Energy',
          requirementType: 'Quantitative',
          mandatoryLevel: 'Topic-Specific',
          expectedUnit: 'MWh',
          guidanceSummary: 'Report fuel and electricity consumption <img src=x onerror=alert(1)>.',
          applicabilityStatus: 'Applicable',
        },
      ],
      existingRequirements: dataset.disclosureRequirements,
      existingFrameworks: dataset.disclosureFrameworks,
    });

    expect(imported).toHaveLength(1);
    expect(imported[0].requirementCode).toBe('GRI 302-1');
    expect(imported[0].requirementTitle).not.toContain('<script>');
    expect(imported[0].guidanceSummary).not.toContain('<img');
  });

  // ============================================================================
  // 2. DISCLOSURE-TO-EVIDENCE 9-STAGE TRACEABILITY TESTS
  // ============================================================================
  it('03. traverses the 9-stage disclosure lineage and detects Missing Evidence, Testing Pending, Exceptions Identified, and Broken References', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const engId = 'ENG-2025-002';

    const results = evaluateAllDisclosureTraceability({
      engagementId: engId,
      requirements: dataset.disclosureRequirements,
      mappings: dataset.disclosureMappings,
      assertions: dataset.assertions,
      controls: dataset.controls,
      evidence: dataset.evidence,
      procedures: dataset.auditProcedures,
      sampleItems: dataset.sampleItems,
      designTests: dataset.designTests,
      operatingTests: dataset.operatingTests,
      emissionActivities: dataset.emissionActivities,
      ghgRecalculations: dataset.ghgRecalculations,
      auditFindings: dataset.auditFindings,
    });

    expect(results.length).toBe(dataset.disclosureRequirements.length);

    // Verify no status is ever "Externally Assured"
    for (const r of results) {
      expect(r.traceabilityStatus).not.toBe('Externally Assured');
    }

    // Unmapped requirement in ENG-2025-002 -> 'Not Mapped'
    const unmapped = results.find((r) => r.requirementId === 'REQ-IFRS-S2-29B');
    expect(unmapped?.traceabilityStatus).toBe('Not Mapped');

    // Partially mapped requirement with missing procedure & evidence -> 'Partially Mapped'
    const partial = results.find((r) => r.requirementId === 'REQ-GRI-306-3');
    expect(partial?.traceabilityStatus).toBe('Partially Mapped');
    expect(partial?.missingLinks.some((m) => m.includes('Missing linked Audit Procedure'))).toBe(
      true
    );

    // Requirement linked to an assertion/control with an open AuditFinding -> 'Exceptions Identified'
    const withException = results.find((r) => r.requirementId === 'REQ-ESRS-S1-14');
    expect(withException?.linkedFindings.length).toBeGreaterThan(0);
    expect(withException?.traceabilityStatus).toBe('Exceptions Identified');
  });

  it('04. flags broken entity references in disclosure mappings and never sets Internally Reviewed from evidence acceptance alone', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const req = dataset.disclosureRequirements[0];

    const brokenMapping = validateDisclosureMappingInput({
      input: {
        engagementId: 'ENG-2025-002',
        frameworkId: req.frameworkId,
        requirementId: req.requirementId,
        linkedAssertionIds: ['NON-EXISTENT-ASN-999'],
        linkedControlIds: ['NON-EXISTENT-CTL-999'],
        linkedProcedureIds: ['NON-EXISTENT-PRC-999'],
        linkedEvidenceIds: ['NON-EXISTENT-EVD-999'],
        mappingStatus: 'Fully Mapped',
        coveragePercentage: 100,
        mappingRationale: 'Test broken references detection.',
        identifiedGaps: 'None',
        mappedBy: 'Martina Bergmann',
        reviewedBy: 'Dr. Lukas Weber',
      },
      existingFrameworks: dataset.disclosureFrameworks,
      existingRequirements: dataset.disclosureRequirements,
      mappingId: 'MAP-BROKEN-TEST',
    });

    const trace = evaluateSingleRequirementTraceability({
      engagementId: 'ENG-2025-002',
      requirement: req,
      mapping: brokenMapping,
      assertions: dataset.assertions,
      controls: dataset.controls,
      evidence: dataset.evidence,
      procedures: dataset.auditProcedures,
      sampleItems: dataset.sampleItems,
      designTests: dataset.designTests,
      operatingTests: dataset.operatingTests,
      emissionActivities: dataset.emissionActivities,
      ghgRecalculations: dataset.ghgRecalculations,
      auditFindings: dataset.auditFindings,
    });

    expect(trace.missingLinks.some((m) => m.includes('Broken Assertion reference'))).toBe(true);
    expect(trace.missingLinks.some((m) => m.includes('Broken Control reference'))).toBe(true);
    expect(trace.missingLinks.some((m) => m.includes('Broken Procedure reference'))).toBe(true);
    expect(trace.missingLinks.some((m) => m.includes('Broken Evidence reference'))).toBe(true);
    expect(trace.traceabilityStatus).not.toBe('Internally Reviewed');
  });

  // ============================================================================
  // 3. MATERIALITY ASSESSMENT WORKBENCH TESTS
  // ============================================================================
  it('05. calculates Financial Materiality, enforces Actual Impact likelihood = null vs Potential Impact likelihood (1..5), and classifies Double-Materiality Matrix', () => {
    const finMat = evaluateFinancialMateriality({
      assessmentId: 'FIN-TEST-1',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Carbon Border Adjustment Mechanism (CBAM)',
      pillar: 'Environmental',
      timeHorizon: 'Medium',
      financialEffectType: 'Cost',
      magnitudeScore: 5,
      likelihoodScore: 4,
      materialityThreshold: 12,
      rationale: 'Direct financial cost impact on imported steel.',
      assessedBy: 'Martina Bergmann',
      reviewedBy: 'Dr. Elena Rostova',
    });
    expect(finMat.financialMaterialityScore).toBe(20);
    expect(finMat.isFinanciallyMaterial).toBe(true);

    // Actual impact: Severity = (4 + 5 + 3) / 3 = 4.00; likelihoodScore MUST be null
    const actualImpact = evaluateImpactMateriality({
      impactAssessmentId: 'IMP-TEST-ACTUAL',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Carbon Border Adjustment Mechanism (CBAM)',
      impactType: 'Actual',
      polarity: 'Negative',
      scaleScore: 4,
      scopeScore: 5,
      irremediableCharacterScore: 3,
      likelihoodScore: null,
      impactThreshold: 3.5,
      rationale: 'Actual upstream emissions.',
      assessedBy: 'Dr. Lukas Weber',
      reviewedBy: null,
    });
    expect(actualImpact.likelihoodScore).toBeNull();
    expect(actualImpact.severityScore).toBe(4);
    expect(actualImpact.impactMaterialityScore).toBe(4);
    expect(actualImpact.isImpactMaterial).toBe(true);

    // Attempting to pass a numeric likelihood for an Actual impact MUST be rejected by Zod schema
    expect(() =>
      evaluateImpactMateriality({
        impactAssessmentId: 'IMP-INVALID',
        engagementId: 'ENG-2025-002',
        esgTopic: 'Invalid Actual With Likelihood',
        impactType: 'Actual',
        polarity: 'Negative',
        scaleScore: 4,
        scopeScore: 4,
        irremediableCharacterScore: 4,
        likelihoodScore: 3, // Invalid for Actual impact!
        impactThreshold: 3.5,
        rationale: 'Should fail validation.',
        assessedBy: 'Tester',
        reviewedBy: null,
      })
    ).toThrow(/Actual impacts must have likelihoodScore set to null/i);

    // Potential impact: Severity = (5 + 4 + 3)/3 = 4.0; ImpactScore = 4.0 * (3 / 5) = 2.40 < 3.0 -> Not Impact Material
    const potentialImpact = evaluateImpactMateriality({
      impactAssessmentId: 'IMP-TEST-POTENTIAL',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Potential Export Compliance Sanction',
      impactType: 'Potential',
      polarity: 'Negative',
      scaleScore: 5,
      scopeScore: 4,
      irremediableCharacterScore: 3,
      likelihoodScore: 3,
      impactThreshold: 3.0,
      rationale: 'Potential impact moderated by likelihood.',
      assessedBy: 'Dr. Elena Rostova',
      reviewedBy: null,
    });
    expect(potentialImpact.severityScore).toBe(4);
    expect(potentialImpact.impactMaterialityScore).toBe(2.4);
    expect(potentialImpact.isImpactMaterial).toBe(false);

    // Double-Materiality Matrix classification
    const matrix = buildDoubleMaterialityMatrix(
      [finMat],
      [actualImpact, potentialImpact],
      'ENG-2025-002'
    );
    const cbamRow = matrix.find((r) => r.esgTopic === 'Carbon Border Adjustment Mechanism (CBAM)');
    expect(cbamRow?.classification).toBe('Double Material');

    const sanctionRow = matrix.find((r) => r.esgTopic === 'Potential Export Compliance Sanction');
    expect(sanctionRow?.classification).toBe('Not Material');
  });

  it('06. validates metric-specific Audit Materiality hierarchy (Planning >= Performance > Clearly Trivial)', () => {
    const validAuditMat = validateAuditMateriality({
      auditMaterialityId: 'AUD-MAT-TEST',
      engagementId: 'ENG-2025-002',
      metricCode: 'ESRS-E1-S1',
      metricName: 'Scope 1 Emissions',
      benchmarkBaseValue: 10000,
      planningMaterialityPct: 5,
      planningMaterialityAbsolute: 500,
      performanceMaterialityPct: 3.75,
      performanceMaterialityAbsolute: 375,
      clearlyTrivialThresholdPct: 0.25,
      clearlyTrivialAbsolute: 25,
      unit: 'tCO2e',
      qualitativeFactors: 'Standard 75% haircut.',
      approvedBy: 'Dr. Elena Rostova',
    });
    expect(validAuditMat.planningMaterialityAbsolute).toBe(500);

    // Performance Materiality > Planning Materiality MUST throw
    expect(() =>
      validateAuditMateriality({
        auditMaterialityId: 'AUD-MAT-BAD',
        engagementId: 'ENG-2025-002',
        metricCode: 'ESRS-E1-S1',
        metricName: 'Scope 1 Emissions',
        benchmarkBaseValue: 10000,
        planningMaterialityPct: 4,
        planningMaterialityAbsolute: 400,
        performanceMaterialityPct: 6,
        performanceMaterialityAbsolute: 600, // Exceeds planning materiality!
        clearlyTrivialThresholdPct: 0.2,
        clearlyTrivialAbsolute: 20,
        unit: 'tCO2e',
        qualitativeFactors: 'Invalid hierarchy.',
        approvedBy: 'Dr. Elena Rostova',
      })
    ).toThrow(/Performance Materiality cannot exceed Planning Materiality/i);
  });

  // ============================================================================
  // 4. ASSURANCE REPORTING ENGINE & FROZEN SNAPSHOT HASH TESTS
  // ============================================================================
  it('07. generates deterministic Assurance Reports with mandatory non-opinion disclaimer and bit-for-bit reproducible snapshot hashes excluding volatile metadata', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const eng = dataset.engagements.find((e) => e.engagementId === 'ENG-2025-002')!;

    const ctx: ReportGenerationContext = {
      engagement: eng,
      assertions: dataset.assertions,
      controls: dataset.controls,
      evidence: dataset.evidence,
      dqFindings: dataset.findings,
      auditPlans: dataset.auditPlans,
      auditProcedures: dataset.auditProcedures,
      riskAssessments: dataset.riskAssessments,
      samplingPlans: dataset.samplingPlans,
      sampleItems: dataset.sampleItems,
      designTests: dataset.designTests,
      operatingTests: dataset.operatingTests,
      emissionActivities: dataset.emissionActivities,
      emissionFactors: dataset.emissionFactors,
      ghgRecalculations: dataset.ghgRecalculations,
      auditFindings: dataset.auditFindings,
      disclosureFrameworks: dataset.disclosureFrameworks,
      disclosureRequirements: dataset.disclosureRequirements,
      disclosureMappings: dataset.disclosureMappings,
      financialMateriality: dataset.financialMateriality,
      impactMateriality: dataset.impactMateriality,
      auditMateriality: dataset.auditMateriality,
    };

    const run1 = generateAssuranceReportAndSnapshot({
      reportId: 'RPT-HASH-001',
      snapshotId: 'SNP-HASH-001',
      reportType: 'ESG Audit Readiness Report',
      generatedBy: 'Martina Bergmann',
      generatedAt: '2026-03-01T10:00:00.000Z',
      versionNumber: 1,
      ctx,
    });

    // Run 2 with DIFFERENT volatile metadata (reportId, generatedAt, versionNumber) but IDENTICAL underlying data
    const run2 = generateAssuranceReportAndSnapshot({
      reportId: 'RPT-HASH-999',
      snapshotId: 'SNP-HASH-999',
      reportType: 'ESG Audit Readiness Report',
      generatedBy: 'Martina Bergmann',
      generatedAt: '2026-04-15T18:45:00.000Z',
      versionNumber: 7,
      ctx,
    });

    expect(run1.report.disclaimerStatement).toBe(MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER);
    expect(run1.snapshot.excludedHashMetadataFields).toEqual([...EXCLUDED_HASH_METADATA_FIELDS]);
    // Because volatile metadata fields are excluded from canonical hashing, content hashes MUST match!
    expect(run1.snapshot.reportSnapshotHash).toBe(run2.snapshot.reportSnapshotHash);
    expect(verifyFrozenReportSnapshotIntegrity(run1.snapshot).valid).toBe(true);

    // Mutating a metric inside the snapshot must invalidate hash integrity verification
    const tamperedSnapshot = JSON.parse(JSON.stringify(run1.snapshot));
    tamperedSnapshot.reportData.reportSections[0].narrativeSummary = 'Tampered summary text';
    expect(verifyFrozenReportSnapshotIntegrity(tamperedSnapshot).valid).toBe(false);
    expect(computeReportSnapshotHash(tamperedSnapshot.reportData)).not.toBe(
      run1.snapshot.reportSnapshotHash
    );
  });

  // ============================================================================
  // 5. ADVANCED ANALYTICS & DENOMINATOR EXCLUSION TESTS
  // ============================================================================
  it('08. excludes Not Applicable requirements from disclosure coverage denominators and keeps Scope 2 Location-Based and Market-Based totals strictly separate', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const eng = dataset.engagements.find((e) => e.engagementId === 'ENG-2025-002')!;

    const analytics = calculateAdvancedAuditAnalytics({
      engagement: eng,
      assertions: dataset.assertions,
      controls: dataset.controls,
      evidence: dataset.evidence,
      dqFindings: dataset.findings,
      auditPlans: dataset.auditPlans,
      auditProcedures: dataset.auditProcedures,
      riskAssessments: dataset.riskAssessments,
      samplingPlans: dataset.samplingPlans,
      sampleItems: dataset.sampleItems,
      designTests: dataset.designTests,
      operatingTests: dataset.operatingTests,
      emissionActivities: dataset.emissionActivities,
      emissionFactors: dataset.emissionFactors,
      ghgRecalculations: dataset.ghgRecalculations,
      auditFindings: dataset.auditFindings,
      disclosureFrameworks: dataset.disclosureFrameworks,
      disclosureRequirements: dataset.disclosureRequirements,
      disclosureMappings: dataset.disclosureMappings,
      financialMateriality: dataset.financialMateriality,
      impactMateriality: dataset.impactMateriality,
      auditMateriality: dataset.auditMateriality,
    });

    // 16 total requirements in seed: 3 are Not Applicable -> 13 Applicable in scope
    expect(analytics.disclosureAnalytics.totalCatalogRequirementsCount).toBe(16);
    expect(analytics.disclosureAnalytics.excludedNotApplicableCount).toBe(3);
    expect(analytics.disclosureAnalytics.applicableRequirementsInScopeCount).toBe(13);

    // Verify adding 10 more "Not Applicable" requirements NEVER changes the applicable coverage percentage!
    const extraNotApplicableReqs = Array.from({ length: 10 }, (_, idx) => ({
      ...dataset.disclosureRequirements[0],
      requirementId: `REQ-NA-EXTRA-${idx}`,
      requirementCode: `NA-CODE-${idx}`,
      applicabilityStatus: 'Not Applicable' as const,
    }));

    const traceWithExtraNA = evaluateAllDisclosureTraceability({
      engagementId: 'ENG-2025-002',
      requirements: [...dataset.disclosureRequirements, ...extraNotApplicableReqs],
      mappings: dataset.disclosureMappings,
      assertions: dataset.assertions,
      controls: dataset.controls,
      evidence: dataset.evidence,
      procedures: dataset.auditProcedures,
      sampleItems: dataset.sampleItems,
      designTests: dataset.designTests,
      operatingTests: dataset.operatingTests,
      emissionActivities: dataset.emissionActivities,
      ghgRecalculations: dataset.ghgRecalculations,
      auditFindings: dataset.auditFindings,
    });

    const discWithExtraNA = calculateDisclosureCoverageAnalytics(
      dataset.disclosureFrameworks,
      [...dataset.disclosureRequirements, ...extraNotApplicableReqs],
      dataset.disclosureMappings,
      traceWithExtraNA,
      'ENG-2025-002'
    );

    expect(discWithExtraNA.excludedNotApplicableCount).toBe(13);
    expect(discWithExtraNA.applicableRequirementsInScopeCount).toBe(13);
    expect(discWithExtraNA.mappingCompletenessPct).toBe(
      analytics.disclosureAnalytics.mappingCompletenessPct
    );

    // Verify Scope 2 Location-Based and Market-Based totals are distinct and non-zero
    expect(analytics.ghgAnalytics.scope2LocationRecalculatedTco2e).toBeGreaterThan(0);
    expect(analytics.ghgAnalytics.scope2MarketRecalculatedTco2e).toBeGreaterThan(0);
    expect(analytics.ghgAnalytics.scope2LocationRecalculatedTco2e).not.toBe(
      analytics.ghgAnalytics.scope2MarketRecalculatedTco2e
    );
  });

  // ============================================================================
  // 6. MULTI-FORMAT EXPORT ENGINE TESTS (PDF, XLSX, CSV, JSON)
  // ============================================================================
  it('09. generates valid PDF bytes, an 8-sheet XLSX workbook preserving numbers and nulls, formula-safe CSVs, and schema-validated JSON from the same frozen snapshot', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const snapshot = dataset.reportSnapshots[0];
    const eng = dataset.engagements.find((e) => e.engagementId === snapshot.engagementId)!;

    const ctx: ReportGenerationContext = {
      engagement: eng,
      assertions: dataset.assertions,
      controls: dataset.controls,
      evidence: dataset.evidence,
      dqFindings: dataset.findings,
      auditPlans: dataset.auditPlans,
      auditProcedures: dataset.auditProcedures,
      riskAssessments: dataset.riskAssessments,
      samplingPlans: dataset.samplingPlans,
      sampleItems: dataset.sampleItems,
      designTests: dataset.designTests,
      operatingTests: dataset.operatingTests,
      emissionActivities: dataset.emissionActivities,
      emissionFactors: dataset.emissionFactors,
      ghgRecalculations: dataset.ghgRecalculations,
      auditFindings: dataset.auditFindings,
      disclosureFrameworks: dataset.disclosureFrameworks,
      disclosureRequirements: dataset.disclosureRequirements,
      disclosureMappings: dataset.disclosureMappings,
      financialMateriality: dataset.financialMateriality,
      impactMateriality: dataset.impactMateriality,
      auditMateriality: dataset.auditMateriality,
    };

    // 1. PDF Export Verification
    const pdfBytes = generateReportPdfBytes(snapshot);
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));
    expect(pdfHeader).toBe('%PDF-');

    // 2. XLSX 8-Sheet Export Verification
    const xlsxBytes = generateReportXlsxBytes(snapshot, ctx);
    expect(xlsxBytes.byteLength).toBeGreaterThan(2000);
    const wb = readXlsxWorkbookFromBytes(xlsxBytes);
    expect(wb.SheetNames).toEqual([
      'Executive Summary',
      'ESG Assertions',
      'Control Testing',
      'GHG Recalculations',
      'Disclosure Mapping',
      'Evidence Register',
      'Findings',
      'Methodology',
    ]);

    // Verify sanitizeExportRow preserves null (never converts null to 0) and escapes formula injection
    const sanitizedRow = sanitizeExportRow(['=SUM(A1:A5)', 42.5, null, -12.3, '@HYPERLINK()']);
    expect(sanitizedRow).toEqual(["'=SUM(A1:A5)", 42.5, null, -12.3, "'@HYPERLINK()"]);

    // 3. CSV Export Verification across all 4 categories
    const csvMappings = generateModuleCsvExport('disclosure-mappings', snapshot, ctx);
    const csvTesting = generateModuleCsvExport('testing-results', snapshot, ctx);
    const csvFindings = generateModuleCsvExport('findings', snapshot, ctx);
    const csvGhg = generateModuleCsvExport('ghg-recalculations', snapshot, ctx);
    expect(csvMappings).toContain(snapshot.snapshotId);
    expect(csvTesting).toContain('operatingTestId');
    expect(csvFindings).toContain('auditFindingId');
    expect(csvGhg).toContain('recalculationId');

    // 4. Structured JSON Export Verification
    const jsonStr = generateStructuredJsonExport(snapshot);
    const parsedJson = JSON.parse(jsonStr);
    const validatedJson = StructuredJsonExportSchema.parse(parsedJson);
    expect(validatedJson.snapshotId).toBe(snapshot.snapshotId);
    expect(validatedJson.reportSnapshotHash).toBe(snapshot.reportSnapshotHash);
  });

  // ============================================================================
  // 7. PERSISTENCE & INDEXEDDB v3 MIGRATION TESTS
  // ============================================================================
  it('10. upgrades IndexedDB to version 3 with 30 object stores and persists Phase 3 entities and immutable report snapshots across reloads', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const db = await openWorkbenchDb();

    expect(db.version).toBe(DB_VERSION);
    expect(db.version).toBeGreaterThanOrEqual(3);
    expect(db.objectStoreNames.length).toBeGreaterThanOrEqual(30);

    // Save a new FinancialMaterialityAssessment and FrozenReportSnapshot and reload
    const newFin = evaluateFinancialMateriality({
      assessmentId: 'FIN-PERSIST-99',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Persistent Biodiversity Assessment',
      pillar: 'Environmental',
      timeHorizon: 'Long',
      financialEffectType: 'Asset Impairment',
      magnitudeScore: 3,
      likelihoodScore: 3,
      materialityThreshold: 12,
      rationale: 'Persisted across IndexedDB v3 reload.',
      assessedBy: 'Martina Bergmann',
      reviewedBy: null,
    });

    await saveEntityWithAuditAndRevalidate({
      storeName: STORES.FINANCIAL_MATERIALITY,
      entity: newFin,
      auditEvent: {
        engagementId: 'ENG-2025-002',
        entityType: 'FinancialMateriality',
        entityId: newFin.assessmentId,
        action: 'FINANCIAL_MATERIALITY_ASSESSED',
        actor: 'Martina Bergmann',
        previousValue: 'None',
        newValue: 'Score=9',
      },
    });

    const newSnapGen = generateAssuranceReportAndSnapshot({
      reportId: 'RPT-PERSIST-99',
      snapshotId: 'SNP-PERSIST-99',
      reportType: 'Disclosure Traceability Report',
      generatedBy: 'Martina Bergmann',
      ctx: {
        engagement: dataset.engagements[1],
        assertions: dataset.assertions,
        controls: dataset.controls,
        evidence: dataset.evidence,
        dqFindings: dataset.findings,
        auditPlans: dataset.auditPlans,
        auditProcedures: dataset.auditProcedures,
        riskAssessments: dataset.riskAssessments,
        samplingPlans: dataset.samplingPlans,
        sampleItems: dataset.sampleItems,
        designTests: dataset.designTests,
        operatingTests: dataset.operatingTests,
        emissionActivities: dataset.emissionActivities,
        emissionFactors: dataset.emissionFactors,
        ghgRecalculations: dataset.ghgRecalculations,
        auditFindings: dataset.auditFindings,
        disclosureFrameworks: dataset.disclosureFrameworks,
        disclosureRequirements: dataset.disclosureRequirements,
        disclosureMappings: dataset.disclosureMappings,
        financialMateriality: dataset.financialMateriality,
        impactMateriality: dataset.impactMateriality,
        auditMateriality: dataset.auditMateriality,
      },
    });

    await saveAssuranceReportWithSnapshot({
      report: newSnapGen.report,
      snapshot: newSnapGen.snapshot,
      actor: 'Martina Bergmann',
    });

    resetDbConnectionCache();
    const reloaded = await initializeOrLoadDataset(false);
    expect(
      reloaded.financialMateriality.some((f) => f.assessmentId === 'FIN-PERSIST-99')
    ).toBe(true);
    expect(
      reloaded.reportSnapshots.some((s) => s.snapshotId === 'SNP-PERSIST-99')
    ).toBe(true);
  });

  // ============================================================================
  // 8. SECURITY & GOVERNANCE GUARDRAIL TESTS
  // ============================================================================
  it('11. enforces 4-eyes self-approval block on Assurance Reports, sanitizes filenames, and blocks spreadsheet formula payloads', async () => {
    const dataset = await initializeOrLoadDataset(false);
    const draftReport = dataset.assuranceReports[0];

    // 1. Cannot jump straight from Draft Snapshot to Approved Internal Readiness Report
    const prematureCheck = validateReportStatusTransition({
      report: draftReport,
      nextStatus: 'Approved Internal Readiness Report',
      actor: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
    });
    expect(prematureCheck.valid).toBe(false);
    expect(prematureCheck.error).toContain('Submitted for Internal Review');

    // 2. Submit for review, then attempt self-approval by the same person who generated the report -> MUST fail
    const submittedReport = {
      ...draftReport,
      reviewStatus: 'Submitted for Internal Review' as const,
    };
    const selfApproveCheck = validateReportStatusTransition({
      report: submittedReport,
      nextStatus: 'Approved Internal Readiness Report',
      actor: submittedReport.generatedBy,
    });
    expect(selfApproveCheck.valid).toBe(false);
    expect(selfApproveCheck.error).toContain('Self-Approval Blocked');

    // 3. Independent reviewer approval -> succeeds
    const independentCheck = validateReportStatusTransition({
      report: submittedReport,
      nextStatus: 'Approved Internal Readiness Report',
      actor: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
    });
    expect(independentCheck.valid).toBe(true);

    // 4. Filename sanitization against path traversal
    expect(sanitizeExportFilename('../../etc/passwd<script>', 'pdf')).toBe(
      'etc_passwd_script.pdf'
    );
    expect(sanitizeSpreadsheetValue('=cmd|\'/C calc\'!A0')).toBe("'=cmd|'/C calc'!A0");
  });
});
