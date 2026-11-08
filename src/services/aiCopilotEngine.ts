import {
  AiAuditRequest,
  AiAuditResponse,
  AiAuditTaskType,
  AiFactClassificationBlock,
  AiValidationStatus,
  AssuranceEngagement,
  AssuranceReport,
  AuditFinding,
  AuditMaterialityAssessment,
  AuditPlan,
  AuditProcedure,
  DesignTest,
  DisclosureMapping,
  DisclosureRequirement,
  EmissionActivityRecord,
  ESGAssertion,
  EvidenceRecord,
  FinancialMaterialityAssessment,
  GHGRecalculationResult,
  ImpactMaterialityAssessment,
  InternalControl,
  OperatingTest,
  RiskAssessment,
  ValidationFinding,
} from '../types/domain';
import { AiAuditRequestInputSchema } from '../validation/schemas';
import { detectAndNeutralizePromptInjection, sanitizeDisplayText } from '../utils/security';

export const MANDATORY_AI_REVIEW_LABEL =
  'AI-generated draft — requires professional review.' as const;

export const AI_TASK_DESCRIPTIONS: Record<
  AiAuditTaskType,
  {
    title: string;
    description: string;
    methodologyStandard: string;
    defaultPrompt: string;
  }
> = {
  'Audit Procedure Drafting': {
    title: '1. Audit Procedure Drafting',
    description:
      'Generate internal audit testing procedures for selected ESG assertions and controls with population, sample expectations, and evidence requirements.',
    methodologyStandard: 'ISSA 5000 / ISO 14064-3 Internal Readiness Procedure Design',
    defaultPrompt:
      'Draft a structured internal audit procedure (inquiry, inspection, recalculation, and sample testing steps) for the selected ESG assertions and internal controls.',
  },
  'Evidence Summarization': {
    title: '2. Evidence Summarization',
    description:
      'Summarize selected evidence records, verification statuses, SHA-256 availability, and missing supporting documentation.',
    methodologyStandard: 'ISSA 5000 Evidence Sufficiency & Appropriateness Readiness',
    defaultPrompt:
      'Summarize the sufficiency, verification status, binary availability, and evidence gaps across the selected records.',
  },
  'Control Deficiency Analysis': {
    title: '3. Control Deficiency Analysis',
    description:
      'Analyze design and operating test exceptions to explain root causes, affected assertions, and residual risk implications.',
    methodologyStandard: 'COSO Internal Control Over Sustainability Reporting (ICSR)',
    defaultPrompt:
      'Analyze the selected controls and test results to identify design or operating deficiencies, root causes, and affected ESG assertions.',
  },
  'GHG Variance Explanation': {
    title: '4. GHG Variance Explanation',
    description:
      'Explain differences between reported and shadow-recalculated Scope 1, Scope 2 (Location/Market), and Scope 3 emissions.',
    methodologyStandard: 'GHG Protocol Corporate Standard / Scope 2 Guidance / ISO 14064-3',
    defaultPrompt:
      'Explain the root causes of variances between reported and shadow-recalculated GHG emissions for the selected activities and recalculations.',
  },
  'Disclosure Gap Analysis': {
    title: '5. Disclosure Gap Analysis',
    description:
      'Evaluate unmapped or partially mapped ESRS, GRI, IFRS S1/S2, and BRSR requirements and missing traceability links.',
    methodologyStandard: 'ESRS / GRI / IFRS S1-S2 / BRSR Nine-Stage Traceability',
    defaultPrompt:
      'Identify disclosure coverage gaps, unmapped requirements, and missing 9-stage traceability links for the selected records.',
  },
  'Materiality Assessment Assistance': {
    title: '6. Materiality Assessment Assistance',
    description:
      'Review financial, impact (Actual vs. Potential), and audit materiality thresholds and highlight double-materiality rationale.',
    methodologyStandard: 'ESRS 1 Double Materiality & ISSA 5000 Quantitative Benchmarks',
    defaultPrompt:
      'Evaluate the selected financial, impact, and audit materiality records and provide a structured double-materiality review summary.',
  },
  'Findings Drafting': {
    title: '7. Findings Drafting',
    description:
      'Draft structured internal audit finding narratives (Condition, Criteria, Cause, Effect, and Recommendation) from test exceptions.',
    methodologyStandard: 'IIA International Professional Practices Framework (IPPF)',
    defaultPrompt:
      'Draft a formal internal audit finding (Condition, Criteria, Cause, Effect, Recommendation) grounded in the selected exceptions and variances.',
  },
  'Management Action Recommendations': {
    title: '8. Management Action Recommendations',
    description:
      'Propose practical Corrective Action Plans (CAP), target milestones, and retest verification criteria for open findings.',
    methodologyStandard: 'COSO Remediation & Retest Governance',
    defaultPrompt:
      'Propose concrete management remediation actions, owner responsibilities, and retest evidence requirements for the selected findings.',
  },
  'Audit Report Narrative Assistance': {
    title: '9. Audit Report Narrative Assistance',
    description:
      'Draft internal readiness executive summaries, scope limitation disclosures, and non-opinion caveats for assurance readiness reports.',
    methodologyStandard: 'Internal ESG Assurance-Readiness Reporting Protocol v1.0',
    defaultPrompt:
      'Draft an executive readiness narrative and scope limitation disclosure grounded in the selected engagement records.',
  },
  'Methodology Question Answering': {
    title: '10. Methodology Question Answering',
    description:
      'Answer technical questions regarding GHG Protocol Scopes 1–3, Dual Scope 2 reporting, ESRS double materiality, and sampling design.',
    methodologyStandard: 'GHG Protocol / ISO 14064-3 / ESRS 1 / ISSA 5000 Reference Guide',
    defaultPrompt:
      'Explain how our workbench methodology handles Dual Scope 2 market-based contractual instruments versus location-based grid factors and actual vs. potential impact materiality.',
  },
};

export interface GroundedRecordItem {
  recordId: string;
  recordType: string;
  engagementId: string;
  summary: string;
  isEvidenceRecord: boolean;
  isMetadataOnlyUnavailable?: boolean;
}

export interface EngagementGroundingDataset {
  engagements: AssuranceEngagement[];
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  dqFindings: ValidationFinding[];
  auditPlans: AuditPlan[];
  auditProcedures: AuditProcedure[];
  riskAssessments: RiskAssessment[];
  designTests: DesignTest[];
  operatingTests: OperatingTest[];
  emissionActivities: EmissionActivityRecord[];
  ghgRecalculations: GHGRecalculationResult[];
  auditFindings: AuditFinding[];
  disclosureRequirements: DisclosureRequirement[];
  disclosureMappings: DisclosureMapping[];
  financialMateriality: FinancialMaterialityAssessment[];
  impactMateriality: ImpactMaterialityAssessment[];
  auditMateriality: AuditMaterialityAssessment[];
  assuranceReports: AssuranceReport[];
}

/**
 * Zone 4 (Memory & State Isolation):
 * Assembles grounding records strictly from the active `engagementId` and `selectedRecordIds`.
 * Throws a deterministic security error if any selected record belongs to a different engagement.
 */
export function assembleEngagementScopedGroundingContext(params: {
  engagementId: string;
  selectedRecordIds: string[];
  dataset: EngagementGroundingDataset;
}): {
  engagement: AssuranceEngagement;
  groundedRecords: GroundedRecordItem[];
  allowedRecordIds: Set<string>;
  evidenceRecordIds: string[];
  hasUnavailableDemoEvidenceOnly: boolean;
  promptInjectionIndicatorsInRecords: string[];
} {
  const engagement = params.dataset.engagements.find(
    (e) => e.engagementId === params.engagementId
  );
  if (!engagement) {
    throw new Error(`Engagement "${params.engagementId}" not found in workbench repository.`);
  }

  // Build lookup across all records with their owning engagementId
  const index = new Map<string, GroundedRecordItem>();

  for (const e of params.dataset.engagements) {
    index.set(e.engagementId, {
      recordId: e.engagementId,
      recordType: 'AssuranceEngagement',
      engagementId: e.engagementId,
      summary: `Engagement ${e.engagementId}: "${e.engagementName}" (${e.reportingYear}, Status=${e.engagementStatus}, Level=${e.assuranceLevel}, Boundary=${e.reportingBoundary})`,
      isEvidenceRecord: false,
    });
  }

  for (const a of params.dataset.assertions) {
    index.set(a.assertionId, {
      recordId: a.assertionId,
      recordType: 'ESGAssertion',
      engagementId: a.engagementId,
      summary: `Assertion ${a.assertionId} [${a.metricCode} - ${a.metricName}]: Pillar=${a.pillar}, Value=${a.reportedValue === null ? 'NULL' : a.reportedValue} ${a.unit}, Basis=${a.valueBasis}, Status=${a.reviewStatus}, LinkedEvidence=[${a.linkedEvidenceIds.join(', ') || 'None'}]`,
      isEvidenceRecord: false,
    });
  }

  for (const c of params.dataset.controls) {
    index.set(c.controlId, {
      recordId: c.controlId,
      recordType: 'InternalControl',
      engagementId: c.engagementId,
      summary: `Control ${c.controlId} [${c.controlCode} - ${c.controlName}]: Owner=${c.controlOwner}, Freq=${c.controlFrequency}, Design=${c.designStatus}, Operating=${c.operatingStatus}, LinkedAssertions=[${c.linkedAssertionIds.join(', ')}]`,
      isEvidenceRecord: false,
    });
  }

  for (const ev of params.dataset.evidence) {
    index.set(ev.evidenceId, {
      recordId: ev.evidenceId,
      recordType: 'EvidenceRecord',
      engagementId: ev.engagementId,
      summary: `Evidence ${ev.evidenceId} ("${ev.documentName}"): Type=${ev.evidenceType}, LinkedTo=${ev.linkedEntityType}:${ev.linkedEntityId}, Status=${ev.verificationStatus}, MetadataOnlyDemo=${ev.isMetadataOnlyDemo}, Checksum=${ev.checksum.slice(0, 16)}`,
      isEvidenceRecord: true,
      isMetadataOnlyUnavailable: ev.isMetadataOnlyDemo,
    });
  }

  for (const dq of params.dataset.dqFindings) {
    index.set(dq.findingId, {
      recordId: dq.findingId,
      recordType: 'ValidationFinding',
      engagementId: dq.engagementId,
      summary: `DQ Finding ${dq.findingId} [${dq.ruleId} - ${dq.severity}]: Status=${dq.status}, Target=${dq.linkedEntityId}, Desc="${dq.description}"`,
      isEvidenceRecord: false,
    });
  }

  const planEngagementMap = new Map<string, string>();
  for (const p of params.dataset.auditPlans) {
    planEngagementMap.set(p.auditPlanId, p.engagementId);
    index.set(p.auditPlanId, {
      recordId: p.auditPlanId,
      recordType: 'AuditPlan',
      engagementId: p.engagementId,
      summary: `AuditPlan ${p.auditPlanId}: Status=${p.status}, Materiality=${p.planningMateriality} ${p.materialityUnit}, Risk=${p.overallRiskAssessment}`,
      isEvidenceRecord: false,
    });
  }

  for (const pr of params.dataset.auditProcedures) {
    const engId = planEngagementMap.get(pr.auditPlanId) ?? params.engagementId;
    index.set(pr.procedureId, {
      recordId: pr.procedureId,
      recordType: 'AuditProcedure',
      engagementId: engId,
      summary: `Procedure ${pr.procedureId} ("${pr.procedureName}"): Type=${pr.procedureType}, SampleSize=${pr.plannedSampleSize}, Status=${pr.status}, Preparer=${pr.assignedPreparer}, Reviewer=${pr.assignedReviewer}`,
      isEvidenceRecord: false,
    });
  }

  for (const r of params.dataset.riskAssessments) {
    index.set(r.riskAssessmentId, {
      recordId: r.riskAssessmentId,
      recordType: 'RiskAssessment',
      engagementId: r.engagementId,
      summary: `RiskAssessment ${r.riskAssessmentId}: Category=${r.riskCategory}, Inherent=${r.inherentRiskScore} (${r.inherentRiskBand}), Residual=${r.residualRiskScore ?? 'NULL'} (${r.residualRiskBand}), Assertion=${r.linkedAssertionId}, Control=${r.linkedControlId}`,
      isEvidenceRecord: false,
    });
  }

  const controlEngagementMap = new Map(
    params.dataset.controls.map((c) => [c.controlId, c.engagementId])
  );
  for (const dt of params.dataset.designTests) {
    const engId = controlEngagementMap.get(dt.controlId) ?? params.engagementId;
    index.set(dt.designTestId, {
      recordId: dt.designTestId,
      recordType: 'DesignTest',
      engagementId: engId,
      summary: `DesignTest ${dt.designTestId} (Control=${dt.controlId}): Result=${dt.testResult}, Review=${dt.reviewStatus}, Rationale="${dt.conclusionRationale}"`,
      isEvidenceRecord: false,
    });
  }

  for (const ot of params.dataset.operatingTests) {
    const engId = controlEngagementMap.get(ot.controlId) ?? params.engagementId;
    index.set(ot.operatingTestId, {
      recordId: ot.operatingTestId,
      recordType: 'OperatingTest',
      engagementId: engId,
      summary: `OperatingTest ${ot.operatingTestId} (Control=${ot.controlId}): Conclusion=${ot.conclusion}, Exceptions=${ot.exceptions}, Review=${ot.reviewStatus}, Notes="${ot.exceptionEvaluationNotes}"`,
      isEvidenceRecord: false,
    });
  }

  const activityEngagementMap = new Map<string, string>();
  for (const act of params.dataset.emissionActivities) {
    activityEngagementMap.set(act.activityId, act.engagementId);
    index.set(act.activityId, {
      recordId: act.activityId,
      recordType: 'EmissionActivity',
      engagementId: act.engagementId,
      summary: `EmissionActivity ${act.activityId} (${act.scope} - ${act.activityType}): Facility=${act.facilityId}, Quantity=${act.activityQuantity ?? 'NULL'} ${act.activityUnit}, Reported=${act.reportedEmissions} tCO2e`,
      isEvidenceRecord: false,
    });
  }

  for (const rec of params.dataset.ghgRecalculations) {
    const engId = activityEngagementMap.get(rec.activityId) ?? params.engagementId;
    index.set(rec.recalculationId, {
      recordId: rec.recalculationId,
      recordType: 'GHGRecalculation',
      engagementId: engId,
      summary: `GHGRecalculation ${rec.recalculationId} (Activity=${rec.activityId}): Calculated=${rec.calculatedEmissions} tCO2e vs Reported=${rec.reportedEmissions} tCO2e, AbsVariance=${rec.absoluteVariance} tCO2e, PctVariance=${rec.percentageVariance === null ? 'NULL' : `${rec.percentageVariance}%`}, Status=${rec.varianceStatus}, Flags=[${rec.diagnosticFlags.join('; ')}]`,
      isEvidenceRecord: false,
    });
  }

  for (const af of params.dataset.auditFindings) {
    index.set(af.auditFindingId, {
      recordId: af.auditFindingId,
      recordType: 'AuditFinding',
      engagementId: af.engagementId,
      summary: `AuditFinding ${af.auditFindingId} [${af.severity} - ${af.findingType}]: Status=${af.remediationStatus}, Retest=${af.retestStatus}, Owner=${af.responsibleOwner}, Desc="${af.description}", RootCause="${af.rootCause}", Action="${af.remediationAction}"`,
      isEvidenceRecord: false,
    });
  }

  for (const mp of params.dataset.disclosureMappings) {
    index.set(mp.mappingId, {
      recordId: mp.mappingId,
      recordType: 'DisclosureMapping',
      engagementId: mp.engagementId,
      summary: `DisclosureMapping ${mp.mappingId} (Req=${mp.requirementId}): Status=${mp.mappingStatus}, Coverage=${mp.coveragePercentage}%, Gaps="${mp.identifiedGaps}"`,
      isEvidenceRecord: false,
    });
  }

  for (const req of params.dataset.disclosureRequirements) {
    index.set(req.requirementId, {
      recordId: req.requirementId,
      recordType: 'DisclosureRequirement',
      engagementId: params.engagementId, // Global catalog requirement scoped to active engagement query
      summary: `DisclosureRequirement ${req.requirementId} [${req.requirementCode} - ${req.requirementTitle}]: Pillar=${req.pillar}, Type=${req.requirementType}, Applicability=${req.applicabilityStatus}`,
      isEvidenceRecord: false,
    });
  }

  for (const fm of params.dataset.financialMateriality) {
    index.set(fm.assessmentId, {
      recordId: fm.assessmentId,
      recordType: 'FinancialMaterialityAssessment',
      engagementId: fm.engagementId,
      summary: `FinancialMateriality ${fm.assessmentId} (${fm.esgTopic}): Magnitude=${fm.magnitudeScore}, Likelihood=${fm.likelihoodScore}, Score=${fm.financialMaterialityScore} (Threshold=${fm.materialityThreshold}, Material=${fm.isFinanciallyMaterial})`,
      isEvidenceRecord: false,
    });
  }

  for (const im of params.dataset.impactMateriality) {
    index.set(im.impactAssessmentId, {
      recordId: im.impactAssessmentId,
      recordType: 'ImpactMaterialityAssessment',
      engagementId: im.engagementId,
      summary: `ImpactMateriality ${im.impactAssessmentId} (${im.esgTopic} [${im.impactType}]): Severity=${im.severityScore}, Likelihood=${im.likelihoodScore === null ? 'NULL (Actual Impact)' : im.likelihoodScore}, Score=${im.impactMaterialityScore} (Material=${im.isImpactMaterial})`,
      isEvidenceRecord: false,
    });
  }

  for (const am of params.dataset.auditMateriality) {
    index.set(am.auditMaterialityId, {
      recordId: am.auditMaterialityId,
      recordType: 'AuditMaterialityAssessment',
      engagementId: am.engagementId,
      summary: `AuditMateriality ${am.auditMaterialityId} (${am.metricCode}): Benchmark=${am.benchmarkBaseValue} ${am.unit}, Planning=${am.planningMaterialityAbsolute} ${am.unit}, Performance=${am.performanceMaterialityAbsolute} ${am.unit}, Trivial=${am.clearlyTrivialAbsolute} ${am.unit}`,
      isEvidenceRecord: false,
    });
  }

  for (const rpt of params.dataset.assuranceReports) {
    index.set(rpt.reportId, {
      recordId: rpt.reportId,
      recordType: 'AssuranceReport',
      engagementId: rpt.engagementId,
      summary: `AssuranceReport ${rpt.reportId} (${rpt.reportType} v${rpt.versionNumber}): Status=${rpt.reviewStatus}, Hash=${rpt.reportSnapshotHash.slice(0, 16)}`,
      isEvidenceRecord: false,
    });
  }

  const groundedRecords: GroundedRecordItem[] = [];
  const promptInjectionIndicatorsInRecords: string[] = [];

  for (const rawId of params.selectedRecordIds) {
    const id = rawId.trim();
    const item = index.get(id);
    if (!item) {
      throw new Error(
        `Invalid Source Record ID: "${id}" does not exist in the workbench repository.`
      );
    }
    if (item.engagementId !== params.engagementId) {
      throw new Error(
        `Security Block (Zone 4 Cross-Engagement Isolation): Record "${id}" belongs to engagement "${item.engagementId}" and cannot be accessed from engagement "${params.engagementId}".`
      );
    }

    // Indirect Prompt Injection Defense on record text
    const injCheck = detectAndNeutralizePromptInjection(item.summary);
    if (injCheck.detected) {
      promptInjectionIndicatorsInRecords.push(
        ...injCheck.indicators.map((ind) => `${id}: ${ind}`)
      );
    }
    groundedRecords.push({
      ...item,
      summary: injCheck.sanitizedText,
    });
  }

  const allowedRecordIds = new Set<string>([
    params.engagementId,
    ...groundedRecords.map((r) => r.recordId),
  ]);
  const summaryIdRegex =
    /\b(ENG-\d{4}-\d{3}|AST-ASN-\d{3}|AST-CTL-\d{3}|EVD-(?:UPL-|DEMO-)?\d{3}|DQ-FND-\d{3}|APL-FY\d{4}-\d{3}|PRC-\d{3}|RSK-\d{3}|SMP-\d{3}|SMP-ITM-\d{3}|DT-\d{3}|OT-\d{3}|ACT-\d{3}|EF-\d{3}|REC-\d{3}|AFN-\d{4}-\d{3}|REV-\d{3}|FWK-[A-Z0-9-]+|REQ-[A-Z0-9-]+|MAP-\d{3}|FIN-MAT-\d{3}|IMP-MAT-\d{3}|AUD-MAT-\d{3}|RPT-\d{3}|SNP-\d{3})\b/g;
  for (const rec of groundedRecords) {
    const matches = rec.summary.match(summaryIdRegex) ?? [];
    for (const m of matches) {
      allowedRecordIds.add(m);
    }
  }
  const evidenceRecords = groundedRecords.filter((r) => r.isEvidenceRecord);
  const evidenceRecordIds = evidenceRecords.map((r) => r.recordId);
  const hasUnavailableDemoEvidenceOnly =
    evidenceRecords.length > 0 &&
    evidenceRecords.every((r) => Boolean(r.isMetadataOnlyUnavailable));

  return {
    engagement,
    groundedRecords,
    allowedRecordIds,
    evidenceRecordIds,
    hasUnavailableDemoEvidenceOnly,
    promptInjectionIndicatorsInRecords,
  };
}

/**
 * Extracts record IDs resembling workbench entity codes (e.g., AST-ASN-001, EVD-001, REC-001, etc.)
 * from AI-generated text and verifies them against `allowedRecordIds`.
 * Any fabricated or ungrounded citation IDs are stripped and flagged.
 */
export function verifyAndSanitizeAiCitations(
  rawContent: string,
  allowedRecordIds: Set<string>
): {
  cleanedContent: string;
  verifiedCitedIds: string[];
  strippedFabricatedIds: string[];
} {
  const idRegex =
    /\b(ENG-\d{4}-\d{3}|AST-ASN-\d{3}|AST-CTL-\d{3}|EVD-(?:UPL-|DEMO-)?\d{3}|DQ-FND-\d{3}|APL-FY\d{4}-\d{3}|PRC-\d{3}|RSK-\d{3}|SMP-\d{3}|SMP-ITM-\d{3}|DT-\d{3}|OT-\d{3}|ACT-\d{3}|EF-\d{3}|REC-\d{3}|AFN-\d{4}-\d{3}|REV-\d{3}|FWK-[A-Z0-9-]+|REQ-[A-Z0-9-]+|MAP-\d{3}|FIN-MAT-\d{3}|IMP-MAT-\d{3}|AUD-MAT-\d{3}|RPT-\d{3}|SNP-\d{3})\b/g;

  const verifiedSet = new Set<string>();
  const strippedSet = new Set<string>();

  const cleanedContent = rawContent.replace(idRegex, (match) => {
    if (allowedRecordIds.has(match)) {
      verifiedSet.add(match);
      return match;
    }
    strippedSet.add(match);
    return `[UNVERIFIED-CITATION-STRIPPED:${match}]`;
  });

  return {
    cleanedContent,
    verifiedCitedIds: Array.from(verifiedSet),
    strippedFabricatedIds: Array.from(strippedSet),
  };
}

/**
 * Deterministic evidence-grounded synthesis fallback when `GEMINI_API_KEY` is absent or server is offline,
 * ensuring the workbench remains 100% functional without external AI connectivity.
 */
export function synthesizeDeterministicGroundedDraft(params: {
  engagement: AssuranceEngagement;
  taskType: AiAuditTaskType;
  groundedRecords: GroundedRecordItem[];
  sanitizedUserQuestion: string;
  methodologyContext: string;
  hasUnavailableDemoEvidenceOnly: boolean;
}): string {
  const { engagement, taskType, groundedRecords, sanitizedUserQuestion, methodologyContext } =
    params;

  if (groundedRecords.length === 0 && taskType !== 'Methodology Question Answering') {
    return [
      `### Insufficient Grounding Evidence Flagged`,
      `- **Engagement Scope**: ${engagement.engagementId} (${engagement.engagementName} — ${engagement.reportingYear})`,
      `- **Task Requested**: ${taskType}`,
      `- **Verification Status**: No engagement source records were selected in the grounding context. Per Zone 2 AI Planning & Reasoning guardrails, the copilot will not fabricate metrics, emission factors, control test outcomes, or evidence citations.`,
      `- **Next Action Required**: Select one or more assertions, controls, GHG recalculations, findings, or disclosure mappings belonging to ${engagement.engagementId} and re-run the analysis.`,
      ``,
      `_${MANDATORY_AI_REVIEW_LABEL}_`,
    ].join('\n');
  }

  const recordBullets = groundedRecords
    .map((r) => `- **[${r.recordId}] (${r.recordType})**: ${r.summary}`)
    .join('\n');

  const unavailWarning = params.hasUnavailableDemoEvidenceOnly
    ? `\n- **Evidence Availability Limitation**: Selected evidence records (${groundedRecords
        .filter((r) => r.isEvidenceRecord)
        .map((r) => r.recordId)
        .join(', ')}) are flagged as metadata-only demonstration references without uploaded binary files. They cannot support an Accepted/Verified conclusion until actual binary files with SHA-256 checksums are uploaded.`
    : '';

  return [
    `### ${taskType} — Grounded Internal Readiness Draft`,
    `**Engagement**: ${engagement.engagementId} — ${engagement.engagementName} (${engagement.reportingYear})`,
    `**Methodology Standard**: ${methodologyContext}`,
    `**Auditor Objective / Question**: ${sanitizedUserQuestion}`,
    ``,
    `#### 1. Verified Application Data (Grounded in Selected Records)`,
    recordBullets || `- Engagement context ${engagement.engagementId} active (Methodology Q&A mode).`,
    ``,
    `#### 2. Methodology & Assurance-Readiness Analysis (${taskType})`,
    taskType === 'Audit Procedure Drafting'
      ? `- **Procedure Design**: Perform inquiry of control owners, inspect primary source documentation, and execute deterministic sample testing and shadow recalculation across [${groundedRecords.map((r) => r.recordId).join(', ')}].\n- **4-Eyes Review Requirement**: Assigned reviewer must be independent from the preparer before procedure completion.`
      : taskType === 'GHG Variance Explanation'
        ? `- **ISO 14064-3 Variance Evaluation**: Compare reported tCO2e against shadow-recalculated tCO2e across [${groundedRecords.map((r) => r.recordId).join(', ')}]. Verify activity unit normalization, IPCC AR6 GWP application, and Scope 2 contractual instrument eligibility before concluding on material variances.`
        : taskType === 'Control Deficiency Analysis'
          ? `- **COSO ICSR Evaluation**: Inspect design walkthroughs and operating sample exceptions across [${groundedRecords.map((r) => r.recordId).join(', ')}]. Controls with unresolved sample exceptions or lacking effectiveness basis cannot reduce residual risk.`
          : taskType === 'Disclosure Gap Analysis'
            ? `- **Nine-Stage Traceability Assessment**: Verify complete linkage from Disclosure Requirement -> Assertion -> Activity -> Control -> Procedure -> Sample -> Test -> Binary Evidence -> Finding across [${groundedRecords.map((r) => r.recordId).join(', ')}].`
            : taskType === 'Materiality Assessment Assistance'
              ? `- **Double-Materiality & Audit Hierarchy**: Confirm Actual impacts have likelihoodScore = NULL (not mechanically multiplied by likelihood) and verify Planning Materiality >= Performance Materiality > Clearly Trivial Threshold across [${groundedRecords.map((r) => r.recordId).join(', ')}].`
              : `- **Structured Readiness Synthesis**: Evaluated ${groundedRecords.length} grounded record(s) [${groundedRecords.map((r) => r.recordId).join(', ')}] against ${methodologyContext}. All quantitative conclusions remain governed by the workbench's deterministic TypeScript engines.`,
    unavailWarning,
    ``,
    `#### 3. Required Human Review & Governance Gate`,
    `- This output is an internal readiness draft only and does **not** constitute an external limited or reasonable assurance opinion.`,
    `- Any updates to procedures, findings, or report narratives require explicit human confirmation and independent 4-eyes review.`,
    ``,
    `_${MANDATORY_AI_REVIEW_LABEL}_`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Builds the 5-part fact classification structure required by Module A (Section 5).
 */
export function buildFactClassificationBlock(params: {
  groundedRecords: GroundedRecordItem[];
  sanitizedUserQuestion: string;
  methodologyContext: string;
  taskType: AiAuditTaskType;
  strippedFabricatedIds: string[];
}): AiFactClassificationBlock {
  const verifiedApplicationData =
    params.groundedRecords.length > 0
      ? params.groundedRecords.map((r) => `[${r.recordId}] ${r.summary}`)
      : ['No specific engagement records selected in grounding scope.'];

  const userProvidedInformation = [
    `Auditor Prompt / Question: "${params.sanitizedUserQuestion}"`,
    `Selected Task Type: ${params.taskType}`,
  ];

  const methodologyReferences = [
    params.methodologyContext,
    AI_TASK_DESCRIPTIONS[params.taskType].methodologyStandard,
    'Deterministic Engine Authority: Quantitative risk, sampling, GHG tCO2e, and materiality scores are computed exclusively by deterministic TypeScript engines.',
  ];

  const aiInterpretationAndRecommendations = [
    `Draft ${params.taskType.toLowerCase()} synthesized from ${params.groundedRecords.length} engagement-scoped record(s).`,
    'Requires human auditor review before incorporation into controlled workpapers.',
  ];

  const missingOrUnverifiedInformation: string[] = [];
  if (params.groundedRecords.length === 0) {
    missingOrUnverifiedInformation.push(
      'No source records were selected in selectedRecordIds; analysis is limited to general methodology guidance.'
    );
  }
  const demoOnly = params.groundedRecords.filter((r) => r.isMetadataOnlyUnavailable);
  if (demoOnly.length > 0) {
    missingOrUnverifiedInformation.push(
      `Metadata-only unavailable evidence records (${demoOnly.map((d) => d.recordId).join(', ')}) lack binary file payloads and cannot be treated as verified evidence.`
    );
  }
  if (params.strippedFabricatedIds.length > 0) {
    missingOrUnverifiedInformation.push(
      `Stripped unverified record citations not present in selected grounding scope: ${params.strippedFabricatedIds.join(', ')}.`
    );
  }
  if (missingOrUnverifiedInformation.length === 0) {
    missingOrUnverifiedInformation.push(
      'No unverified external claims or fabricated source IDs detected; all cited records exist in the active engagement scope.'
    );
  }

  return {
    verifiedApplicationData,
    userProvidedInformation,
    methodologyReferences,
    aiInterpretationAndRecommendations,
    missingOrUnverifiedInformation,
  };
}

/**
 * Executes an AI Audit Copilot request with full 5-Zone security validation:
 * 1. Validates input with Zod (`AiAuditRequestInputSchema`).
 * 2. Detects & neutralizes prompt injection in `userQuestion` and grounded records.
 * 3. Enforces engagement-scoped grounding (`assembleEngagementScopedGroundingContext`).
 * 4. Calls `/api/ai/copilot` (server-side Gemini with fallback ladder) or falls back to
 *    deterministic grounded synthesis when offline/unconfigured.
 * 5. Verifies source citations against `allowedRecordIds` and attaches mandatory review label.
 */
export async function executeGroundedAiCopilotTask(params: {
  requestId: string;
  responseId: string;
  engagementId: string;
  taskType: AiAuditTaskType;
  selectedRecordIds: string[];
  userQuestion: string;
  methodologyContext: string;
  dataset: EngagementGroundingDataset;
  customFetcher?: (payload: {
    engagementId: string;
    taskType: AiAuditTaskType;
    sanitizedQuestion: string;
    methodologyContext: string;
    groundedSummaries: Array<{ recordId: string; recordType: string; summary: string }>;
  }) => Promise<{ text: string; modelUsed: string }>;
}): Promise<{ request: AiAuditRequest; response: AiAuditResponse }> {
  const parsedInput = AiAuditRequestInputSchema.safeParse({
    engagementId: params.engagementId,
    taskType: params.taskType,
    selectedRecordIds: params.selectedRecordIds,
    userQuestion: params.userQuestion,
    methodologyContext: params.methodologyContext,
  });

  if (!parsedInput.success) {
    throw new Error(
      parsedInput.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ')
    );
  }

  const nowIso = new Date().toISOString();
  const injectionCheck = detectAndNeutralizePromptInjection(parsedInput.data.userQuestion);
  const grounding = assembleEngagementScopedGroundingContext({
    engagementId: parsedInput.data.engagementId,
    selectedRecordIds: parsedInput.data.selectedRecordIds,
    dataset: params.dataset,
  });

  const allInjectionIndicators = [
    ...injectionCheck.indicators,
    ...grounding.promptInjectionIndicatorsInRecords,
  ];
  const promptInjectionDetected = allInjectionIndicators.length > 0;

  const requestRecord: AiAuditRequest = {
    requestId: params.requestId,
    engagementId: parsedInput.data.engagementId,
    taskType: parsedInput.data.taskType,
    selectedRecordIds: parsedInput.data.selectedRecordIds,
    userQuestion: sanitizeDisplayText(parsedInput.data.userQuestion, 2000),
    methodologyContext: sanitizeDisplayText(parsedInput.data.methodologyContext, 500),
    createdAt: nowIso,
  };

  // If direct prompt injection attempts to force an assurance opinion or override system instructions,
  // block raw LLM execution and return an explicit security-hardened refusal response.
  if (injectionCheck.detected) {
    const blockedText = [
      `### Security Guardrail Triggered (Zone 1 & Zone 2 Prompt Injection Defense)`,
      `- **Detected Threat Indicators**: ${injectionCheck.indicators.join(', ')}`,
      `- **Sanitized Query**: "${injectionCheck.sanitizedText}"`,
      `- **Enforcement Action**: Untrusted instruction-override directives were neutralized. The AI Audit Copilot cannot ignore system guardrails, issue external assurance opinions, bypass 4-eyes review, or auto-approve controls, findings, or reports.`,
      ``,
      `_${MANDATORY_AI_REVIEW_LABEL}_`,
    ].join('\n');

    const responseRecord: AiAuditResponse = {
      responseId: params.responseId,
      requestId: params.requestId,
      engagementId: requestRecord.engagementId,
      taskType: requestRecord.taskType,
      modelId: 'security-guardrail-zone1-zone2',
      generatedContent: blockedText,
      sourceRecordIds: grounding.groundedRecords.map((r) => r.recordId),
      evidenceReferences: grounding.evidenceRecordIds,
      strippedCitationIds: [],
      factClassification: buildFactClassificationBlock({
        groundedRecords: grounding.groundedRecords,
        sanitizedUserQuestion: injectionCheck.sanitizedText,
        methodologyContext: requestRecord.methodologyContext,
        taskType: requestRecord.taskType,
        strippedFabricatedIds: [],
      }),
      promptInjectionDetected: true,
      promptInjectionIndicators: allInjectionIndicators,
      limitations:
        'Blocked instruction-override / prompt-injection attempt. No controlled audit records were modified.',
      mandatoryReviewLabel: MANDATORY_AI_REVIEW_LABEL,
      validationStatus: 'Blocked — Prompt Injection or Scope Violation',
      humanReviewedAndApplied: false,
      appliedTargetRecordId: null,
      appliedByActor: null,
      appliedAt: null,
      generatedAt: nowIso,
    };

    return { request: requestRecord, response: responseRecord };
  }

  let rawModelText = '';
  let modelIdUsed = 'deterministic-grounded-engine-v1.0';

  if (
    grounding.groundedRecords.length === 0 &&
    requestRecord.taskType !== 'Methodology Question Answering'
  ) {
    rawModelText = synthesizeDeterministicGroundedDraft({
      engagement: grounding.engagement,
      taskType: requestRecord.taskType,
      groundedRecords: grounding.groundedRecords,
      sanitizedUserQuestion: injectionCheck.sanitizedText,
      methodologyContext: requestRecord.methodologyContext,
      hasUnavailableDemoEvidenceOnly: grounding.hasUnavailableDemoEvidenceOnly,
    });
  } else {
    try {
      if (params.customFetcher) {
        const res = await params.customFetcher({
          engagementId: requestRecord.engagementId,
          taskType: requestRecord.taskType,
          sanitizedQuestion: injectionCheck.sanitizedText,
          methodologyContext: requestRecord.methodologyContext,
          groundedSummaries: grounding.groundedRecords.map((r) => ({
            recordId: r.recordId,
            recordType: r.recordType,
            summary: r.summary,
          })),
        });
        rawModelText = res.text;
        modelIdUsed = res.modelUsed;
      } else if (typeof fetch === 'function') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
          const httpRes = await fetch('/api/ai/copilot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              engagementId: requestRecord.engagementId,
              taskType: requestRecord.taskType,
              userQuestion: injectionCheck.sanitizedText,
              methodologyContext: requestRecord.methodologyContext,
              groundedRecords: grounding.groundedRecords.map((r) => ({
                recordId: r.recordId,
                recordType: r.recordType,
                summary: r.summary,
              })),
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (httpRes.ok) {
            const json = (await httpRes.json()) as {
              generatedContent?: string;
              modelId?: string;
            };
            if (json.generatedContent) {
              rawModelText = json.generatedContent;
              modelIdUsed = json.modelId ?? 'gemini-3.8-flash';
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch {
      // Graceful offline fallback
    }

    if (!rawModelText) {
      rawModelText = synthesizeDeterministicGroundedDraft({
        engagement: grounding.engagement,
        taskType: requestRecord.taskType,
        groundedRecords: grounding.groundedRecords,
        sanitizedUserQuestion: injectionCheck.sanitizedText,
        methodologyContext: requestRecord.methodologyContext,
        hasUnavailableDemoEvidenceOnly: grounding.hasUnavailableDemoEvidenceOnly,
      });
      modelIdUsed = 'deterministic-grounded-fallback-v1.0';
    }
  }

  // Verify citations against allowedRecordIds
  const citationCheck = verifyAndSanitizeAiCitations(rawModelText, grounding.allowedRecordIds);
  const finalContent = citationCheck.cleanedContent.includes(MANDATORY_AI_REVIEW_LABEL)
    ? citationCheck.cleanedContent
    : `${citationCheck.cleanedContent}\n\n_${MANDATORY_AI_REVIEW_LABEL}_`;

  let validationStatus: AiValidationStatus = 'Verified Grounded Draft (Requires Human Review)';
  if (
    (grounding.groundedRecords.length === 0 &&
      requestRecord.taskType !== 'Methodology Question Answering') ||
    grounding.hasUnavailableDemoEvidenceOnly
  ) {
    validationStatus = 'Insufficient Evidence Flagged';
  } else if (citationCheck.strippedFabricatedIds.length > 0) {
    validationStatus = 'Grounded with Stripped Unverified Citations';
  }

  const limitationsParts: string[] = [
    'AI output is a draft advisory aid only and cannot replace deterministic GHG, sampling, risk, or materiality calculations.',
    'Requires explicit human auditor review before saving to workpapers.',
  ];
  if (grounding.hasUnavailableDemoEvidenceOnly) {
    limitationsParts.push(
      'Selected evidence records are metadata-only demonstration references without uploaded binary payloads.'
    );
  }
  if (citationCheck.strippedFabricatedIds.length > 0) {
    limitationsParts.push(
      `Stripped ${citationCheck.strippedFabricatedIds.length} unverified citation ID(s) not present in grounding scope: ${citationCheck.strippedFabricatedIds.join(', ')}.`
    );
  }
  if (promptInjectionDetected) {
    limitationsParts.push(
      `Sanitized untrusted directive pattern(s) in record text: ${allInjectionIndicators.join(', ')}.`
    );
  }

  const responseRecord: AiAuditResponse = {
    responseId: params.responseId,
    requestId: params.requestId,
    engagementId: requestRecord.engagementId,
    taskType: requestRecord.taskType,
    modelId: modelIdUsed,
    generatedContent: finalContent,
    sourceRecordIds: grounding.groundedRecords.map((r) => r.recordId),
    evidenceReferences: grounding.evidenceRecordIds,
    strippedCitationIds: citationCheck.strippedFabricatedIds,
    factClassification: buildFactClassificationBlock({
      groundedRecords: grounding.groundedRecords,
      sanitizedUserQuestion: injectionCheck.sanitizedText,
      methodologyContext: requestRecord.methodologyContext,
      taskType: requestRecord.taskType,
      strippedFabricatedIds: citationCheck.strippedFabricatedIds,
    }),
    promptInjectionDetected,
    promptInjectionIndicators: allInjectionIndicators,
    limitations: limitationsParts.join(' '),
    mandatoryReviewLabel: MANDATORY_AI_REVIEW_LABEL,
    validationStatus,
    humanReviewedAndApplied: false,
    appliedTargetRecordId: null,
    appliedByActor: null,
    appliedAt: null,
    generatedAt: nowIso,
  };

  return { request: requestRecord, response: responseRecord };
}

/**
 * Zone 2 & Zone 3 Human Approval & Mutation Guardrail:
 * Validates that an AI-generated draft can ONLY be saved as a draft/planned workpaper note
 * with explicit human confirmation, and NEVER automatically approves plans, controls,
 * risk ratings, findings, or reports, nor mutates frozen snapshots.
 */
export function validateHumanApprovedAiDraftApplication(params: {
  response: AiAuditResponse;
  humanConfirmedReview: boolean;
  targetEntityType:
    | 'AuditProcedureDraft'
    | 'AuditFindingDraft'
    | 'AuditPlanApproval'
    | 'ControlOperatingApproval'
    | 'AssuranceReportApproval'
    | 'FrozenReportSnapshot';
  actor: string;
}): { allowed: boolean; error?: string } {
  if (!params.humanConfirmedReview) {
    return {
      allowed: false,
      error:
        'Human Approval Gate (Zone 2/3): AI-generated content cannot be written to audit records without explicit human review confirmation.',
    };
  }

  if (params.response.validationStatus === 'Blocked — Prompt Injection or Scope Violation') {
    return {
      allowed: false,
      error:
        'Security Block (Zone 2/3): Blocked AI responses containing prompt-injection indicators cannot be applied to audit records.',
    };
  }

  if (
    params.targetEntityType === 'AuditPlanApproval' ||
    params.targetEntityType === 'ControlOperatingApproval' ||
    params.targetEntityType === 'AssuranceReportApproval' ||
    params.targetEntityType === 'FrozenReportSnapshot'
  ) {
    return {
      allowed: false,
      error: `Governance Block (Zone 3): AI Copilot is prohibited from approving or mutating ${params.targetEntityType}. Only human preparers and independent human reviewers may approve controlled records.`,
    };
  }

  if (!params.actor || params.actor.trim().length < 2) {
    return {
      allowed: false,
      error: 'Valid human actor identity is required to apply an AI draft.',
    };
  }

  return { allowed: true };
}
