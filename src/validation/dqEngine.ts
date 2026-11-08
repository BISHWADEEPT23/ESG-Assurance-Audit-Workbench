import {
  AssuranceEngagement,
  ESGAssertion,
  EvidenceRecord,
  Facility,
  InternalControl,
  ValidationFinding,
  ValidationRuleId,
} from '../types/domain';

export const VALIDATION_RULE_DEFINITIONS: Record<
  ValidationRuleId,
  { title: string; defaultSeverity: 'High' | 'Medium' | 'Low'; description: string }
> = {
  'DQ-01': {
    title: 'Missing Required Assertion Value',
    defaultSeverity: 'High',
    description:
      'Applicable assertion is marked as Missing or has a null reportedValue where a quantitative value is required.',
  },
  'DQ-02': {
    title: 'Duplicate Assertion',
    defaultSeverity: 'High',
    description:
      'Multiple active assertions exist for the same engagement, facility, metric code, reporting period, and assertion type.',
  },
  'DQ-03': {
    title: 'Invalid or Incompatible Unit',
    defaultSeverity: 'High',
    description:
      'Assertion unit is incompatible with the canonical metric family (e.g., MWh reported for GHG emissions requiring tCO2e, or Liters reported for headcount/hours).',
  },
  'DQ-04': {
    title: 'Missing Required Evidence',
    defaultSeverity: 'High',
    description:
      'Assertion requires supporting evidence, but either has no linked evidence or only links to unavailable metadata-only demo references.',
  },
  'DQ-05': {
    title: 'Missing Control Owner',
    defaultSeverity: 'Medium',
    description:
      'Internal control does not have an assigned control owner or lists an unassigned placeholder.',
  },
  'DQ-06': {
    title: 'Invalid Reporting Period Alignment',
    defaultSeverity: 'Medium',
    description:
      'Assertion reportingYear does not match the parent AssuranceEngagement reportingYear.',
  },
  'DQ-07': {
    title: 'Missing Versus Zero Conflict',
    defaultSeverity: 'High',
    description:
      'Assertion has a reported value of 0 without Verified Zero basis, or has Missing basis with a non-null numeric value.',
  },
  'DQ-08': {
    title: 'Unsupported Calculation Method',
    defaultSeverity: 'Medium',
    description:
      'Assertion relies on an unverified, ad-hoc, or unsupported calculation method (e.g., Unverified Spend Proxy or Manual Uncalibrated Estimate).',
  },
  'DQ-09': {
    title: 'Incomplete Facility Coverage / Boundary Mismatch',
    defaultSeverity: 'Medium',
    description:
      'Assertion references an incomplete boundary or a facility excluded from the consolidated organizational reporting boundary.',
  },
  'DQ-10': {
    title: 'Missing Source Reference',
    defaultSeverity: 'Medium',
    description:
      'Assertion is missing a traceable primary data source reference.',
  },
};

const EXPECTED_UNITS_BY_PREFIX: Record<string, string[]> = {
  'GHG-SC1': ['tCO2e', 'kgCO2e'],
  'GHG-SC2': ['tCO2e', 'kgCO2e'],
  'GHG-SC3': ['tCO2e', 'kgCO2e'],
  'ENV-EN': ['MWh', 'kWh', 'GJ'],
  'ENV-WT': ['m3', 'ML'],
  'ENV-WS': ['Metric Tons', 'kg'],
  'SOC-WF': ['Headcount', 'FTE', '%'],
  'SOC-HS': ['Incidents', 'Rate per 200k hrs', 'Hours'],
  'SOC-TR': ['Hours', 'Hours/FTE', '%'],
  'GOV-ET': ['%', 'Cases', 'Count'],
  'GOV-BD': ['%', 'Members', 'Count'],
};

const UNSUPPORTED_CALC_PATTERNS = [
  'unverified',
  'unsupported',
  'ad-hoc',
  'adhoc',
  'rough guess',
  'uncalibrated',
  'unknown',
  'tbd',
];

export interface ValidationContext {
  engagements: AssuranceEngagement[];
  facilities: Facility[];
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  existingFindings: ValidationFinding[];
  nowIso?: string;
}

/**
 * Deterministic execution of rules DQ-01 through DQ-10.
 * If a finding was previously marked 'Resolved' by a user, but the underlying defect still exists,
 * the finding is deterministically transitioned to 'Reopened'.
 */
export function runDeterministicValidation(ctx: ValidationContext): ValidationFinding[] {
  const now = ctx.nowIso ?? new Date().toISOString();
  const engagementsMap = new Map(ctx.engagements.map((e) => [e.engagementId, e]));
  const facilitiesMap = new Map(ctx.facilities.map((f) => [f.facilityId, f]));
  const evidenceMap = new Map(ctx.evidence.map((ev) => [ev.evidenceId, ev]));

  // Map existing findings by deterministic key: `${ruleId}::${linkedEntityId}`
  const existingByKey = new Map<string, ValidationFinding>();
  for (const f of ctx.existingFindings) {
    existingByKey.set(`${f.ruleId}::${f.linkedEntityId}`, f);
  }

  const detectedKeys = new Set<string>();
  const results: ValidationFinding[] = [];

  const registerViolation = (
    ruleId: ValidationRuleId,
    engagementId: string,
    linkedEntityType: 'ESGAssertion' | 'InternalControl' | 'AssuranceEngagement',
    linkedEntityId: string,
    description: string,
    severityOverride?: 'High' | 'Medium' | 'Low'
  ) => {
    const key = `${ruleId}::${linkedEntityId}`;
    if (detectedKeys.has(key)) return;
    detectedKeys.add(key);

    const existing = existingByKey.get(key);
    const severity = severityOverride ?? VALIDATION_RULE_DEFINITIONS[ruleId].defaultSeverity;

    if (existing) {
      // Critical requirement: Marking a finding resolved must NOT bypass the underlying validation rule.
      // If the defect persists, reopen it during revalidation!
      const nextStatus = existing.status === 'Resolved' ? 'Reopened' : existing.status;
      results.push({
        ...existing,
        severity,
        description,
        status: nextStatus,
        detectedAt: existing.detectedAt,
      });
    } else {
      const deterministicSuffix = `${ruleId}-${linkedEntityId}`.replace(/[^a-zA-Z0-9-]/g, '');
      results.push({
        findingId: `FND-${deterministicSuffix}`,
        engagementId,
        ruleId,
        linkedEntityType,
        linkedEntityId,
        severity,
        description,
        detectedAt: now,
        status: 'Open',
      });
    }
  };

  // Track duplicate keys for DQ-02
  const assertionSignatureGroup = new Map<string, ESGAssertion[]>();
  const activeAssertions = ctx.assertions.filter((a) => a.reviewStatus !== 'Archived');

  for (const assertion of activeAssertions) {
    const sig = `${assertion.engagementId}|${assertion.facilityId}|${assertion.metricCode}|${assertion.reportingYear}|${assertion.assertionType}`;
    const list = assertionSignatureGroup.get(sig) ?? [];
    list.push(assertion);
    assertionSignatureGroup.set(sig, list);
  }

  for (const assertion of activeAssertions) {
    // DQ-01: Missing required assertion value
    if (
      assertion.valueBasis !== 'Not Applicable' &&
      (assertion.reportedValue === null || assertion.valueBasis === 'Missing')
    ) {
      registerViolation(
        'DQ-01',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} (${assertion.metricCode}) has a missing required value (null).`
      );
    }

    // DQ-02: Duplicate assertion
    const sig = `${assertion.engagementId}|${assertion.facilityId}|${assertion.metricCode}|${assertion.reportingYear}|${assertion.assertionType}`;
    const group = assertionSignatureGroup.get(sig) ?? [];
    if (group.length > 1 && group[0].assertionId !== assertion.assertionId) {
      registerViolation(
        'DQ-02',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} duplicates ${group[0].assertionId} for metric ${assertion.metricCode} at facility ${assertion.facilityId} (${assertion.reportingYear}).`
      );
    }

    // DQ-03: Invalid or incompatible unit
    const prefix = assertion.metricCode.split('-').slice(0, 2).join('-');
    const allowedUnits = EXPECTED_UNITS_BY_PREFIX[prefix];
    if (allowedUnits && !allowedUnits.includes(assertion.unit)) {
      registerViolation(
        'DQ-03',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Incompatible unit "${assertion.unit}" on ${assertion.assertionId} (${assertion.metricCode}). Expected one of: ${allowedUnits.join(', ')}.`
      );
    }

    // DQ-04: Missing evidence
    if (assertion.requiresEvidence && assertion.valueBasis !== 'Not Applicable') {
      const validLinkedEvidence = assertion.linkedEvidenceIds
        .map((id) => evidenceMap.get(id))
        .filter(
          (ev): ev is EvidenceRecord =>
            Boolean(ev) && ev!.verificationStatus !== 'Rejected'
        );

      if (validLinkedEvidence.length === 0) {
        registerViolation(
          'DQ-04',
          assertion.engagementId,
          'ESGAssertion',
          assertion.assertionId,
          `Assertion ${assertion.assertionId} (${assertion.metricCode}) requires supporting evidence but has no active linked evidence record.`
        );
      }
    }

    // DQ-06: Invalid reporting period alignment
    const parentEngagement = engagementsMap.get(assertion.engagementId);
    if (parentEngagement && assertion.reportingYear !== parentEngagement.reportingYear) {
      registerViolation(
        'DQ-06',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} reporting period (${assertion.reportingYear}) conflicts with engagement ${parentEngagement.engagementId} period (${parentEngagement.reportingYear}).`
      );
    }

    // DQ-07: Missing versus zero conflict
    const hasUnverifiedZero =
      assertion.reportedValue === 0 && assertion.valueBasis !== 'Verified Zero';
    const hasMissingWithNumber =
      assertion.valueBasis === 'Missing' && assertion.reportedValue !== null;
    const hasZeroWithoutZeroValue =
      assertion.valueBasis === 'Verified Zero' && assertion.reportedValue !== 0;

    if (hasUnverifiedZero || hasMissingWithNumber || hasZeroWithoutZeroValue) {
      registerViolation(
        'DQ-07',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} exhibits a Missing vs. Zero conflict (reportedValue=${String(assertion.reportedValue)}, valueBasis="${assertion.valueBasis}"). Zero values must be explicitly confirmed as "Verified Zero".`
      );
    }

    // DQ-08: Unsupported calculation method
    const calcLower = (assertion.calculationMethod || '').toLowerCase();
    if (
      !assertion.calculationMethod ||
      UNSUPPORTED_CALC_PATTERNS.some((pat) => calcLower.includes(pat))
    ) {
      registerViolation(
        'DQ-08',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} uses an unsupported or uncalibrated calculation method ("${assertion.calculationMethod || 'None'}").`
      );
    }

    // DQ-09: Incomplete facility coverage / boundary mismatch
    const facility = facilitiesMap.get(assertion.facilityId);
    const boundaryLower = (assertion.reportingBoundary || '').toLowerCase();
    if (
      (facility && !facility.includedInBoundary) ||
      boundaryLower.includes('incomplete') ||
      boundaryLower.includes('partial') ||
      boundaryLower.includes('excluded')
    ) {
      registerViolation(
        'DQ-09',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} has incomplete facility or reporting boundary coverage ("${assertion.reportingBoundary}").`
      );
    }

    // DQ-10: Missing source reference
    const sourceTrimmed = (assertion.dataSource || '').trim();
    if (
      !sourceTrimmed ||
      sourceTrimmed.toLowerCase() === 'missing' ||
      sourceTrimmed.toLowerCase() === 'none' ||
      sourceTrimmed.toLowerCase() === 'tbd'
    ) {
      registerViolation(
        'DQ-10',
        assertion.engagementId,
        'ESGAssertion',
        assertion.assertionId,
        `Assertion ${assertion.assertionId} (${assertion.metricCode}) is missing a primary data source reference.`
      );
    }
  }

  // DQ-05: Missing control owner
  for (const control of ctx.controls) {
    const ownerTrimmed = (control.controlOwner || '').trim();
    if (
      !ownerTrimmed ||
      ownerTrimmed.toLowerCase() === 'unassigned' ||
      ownerTrimmed.toLowerCase() === 'tbd' ||
      ownerTrimmed.toLowerCase() === 'vacant'
    ) {
      registerViolation(
        'DQ-05',
        control.engagementId,
        'InternalControl',
        control.controlId,
        `Internal control ${control.controlCode} (${control.controlName}) is missing an assigned control owner.`
      );
    }
  }

  // Keep any genuinely resolved findings whose underlying defect was actually fixed
  for (const existing of ctx.existingFindings) {
    const key = `${existing.ruleId}::${existing.linkedEntityId}`;
    if (!detectedKeys.has(key) && existing.status === 'Resolved') {
      results.push(existing);
    }
  }

  return results.sort((a, b) => a.findingId.localeCompare(b.findingId));
}
