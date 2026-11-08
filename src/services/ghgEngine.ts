import {
  EmissionActivityRecord,
  EmissionFactorRecord,
  GHGRecalculationResult,
  VarianceToleranceStatus,
} from '../types/domain';

export const GHG_METHODOLOGY_VERSION = 'ISO14064-3-GHG-SHADOW-ENGINE-v0.2.0';

export interface VarianceThresholdConfig {
  withinToleranceMaxPct: number; // default 1.0%
  reviewRequiredMaxPct: number; // default 5.0%
  zeroReportedAbsoluteToleranceTco2e: number; // default 0.05 tCO2e
}

export const DEFAULT_VARIANCE_THRESHOLDS: VarianceThresholdConfig = {
  withinToleranceMaxPct: 1.0,
  reviewRequiredMaxPct: 5.0,
  zeroReportedAbsoluteToleranceTco2e: 0.05,
};

/**
 * Decimal-safe rounding helper to prevent IEEE-754 floating-point drift.
 */
export function roundDecimal(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Compatible physical unit conversion table within identical physical dimensions.
 * Never converts across incompatible physical dimensions (e.g., Volume to Energy, Mass to Currency).
 */
const COMPATIBLE_UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  m3: { m3: 1 },
  Liters: { Liters: 1, m3: 0.001 },
  MWh: { MWh: 1, kWh: 1000 },
  kWh: { kWh: 1, MWh: 0.001 },
  kg: { kg: 1, 'Metric Tons': 0.001 },
  'Metric Tons': { 'Metric Tons': 1, kg: 1000 },
  'tonne-km': { 'tonne-km': 1 },
  'passenger-km': { 'passenger-km': 1 },
  EUR: { EUR: 1, USD: 1 }, // Currency handled via explicit currencyConversionRate
  USD: { USD: 1, EUR: 1 },
};

export interface ExecuteRecalculationInput {
  recalculationId: string;
  activity: EmissionActivityRecord;
  factor: EmissionFactorRecord;
  thresholds?: VarianceThresholdConfig;
  allowCrossYearOverride?: boolean;
  calculationTimestamp?: string;
}

/**
 * Module E — Deterministic GHG Shadow-Recalculation Engine
 * Aligned with GHG Protocol Corporate Standard, Scope 2 Guidance, Scope 3 Standard, and ISO 14064-3.
 */
export function executeGhgShadowRecalculation(
  input: ExecuteRecalculationInput
): GHGRecalculationResult {
  const { activity, factor } = input;
  const thresholds = input.thresholds ?? DEFAULT_VARIANCE_THRESHOLDS;
  const timestamp = input.calculationTimestamp ?? new Date().toISOString();
  const flags: string[] = [];

  // 1. Validate activity availability
  if (activity.valueStatus === 'Unavailable' || activity.activityQuantity === null) {
    throw new Error(
      `Activity ${activity.activityId} has unavailable activity quantity (null); recalculation cannot proceed.`
    );
  }

  // 2. Validate applicable year match (never silently substitute factors from another year)
  if (activity.reportingYear !== factor.applicableYear && !input.allowCrossYearOverride) {
    throw new Error(
      `Emission Factor Year Mismatch: Activity period (${activity.reportingYear}) does not match factor applicable year (${factor.applicableYear}). Silent cross-year substitution is prohibited.`
    );
  }

  // 3. Scope 2 Market-Based Contractual Instrument Eligibility & Factor Availability Guardrails
  if (activity.scope === 'Scope 2 Market-Based') {
    if (activity.contractualInstrumentStatus === 'Factor Unavailable') {
      flags.push(
        'Market-Based Limitation: Supplier-specific or residual-mix emission factor is unavailable. Zero or invented factor substitution is prohibited.'
      );
      return {
        recalculationId: input.recalculationId,
        activityId: activity.activityId,
        emissionFactorId: factor.emissionFactorId,
        normalizedActivity: activity.activityQuantity,
        rawGasEmissionsKg: 0,
        gwpApplied: factor.gwpValue,
        gwpBasis: factor.gwpBasis,
        calculatedEmissions: 0,
        reportedEmissions: activity.reportedEmissions,
        absoluteVariance: roundDecimal(0 - activity.reportedEmissions, 4),
        percentageVariance:
          activity.reportedEmissions === 0
            ? null
            : roundDecimal(((0 - activity.reportedEmissions) / Math.abs(activity.reportedEmissions)) * 100, 2),
        varianceStatus: 'Blocked / Flagged Limitation',
        diagnosticFlags: flags,
        calculationTimestamp: timestamp,
        methodologyVersion: GHG_METHODOLOGY_VERSION,
      };
    }

    if (
      activity.contractualInstrumentStatus === 'Instrument Ineligible / Unverified' &&
      factor.factorValue === 0
    ) {
      throw new Error(
        'Scope 2 Market-Based Guardrail: Cannot apply a zero emission factor (0 tCO2e/MWh) when contractual renewable instrument is marked Ineligible / Unverified. Apply residual mix factor instead.'
      );
    }
  }

  // 4. Dimensional Consistency & Unit Conversion Check
  let normalizedActivity = activity.activityQuantity;

  if (activity.activityType === 'Spend-Based Economic') {
    // Spend-based Scope 3 pathway requires explicit currency and base-year documentation
    if (!activity.spendCurrency || !factor.factorCurrency) {
      throw new Error(
        'Spend-based Scope 3 calculation requires explicit spendCurrency and factorCurrency.'
      );
    }
    if (!factor.factorBaseYear) {
      throw new Error(
        'Spend-based Scope 3 calculation requires a documented factorBaseYear.'
      );
    }
    if (activity.spendCurrency !== factor.factorCurrency) {
      if (!activity.currencyConversionRate || activity.currencyConversionRate <= 0) {
        throw new Error(
          `Currency mismatch (${activity.spendCurrency} vs ${factor.factorCurrency}) requires a documented positive currencyConversionRate.`
        );
      }
      normalizedActivity = roundDecimal(
        normalizedActivity * activity.currencyConversionRate,
        6
      );
      flags.push(
        `Applied documented currency conversion (${activity.spendCurrency} -> ${factor.factorCurrency} @ ${activity.currencyConversionRate}).`
      );
    }
    if (activity.priceYearDeflator && activity.priceYearDeflator !== 1) {
      normalizedActivity = roundDecimal(
        normalizedActivity * activity.priceYearDeflator,
        6
      );
      flags.push(
        `Applied price-year inflation deflator (${activity.priceYearDeflator}) to base year ${factor.factorBaseYear}.`
      );
    }
  } else {
    // Physical activity unit check
    const conversionGroup = COMPATIBLE_UNIT_CONVERSIONS[activity.activityUnit];
    const multiplier = conversionGroup?.[factor.denominatorUnit];
    if (multiplier === undefined) {
      throw new Error(
        `Unit Incompatibility Error: Cannot multiply activity unit "${activity.activityUnit}" with emission factor denominator unit "${factor.denominatorUnit}".`
      );
    }
    normalizedActivity = roundDecimal(activity.activityQuantity * multiplier, 6);
  }

  // 5. Calculate Gas-Specific Emissions first, then convert to tCO2e using documented GWP
  let rawGasEmissionsKg = 0;
  let calculatedEmissionsTco2e = 0;

  if (factor.numeratorUnit === 'tCO2e') {
    rawGasEmissionsKg = roundDecimal(normalizedActivity * factor.factorValue * 1000, 4);
    calculatedEmissionsTco2e = roundDecimal(
      normalizedActivity * factor.factorValue * factor.gwpValue,
      4
    );
  } else if (factor.numeratorUnit === 'kgCO2e') {
    rawGasEmissionsKg = roundDecimal(normalizedActivity * factor.factorValue, 4);
    calculatedEmissionsTco2e = roundDecimal(
      (rawGasEmissionsKg * factor.gwpValue) / 1000,
      4
    );
  } else {
    // Individual gas factor (kgCO2, kgCH4, kgN2O, kgHFC-134a, kgSF6)
    rawGasEmissionsKg = roundDecimal(normalizedActivity * factor.factorValue, 4);
    calculatedEmissionsTco2e = roundDecimal(
      (rawGasEmissionsKg * factor.gwpValue) / 1000,
      4
    );
    flags.push(
      `Gas-specific calculation (${factor.gas}): ${rawGasEmissionsKg} kg ${factor.gas} × GWP ${factor.gwpValue} (${factor.gwpBasis}) = ${calculatedEmissionsTco2e} tCO2e.`
    );
  }

  // 6. Reconciliation & Variance Calculation (Section 11)
  const reported = activity.reportedEmissions;
  const absoluteVariance = roundDecimal(calculatedEmissionsTco2e - reported, 4);

  // Zero-denominator guardrail: percentageVariance MUST be null when reportedEmissions === 0
  const percentageVariance: number | null =
    reported === 0
      ? null
      : roundDecimal((absoluteVariance / Math.abs(reported)) * 100, 2);

  let varianceStatus: VarianceToleranceStatus = 'Within Tolerance';
  if (percentageVariance === null) {
    varianceStatus =
      Math.abs(absoluteVariance) <= thresholds.zeroReportedAbsoluteToleranceTco2e
        ? 'Within Tolerance'
        : 'Material Variance Candidate';
    flags.push(
      'Zero reported emissions denominator: Percentage variance is undefined (null); evaluated using absolute variance threshold.'
    );
  } else {
    const absPct = Math.abs(percentageVariance);
    if (absPct <= thresholds.withinToleranceMaxPct) {
      varianceStatus = 'Within Tolerance';
    } else if (absPct <= thresholds.reviewRequiredMaxPct) {
      varianceStatus = 'Review Required';
    } else {
      varianceStatus = 'Material Variance Candidate';
    }
  }

  return {
    recalculationId: input.recalculationId,
    activityId: activity.activityId,
    emissionFactorId: factor.emissionFactorId,
    normalizedActivity,
    rawGasEmissionsKg,
    gwpApplied: factor.gwpValue,
    gwpBasis: factor.gwpBasis,
    calculatedEmissions: calculatedEmissionsTco2e,
    reportedEmissions: reported,
    absoluteVariance,
    percentageVariance,
    varianceStatus,
    diagnosticFlags: flags,
    calculationTimestamp: timestamp,
    methodologyVersion: GHG_METHODOLOGY_VERSION,
  };
}

export interface GHGScopeSummary {
  scope1TotalReported: number;
  scope1TotalRecalculated: number;
  scope2LocationReported: number;
  scope2LocationRecalculated: number;
  scope2MarketReported: number;
  scope2MarketRecalculated: number;
  scope3TotalReported: number;
  scope3TotalRecalculated: number;
  scope3ByCategory: Record<string, { reported: number; recalculated: number }>;
  mixedGwpWarning: string | null;
}

/**
 * Maintains strictly separate Scope 2 Location-Based and Market-Based totals,
 * aggregates Scope 1 and Scope 3 (by category), and flags mixed GWP assessment bases.
 */
export function summarizeGhgInventory(
  activities: EmissionActivityRecord[],
  recalculations: GHGRecalculationResult[]
): GHGScopeSummary {
  const recalcByActivityId = new Map(recalculations.map((r) => [r.activityId, r]));

  let scope1TotalReported = 0;
  let scope1TotalRecalculated = 0;
  let scope2LocationReported = 0;
  let scope2LocationRecalculated = 0;
  let scope2MarketReported = 0;
  let scope2MarketRecalculated = 0;
  let scope3TotalReported = 0;
  let scope3TotalRecalculated = 0;
  const scope3ByCategory: Record<string, { reported: number; recalculated: number }> = {};

  const gwpBasesUsed = new Set<string>();

  for (const act of activities) {
    const rec = recalcByActivityId.get(act.activityId);
    const calcVal = rec ? rec.calculatedEmissions : 0;
    if (rec) {
      gwpBasesUsed.add(rec.gwpBasis);
    }

    if (act.scope === 'Scope 1') {
      scope1TotalReported = roundDecimal(scope1TotalReported + act.reportedEmissions, 4);
      scope1TotalRecalculated = roundDecimal(scope1TotalRecalculated + calcVal, 4);
    } else if (act.scope === 'Scope 2 Location-Based') {
      scope2LocationReported = roundDecimal(scope2LocationReported + act.reportedEmissions, 4);
      scope2LocationRecalculated = roundDecimal(scope2LocationRecalculated + calcVal, 4);
    } else if (act.scope === 'Scope 2 Market-Based') {
      scope2MarketReported = roundDecimal(scope2MarketReported + act.reportedEmissions, 4);
      scope2MarketRecalculated = roundDecimal(scope2MarketRecalculated + calcVal, 4);
    } else if (act.scope === 'Scope 3') {
      scope3TotalReported = roundDecimal(scope3TotalReported + act.reportedEmissions, 4);
      scope3TotalRecalculated = roundDecimal(scope3TotalRecalculated + calcVal, 4);
      const catKey = act.scope3Category ?? 'Uncategorized Scope 3';
      const current = scope3ByCategory[catKey] ?? { reported: 0, recalculated: 0 };
      scope3ByCategory[catKey] = {
        reported: roundDecimal(current.reported + act.reportedEmissions, 4),
        recalculated: roundDecimal(current.recalculated + calcVal, 4),
      };
    }
  }

  const mixedGwpWarning =
    gwpBasesUsed.size > 1
      ? `Disclosure Warning: Multiple IPCC GWP assessment bases detected across recalculations (${Array.from(gwpBasesUsed).join(' and ')}). Disclose mixed GWP bases in assurance readiness notes.`
      : null;

  return {
    scope1TotalReported,
    scope1TotalRecalculated,
    scope2LocationReported,
    scope2LocationRecalculated,
    scope2MarketReported,
    scope2MarketRecalculated,
    scope3TotalReported,
    scope3TotalRecalculated,
    scope3ByCategory,
    mixedGwpWarning,
  };
}
