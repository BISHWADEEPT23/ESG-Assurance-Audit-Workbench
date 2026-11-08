import {
  AssuranceEngagement,
  AssuranceReadinessMetrics,
  AuditFinding,
  AuditPlan,
  AuditProcedure,
  DesignTest,
  EmissionActivityRecord,
  ESGAssertion,
  EvidenceRecord,
  GHGRecalculationResult,
  GlobalFilterState,
  InternalControl,
  OperatingTest,
  Phase2DashboardMetrics,
  ReviewRecord,
  SampleItem,
  ValidationFinding,
} from '../types/domain';

/**
 * Documented Engagement Progress Weighting Model (Section 12)
 * Operational readiness indicator only — never represents an independent assurance opinion.
 */
export const ENGAGEMENT_PROGRESS_WEIGHTS = {
  scopeDefinition: 0.15, // 15%
  assertionReview: 0.35, // 35%
  controlDocumentation: 0.25, // 25%
  evidenceReview: 0.25, // 25%
} as const;

export interface FilteredDataset {
  engagements: AssuranceEngagement[];
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  findings: ValidationFinding[];
}

export function applyGlobalFilters(
  data: FilteredDataset,
  filters: GlobalFilterState
): FilteredDataset {
  const activeEngagements = data.engagements.filter((e) => {
    if (filters.engagementId !== 'ALL' && e.engagementId !== filters.engagementId) return false;
    if (filters.reportingYear !== 'ALL' && e.reportingYear !== filters.reportingYear) return false;
    return true;
  });

  const matchingEngagementIds = new Set(activeEngagements.map((e) => e.engagementId));

  const assertions = data.assertions.filter((a) => {
    if (a.reviewStatus === 'Archived') return false;
    if (!matchingEngagementIds.has(a.engagementId)) return false;
    if (filters.reportingYear !== 'ALL' && a.reportingYear !== filters.reportingYear) return false;
    if (filters.facilityId !== 'ALL' && a.facilityId !== filters.facilityId) return false;
    if (filters.pillar !== 'ALL' && a.pillar !== filters.pillar) return false;
    if (filters.reviewStatus !== 'ALL' && a.reviewStatus !== filters.reviewStatus) return false;
    return true;
  });

  const controls = data.controls.filter((c) => {
    if (!matchingEngagementIds.has(c.engagementId)) return false;
    if (filters.pillar !== 'ALL' && c.pillar !== filters.pillar) return false;
    return true;
  });

  const assertionIds = new Set(assertions.map((a) => a.assertionId));
  const controlIds = new Set(controls.map((c) => c.controlId));

  const evidence = data.evidence.filter((ev) => {
    if (!matchingEngagementIds.has(ev.engagementId)) return false;
    if (filters.pillar !== 'ALL' || filters.facilityId !== 'ALL' || filters.reviewStatus !== 'ALL') {
      if (ev.linkedEntityType === 'ESGAssertion') return assertionIds.has(ev.linkedEntityId);
      if (ev.linkedEntityType === 'InternalControl') return controlIds.has(ev.linkedEntityId);
    }
    return true;
  });

  const findings = data.findings.filter((f) => {
    if (!matchingEngagementIds.has(f.engagementId)) return false;
    if (filters.pillar !== 'ALL' || filters.facilityId !== 'ALL' || filters.reviewStatus !== 'ALL') {
      if (f.linkedEntityType === 'ESGAssertion') return assertionIds.has(f.linkedEntityId);
      if (f.linkedEntityType === 'InternalControl') return controlIds.has(f.linkedEntityId);
    }
    return true;
  });

  return {
    engagements: activeEngagements,
    assertions,
    controls,
    evidence,
    findings,
  };
}

/**
 * Calculates deterministic Assurance Readiness & Operational Coverage Metrics (Phase 1 Section 12).
 */
export function calculateAssuranceReadinessMetrics(
  dataset: FilteredDataset,
  allEvidence?: EvidenceRecord[]
): AssuranceReadinessMetrics {
  const evidenceLookup = new Map(
    (allEvidence ?? dataset.evidence).map((ev) => [ev.evidenceId, ev])
  );

  const nonArchivedEngagements = dataset.engagements.filter(
    (e) => e.engagementStatus !== 'Archived'
  );
  const activeEngagementsCount = nonArchivedEngagements.length;

  const activeAssertions = dataset.assertions.filter((a) => a.reviewStatus !== 'Archived');
  const totalAssertionsCount = activeAssertions.length;

  const excludedNotApplicableAssertionsCount = activeAssertions.filter(
    (a) => a.valueBasis === 'Not Applicable'
  ).length;

  const applicableAssertions = activeAssertions.filter(
    (a) => a.valueBasis !== 'Not Applicable'
  );
  const applicableAssertionsCount = applicableAssertions.length;

  const reviewedAssertionsCount = applicableAssertions.filter(
    (a) => a.reviewStatus === 'Reviewed'
  ).length;

  const assertionReviewCoveragePct =
    applicableAssertionsCount > 0
      ? Number(((reviewedAssertionsCount / applicableAssertionsCount) * 100).toFixed(1))
      : 0;

  const totalControlsCount = dataset.controls.length;
  const applicableControlsCount = dataset.controls.length;
  const documentedControlsCount = dataset.controls.filter(
    (c) => c.designStatus === 'Documented'
  ).length;

  const controlDocumentationCoveragePct =
    applicableControlsCount > 0
      ? Number(((documentedControlsCount / applicableControlsCount) * 100).toFixed(1))
      : 0;

  // Evidence Coverage: Assertions with Required Available Evidence / Assertions Requiring Evidence * 100
  const assertionsRequiringEvidence = applicableAssertions.filter((a) => a.requiresEvidence);
  const assertionsRequiringEvidenceCount = assertionsRequiringEvidence.length;

  const assertionsWithAvailableEvidenceCount = assertionsRequiringEvidence.filter((a) => {
    return a.linkedEvidenceIds.some((evId) => {
      const ev = evidenceLookup.get(evId);
      if (!ev) return false;
      if (ev.verificationStatus === 'Rejected') {
        return false;
      }
      return true;
    });
  }).length;

  const evidenceCoveragePct =
    assertionsRequiringEvidenceCount > 0
      ? Number(
          (
            (assertionsWithAvailableEvidenceCount / assertionsRequiringEvidenceCount) *
            100
          ).toFixed(1)
        )
      : 0;

  // Evidence Acceptance Rate: Accepted Evidence Records / Reviewed Evidence Records * 100
  const reviewedEvidence = dataset.evidence.filter(
    (ev) =>
      !ev.isMetadataOnlyDemo &&
      (ev.verificationStatus === 'Accepted' || ev.verificationStatus === 'Rejected')
  );
  const reviewedEvidenceCount = reviewedEvidence.length;
  const acceptedEvidenceCount = reviewedEvidence.filter(
    (ev) => ev.verificationStatus === 'Accepted'
  ).length;

  const evidenceAcceptanceRatePct =
    reviewedEvidenceCount > 0
      ? Number(((acceptedEvidenceCount / reviewedEvidenceCount) * 100).toFixed(1))
      : 0;

  // Validation Findings
  const openFindings = dataset.findings.filter(
    (f) => f.status === 'Open' || f.status === 'Reopened'
  );
  const openFindingsCount = openFindings.length;
  const highSeverityFindingsCount = openFindings.filter((f) => f.severity === 'High').length;

  // Scope completion indicator: engagements with non-empty scope, boundary, and valid dates
  const definedScopeEngagementsCount = nonArchivedEngagements.filter(
    (e) =>
      e.scopeDescription.trim().length >= 10 &&
      e.reportingBoundary.trim().length >= 5 &&
      e.plannedEndDate >= e.plannedStartDate
  ).length;

  const scopeCompletionPct =
    activeEngagementsCount > 0
      ? Number(((definedScopeEngagementsCount / activeEngagementsCount) * 100).toFixed(1))
      : 0;

  const evidenceReviewComponent =
    assertionsRequiringEvidenceCount > 0
      ? evidenceCoveragePct * 0.6 + evidenceAcceptanceRatePct * 0.4
      : evidenceAcceptanceRatePct;

  const engagementCompletionPct = Number(
    (
      scopeCompletionPct * ENGAGEMENT_PROGRESS_WEIGHTS.scopeDefinition +
      assertionReviewCoveragePct * ENGAGEMENT_PROGRESS_WEIGHTS.assertionReview +
      controlDocumentationCoveragePct * ENGAGEMENT_PROGRESS_WEIGHTS.controlDocumentation +
      evidenceReviewComponent * ENGAGEMENT_PROGRESS_WEIGHTS.evidenceReview
    ).toFixed(1)
  );

  return {
    activeEngagementsCount,
    totalAssertionsCount,
    applicableAssertionsCount,
    excludedNotApplicableAssertionsCount,
    reviewedAssertionsCount,
    assertionReviewCoveragePct,
    totalControlsCount,
    applicableControlsCount,
    documentedControlsCount,
    controlDocumentationCoveragePct,
    assertionsRequiringEvidenceCount,
    assertionsWithAvailableEvidenceCount,
    evidenceCoveragePct,
    reviewedEvidenceCount,
    acceptedEvidenceCount,
    evidenceAcceptanceRatePct,
    openFindingsCount,
    highSeverityFindingsCount,
    engagementCompletionPct,
    scopeCompletionPct,
  };
}

/**
 * Calculates deterministic Phase 2 Executive Dashboard KPIs (Section 15).
 */
export function calculatePhase2DashboardMetrics(params: {
  auditPlans: AuditPlan[];
  auditProcedures: AuditProcedure[];
  designTests: DesignTest[];
  operatingTests: OperatingTest[];
  sampleItems: SampleItem[];
  emissionActivities: EmissionActivityRecord[];
  ghgRecalculations: GHGRecalculationResult[];
  auditFindings: AuditFinding[];
  reviews: ReviewRecord[];
  referenceDateIso?: string;
}): Phase2DashboardMetrics {
  const refDate = params.referenceDateIso ?? '2026-03-01';

  const approvedOrCompletedPlans = params.auditPlans.filter(
    (p) =>
      p.status === 'Approved for Internal Testing' ||
      p.status === 'Testing in Progress' ||
      p.status === 'Testing Completed' ||
      p.status === 'Closed'
  ).length;
  const auditPlanCompletionPct =
    params.auditPlans.length > 0
      ? Number(((approvedOrCompletedPlans / params.auditPlans.length) * 100).toFixed(1))
      : 0;

  const proceduresScheduledCount = params.auditProcedures.length;
  const proceduresCompletedCount = params.auditProcedures.filter(
    (p) => p.status === 'Completed'
  ).length;

  const testedControlIds = new Set<string>();
  for (const dt of params.designTests) {
    if (dt.testResult !== 'Not Tested') testedControlIds.add(dt.controlId);
  }
  for (const ot of params.operatingTests) {
    if (ot.conclusion !== 'Not Tested') testedControlIds.add(ot.controlId);
  }
  const controlsTestedCount = testedControlIds.size;

  const designDeficienciesCount = params.designTests.filter(
    (dt) => dt.testResult === 'Design Deficiency'
  ).length;

  const operatingExceptionsCount = params.operatingTests.reduce(
    (acc, ot) => acc + ot.exceptions,
    0
  );

  const testedSamples = params.sampleItems.filter(
    (s) => s.testingStatus !== 'Selected - Untested'
  ).length;
  const sampleTestingCompletionPct =
    params.sampleItems.length > 0
      ? Number(((testedSamples / params.sampleItems.length) * 100).toFixed(1))
      : 0;

  const recalculatedActivityIds = new Set(params.ghgRecalculations.map((r) => r.activityId));
  const coveredActivities = params.emissionActivities.filter((a) =>
    recalculatedActivityIds.has(a.activityId)
  ).length;
  const ghgRecalculationCoveragePct =
    params.emissionActivities.length > 0
      ? Number(((coveredActivities / params.emissionActivities.length) * 100).toFixed(1))
      : 0;

  const unresolvedGhgVariancesCount = params.ghgRecalculations.filter(
    (r) => r.varianceStatus !== 'Within Tolerance'
  ).length;

  const openAuditFindings = params.auditFindings.filter(
    (f) => f.remediationStatus !== 'Closed'
  );
  const openAuditFindingsCount = openAuditFindings.length;

  const overdueRemediationCount = openAuditFindings.filter(
    (f) => f.targetDate < refDate
  ).length;

  const pendingReviewsCount = params.reviews.filter(
    (r) => r.reviewStatus === 'Submitted for Review' || r.reviewStatus === 'Draft'
  ).length;

  return {
    auditPlanCompletionPct,
    proceduresScheduledCount,
    proceduresCompletedCount,
    controlsTestedCount,
    designDeficienciesCount,
    operatingExceptionsCount,
    sampleTestingCompletionPct,
    ghgRecalculationCoveragePct,
    unresolvedGhgVariancesCount,
    openAuditFindingsCount,
    overdueRemediationCount,
    pendingReviewsCount,
  };
}
