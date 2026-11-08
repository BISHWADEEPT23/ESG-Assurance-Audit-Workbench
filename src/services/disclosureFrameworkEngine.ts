import {
  AuditFinding,
  AuditProcedure,
  DesignTest,
  DisclosureFramework,
  DisclosureMapping,
  DisclosureRequirement,
  DisclosureTraceabilityResult,
  DisclosureTraceabilityStatus,
  EmissionActivityRecord,
  ESGAssertion,
  EvidenceRecord,
  GHGRecalculationResult,
  InternalControl,
  OperatingTest,
  SampleItem,
} from '../types/domain';
import {
  DisclosureFrameworkInputSchema,
  DisclosureMappingInputSchema,
  DisclosureRequirementInputSchema,
} from '../validation/schemas';
import { sanitizeDisplayText } from '../utils/security';

export const DISCLOSURE_TRACEABILITY_ENGINE_VERSION = 'DISCLOSURE-TRACEABILITY-v0.3.0';

export const ILLUSTRATIVE_CROSSWALK_DISCLAIMER =
  'Illustrative Framework Mapping Notice: Requirement summaries and crosswalk linkages in this workbench are illustrative analytical references for internal assurance-readiness preparation. They do not reproduce full copyrighted standard text or constitute an officially endorsed regulatory crosswalk.';

/**
 * Validates and prepares a DisclosureFramework with HTML/script sanitization.
 */
export function validateAndPrepareFramework(
  input: Omit<DisclosureFramework, 'frameworkId' | 'createdAt'>,
  frameworkId: string,
  createdAt?: string
): DisclosureFramework {
  const parsed = DisclosureFrameworkInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' · '));
  }

  return {
    frameworkId,
    frameworkName: sanitizeDisplayText(parsed.data.frameworkName, 160),
    frameworkVersion: sanitizeDisplayText(parsed.data.frameworkVersion, 80),
    issuingOrganization: sanitizeDisplayText(parsed.data.issuingOrganization, 160),
    jurisdiction: sanitizeDisplayText(parsed.data.jurisdiction, 120),
    effectivePeriod: sanitizeDisplayText(parsed.data.effectivePeriod, 120),
    description: sanitizeDisplayText(parsed.data.description, 800),
    isCustomFramework: parsed.data.isCustomFramework,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

/**
 * Validates a DisclosureRequirement and rejects duplicate requirementCode within the same framework.
 */
export function validateAndPrepareRequirement(params: {
  input: Omit<DisclosureRequirement, 'requirementId'>;
  existingRequirements: DisclosureRequirement[];
  existingFrameworks: DisclosureFramework[];
  requirementId?: string;
}): DisclosureRequirement {
  const { input, existingRequirements, existingFrameworks } = params;
  const parsed = DisclosureRequirementInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' · '));
  }

  const fwExists = existingFrameworks.some((f) => f.frameworkId === parsed.data.frameworkId);
  if (!fwExists) {
    throw new Error(`Unknown frameworkId "${parsed.data.frameworkId}".`);
  }

  const targetId =
    params.requirementId ??
    `REQ-${parsed.data.frameworkId}-${String(existingRequirements.length + 1).padStart(3, '0')}`;

  const duplicateCode = existingRequirements.find(
    (r) =>
      r.frameworkId === parsed.data.frameworkId &&
      r.requirementCode.trim().toLowerCase() === parsed.data.requirementCode.trim().toLowerCase() &&
      r.requirementId !== targetId
  );

  if (duplicateCode) {
    throw new Error(
      `Duplicate requirement code rejected: "${parsed.data.requirementCode}" already exists in framework ${parsed.data.frameworkId} (${duplicateCode.requirementId}).`
    );
  }

  return {
    requirementId: targetId,
    frameworkId: parsed.data.frameworkId,
    requirementCode: sanitizeDisplayText(parsed.data.requirementCode, 60),
    requirementTitle: sanitizeDisplayText(parsed.data.requirementTitle, 200),
    pillar: parsed.data.pillar,
    topic: sanitizeDisplayText(parsed.data.topic, 120),
    subTopic: sanitizeDisplayText(parsed.data.subTopic, 120),
    requirementType: parsed.data.requirementType,
    mandatoryLevel: sanitizeDisplayText(parsed.data.mandatoryLevel, 80),
    expectedUnit: sanitizeDisplayText(parsed.data.expectedUnit, 60),
    guidanceSummary: sanitizeDisplayText(parsed.data.guidanceSummary, 1000),
    applicabilityStatus: parsed.data.applicabilityStatus,
  };
}

/**
 * Validates and imports a batch catalog of requirements with strict schema checking and HTML/script stripping.
 */
export function validateAndImportRequirementCatalog(params: {
  rawItems: unknown[];
  existingRequirements: DisclosureRequirement[];
  existingFrameworks: DisclosureFramework[];
}): DisclosureRequirement[] {
  const { rawItems, existingRequirements, existingFrameworks } = params;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Malformed framework import rejected: Expected a non-empty array of requirement objects.');
  }

  const workingRequirements = [...existingRequirements];
  const imported: DisclosureRequirement[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('Malformed framework import rejected: Catalog entry must be a JSON object.');
    }
    const candidate = rawItem as Record<string, unknown>;
    const reqId =
      typeof candidate.requirementId === 'string' && candidate.requirementId.trim()
        ? candidate.requirementId.trim()
        : `REQ-IMP-${String(workingRequirements.length + 1).padStart(3, '0')}`;

    const validated = validateAndPrepareRequirement({
      input: {
        frameworkId: String(candidate.frameworkId ?? ''),
        requirementCode: String(candidate.requirementCode ?? ''),
        requirementTitle: String(candidate.requirementTitle ?? ''),
        pillar: (candidate.pillar as DisclosureRequirement['pillar']) ?? 'Environmental',
        topic: String(candidate.topic ?? 'General ESG Disclosure'),
        subTopic: String(candidate.subTopic ?? 'Imported Catalog Item'),
        requirementType:
          (candidate.requirementType as DisclosureRequirement['requirementType']) ?? 'Quantitative',
        mandatoryLevel: String(candidate.mandatoryLevel ?? 'Mandatory'),
        expectedUnit: String(candidate.expectedUnit ?? 'tCO2e'),
        guidanceSummary: String(candidate.guidanceSummary ?? 'Imported requirement catalog item.'),
        applicabilityStatus:
          (candidate.applicabilityStatus as DisclosureRequirement['applicabilityStatus']) ??
          'Applicable',
      },
      existingRequirements: workingRequirements,
      existingFrameworks,
      requirementId: reqId,
    });

    workingRequirements.push(validated);
    imported.push(validated);
  }

  return imported;
}

/**
 * Validates a DisclosureMapping and enforces mapping integrity rules.
 */
export function validateDisclosureMappingInput(params: {
  input: Omit<DisclosureMapping, 'mappingId' | 'updatedAt'>;
  existingFrameworks: DisclosureFramework[];
  existingRequirements: DisclosureRequirement[];
  mappingId: string;
  updatedAt?: string;
}): DisclosureMapping {
  const { input, existingFrameworks, existingRequirements, mappingId } = params;
  const parsed = DisclosureMappingInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' · '));
  }

  if (!existingFrameworks.some((f) => f.frameworkId === parsed.data.frameworkId)) {
    throw new Error(`Unknown frameworkId "${parsed.data.frameworkId}" in disclosure mapping.`);
  }
  if (!existingRequirements.some((r) => r.requirementId === parsed.data.requirementId)) {
    throw new Error(`Unknown requirementId "${parsed.data.requirementId}" in disclosure mapping.`);
  }

  return {
    mappingId,
    engagementId: parsed.data.engagementId,
    frameworkId: parsed.data.frameworkId,
    requirementId: parsed.data.requirementId,
    linkedAssertionIds: Array.from(new Set(parsed.data.linkedAssertionIds)),
    linkedControlIds: Array.from(new Set(parsed.data.linkedControlIds)),
    linkedProcedureIds: Array.from(new Set(parsed.data.linkedProcedureIds)),
    linkedEvidenceIds: Array.from(new Set(parsed.data.linkedEvidenceIds)),
    mappingStatus: parsed.data.mappingStatus,
    coveragePercentage: parsed.data.coveragePercentage,
    mappingRationale: sanitizeDisplayText(parsed.data.mappingRationale, 800),
    identifiedGaps: sanitizeDisplayText(parsed.data.identifiedGaps, 800),
    mappedBy: sanitizeDisplayText(parsed.data.mappedBy, 120),
    reviewedBy: parsed.data.reviewedBy ? sanitizeDisplayText(parsed.data.reviewedBy, 120) : null,
    updatedAt: params.updatedAt ?? new Date().toISOString(),
  };
}

export interface SingleTraceabilityEvaluationParams {
  engagementId: string;
  requirement: DisclosureRequirement;
  mapping: DisclosureMapping | undefined;
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  procedures: AuditProcedure[];
  sampleItems: SampleItem[];
  designTests: DesignTest[];
  operatingTests: OperatingTest[];
  emissionActivities: EmissionActivityRecord[];
  ghgRecalculations: GHGRecalculationResult[];
  auditFindings: AuditFinding[];
  calculationTimestamp?: string;
}

export interface TraceabilityEvaluationContext {
  engagementId: string;
  requirements: DisclosureRequirement[];
  mappings: DisclosureMapping[];
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  procedures: AuditProcedure[];
  sampleItems: SampleItem[];
  designTests: DesignTest[];
  operatingTests: OperatingTest[];
  emissionActivities: EmissionActivityRecord[];
  ghgRecalculations: GHGRecalculationResult[];
  auditFindings: AuditFinding[];
  calculationTimestamp?: string;
}

/**
 * Module B — Deterministic Disclosure-to-Evidence Traceability Engine (Section 4)
 *
 * Evaluates the 9-stage logical lineage for a single DisclosureRequirement:
 * Disclosure Requirement -> ESG Assertion -> Source Record -> Internal Control ->
 * Audit Procedure -> Sample Item -> Test Result -> Evidence -> Finding
 *
 * Critical Guardrails:
 * 1. Detects broken foreign-key references (mapped assertionId, controlId, procedureId, or evidenceId that does not exist).
 * 2. Evidence acceptance alone NEVER automatically changes traceabilityStatus to 'Internally Reviewed'.
 * 3. Never uses 'Externally Assured'.
 */
export function evaluateSingleRequirementTraceability(
  params: SingleTraceabilityEvaluationParams
): DisclosureTraceabilityResult {
  const { requirement, mapping } = params;
  const timestamp = params.calculationTimestamp ?? new Date().toISOString();
  const assertionMap = new Map(params.assertions.map((a) => [a.assertionId, a]));
  const controlMap = new Map(params.controls.map((c) => [c.controlId, c]));
  const procedureMap = new Map(params.procedures.map((p) => [p.procedureId, p]));
  const evidenceMap = new Map(params.evidence.map((e) => [e.evidenceId, e]));

  const missingLinks: string[] = [];

  if (!mapping || mapping.mappingStatus === 'Not Mapped') {
    missingLinks.push('No DisclosureMapping record linked for this engagement.');
    return {
      traceabilityId: `TRC-${params.engagementId}-${requirement.requirementId}`,
      engagementId: params.engagementId,
      requirementId: requirement.requirementId,
      linkedAssertions: [],
      linkedSourceRecords: [],
      linkedControls: [],
      linkedProcedures: [],
      linkedSamples: [],
      linkedTests: [],
      linkedEvidence: [],
      linkedFindings: [],
      traceabilityStatus: 'Not Mapped',
      missingLinks,
      calculationTimestamp: timestamp,
    };
  }

  // 1. Validate mapped Assertions & detect broken references
  const validAssertions: ESGAssertion[] = [];
  for (const aId of mapping.linkedAssertionIds) {
    const found = assertionMap.get(aId);
    if (!found) {
      missingLinks.push(`Broken Assertion reference: "${aId}" does not exist in store.`);
    } else {
      validAssertions.push(found);
    }
  }

  // 2. Validate mapped Controls & detect broken references
  const validControls: InternalControl[] = [];
  for (const cId of mapping.linkedControlIds) {
    const found = controlMap.get(cId);
    if (!found) {
      missingLinks.push(`Broken Control reference: "${cId}" does not exist in store.`);
    } else {
      validControls.push(found);
    }
  }
  for (const ctrl of params.controls) {
    if (
      ctrl.linkedAssertionIds.some((id) => validAssertions.some((a) => a.assertionId === id)) &&
      !validControls.some((c) => c.controlId === ctrl.controlId)
    ) {
      validControls.push(ctrl);
    }
  }

  // 3. Validate mapped Procedures & detect broken references
  const validProcedures: AuditProcedure[] = [];
  for (const pId of mapping.linkedProcedureIds) {
    const found = procedureMap.get(pId);
    if (!found) {
      missingLinks.push(`Broken Procedure reference: "${pId}" does not exist in store.`);
    } else {
      validProcedures.push(found);
    }
  }
  for (const proc of params.procedures) {
    if (
      (proc.linkedAssertionIds.some((id) => validAssertions.some((a) => a.assertionId === id)) ||
        proc.linkedControlIds.some((id) => validControls.some((c) => c.controlId === id))) &&
      !validProcedures.some((p) => p.procedureId === proc.procedureId)
    ) {
      validProcedures.push(proc);
    }
  }

  // 4. Source Records (EmissionActivityRecords or Assertion dataSources)
  const linkedSourceIds = new Set<string>();
  for (const act of params.emissionActivities) {
    if (act.linkedAssertionId && validAssertions.some((a) => a.assertionId === act.linkedAssertionId)) {
      linkedSourceIds.add(act.activityId);
    }
  }
  for (const a of validAssertions) {
    if (a.dataSource && linkedSourceIds.size === 0) {
      linkedSourceIds.add(`SRC-${a.assertionId}`);
    }
  }

  // 5. Sample Items
  const validSamples = params.sampleItems.filter(
    (s) =>
      validAssertions.some((a) => a.assertionId === s.populationRecordId) ||
      validProcedures.some((p) => s.samplingPlanId.includes(p.procedureId))
  );

  // 6. Tests (DesignTests, OperatingTests, GHGRecalculations)
  const linkedTestIds = new Set<string>();
  const validDesignTests = params.designTests.filter((dt) =>
    validControls.some((c) => c.controlId === dt.controlId)
  );
  const validOperatingTests = params.operatingTests.filter((ot) =>
    validControls.some((c) => c.controlId === ot.controlId)
  );
  const validGhgRecalcs = params.ghgRecalculations.filter((rec) =>
    linkedSourceIds.has(rec.activityId)
  );

  for (const dt of validDesignTests) linkedTestIds.add(dt.designTestId);
  for (const ot of validOperatingTests) linkedTestIds.add(ot.operatingTestId);
  for (const gr of validGhgRecalcs) linkedTestIds.add(gr.recalculationId);

  // 7. Evidence records & detect broken references
  const validEvidence: EvidenceRecord[] = [];
  for (const evId of mapping.linkedEvidenceIds) {
    const found = evidenceMap.get(evId);
    if (!found) {
      missingLinks.push(`Broken Evidence reference: "${evId}" does not exist in store.`);
    } else if (found.verificationStatus !== 'Rejected') {
      validEvidence.push(found);
    }
  }

  const indirectEvidenceIds = new Set<string>([
    ...validAssertions.flatMap((a) => a.linkedEvidenceIds),
    ...validControls.flatMap((c) => c.linkedEvidenceIds),
    ...validDesignTests.flatMap((d) => d.evidenceIds),
    ...validOperatingTests.flatMap((o) => o.evidenceIds),
  ]);
  for (const evId of indirectEvidenceIds) {
    const found = evidenceMap.get(evId);
    if (
      found &&
      found.verificationStatus !== 'Rejected' &&
      !validEvidence.some((e) => e.evidenceId === found.evidenceId)
    ) {
      validEvidence.push(found);
    }
  }

  // 8. Findings
  const linkedFindings = params.auditFindings.filter(
    (f) =>
      validAssertions.some((a) => a.assertionId === f.linkedAssertionId) ||
      validControls.some((c) => c.controlId === f.linkedControlId) ||
      validProcedures.some((p) => p.procedureId === f.procedureId)
  );

  const openFindings = linkedFindings.filter((f) => f.remediationStatus !== 'Closed');
  const hasOperatingExceptions = validOperatingTests.some(
    (ot) => ot.exceptions > 0 || ot.conclusion === 'Operating Ineffectively'
  );
  const hasMaterialGhgVariance = validGhgRecalcs.some(
    (gr) =>
      gr.varianceStatus === 'Material Variance Candidate' ||
      gr.varianceStatus === 'Blocked / Flagged Limitation'
  );

  // Missing lineage checks
  if (validAssertions.length === 0) {
    missingLinks.push('Missing linked ESG Assertion.');
  }
  if (mapping.linkedProcedureIds.length === 0 || validProcedures.length === 0) {
    missingLinks.push('Missing linked Audit Procedure.');
  }
  if (mapping.linkedEvidenceIds.length === 0 || validEvidence.length === 0) {
    missingLinks.push('Missing supporting documentary Evidence.');
  }

  const requiresSubstantiveOrControlTesting =
    requirement.requirementType === 'Quantitative' || requirement.requirementType === 'Hybrid';

  if (requiresSubstantiveOrControlTesting && linkedTestIds.size === 0) {
    missingLinks.push('Missing completed Control Test or GHG Shadow Recalculation.');
  }

  const hasBrokenReference = missingLinks.some((m) => m.startsWith('Broken '));

  const hasDesignDeficiency = validDesignTests.some(
    (dt) => dt.testResult === 'Design Deficiency'
  );

  // Determine deterministic traceabilityStatus
  let traceabilityStatus: DisclosureTraceabilityStatus = 'Partially Mapped';

  if (
    validAssertions.length === 0 ||
    hasBrokenReference ||
    mapping.mappingStatus === 'Partially Mapped'
  ) {
    traceabilityStatus = 'Partially Mapped';
  } else if (validEvidence.length === 0) {
    traceabilityStatus = 'Evidence Missing';
  } else if (
    linkedFindings.length > 0 ||
    openFindings.length > 0 ||
    hasDesignDeficiency ||
    hasOperatingExceptions ||
    hasMaterialGhgVariance
  ) {
    traceabilityStatus = 'Exceptions Identified';
  } else if (requiresSubstantiveOrControlTesting && linkedTestIds.size === 0) {
    traceabilityStatus = 'Testing Pending';
  } else if (
    mapping.mappingStatus === 'Fully Mapped' &&
    Boolean(mapping.reviewedBy) &&
    validProcedures.length > 0 &&
    validAssertions.every((a) => a.reviewStatus === 'Reviewed')
  ) {
    traceabilityStatus = 'Internally Reviewed';
  } else {
    traceabilityStatus = 'Testing Pending';
  }

  return {
    traceabilityId: `TRC-${params.engagementId}-${requirement.requirementId}`,
    engagementId: params.engagementId,
    requirementId: requirement.requirementId,
    linkedAssertions: validAssertions.map((a) => a.assertionId),
    linkedSourceRecords: Array.from(linkedSourceIds),
    linkedControls: validControls.map((c) => c.controlId),
    linkedProcedures: validProcedures.map((p) => p.procedureId),
    linkedSamples: validSamples.map((s) => s.sampleItemId),
    linkedTests: Array.from(linkedTestIds),
    linkedEvidence: validEvidence.map((e) => e.evidenceId),
    linkedFindings: linkedFindings.map((f) => f.auditFindingId),
    traceabilityStatus,
    missingLinks,
    calculationTimestamp: timestamp,
  };
}

export function evaluateAllDisclosureTraceability(
  ctx: TraceabilityEvaluationContext
): DisclosureTraceabilityResult[] {
  const mappingByReq = new Map(
    ctx.mappings
      .filter((m) => m.engagementId === ctx.engagementId)
      .map((m) => [m.requirementId, m])
  );

  return ctx.requirements.map((req) =>
    evaluateSingleRequirementTraceability({
      engagementId: ctx.engagementId,
      requirement: req,
      mapping: mappingByReq.get(req.requirementId),
      assertions: ctx.assertions,
      controls: ctx.controls,
      evidence: ctx.evidence,
      procedures: ctx.procedures,
      sampleItems: ctx.sampleItems,
      designTests: ctx.designTests,
      operatingTests: ctx.operatingTests,
      emissionActivities: ctx.emissionActivities,
      ghgRecalculations: ctx.ghgRecalculations,
      auditFindings: ctx.auditFindings,
      calculationTimestamp: ctx.calculationTimestamp,
    })
  );
}

export interface DisclosureCoverageSummary {
  totalCatalogRequirementsCount: number;
  excludedNotApplicableCount: number;
  applicableRequirementsInScopeCount: number;
  mappedRequirementsCount: number;
  unmappedRequirementsCount: number;
  evidenceCoveragePct: number;
  testingCoveragePct: number;
  internallyReviewedCount: number;
  exceptionsIdentifiedCount: number;
  requirementsWithOpenExceptionsCount: number;
  mappingCompletenessPct: number;
  byFramework: Array<{
    frameworkId: string;
    frameworkName: string;
    frameworkVersion: string;
    totalRequirements: number;
    notApplicableCount: number;
    notApplicableExcluded: number;
    applicableCount: number;
    applicableDenominator: number;
    mappedCount: number;
    evidenceSupportedCount: number;
    testedCount: number;
    exceptionsCount: number;
    internallyReviewedCount: number;
    coveragePct: number;
    mappingCompletenessPct: number;
  }>;
}

export type DisclosureCoverageAnalytics = DisclosureCoverageSummary;

/**
 * Module E Section 7.4 — Disclosure Analytics with Explicit Denominators
 * Explicitly excludes requirements designated 'Not Applicable' from applicable-coverage denominators.
 */
export function calculateDisclosureCoverageAnalytics(
  frameworks: DisclosureFramework[],
  requirements: DisclosureRequirement[],
  mappings: DisclosureMapping[],
  traceabilityResults: DisclosureTraceabilityResult[],
  engagementId: string
): DisclosureCoverageSummary {
  const traceMap = new Map(
    traceabilityResults
      .filter((t) => t.engagementId === engagementId)
      .map((t) => [t.requirementId, t])
  );

  const isReqNotApplicable = (req: DisclosureRequirement): boolean => {
    return req.applicabilityStatus === 'Not Applicable';
  };

  const totalCatalogRequirementsCount = requirements.length;
  const applicableReqs = requirements.filter((r) => !isReqNotApplicable(r));
  const excludedNotApplicableCount = totalCatalogRequirementsCount - applicableReqs.length;
  const applicableDenominator = applicableReqs.length;

  let mappedRequirementsCount = 0;
  let evidenceSupportedCount = 0;
  let testedCount = 0;
  let internallyReviewedCount = 0;
  let requirementsWithOpenExceptionsCount = 0;

  for (const req of applicableReqs) {
    const tr = traceMap.get(req.requirementId);
    if (!tr || tr.traceabilityStatus === 'Not Mapped') {
      continue;
    }
    mappedRequirementsCount += 1;
    if (tr.linkedEvidence.length > 0) {
      evidenceSupportedCount += 1;
    }
    if (tr.linkedTests.length > 0) {
      testedCount += 1;
    }
    if (tr.traceabilityStatus === 'Internally Reviewed') {
      internallyReviewedCount += 1;
    }
    if (tr.traceabilityStatus === 'Exceptions Identified') {
      requirementsWithOpenExceptionsCount += 1;
    }
  }

  const unmappedRequirementsCount = applicableDenominator - mappedRequirementsCount;
  const mappingCompletenessPct =
    applicableDenominator === 0
      ? 0
      : Number(((mappedRequirementsCount / applicableDenominator) * 100).toFixed(1));
  const evidenceCoveragePct =
    applicableDenominator === 0
      ? 0
      : Number(((evidenceSupportedCount / applicableDenominator) * 100).toFixed(1));
  const testingCoveragePct =
    applicableDenominator === 0
      ? 0
      : Number(((testedCount / applicableDenominator) * 100).toFixed(1));

  const byFramework = frameworks.map((fw) => {
    const fwReqs = requirements.filter((r) => r.frameworkId === fw.frameworkId);
    const fwApplicable = fwReqs.filter((r) => !isReqNotApplicable(r));
    const fwNa = fwReqs.length - fwApplicable.length;
    const fwDenom = fwApplicable.length;

    let fwMapped = 0;
    let fwEv = 0;
    let fwTested = 0;
    let fwExc = 0;
    let fwRev = 0;

    for (const r of fwApplicable) {
      const tr = traceMap.get(r.requirementId);
      if (tr && tr.traceabilityStatus !== 'Not Mapped') {
        fwMapped += 1;
        if (tr.linkedEvidence.length > 0) fwEv += 1;
        if (tr.linkedTests.length > 0) fwTested += 1;
        if (tr.traceabilityStatus === 'Exceptions Identified') fwExc += 1;
        if (tr.traceabilityStatus === 'Internally Reviewed') fwRev += 1;
      }
    }

    const covPct = fwDenom === 0 ? 0 : Number(((fwMapped / fwDenom) * 100).toFixed(1));

    return {
      frameworkId: fw.frameworkId,
      frameworkName: fw.frameworkName,
      frameworkVersion: fw.frameworkVersion,
      totalRequirements: fwReqs.length,
      notApplicableCount: fwNa,
      notApplicableExcluded: fwNa,
      applicableCount: fwDenom,
      applicableDenominator: fwDenom,
      mappedCount: fwMapped,
      evidenceSupportedCount: fwEv,
      testedCount: fwTested,
      exceptionsCount: fwExc,
      internallyReviewedCount: fwRev,
      coveragePct: covPct,
      mappingCompletenessPct: covPct,
    };
  });

  return {
    totalCatalogRequirementsCount,
    excludedNotApplicableCount,
    applicableRequirementsInScopeCount: applicableDenominator,
    mappedRequirementsCount,
    unmappedRequirementsCount,
    evidenceCoveragePct,
    testingCoveragePct,
    internallyReviewedCount,
    exceptionsIdentifiedCount: requirementsWithOpenExceptionsCount,
    requirementsWithOpenExceptionsCount,
    mappingCompletenessPct,
    byFramework,
  };
}
