import {
  AuditMaterialityAssessment,
  ESGPillar,
  FinancialMaterialityAssessment,
  ImpactMaterialityAssessment,
  ImpactType,
} from '../types/domain';
import {
  AuditMaterialityInputSchema,
  FinancialMaterialityInputSchema,
  ImpactMaterialityInputSchema,
} from '../validation/schemas';
import { sanitizeDisplayText } from '../utils/security';

export const MATERIALITY_METHODOLOGY_VERSION = 'DOUBLE-AND-AUDIT-MATERIALITY-v0.3.0';

export const MATERIALITY_DISCLAIMER =
  'Analytical Indicator Notice: Financial and Impact Materiality composite indices are internal analytical indicators for scoping assurance readiness. They do not constitute a formal IFRS S1 or ESRS regulatory materiality determination without qualitative management and governance sign-off.';

export type FinancialMaterialityInput = Omit<
  FinancialMaterialityAssessment,
  'financialMaterialityScore' | 'isFinanciallyMaterial' | 'updatedAt'
> & {
  updatedAt?: string;
};

/**
 * Module C Section 5.1 — Financial Materiality Evaluation
 * Computes deterministic financialMaterialityScore = magnitudeScore * likelihoodScore (1..25)
 * and compares against materialityThreshold.
 */
export function evaluateFinancialMateriality(
  input: FinancialMaterialityInput
): FinancialMaterialityAssessment {
  const parsed = FinancialMaterialityInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' · '));
  }

  const financialMaterialityScore = parsed.data.magnitudeScore * parsed.data.likelihoodScore;
  const isFinanciallyMaterial = financialMaterialityScore >= parsed.data.materialityThreshold;

  return {
    assessmentId: input.assessmentId,
    engagementId: parsed.data.engagementId,
    esgTopic: sanitizeDisplayText(parsed.data.esgTopic, 160),
    pillar: parsed.data.pillar,
    timeHorizon: parsed.data.timeHorizon,
    financialEffectType: parsed.data.financialEffectType,
    magnitudeScore: parsed.data.magnitudeScore,
    likelihoodScore: parsed.data.likelihoodScore,
    financialMaterialityScore,
    materialityThreshold: parsed.data.materialityThreshold,
    isFinanciallyMaterial,
    rationale: sanitizeDisplayText(parsed.data.rationale, 1000),
    assessedBy: sanitizeDisplayText(parsed.data.assessedBy, 120),
    reviewedBy: parsed.data.reviewedBy ? sanitizeDisplayText(parsed.data.reviewedBy, 120) : null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export type ImpactMaterialityInput = Omit<
  ImpactMaterialityAssessment,
  'severityScore' | 'impactMaterialityScore' | 'isImpactMaterial' | 'updatedAt'
> & {
  updatedAt?: string;
};

/**
 * Module C Section 5.2 — Impact Materiality Evaluation
 * Keeps Actual and Potential impacts strictly distinguishable:
 * - Severity = (scaleScore + scopeScore + irremediableCharacterScore) / 3 (rounded to 2 decimals)
 * - Actual Impact: likelihoodScore MUST be null; impactMaterialityScore = severityScore
 * - Potential Impact: likelihoodScore is 1..5; impactMaterialityScore = severityScore * (likelihoodScore / 5)
 */
export function evaluateImpactMateriality(
  input: ImpactMaterialityInput
): ImpactMaterialityAssessment {
  const parsed = ImpactMaterialityInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' · '));
  }

  const { scaleScore, scopeScore, irremediableCharacterScore, likelihoodScore, impactType } =
    parsed.data;

  const severityScore = Number(
    ((scaleScore + scopeScore + irremediableCharacterScore) / 3).toFixed(2)
  );

  let impactMaterialityScore = severityScore;
  if (impactType === 'Potential') {
    const lkl = likelihoodScore ?? 3;
    impactMaterialityScore = Number((severityScore * (lkl / 5)).toFixed(2));
  }

  const isImpactMaterial = impactMaterialityScore >= parsed.data.impactThreshold;

  return {
    impactAssessmentId: input.impactAssessmentId,
    engagementId: parsed.data.engagementId,
    esgTopic: sanitizeDisplayText(parsed.data.esgTopic, 160),
    impactType: parsed.data.impactType,
    polarity: parsed.data.polarity,
    scaleScore,
    scopeScore,
    irremediableCharacterScore,
    severityScore,
    likelihoodScore: impactType === 'Actual' ? null : likelihoodScore,
    impactMaterialityScore,
    impactThreshold: parsed.data.impactThreshold,
    isImpactMaterial,
    rationale: sanitizeDisplayText(parsed.data.rationale, 1000),
    assessedBy: sanitizeDisplayText(parsed.data.assessedBy, 120),
    reviewedBy: parsed.data.reviewedBy ? sanitizeDisplayText(parsed.data.reviewedBy, 120) : null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export type AuditMaterialityInput = Omit<AuditMaterialityAssessment, 'updatedAt'> & {
  updatedAt?: string;
};

/**
 * Module C Section 5.3 — Audit Materiality Validation
 * Ensures metric-specific audit materiality thresholds follow Planning >= Performance > Clearly Trivial
 * and remain distinct from topic-level financial/impact materiality.
 */
export function validateAuditMateriality(
  input: AuditMaterialityInput
): AuditMaterialityAssessment {
  const parsed = AuditMaterialityInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(' · '));
  }

  return {
    auditMaterialityId: input.auditMaterialityId,
    engagementId: parsed.data.engagementId,
    metricCode: sanitizeDisplayText(parsed.data.metricCode, 60),
    metricName: sanitizeDisplayText(parsed.data.metricName, 160),
    benchmarkBaseValue: parsed.data.benchmarkBaseValue,
    planningMaterialityPct: parsed.data.planningMaterialityPct,
    planningMaterialityAbsolute: parsed.data.planningMaterialityAbsolute,
    performanceMaterialityPct: parsed.data.performanceMaterialityPct,
    performanceMaterialityAbsolute: parsed.data.performanceMaterialityAbsolute,
    clearlyTrivialThresholdPct: parsed.data.clearlyTrivialThresholdPct,
    clearlyTrivialAbsolute: parsed.data.clearlyTrivialAbsolute,
    unit: sanitizeDisplayText(parsed.data.unit, 40),
    qualitativeFactors: sanitizeDisplayText(parsed.data.qualitativeFactors, 800),
    approvedBy: parsed.data.approvedBy ? sanitizeDisplayText(parsed.data.approvedBy, 120) : null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export type DoubleMaterialityClassification =
  | 'Double Material'
  | 'Financially Material Only'
  | 'Impact Material Only'
  | 'Not Material';

export interface DoubleMaterialityMatrixRow {
  esgTopic: string;
  pillar: ESGPillar;
  engagementId: string;
  financialScore: number | null;
  financialThreshold: number | null;
  isFinanciallyMaterial: boolean;
  impactScore: number | null;
  impactThreshold: number | null;
  impactType: ImpactType | null;
  isImpactMaterial: boolean;
  classification: DoubleMaterialityClassification;
}

export type DoubleMaterialityTopicRow = DoubleMaterialityMatrixRow;

export function buildDoubleMaterialityMatrix(
  financialAssessments: FinancialMaterialityAssessment[],
  impactAssessments: ImpactMaterialityAssessment[],
  engagementId: string
): DoubleMaterialityMatrixRow[] {
  const finByTopic = new Map(
    financialAssessments
      .filter((f) => f.engagementId === engagementId)
      .map((f) => [f.esgTopic.trim().toLowerCase(), f])
  );
  const impByTopic = new Map(
    impactAssessments
      .filter((i) => i.engagementId === engagementId)
      .map((i) => [i.esgTopic.trim().toLowerCase(), i])
  );

  const allTopicKeys = Array.from(new Set([...finByTopic.keys(), ...impByTopic.keys()]));

  return allTopicKeys.map((key) => {
    const fin = finByTopic.get(key);
    const imp = impByTopic.get(key);
    const esgTopic = fin?.esgTopic ?? imp?.esgTopic ?? key;
    const pillar: ESGPillar = fin?.pillar ?? 'Environmental';

    const isFin = fin?.isFinanciallyMaterial ?? false;
    const isImp = imp?.isImpactMaterial ?? false;

    let classification: DoubleMaterialityClassification = 'Not Material';
    if (isFin && isImp) {
      classification = 'Double Material';
    } else if (isFin) {
      classification = 'Financially Material Only';
    } else if (isImp) {
      classification = 'Impact Material Only';
    }

    return {
      esgTopic,
      pillar,
      engagementId,
      financialScore: fin?.financialMaterialityScore ?? null,
      financialThreshold: fin?.materialityThreshold ?? null,
      isFinanciallyMaterial: isFin,
      impactScore: imp?.impactMaterialityScore ?? null,
      impactThreshold: imp?.impactThreshold ?? null,
      impactType: imp?.impactType ?? null,
      isImpactMaterial: isImp,
      classification,
    };
  });
}
