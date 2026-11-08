import {
  AuditFinding,
  DesignTest,
  EvidenceRecord,
  OperatingTest,
  ReviewRecord,
  ReviewWorkflowStatus,
  SampleItem,
} from '../types/domain';

/**
 * Module D — Control Testing & Module H — Review Workflow Guardrail Engine
 *
 * Mandatory Guardrails for Operating Effectiveness (Section 6.2):
 * A control CANNOT be marked 'Operating Effectively' unless:
 * 1. A documented test procedure exists (testProcedure.trim().length >= 10)
 * 2. The testing period is defined (testingPeriod.trim().length >= 4)
 * 3. Required sample items have completed testing (all linked sample items tested)
 * 4. Required evidence is available (non-rejected, available evidence linked)
 * 5. Exceptions have been evaluated (exceptionsEvaluated === true, and 0 unmitigated exceptions for 'Operating Effectively')
 * 6. A preparer conclusion is documented (conclusionRationale.trim().length >= 10)
 * 7. A reviewer has approved the conclusion (reviewStatus === 'Approved') AND reviewer !== preparer
 */
export interface OperatingTestValidationContext {
  test: OperatingTest;
  linkedSampleItems: SampleItem[];
  availableEvidenceMap: Map<string, EvidenceRecord>;
}

export function validateOperatingTestGuardrails(
  ctx: OperatingTestValidationContext
): { valid: boolean; errors: string[] } {
  const { test, linkedSampleItems, availableEvidenceMap } = ctx;
  const errors: string[] = [];

  // Reviewer independence check applies to all submitted/approved tests
  if (
    test.preparer.trim() &&
    test.reviewer.trim() &&
    test.preparer.trim().toLowerCase() === test.reviewer.trim().toLowerCase()
  ) {
    errors.push(
      'Reviewer Independence Violation: The reviewer must be a different individual from the workpaper preparer.'
    );
  }

  // Invalid conclusion transition check: cannot be Approved if conclusion is 'Not Tested'
  if (test.reviewStatus === 'Approved' && test.conclusion === 'Not Tested') {
    errors.push('Cannot approve an operating effectiveness test while conclusion is "Not Tested".');
  }

  if (test.conclusion === 'Operating Effectively') {
    // 1. Documented test procedure exists
    if (!test.testProcedure || test.testProcedure.trim().length < 10) {
      errors.push('Guardrail 1 Failed: A documented test procedure (at least 10 chars) is required.');
    }

    // 2. Testing period is defined
    if (!test.testingPeriod || test.testingPeriod.trim().length < 4) {
      errors.push('Guardrail 2 Failed: The testing period must be explicitly defined.');
    }

    // 3. Required sample items have completed testing
    if (linkedSampleItems.length === 0 && test.sampleResults.length === 0) {
      errors.push('Guardrail 3 Failed: At least one sampled item must be tested.');
    }
    const hasUntestedSamples = linkedSampleItems.some(
      (item) => item.testingStatus === 'Selected - Untested'
    );
    if (hasUntestedSamples) {
      errors.push(
        'Guardrail 3 Failed: All sample items in the linked sampling plan must complete testing before concluding Operating Effectively.'
      );
    }

    // 4. Required evidence is available
    const validEvidence = test.evidenceIds
      .map((id) => availableEvidenceMap.get(id))
      .filter(
        (ev): ev is EvidenceRecord =>
          Boolean(ev) && ev!.verificationStatus !== 'Rejected'
      );
    if (validEvidence.length === 0) {
      errors.push(
        'Guardrail 4 Failed: Required supporting evidence must be linked and available (non-rejected).'
      );
    }

    // 5. Exceptions have been evaluated
    if (!test.exceptionsEvaluated) {
      errors.push('Guardrail 5 Failed: Sample exceptions must be formally evaluated.');
    }
    if (test.exceptions > 0) {
      errors.push(
        `Guardrail 5 Failed: Control cannot be marked Operating Effectively with ${test.exceptions} operating exception(s) identified.`
      );
    }

    // 6. Preparer conclusion rationale is documented
    if (!test.conclusionRationale || test.conclusionRationale.trim().length < 10) {
      errors.push('Guardrail 6 Failed: A documented preparer conclusion rationale is required.');
    }

    // 7. Reviewer has approved the conclusion
    if (test.reviewStatus !== 'Approved') {
      errors.push(
        'Guardrail 7 Failed: Control cannot be concluded as Operating Effectively until an independent reviewer has approved the workpaper (reviewStatus = "Approved").'
      );
    }
    if (!test.reviewer || test.reviewer.trim().length < 2) {
      errors.push('Guardrail 7 Failed: An independent reviewer must be assigned.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateDesignTestGuardrails(
  test: DesignTest,
  availableEvidenceMap: Map<string, EvidenceRecord>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    test.preparer.trim() &&
    test.reviewer.trim() &&
    test.preparer.trim().toLowerCase() === test.reviewer.trim().toLowerCase()
  ) {
    errors.push(
      'Reviewer Independence Violation: The reviewer must be different from the preparer.'
    );
  }

  if (test.testResult === 'Adequately Designed') {
    if (!test.walkthroughDescription || test.walkthroughDescription.trim().length < 10) {
      errors.push('A documented walkthrough description is required to conclude Adequately Designed.');
    }
    const validEv = test.evidenceIds
      .map((id) => availableEvidenceMap.get(id))
      .filter((ev) => Boolean(ev) && ev!.verificationStatus !== 'Rejected');
    if (validEv.length === 0) {
      errors.push('At least one non-rejected evidence record is required for Adequately Designed.');
    }
    if (!test.conclusionRationale || test.conclusionRationale.trim().length < 10) {
      errors.push('A documented conclusion rationale is required.');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Module H — Review Workflow Validation (Self-Approval Prevention)
 */
export function validateReviewTransition(params: {
  preparedBy: string;
  reviewedBy: string | null;
  targetStatus: ReviewWorkflowStatus;
  reviewComments: string;
}): { valid: boolean; error?: string } {
  const prep = params.preparedBy.trim();
  const rev = (params.reviewedBy ?? '').trim();

  if (
    params.targetStatus === 'Approved' ||
    params.targetStatus === 'Rejected' ||
    params.targetStatus === 'Changes Requested'
  ) {
    if (!rev) {
      return {
        valid: false,
        error: 'A reviewer identity is required to approve, reject, or request changes.',
      };
    }
    if (prep.toLowerCase() === rev.toLowerCase()) {
      return {
        valid: false,
        error:
          'Self-Approval Blocked: The reviewer cannot be the same individual as the workpaper preparer.',
      };
    }
    if (params.reviewComments.trim().length < 5) {
      return {
        valid: false,
        error: 'Reviewer comments (at least 5 characters) are required for review sign-off.',
      };
    }
  }

  return { valid: true };
}

/**
 * Module F — Findings & Remediation Closure Guardrail (Section 12)
 * A finding cannot close solely because the owner marked an action completed.
 * Requires documented remediation evidence AND (Retest Passed OR Approved Alternative Disposition).
 */
export function validateAuditFindingClosure(
  finding: AuditFinding,
  availableEvidenceMap: Map<string, EvidenceRecord>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (finding.remediationStatus === 'Closed') {
    const validEvidence = finding.evidenceIds
      .map((id) => availableEvidenceMap.get(id))
      .filter((ev) => Boolean(ev) && ev!.verificationStatus !== 'Rejected');

    if (validEvidence.length === 0) {
      errors.push(
        'Finding Closure Blocked: Documented remediation evidence must be linked before closing an audit finding.'
      );
    }

    const validRetest =
      finding.retestStatus === 'Retest Passed' ||
      finding.retestStatus === 'Approved Alternative Disposition';

    if (!validRetest) {
      errors.push(
        `Finding Closure Blocked: Finding cannot be closed while retest status is "${finding.retestStatus}". Requires "Retest Passed" or "Approved Alternative Disposition".`
      );
    }

    if (!finding.remediationAction || finding.remediationAction.trim().length < 10) {
      errors.push('Finding Closure Blocked: Documented remediation action is required.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createReviewTransitionRecord(params: {
  existing?: ReviewRecord;
  reviewId: string;
  engagementId: string;
  entityType: ReviewRecord['entityType'];
  entityId: string;
  preparedBy: string;
  reviewedBy: string | null;
  targetStatus: ReviewWorkflowStatus;
  reviewComments: string;
  nowIso?: string;
}): ReviewRecord {
  const check = validateReviewTransition({
    preparedBy: params.preparedBy,
    reviewedBy: params.reviewedBy,
    targetStatus: params.targetStatus,
    reviewComments: params.reviewComments,
  });

  if (!check.valid) {
    throw new Error(check.error);
  }

  const now = params.nowIso ?? new Date().toISOString();
  return {
    reviewId: params.existing?.reviewId ?? params.reviewId,
    engagementId: params.engagementId,
    entityType: params.entityType,
    entityId: params.entityId,
    preparedBy: params.preparedBy.trim(),
    reviewedBy: params.reviewedBy ? params.reviewedBy.trim() : null,
    reviewStatus: params.targetStatus,
    reviewComments: params.reviewComments.trim(),
    reviewedAt:
      params.targetStatus === 'Approved' ||
      params.targetStatus === 'Rejected' ||
      params.targetStatus === 'Changes Requested'
        ? now
        : params.existing?.reviewedAt ?? null,
    approvalTimestamp:
      params.targetStatus === 'Approved' ? now : null,
  };
}
