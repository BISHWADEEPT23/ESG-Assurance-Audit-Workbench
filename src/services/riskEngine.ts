import { RiskAssessment, RiskBand, RiskCategory } from '../types/domain';

/**
 * Module B — Deterministic Risk Assessment Engine
 *
 * Illustrative Inherent Risk Scale (1-5 Likelihood x 1-5 Impact = 1-25):
 * - 1 to 5: Low
 * - 6 to 10: Moderate
 * - 11 to 15: High
 * - 16 to 25: Critical
 *
 * Mandatory Guardrail:
 * Do NOT automatically treat an untested control as effective.
 * Residual risk MUST remain unassessed (null / 'Unassessed') until a documented
 * control-effectiveness basis exists.
 */
export function classifyRiskBand(score: number): RiskBand {
  if (score < 1 || score > 25 || !Number.isFinite(score)) {
    throw new Error(`Risk score ${score} is outside the valid 1–25 boundary.`);
  }
  if (score <= 5) return 'Low';
  if (score <= 10) return 'Moderate';
  if (score <= 15) return 'High';
  return 'Critical';
}

export function calculateInherentRisk(
  likelihood: number,
  impact: number
): { inherentRiskScore: number; inherentRiskBand: RiskBand } {
  if (
    !Number.isInteger(likelihood) ||
    likelihood < 1 ||
    likelihood > 5 ||
    !Number.isInteger(impact) ||
    impact < 1 ||
    impact > 5
  ) {
    throw new Error('Likelihood and Impact must be integers on the configurable 1–5 scale.');
  }

  const inherentRiskScore = likelihood * impact;
  const inherentRiskBand = classifyRiskBand(inherentRiskScore);

  return { inherentRiskScore, inherentRiskBand };
}

export interface EvaluateRiskInput {
  riskAssessmentId: string;
  engagementId: string;
  linkedAssertionId: string;
  linkedControlId: string;
  riskCategory: RiskCategory;
  likelihood: number;
  impact: number;
  controlEffectivenessBasis: string | null;
  controlRiskScore: number | null;
  controlIsTestedAndEffective?: boolean;
  assessmentRationale: string;
  evidenceReferences: string[];
  assessedBy: string;
  assessedAt?: string;
}

/**
 * Evaluates inherent and residual risk.
 * If controlEffectivenessBasis is missing/empty OR controlIsTestedAndEffective === false,
 * residualRiskScore remains strictly null and residualRiskBand is 'Unassessed'.
 */
export function evaluateRiskAssessment(input: EvaluateRiskInput): RiskAssessment {
  const { inherentRiskScore, inherentRiskBand } = calculateInherentRisk(
    input.likelihood,
    input.impact
  );

  const basisTrimmed = (input.controlEffectivenessBasis ?? '').trim();
  const hasDocumentedBasis =
    basisTrimmed.length >= 5 && input.controlIsTestedAndEffective !== false;

  let validatedControlRiskScore: number | null = null;
  let residualRiskScore: number | null = null;
  let residualRiskBand: RiskBand | 'Unassessed' = 'Unassessed';

  if (hasDocumentedBasis && input.controlRiskScore !== null) {
    if (
      !Number.isInteger(input.controlRiskScore) ||
      input.controlRiskScore < 1 ||
      input.controlRiskScore > 5
    ) {
      throw new Error('Control risk score must be an integer between 1 and 5.');
    }
    validatedControlRiskScore = input.controlRiskScore;
    // Illustrative residual risk formula: round((InherentRisk * ControlRiskScore) / 5), bounded 1..25
    const computedResidual = Math.max(
      1,
      Math.min(25, Math.round((inherentRiskScore * validatedControlRiskScore) / 5))
    );
    residualRiskScore = computedResidual;
    residualRiskBand = classifyRiskBand(computedResidual);
  }

  return {
    riskAssessmentId: input.riskAssessmentId,
    engagementId: input.engagementId,
    linkedAssertionId: input.linkedAssertionId,
    linkedControlId: input.linkedControlId,
    riskCategory: input.riskCategory,
    likelihood: input.likelihood,
    impact: input.impact,
    inherentRiskScore,
    inherentRiskBand,
    controlEffectivenessBasis: hasDocumentedBasis ? basisTrimmed : null,
    controlRiskScore: validatedControlRiskScore,
    residualRiskScore,
    residualRiskBand,
    assessmentRationale: input.assessmentRationale.trim(),
    evidenceReferences: input.evidenceReferences,
    assessedBy: input.assessedBy.trim(),
    assessedAt: input.assessedAt ?? new Date().toISOString(),
  };
}
