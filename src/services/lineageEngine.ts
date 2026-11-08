import {
  AuditFinding,
  AuditProcedure,
  DesignTest,
  EmissionActivityRecord,
  ESGAssertion,
  EvidenceRecord,
  GHGRecalculationResult,
  InternalControl,
  OperatingTest,
  SampleItem,
} from '../types/domain';

export type EvidenceProvenanceCategory =
  | 'Accepted Evidence'
  | 'Unreviewed Uploaded Evidence'
  | 'Rejected Evidence'
  | 'Metadata-Only Demo Reference'
  | 'Missing Evidence';

export interface EvidenceLineageChain {
  chainId: string;
  engagementId: string;
  evidenceRecord: EvidenceRecord | null;
  provenanceCategory: EvidenceProvenanceCategory;
  sourceActivity: EmissionActivityRecord | null;
  assertion: ESGAssertion | null;
  control: InternalControl | null;
  procedure: AuditProcedure | null;
  sampleItem: SampleItem | null;
  controlTest: { type: 'DesignTest' | 'OperatingTest'; id: string; status: string } | null;
  ghgRecalculation: GHGRecalculationResult | null;
  finding: AuditFinding | null;
  assertionIndependentlyVerifiedNote: string;
}

export interface LineageContext {
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
}

export function classifyEvidenceProvenance(
  ev: EvidenceRecord | null
): EvidenceProvenanceCategory {
  if (!ev) return 'Missing Evidence';
  if (ev.isMetadataOnlyDemo || ev.verificationStatus === 'Metadata Only (Demo Unavailable)') {
    return 'Metadata-Only Demo Reference';
  }
  if (ev.verificationStatus === 'Accepted') return 'Accepted Evidence';
  if (ev.verificationStatus === 'Rejected') return 'Rejected Evidence';
  return 'Unreviewed Uploaded Evidence';
}

/**
 * Module G — Evidence Traceability & Lineage Graph Builder (Section 13)
 * Builds end-to-end chains:
 * Evidence -> Source Record -> Assertion -> Control -> Procedure/Sample/Test -> Finding
 *
 * Critical Rule: Evidence acceptance does NOT automatically imply that the related assertion is verified.
 */
export function buildEvidenceLineageChains(ctx: LineageContext): EvidenceLineageChain[] {
  const evidenceMap = new Map(ctx.evidence.map((e) => [e.evidenceId, e]));
  const recalcByActivity = new Map(ctx.ghgRecalculations.map((r) => [r.activityId, r]));
  const activityByAssertion = new Map(
    ctx.emissionActivities
      .filter((a) => Boolean(a.linkedAssertionId))
      .map((a) => [a.linkedAssertionId!, a])
  );

  const chains: EvidenceLineageChain[] = [];

  for (const assertion of ctx.assertions) {
    const linkedControls = ctx.controls.filter((c) =>
      c.linkedAssertionIds.includes(assertion.assertionId)
    );
    const primaryControl = linkedControls[0] ?? null;

    const linkedProcedure =
      ctx.procedures.find(
        (p) =>
          p.linkedAssertionIds.includes(assertion.assertionId) ||
          (primaryControl && p.linkedControlIds.includes(primaryControl.controlId))
      ) ?? null;

    const designTest = primaryControl
      ? ctx.designTests.find((dt) => dt.controlId === primaryControl.controlId)
      : undefined;
    const operatingTest = primaryControl
      ? ctx.operatingTests.find((ot) => ot.controlId === primaryControl.controlId)
      : undefined;

    const controlTestSummary = operatingTest
      ? {
          type: 'OperatingTest' as const,
          id: operatingTest.operatingTestId,
          status: `${operatingTest.conclusion} (${operatingTest.reviewStatus})`,
        }
      : designTest
        ? {
            type: 'DesignTest' as const,
            id: designTest.designTestId,
            status: `${designTest.testResult} (${designTest.reviewStatus})`,
          }
        : null;

    const sampleItem =
      ctx.sampleItems.find((s) => s.populationRecordId === assertion.assertionId) ?? null;

    const sourceActivity = activityByAssertion.get(assertion.assertionId) ?? null;
    const ghgRecalculation = sourceActivity
      ? recalcByActivity.get(sourceActivity.activityId) ?? null
      : null;

    const finding =
      ctx.auditFindings.find(
        (f) =>
          f.linkedAssertionId === assertion.assertionId ||
          (primaryControl && f.linkedControlId === primaryControl.controlId)
      ) ?? null;

    const evIds =
      assertion.linkedEvidenceIds.length > 0 ? assertion.linkedEvidenceIds : [null];

    for (const evId of evIds) {
      const evRecord = evId ? evidenceMap.get(evId) ?? null : null;
      const provenance = classifyEvidenceProvenance(evRecord);

      chains.push({
        chainId: `LIN-${assertion.assertionId}-${evId ?? 'MISSING'}`,
        engagementId: assertion.engagementId,
        evidenceRecord: evRecord,
        provenanceCategory: provenance,
        sourceActivity,
        assertion,
        control: primaryControl,
        procedure: linkedProcedure,
        sampleItem,
        controlTest: controlTestSummary,
        ghgRecalculation,
        finding,
        assertionIndependentlyVerifiedNote:
          provenance === 'Accepted Evidence'
            ? `Evidence Accepted (${evId}), but Assertion ${assertion.assertionId} review status remains "${assertion.reviewStatus}" — evidence acceptance does not automatically verify the assertion.`
            : `Assertion status: ${assertion.reviewStatus}`,
      });
    }
  }

  return chains;
}
