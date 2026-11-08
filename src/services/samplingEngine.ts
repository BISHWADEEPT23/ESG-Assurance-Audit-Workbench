import {
  PopulationItemRecord,
  SampleItem,
  SamplingMethod,
  SamplingPlan,
} from '../types/domain';

export const SAMPLING_METHODOLOGY_VERSION = 'AUDIT-SAMPLING-ENGINE-v0.2.0';

/**
 * Deterministic Seeded PRNG (Mulberry32)
 * Guarantees bit-for-bit reproducible sample selection for any integer seed.
 */
export function createSeededPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ExecuteSamplingInput {
  samplingPlanId: string;
  procedureId: string;
  populationId: string;
  populationRecords: PopulationItemRecord[];
  samplingMethod: SamplingMethod;
  requestedSampleSize: number;
  randomSeed: number;
  systematicStartPosition?: number;
  orderingRule?: string;
  judgmentalRationale?: string;
  riskCriteria?: string;
  selectionTimestamp?: string;
}

export interface ExecuteSamplingOutput {
  plan: SamplingPlan;
  items: SampleItem[];
  orderingBiasNote?: string;
}

/**
 * Module C — Reproducible Audit Sampling Engine
 * Supports:
 * 1. Simple Random Sampling (without replacement, seeded PRNG, preserves population order)
 * 2. Systematic Sampling (interval calculation, documented start position, duplicate avoidance)
 * 3. Monetary-Unit Sampling (eligible positive book values, cumulative monetary intervals, preserves multiplicity hitCount)
 * 4. Risk-Based Judgmental Selection (non-statistical, requires documented rationale & risk criteria)
 */
export function executeAuditSampling(input: ExecuteSamplingInput): ExecuteSamplingOutput {
  const timestamp = input.selectionTimestamp ?? new Date().toISOString();
  const orderingRule = input.orderingRule?.trim() || 'Canonical Record ID Ascending';

  // Preserve deterministic population ordering before sampling
  const orderedPop = [...input.populationRecords].sort((a, b) =>
    a.recordId.localeCompare(b.recordId)
  );
  const popSize = orderedPop.length;

  if (popSize === 0) {
    throw new Error('Cannot execute sampling on an empty population (populationSize = 0).');
  }

  if (
    !Number.isInteger(input.requestedSampleSize) ||
    input.requestedSampleSize < 1
  ) {
    throw new Error('Requested sample size must be a positive integer (>= 1).');
  }

  const totalPopValue = Number(
    orderedPop.reduce((acc, r) => acc + r.bookValue, 0).toFixed(4)
  );

  // 1. Simple Random Sampling Without Replacement
  if (input.samplingMethod === 'Simple Random Sampling') {
    if (input.requestedSampleSize > popSize) {
      throw new Error(
        `Requested sample size (${input.requestedSampleSize}) cannot exceed population size (${popSize}) for sampling without replacement.`
      );
    }

    const prng = createSeededPrng(input.randomSeed);
    // Partial Fisher-Yates shuffle on index array to sample without replacement
    const indices = orderedPop.map((_, i) => i);
    for (let i = 0; i < input.requestedSampleSize; i++) {
      const j = i + Math.floor(prng() * (popSize - i));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    const chosenIndices = indices.slice(0, input.requestedSampleSize);
    const items: SampleItem[] = chosenIndices.map((popIdx, orderIdx) => {
      const rec = orderedPop[popIdx];
      return {
        sampleItemId: `${input.samplingPlanId}-ITM-${String(orderIdx + 1).padStart(3, '0')}`,
        samplingPlanId: input.samplingPlanId,
        populationRecordId: rec.recordId,
        selectionOrder: orderIdx + 1,
        selectionReason: `Simple Random Sampling (Seed=${input.randomSeed}, Order=${orderingRule})`,
        selectedValue: rec.bookValue,
        hitCount: 1,
        testingStatus: 'Selected - Untested',
        linkedEvidenceIds: [],
      };
    });

    const plan: SamplingPlan = {
      samplingPlanId: input.samplingPlanId,
      procedureId: input.procedureId,
      populationId: input.populationId,
      populationSize: popSize,
      populationValue: totalPopValue,
      samplingMethod: 'Simple Random Sampling',
      samplingParameters: {
        orderingRule,
        populationRecords: orderedPop,
      },
      randomSeed: input.randomSeed,
      requestedSampleSize: input.requestedSampleSize,
      actualSampleSize: items.length,
      isStatistical: true,
      selectionTimestamp: timestamp,
      methodologyVersion: SAMPLING_METHODOLOGY_VERSION,
    };

    return { plan, items };
  }

  // 2. Systematic Sampling
  if (input.samplingMethod === 'Systematic Sampling') {
    if (input.requestedSampleSize > popSize) {
      throw new Error(
        `Requested sample size (${input.requestedSampleSize}) cannot exceed population size (${popSize}) for systematic sampling.`
      );
    }

    const interval = Number((popSize / input.requestedSampleSize).toFixed(6));
    const prng = createSeededPrng(input.randomSeed);
    const rawStart =
      input.systematicStartPosition !== undefined
        ? input.systematicStartPosition
        : Number((prng() * interval).toFixed(4));

    if (rawStart < 0 || rawStart >= interval) {
      throw new Error(
        `Systematic start position (${rawStart}) must lie within [0, ${interval}).`
      );
    }

    const selectedIndexSet = new Set<number>();
    const items: SampleItem[] = [];

    for (let k = 0; k < input.requestedSampleSize; k++) {
      let candidateIdx = Math.floor(rawStart + k * interval) % popSize;
      // Avoid duplicate selection if rounding collides
      while (selectedIndexSet.has(candidateIdx)) {
        candidateIdx = (candidateIdx + 1) % popSize;
      }
      selectedIndexSet.add(candidateIdx);
      const rec = orderedPop[candidateIdx];
      items.push({
        sampleItemId: `${input.samplingPlanId}-ITM-${String(k + 1).padStart(3, '0')}`,
        samplingPlanId: input.samplingPlanId,
        populationRecordId: rec.recordId,
        selectionOrder: k + 1,
        selectionReason: `Systematic Interval=${interval.toFixed(2)}, Start=${rawStart} (Pos=${candidateIdx + 1})`,
        selectedValue: rec.bookValue,
        hitCount: 1,
        testingStatus: 'Selected - Untested',
        linkedEvidenceIds: [],
      });
    }

    const orderingBiasNote =
      'Ordering Bias Disclosure: Systematic sampling assumes the population sorted by ' +
      orderingRule +
      ' does not contain periodic cyclical patterns coinciding with the sampling interval (' +
      interval.toFixed(2) +
      ').';

    const plan: SamplingPlan = {
      samplingPlanId: input.samplingPlanId,
      procedureId: input.procedureId,
      populationId: input.populationId,
      populationSize: popSize,
      populationValue: totalPopValue,
      samplingMethod: 'Systematic Sampling',
      samplingParameters: {
        startPosition: rawStart,
        samplingInterval: interval,
        orderingRule,
        populationRecords: orderedPop,
      },
      randomSeed: input.randomSeed,
      requestedSampleSize: input.requestedSampleSize,
      actualSampleSize: items.length,
      isStatistical: true,
      selectionTimestamp: timestamp,
      methodologyVersion: SAMPLING_METHODOLOGY_VERSION,
    };

    return { plan, items, orderingBiasNote };
  }

  // 3. Monetary-Unit Sampling (Probability-Proportional-to-Size / PPS)
  if (input.samplingMethod === 'Monetary-Unit Sampling') {
    const hasInvalidValues = orderedPop.some((r) => r.bookValue <= 0 || !Number.isFinite(r.bookValue));
    if (hasInvalidValues || totalPopValue <= 0) {
      throw new Error(
        'Monetary-Unit Sampling requires an eligible population of strictly positive monetary/quantitative book values (> 0).'
      );
    }

    const monetaryInterval = Number((totalPopValue / input.requestedSampleSize).toFixed(6));
    const prng = createSeededPrng(input.randomSeed);
    const startPoint =
      input.systematicStartPosition !== undefined
        ? input.systematicStartPosition
        : Number((prng() * monetaryInterval).toFixed(4));

    // Build cumulative monetary bands
    let runningTotal = 0;
    const bands = orderedPop.map((rec) => {
      const low = runningTotal;
      const high = runningTotal + rec.bookValue;
      runningTotal = high;
      return { rec, low, high };
    });

    // Map unique records to preserve multiplicity (hitCount) when a large item is hit multiple times
    const hitsByRecordId = new Map<
      string,
      { rec: PopulationItemRecord; hitCount: number; triggers: number[]; firstOrder: number }
    >();

    for (let k = 0; k < input.requestedSampleSize; k++) {
      const triggerVal = Number((startPoint + k * monetaryInterval).toFixed(4));
      const matchedBand =
        bands.find((b) => triggerVal >= b.low && triggerVal < b.high) ??
        bands[bands.length - 1];

      const existing = hitsByRecordId.get(matchedBand.rec.recordId);
      if (existing) {
        existing.hitCount += 1;
        existing.triggers.push(triggerVal);
      } else {
        hitsByRecordId.set(matchedBand.rec.recordId, {
          rec: matchedBand.rec,
          hitCount: 1,
          triggers: [triggerVal],
          firstOrder: k + 1,
        });
      }
    }

    const items: SampleItem[] = Array.from(hitsByRecordId.values()).map((entry, idx) => ({
      sampleItemId: `${input.samplingPlanId}-ITM-${String(idx + 1).padStart(3, '0')}`,
      samplingPlanId: input.samplingPlanId,
      populationRecordId: entry.rec.recordId,
      selectionOrder: idx + 1,
      selectionReason: `MUS Cumulative Interval=${monetaryInterval.toFixed(2)} (${entry.hitCount} monetary hit(s) at [${entry.triggers.map((t) => t.toFixed(1)).join(', ')}])`,
      selectedValue: entry.rec.bookValue,
      hitCount: entry.hitCount,
      cumulativeTriggers: entry.triggers,
      testingStatus: 'Selected - Untested',
      linkedEvidenceIds: [],
    }));

    const plan: SamplingPlan = {
      samplingPlanId: input.samplingPlanId,
      procedureId: input.procedureId,
      populationId: input.populationId,
      populationSize: popSize,
      populationValue: totalPopValue,
      samplingMethod: 'Monetary-Unit Sampling',
      samplingParameters: {
        startPosition: startPoint,
        monetaryInterval,
        orderingRule,
        populationRecords: orderedPop,
      },
      randomSeed: input.randomSeed,
      requestedSampleSize: input.requestedSampleSize, // Monetary hits requested
      actualSampleSize: items.length, // Unique physical records selected
      isStatistical: true,
      selectionTimestamp: timestamp,
      methodologyVersion: SAMPLING_METHODOLOGY_VERSION,
    };

    return { plan, items };
  }

  // 4. Risk-Based Judgmental Selection (Non-Statistical)
  const rationale = (input.judgmentalRationale ?? '').trim();
  const criteria = (input.riskCriteria ?? '').trim();

  if (rationale.length < 10) {
    throw new Error(
      'Risk-Based Judgmental Selection requires a documented selection rationale (at least 10 characters).'
    );
  }
  if (criteria.length < 5) {
    throw new Error(
      'Risk-Based Judgmental Selection requires documented risk selection criteria.'
    );
  }
  if (input.requestedSampleSize > popSize) {
    throw new Error(
      `Requested judgmental sample size (${input.requestedSampleSize}) cannot exceed population size (${popSize}).`
    );
  }

  // Prioritize riskFlagged records then largest bookValue deterministically
  const prioritized = [...orderedPop].sort((a, b) => {
    if (Boolean(b.riskFlagged) !== Boolean(a.riskFlagged)) {
      return b.riskFlagged ? 1 : -1;
    }
    if (b.bookValue !== a.bookValue) {
      return b.bookValue - a.bookValue;
    }
    return a.recordId.localeCompare(b.recordId);
  });

  const chosen = prioritized.slice(0, input.requestedSampleSize);
  const items: SampleItem[] = chosen.map((rec, idx) => ({
    sampleItemId: `${input.samplingPlanId}-ITM-${String(idx + 1).padStart(3, '0')}`,
    samplingPlanId: input.samplingPlanId,
    populationRecordId: rec.recordId,
    selectionOrder: idx + 1,
    selectionReason: `Non-Statistical Judgmental Selection [Criteria: ${criteria}]`,
    selectedValue: rec.bookValue,
    hitCount: 1,
    testingStatus: 'Selected - Untested',
    linkedEvidenceIds: [],
  }));

  const plan: SamplingPlan = {
    samplingPlanId: input.samplingPlanId,
    procedureId: input.procedureId,
    populationId: input.populationId,
    populationSize: popSize,
    populationValue: totalPopValue,
    samplingMethod: 'Risk-Based Judgmental Selection',
    samplingParameters: {
      orderingRule,
      judgmentalRationale: rationale,
      riskCriteria: criteria,
      populationRecords: orderedPop,
    },
    randomSeed: input.randomSeed,
    requestedSampleSize: input.requestedSampleSize,
    actualSampleSize: items.length,
    isStatistical: false, // Explicitly non-statistical
    selectionTimestamp: timestamp,
    methodologyVersion: SAMPLING_METHODOLOGY_VERSION,
  };

  return { plan, items };
}
