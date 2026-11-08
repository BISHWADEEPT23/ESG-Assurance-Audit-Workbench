import {
  AiAuditRequest,
  AiAuditResponse,
  AssuranceEngagement,
  AssuranceReport,
  AuditEvent,
  AuditFinding,
  AuditMaterialityAssessment,
  AuditPlan,
  AuditProcedure,
  BackupManifest,
  DesignTest,
  DisclosureFramework,
  DisclosureMapping,
  DisclosureRequirement,
  EmissionActivityRecord,
  EmissionFactorRecord,
  ESGAssertion,
  EvidenceFileBlob,
  EvidenceRecord,
  Facility,
  FinancialMaterialityAssessment,
  FrozenReportSnapshot,
  GHGRecalculationResult,
  ImpactMaterialityAssessment,
  InternalControl,
  OperatingTest,
  Organization,
  ReviewRecord,
  RiskAssessment,
  SampleItem,
  SamplingPlan,
  ValidationFinding,
} from '../types/domain';
import { generateSyntheticDataset, SyntheticDataset } from '../seed/syntheticDataset';
import { generatePhase2SyntheticDataset, Phase2SyntheticDataset } from '../seed/phase2Seed';
import { generatePhase3SyntheticDataset, Phase3SyntheticDataset } from '../seed/phase3Seed';
import { stripUndefined, validateFileMagicBytes } from '../utils/security';
import { runDeterministicValidation } from '../validation/dqEngine';

export const DB_NAME = 'ESGAssuranceWorkbenchDB';
export const DB_VERSION = 4; // Upgraded from v3 to v4 with non-destructive schema migration (33 total stores)

export const STORES = {
  // Phase 1 Stores (10)
  ORGANIZATIONS: 'organizations',
  FACILITIES: 'facilities',
  ENGAGEMENTS: 'engagements',
  ASSERTIONS: 'assertions',
  CONTROLS: 'controls',
  EVIDENCE: 'evidence',
  EVIDENCE_BLOBS: 'evidenceBlobs',
  FINDINGS: 'findings',
  AUDIT_EVENTS: 'auditEvents',
  PREFERENCES: 'preferences',
  // Phase 2 Stores (12)
  AUDIT_PLANS: 'auditPlans',
  AUDIT_PROCEDURES: 'auditProcedures',
  RISK_ASSESSMENTS: 'riskAssessments',
  SAMPLING_PLANS: 'samplingPlans',
  SAMPLE_ITEMS: 'sampleItems',
  DESIGN_TESTS: 'designTests',
  OPERATING_TESTS: 'operatingTests',
  EMISSION_ACTIVITIES: 'emissionActivities',
  EMISSION_FACTORS: 'emissionFactors',
  GHG_RECALCULATIONS: 'ghgRecalculations',
  AUDIT_FINDINGS: 'auditFindings',
  REVIEWS: 'reviews',
  // Phase 3 Stores (8)
  DISCLOSURE_FRAMEWORKS: 'disclosureFrameworks',
  DISCLOSURE_REQUIREMENTS: 'disclosureRequirements',
  DISCLOSURE_MAPPINGS: 'disclosureMappings',
  FINANCIAL_MATERIALITY: 'financialMateriality',
  IMPACT_MATERIALITY: 'impactMateriality',
  AUDIT_MATERIALITY: 'auditMateriality',
  ASSURANCE_REPORTS: 'assuranceReports',
  REPORT_SNAPSHOTS: 'reportSnapshots',
  // Phase 4 Stores (3) -> 33 Total Object Stores
  AI_AUDIT_REQUESTS: 'aiAuditRequests',
  AI_AUDIT_RESPONSES: 'aiAuditResponses',
  BACKUP_MANIFESTS: 'backupManifests',
} as const;

export interface Phase4DatasetSlice {
  aiAuditRequests: AiAuditRequest[];
  aiAuditResponses: AiAuditResponse[];
  backupManifests: BackupManifest[];
}

export type FullWorkbenchDataset = SyntheticDataset &
  Phase2SyntheticDataset &
  Phase3SyntheticDataset &
  Phase4DatasetSlice;

let cachedDbPromise: Promise<IDBDatabase> | null = null;

export function resetDbConnectionCache(): void {
  cachedDbPromise = null;
}

export const STORE_KEY_PATHS: Array<{ name: string; keyPath: string }> = [
  // Phase 1 (10)
  { name: STORES.ORGANIZATIONS, keyPath: 'organizationId' },
  { name: STORES.FACILITIES, keyPath: 'facilityId' },
  { name: STORES.ENGAGEMENTS, keyPath: 'engagementId' },
  { name: STORES.ASSERTIONS, keyPath: 'assertionId' },
  { name: STORES.CONTROLS, keyPath: 'controlId' },
  { name: STORES.EVIDENCE, keyPath: 'evidenceId' },
  { name: STORES.EVIDENCE_BLOBS, keyPath: 'evidenceId' },
  { name: STORES.FINDINGS, keyPath: 'findingId' },
  { name: STORES.AUDIT_EVENTS, keyPath: 'eventId' },
  { name: STORES.PREFERENCES, keyPath: 'key' },
  // Phase 2 (12)
  { name: STORES.AUDIT_PLANS, keyPath: 'auditPlanId' },
  { name: STORES.AUDIT_PROCEDURES, keyPath: 'procedureId' },
  { name: STORES.RISK_ASSESSMENTS, keyPath: 'riskAssessmentId' },
  { name: STORES.SAMPLING_PLANS, keyPath: 'samplingPlanId' },
  { name: STORES.SAMPLE_ITEMS, keyPath: 'sampleItemId' },
  { name: STORES.DESIGN_TESTS, keyPath: 'designTestId' },
  { name: STORES.OPERATING_TESTS, keyPath: 'operatingTestId' },
  { name: STORES.EMISSION_ACTIVITIES, keyPath: 'activityId' },
  { name: STORES.EMISSION_FACTORS, keyPath: 'emissionFactorId' },
  { name: STORES.GHG_RECALCULATIONS, keyPath: 'recalculationId' },
  { name: STORES.AUDIT_FINDINGS, keyPath: 'auditFindingId' },
  { name: STORES.REVIEWS, keyPath: 'reviewId' },
  // Phase 3 (8)
  { name: STORES.DISCLOSURE_FRAMEWORKS, keyPath: 'frameworkId' },
  { name: STORES.DISCLOSURE_REQUIREMENTS, keyPath: 'requirementId' },
  { name: STORES.DISCLOSURE_MAPPINGS, keyPath: 'mappingId' },
  { name: STORES.FINANCIAL_MATERIALITY, keyPath: 'assessmentId' },
  { name: STORES.IMPACT_MATERIALITY, keyPath: 'impactAssessmentId' },
  { name: STORES.AUDIT_MATERIALITY, keyPath: 'auditMaterialityId' },
  { name: STORES.ASSURANCE_REPORTS, keyPath: 'reportId' },
  { name: STORES.REPORT_SNAPSHOTS, keyPath: 'snapshotId' },
  // Phase 4 (3) -> 33 Total Stores
  { name: STORES.AI_AUDIT_REQUESTS, keyPath: 'requestId' },
  { name: STORES.AI_AUDIT_RESPONSES, keyPath: 'responseId' },
  { name: STORES.BACKUP_MANIFESTS, keyPath: 'manifestId' },
];

/**
 * Opens ESGAssuranceWorkbenchDB at version 4 (33 object stores).
 * Non-destructively creates any missing Phase 1, Phase 2, Phase 3, or Phase 4 object stores during upgrade
 * from v1 -> v4, v2 -> v4, or v3 -> v4, preserving all existing user records intact.
 */
export function openWorkbenchDb(): Promise<IDBDatabase> {
  if (cachedDbPromise) {
    return cachedDbPromise;
  }

  cachedDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this runtime environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const spec of STORE_KEY_PATHS) {
        if (!db.objectStoreNames.contains(spec.name)) {
          db.createObjectStore(spec.name, { keyPath: spec.keyPath });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      cachedDbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };
  });

  return cachedDbPromise;
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error(`Failed reading store ${storeName}`));
  });
}

function getOneFromStore<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error ?? new Error(`Failed reading key ${key} in ${storeName}`));
  });
}

const PRE_RESET_BACKUP_KEY = 'last_pre_reset_backup_snapshot';

/**
 * Automatic backup snapshot before any destructive reset operation (Section 9).
 */
export async function createPreResetBackupSnapshot(db: IDBDatabase): Promise<void> {
  try {
    const [orgs, assertions, controls, plans, reports] = await Promise.all([
      getAllFromStore<Organization>(db, STORES.ORGANIZATIONS),
      getAllFromStore<ESGAssertion>(db, STORES.ASSERTIONS),
      getAllFromStore<InternalControl>(db, STORES.CONTROLS),
      getAllFromStore<AuditPlan>(db, STORES.AUDIT_PLANS),
      getAllFromStore<AssuranceReport>(db, STORES.ASSURANCE_REPORTS),
    ]);
    if (orgs.length === 0) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.PREFERENCES, 'readwrite');
      tx.objectStore(STORES.PREFERENCES).put({
        key: PRE_RESET_BACKUP_KEY,
        value: {
          backedUpAt: new Date().toISOString(),
          organizationId: orgs[0]?.organizationId,
          assertionCount: assertions.length,
          controlCount: controls.length,
          auditPlanCount: plans.length,
          assuranceReportCount: reports.length,
        },
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-blocking backup helper
  }
}

/**
 * Initializes or loads Phase 1, Phase 2, and Phase 3 datasets.
 * If migrating from a v1 or v2 database where Phase 1/2 records exist,
 * seeds ONLY the missing stores without touching or overwriting existing user data.
 */
export async function initializeOrLoadDataset(forceReset = false): Promise<FullWorkbenchDataset> {
  const db = await openWorkbenchDb();
  const existingOrgs = await getAllFromStore<Organization>(db, STORES.ORGANIZATIONS);

  if (existingOrgs.length > 0 && !forceReset) {
    // Check if Phase 2 stores need initial hydration after a v1 -> v3 upgrade
    const existingPlans = await getAllFromStore<AuditPlan>(db, STORES.AUDIT_PLANS);
    if (existingPlans.length === 0) {
      const p2Seed = generatePhase2SyntheticDataset();
      await populatePhase2StoresOnly(db, p2Seed);
    }

    // Check if Phase 3 stores need initial hydration after a v2 -> v3 upgrade
    const existingFrameworks = await getAllFromStore<DisclosureFramework>(
      db,
      STORES.DISCLOSURE_FRAMEWORKS
    );
    if (existingFrameworks.length === 0) {
      const p1Seed = generateSyntheticDataset();
      const p2Seed = generatePhase2SyntheticDataset();
      const p3Seed = generatePhase3SyntheticDataset(p1Seed, p2Seed);
      await populatePhase3StoresOnly(db, p3Seed);
    }

    const [
      facilities,
      engagements,
      assertions,
      controls,
      evidence,
      findings,
      auditEvents,
      auditPlans,
      auditProcedures,
      riskAssessments,
      samplingPlans,
      sampleItems,
      designTests,
      operatingTests,
      emissionActivities,
      emissionFactors,
      ghgRecalculations,
      auditFindings,
      reviews,
      disclosureFrameworks,
      disclosureRequirements,
      disclosureMappings,
      financialMateriality,
      impactMateriality,
      auditMateriality,
      assuranceReports,
      reportSnapshots,
      aiAuditRequests,
      aiAuditResponses,
      backupManifests,
    ] = await Promise.all([
      getAllFromStore<Facility>(db, STORES.FACILITIES),
      getAllFromStore<AssuranceEngagement>(db, STORES.ENGAGEMENTS),
      getAllFromStore<ESGAssertion>(db, STORES.ASSERTIONS),
      getAllFromStore<InternalControl>(db, STORES.CONTROLS),
      getAllFromStore<EvidenceRecord>(db, STORES.EVIDENCE),
      getAllFromStore<ValidationFinding>(db, STORES.FINDINGS),
      getAllFromStore<AuditEvent>(db, STORES.AUDIT_EVENTS),
      getAllFromStore<AuditPlan>(db, STORES.AUDIT_PLANS),
      getAllFromStore<AuditProcedure>(db, STORES.AUDIT_PROCEDURES),
      getAllFromStore<RiskAssessment>(db, STORES.RISK_ASSESSMENTS),
      getAllFromStore<SamplingPlan>(db, STORES.SAMPLING_PLANS),
      getAllFromStore<SampleItem>(db, STORES.SAMPLE_ITEMS),
      getAllFromStore<DesignTest>(db, STORES.DESIGN_TESTS),
      getAllFromStore<OperatingTest>(db, STORES.OPERATING_TESTS),
      getAllFromStore<EmissionActivityRecord>(db, STORES.EMISSION_ACTIVITIES),
      getAllFromStore<EmissionFactorRecord>(db, STORES.EMISSION_FACTORS),
      getAllFromStore<GHGRecalculationResult>(db, STORES.GHG_RECALCULATIONS),
      getAllFromStore<AuditFinding>(db, STORES.AUDIT_FINDINGS),
      getAllFromStore<ReviewRecord>(db, STORES.REVIEWS),
      getAllFromStore<DisclosureFramework>(db, STORES.DISCLOSURE_FRAMEWORKS),
      getAllFromStore<DisclosureRequirement>(db, STORES.DISCLOSURE_REQUIREMENTS),
      getAllFromStore<DisclosureMapping>(db, STORES.DISCLOSURE_MAPPINGS),
      getAllFromStore<FinancialMaterialityAssessment>(db, STORES.FINANCIAL_MATERIALITY),
      getAllFromStore<ImpactMaterialityAssessment>(db, STORES.IMPACT_MATERIALITY),
      getAllFromStore<AuditMaterialityAssessment>(db, STORES.AUDIT_MATERIALITY),
      getAllFromStore<AssuranceReport>(db, STORES.ASSURANCE_REPORTS),
      getAllFromStore<FrozenReportSnapshot>(db, STORES.REPORT_SNAPSHOTS),
      getAllFromStore<AiAuditRequest>(db, STORES.AI_AUDIT_REQUESTS),
      getAllFromStore<AiAuditResponse>(db, STORES.AI_AUDIT_RESPONSES),
      getAllFromStore<BackupManifest>(db, STORES.BACKUP_MANIFESTS),
    ]);

    return {
      organization: existingOrgs[0],
      facilities: facilities.sort((a, b) => a.facilityId.localeCompare(b.facilityId)),
      engagements: engagements.sort((a, b) => a.engagementId.localeCompare(b.engagementId)),
      assertions: assertions.sort((a, b) => a.assertionId.localeCompare(b.assertionId)),
      controls: controls.sort((a, b) => a.controlId.localeCompare(b.controlId)),
      evidence: evidence.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
      findings: findings.sort((a, b) => a.findingId.localeCompare(b.findingId)),
      auditEvents: auditEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      auditPlans: auditPlans.sort((a, b) => a.auditPlanId.localeCompare(b.auditPlanId)),
      auditProcedures: auditProcedures.sort((a, b) => a.procedureId.localeCompare(b.procedureId)),
      riskAssessments: riskAssessments.sort((a, b) =>
        a.riskAssessmentId.localeCompare(b.riskAssessmentId)
      ),
      samplingPlans: samplingPlans.sort((a, b) =>
        a.samplingPlanId.localeCompare(b.samplingPlanId)
      ),
      sampleItems: sampleItems.sort((a, b) => a.sampleItemId.localeCompare(b.sampleItemId)),
      designTests: designTests.sort((a, b) => a.designTestId.localeCompare(b.designTestId)),
      operatingTests: operatingTests.sort((a, b) =>
        a.operatingTestId.localeCompare(b.operatingTestId)
      ),
      emissionActivities: emissionActivities.sort((a, b) =>
        a.activityId.localeCompare(b.activityId)
      ),
      emissionFactors: emissionFactors.sort((a, b) =>
        a.emissionFactorId.localeCompare(b.emissionFactorId)
      ),
      ghgRecalculations: ghgRecalculations.sort((a, b) =>
        a.recalculationId.localeCompare(b.recalculationId)
      ),
      auditFindings: auditFindings.sort((a, b) =>
        a.auditFindingId.localeCompare(b.auditFindingId)
      ),
      reviews: reviews.sort((a, b) => a.reviewId.localeCompare(b.reviewId)),
      disclosureFrameworks: disclosureFrameworks.sort((a, b) =>
        a.frameworkId.localeCompare(b.frameworkId)
      ),
      disclosureRequirements: disclosureRequirements.sort((a, b) =>
        a.requirementId.localeCompare(b.requirementId)
      ),
      disclosureMappings: disclosureMappings.sort((a, b) =>
        a.mappingId.localeCompare(b.mappingId)
      ),
      financialMateriality: financialMateriality.sort((a, b) =>
        a.assessmentId.localeCompare(b.assessmentId)
      ),
      impactMateriality: impactMateriality.sort((a, b) =>
        a.impactAssessmentId.localeCompare(b.impactAssessmentId)
      ),
      auditMateriality: auditMateriality.sort((a, b) =>
        a.auditMaterialityId.localeCompare(b.auditMaterialityId)
      ),
      assuranceReports: assuranceReports.sort((a, b) =>
        b.generatedAt.localeCompare(a.generatedAt)
      ),
      reportSnapshots: reportSnapshots.sort((a, b) =>
        b.generatedAt.localeCompare(a.generatedAt)
      ),
      aiAuditRequests: aiAuditRequests.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
      aiAuditResponses: aiAuditResponses.sort((a, b) =>
        b.generatedAt.localeCompare(a.generatedAt)
      ),
      backupManifests: backupManifests.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    };
  }

  if (forceReset) {
    await createPreResetBackupSnapshot(db);
  }

  const p1Seed = generateSyntheticDataset();
  const p2Seed = generatePhase2SyntheticDataset();
  const p3Seed = generatePhase3SyntheticDataset(p1Seed, p2Seed);

  await new Promise<void>((resolve, reject) => {
    const allStores = STORE_KEY_PATHS.map((s) => s.name).filter(
      (n) => n !== STORES.PREFERENCES
    );
    const tx = db.transaction(allStores, 'readwrite');

    for (const name of allStores) {
      tx.objectStore(name).clear();
    }

    // Phase 1
    tx.objectStore(STORES.ORGANIZATIONS).put(stripUndefined(p1Seed.organization));
    for (const f of p1Seed.facilities) tx.objectStore(STORES.FACILITIES).put(stripUndefined(f));
    for (const e of p1Seed.engagements) tx.objectStore(STORES.ENGAGEMENTS).put(stripUndefined(e));
    for (const a of p1Seed.assertions) tx.objectStore(STORES.ASSERTIONS).put(stripUndefined(a));
    for (const c of p1Seed.controls) tx.objectStore(STORES.CONTROLS).put(stripUndefined(c));
    for (const ev of p1Seed.evidence) tx.objectStore(STORES.EVIDENCE).put(stripUndefined(ev));
    for (const fnd of p1Seed.findings) tx.objectStore(STORES.FINDINGS).put(stripUndefined(fnd));
    for (const evt of p1Seed.auditEvents) {
      tx.objectStore(STORES.AUDIT_EVENTS).put(stripUndefined(evt));
    }

    // Phase 2
    for (const p of p2Seed.auditPlans) tx.objectStore(STORES.AUDIT_PLANS).put(stripUndefined(p));
    for (const pr of p2Seed.auditProcedures) {
      tx.objectStore(STORES.AUDIT_PROCEDURES).put(stripUndefined(pr));
    }
    for (const r of p2Seed.riskAssessments) {
      tx.objectStore(STORES.RISK_ASSESSMENTS).put(stripUndefined(r));
    }
    for (const sp of p2Seed.samplingPlans) {
      tx.objectStore(STORES.SAMPLING_PLANS).put(stripUndefined(sp));
    }
    for (const si of p2Seed.sampleItems) {
      tx.objectStore(STORES.SAMPLE_ITEMS).put(stripUndefined(si));
    }
    for (const dt of p2Seed.designTests) {
      tx.objectStore(STORES.DESIGN_TESTS).put(stripUndefined(dt));
    }
    for (const ot of p2Seed.operatingTests) {
      tx.objectStore(STORES.OPERATING_TESTS).put(stripUndefined(ot));
    }
    for (const act of p2Seed.emissionActivities) {
      tx.objectStore(STORES.EMISSION_ACTIVITIES).put(stripUndefined(act));
    }
    for (const ef of p2Seed.emissionFactors) {
      tx.objectStore(STORES.EMISSION_FACTORS).put(stripUndefined(ef));
    }
    for (const rec of p2Seed.ghgRecalculations) {
      tx.objectStore(STORES.GHG_RECALCULATIONS).put(stripUndefined(rec));
    }
    for (const af of p2Seed.auditFindings) {
      tx.objectStore(STORES.AUDIT_FINDINGS).put(stripUndefined(af));
    }
    for (const rev of p2Seed.reviews) {
      tx.objectStore(STORES.REVIEWS).put(stripUndefined(rev));
    }

    // Phase 3
    for (const fw of p3Seed.disclosureFrameworks) {
      tx.objectStore(STORES.DISCLOSURE_FRAMEWORKS).put(stripUndefined(fw));
    }
    for (const req of p3Seed.disclosureRequirements) {
      tx.objectStore(STORES.DISCLOSURE_REQUIREMENTS).put(stripUndefined(req));
    }
    for (const mp of p3Seed.disclosureMappings) {
      tx.objectStore(STORES.DISCLOSURE_MAPPINGS).put(stripUndefined(mp));
    }
    for (const fm of p3Seed.financialMateriality) {
      tx.objectStore(STORES.FINANCIAL_MATERIALITY).put(stripUndefined(fm));
    }
    for (const im of p3Seed.impactMateriality) {
      tx.objectStore(STORES.IMPACT_MATERIALITY).put(stripUndefined(im));
    }
    for (const am of p3Seed.auditMateriality) {
      tx.objectStore(STORES.AUDIT_MATERIALITY).put(stripUndefined(am));
    }
    for (const rp of p3Seed.assuranceReports) {
      tx.objectStore(STORES.ASSURANCE_REPORTS).put(stripUndefined(rp));
    }
    for (const snp of p3Seed.reportSnapshots) {
      tx.objectStore(STORES.REPORT_SNAPSHOTS).put(stripUndefined(snp));
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Seed transaction failed.'));
  });

  return {
    ...p1Seed,
    ...p2Seed,
    ...p3Seed,
    aiAuditRequests: [],
    aiAuditResponses: [],
    backupManifests: [],
    auditEvents: [...p1Seed.auditEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  };
}

async function populatePhase2StoresOnly(
  db: IDBDatabase,
  p2Seed: Phase2SyntheticDataset
): Promise<void> {
  const p2Stores = [
    STORES.AUDIT_PLANS,
    STORES.AUDIT_PROCEDURES,
    STORES.RISK_ASSESSMENTS,
    STORES.SAMPLING_PLANS,
    STORES.SAMPLE_ITEMS,
    STORES.DESIGN_TESTS,
    STORES.OPERATING_TESTS,
    STORES.EMISSION_ACTIVITIES,
    STORES.EMISSION_FACTORS,
    STORES.GHG_RECALCULATIONS,
    STORES.AUDIT_FINDINGS,
    STORES.REVIEWS,
  ];

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(p2Stores, 'readwrite');
    for (const p of p2Seed.auditPlans) tx.objectStore(STORES.AUDIT_PLANS).put(stripUndefined(p));
    for (const pr of p2Seed.auditProcedures) {
      tx.objectStore(STORES.AUDIT_PROCEDURES).put(stripUndefined(pr));
    }
    for (const r of p2Seed.riskAssessments) {
      tx.objectStore(STORES.RISK_ASSESSMENTS).put(stripUndefined(r));
    }
    for (const sp of p2Seed.samplingPlans) {
      tx.objectStore(STORES.SAMPLING_PLANS).put(stripUndefined(sp));
    }
    for (const si of p2Seed.sampleItems) {
      tx.objectStore(STORES.SAMPLE_ITEMS).put(stripUndefined(si));
    }
    for (const dt of p2Seed.designTests) {
      tx.objectStore(STORES.DESIGN_TESTS).put(stripUndefined(dt));
    }
    for (const ot of p2Seed.operatingTests) {
      tx.objectStore(STORES.OPERATING_TESTS).put(stripUndefined(ot));
    }
    for (const act of p2Seed.emissionActivities) {
      tx.objectStore(STORES.EMISSION_ACTIVITIES).put(stripUndefined(act));
    }
    for (const ef of p2Seed.emissionFactors) {
      tx.objectStore(STORES.EMISSION_FACTORS).put(stripUndefined(ef));
    }
    for (const rec of p2Seed.ghgRecalculations) {
      tx.objectStore(STORES.GHG_RECALCULATIONS).put(stripUndefined(rec));
    }
    for (const af of p2Seed.auditFindings) {
      tx.objectStore(STORES.AUDIT_FINDINGS).put(stripUndefined(af));
    }
    for (const rev of p2Seed.reviews) {
      tx.objectStore(STORES.REVIEWS).put(stripUndefined(rev));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Phase 2 migration seed failed.'));
  });
}

async function populatePhase3StoresOnly(
  db: IDBDatabase,
  p3Seed: Phase3SyntheticDataset
): Promise<void> {
  const p3Stores = [
    STORES.DISCLOSURE_FRAMEWORKS,
    STORES.DISCLOSURE_REQUIREMENTS,
    STORES.DISCLOSURE_MAPPINGS,
    STORES.FINANCIAL_MATERIALITY,
    STORES.IMPACT_MATERIALITY,
    STORES.AUDIT_MATERIALITY,
    STORES.ASSURANCE_REPORTS,
    STORES.REPORT_SNAPSHOTS,
  ];

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(p3Stores, 'readwrite');
    for (const fw of p3Seed.disclosureFrameworks) {
      tx.objectStore(STORES.DISCLOSURE_FRAMEWORKS).put(stripUndefined(fw));
    }
    for (const req of p3Seed.disclosureRequirements) {
      tx.objectStore(STORES.DISCLOSURE_REQUIREMENTS).put(stripUndefined(req));
    }
    for (const mp of p3Seed.disclosureMappings) {
      tx.objectStore(STORES.DISCLOSURE_MAPPINGS).put(stripUndefined(mp));
    }
    for (const fm of p3Seed.financialMateriality) {
      tx.objectStore(STORES.FINANCIAL_MATERIALITY).put(stripUndefined(fm));
    }
    for (const im of p3Seed.impactMateriality) {
      tx.objectStore(STORES.IMPACT_MATERIALITY).put(stripUndefined(im));
    }
    for (const am of p3Seed.auditMateriality) {
      tx.objectStore(STORES.AUDIT_MATERIALITY).put(stripUndefined(am));
    }
    for (const rp of p3Seed.assuranceReports) {
      tx.objectStore(STORES.ASSURANCE_REPORTS).put(stripUndefined(rp));
    }
    for (const snp of p3Seed.reportSnapshots) {
      tx.objectStore(STORES.REPORT_SNAPSHOTS).put(stripUndefined(snp));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Phase 3 migration seed failed.'));
  });
}

/**
 * Appends an immutable audit event and saves an entity atomically in a single IndexedDB transaction,
 * then re-runs deterministic DQ validation and persists the updated findings.
 */
export async function saveEntityWithAuditAndRevalidate<T>(params: {
  storeName: string;
  entity: T;
  auditEvent: Omit<AuditEvent, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: string };
}): Promise<{
  savedEntity: T;
  auditEvent: AuditEvent;
  findings: ValidationFinding[];
}> {
  const db = await openWorkbenchDb();
  const cleanEntity = stripUndefined(params.entity);
  const nowIso = params.auditEvent.timestamp ?? new Date().toISOString();
  const fullEvent: AuditEvent = stripUndefined({
    ...params.auditEvent,
    eventId:
      params.auditEvent.eventId ??
      `AUD-EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: nowIso,
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([params.storeName, STORES.AUDIT_EVENTS], 'readwrite');
    tx.objectStore(params.storeName).put(cleanEntity);
    tx.objectStore(STORES.AUDIT_EVENTS).put(fullEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error(`Transaction failed for store ${params.storeName}`));
  });

  const findings = await revalidateAndPersistFindings();
  return { savedEntity: cleanEntity, auditEvent: fullEvent, findings };
}

/**
 * Atomically persists an AssuranceReport along with its immutable FrozenReportSnapshot and an AuditEvent.
 */
export async function saveAssuranceReportWithSnapshot(params: {
  report: AssuranceReport;
  snapshot: FrozenReportSnapshot;
  actor: string;
}): Promise<{
  report: AssuranceReport;
  snapshot: FrozenReportSnapshot;
  auditEvent: AuditEvent;
}> {
  const db = await openWorkbenchDb();
  const cleanReport = stripUndefined(params.report);
  const cleanSnapshot = stripUndefined(params.snapshot);
  const nowIso = new Date().toISOString();

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-RPT`,
    engagementId: cleanReport.engagementId,
    entityType: 'AssuranceReport',
    entityId: cleanReport.reportId,
    action: 'ASSURANCE_REPORT_SNAPSHOT_FROZEN',
    actor: params.actor,
    timestamp: nowIso,
    previousValue: 'None',
    newValue: `${cleanReport.reportType} v${cleanReport.versionNumber} (Snapshot=${cleanSnapshot.snapshotId}, Hash=${cleanSnapshot.reportSnapshotHash.slice(0, 16)}...)`,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORES.ASSURANCE_REPORTS, STORES.REPORT_SNAPSHOTS, STORES.AUDIT_EVENTS],
      'readwrite'
    );
    tx.objectStore(STORES.ASSURANCE_REPORTS).put(cleanReport);
    tx.objectStore(STORES.REPORT_SNAPSHOTS).put(cleanSnapshot);
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Failed to persist assurance report and frozen snapshot.'));
  });

  return { report: cleanReport, snapshot: cleanSnapshot, auditEvent };
}

/**
 * Atomically persists a batch of imported DisclosureRequirements along with an AuditEvent.
 */
export async function saveImportedRequirementsBatch(params: {
  requirements: DisclosureRequirement[];
  engagementId: string;
  actor: string;
}): Promise<{ requirements: DisclosureRequirement[]; auditEvent: AuditEvent }> {
  const db = await openWorkbenchDb();
  const cleanReqs = params.requirements.map((r) => stripUndefined(r));
  const nowIso = new Date().toISOString();

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-REQ-IMP`,
    engagementId: params.engagementId,
    entityType: 'DisclosureRequirement',
    entityId: cleanReqs[0]?.requirementId ?? 'BATCH-IMPORT',
    action: 'DISCLOSURE_CATALOG_IMPORTED',
    actor: params.actor,
    timestamp: nowIso,
    previousValue: 'Catalog',
    newValue: `Imported ${cleanReqs.length} validated disclosure requirements`,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORES.DISCLOSURE_REQUIREMENTS, STORES.AUDIT_EVENTS],
      'readwrite'
    );
    const store = tx.objectStore(STORES.DISCLOSURE_REQUIREMENTS);
    for (const r of cleanReqs) {
      store.put(r);
    }
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Failed to persist imported disclosure requirements.'));
  });

  return { requirements: cleanReqs, auditEvent };
}

/**
 * Atomically persists a SamplingPlan along with all generated SampleItems and an AuditEvent.
 */
export async function saveSamplingPlanWithItems(params: {
  plan: SamplingPlan;
  items: SampleItem[];
  actor: string;
}): Promise<{ plan: SamplingPlan; items: SampleItem[]; auditEvent: AuditEvent }> {
  const db = await openWorkbenchDb();
  const cleanPlan = stripUndefined(params.plan);
  const cleanItems = params.items.map((i) => stripUndefined(i));
  const nowIso = new Date().toISOString();

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-SMP`,
    engagementId: 'ENG-2025-002',
    entityType: 'SamplingPlan',
    entityId: cleanPlan.samplingPlanId,
    action: 'SAMPLING_PLAN_EXECUTED',
    actor: params.actor,
    timestamp: nowIso,
    previousValue: 'None',
    newValue: `${cleanPlan.samplingMethod} (Seed=${cleanPlan.randomSeed}, Requested=${cleanPlan.requestedSampleSize}, Selected=${cleanPlan.actualSampleSize})`,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORES.SAMPLING_PLANS, STORES.SAMPLE_ITEMS, STORES.AUDIT_EVENTS],
      'readwrite'
    );
    tx.objectStore(STORES.SAMPLING_PLANS).put(cleanPlan);
    const itemStore = tx.objectStore(STORES.SAMPLE_ITEMS);
    for (const item of cleanItems) {
      itemStore.put(item);
    }
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to persist sampling plan and items.'));
  });

  return { plan: cleanPlan, items: cleanItems, auditEvent };
}

/**
 * Uploads an evidence record along with its binary file bytes (ArrayBuffer) in a single transaction,
 * linking it to the target entity.
 */
export async function saveUploadedEvidenceWithBlob(params: {
  evidence: EvidenceRecord;
  blobBytes: ArrayBuffer;
  actor: string;
}): Promise<{
  evidence: EvidenceRecord;
  findings: ValidationFinding[];
  auditEvent: AuditEvent;
}> {
  // Phase 4 Zone 1 Security Hardening: Verify Magic-Byte / Content Signature before persisting
  const magicCheck = validateFileMagicBytes(
    params.blobBytes,
    params.evidence.mimeType,
    params.evidence.documentName
  );
  if (!magicCheck.valid) {
    throw new Error(magicCheck.error ?? 'Uploaded file failed magic-byte signature verification.');
  }

  const db = await openWorkbenchDb();
  const cleanEvidence = stripUndefined(params.evidence);
  const nowIso = new Date().toISOString();

  const blobRecord: EvidenceFileBlob = {
    evidenceId: cleanEvidence.evidenceId,
    bytes: params.blobBytes,
    mimeType: cleanEvidence.mimeType,
    documentName: cleanEvidence.documentName,
    uploadedAt: cleanEvidence.uploadedAt,
  };

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-EVD`,
    engagementId: cleanEvidence.engagementId,
    entityType: 'EvidenceRecord',
    entityId: cleanEvidence.evidenceId,
    action: 'EVIDENCE_FILE_UPLOADED',
    actor: params.actor,
    timestamp: nowIso,
    previousValue: 'None',
    newValue: `${cleanEvidence.documentName} (${cleanEvidence.fileSize} bytes | SHA-256: ${cleanEvidence.checksum.slice(0, 16)}...)`,
  };

  const targetAssertion =
    cleanEvidence.linkedEntityType === 'ESGAssertion'
      ? await getOneFromStore<ESGAssertion>(db, STORES.ASSERTIONS, cleanEvidence.linkedEntityId)
      : null;

  const targetControl =
    cleanEvidence.linkedEntityType === 'InternalControl'
      ? await getOneFromStore<InternalControl>(db, STORES.CONTROLS, cleanEvidence.linkedEntityId)
      : null;

  await new Promise<void>((resolve, reject) => {
    const txStores = [
      STORES.EVIDENCE,
      STORES.EVIDENCE_BLOBS,
      STORES.AUDIT_EVENTS,
      STORES.ASSERTIONS,
      STORES.CONTROLS,
    ];
    const tx = db.transaction(txStores, 'readwrite');
    tx.objectStore(STORES.EVIDENCE).put(cleanEvidence);
    tx.objectStore(STORES.EVIDENCE_BLOBS).put(blobRecord);
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);

    if (targetAssertion && !targetAssertion.linkedEvidenceIds.includes(cleanEvidence.evidenceId)) {
      const updatedAssertion: ESGAssertion = stripUndefined({
        ...targetAssertion,
        linkedEvidenceIds: [...targetAssertion.linkedEvidenceIds, cleanEvidence.evidenceId],
        updatedAt: nowIso,
      });
      tx.objectStore(STORES.ASSERTIONS).put(updatedAssertion);
    }

    if (targetControl && !targetControl.linkedEvidenceIds.includes(cleanEvidence.evidenceId)) {
      const updatedControl: InternalControl = stripUndefined({
        ...targetControl,
        linkedEvidenceIds: [...targetControl.linkedEvidenceIds, cleanEvidence.evidenceId],
        updatedAt: nowIso,
      });
      tx.objectStore(STORES.CONTROLS).put(updatedControl);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to persist evidence file and metadata.'));
  });

  const findings = await revalidateAndPersistFindings();
  return { evidence: cleanEvidence, findings, auditEvent };
}

export async function getEvidenceBlob(evidenceId: string): Promise<EvidenceFileBlob | null> {
  const db = await openWorkbenchDb();
  return getOneFromStore<EvidenceFileBlob>(db, STORES.EVIDENCE_BLOBS, evidenceId);
}

export async function getAllEvidenceBlobs(): Promise<EvidenceFileBlob[]> {
  const db = await openWorkbenchDb();
  return getAllFromStore<EvidenceFileBlob>(db, STORES.EVIDENCE_BLOBS);
}

/**
 * Atomically persists an AiAuditRequest, AiAuditResponse, and AuditEvent in IndexedDB v4.
 */
export async function saveAiAuditExchange(params: {
  request: AiAuditRequest;
  response: AiAuditResponse;
  actor: string;
}): Promise<{
  request: AiAuditRequest;
  response: AiAuditResponse;
  auditEvent: AuditEvent;
}> {
  const db = await openWorkbenchDb();
  const cleanReq = stripUndefined(params.request);
  const cleanRes = stripUndefined(params.response);
  const nowIso = new Date().toISOString();

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-AI`,
    engagementId: cleanReq.engagementId,
    entityType: 'AiAuditResponse',
    entityId: cleanRes.responseId,
    action: 'AI_COPILOT_DRAFT_GENERATED',
    actor: params.actor,
    timestamp: nowIso,
    previousValue: `Request=${cleanReq.requestId} (${cleanReq.taskType})`,
    newValue: `Model=${cleanRes.modelId} | Status=${cleanRes.validationStatus} | Sources=${cleanRes.sourceRecordIds.length}`,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORES.AI_AUDIT_REQUESTS, STORES.AI_AUDIT_RESPONSES, STORES.AUDIT_EVENTS],
      'readwrite'
    );
    tx.objectStore(STORES.AI_AUDIT_REQUESTS).put(cleanReq);
    tx.objectStore(STORES.AI_AUDIT_RESPONSES).put(cleanRes);
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to persist AI Copilot exchange.'));
  });

  return { request: cleanReq, response: cleanRes, auditEvent };
}

/**
 * Persists a BackupManifest record along with an AuditEvent.
 */
export async function saveBackupManifestRecord(params: {
  manifest: BackupManifest;
  actor: string;
}): Promise<{ manifest: BackupManifest; auditEvent: AuditEvent }> {
  const db = await openWorkbenchDb();
  const cleanManifest = stripUndefined(params.manifest);
  const nowIso = new Date().toISOString();

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-BKP`,
    engagementId: cleanManifest.engagementId === 'ALL' ? 'ENG-2025-002' : cleanManifest.engagementId,
    entityType: 'BackupManifest',
    entityId: cleanManifest.manifestId,
    action: 'BACKUP_ARCHIVE_CREATED',
    actor: params.actor,
    timestamp: nowIso,
    previousValue: 'None',
    newValue: `${cleanManifest.scope} (${cleanManifest.binaryBlobCount} blobs | Hash=${cleanManifest.archiveChecksumSha256.slice(0, 16)}...)`,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.BACKUP_MANIFESTS, STORES.AUDIT_EVENTS], 'readwrite');
    tx.objectStore(STORES.BACKUP_MANIFESTS).put(cleanManifest);
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to persist backup manifest.'));
  });

  return { manifest: cleanManifest, auditEvent };
}

/**
 * Runs deterministic DQ validation across the current IndexedDB state and persists updated findings.
 */
export async function revalidateAndPersistFindings(): Promise<ValidationFinding[]> {
  const db = await openWorkbenchDb();
  const [engagements, facilities, assertions, controls, evidence, existingFindings] =
    await Promise.all([
      getAllFromStore<AssuranceEngagement>(db, STORES.ENGAGEMENTS),
      getAllFromStore<Facility>(db, STORES.FACILITIES),
      getAllFromStore<ESGAssertion>(db, STORES.ASSERTIONS),
      getAllFromStore<InternalControl>(db, STORES.CONTROLS),
      getAllFromStore<EvidenceRecord>(db, STORES.EVIDENCE),
      getAllFromStore<ValidationFinding>(db, STORES.FINDINGS),
    ]);

  const updatedFindings = runDeterministicValidation({
    engagements,
    facilities,
    assertions,
    controls,
    evidence,
    existingFindings,
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.FINDINGS, 'readwrite');
    const store = tx.objectStore(STORES.FINDINGS);
    store.clear();
    for (const f of updatedFindings) {
      store.put(stripUndefined(f));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to persist validation findings.'));
  });

  return updatedFindings;
}

export async function markFindingResolvedInStore(
  findingId: string,
  resolutionNote: string,
  actor: string
): Promise<{ finding: ValidationFinding; auditEvent: AuditEvent }> {
  const db = await openWorkbenchDb();
  const existing = await getOneFromStore<ValidationFinding>(db, STORES.FINDINGS, findingId);
  if (!existing) {
    throw new Error(`Finding ${findingId} not found.`);
  }

  const nowIso = new Date().toISOString();
  const updated: ValidationFinding = stripUndefined({
    ...existing,
    status: 'Resolved',
    resolutionNote: resolutionNote.trim() || 'Marked resolved by reviewer.',
  });

  const auditEvent: AuditEvent = {
    eventId: `AUD-EVT-${Date.now()}-FND`,
    engagementId: existing.engagementId,
    entityType: 'ValidationFinding',
    entityId: existing.findingId,
    action: 'FINDING_MARKED_RESOLVED',
    actor,
    timestamp: nowIso,
    previousValue: existing.status,
    newValue: `Resolved (${updated.resolutionNote})`,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORES.FINDINGS, STORES.AUDIT_EVENTS], 'readwrite');
    tx.objectStore(STORES.FINDINGS).put(updated);
    tx.objectStore(STORES.AUDIT_EVENTS).put(auditEvent);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to update finding status.'));
  });

  return { finding: updated, auditEvent };
}

const THEME_STORAGE_KEY = 'esg_workbench_theme_mode';

export async function getPersistedThemeMode(): Promise<'light' | 'dark'> {
  try {
    if (typeof localStorage !== 'undefined') {
      const localVal = localStorage.getItem(THEME_STORAGE_KEY);
      if (localVal === 'dark' || localVal === 'light') {
        return localVal;
      }
    }
    const db = await openWorkbenchDb();
    const pref = await getOneFromStore<{ key: string; value: 'light' | 'dark' }>(
      db,
      STORES.PREFERENCES,
      THEME_STORAGE_KEY
    );
    return pref?.value === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export async function setPersistedThemeMode(mode: 'light' | 'dark'): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  if (typeof document !== 'undefined') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  try {
    const db = await openWorkbenchDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.PREFERENCES, 'readwrite');
      tx.objectStore(STORES.PREFERENCES).put({ key: THEME_STORAGE_KEY, value: mode });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage already succeeded
  }
}
