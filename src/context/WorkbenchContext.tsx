import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AiAuditRequest,
  AiAuditResponse,
  AiAuditTaskType,
  AssuranceEngagement,
  AssuranceReadinessMetrics,
  AssuranceReport,
  AssuranceReportReviewStatus,
  AssuranceReportType,
  AuditEvent,
  AuditFinding,
  AuditMaterialityAssessment,
  AuditPlan,
  AuditProcedure,
  BackupArchiveEnvelope,
  BackupManifest,
  DesignTest,
  DisclosureFramework,
  DisclosureMapping,
  DisclosureRequirement,
  DisclosureTraceabilityResult,
  EmissionActivityRecord,
  EmissionFactorRecord,
  EngagementStatus,
  ESGAssertion,
  EvidenceRecord,
  EvidenceVerificationStatus,
  Facility,
  FinancialMaterialityAssessment,
  FrozenReportSnapshot,
  GHGRecalculationResult,
  GlobalFilterState,
  ImpactMaterialityAssessment,
  InternalControl,
  LinkedEntityType,
  OperatingTest,
  Organization,
  Phase2DashboardMetrics,
  PopulationItemRecord,
  RestoreMode,
  RestoreValidationReport,
  ReviewRecord,
  ReviewWorkflowStatus,
  RiskAssessment,
  RiskCategory,
  SampleItem,
  SampleTestingStatus,
  SamplingMethod,
  SamplingPlan,
  ValidationFinding,
} from '../types/domain';
import {
  getEvidenceBlob,
  getPersistedThemeMode,
  initializeOrLoadDataset,
  markFindingResolvedInStore,
  revalidateAndPersistFindings,
  saveAiAuditExchange,
  saveAssuranceReportWithSnapshot,
  saveBackupManifestRecord,
  saveEntityWithAuditAndRevalidate,
  saveImportedRequirementsBatch,
  saveSamplingPlanWithItems,
  saveUploadedEvidenceWithBlob,
  setPersistedThemeMode,
  STORES,
} from '../db/repository';
import {
  applyGlobalFilters,
  calculateAssuranceReadinessMetrics,
  calculatePhase2DashboardMetrics,
  FilteredDataset,
} from '../methodology/readinessCalculator';
import { computeSha256Hex, validateEvidenceFile } from '../utils/security';
import { evaluateRiskAssessment } from '../services/riskEngine';
import { executeAuditSampling } from '../services/samplingEngine';
import {
  createReviewTransitionRecord,
  validateAuditFindingClosure,
  validateDesignTestGuardrails,
  validateOperatingTestGuardrails,
} from '../services/controlTestingEngine';
import { executeGhgShadowRecalculation, VarianceThresholdConfig } from '../services/ghgEngine';
import {
  calculateDisclosureCoverageAnalytics,
  DisclosureCoverageAnalytics,
  evaluateAllDisclosureTraceability,
  validateAndImportRequirementCatalog,
  validateAndPrepareFramework,
  validateAndPrepareRequirement,
  validateDisclosureMappingInput,
} from '../services/disclosureFrameworkEngine';
import {
  buildDoubleMaterialityMatrix,
  DoubleMaterialityTopicRow,
  evaluateFinancialMateriality,
  evaluateImpactMateriality,
  validateAuditMateriality,
} from '../services/materialityEngine';
import {
  AdvancedAuditAnalyticsSummary,
  calculateAdvancedAuditAnalytics,
  generateAssuranceReportAndSnapshot,
  ReportGenerationContext,
  validateReportStatusTransition,
} from '../services/assuranceReportingEngine';
import {
  CsvExportCategory,
  generateModuleCsvExport,
  generateReportPdfBytes,
  generateReportXlsxBytes,
  generateStructuredJsonExport,
  triggerBrowserDownload,
} from '../services/exportEngine';
import {
  executeGroundedAiCopilotTask,
  validateHumanApprovedAiDraftApplication,
} from '../services/aiCopilotEngine';
import {
  createWorkbenchBackupArchive,
  executeBackupRestore,
  validateBackupArchiveForRestore,
} from '../services/backupRestoreEngine';

export interface SaveRetryOperation {
  label: string;
  retryFn: () => Promise<void>;
}

interface WorkbenchContextValue {
  loading: boolean;
  errorBanner: string | null;
  retryOperation: SaveRetryOperation | null;
  clearErrorBanner: () => void;
  themeMode: 'light' | 'dark';
  toggleThemeMode: () => Promise<void>;
  activeActor: string;
  setActiveActor: (actor: string) => void;

  // Phase 1 Raw stored state
  organization: Organization | null;
  facilities: Facility[];
  engagements: AssuranceEngagement[];
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  findings: ValidationFinding[];
  auditEvents: AuditEvent[];

  // Phase 2 Raw stored state
  auditPlans: AuditPlan[];
  auditProcedures: AuditProcedure[];
  riskAssessments: RiskAssessment[];
  samplingPlans: SamplingPlan[];
  sampleItems: SampleItem[];
  designTests: DesignTest[];
  operatingTests: OperatingTest[];
  emissionActivities: EmissionActivityRecord[];
  emissionFactors: EmissionFactorRecord[];
  ghgRecalculations: GHGRecalculationResult[];
  auditFindings: AuditFinding[];
  reviews: ReviewRecord[];

  // Phase 3 Raw stored state & derived analytics
  disclosureFrameworks: DisclosureFramework[];
  disclosureRequirements: DisclosureRequirement[];
  disclosureMappings: DisclosureMapping[];
  financialMateriality: FinancialMaterialityAssessment[];
  impactMateriality: ImpactMaterialityAssessment[];
  auditMateriality: AuditMaterialityAssessment[];
  assuranceReports: AssuranceReport[];
  reportSnapshots: FrozenReportSnapshot[];

  // Phase 4 Raw stored state
  aiAuditRequests: AiAuditRequest[];
  aiAuditResponses: AiAuditResponse[];
  backupManifests: BackupManifest[];

  activeEngagementId: string;
  traceabilityResults: DisclosureTraceabilityResult[];
  disclosureAnalytics: DisclosureCoverageAnalytics;
  doubleMaterialityMatrix: DoubleMaterialityTopicRow[];
  advancedAnalytics: AdvancedAuditAnalyticsSummary;

  // Global Filters & Derived Readiness Metrics
  filters: GlobalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  resetFilters: () => void;
  filteredData: FilteredDataset;
  metrics: AssuranceReadinessMetrics;
  phase2Metrics: Phase2DashboardMetrics;

  // Phase 1 Actions
  saveEngagement: (
    data: Omit<AssuranceEngagement, 'engagementId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<AssuranceEngagement>;
  updateEngagementStatus: (
    engagementId: string,
    newStatus: EngagementStatus
  ) => Promise<void>;
  saveAssertion: (
    data: Omit<ESGAssertion, 'assertionId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<ESGAssertion>;
  archiveAssertion: (assertionId: string) => Promise<void>;
  saveControl: (
    data: Omit<InternalControl, 'controlId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<InternalControl>;
  uploadEvidence: (params: {
    file: File;
    engagementId: string;
    linkedEntityType: LinkedEntityType;
    linkedEntityId: string;
    evidenceType: EvidenceRecord['evidenceType'];
    reviewerNotes: string;
  }) => Promise<EvidenceRecord>;
  reviewEvidence: (
    evidenceId: string,
    newStatus: EvidenceVerificationStatus,
    reviewerNotes: string
  ) => Promise<void>;
  downloadEvidence: (evidenceId: string) => Promise<void>;
  resolveFinding: (findingId: string, resolutionNote: string) => Promise<void>;
  triggerDeterministicRevalidation: () => Promise<ValidationFinding[]>;
  resetDemoDataset: () => Promise<void>;

  // Phase 2 Actions
  saveAuditPlan: (
    data: Omit<AuditPlan, 'auditPlanId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<AuditPlan>;
  saveAuditProcedure: (
    data: Omit<AuditProcedure, 'procedureId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<AuditProcedure>;
  saveRiskAssessment: (
    params: {
      engagementId: string;
      linkedAssertionId: string;
      linkedControlId: string;
      riskCategory: RiskCategory;
      likelihood: number;
      impact: number;
      controlEffectivenessBasis: string | null;
      controlRiskScore: number | null;
      assessmentRationale: string;
      evidenceReferences: string[];
      assessedBy: string;
    },
    existingId?: string
  ) => Promise<RiskAssessment>;
  createSamplingPlanAndSelectItems: (params: {
    procedureId: string;
    populationId: string;
    samplingMethod: SamplingMethod;
    requestedSampleSize: number;
    randomSeed: number;
    judgmentalRationale?: string;
    riskCriteria?: string;
    customPopulation?: PopulationItemRecord[];
  }) => Promise<{ plan: SamplingPlan; items: SampleItem[] }>;
  updateSampleItemResult: (
    sampleItemId: string,
    updates: {
      testingStatus: SampleTestingStatus;
      exceptionNotes?: string;
      linkedEvidenceIds?: string[];
    }
  ) => Promise<SampleItem>;
  saveDesignTest: (
    data: Omit<DesignTest, 'designTestId' | 'testedAt'>,
    existingId?: string
  ) => Promise<DesignTest>;
  saveOperatingTest: (
    data: Omit<OperatingTest, 'operatingTestId' | 'testedAt'>,
    existingId?: string
  ) => Promise<OperatingTest>;
  runGhgShadowRecalculation: (
    activityId: string,
    emissionFactorId?: string,
    customThresholds?: VarianceThresholdConfig
  ) => Promise<GHGRecalculationResult>;
  saveEmissionActivity: (
    data: EmissionActivityRecord,
    emissionFactorId: string
  ) => Promise<{ activity: EmissionActivityRecord; recalculation: GHGRecalculationResult }>;
  saveEmissionFactor: (
    data: EmissionFactorRecord
  ) => Promise<EmissionFactorRecord>;
  saveAuditFinding: (
    data: Omit<AuditFinding, 'auditFindingId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<AuditFinding>;
  submitReviewDecision: (params: {
    engagementId: string;
    entityType: ReviewRecord['entityType'];
    entityId: string;
    preparedBy: string;
    reviewedBy: string | null;
    targetStatus: ReviewWorkflowStatus;
    reviewComments: string;
  }) => Promise<ReviewRecord>;

  // Phase 3 Actions
  saveDisclosureFramework: (
    data: Omit<DisclosureFramework, 'frameworkId' | 'createdAt'>,
    existingId?: string
  ) => Promise<DisclosureFramework>;
  saveDisclosureRequirement: (
    data: Omit<DisclosureRequirement, 'requirementId'>,
    existingId?: string
  ) => Promise<DisclosureRequirement>;
  importRequirementCatalog: (rawItems: unknown[]) => Promise<DisclosureRequirement[]>;
  saveDisclosureMapping: (
    data: Omit<DisclosureMapping, 'mappingId' | 'updatedAt'>,
    existingId?: string
  ) => Promise<DisclosureMapping>;
  saveFinancialMateriality: (
    data: Omit<
      FinancialMaterialityAssessment,
      'assessmentId' | 'financialMaterialityScore' | 'isFinanciallyMaterial' | 'updatedAt'
    >,
    existingId?: string
  ) => Promise<FinancialMaterialityAssessment>;
  saveImpactMateriality: (
    data: Omit<
      ImpactMaterialityAssessment,
      'impactAssessmentId' | 'severityScore' | 'impactMaterialityScore' | 'isImpactMaterial' | 'updatedAt'
    >,
    existingId?: string
  ) => Promise<ImpactMaterialityAssessment>;
  saveAuditMateriality: (
    data: Omit<AuditMaterialityAssessment, 'auditMaterialityId' | 'updatedAt'>,
    existingId?: string
  ) => Promise<AuditMaterialityAssessment>;
  generateAndFreezeAssuranceReport: (params: {
    engagementId: string;
    reportType: AssuranceReportType;
    includedSectionIds?: string[];
  }) => Promise<{ report: AssuranceReport; snapshot: FrozenReportSnapshot }>;
  updateAssuranceReportStatus: (params: {
    reportId: string;
    nextStatus: AssuranceReportReviewStatus;
  }) => Promise<AssuranceReport>;
  exportReportSnapshot: (params: {
    snapshotId: string;
    format: 'pdf' | 'xlsx' | 'csv' | 'json';
    csvCategory?: CsvExportCategory;
  }) => { filename: string; byteLength: number };

  // Phase 4 Actions
  runAiAuditCopilotTask: (params: {
    engagementId: string;
    taskType: AiAuditTaskType;
    selectedRecordIds: string[];
    userQuestion: string;
    methodologyContext: string;
  }) => Promise<{ request: AiAuditRequest; response: AiAuditResponse }>;
  applyAiDraftToWorkpaper: (params: {
    responseId: string;
    targetEntityType: 'AuditProcedureDraft' | 'AuditFindingDraft';
    humanConfirmedReview: boolean;
  }) => Promise<{ updatedResponse: AiAuditResponse; createdEntityId: string }>;
  createAndDownloadBackupArchive: (params: {
    scope: 'Full Application' | 'Single Engagement';
    engagementId?: string;
    downloadToBrowser?: boolean;
  }) => Promise<{ archive: BackupArchiveEnvelope; filename: string }>;
  validateBackupArchive: (rawArchive: unknown) => Promise<RestoreValidationReport>;
  restoreFromBackupArchive: (params: {
    rawArchive: unknown;
    mode: RestoreMode;
    confirmDestructiveReplace?: boolean;
  }) => Promise<RestoreValidationReport>;
}

const DEFAULT_FILTERS: GlobalFilterState = {
  engagementId: 'ALL',
  reportingYear: 'ALL',
  facilityId: 'ALL',
  pillar: 'ALL',
  reviewStatus: 'ALL',
};

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

export const WorkbenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [retryOperation, setRetryOperation] = useState<SaveRetryOperation | null>(null);
  const [themeMode, setThemeModeState] = useState<'light' | 'dark'>('light');
  const [activeActor, setActiveActor] = useState<string>(
    'Martina Bergmann (Corporate Sustainability Controller)'
  );

  // Phase 1 State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [engagements, setEngagements] = useState<AssuranceEngagement[]>([]);
  const [assertions, setAssertions] = useState<ESGAssertion[]>([]);
  const [controls, setControls] = useState<InternalControl[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [filters, setFilters] = useState<GlobalFilterState>(DEFAULT_FILTERS);

  // Phase 2 State
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([]);
  const [auditProcedures, setAuditProcedures] = useState<AuditProcedure[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [samplingPlans, setSamplingPlans] = useState<SamplingPlan[]>([]);
  const [sampleItems, setSampleItems] = useState<SampleItem[]>([]);
  const [designTests, setDesignTests] = useState<DesignTest[]>([]);
  const [operatingTests, setOperatingTests] = useState<OperatingTest[]>([]);
  const [emissionActivities, setEmissionActivities] = useState<EmissionActivityRecord[]>([]);
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactorRecord[]>([]);
  const [ghgRecalculations, setGhgRecalculations] = useState<GHGRecalculationResult[]>([]);
  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  // Phase 3 State
  const [disclosureFrameworks, setDisclosureFrameworks] = useState<DisclosureFramework[]>([]);
  const [disclosureRequirements, setDisclosureRequirements] = useState<DisclosureRequirement[]>([]);
  const [disclosureMappings, setDisclosureMappings] = useState<DisclosureMapping[]>([]);
  const [financialMateriality, setFinancialMateriality] = useState<FinancialMaterialityAssessment[]>([]);
  const [impactMateriality, setImpactMateriality] = useState<ImpactMaterialityAssessment[]>([]);
  const [auditMateriality, setAuditMateriality] = useState<AuditMaterialityAssessment[]>([]);
  const [assuranceReports, setAssuranceReports] = useState<AssuranceReport[]>([]);
  const [reportSnapshots, setReportSnapshots] = useState<FrozenReportSnapshot[]>([]);

  // Phase 4 State
  const [aiAuditRequests, setAiAuditRequests] = useState<AiAuditRequest[]>([]);
  const [aiAuditResponses, setAiAuditResponses] = useState<AiAuditResponse[]>([]);
  const [backupManifests, setBackupManifests] = useState<BackupManifest[]>([]);

  const loadAll = useCallback(async (forceReset = false) => {
    try {
      setLoading(true);
      const [persistedTheme, dataset] = await Promise.all([
        getPersistedThemeMode(),
        initializeOrLoadDataset(forceReset),
      ]);
      setThemeModeState(persistedTheme);
      if (typeof document !== 'undefined') {
        if (persistedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      setOrganization(dataset.organization);
      setFacilities(dataset.facilities);
      setEngagements(dataset.engagements);
      setAssertions(dataset.assertions);
      setControls(dataset.controls);
      setEvidence(dataset.evidence);
      setFindings(dataset.findings);
      setAuditEvents(dataset.auditEvents);

      // Phase 2 stores
      setAuditPlans(dataset.auditPlans);
      setAuditProcedures(dataset.auditProcedures);
      setRiskAssessments(dataset.riskAssessments);
      setSamplingPlans(dataset.samplingPlans);
      setSampleItems(dataset.sampleItems);
      setDesignTests(dataset.designTests);
      setOperatingTests(dataset.operatingTests);
      setEmissionActivities(dataset.emissionActivities);
      setEmissionFactors(dataset.emissionFactors);
      setGhgRecalculations(dataset.ghgRecalculations);
      setAuditFindings(dataset.auditFindings);
      setReviews(dataset.reviews);

      // Phase 3 stores
      setDisclosureFrameworks(dataset.disclosureFrameworks);
      setDisclosureRequirements(dataset.disclosureRequirements);
      setDisclosureMappings(dataset.disclosureMappings);
      setFinancialMateriality(dataset.financialMateriality);
      setImpactMateriality(dataset.impactMateriality);
      setAuditMateriality(dataset.auditMateriality);
      setAssuranceReports(dataset.assuranceReports);
      setReportSnapshots(dataset.reportSnapshots);

      // Phase 4 stores
      setAiAuditRequests(dataset.aiAuditRequests);
      setAiAuditResponses(dataset.aiAuditResponses);
      setBackupManifests(dataset.backupManifests);

      setErrorBanner(null);
      setRetryOperation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize IndexedDB storage.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  const clearErrorBanner = useCallback(() => {
    setErrorBanner(null);
    setRetryOperation(null);
  }, []);

  const toggleThemeMode = useCallback(async () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeModeState(nextMode);
    await setPersistedThemeMode(nextMode);
  }, [themeMode]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeEngagementId = useMemo(() => {
    if (filters.engagementId !== 'ALL') {
      return filters.engagementId;
    }
    return engagements.find((e) => e.engagementId === 'ENG-2025-002')?.engagementId ??
      engagements[0]?.engagementId ??
      'ENG-2025-002';
  }, [filters.engagementId, engagements]);

  const filteredData = useMemo(() => {
    return applyGlobalFilters(
      { engagements, assertions, controls, evidence, findings },
      filters
    );
  }, [engagements, assertions, controls, evidence, findings, filters]);

  const metrics = useMemo(() => {
    return calculateAssuranceReadinessMetrics(filteredData, evidence);
  }, [filteredData, evidence]);

  const phase2Metrics = useMemo(() => {
    return calculatePhase2DashboardMetrics({
      auditPlans,
      auditProcedures,
      designTests,
      operatingTests,
      sampleItems,
      emissionActivities,
      ghgRecalculations,
      auditFindings,
      reviews,
    });
  }, [
    auditPlans,
    auditProcedures,
    designTests,
    operatingTests,
    sampleItems,
    emissionActivities,
    ghgRecalculations,
    auditFindings,
    reviews,
  ]);

  const traceabilityResults = useMemo(() => {
    return evaluateAllDisclosureTraceability({
      engagementId: activeEngagementId,
      requirements: disclosureRequirements,
      mappings: disclosureMappings,
      assertions,
      controls,
      evidence,
      procedures: auditProcedures,
      sampleItems,
      designTests,
      operatingTests,
      emissionActivities,
      ghgRecalculations,
      auditFindings,
    });
  }, [
    activeEngagementId,
    disclosureRequirements,
    disclosureMappings,
    assertions,
    controls,
    evidence,
    auditProcedures,
    sampleItems,
    designTests,
    operatingTests,
    emissionActivities,
    ghgRecalculations,
    auditFindings,
  ]);

  const disclosureAnalytics = useMemo(() => {
    return calculateDisclosureCoverageAnalytics(
      disclosureFrameworks,
      disclosureRequirements,
      disclosureMappings,
      traceabilityResults,
      activeEngagementId
    );
  }, [
    disclosureFrameworks,
    disclosureRequirements,
    disclosureMappings,
    traceabilityResults,
    activeEngagementId,
  ]);

  const doubleMaterialityMatrix = useMemo(() => {
    return buildDoubleMaterialityMatrix(
      financialMateriality,
      impactMateriality,
      activeEngagementId
    );
  }, [financialMateriality, impactMateriality, activeEngagementId]);

  const buildReportContextForEngagement = useCallback(
    (engagementId: string): ReportGenerationContext => {
      const targetEngagement =
        engagements.find((e) => e.engagementId === engagementId) ??
        engagements[0] ?? {
          engagementId: 'ENG-2025-002',
          organizationId: 'ORG-ASTERION-001',
          engagementName: 'FY 2025 CSRD / ESRS Assurance Readiness Assessment',
          engagementObjective: 'Internal readiness assessment',
          reportingBoundary: 'Operational Control - Consolidated Manufacturing Operations',
          reportingYear: 'FY 2025',
          engagementType: 'ESG Assurance Readiness',
          assuranceLevel: 'Planned Limited Assurance Readiness',
          engagementStatus: 'Fieldwork',
          scopeDescription: 'Consolidated operations',
          plannedStartDate: '2025-09-01',
          plannedEndDate: '2026-03-31',
          methodologyVersion: 'CSRD / ISSA 5000 Readiness Framework v2.0',
          isSyntheticDemo: true,
          createdAt: '2025-08-20T09:00:00.000Z',
          updatedAt: '2026-01-15T09:00:00.000Z',
        };

      return {
        engagement: targetEngagement,
        assertions,
        controls,
        evidence,
        dqFindings: findings,
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
        disclosureFrameworks,
        disclosureRequirements,
        disclosureMappings,
        financialMateriality,
        impactMateriality,
        auditMateriality,
      };
    },
    [
      engagements,
      assertions,
      controls,
      evidence,
      findings,
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
      disclosureFrameworks,
      disclosureRequirements,
      disclosureMappings,
      financialMateriality,
      impactMateriality,
      auditMateriality,
    ]
  );

  const advancedAnalytics = useMemo(() => {
    const ctx = buildReportContextForEngagement(activeEngagementId);
    return calculateAdvancedAuditAnalytics(ctx);
  }, [buildReportContextForEngagement, activeEngagementId]);

  const saveEngagement = useCallback(
    async (
      data: Omit<AssuranceEngagement, 'engagementId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<AssuranceEngagement> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? engagements.find((e) => e.engagementId === existingId)
        : undefined;

      const engagementId =
        existingId ??
        `ENG-${data.reportingYear.replace(' ', '')}-${String(engagements.length + 1).padStart(3, '0')}`;

      const entity: AssuranceEngagement = {
        ...data,
        engagementId,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const executeSave = async (): Promise<AssuranceEngagement> => {
        const res = await saveEntityWithAuditAndRevalidate({
          storeName: STORES.ENGAGEMENTS,
          entity,
          auditEvent: {
            engagementId: entity.engagementId,
            entityType: 'AssuranceEngagement',
            entityId: entity.engagementId,
            action: existing ? 'ENGAGEMENT_UPDATED' : 'ENGAGEMENT_CREATED',
            actor: activeActor,
            previousValue: existing
              ? `${existing.engagementName} (${existing.engagementStatus})`
              : 'None',
            newValue: `${entity.engagementName} (${entity.engagementStatus} | ${entity.assuranceLevel})`,
          },
        });

        setEngagements((prev) => {
          const exists = prev.some((e) => e.engagementId === entity.engagementId);
          return exists
            ? prev.map((e) => (e.engagementId === entity.engagementId ? res.savedEntity : e))
            : [...prev, res.savedEntity];
        });
        setFindings(res.findings);
        setAuditEvents((prev) => [res.auditEvent, ...prev]);
        setErrorBanner(null);
        setRetryOperation(null);
        return res.savedEntity;
      };

      try {
        return await executeSave();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to persist engagement.';
        setErrorBanner(msg);
        setRetryOperation({
          label: `Retry saving engagement "${entity.engagementName}"`,
          retryFn: async () => {
            await executeSave();
          },
        });
        throw err;
      }
    },
    [engagements, activeActor]
  );

  const updateEngagementStatus = useCallback(
    async (engagementId: string, newStatus: EngagementStatus) => {
      const existing = engagements.find((e) => e.engagementId === engagementId);
      if (!existing) throw new Error(`Engagement ${engagementId} not found.`);
      const nowIso = new Date().toISOString();
      const updated: AssuranceEngagement = {
        ...existing,
        engagementStatus: newStatus,
        updatedAt: nowIso,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.ENGAGEMENTS,
        entity: updated,
        auditEvent: {
          engagementId,
          entityType: 'AssuranceEngagement',
          entityId: engagementId,
          action: newStatus === 'Archived' ? 'ENGAGEMENT_ARCHIVED' : 'ENGAGEMENT_STATUS_CHANGED',
          actor: activeActor,
          previousValue: existing.engagementStatus,
          newValue: newStatus,
        },
      });

      setEngagements((prev) =>
        prev.map((e) => (e.engagementId === engagementId ? res.savedEntity : e))
      );
      setFindings(res.findings);
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
    },
    [engagements, activeActor]
  );

  const saveAssertion = useCallback(
    async (
      data: Omit<ESGAssertion, 'assertionId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<ESGAssertion> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? assertions.find((a) => a.assertionId === existingId)
        : undefined;

      const assertionId =
        existingId ?? `AST-ASN-${String(assertions.length + 1).padStart(3, '0')}`;

      const normalizedReportedValue =
        data.valueBasis === 'Missing' || data.valueBasis === 'Not Applicable'
          ? null
          : data.reportedValue;

      const entity: ESGAssertion = {
        ...data,
        reportedValue: normalizedReportedValue,
        assertionId,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const executeSave = async (): Promise<ESGAssertion> => {
        const res = await saveEntityWithAuditAndRevalidate({
          storeName: STORES.ASSERTIONS,
          entity,
          auditEvent: {
            engagementId: entity.engagementId,
            entityType: 'ESGAssertion',
            entityId: entity.assertionId,
            action: existing ? 'ASSERTION_UPDATED' : 'ASSERTION_CREATED',
            actor: activeActor,
            previousValue: existing
              ? `${existing.metricCode}: ${existing.reportedValue ?? 'NULL'} ${existing.unit} (${existing.reviewStatus})`
              : 'None',
            newValue: `${entity.metricCode}: ${entity.reportedValue ?? 'NULL'} ${entity.unit} [Basis: ${entity.valueBasis} | Status: ${entity.reviewStatus}]`,
          },
        });

        setAssertions((prev) => {
          const exists = prev.some((a) => a.assertionId === entity.assertionId);
          return exists
            ? prev.map((a) => (a.assertionId === entity.assertionId ? res.savedEntity : a))
            : [...prev, res.savedEntity];
        });
        setFindings(res.findings);
        setAuditEvents((prev) => [res.auditEvent, ...prev]);
        setErrorBanner(null);
        setRetryOperation(null);
        return res.savedEntity;
      };

      try {
        return await executeSave();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to persist ESG assertion.';
        setErrorBanner(msg);
        setRetryOperation({
          label: `Retry saving assertion "${entity.metricCode}"`,
          retryFn: async () => {
            await executeSave();
          },
        });
        throw err;
      }
    },
    [assertions, activeActor]
  );

  const archiveAssertion = useCallback(
    async (assertionId: string) => {
      const existing = assertions.find((a) => a.assertionId === assertionId);
      if (!existing) throw new Error(`Assertion ${assertionId} not found.`);
      const nowIso = new Date().toISOString();
      const updated: ESGAssertion = {
        ...existing,
        reviewStatus: 'Archived',
        updatedAt: nowIso,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.ASSERTIONS,
        entity: updated,
        auditEvent: {
          engagementId: existing.engagementId,
          entityType: 'ESGAssertion',
          entityId: assertionId,
          action: 'ASSERTION_ARCHIVED',
          actor: activeActor,
          previousValue: existing.reviewStatus,
          newValue: 'Archived',
        },
      });

      setAssertions((prev) =>
        prev.map((a) => (a.assertionId === assertionId ? res.savedEntity : a))
      );
      setFindings(res.findings);
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
    },
    [assertions, activeActor]
  );

  const saveControl = useCallback(
    async (
      data: Omit<InternalControl, 'controlId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<InternalControl> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? controls.find((c) => c.controlId === existingId)
        : undefined;

      const controlId =
        existingId ?? `AST-CTL-${String(controls.length + 1).padStart(3, '0')}`;

      const entity: InternalControl = {
        ...data,
        controlId,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const executeSave = async (): Promise<InternalControl> => {
        const res = await saveEntityWithAuditAndRevalidate({
          storeName: STORES.CONTROLS,
          entity,
          auditEvent: {
            engagementId: entity.engagementId,
            entityType: 'InternalControl',
            entityId: entity.controlId,
            action: existing ? 'CONTROL_UPDATED' : 'CONTROL_CREATED',
            actor: activeActor,
            previousValue: existing
              ? `${existing.controlCode} (Owner: ${existing.controlOwner} | Design: ${existing.designStatus})`
              : 'None',
            newValue: `${entity.controlCode} (Owner: ${entity.controlOwner} | Design: ${entity.designStatus})`,
          },
        });

        setControls((prev) => {
          const exists = prev.some((c) => c.controlId === entity.controlId);
          return exists
            ? prev.map((c) => (c.controlId === entity.controlId ? res.savedEntity : c))
            : [...prev, res.savedEntity];
        });
        setFindings(res.findings);
        setAuditEvents((prev) => [res.auditEvent, ...prev]);
        setErrorBanner(null);
        setRetryOperation(null);
        return res.savedEntity;
      };

      try {
        return await executeSave();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to persist internal control.';
        setErrorBanner(msg);
        setRetryOperation({
          label: `Retry saving control "${entity.controlCode}"`,
          retryFn: async () => {
            await executeSave();
          },
        });
        throw err;
      }
    },
    [controls, activeActor]
  );

  const uploadEvidence = useCallback(
    async (params: {
      file: File;
      engagementId: string;
      linkedEntityType: LinkedEntityType;
      linkedEntityId: string;
      evidenceType: EvidenceRecord['evidenceType'];
      reviewerNotes: string;
    }): Promise<EvidenceRecord> => {
      const validation = validateEvidenceFile(params.file);
      if (!validation.valid) {
        throw new Error(validation.error ?? 'Invalid file upload.');
      }

      const arrayBuffer = await params.file.arrayBuffer();
      const checksum = await computeSha256Hex(arrayBuffer);
      const nowIso = new Date().toISOString();
      const evidenceId = `EVD-UPL-${String(evidence.length + 1).padStart(3, '0')}`;

      const newRecord: EvidenceRecord = {
        evidenceId,
        engagementId: params.engagementId,
        linkedEntityType: params.linkedEntityType,
        linkedEntityId: params.linkedEntityId,
        evidenceType: params.evidenceType,
        documentName: params.file.name,
        mimeType: params.file.type,
        fileSize: params.file.size,
        checksum,
        verificationStatus: 'Uploaded - Pending Review',
        isMetadataOnlyDemo: false,
        reviewerNotes: params.reviewerNotes.trim() || 'Uploaded binary evidence file.',
        uploadedAt: nowIso,
        reviewedAt: null,
      };

      const res = await saveUploadedEvidenceWithBlob({
        evidence: newRecord,
        blobBytes: arrayBuffer,
        actor: activeActor,
      });

      setEvidence((prev) => [res.evidence, ...prev]);
      if (params.linkedEntityType === 'ESGAssertion') {
        setAssertions((prev) =>
          prev.map((a) =>
            a.assertionId === params.linkedEntityId &&
            !a.linkedEvidenceIds.includes(res.evidence.evidenceId)
              ? { ...a, linkedEvidenceIds: [...a.linkedEvidenceIds, res.evidence.evidenceId] }
              : a
          )
        );
      } else if (params.linkedEntityType === 'InternalControl') {
        setControls((prev) =>
          prev.map((c) =>
            c.controlId === params.linkedEntityId &&
            !c.linkedEvidenceIds.includes(res.evidence.evidenceId)
              ? { ...c, linkedEvidenceIds: [...c.linkedEvidenceIds, res.evidence.evidenceId] }
              : c
          )
        );
      }
      setFindings(res.findings);
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.evidence;
    },
    [evidence.length, activeActor]
  );

  const reviewEvidence = useCallback(
    async (
      evidenceId: string,
      newStatus: EvidenceVerificationStatus,
      reviewerNotes: string
    ) => {
      const existing = evidence.find((ev) => ev.evidenceId === evidenceId);
      if (!existing) throw new Error(`Evidence ${evidenceId} not found.`);

      if (existing.isMetadataOnlyDemo && newStatus === 'Accepted') {
        throw new Error(
          'Unavailable metadata-only demonstration references cannot be marked as Accepted/Verified. Upload an actual binary evidence file first.'
        );
      }

      const nowIso = new Date().toISOString();
      const updated: EvidenceRecord = {
        ...existing,
        verificationStatus: newStatus,
        reviewerNotes: reviewerNotes.trim() || existing.reviewerNotes,
        reviewedAt: nowIso,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.EVIDENCE,
        entity: updated,
        auditEvent: {
          engagementId: existing.engagementId,
          entityType: 'EvidenceRecord',
          entityId: evidenceId,
          action: 'EVIDENCE_REVIEW_STATUS_UPDATED',
          actor: activeActor,
          previousValue: existing.verificationStatus,
          newValue: `${newStatus} | Notes: ${updated.reviewerNotes}`,
        },
      });

      setEvidence((prev) =>
        prev.map((ev) => (ev.evidenceId === evidenceId ? res.savedEntity : ev))
      );
      setFindings(res.findings);
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
    },
    [evidence, activeActor]
  );

  const downloadEvidence = useCallback(
    async (evidenceId: string) => {
      const record = evidence.find((ev) => ev.evidenceId === evidenceId);
      if (!record) {
        throw new Error(`Evidence record ${evidenceId} not found.`);
      }
      if (record.isMetadataOnlyDemo) {
        throw new Error(
          'This record is a synthetic metadata-only demonstration reference and has no binary payload to download.'
        );
      }
      const blobRecord = await getEvidenceBlob(evidenceId);
      if (!blobRecord || !blobRecord.bytes) {
        throw new Error('Binary file payload was not found in IndexedDB.');
      }

      const blob = new Blob([blobRecord.bytes], { type: record.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = record.documentName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    [evidence]
  );

  const resolveFinding = useCallback(
    async (findingId: string, resolutionNote: string) => {
      const res = await markFindingResolvedInStore(findingId, resolutionNote, activeActor);
      setFindings((prev) =>
        prev.map((f) => (f.findingId === findingId ? res.finding : f))
      );
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
    },
    [activeActor]
  );

  const triggerDeterministicRevalidation = useCallback(async () => {
    const updatedFindings = await revalidateAndPersistFindings();
    setFindings(updatedFindings);
    return updatedFindings;
  }, []);

  const resetDemoDataset = useCallback(async () => {
    await loadAll(true);
  }, [loadAll]);

  // ============================================================================
  // PHASE 2 ACTIONS
  // ============================================================================

  const saveAuditPlan = useCallback(
    async (
      data: Omit<AuditPlan, 'auditPlanId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<AuditPlan> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? auditPlans.find((p) => p.auditPlanId === existingId)
        : undefined;
      const auditPlanId =
        existingId ??
        `APL-${data.reportingYear.replace(' ', '')}-${String(auditPlans.length + 1).padStart(3, '0')}`;

      const entity: AuditPlan = {
        ...data,
        auditPlanId,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.AUDIT_PLANS,
        entity,
        auditEvent: {
          engagementId: entity.engagementId,
          entityType: 'AuditPlan',
          entityId: entity.auditPlanId,
          action: existing ? 'AUDIT_PLAN_UPDATED' : 'AUDIT_PLAN_CREATED',
          actor: activeActor,
          previousValue: existing ? `${existing.status} | Mat: ${existing.planningMateriality}` : 'None',
          newValue: `${entity.status} | Mat: ${entity.planningMateriality} ${entity.materialityUnit}`,
        },
      });

      setAuditPlans((prev) => {
        const exists = prev.some((p) => p.auditPlanId === entity.auditPlanId);
        return exists
          ? prev.map((p) => (p.auditPlanId === entity.auditPlanId ? res.savedEntity : p))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [auditPlans, activeActor]
  );

  const saveAuditProcedure = useCallback(
    async (
      data: Omit<AuditProcedure, 'procedureId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<AuditProcedure> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? auditProcedures.find((p) => p.procedureId === existingId)
        : undefined;
      const procedureId =
        existingId ?? `PRC-${String(auditProcedures.length + 1).padStart(3, '0')}`;

      const entity: AuditProcedure = {
        ...data,
        procedureId,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const parentPlan = auditPlans.find((p) => p.auditPlanId === entity.auditPlanId);

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.AUDIT_PROCEDURES,
        entity,
        auditEvent: {
          engagementId: parentPlan?.engagementId ?? 'ENG-2025-002',
          entityType: 'AuditProcedure',
          entityId: entity.procedureId,
          action: existing ? 'AUDIT_PROCEDURE_UPDATED' : 'AUDIT_PROCEDURE_CREATED',
          actor: activeActor,
          previousValue: existing ? `${existing.procedureName} (${existing.status})` : 'None',
          newValue: `${entity.procedureName} [${entity.procedureType} | ${entity.status}]`,
        },
      });

      setAuditProcedures((prev) => {
        const exists = prev.some((p) => p.procedureId === entity.procedureId);
        return exists
          ? prev.map((p) => (p.procedureId === entity.procedureId ? res.savedEntity : p))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [auditProcedures, auditPlans, activeActor]
  );

  const saveRiskAssessment = useCallback(
    async (
      params: {
        engagementId: string;
        linkedAssertionId: string;
        linkedControlId: string;
        riskCategory: RiskCategory;
        likelihood: number;
        impact: number;
        controlEffectivenessBasis: string | null;
        controlRiskScore: number | null;
        assessmentRationale: string;
        evidenceReferences: string[];
        assessedBy: string;
      },
      existingId?: string
    ): Promise<RiskAssessment> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? riskAssessments.find((r) => r.riskAssessmentId === existingId)
        : undefined;
      const riskAssessmentId =
        existingId ?? `RSK-${String(riskAssessments.length + 1).padStart(3, '0')}`;

      const targetControl = controls.find((c) => c.controlId === params.linkedControlId);
      const controlIsTestedAndEffective =
        targetControl?.operatingStatus === 'Operating Effectively';

      const evaluated = evaluateRiskAssessment({
        riskAssessmentId,
        engagementId: params.engagementId,
        linkedAssertionId: params.linkedAssertionId,
        linkedControlId: params.linkedControlId,
        riskCategory: params.riskCategory,
        likelihood: params.likelihood,
        impact: params.impact,
        controlEffectivenessBasis: params.controlEffectivenessBasis,
        controlRiskScore: params.controlRiskScore,
        controlIsTestedAndEffective:
          Boolean(params.controlEffectivenessBasis && params.controlEffectivenessBasis.trim().length >= 5) ||
          controlIsTestedAndEffective,
        assessmentRationale: params.assessmentRationale,
        evidenceReferences: params.evidenceReferences,
        assessedBy: params.assessedBy,
        assessedAt: nowIso,
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.RISK_ASSESSMENTS,
        entity: evaluated,
        auditEvent: {
          engagementId: evaluated.engagementId,
          entityType: 'RiskAssessment',
          entityId: evaluated.riskAssessmentId,
          action: existing ? 'RISK_ASSESSMENT_UPDATED' : 'RISK_ASSESSMENT_CREATED',
          actor: activeActor,
          previousValue: existing
            ? `Inherent: ${existing.inherentRiskScore} (${existing.inherentRiskBand}) | Residual: ${existing.residualRiskScore ?? 'Unassessed'}`
            : 'None',
          newValue: `Inherent: ${evaluated.inherentRiskScore} (${evaluated.inherentRiskBand}) | Residual: ${evaluated.residualRiskScore ?? 'Unassessed'} (${evaluated.residualRiskBand})`,
        },
      });

      setRiskAssessments((prev) => {
        const exists = prev.some((r) => r.riskAssessmentId === evaluated.riskAssessmentId);
        return exists
          ? prev.map((r) =>
              r.riskAssessmentId === evaluated.riskAssessmentId ? res.savedEntity : r
            )
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [riskAssessments, controls, activeActor]
  );

  const createSamplingPlanAndSelectItems = useCallback(
    async (params: {
      procedureId: string;
      populationId: string;
      samplingMethod: SamplingMethod;
      requestedSampleSize: number;
      randomSeed: number;
      judgmentalRationale?: string;
      riskCriteria?: string;
      customPopulation?: PopulationItemRecord[];
    }): Promise<{ plan: SamplingPlan; items: SampleItem[] }> => {
      const samplingPlanId = `SMP-${String(samplingPlans.length + 1).padStart(3, '0')}`;
      const nowIso = new Date().toISOString();

      const populationRecords: PopulationItemRecord[] =
        params.customPopulation && params.customPopulation.length > 0
          ? params.customPopulation
          : Array.from({ length: Math.max(20, params.requestedSampleSize * 3) }, (_, idx) => {
              const fac = facilities[idx % Math.max(1, facilities.length)];
              return {
                recordId: `POP-${params.procedureId}-${String(idx + 1).padStart(3, '0')}`,
                label: `Meter / Voucher Record #${idx + 1}`,
                bookValue: 500 + ((idx * 317) % 4500),
                facilityId: fac?.facilityId ?? 'FAC-DE-01',
                riskFlagged: idx % 4 === 0,
              };
            });

      const execution = executeAuditSampling({
        samplingPlanId,
        procedureId: params.procedureId,
        populationId: params.populationId,
        populationRecords,
        samplingMethod: params.samplingMethod,
        requestedSampleSize: params.requestedSampleSize,
        randomSeed: params.randomSeed,
        judgmentalRationale: params.judgmentalRationale,
        riskCriteria: params.riskCriteria ?? 'High Risk & Volume Threshold',
        selectionTimestamp: nowIso,
      });

      const saved = await saveSamplingPlanWithItems({
        plan: execution.plan,
        items: execution.items,
        actor: activeActor,
      });

      setSamplingPlans((prev) => [...prev, saved.plan]);
      setSampleItems((prev) => [...prev, ...saved.items]);
      setAuditEvents((prev) => [saved.auditEvent, ...prev]);

      return { plan: saved.plan, items: saved.items };
    },
    [samplingPlans.length, facilities, activeActor]
  );

  const updateSampleItemResult = useCallback(
    async (
      sampleItemId: string,
      updates: {
        testingStatus: SampleTestingStatus;
        exceptionNotes?: string;
        linkedEvidenceIds?: string[];
      }
    ): Promise<SampleItem> => {
      const existing = sampleItems.find((s) => s.sampleItemId === sampleItemId);
      if (!existing) throw new Error(`Sample item ${sampleItemId} not found.`);

      const updated: SampleItem = {
        ...existing,
        ...updates,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.SAMPLE_ITEMS,
        entity: updated,
        auditEvent: {
          engagementId: 'ENG-2025-002',
          entityType: 'SampleItem',
          entityId: sampleItemId,
          action: 'SAMPLE_ITEM_TESTED',
          actor: activeActor,
          previousValue: existing.testingStatus,
          newValue: updated.testingStatus,
        },
      });

      setSampleItems((prev) =>
        prev.map((s) => (s.sampleItemId === sampleItemId ? res.savedEntity : s))
      );
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [sampleItems, activeActor]
  );

  const saveDesignTest = useCallback(
    async (
      data: Omit<DesignTest, 'designTestId' | 'testedAt'>,
      existingId?: string
    ): Promise<DesignTest> => {
      const nowIso = new Date().toISOString();
      const designTestId =
        existingId ?? `DT-${String(designTests.length + 1).padStart(3, '0')}`;

      const entity: DesignTest = {
        ...data,
        designTestId,
        testedAt: nowIso,
      };

      const evidenceMap = new Map(evidence.map((ev) => [ev.evidenceId, ev]));
      const check = validateDesignTestGuardrails(entity, evidenceMap);
      if (!check.valid) {
        throw new Error(check.errors.join(' '));
      }

      const existing = existingId
        ? designTests.find((d) => d.designTestId === existingId)
        : undefined;

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.DESIGN_TESTS,
        entity,
        auditEvent: {
          engagementId: 'ENG-2025-002',
          entityType: 'DesignTest',
          entityId: entity.designTestId,
          action: existing ? 'DESIGN_TEST_UPDATED' : 'DESIGN_TEST_CREATED',
          actor: activeActor,
          previousValue: existing ? existing.testResult : 'None',
          newValue: `${entity.testResult} (${entity.reviewStatus})`,
        },
      });

      setDesignTests((prev) => {
        const exists = prev.some((d) => d.designTestId === entity.designTestId);
        return exists
          ? prev.map((d) => (d.designTestId === entity.designTestId ? res.savedEntity : d))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [designTests, evidence, activeActor]
  );

  const saveOperatingTest = useCallback(
    async (
      data: Omit<OperatingTest, 'operatingTestId' | 'testedAt'>,
      existingId?: string
    ): Promise<OperatingTest> => {
      const nowIso = new Date().toISOString();
      const operatingTestId =
        existingId ?? `OT-${String(operatingTests.length + 1).padStart(3, '0')}`;

      const entity: OperatingTest = {
        ...data,
        operatingTestId,
        testedAt: nowIso,
      };

      const linkedSampleItems = sampleItems.filter(
        (s) => s.samplingPlanId === entity.samplingPlanId
      );
      const evidenceMap = new Map(evidence.map((ev) => [ev.evidenceId, ev]));

      const check = validateOperatingTestGuardrails({
        test: entity,
        linkedSampleItems,
        availableEvidenceMap: evidenceMap,
      });
      if (!check.valid) {
        throw new Error(check.errors.join(' '));
      }

      const existing = existingId
        ? operatingTests.find((o) => o.operatingTestId === existingId)
        : undefined;

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.OPERATING_TESTS,
        entity,
        auditEvent: {
          engagementId: 'ENG-2025-002',
          entityType: 'OperatingTest',
          entityId: entity.operatingTestId,
          action: existing ? 'OPERATING_TEST_UPDATED' : 'OPERATING_TEST_CREATED',
          actor: activeActor,
          previousValue: existing
            ? `${existing.conclusion} (${existing.reviewStatus})`
            : 'None',
          newValue: `${entity.conclusion} | Exceptions: ${entity.exceptions} | Status: ${entity.reviewStatus}`,
        },
      });

      setOperatingTests((prev) => {
        const exists = prev.some((o) => o.operatingTestId === entity.operatingTestId);
        return exists
          ? prev.map((o) => (o.operatingTestId === entity.operatingTestId ? res.savedEntity : o))
          : [...prev, res.savedEntity];
      });

      const targetControl = controls.find((c) => c.controlId === entity.controlId);
      if (targetControl && entity.reviewStatus === 'Approved') {
        const mappedStatus =
          entity.conclusion === 'Operating Effectively'
            ? 'Operating Effectively'
            : entity.conclusion === 'Operating Ineffectively'
              ? 'Operating Ineffectively'
              : 'Inconclusive';
        const updatedControl: InternalControl = {
          ...targetControl,
          operatingStatus: mappedStatus,
          lastReviewedDate: nowIso.slice(0, 10),
          updatedAt: nowIso,
        };
        const ctlRes = await saveEntityWithAuditAndRevalidate({
          storeName: STORES.CONTROLS,
          entity: updatedControl,
          auditEvent: {
            engagementId: targetControl.engagementId,
            entityType: 'InternalControl',
            entityId: targetControl.controlId,
            action: 'CONTROL_OPERATING_STATUS_UPDATED',
            actor: activeActor,
            previousValue: targetControl.operatingStatus,
            newValue: mappedStatus,
          },
        });
        setControls((prev) =>
          prev.map((c) => (c.controlId === targetControl.controlId ? ctlRes.savedEntity : c))
        );
        setFindings(ctlRes.findings);
      }

      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [operatingTests, sampleItems, evidence, controls, activeActor]
  );

  const runGhgShadowRecalculation = useCallback(
    async (
      activityId: string,
      emissionFactorId?: string,
      customThresholds?: VarianceThresholdConfig
    ): Promise<GHGRecalculationResult> => {
      const activity = emissionActivities.find((a) => a.activityId === activityId);
      if (!activity) {
        throw new Error(`Emission activity record ${activityId} not found.`);
      }
      const existingRecalc = ghgRecalculations.find((r) => r.activityId === activityId);
      const targetFactorId =
        emissionFactorId ?? existingRecalc?.emissionFactorId ?? emissionFactors[0]?.emissionFactorId;
      const factor = emissionFactors.find((f) => f.emissionFactorId === targetFactorId);
      if (!factor) {
        throw new Error(`Emission factor ${targetFactorId} not found.`);
      }

      const recalculationId =
        existingRecalc?.recalculationId ??
        `REC-${String(ghgRecalculations.length + 1).padStart(3, '0')}`;

      const result = executeGhgShadowRecalculation({
        recalculationId,
        activity,
        factor,
        thresholds: customThresholds,
        calculationTimestamp: new Date().toISOString(),
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.GHG_RECALCULATIONS,
        entity: result,
        auditEvent: {
          engagementId: activity.engagementId,
          entityType: 'GHGRecalculation',
          entityId: result.recalculationId,
          action: 'GHG_SHADOW_RECALCULATION_EXECUTED',
          actor: activeActor,
          previousValue: existingRecalc
            ? `Reported: ${existingRecalc.reportedEmissions} | Calc: ${existingRecalc.calculatedEmissions} (${existingRecalc.varianceStatus})`
            : 'None',
          newValue: `Reported: ${result.reportedEmissions} | Calc: ${result.calculatedEmissions} tCO2e | Var: ${result.percentageVariance !== null ? `${result.percentageVariance}%` : 'NULL (0 denom)'} | ${result.varianceStatus}`,
        },
      });

      setGhgRecalculations((prev) => {
        const exists = prev.some((r) => r.recalculationId === result.recalculationId);
        return exists
          ? prev.map((r) => (r.recalculationId === result.recalculationId ? res.savedEntity : r))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [emissionActivities, emissionFactors, ghgRecalculations, activeActor]
  );

  const saveEmissionActivity = useCallback(
    async (
      data: EmissionActivityRecord,
      emissionFactorId: string
    ): Promise<{ activity: EmissionActivityRecord; recalculation: GHGRecalculationResult }> => {
      const existing = emissionActivities.find((a) => a.activityId === data.activityId);

      const actRes = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.EMISSION_ACTIVITIES,
        entity: data,
        auditEvent: {
          engagementId: data.engagementId,
          entityType: 'EmissionActivity',
          entityId: data.activityId,
          action: existing ? 'EMISSION_ACTIVITY_UPDATED' : 'EMISSION_ACTIVITY_CREATED',
          actor: activeActor,
          previousValue: existing
            ? `${existing.activityQuantity} ${existing.activityUnit} (Reported: ${existing.reportedEmissions} tCO2e)`
            : 'None',
          newValue: `${data.activityQuantity} ${data.activityUnit} (Reported: ${data.reportedEmissions} tCO2e)`,
        },
      });

      setEmissionActivities((prev) => {
        const exists = prev.some((a) => a.activityId === data.activityId);
        return exists
          ? prev.map((a) => (a.activityId === data.activityId ? actRes.savedEntity : a))
          : [...prev, actRes.savedEntity];
      });

      const factor =
        emissionFactors.find((f) => f.emissionFactorId === emissionFactorId) ??
        emissionFactors[0];
      const existingRecalc = ghgRecalculations.find((r) => r.activityId === data.activityId);
      const recalculationId =
        existingRecalc?.recalculationId ??
        `REC-${String(ghgRecalculations.length + 1).padStart(3, '0')}`;

      const recalc = executeGhgShadowRecalculation({
        recalculationId,
        activity: data,
        factor,
        calculationTimestamp: new Date().toISOString(),
      });

      const recRes = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.GHG_RECALCULATIONS,
        entity: recalc,
        auditEvent: {
          engagementId: data.engagementId,
          entityType: 'GHGRecalculation',
          entityId: recalc.recalculationId,
          action: 'GHG_SHADOW_RECALCULATION_AUTO_UPDATED',
          actor: activeActor,
          previousValue: existingRecalc ? existingRecalc.varianceStatus : 'None',
          newValue: `${recalc.varianceStatus} (Calc: ${recalc.calculatedEmissions} tCO2e)`,
        },
      });

      setGhgRecalculations((prev) => {
        const exists = prev.some((r) => r.recalculationId === recalc.recalculationId);
        return exists
          ? prev.map((r) =>
              r.recalculationId === recalc.recalculationId ? recRes.savedEntity : r
            )
          : [...prev, recRes.savedEntity];
      });
      setAuditEvents((prev) => [recRes.auditEvent, actRes.auditEvent, ...prev]);

      return { activity: actRes.savedEntity, recalculation: recRes.savedEntity };
    },
    [emissionActivities, emissionFactors, ghgRecalculations, activeActor]
  );

  const saveEmissionFactor = useCallback(
    async (data: EmissionFactorRecord): Promise<EmissionFactorRecord> => {
      const existing = emissionFactors.find(
        (f) => f.emissionFactorId === data.emissionFactorId
      );
      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.EMISSION_FACTORS,
        entity: data,
        auditEvent: {
          engagementId: 'ENG-2025-002',
          entityType: 'EmissionFactor',
          entityId: data.emissionFactorId,
          action: existing ? 'EMISSION_FACTOR_UPDATED' : 'EMISSION_FACTOR_CREATED',
          actor: activeActor,
          previousValue: existing
            ? `${existing.factorValue} ${existing.numeratorUnit}/${existing.denominatorUnit}`
            : 'None',
          newValue: `${data.factorSource} ${data.factorVersion}: ${data.factorValue} ${data.numeratorUnit}/${data.denominatorUnit}`,
        },
      });

      setEmissionFactors((prev) => {
        const exists = prev.some((f) => f.emissionFactorId === data.emissionFactorId);
        return exists
          ? prev.map((f) =>
              f.emissionFactorId === data.emissionFactorId ? res.savedEntity : f
            )
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [emissionFactors, activeActor]
  );

  const saveAuditFinding = useCallback(
    async (
      data: Omit<AuditFinding, 'auditFindingId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<AuditFinding> => {
      const nowIso = new Date().toISOString();
      const existing = existingId
        ? auditFindings.find((f) => f.auditFindingId === existingId)
        : undefined;
      const auditFindingId =
        existingId ?? `AFN-2025-${String(auditFindings.length + 1).padStart(3, '0')}`;

      const entity: AuditFinding = {
        ...data,
        auditFindingId,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };

      const evidenceMap = new Map(evidence.map((ev) => [ev.evidenceId, ev]));
      const check = validateAuditFindingClosure(entity, evidenceMap);
      if (!check.valid) {
        throw new Error(check.errors.join(' '));
      }

      const actionLabel =
        existing?.remediationStatus === 'Closed' && entity.remediationStatus !== 'Closed'
          ? 'AUDIT_FINDING_REOPENED'
          : entity.remediationStatus === 'Closed'
            ? 'AUDIT_FINDING_CLOSED'
            : existing
              ? 'AUDIT_FINDING_UPDATED'
              : 'AUDIT_FINDING_CREATED';

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.AUDIT_FINDINGS,
        entity,
        auditEvent: {
          engagementId: entity.engagementId,
          entityType: 'AuditFinding',
          entityId: entity.auditFindingId,
          action: actionLabel,
          actor: activeActor,
          previousValue: existing
            ? `${existing.remediationStatus} | Retest: ${existing.retestStatus}`
            : 'None',
          newValue: `${entity.remediationStatus} | Severity: ${entity.severity} | Retest: ${entity.retestStatus}`,
        },
      });

      setAuditFindings((prev) => {
        const exists = prev.some((f) => f.auditFindingId === entity.auditFindingId);
        return exists
          ? prev.map((f) =>
              f.auditFindingId === entity.auditFindingId ? res.savedEntity : f
            )
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [auditFindings, evidence, activeActor]
  );

  const submitReviewDecision = useCallback(
    async (params: {
      engagementId: string;
      entityType: ReviewRecord['entityType'];
      entityId: string;
      preparedBy: string;
      reviewedBy: string | null;
      targetStatus: ReviewWorkflowStatus;
      reviewComments: string;
    }): Promise<ReviewRecord> => {
      const reviewId = `REV-${String(reviews.length + 1).padStart(3, '0')}`;
      const record = createReviewTransitionRecord({
        reviewId,
        engagementId: params.engagementId,
        entityType: params.entityType,
        entityId: params.entityId,
        preparedBy: params.preparedBy,
        reviewedBy: params.reviewedBy,
        targetStatus: params.targetStatus,
        reviewComments: params.reviewComments,
        nowIso: new Date().toISOString(),
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.REVIEWS,
        entity: record,
        auditEvent: {
          engagementId: record.engagementId,
          entityType: 'ReviewRecord',
          entityId: record.reviewId,
          action: `REVIEW_${record.reviewStatus.toUpperCase().replace(/\s+/g, '_')}`,
          actor: params.reviewedBy ?? activeActor,
          previousValue: `Prepared by ${record.preparedBy}`,
          newValue: `${record.entityType} (${record.entityId}) -> ${record.reviewStatus} by ${record.reviewedBy ?? 'N/A'}`,
        },
      });

      setReviews((prev) => [res.savedEntity, ...prev]);
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [reviews.length, activeActor]
  );

  // ============================================================================
  // PHASE 3 ACTIONS
  // ============================================================================

  const saveDisclosureFramework = useCallback(
    async (
      data: Omit<DisclosureFramework, 'frameworkId' | 'createdAt'>,
      existingId?: string
    ): Promise<DisclosureFramework> => {
      const frameworkId =
        existingId ?? `FWK-CUST-${String(disclosureFrameworks.length + 1).padStart(3, '0')}`;
      const prepared = validateAndPrepareFramework(data, frameworkId);

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.DISCLOSURE_FRAMEWORKS,
        entity: prepared,
        auditEvent: {
          engagementId: activeEngagementId,
          entityType: 'DisclosureFramework',
          entityId: prepared.frameworkId,
          action: existingId ? 'FRAMEWORK_UPDATED' : 'FRAMEWORK_CREATED',
          actor: activeActor,
          previousValue: existingId ? 'Existing Framework' : 'None',
          newValue: `${prepared.frameworkName} (${prepared.frameworkVersion})`,
        },
      });

      setDisclosureFrameworks((prev) => {
        const exists = prev.some((f) => f.frameworkId === prepared.frameworkId);
        return exists
          ? prev.map((f) => (f.frameworkId === prepared.frameworkId ? res.savedEntity : f))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [disclosureFrameworks.length, activeEngagementId, activeActor]
  );

  const saveDisclosureRequirement = useCallback(
    async (
      data: Omit<DisclosureRequirement, 'requirementId'>,
      existingId?: string
    ): Promise<DisclosureRequirement> => {
      const requirementId =
        existingId ?? `REQ-CUST-${String(disclosureRequirements.length + 1).padStart(3, '0')}`;
      const prepared = validateAndPrepareRequirement({
        input: data,
        existingRequirements: disclosureRequirements,
        existingFrameworks: disclosureFrameworks,
        requirementId,
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.DISCLOSURE_REQUIREMENTS,
        entity: prepared,
        auditEvent: {
          engagementId: activeEngagementId,
          entityType: 'DisclosureRequirement',
          entityId: prepared.requirementId,
          action: existingId ? 'REQUIREMENT_UPDATED' : 'REQUIREMENT_CREATED',
          actor: activeActor,
          previousValue: existingId ? 'Existing Requirement' : 'None',
          newValue: `${prepared.requirementCode} — ${prepared.requirementTitle} (${prepared.applicabilityStatus})`,
        },
      });

      setDisclosureRequirements((prev) => {
        const exists = prev.some((r) => r.requirementId === prepared.requirementId);
        return exists
          ? prev.map((r) => (r.requirementId === prepared.requirementId ? res.savedEntity : r))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [disclosureRequirements, disclosureFrameworks, activeEngagementId, activeActor]
  );

  const importRequirementCatalog = useCallback(
    async (rawItems: unknown[]): Promise<DisclosureRequirement[]> => {
      const validated = validateAndImportRequirementCatalog({
        rawItems,
        existingRequirements: disclosureRequirements,
        existingFrameworks: disclosureFrameworks,
      });

      const saved = await saveImportedRequirementsBatch({
        requirements: validated,
        engagementId: activeEngagementId,
        actor: activeActor,
      });

      setDisclosureRequirements((prev) => [...prev, ...saved.requirements]);
      setAuditEvents((prev) => [saved.auditEvent, ...prev]);
      return saved.requirements;
    },
    [disclosureRequirements, disclosureFrameworks, activeEngagementId, activeActor]
  );

  const saveDisclosureMapping = useCallback(
    async (
      data: Omit<DisclosureMapping, 'mappingId' | 'updatedAt'>,
      existingId?: string
    ): Promise<DisclosureMapping> => {
      const mappingId =
        existingId ??
        disclosureMappings.find(
          (m) => m.engagementId === data.engagementId && m.requirementId === data.requirementId
        )?.mappingId ??
        `MAP-${String(disclosureMappings.length + 1).padStart(3, '0')}`;

      const prepared = validateDisclosureMappingInput({
        input: data,
        existingFrameworks: disclosureFrameworks,
        existingRequirements: disclosureRequirements,
        mappingId,
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.DISCLOSURE_MAPPINGS,
        entity: prepared,
        auditEvent: {
          engagementId: prepared.engagementId,
          entityType: 'DisclosureMapping',
          entityId: prepared.mappingId,
          action: existingId ? 'DISCLOSURE_MAPPING_UPDATED' : 'DISCLOSURE_MAPPING_SAVED',
          actor: activeActor,
          previousValue: existingId ? 'Existing Mapping' : 'Unmapped',
          newValue: `${prepared.requirementId}: ${prepared.mappingStatus} (${prepared.coveragePercentage}%)`,
        },
      });

      setDisclosureMappings((prev) => {
        const exists = prev.some((m) => m.mappingId === prepared.mappingId);
        return exists
          ? prev.map((m) => (m.mappingId === prepared.mappingId ? res.savedEntity : m))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [disclosureMappings, disclosureFrameworks, disclosureRequirements, activeActor]
  );

  const saveFinancialMateriality = useCallback(
    async (
      data: Omit<
        FinancialMaterialityAssessment,
        'assessmentId' | 'financialMaterialityScore' | 'isFinanciallyMaterial' | 'updatedAt'
      >,
      existingId?: string
    ): Promise<FinancialMaterialityAssessment> => {
      const assessmentId =
        existingId ?? `FIN-MAT-${String(financialMateriality.length + 1).padStart(3, '0')}`;
      const evaluated = evaluateFinancialMateriality({
        ...data,
        assessmentId,
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.FINANCIAL_MATERIALITY,
        entity: evaluated,
        auditEvent: {
          engagementId: evaluated.engagementId,
          entityType: 'FinancialMateriality',
          entityId: evaluated.assessmentId,
          action: existingId ? 'FINANCIAL_MATERIALITY_UPDATED' : 'FINANCIAL_MATERIALITY_ASSESSED',
          actor: activeActor,
          previousValue: existingId ? 'Existing Assessment' : 'None',
          newValue: `${evaluated.esgTopic}: Score=${evaluated.financialMaterialityScore} (Material=${evaluated.isFinanciallyMaterial})`,
        },
      });

      setFinancialMateriality((prev) => {
        const exists = prev.some((f) => f.assessmentId === evaluated.assessmentId);
        return exists
          ? prev.map((f) => (f.assessmentId === evaluated.assessmentId ? res.savedEntity : f))
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [financialMateriality.length, activeActor]
  );

  const saveImpactMateriality = useCallback(
    async (
      data: Omit<
        ImpactMaterialityAssessment,
        | 'impactAssessmentId'
        | 'severityScore'
        | 'impactMaterialityScore'
        | 'isImpactMaterial'
        | 'updatedAt'
      >,
      existingId?: string
    ): Promise<ImpactMaterialityAssessment> => {
      const impactAssessmentId =
        existingId ?? `IMP-MAT-${String(impactMateriality.length + 1).padStart(3, '0')}`;
      const evaluated = evaluateImpactMateriality({
        ...data,
        impactAssessmentId,
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.IMPACT_MATERIALITY,
        entity: evaluated,
        auditEvent: {
          engagementId: evaluated.engagementId,
          entityType: 'ImpactMateriality',
          entityId: evaluated.impactAssessmentId,
          action: existingId ? 'IMPACT_MATERIALITY_UPDATED' : 'IMPACT_MATERIALITY_ASSESSED',
          actor: activeActor,
          previousValue: existingId ? 'Existing Assessment' : 'None',
          newValue: `${evaluated.esgTopic} [${evaluated.impactType}]: Severity=${evaluated.severityScore}, Score=${evaluated.impactMaterialityScore} (Material=${evaluated.isImpactMaterial})`,
        },
      });

      setImpactMateriality((prev) => {
        const exists = prev.some((i) => i.impactAssessmentId === evaluated.impactAssessmentId);
        return exists
          ? prev.map((i) =>
              i.impactAssessmentId === evaluated.impactAssessmentId ? res.savedEntity : i
            )
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [impactMateriality.length, activeActor]
  );

  const saveAuditMateriality = useCallback(
    async (
      data: Omit<AuditMaterialityAssessment, 'auditMaterialityId' | 'updatedAt'>,
      existingId?: string
    ): Promise<AuditMaterialityAssessment> => {
      const auditMaterialityId =
        existingId ?? `AUD-MAT-${String(auditMateriality.length + 1).padStart(3, '0')}`;
      const validated = validateAuditMateriality({
        ...data,
        auditMaterialityId,
      });

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.AUDIT_MATERIALITY,
        entity: validated,
        auditEvent: {
          engagementId: validated.engagementId,
          entityType: 'AuditMateriality',
          entityId: validated.auditMaterialityId,
          action: existingId ? 'AUDIT_MATERIALITY_UPDATED' : 'AUDIT_MATERIALITY_CREATED',
          actor: activeActor,
          previousValue: existingId ? 'Existing Benchmark' : 'None',
          newValue: `${validated.metricCode}: Planning=${validated.planningMaterialityAbsolute} ${validated.unit} (${validated.planningMaterialityPct}%)`,
        },
      });

      setAuditMateriality((prev) => {
        const exists = prev.some((a) => a.auditMaterialityId === validated.auditMaterialityId);
        return exists
          ? prev.map((a) =>
              a.auditMaterialityId === validated.auditMaterialityId ? res.savedEntity : a
            )
          : [...prev, res.savedEntity];
      });
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [auditMateriality.length, activeActor]
  );

  const generateAndFreezeAssuranceReport = useCallback(
    async (params: {
      engagementId: string;
      reportType: AssuranceReportType;
      includedSectionIds?: string[];
    }): Promise<{ report: AssuranceReport; snapshot: FrozenReportSnapshot }> => {
      const ctx = buildReportContextForEngagement(params.engagementId);
      const nextIndex = assuranceReports.length + 1;
      const reportId = `RPT-${String(nextIndex).padStart(3, '0')}`;
      const snapshotId = `SNP-${String(nextIndex).padStart(3, '0')}`;
      const existingSameTypeCount = assuranceReports.filter(
        (r) => r.engagementId === params.engagementId && r.reportType === params.reportType
      ).length;

      const generated = generateAssuranceReportAndSnapshot({
        reportId,
        snapshotId,
        reportType: params.reportType,
        generatedBy: activeActor,
        versionNumber: existingSameTypeCount + 1,
        includedSectionIds: params.includedSectionIds,
        ctx,
      });

      const saved = await saveAssuranceReportWithSnapshot({
        report: generated.report,
        snapshot: generated.snapshot,
        actor: activeActor,
      });

      setAssuranceReports((prev) => [saved.report, ...prev]);
      setReportSnapshots((prev) => [saved.snapshot, ...prev]);
      setAuditEvents((prev) => [saved.auditEvent, ...prev]);

      return { report: saved.report, snapshot: saved.snapshot };
    },
    [buildReportContextForEngagement, assuranceReports, activeActor]
  );

  const updateAssuranceReportStatus = useCallback(
    async (params: {
      reportId: string;
      nextStatus: AssuranceReportReviewStatus;
    }): Promise<AssuranceReport> => {
      const existing = assuranceReports.find((r) => r.reportId === params.reportId);
      if (!existing) {
        throw new Error(`Assurance report ${params.reportId} not found.`);
      }

      const check = validateReportStatusTransition({
        report: existing,
        nextStatus: params.nextStatus,
        actor: activeActor,
      });
      if (!check.valid) {
        throw new Error(check.error ?? 'Invalid report status transition.');
      }

      const updated: AssuranceReport = {
        ...existing,
        reviewStatus: params.nextStatus,
        reviewedBy:
          params.nextStatus === 'Approved Internal Readiness Report' ||
          params.nextStatus === 'Internally Reviewed'
            ? activeActor
            : existing.reviewedBy,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.ASSURANCE_REPORTS,
        entity: updated,
        auditEvent: {
          engagementId: updated.engagementId,
          entityType: 'AssuranceReport',
          entityId: updated.reportId,
          action: 'ASSURANCE_REPORT_STATUS_UPDATED',
          actor: activeActor,
          previousValue: existing.reviewStatus,
          newValue: updated.reviewStatus,
        },
      });

      setAssuranceReports((prev) =>
        prev.map((r) => (r.reportId === updated.reportId ? res.savedEntity : r))
      );
      setAuditEvents((prev) => [res.auditEvent, ...prev]);
      return res.savedEntity;
    },
    [assuranceReports, activeActor]
  );

  const exportReportSnapshot = useCallback(
    (params: {
      snapshotId: string;
      format: 'pdf' | 'xlsx' | 'csv' | 'json';
      csvCategory?: CsvExportCategory;
    }): { filename: string; byteLength: number } => {
      const snapshot =
        reportSnapshots.find((s) => s.snapshotId === params.snapshotId) ?? reportSnapshots[0];
      if (!snapshot) {
        throw new Error('No frozen report snapshot available to export.');
      }

      const ctx = buildReportContextForEngagement(snapshot.engagementId);
      const baseName = `${snapshot.engagementId}_${snapshot.reportType}_${snapshot.snapshotId}`;

      if (params.format === 'pdf') {
        const bytes = generateReportPdfBytes(snapshot);
        const filename = triggerBrowserDownload({
          filename: baseName,
          extension: 'pdf',
          content: bytes,
          mimeType: 'application/pdf',
        });
        return { filename, byteLength: bytes.byteLength };
      }

      if (params.format === 'xlsx') {
        const bytes = generateReportXlsxBytes(snapshot, ctx);
        const filename = triggerBrowserDownload({
          filename: baseName,
          extension: 'xlsx',
          content: bytes,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        return { filename, byteLength: bytes.byteLength };
      }

      if (params.format === 'csv') {
        const category = params.csvCategory ?? 'disclosure-mappings';
        const csvStr = generateModuleCsvExport(category, snapshot, ctx);
        const filename = triggerBrowserDownload({
          filename: `${baseName}_${category}`,
          extension: 'csv',
          content: csvStr,
          mimeType: 'text/csv;charset=utf-8;',
        });
        return { filename, byteLength: csvStr.length };
      }

      const jsonStr = generateStructuredJsonExport(snapshot);
      const filename = triggerBrowserDownload({
        filename: baseName,
        extension: 'json',
        content: jsonStr,
        mimeType: 'application/json;charset=utf-8;',
      });
      return { filename, byteLength: jsonStr.length };
    },
    [reportSnapshots, buildReportContextForEngagement]
  );

  // ============================================================================
  // PHASE 4 ACTIONS — GEMINI AI AUDIT COPILOT & BACKUP/RESTORE RESILIENCE
  // ============================================================================

  const runAiAuditCopilotTask = useCallback(
    async (params: {
      engagementId: string;
      taskType: AiAuditTaskType;
      selectedRecordIds: string[];
      userQuestion: string;
      methodologyContext: string;
    }): Promise<{ request: AiAuditRequest; response: AiAuditResponse }> => {
      const nextIndex = aiAuditRequests.length + 1;
      const requestId = `AI-REQ-${String(nextIndex).padStart(3, '0')}`;
      const responseId = `AI-RES-${String(nextIndex).padStart(3, '0')}`;

      const executed = await executeGroundedAiCopilotTask({
        requestId,
        responseId,
        engagementId: params.engagementId,
        taskType: params.taskType,
        selectedRecordIds: params.selectedRecordIds,
        userQuestion: params.userQuestion,
        methodologyContext: params.methodologyContext,
        dataset: {
          engagements,
          assertions,
          controls,
          evidence,
          dqFindings: findings,
          auditPlans,
          auditProcedures,
          riskAssessments,
          designTests,
          operatingTests,
          emissionActivities,
          ghgRecalculations,
          auditFindings,
          disclosureRequirements,
          disclosureMappings,
          financialMateriality,
          impactMateriality,
          auditMateriality,
          assuranceReports,
        },
      });

      const saved = await saveAiAuditExchange({
        request: executed.request,
        response: executed.response,
        actor: activeActor,
      });

      setAiAuditRequests((prev) => [saved.request, ...prev]);
      setAiAuditResponses((prev) => [saved.response, ...prev]);
      setAuditEvents((prev) => [saved.auditEvent, ...prev]);

      return { request: saved.request, response: saved.response };
    },
    [
      aiAuditRequests.length,
      engagements,
      assertions,
      controls,
      evidence,
      findings,
      auditPlans,
      auditProcedures,
      riskAssessments,
      designTests,
      operatingTests,
      emissionActivities,
      ghgRecalculations,
      auditFindings,
      disclosureRequirements,
      disclosureMappings,
      financialMateriality,
      impactMateriality,
      auditMateriality,
      assuranceReports,
      activeActor,
    ]
  );

  const applyAiDraftToWorkpaper = useCallback(
    async (params: {
      responseId: string;
      targetEntityType: 'AuditProcedureDraft' | 'AuditFindingDraft';
      humanConfirmedReview: boolean;
    }): Promise<{ updatedResponse: AiAuditResponse; createdEntityId: string }> => {
      const targetRes = aiAuditResponses.find((r) => r.responseId === params.responseId);
      if (!targetRes) {
        throw new Error(`AI Response ${params.responseId} not found.`);
      }

      const gate = validateHumanApprovedAiDraftApplication({
        response: targetRes,
        humanConfirmedReview: params.humanConfirmedReview,
        targetEntityType: params.targetEntityType,
        actor: activeActor,
      });

      if (!gate.allowed) {
        throw new Error(gate.error ?? 'Human review confirmation required.');
      }

      const nowIso = new Date().toISOString();
      let createdEntityId = '';

      if (params.targetEntityType === 'AuditProcedureDraft') {
        const plan =
          auditPlans.find((p) => p.engagementId === targetRes.engagementId) ?? auditPlans[0];
        const linkedAsn = assertions
          .filter((a) => a.engagementId === targetRes.engagementId)
          .slice(0, 2)
          .map((a) => a.assertionId);
        const linkedCtl = controls
          .filter((c) => c.engagementId === targetRes.engagementId)
          .slice(0, 1)
          .map((c) => c.controlId);

        const createdProc = await saveAuditProcedure({
          auditPlanId: plan?.auditPlanId ?? 'APL-FY2025-001',
          linkedAssertionIds: linkedAsn.length > 0 ? linkedAsn : ['AST-ASN-001'],
          linkedControlIds: linkedCtl.length > 0 ? linkedCtl : ['AST-CTL-001'],
          procedureName: `[AI-Assisted Draft] ${targetRes.taskType} (${targetRes.responseId})`,
          auditObjective: `${targetRes.generatedContent.slice(0, 260)} [${targetRes.mandatoryReviewLabel}]`,
          procedureType: 'Inspection',
          testingMethod: `Human-reviewed draft generated from ${targetRes.sourceRecordIds.join(', ') || targetRes.engagementId}`,
          populationDefinition: 'Engagement-scoped population requiring independent human testing',
          expectedEvidence: 'Primary binary evidence with verified SHA-256 checksum',
          assignedPreparer: activeActor,
          assignedReviewer: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
          plannedSampleSize: 15,
          status: 'Planned', // Strictly Planned; never auto-completed or auto-approved
        });
        createdEntityId = createdProc.procedureId;
      } else {
        const proc = auditProcedures[0];
        const linkedAsn =
          assertions.find((a) => a.engagementId === targetRes.engagementId)?.assertionId ??
          'AST-ASN-001';
        const linkedCtl =
          controls.find((c) => c.engagementId === targetRes.engagementId)?.controlId ??
          'AST-CTL-001';

        const createdFinding = await saveAuditFinding({
          engagementId: targetRes.engagementId,
          procedureId: proc?.procedureId ?? 'PRC-001',
          linkedAssertionId: linkedAsn,
          linkedControlId: linkedCtl,
          findingType: 'Documentation / Evidence Gap',
          severity: 'Medium',
          description: `[AI-Assisted Draft - Human Reviewed] ${targetRes.generatedContent.slice(0, 280)}`,
          rootCause: `Drafted from grounded sources [${targetRes.sourceRecordIds.join(', ')}] — ${targetRes.mandatoryReviewLabel}`,
          impact: 'Requires management remediation and independent retest verification.',
          evidenceIds: targetRes.evidenceReferences,
          responsibleOwner: activeActor,
          remediationAction: 'Complete primary evidence reconciliation and submit for retesting.',
          targetDate: '2026-06-30',
          remediationStatus: 'Open', // Strictly Open; never auto-closed
          retestStatus: 'Not Retested',
        });
        createdEntityId = createdFinding.auditFindingId;
      }

      const updatedResponse: AiAuditResponse = {
        ...targetRes,
        humanReviewedAndApplied: true,
        appliedTargetRecordId: createdEntityId,
        appliedByActor: activeActor,
        appliedAt: nowIso,
      };

      const res = await saveEntityWithAuditAndRevalidate({
        storeName: STORES.AI_AUDIT_RESPONSES,
        entity: updatedResponse,
        auditEvent: {
          engagementId: targetRes.engagementId,
          entityType: 'AiAuditResponse',
          entityId: targetRes.responseId,
          action: 'AI_DRAFT_HUMAN_REVIEWED_AND_SAVED',
          actor: activeActor,
          previousValue: 'Unapplied Draft',
          newValue: `Applied to ${params.targetEntityType}: ${createdEntityId}`,
        },
      });

      setAiAuditResponses((prev) =>
        prev.map((r) => (r.responseId === updatedResponse.responseId ? res.savedEntity : r))
      );
      setAuditEvents((prev) => [res.auditEvent, ...prev]);

      return { updatedResponse: res.savedEntity, createdEntityId };
    },
    [
      aiAuditResponses,
      activeActor,
      auditPlans,
      assertions,
      controls,
      auditProcedures,
      saveAuditProcedure,
      saveAuditFinding,
    ]
  );

  const createAndDownloadBackupArchive = useCallback(
    async (params: {
      scope: 'Full Application' | 'Single Engagement';
      engagementId?: string;
      downloadToBrowser?: boolean;
    }): Promise<{ archive: BackupArchiveEnvelope; filename: string }> => {
      const archive = await createWorkbenchBackupArchive({
        scope: params.scope,
        engagementId: params.engagementId,
        actor: activeActor,
      });

      const savedManifest = await saveBackupManifestRecord({
        manifest: archive.manifest,
        actor: activeActor,
      });

      setBackupManifests((prev) => [savedManifest.manifest, ...prev]);
      setAuditEvents((prev) => [savedManifest.auditEvent, ...prev]);

      const rawFilename =
        params.scope === 'Full Application'
          ? `ESG_Workbench_Full_Backup_${archive.manifest.manifestId}`
          : `ESG_Workbench_${archive.manifest.engagementId}_Backup_${archive.manifest.manifestId}`;

      let filename = `${rawFilename}.json`;
      if (params.downloadToBrowser !== false) {
        filename = triggerBrowserDownload({
          filename: rawFilename,
          extension: 'json',
          content: JSON.stringify(archive, null, 2),
          mimeType: 'application/json;charset=utf-8;',
        });
      }

      return { archive, filename };
    },
    [activeActor]
  );

  const validateBackupArchive = useCallback(
    async (rawArchive: unknown): Promise<RestoreValidationReport> => {
      return validateBackupArchiveForRestore(rawArchive);
    },
    []
  );

  const restoreFromBackupArchive = useCallback(
    async (params: {
      rawArchive: unknown;
      mode: RestoreMode;
      confirmDestructiveReplace?: boolean;
    }): Promise<RestoreValidationReport> => {
      const res = await executeBackupRestore({
        rawArchive: params.rawArchive,
        mode: params.mode,
        confirmDestructiveReplace: params.confirmDestructiveReplace,
        actor: activeActor,
      });

      await loadAll(false);
      return res.validation;
    },
    [activeActor, loadAll]
  );

  const value = useMemo<WorkbenchContextValue>(
    () => ({
      loading,
      errorBanner,
      retryOperation,
      clearErrorBanner,
      themeMode,
      toggleThemeMode,
      activeActor,
      setActiveActor,
      organization,
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
      activeEngagementId,
      traceabilityResults,
      disclosureAnalytics,
      doubleMaterialityMatrix,
      advancedAnalytics,
      filters,
      setFilters,
      resetFilters,
      filteredData,
      metrics,
      phase2Metrics,
      saveEngagement,
      updateEngagementStatus,
      saveAssertion,
      archiveAssertion,
      saveControl,
      uploadEvidence,
      reviewEvidence,
      downloadEvidence,
      resolveFinding,
      triggerDeterministicRevalidation,
      resetDemoDataset,
      saveAuditPlan,
      saveAuditProcedure,
      saveRiskAssessment,
      createSamplingPlanAndSelectItems,
      updateSampleItemResult,
      saveDesignTest,
      saveOperatingTest,
      runGhgShadowRecalculation,
      saveEmissionActivity,
      saveEmissionFactor,
      saveAuditFinding,
      submitReviewDecision,
      saveDisclosureFramework,
      saveDisclosureRequirement,
      importRequirementCatalog,
      saveDisclosureMapping,
      saveFinancialMateriality,
      saveImpactMateriality,
      saveAuditMateriality,
      generateAndFreezeAssuranceReport,
      updateAssuranceReportStatus,
      exportReportSnapshot,
      runAiAuditCopilotTask,
      applyAiDraftToWorkpaper,
      createAndDownloadBackupArchive,
      validateBackupArchive,
      restoreFromBackupArchive,
    }),
    [
      loading,
      errorBanner,
      retryOperation,
      clearErrorBanner,
      themeMode,
      toggleThemeMode,
      activeActor,
      organization,
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
      activeEngagementId,
      traceabilityResults,
      disclosureAnalytics,
      doubleMaterialityMatrix,
      advancedAnalytics,
      filters,
      resetFilters,
      filteredData,
      metrics,
      phase2Metrics,
      saveEngagement,
      updateEngagementStatus,
      saveAssertion,
      archiveAssertion,
      saveControl,
      uploadEvidence,
      reviewEvidence,
      downloadEvidence,
      resolveFinding,
      triggerDeterministicRevalidation,
      resetDemoDataset,
      saveAuditPlan,
      saveAuditProcedure,
      saveRiskAssessment,
      createSamplingPlanAndSelectItems,
      updateSampleItemResult,
      saveDesignTest,
      saveOperatingTest,
      runGhgShadowRecalculation,
      saveEmissionActivity,
      saveEmissionFactor,
      saveAuditFinding,
      submitReviewDecision,
      saveDisclosureFramework,
      saveDisclosureRequirement,
      importRequirementCatalog,
      saveDisclosureMapping,
      saveFinancialMateriality,
      saveImpactMateriality,
      saveAuditMateriality,
      generateAndFreezeAssuranceReport,
      updateAssuranceReportStatus,
      exportReportSnapshot,
      runAiAuditCopilotTask,
      applyAiDraftToWorkpaper,
      createAndDownloadBackupArchive,
      validateBackupArchive,
      restoreFromBackupArchive,
    ]
  );

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
};

export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return ctx;
}
