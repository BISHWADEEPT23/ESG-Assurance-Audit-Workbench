import {
  AssuranceEngagement,
  AssuranceReport,
  AssuranceReportReviewStatus,
  AssuranceReportSection,
  AssuranceReportType,
  AuditFinding,
  AuditMaterialityAssessment,
  AuditPlan,
  AuditProcedure,
  DesignTest,
  DisclosureFramework,
  DisclosureMapping,
  DisclosureRequirement,
  EmissionActivityRecord,
  EmissionFactorRecord,
  ESGAssertion,
  EvidenceRecord,
  FinancialMaterialityAssessment,
  FrozenReportSnapshot,
  GHGRecalculationResult,
  ImpactMaterialityAssessment,
  InternalControl,
  OperatingTest,
  RiskAssessment,
  SampleItem,
  SamplingPlan,
  ValidationFinding,
} from '../types/domain';
import { computeDeterministicStringHash } from '../utils/security';
import { summarizeGhgInventory } from './ghgEngine';
import {
  calculateDisclosureCoverageAnalytics,
  evaluateAllDisclosureTraceability,
} from './disclosureFrameworkEngine';
import { buildDoubleMaterialityMatrix } from './materialityEngine';

export const ASSURANCE_REPORTING_METHODOLOGY_VERSION = 'INTERNAL-ASSURANCE-REPORT-ENGINE-v0.3.0';

/**
 * Mandatory Section 6.4 Non-Opinion Assurance Disclaimer
 */
export const MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER =
  'This document is an internal ESG assurance-readiness and audit support report. It does not constitute an independent assurance opinion or certification.';

/**
 * Volatile metadata fields explicitly excluded from canonical snapshot content hashing
 * so identical underlying report data produces bit-for-bit reproducible hashes.
 */
export const EXCLUDED_HASH_METADATA_FIELDS = [
  'reportId',
  'generatedAt',
  'reportSnapshotHash',
  'versionNumber',
] as const;

export interface CanonicalReportHashPayload {
  engagementId: string;
  reportType: AssuranceReportType;
  reportingPeriod: string;
  reportingBoundary: string;
  methodologyVersion: string;
  generatedBy: string;
  reviewStatus: AssuranceReportReviewStatus;
  disclaimerStatement: string;
  sourceRecordIds: string[];
  reportSections: AssuranceReportSection[];
}

export function buildCanonicalReportJson(report: Omit<AssuranceReport, 'reportSnapshotHash'>): string {
  const payload: CanonicalReportHashPayload = {
    engagementId: report.engagementId,
    reportType: report.reportType,
    reportingPeriod: report.reportingPeriod,
    reportingBoundary: report.reportingBoundary,
    methodologyVersion: report.methodologyVersion,
    generatedBy: report.generatedBy,
    reviewStatus: report.reviewStatus,
    disclaimerStatement: report.disclaimerStatement,
    sourceRecordIds: [...report.sourceRecordIds].sort(),
    reportSections: report.reportSections
      .filter((s) => s.included)
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .map((s) => ({
        sectionId: s.sectionId,
        sectionOrder: s.sectionOrder,
        sectionTitle: s.sectionTitle,
        included: s.included,
        narrativeSummary: s.narrativeSummary,
        keyMetrics: s.keyMetrics,
        tableHeaders: s.tableHeaders,
        tableRows: s.tableRows,
      })),
  };
  return JSON.stringify(payload);
}

export function computeReportSnapshotHash(report: Omit<AssuranceReport, 'reportSnapshotHash'>): string {
  const canonicalJson = buildCanonicalReportJson(report);
  return computeDeterministicStringHash(canonicalJson);
}

export function verifyFrozenReportSnapshotIntegrity(snapshot: FrozenReportSnapshot): {
  valid: boolean;
  computedHash: string;
  expectedHash: string;
} {
  const computedHash = computeReportSnapshotHash(snapshot.reportData);
  return {
    valid:
      computedHash === snapshot.reportSnapshotHash &&
      computedHash === snapshot.reportData.reportSnapshotHash,
    computedHash,
    expectedHash: snapshot.reportSnapshotHash,
  };
}

/**
 * Controlled Report Status Transition Validator (Section 10)
 * Prevents unauthorized self-approval or invalid state transitions.
 */
export function validateReportStatusTransition(params: {
  report: AssuranceReport;
  nextStatus: AssuranceReportReviewStatus;
  actor: string;
}): { valid: boolean; error?: string } {
  const { report, nextStatus, actor } = params;
  if (!report.disclaimerStatement.includes('does not constitute an independent assurance opinion')) {
    return {
      valid: false,
      error: 'Report is missing the mandatory internal assurance-readiness non-opinion disclaimer.',
    };
  }

  if (nextStatus === 'Approved Internal Readiness Report') {
    if (report.reviewStatus !== 'Submitted for Internal Review') {
      return {
        valid: false,
        error:
          'Invalid status transition: A report must be in "Submitted for Internal Review" status before it can be approved.',
      };
    }
    if (actor.trim().toLowerCase() === report.generatedBy.trim().toLowerCase()) {
      return {
        valid: false,
        error:
          'Self-Approval Blocked: The individual approving an internal readiness report must be distinct from the report generator.',
      };
    }
  }

  return { valid: true };
}

export interface ReportGenerationContext {
  engagement: AssuranceEngagement;
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  dqFindings: ValidationFinding[];
  auditPlans: AuditPlan[];
  auditProcedures: AuditProcedure[];
  riskAssessments: RiskAssessment[];
  samplingPlans: SamplingPlan[];
  sampleItems: SampleItem[];
  designTests: DesignTest[];
  operatingTests: OperatingTest[];
  emissionActivities: EmissionActivityRecord[];
  emissionFactors: EmissionFactorRecord[];
  ghgRecalculations: GHGRecalculationResult[];
  auditFindings: AuditFinding[];
  disclosureFrameworks: DisclosureFramework[];
  disclosureRequirements: DisclosureRequirement[];
  disclosureMappings: DisclosureMapping[];
  financialMateriality: FinancialMaterialityAssessment[];
  impactMateriality: ImpactMaterialityAssessment[];
  auditMateriality: AuditMaterialityAssessment[];
}

/**
 * Module D — Deterministic Assurance Report & Frozen Snapshot Builder (Section 6)
 * Derives 100% of quantitative metrics and tables from stored records.
 */
export function generateAssuranceReportAndSnapshot(params: {
  reportId: string;
  snapshotId: string;
  reportType: AssuranceReportType;
  generatedBy: string;
  generatedAt?: string;
  versionNumber?: number;
  includedSectionIds?: string[];
  ctx: ReportGenerationContext;
}): { report: AssuranceReport; snapshot: FrozenReportSnapshot } {
  const { ctx, reportType, generatedBy } = params;
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const versionNumber = params.versionNumber ?? 1;
  const engId = ctx.engagement.engagementId;

  const engAssertions = ctx.assertions.filter((a) => a.engagementId === engId && a.reviewStatus !== 'Archived');
  const engControls = ctx.controls.filter((c) => c.engagementId === engId);
  const engEvidence = ctx.evidence.filter((e) => e.engagementId === engId);
  const engDqFindings = ctx.dqFindings.filter((f) => f.engagementId === engId);
  const engPlans = ctx.auditPlans.filter((p) => p.engagementId === engId);
  const planIds = new Set(engPlans.map((p) => p.auditPlanId));
  const engProcedures = ctx.auditProcedures.filter((p) => planIds.has(p.auditPlanId));
  const procIds = new Set(engProcedures.map((p) => p.procedureId));
  const engSamplingPlans = ctx.samplingPlans.filter((sp) => procIds.has(sp.procedureId));
  const smpIds = new Set(engSamplingPlans.map((s) => s.samplingPlanId));
  const engSampleItems = ctx.sampleItems.filter((si) => smpIds.has(si.samplingPlanId));
  const ctrlIds = new Set(engControls.map((c) => c.controlId));
  const engDesignTests = ctx.designTests.filter((dt) => ctrlIds.has(dt.controlId));
  const engOperatingTests = ctx.operatingTests.filter((ot) => ctrlIds.has(ot.controlId));
  const engActivities = ctx.emissionActivities.filter((a) => a.engagementId === engId);
  const actIds = new Set(engActivities.map((a) => a.activityId));
  const engRecalcs = ctx.ghgRecalculations.filter((r) => actIds.has(r.activityId));
  const engAuditFindings = ctx.auditFindings.filter((f) => f.engagementId === engId);

  const ghgSummary = summarizeGhgInventory(engActivities, engRecalcs);

  const traceResults = evaluateAllDisclosureTraceability({
    engagementId: engId,
    requirements: ctx.disclosureRequirements,
    mappings: ctx.disclosureMappings,
    assertions: engAssertions,
    controls: engControls,
    evidence: engEvidence,
    procedures: engProcedures,
    sampleItems: engSampleItems,
    designTests: engDesignTests,
    operatingTests: engOperatingTests,
    emissionActivities: engActivities,
    ghgRecalculations: engRecalcs,
    auditFindings: engAuditFindings,
    calculationTimestamp: generatedAt,
  });

  const discSummary = calculateDisclosureCoverageAnalytics(
    ctx.disclosureFrameworks,
    ctx.disclosureRequirements,
    ctx.disclosureMappings,
    traceResults,
    engId
  );

  const applicableAssertions = engAssertions.filter((a) => a.valueBasis !== 'Not Applicable');
  const reviewedAssertions = applicableAssertions.filter((a) => a.reviewStatus === 'Reviewed');
  const uploadedEvidence = engEvidence.filter((e) => !e.isMetadataOnlyDemo);
  const acceptedEvidence = uploadedEvidence.filter((e) => e.verificationStatus === 'Accepted');
  const completedProcedures = engProcedures.filter((p) => p.status === 'Completed');
  const effectiveControls = engOperatingTests.filter(
    (ot) => ot.conclusion === 'Operating Effectively' && ot.reviewStatus === 'Approved'
  );
  const openAuditFindings = engAuditFindings.filter((f) => f.remediationStatus !== 'Closed');

  const isSectionIncluded = (id: string) =>
    !params.includedSectionIds || params.includedSectionIds.includes(id);

  const sections: AssuranceReportSection[] = [
    {
      sectionId: 'SEC-01-EXEC-SUMMARY',
      sectionOrder: 1,
      sectionTitle: '1. Executive Summary & Readiness Posture',
      included: isSectionIncluded('SEC-01-EXEC-SUMMARY'),
      narrativeSummary: `${MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER} This ${reportType} summarizes deterministic verification metrics for ${ctx.engagement.engagementName} (${ctx.engagement.reportingYear}) across ${applicableAssertions.length} applicable ESG assertions, ${engControls.length} internal controls, ${engActivities.length} GHG activity records, and ${discSummary.applicableRequirementsInScopeCount} applicable disclosure requirements.`,
      keyMetrics: [
        {
          label: 'Applicable Assertions Reviewed',
          value: `${reviewedAssertions.length} / ${applicableAssertions.length}`,
          unit: `${applicableAssertions.length ? ((reviewedAssertions.length / applicableAssertions.length) * 100).toFixed(1) : '0.0'}%`,
        },
        {
          label: 'Audit Procedures Completed',
          value: `${completedProcedures.length} / ${engProcedures.length}`,
          unit: 'Procedures',
        },
        {
          label: 'Controls Operating Effectively (Approved)',
          value: `${effectiveControls.length} / ${engOperatingTests.length}`,
          unit: 'Controls',
        },
        {
          label: 'Open Substantive / Control Findings',
          value: String(openAuditFindings.length),
          unit: 'Findings',
        },
      ],
    },
    {
      sectionId: 'SEC-02-ENGAGEMENT-INFO',
      sectionOrder: 2,
      sectionTitle: '2. Engagement Information, Scope & Boundaries',
      included: isSectionIncluded('SEC-02-ENGAGEMENT-INFO'),
      narrativeSummary: `Engagement ID ${ctx.engagement.engagementId} covers reporting period ${ctx.engagement.reportingYear} under boundary "${ctx.engagement.reportingBoundary}". Planned readiness target: ${ctx.engagement.assuranceLevel}. Current operational status: ${ctx.engagement.engagementStatus}.`,
      keyMetrics: [
        { label: 'Engagement ID', value: ctx.engagement.engagementId },
        { label: 'Reporting Period', value: ctx.engagement.reportingYear },
        { label: 'Planned Readiness Target', value: ctx.engagement.assuranceLevel },
        { label: 'Methodology Version', value: ctx.engagement.methodologyVersion },
      ],
    },
    {
      sectionId: 'SEC-03-CRITERIA-METHODOLOGY',
      sectionOrder: 3,
      sectionTitle: '3. Criteria, Materiality & Methodology',
      included: isSectionIncluded('SEC-03-CRITERIA-METHODOLOGY'),
      narrativeSummary: `Evaluations apply deterministic rules DQ-01..DQ-10, ISO 14064-3 / GHG Protocol shadow recalculations (maintaining separate Scope 2 Location-Based and Market-Based totals), seeded PRNG/MUS sampling, and 7-point control effectiveness guardrails.`,
      keyMetrics: [
        {
          label: 'Audit Plan Materiality',
          value: engPlans[0] ? `${engPlans[0].planningMateriality} ${engPlans[0].materialityUnit}` : 'N/A',
        },
        {
          label: 'Metric-Specific Audit Materiality Benchmarks',
          value: String(ctx.auditMateriality.filter((m) => m.engagementId === engId).length),
          unit: 'Metrics',
        },
      ],
    },
    {
      sectionId: 'SEC-04-WORK-PERFORMED-TESTING',
      sectionOrder: 4,
      sectionTitle: '4. Work Performed & Control Testing Coverage',
      included: isSectionIncluded('SEC-04-WORK-PERFORMED-TESTING'),
      narrativeSummary: `${engDesignTests.length} Test of Design workpapers and ${engOperatingTests.length} Test of Operating Effectiveness workpapers were executed across ${engSampleItems.length} sampled items.`,
      keyMetrics: [
        { label: 'Design Tests Performed', value: String(engDesignTests.length) },
        { label: 'Operating Tests Performed', value: String(engOperatingTests.length) },
        { label: 'Sample Items Selected', value: String(engSampleItems.length) },
        {
          label: 'Sample Items Tested',
          value: String(engSampleItems.filter((s) => s.testingStatus !== 'Selected - Untested').length),
        },
      ],
      tableHeaders: ['Test ID', 'Control ID', 'Testing Period', 'Exceptions', 'Conclusion', 'Review Status'],
      tableRows: engOperatingTests.map((ot) => [
        ot.operatingTestId,
        ot.controlId,
        ot.testingPeriod,
        ot.exceptions,
        ot.conclusion,
        ot.reviewStatus,
      ]),
    },
    {
      sectionId: 'SEC-05-EVIDENCE-REVIEWED',
      sectionOrder: 5,
      sectionTitle: '5. Evidence Reviewed & Provenance Integrity',
      included: isSectionIncluded('SEC-05-EVIDENCE-REVIEWED'),
      narrativeSummary: `The Evidence Register contains ${engEvidence.length} records for this engagement (${uploadedEvidence.length} uploaded binary files with verified SHA-256 digests and ${engEvidence.length - uploadedEvidence.length} synthetic metadata-only demo references excluded from acceptance rates).`,
      keyMetrics: [
        { label: 'Total Evidence Records', value: String(engEvidence.length) },
        { label: 'Uploaded Binary Files', value: String(uploadedEvidence.length) },
        { label: 'Accepted Uploaded Files', value: String(acceptedEvidence.length) },
        {
          label: 'Demo Metadata-Only References',
          value: String(engEvidence.filter((e) => e.isMetadataOnlyDemo).length),
        },
      ],
      tableHeaders: ['Evidence ID', 'Document Name', 'Entity ID', 'Provenance', 'Verification Status'],
      tableRows: engEvidence.slice(0, 15).map((ev) => [
        ev.evidenceId,
        ev.documentName,
        ev.linkedEntityId,
        ev.isMetadataOnlyDemo ? 'Demo Metadata Only' : 'Uploaded Binary',
        ev.verificationStatus,
      ]),
    },
    {
      sectionId: 'SEC-06-GHG-RECALCULATION',
      sectionOrder: 6,
      sectionTitle: '6. GHG Shadow-Recalculation Results (Scope 1, Scope 2 Loc/Mkt, Scope 3)',
      included: isSectionIncluded('SEC-06-GHG-RECALCULATION'),
      narrativeSummary: `Deterministic shadow recalculation executed across ${engRecalcs.length} of ${engActivities.length} activity records. Scope 2 Location-Based and Market-Based totals are reported separately and never combined into a single Scope 2 sum.`,
      keyMetrics: [
        {
          label: 'Scope 1 Reported vs Recalculated',
          value: `${ghgSummary.scope1TotalReported.toFixed(2)} vs ${ghgSummary.scope1TotalRecalculated.toFixed(2)}`,
          unit: 'tCO2e',
        },
        {
          label: 'Scope 2 Location-Based Reported vs Recalculated',
          value: `${ghgSummary.scope2LocationReported.toFixed(2)} vs ${ghgSummary.scope2LocationRecalculated.toFixed(2)}`,
          unit: 'tCO2e',
        },
        {
          label: 'Scope 2 Market-Based Reported vs Recalculated',
          value: `${ghgSummary.scope2MarketReported.toFixed(2)} vs ${ghgSummary.scope2MarketRecalculated.toFixed(2)}`,
          unit: 'tCO2e',
        },
        {
          label: 'Scope 3 Value Chain Reported vs Recalculated',
          value: `${ghgSummary.scope3TotalReported.toFixed(2)} vs ${ghgSummary.scope3TotalRecalculated.toFixed(2)}`,
          unit: 'tCO2e',
        },
      ],
      tableHeaders: ['Activity ID', 'Scope', 'Reported (tCO2e)', 'Recalculated (tCO2e)', 'Abs Variance', 'Pct Variance (%)', 'Status'],
      tableRows: engRecalcs.map((r) => {
        const act = engActivities.find((a) => a.activityId === r.activityId);
        return [
          r.activityId,
          act?.scope ?? 'N/A',
          r.reportedEmissions,
          r.calculatedEmissions,
          r.absoluteVariance,
          r.percentageVariance,
          r.varianceStatus,
        ];
      }),
    },
    {
      sectionId: 'SEC-07-FINDINGS-EXCEPTIONS',
      sectionOrder: 7,
      sectionTitle: '7. Exceptions Identified, Findings & Management Actions',
      included: isSectionIncluded('SEC-07-FINDINGS-EXCEPTIONS'),
      narrativeSummary: `${engAuditFindings.length} Phase 2 substantive/control audit findings (${openAuditFindings.length} open) and ${engDqFindings.filter((f) => f.status !== 'Resolved').length} active Phase 1 DQ validation exceptions require management remediation and retest verification prior to closure.`,
      keyMetrics: [
        { label: 'Total Audit Findings', value: String(engAuditFindings.length) },
        { label: 'Open Audit Findings', value: String(openAuditFindings.length) },
        {
          label: 'Active DQ Validation Exceptions',
          value: String(engDqFindings.filter((f) => f.status !== 'Resolved').length),
        },
      ],
      tableHeaders: ['Finding ID', 'Type', 'Severity', 'Owner', 'Target Date', 'Remediation Status', 'Retest Status'],
      tableRows: engAuditFindings.map((af) => [
        af.auditFindingId,
        af.findingType,
        af.severity,
        af.responsibleOwner,
        af.targetDate,
        af.remediationStatus,
        af.retestStatus,
      ]),
    },
    {
      sectionId: 'SEC-08-DISCLOSURE-TRACEABILITY',
      sectionOrder: 8,
      sectionTitle: '8. Disclosure Framework Traceability & Limitations Appendix',
      included: isSectionIncluded('SEC-08-DISCLOSURE-TRACEABILITY'),
      narrativeSummary: `Across ${discSummary.totalCatalogRequirementsCount} catalog disclosure requirements (BRSR, GRI, ESRS, IFRS S1/S2), ${discSummary.excludedNotApplicableCount} are designated Not Applicable and excluded from the denominator. Of the ${discSummary.applicableRequirementsInScopeCount} applicable requirements, ${discSummary.mappedRequirementsCount} (${discSummary.mappingCompletenessPct}%) are mapped and ${discSummary.internallyReviewedCount} are Internally Reviewed. Limitation: Synthetic metadata-only demo evidence references and unreviewed mappings do not constitute external assurance.`,
      keyMetrics: [
        {
          label: 'Applicable Requirements Mapped',
          value: `${discSummary.mappedRequirementsCount} / ${discSummary.applicableRequirementsInScopeCount}`,
          unit: `${discSummary.mappingCompletenessPct}%`,
        },
        {
          label: 'Excluded Not Applicable Requirements',
          value: String(discSummary.excludedNotApplicableCount),
        },
        {
          label: 'Disclosure Evidence Coverage',
          value: `${discSummary.evidenceCoveragePct}%`,
        },
        {
          label: 'Disclosure Testing Coverage',
          value: `${discSummary.testingCoveragePct}%`,
        },
      ],
      tableHeaders: ['Requirement ID', 'Traceability Status', 'Assertions', 'Controls', 'Tests', 'Evidence', 'Missing Links'],
      tableRows: traceResults.map((tr) => [
        tr.requirementId,
        tr.traceabilityStatus,
        tr.linkedAssertions.join('; ') || 'None',
        tr.linkedControls.join('; ') || 'None',
        tr.linkedTests.join('; ') || 'None',
        tr.linkedEvidence.join('; ') || 'None',
        tr.missingLinks.join(' | ') || 'Complete',
      ]),
    },
  ];

  const sourceRecordIds = Array.from(
    new Set([
      ctx.engagement.engagementId,
      ...engAssertions.map((a) => a.assertionId),
      ...engControls.map((c) => c.controlId),
      ...engEvidence.map((e) => e.evidenceId),
      ...engProcedures.map((p) => p.procedureId),
      ...engOperatingTests.map((o) => o.operatingTestId),
      ...engRecalcs.map((r) => r.recalculationId),
      ...engAuditFindings.map((f) => f.auditFindingId),
      ...traceResults.map((t) => t.requirementId),
    ])
  ).sort();

  const draftReportWithoutHash: Omit<AssuranceReport, 'reportSnapshotHash'> = {
    reportId: params.reportId,
    engagementId: engId,
    reportType,
    reportingPeriod: ctx.engagement.reportingYear,
    reportingBoundary: ctx.engagement.reportingBoundary,
    methodologyVersion: ASSURANCE_REPORTING_METHODOLOGY_VERSION,
    generatedAt,
    generatedBy,
    reviewedBy: null,
    reviewStatus: 'Draft Snapshot',
    disclaimerStatement: MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER,
    reportSections: sections,
    sourceRecordIds,
    versionNumber,
  };

  const canonicalPayloadJson = buildCanonicalReportJson(draftReportWithoutHash);
  const reportSnapshotHash = computeDeterministicStringHash(canonicalPayloadJson);

  const report: AssuranceReport = {
    ...draftReportWithoutHash,
    reportSnapshotHash,
  };

  const snapshot: FrozenReportSnapshot = {
    snapshotId: params.snapshotId,
    reportId: report.reportId,
    engagementId: report.engagementId,
    reportType: report.reportType,
    reportingPeriod: report.reportingPeriod,
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy,
    reportSnapshotHash,
    excludedHashMetadataFields: [...EXCLUDED_HASH_METADATA_FIELDS],
    canonicalPayloadJson,
    reportData: JSON.parse(JSON.stringify(report)) as AssuranceReport,
  };

  return { report, snapshot };
}

export interface AdvancedAuditAnalyticsSummary {
  testingAnalytics: {
    plannedProcedures: number;
    completedProcedures: number;
    testingCompletionRatePct: number;
    controlsTested: number;
    designDeficiencies: number;
    operatingExceptions: number;
    sampleCompletionPct: number;
    reviewerBacklogCount: number;
  };
  ghgAnalytics: {
    scope1ReportedTco2e: number;
    scope1RecalculatedTco2e: number;
    scope1VarianceTco2e: number;
    scope2LocationReportedTco2e: number;
    scope2LocationRecalculatedTco2e: number;
    scope2LocationVarianceTco2e: number;
    scope2MarketReportedTco2e: number;
    scope2MarketRecalculatedTco2e: number;
    scope2MarketVarianceTco2e: number;
    scope3ReportedTco2e: number;
    scope3RecalculatedTco2e: number;
    scope3VarianceTco2e: number;
    scope3ByCategory: Record<string, { reported: number; recalculated: number; variance: number }>;
    missingEmissionFactorsCount: number;
    unitValidationFailuresCount: number;
    recalculationCoveragePct: number;
  };
  findingsAnalytics: {
    openFindingsCount: number;
    bySeverity: Record<'Critical' | 'High' | 'Medium' | 'Low', number>;
    byPillar: Record<'Environmental' | 'Social' | 'Governance', number>;
    overdueCorrectiveActionsCount: number;
    averageRemediationAgeDays: number;
    reopenedFindingsCount: number;
    retestingCompletionPct: number;
  };
  disclosureAnalytics: ReturnType<typeof calculateDisclosureCoverageAnalytics>;
  doubleMaterialityMatrix: ReturnType<typeof buildDoubleMaterialityMatrix>;
}

/**
 * Module E — Advanced Audit Analytics Engine (Section 7)
 */
export function calculateAdvancedAuditAnalytics(
  ctx: ReportGenerationContext,
  referenceDateIso = '2026-03-15'
): AdvancedAuditAnalyticsSummary {
  const engId = ctx.engagement.engagementId;
  const engAssertions = ctx.assertions.filter((a) => a.engagementId === engId);
  const engControls = ctx.controls.filter((c) => c.engagementId === engId);
  const engEvidence = ctx.evidence.filter((e) => e.engagementId === engId);
  const engPlans = ctx.auditPlans.filter((p) => p.engagementId === engId);
  const planIds = new Set(engPlans.map((p) => p.auditPlanId));
  const engProcedures = ctx.auditProcedures.filter((p) => planIds.has(p.auditPlanId));
  const procIds = new Set(engProcedures.map((p) => p.procedureId));
  const engSamplingPlans = ctx.samplingPlans.filter((sp) => procIds.has(sp.procedureId));
  const smpIds = new Set(engSamplingPlans.map((s) => s.samplingPlanId));
  const engSamples = ctx.sampleItems.filter((si) => smpIds.has(si.samplingPlanId));
  const ctrlIds = new Set(engControls.map((c) => c.controlId));
  const engDesign = ctx.designTests.filter((dt) => ctrlIds.has(dt.controlId));
  const engOperating = ctx.operatingTests.filter((ot) => ctrlIds.has(ot.controlId));
  const engActivities = ctx.emissionActivities.filter((a) => a.engagementId === engId);
  const actIds = new Set(engActivities.map((a) => a.activityId));
  const engRecalcs = ctx.ghgRecalculations.filter((r) => actIds.has(r.activityId));
  const engFindings = ctx.auditFindings.filter((f) => f.engagementId === engId);

  // 7.1 Testing Analytics
  const plannedProcedures = engProcedures.length;
  const completedProcedures = engProcedures.filter((p) => p.status === 'Completed').length;
  const testingCompletionRatePct =
    plannedProcedures === 0 ? 0 : Number(((completedProcedures / plannedProcedures) * 100).toFixed(1));
  const testedControlIds = new Set([
    ...engDesign.map((d) => d.controlId),
    ...engOperating.map((o) => o.controlId),
  ]);
  const designDeficiencies = engDesign.filter((d) => d.testResult === 'Design Deficiency').length;
  const operatingExceptions = engOperating.reduce((acc, o) => acc + o.exceptions, 0);
  const testedSamples = engSamples.filter((s) => s.testingStatus !== 'Selected - Untested').length;
  const sampleCompletionPct =
    engSamples.length === 0 ? 0 : Number(((testedSamples / engSamples.length) * 100).toFixed(1));
  const reviewerBacklogCount =
    engProcedures.filter((p) => p.status === 'Submitted for Review').length +
    engDesign.filter((d) => d.reviewStatus === 'Submitted for Review').length +
    engOperating.filter((o) => o.reviewStatus === 'Submitted for Review').length;

  // 7.2 GHG Analytics (Strict separation of Scope 2 Location-Based and Market-Based)
  const ghgSum = summarizeGhgInventory(engActivities, engRecalcs);
  const scope3WithVar: Record<string, { reported: number; recalculated: number; variance: number }> = {};
  for (const [cat, vals] of Object.entries(ghgSum.scope3ByCategory)) {
    scope3WithVar[cat] = {
      reported: vals.reported,
      recalculated: vals.recalculated,
      variance: Number((vals.recalculated - vals.reported).toFixed(4)),
    };
  }
  const missingEmissionFactorsCount = engActivities.filter(
    (a) => a.contractualInstrumentStatus === 'Factor Unavailable' || a.valueStatus === 'Unavailable'
  ).length;
  const unitValidationFailuresCount = ctx.dqFindings.filter(
    (f) => f.engagementId === engId && f.ruleId === 'DQ-03' && f.status !== 'Resolved'
  ).length;
  const recalculationCoveragePct =
    engActivities.length === 0
      ? 0
      : Number(((engRecalcs.length / engActivities.length) * 100).toFixed(1));

  // 7.3 Findings Analytics
  const openFindings = engFindings.filter((f) => f.remediationStatus !== 'Closed');
  const bySeverity: Record<'Critical' | 'High' | 'Medium' | 'Low', number> = {
    Critical: engFindings.filter((f) => f.severity === 'Critical').length,
    High: engFindings.filter((f) => f.severity === 'High').length,
    Medium: engFindings.filter((f) => f.severity === 'Medium').length,
    Low: engFindings.filter((f) => f.severity === 'Low').length,
  };

  const assertionPillarMap = new Map(engAssertions.map((a) => [a.assertionId, a.pillar]));
  const controlPillarMap = new Map(engControls.map((c) => [c.controlId, c.pillar]));
  const byPillar: Record<'Environmental' | 'Social' | 'Governance', number> = {
    Environmental: 0,
    Social: 0,
    Governance: 0,
  };
  for (const f of engFindings) {
    const pillar =
      assertionPillarMap.get(f.linkedAssertionId) ??
      controlPillarMap.get(f.linkedControlId) ??
      'Environmental';
    byPillar[pillar] += 1;
  }

  const refMs = new Date(referenceDateIso).getTime();
  const overdueCorrectiveActionsCount = openFindings.filter((f) => {
    const targetMs = new Date(f.targetDate).getTime();
    return !Number.isNaN(targetMs) && targetMs < refMs;
  }).length;

  const agesDays = engFindings.map((f) => {
    const createdMs = new Date(f.createdAt).getTime();
    if (Number.isNaN(createdMs)) return 0;
    return Math.max(0, Math.round((refMs - createdMs) / (1000 * 60 * 60 * 24)));
  });
  const averageRemediationAgeDays =
    agesDays.length === 0
      ? 0
      : Number((agesDays.reduce((a, b) => a + b, 0) / agesDays.length).toFixed(1));

  const reopenedFindingsCount = engFindings.filter((f) => f.remediationStatus === 'Reopened').length;
  const retestedCount = engFindings.filter(
    (f) =>
      f.retestStatus === 'Retest Passed' ||
      f.retestStatus === 'Approved Alternative Disposition'
  ).length;
  const retestingCompletionPct =
    engFindings.length === 0 ? 0 : Number(((retestedCount / engFindings.length) * 100).toFixed(1));

  // 7.4 Disclosure Analytics
  const traceResults = evaluateAllDisclosureTraceability({
    engagementId: engId,
    requirements: ctx.disclosureRequirements,
    mappings: ctx.disclosureMappings,
    assertions: engAssertions,
    controls: engControls,
    evidence: engEvidence,
    procedures: engProcedures,
    sampleItems: engSamples,
    designTests: engDesign,
    operatingTests: engOperating,
    emissionActivities: engActivities,
    ghgRecalculations: engRecalcs,
    auditFindings: engFindings,
  });

  const disclosureAnalytics = calculateDisclosureCoverageAnalytics(
    ctx.disclosureFrameworks,
    ctx.disclosureRequirements,
    ctx.disclosureMappings,
    traceResults,
    engId
  );

  const doubleMaterialityMatrix = buildDoubleMaterialityMatrix(
    ctx.financialMateriality,
    ctx.impactMateriality,
    engId
  );

  return {
    testingAnalytics: {
      plannedProcedures,
      completedProcedures,
      testingCompletionRatePct,
      controlsTested: testedControlIds.size,
      designDeficiencies,
      operatingExceptions,
      sampleCompletionPct,
      reviewerBacklogCount,
    },
    ghgAnalytics: {
      scope1ReportedTco2e: ghgSum.scope1TotalReported,
      scope1RecalculatedTco2e: ghgSum.scope1TotalRecalculated,
      scope1VarianceTco2e: Number((ghgSum.scope1TotalRecalculated - ghgSum.scope1TotalReported).toFixed(4)),
      scope2LocationReportedTco2e: ghgSum.scope2LocationReported,
      scope2LocationRecalculatedTco2e: ghgSum.scope2LocationRecalculated,
      scope2LocationVarianceTco2e: Number(
        (ghgSum.scope2LocationRecalculated - ghgSum.scope2LocationReported).toFixed(4)
      ),
      scope2MarketReportedTco2e: ghgSum.scope2MarketReported,
      scope2MarketRecalculatedTco2e: ghgSum.scope2MarketRecalculated,
      scope2MarketVarianceTco2e: Number(
        (ghgSum.scope2MarketRecalculated - ghgSum.scope2MarketReported).toFixed(4)
      ),
      scope3ReportedTco2e: ghgSum.scope3TotalReported,
      scope3RecalculatedTco2e: ghgSum.scope3TotalRecalculated,
      scope3VarianceTco2e: Number((ghgSum.scope3TotalRecalculated - ghgSum.scope3TotalReported).toFixed(4)),
      scope3ByCategory: scope3WithVar,
      missingEmissionFactorsCount,
      unitValidationFailuresCount,
      recalculationCoveragePct,
    },
    findingsAnalytics: {
      openFindingsCount: openFindings.length,
      bySeverity,
      byPillar,
      overdueCorrectiveActionsCount,
      averageRemediationAgeDays,
      reopenedFindingsCount,
      retestingCompletionPct,
    },
    disclosureAnalytics,
    doubleMaterialityMatrix,
  };
}
