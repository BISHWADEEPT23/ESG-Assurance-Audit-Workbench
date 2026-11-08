/**
 * ESG Assurance & Audit Workbench v0.2.0
 * Core Strongly-Typed Domain Architecture (Phase 1 + Phase 2)
 */

export type ReportingYear = 'FY 2024' | 'FY 2025' | 'FY 2026';

export type EngagementType =
  | 'Internal ESG Audit'
  | 'ESG Assurance Readiness'
  | 'GHG Inventory Verification Readiness'
  | 'Sustainability Disclosure Controls Review';

/**
 * Planned engagement attribute only.
 * Never implies an actual independent limited or reasonable assurance opinion has been issued.
 */
export type PlannedAssuranceLevel =
  | 'Planned Limited Assurance Readiness'
  | 'Planned Reasonable Assurance Readiness'
  | 'Internal Audit Advisory Only'
  | 'No External Assurance Planned';

export type EngagementStatus =
  | 'Planning'
  | 'Fieldwork'
  | 'Review'
  | 'Readiness Complete (Internal)'
  | 'Archived';

export type ESGPillar = 'Environmental' | 'Social' | 'Governance';

export type AssertionType =
  | 'Completeness'
  | 'Accuracy'
  | 'Occurrence'
  | 'Cutoff'
  | 'Classification'
  | 'Consistency'
  | 'Presentation';

/**
 * Distinguishes between reported, estimated, missing, not-applicable, and verified zero values.
 * Missing values MUST remain null in reportedValue.
 */
export type ValueBasis =
  | 'Reported'
  | 'Estimated'
  | 'Missing'
  | 'Not Applicable'
  | 'Verified Zero';

export type AssertionReviewStatus =
  | 'Unreviewed'
  | 'In Review'
  | 'Reviewed'
  | 'Flagged'
  | 'Archived';

export type ControlFrequency =
  | 'Continuous'
  | 'Daily'
  | 'Monthly'
  | 'Quarterly'
  | 'Annual'
  | 'Ad-Hoc';

export type ControlType = 'Preventive' | 'Detective' | 'Corrective';

export type ControlDesignStatus =
  | 'Undocumented'
  | 'Draft'
  | 'Documented'
  | 'Requires Remediation';

/**
 * Controls cannot be labeled Operating Effectively without completed testing & independent review.
 */
export type ControlOperatingStatus =
  | 'Not Tested'
  | 'Testing Planned (Phase 2)'
  | 'Exception Identified'
  | 'Operating Effectively'
  | 'Operating Ineffectively'
  | 'Inconclusive';

export type LinkedEntityType =
  | 'ESGAssertion'
  | 'InternalControl'
  | 'AssuranceEngagement'
  | 'AuditProcedure'
  | 'SampleItem'
  | 'DesignTest'
  | 'OperatingTest'
  | 'GHGRecalculation'
  | 'AuditFinding';

export type EvidenceType =
  | 'Utility Invoice'
  | 'Meter Calibration Log'
  | 'Calculation Workpaper'
  | 'Emission Factor Reference'
  | 'HR Payroll Extract'
  | 'Safety Incident Log'
  | 'Board Resolution / Policy'
  | 'Third-Party Statement';

export type EvidenceVerificationStatus =
  | 'Metadata Only (Demo Unavailable)'
  | 'Uploaded - Pending Review'
  | 'Accepted'
  | 'Rejected';

export type ValidationRuleId =
  | 'DQ-01'
  | 'DQ-02'
  | 'DQ-03'
  | 'DQ-04'
  | 'DQ-05'
  | 'DQ-06'
  | 'DQ-07'
  | 'DQ-08'
  | 'DQ-09'
  | 'DQ-10';

export type FindingSeverity = 'High' | 'Medium' | 'Low';

export type FindingStatus = 'Open' | 'Resolved' | 'Reopened';

export interface Organization {
  organizationId: string;
  organizationName: string;
  industry: string;
  country: string;
  reportingCurrency: string;
  reportingBoundary: string;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  facilityId: string;
  organizationId: string;
  facilityCode: string;
  facilityName: string;
  country: string;
  operationalStatus: 'Active' | 'Commissioning' | 'Decommissioned';
  includedInBoundary: boolean;
}

export interface AssuranceEngagement {
  engagementId: string;
  organizationId: string;
  engagementName: string;
  engagementObjective: string;
  reportingBoundary: string;
  reportingYear: ReportingYear;
  engagementType: EngagementType;
  assuranceLevel: PlannedAssuranceLevel;
  engagementStatus: EngagementStatus;
  scopeDescription: string;
  plannedStartDate: string;
  plannedEndDate: string;
  methodologyVersion: string;
  isSyntheticDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ESGAssertion {
  assertionId: string;
  engagementId: string;
  metricCode: string;
  metricName: string;
  pillar: ESGPillar;
  reportingYear: ReportingYear;
  facilityId: string;
  reportedValue: number | null;
  valueBasis: ValueBasis;
  unit: string;
  assertionType: AssertionType;
  reportingBoundary: string;
  dataSource: string;
  calculationMethod: string;
  reviewStatus: AssertionReviewStatus;
  requiresEvidence: boolean;
  linkedEvidenceIds: string[];
  isSyntheticDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InternalControl {
  controlId: string;
  engagementId: string;
  controlCode: string;
  controlName: string;
  pillar: ESGPillar;
  controlObjective: string;
  riskDescription: string;
  controlOwner: string;
  controlFrequency: ControlFrequency;
  controlType: ControlType;
  controlDescription: string;
  designStatus: ControlDesignStatus;
  operatingStatus: ControlOperatingStatus;
  linkedAssertionIds: string[];
  linkedEvidenceIds: string[];
  lastReviewedDate: string;
  isSyntheticDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceRecord {
  evidenceId: string;
  engagementId: string;
  linkedEntityType: LinkedEntityType;
  linkedEntityId: string;
  evidenceType: EvidenceType;
  documentName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  verificationStatus: EvidenceVerificationStatus;
  isMetadataOnlyDemo: boolean;
  reviewerNotes: string;
  uploadedAt: string;
  reviewedAt: string | null;
}

export interface EvidenceFileBlob {
  evidenceId: string;
  bytes: ArrayBuffer;
  mimeType: string;
  documentName: string;
  uploadedAt: string;
}

export type AuditEventEntityType =
  | 'AssuranceEngagement'
  | 'ESGAssertion'
  | 'InternalControl'
  | 'EvidenceRecord'
  | 'ValidationFinding'
  | 'AuditPlan'
  | 'AuditProcedure'
  | 'RiskAssessment'
  | 'SamplingPlan'
  | 'SampleItem'
  | 'DesignTest'
  | 'OperatingTest'
  | 'EmissionActivity'
  | 'EmissionFactor'
  | 'GHGRecalculation'
  | 'AuditFinding'
  | 'ReviewRecord'
  | 'DisclosureFramework'
  | 'DisclosureRequirement'
  | 'DisclosureMapping'
  | 'FinancialMateriality'
  | 'ImpactMateriality'
  | 'AuditMateriality'
  | 'FinancialMaterialityAssessment'
  | 'ImpactMaterialityAssessment'
  | 'AuditMaterialityAssessment'
  | 'AssuranceReport'
  | 'ReportSnapshot'
  | 'AiAuditRequest'
  | 'AiAuditResponse'
  | 'BackupManifest'
  | 'System';

export interface AuditEvent {
  eventId: string;
  engagementId: string;
  entityType: AuditEventEntityType;
  entityId: string;
  action: string;
  actor: string;
  timestamp: string;
  previousValue: string;
  newValue: string;
}

export interface ValidationFinding {
  findingId: string;
  engagementId: string;
  ruleId: ValidationRuleId;
  linkedEntityType: 'ESGAssertion' | 'InternalControl' | 'AssuranceEngagement';
  linkedEntityId: string;
  severity: FindingSeverity;
  description: string;
  detectedAt: string;
  status: FindingStatus;
  resolutionNote?: string;
}

export interface GlobalFilterState {
  engagementId: string | 'ALL';
  reportingYear: ReportingYear | 'ALL';
  facilityId: string | 'ALL';
  pillar: ESGPillar | 'ALL';
  reviewStatus: AssertionReviewStatus | 'ALL';
}

export interface AssuranceReadinessMetrics {
  activeEngagementsCount: number;
  totalAssertionsCount: number;
  applicableAssertionsCount: number;
  excludedNotApplicableAssertionsCount: number;
  reviewedAssertionsCount: number;
  assertionReviewCoveragePct: number;
  totalControlsCount: number;
  applicableControlsCount: number;
  documentedControlsCount: number;
  controlDocumentationCoveragePct: number;
  assertionsRequiringEvidenceCount: number;
  assertionsWithAvailableEvidenceCount: number;
  evidenceCoveragePct: number;
  reviewedEvidenceCount: number;
  acceptedEvidenceCount: number;
  evidenceAcceptanceRatePct: number;
  openFindingsCount: number;
  highSeverityFindingsCount: number;
  engagementCompletionPct: number;
  scopeCompletionPct: number;
}

// ============================================================================
// PHASE 2 ENTITIES (v0.2.0)
// ============================================================================

// MODULE A — AUDIT PLANNING
export type AuditPlanStatus =
  | 'Draft'
  | 'Under Review'
  | 'Approved for Internal Testing'
  | 'Testing in Progress'
  | 'Testing Completed'
  | 'Closed';

export type RiskBand = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface AuditPlan {
  auditPlanId: string;
  engagementId: string;
  reportingYear: ReportingYear;
  auditObjective: string;
  auditScope: string;
  reportingBoundary: string;
  auditCriteria: string;
  methodologyVersion: string;
  plannedStartDate: string;
  plannedEndDate: string;
  planningMateriality: number;
  materialityUnit: string;
  materialityRationale: string;
  overallRiskAssessment: RiskBand;
  status: AuditPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export type AuditProcedureType =
  | 'Inquiry'
  | 'Inspection'
  | 'Observation'
  | 'Reperformance'
  | 'Recalculation'
  | 'Analytical Review';

export type AuditProcedureStatus =
  | 'Planned'
  | 'In Progress'
  | 'Submitted for Review'
  | 'Completed'
  | 'Blocked';

export interface AuditProcedure {
  procedureId: string;
  auditPlanId: string;
  linkedAssertionIds: string[];
  linkedControlIds: string[];
  procedureName: string;
  auditObjective: string;
  procedureType: AuditProcedureType;
  testingMethod: string;
  populationDefinition: string;
  expectedEvidence: string;
  assignedPreparer: string;
  assignedReviewer: string;
  plannedSampleSize: number;
  status: AuditProcedureStatus;
  createdAt?: string;
  updatedAt?: string;
}

// MODULE B — RISK ASSESSMENT ENGINE
export type RiskCategory =
  | 'Data Completeness'
  | 'Measurement & Calibration'
  | 'Emission Factor Selection'
  | 'Consolidation Boundary'
  | 'Manual Spreadsheet Processing'
  | 'Supplier Primary Data'
  | 'Regulatory Classification';

export interface RiskAssessment {
  riskAssessmentId: string;
  engagementId: string;
  linkedAssertionId: string;
  linkedControlId: string;
  riskCategory: RiskCategory;
  likelihood: number; // 1-5
  impact: number; // 1-5
  inherentRiskScore: number; // 1-25 (Likelihood * Impact)
  inherentRiskBand: RiskBand;
  controlEffectivenessBasis: string | null;
  controlRiskScore: number | null; // 1-5 only if controlEffectivenessBasis is documented
  residualRiskScore: number | null; // null if control is untested / lacks effectiveness basis
  residualRiskBand: RiskBand | 'Unassessed';
  assessmentRationale: string;
  evidenceReferences: string[];
  assessedBy: string;
  assessedAt: string;
}

// MODULE C — AUDIT SAMPLING ENGINE
export type SamplingMethod =
  | 'Simple Random Sampling'
  | 'Systematic Sampling'
  | 'Monetary-Unit Sampling'
  | 'Risk-Based Judgmental Selection';

export interface PopulationItemRecord {
  recordId: string;
  label: string;
  bookValue: number;
  facilityId: string;
  riskFlagged?: boolean;
}

export interface SamplingParameters {
  startPosition?: number;
  samplingInterval?: number;
  monetaryInterval?: number;
  orderingRule?: string;
  judgmentalRationale?: string;
  riskCriteria?: string;
  populationRecords?: PopulationItemRecord[];
}

export interface SamplingPlan {
  samplingPlanId: string;
  procedureId: string;
  populationId: string;
  populationSize: number;
  populationValue: number;
  samplingMethod: SamplingMethod;
  samplingParameters: SamplingParameters;
  randomSeed: number;
  requestedSampleSize: number;
  actualSampleSize: number;
  isStatistical: boolean;
  selectionTimestamp: string;
  methodologyVersion: string;
}

export type SampleTestingStatus =
  | 'Selected - Untested'
  | 'Tested - No Exception'
  | 'Tested - Exception Identified';

export interface SampleItem {
  sampleItemId: string;
  samplingPlanId: string;
  populationRecordId: string;
  selectionOrder: number;
  selectionReason: string;
  selectedValue: number;
  hitCount: number; // Preserves multiplicity for Monetary-Unit Sampling
  cumulativeTriggers?: number[];
  testingStatus: SampleTestingStatus;
  exceptionNotes?: string;
  linkedEvidenceIds: string[];
}

// MODULE D — CONTROL TESTING WORKBENCH
export type DesignTestResult =
  | 'Adequately Designed'
  | 'Design Deficiency'
  | 'Inconclusive'
  | 'Not Tested';

export type ReviewWorkflowStatus =
  | 'Draft'
  | 'Submitted for Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Rejected';

export interface DesignTest {
  designTestId: string;
  controlId: string;
  procedureId: string;
  testObjective: string;
  designCriteria: string;
  walkthroughDescription: string;
  evidenceIds: string[];
  testResult: DesignTestResult;
  preparer: string;
  reviewer: string;
  reviewStatus: ReviewWorkflowStatus;
  conclusionRationale: string;
  testedAt: string;
}

export type OperatingTestConclusion =
  | 'Operating Effectively'
  | 'Operating Ineffectively'
  | 'Inconclusive'
  | 'Not Tested';

export interface OperatingSampleResult {
  sampleItemId: string;
  passed: boolean;
  exceptionDetail: string;
}

export interface OperatingTest {
  operatingTestId: string;
  controlId: string;
  samplingPlanId: string;
  testingPeriod: string;
  testProcedure: string;
  sampleResults: OperatingSampleResult[];
  exceptions: number;
  exceptionsEvaluated: boolean;
  exceptionEvaluationNotes: string;
  evidenceIds: string[];
  preparer: string;
  reviewer: string;
  conclusion: OperatingTestConclusion;
  conclusionRationale: string;
  reviewStatus: ReviewWorkflowStatus;
  testedAt: string;
}

// MODULE E — GHG VERIFICATION ENGINE
export type GHGScope =
  | 'Scope 1'
  | 'Scope 2 Location-Based'
  | 'Scope 2 Market-Based'
  | 'Scope 3';

export type Scope3Category =
  | 'Category 1: Purchased Goods and Services'
  | 'Category 3: Fuel- and Energy-Related Activities'
  | 'Category 4: Upstream Transportation and Distribution'
  | 'Category 6: Business Travel'
  | 'Category 7: Employee Commuting';

export type GHGActivityType =
  | 'Stationary Combustion'
  | 'Mobile Combustion'
  | 'Fugitive Emissions'
  | 'Process Emissions'
  | 'Grid Electricity (Location-Based)'
  | 'Contractual / Residual Electricity (Market-Based)'
  | 'Activity-Based Physical'
  | 'Spend-Based Economic';

export interface EmissionActivityRecord {
  activityId: string;
  engagementId: string;
  facilityId: string;
  reportingYear: ReportingYear;
  scope: GHGScope;
  scope3Category: Scope3Category | null;
  activityType: GHGActivityType;
  activityQuantity: number | null;
  activityUnit: string;
  valueStatus: 'Reported' | 'Estimated' | 'Unavailable';
  spendCurrency?: string | null;
  currencyConversionRate?: number | null;
  priceYearDeflator?: number | null;
  contractualInstrumentStatus?:
    | 'Eligible GoO / REC Verified'
    | 'Residual Mix Applied'
    | 'Instrument Ineligible / Unverified'
    | 'Factor Unavailable'
    | null;
  calculationMethod: string;
  sourceReference: string;
  reportedEmissions: number;
  reportedEmissionsUnit: 'tCO2e';
  linkedAssertionId?: string;
  evidenceIds: string[];
}

export type GWPAssessmentBasis = 'IPCC AR6 (100-yr)' | 'IPCC AR5 (100-yr)';

export type GreenhouseGasType = 'CO2e' | 'CO2' | 'CH4' | 'N2O' | 'HFC-134a' | 'SF6';

export interface EmissionFactorRecord {
  emissionFactorId: string;
  factorName: string;
  factorSource: string;
  factorVersion: string;
  geography: string;
  applicableYear: ReportingYear;
  gas: GreenhouseGasType;
  factorValue: number;
  numeratorUnit: 'kgCO2e' | 'tCO2e' | 'kgCO2' | 'kgCH4' | 'kgN2O' | 'kgHFC-134a' | 'kgSF6';
  denominatorUnit: string;
  factorCurrency?: string | null;
  factorBaseYear?: number | null;
  gwpBasis: GWPAssessmentBasis;
  gwpValue: number; // 1 for CO2/CO2e; e.g. 27.9 or 28 for CH4; 273 or 265 for N2O; 1530 for HFC-134a
  sourceReference: string;
}

export type VarianceToleranceStatus =
  | 'Within Tolerance'
  | 'Review Required'
  | 'Material Variance Candidate'
  | 'Blocked / Flagged Limitation';

export interface GHGRecalculationResult {
  recalculationId: string;
  activityId: string;
  emissionFactorId: string;
  normalizedActivity: number;
  rawGasEmissionsKg: number;
  gwpApplied: number;
  gwpBasis: GWPAssessmentBasis;
  calculatedEmissions: number; // tCO2e
  reportedEmissions: number; // tCO2e
  absoluteVariance: number; // calculatedEmissions - reportedEmissions (tCO2e)
  percentageVariance: number | null; // null if reportedEmissions === 0
  varianceStatus: VarianceToleranceStatus;
  diagnosticFlags: string[];
  calculationTimestamp: string;
  methodologyVersion: string;
}

// MODULE F — FINDINGS & REMEDIATION
export type AuditFindingType =
  | 'Control Design Deficiency'
  | 'Control Operating Exception'
  | 'GHG Recalculation Variance'
  | 'Sampling Exception'
  | 'Documentation / Evidence Gap';

export type AuditFindingSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type RemediationStatus =
  | 'Open'
  | 'Action Planned'
  | 'In Progress'
  | 'Ready for Retest'
  | 'Closed'
  | 'Reopened';

export type RetestStatus =
  | 'Not Retested'
  | 'Retest Passed'
  | 'Retest Failed'
  | 'Approved Alternative Disposition';

export interface AuditFinding {
  auditFindingId: string;
  engagementId: string;
  procedureId: string;
  linkedAssertionId: string;
  linkedControlId: string;
  findingType: AuditFindingType;
  severity: AuditFindingSeverity;
  description: string;
  rootCause: string;
  impact: string;
  evidenceIds: string[];
  responsibleOwner: string;
  remediationAction: string;
  targetDate: string;
  remediationStatus: RemediationStatus;
  retestStatus: RetestStatus;
  retestNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// MODULE H — REVIEW WORKFLOW
export type ReviewableEntityType =
  | 'AuditPlan'
  | 'AuditProcedure'
  | 'DesignTest'
  | 'OperatingTest'
  | 'GHGRecalculation'
  | 'AuditFinding'
  | 'DisclosureMapping'
  | 'FinancialMaterialityAssessment'
  | 'ImpactMaterialityAssessment'
  | 'AuditMaterialityAssessment'
  | 'AssuranceReport';

export interface ReviewRecord {
  reviewId: string;
  engagementId: string;
  entityType: ReviewableEntityType;
  entityId: string;
  preparedBy: string;
  reviewedBy: string | null;
  reviewStatus: ReviewWorkflowStatus;
  reviewComments: string;
  reviewedAt: string | null;
  approvalTimestamp: string | null;
}

// PHASE 2 EXECUTIVE DASHBOARD EXTENDED METRICS
export interface Phase2DashboardMetrics {
  auditPlanCompletionPct: number;
  proceduresScheduledCount: number;
  proceduresCompletedCount: number;
  controlsTestedCount: number;
  designDeficienciesCount: number;
  operatingExceptionsCount: number;
  sampleTestingCompletionPct: number;
  ghgRecalculationCoveragePct: number;
  unresolvedGhgVariancesCount: number;
  openAuditFindingsCount: number;
  overdueRemediationCount: number;
  pendingReviewsCount: number;
}

// ============================================================================
// PHASE 3 ENTITIES (v0.3.0) — DISCLOSURE TRACEABILITY, MATERIALITY,
// ASSURANCE REPORTING, ADVANCED ANALYTICS & MULTI-FORMAT EXPORTS
// ============================================================================

// MODULE A — DISCLOSURE FRAMEWORK LIBRARY
export type DisclosureFrameworkFamily =
  | 'BRSR'
  | 'GRI Standards'
  | 'ESRS'
  | 'IFRS S1 and IFRS S2';

export interface DisclosureFramework {
  frameworkId: string;
  frameworkName: DisclosureFrameworkFamily | string;
  frameworkVersion: string;
  issuingOrganization: string;
  jurisdiction: string;
  effectivePeriod: string;
  description: string;
  isCustomFramework: boolean;
  createdAt: string;
}

export type DisclosureRequirementType =
  | 'Quantitative'
  | 'Qualitative'
  | 'Policy / Governance'
  | 'Hybrid';

export type DisclosureApplicabilityStatus = 'Applicable' | 'Not Applicable';

export interface DisclosureRequirement {
  requirementId: string;
  frameworkId: string;
  requirementCode: string;
  requirementTitle: string;
  pillar: ESGPillar;
  topic: string;
  subTopic: string;
  requirementType: DisclosureRequirementType;
  mandatoryLevel: string;
  expectedUnit: string;
  guidanceSummary: string;
  applicabilityStatus: DisclosureApplicabilityStatus;
}

export type DisclosureMappingStatus =
  | 'Not Mapped'
  | 'Partially Mapped'
  | 'Fully Mapped';

export interface DisclosureMapping {
  mappingId: string;
  engagementId: string;
  frameworkId: string;
  requirementId: string;
  linkedAssertionIds: string[];
  linkedControlIds: string[];
  linkedProcedureIds: string[];
  linkedEvidenceIds: string[];
  mappingStatus: DisclosureMappingStatus;
  coveragePercentage: number;
  mappingRationale: string;
  identifiedGaps: string;
  mappedBy: string;
  reviewedBy: string | null;
  updatedAt: string;
}

// MODULE B — DISCLOSURE-TO-EVIDENCE TRACEABILITY
export type DisclosureTraceabilityStatus =
  | 'Not Mapped'
  | 'Partially Mapped'
  | 'Evidence Missing'
  | 'Testing Pending'
  | 'Exceptions Identified'
  | 'Internally Reviewed';

export interface DisclosureTraceabilityResult {
  traceabilityId: string;
  engagementId: string;
  requirementId: string;
  linkedAssertions: string[];
  linkedSourceRecords: string[];
  linkedControls: string[];
  linkedProcedures: string[];
  linkedSamples: string[];
  linkedTests: string[];
  linkedEvidence: string[];
  linkedFindings: string[];
  traceabilityStatus: DisclosureTraceabilityStatus;
  missingLinks: string[];
  calculationTimestamp: string;
}

// MODULE C — MATERIALITY ASSESSMENT WORKBENCH
export type MaterialityTimeHorizon = 'Short' | 'Medium' | 'Long';

export type FinancialEffectType =
  | 'Revenue'
  | 'Cost'
  | 'Capital Access'
  | 'Asset Impairment'
  | 'Regulatory Penalty';

export interface FinancialMaterialityAssessment {
  assessmentId: string;
  engagementId: string;
  esgTopic: string;
  pillar: ESGPillar;
  timeHorizon: MaterialityTimeHorizon;
  financialEffectType: FinancialEffectType;
  magnitudeScore: number; // 1–5
  likelihoodScore: number; // 1–5
  financialMaterialityScore: number; // 1–25
  materialityThreshold: number;
  isFinanciallyMaterial: boolean;
  rationale: string;
  assessedBy: string;
  reviewedBy: string | null;
  updatedAt: string;
}

export type ImpactType = 'Actual' | 'Potential';

export type ImpactPolarity = 'Positive' | 'Negative';

export interface ImpactMaterialityAssessment {
  impactAssessmentId: string;
  engagementId: string;
  esgTopic: string;
  impactType: ImpactType;
  polarity: ImpactPolarity;
  scaleScore: number; // 1–5
  scopeScore: number; // 1–5
  irremediableCharacterScore: number; // 1–5
  severityScore: number; // 1–5
  likelihoodScore: number | null; // Strictly null for Actual impacts; 1–5 only for Potential impacts
  impactMaterialityScore: number; // 1–5
  impactThreshold: number;
  isImpactMaterial: boolean;
  rationale: string;
  assessedBy: string;
  reviewedBy: string | null;
  updatedAt: string;
}

export interface AuditMaterialityAssessment {
  auditMaterialityId: string;
  engagementId: string;
  metricCode: string;
  metricName: string;
  benchmarkBaseValue: number;
  planningMaterialityPct: number;
  planningMaterialityAbsolute: number;
  performanceMaterialityPct: number;
  performanceMaterialityAbsolute: number;
  clearlyTrivialThresholdPct: number;
  clearlyTrivialAbsolute: number;
  unit: string;
  qualitativeFactors: string;
  approvedBy: string | null;
  updatedAt: string;
}

// MODULE D — ASSURANCE REPORTING ENGINE
export type AssuranceReportType =
  | 'ESG Audit Readiness Report'
  | 'GHG Verification Readiness Report'
  | 'Internal Control Testing Summary'
  | 'Evidence Coverage Report'
  | 'Findings & Remediation Report'
  | 'Disclosure Traceability Report'
  | 'Management Action Summary';

export type AssuranceReportReviewStatus =
  | 'Draft Snapshot'
  | 'Submitted for Internal Review'
  | 'Internally Reviewed'
  | 'Approved Internal Readiness Report'
  | 'Superseded / Archived';

export interface AssuranceReportSection {
  sectionId: string;
  sectionOrder: number;
  sectionTitle: string;
  included: boolean;
  narrativeSummary: string;
  keyMetrics: Array<{ label: string; value: string; unit?: string }>;
  tableHeaders?: string[];
  tableRows?: Array<Array<string | number | null>>;
}

export interface AssuranceReport {
  reportId: string;
  engagementId: string;
  reportType: AssuranceReportType;
  reportingPeriod: ReportingYear;
  reportingBoundary: string;
  methodologyVersion: string;
  generatedAt: string;
  generatedBy: string;
  reviewedBy?: string | null;
  reviewStatus: AssuranceReportReviewStatus;
  disclaimerStatement: string;
  reportSections: AssuranceReportSection[];
  sourceRecordIds: string[];
  reportSnapshotHash: string;
  versionNumber: number;
}

export interface FrozenReportSnapshot {
  snapshotId: string;
  reportId: string;
  engagementId: string;
  reportType: AssuranceReportType;
  reportingPeriod: ReportingYear;
  generatedAt: string;
  generatedBy: string;
  reportSnapshotHash: string;
  excludedHashMetadataFields: string[];
  canonicalPayloadJson: string;
  reportData: AssuranceReport;
}

// ============================================================================
// PHASE 4 ENTITIES (v1.0.0) — GEMINI AI AUDIT COPILOT, SECURITY HARDENING,
// BACKUP & RESTORE RESILIENCE
// ============================================================================

export type AiAuditTaskType =
  | 'Audit Procedure Drafting'
  | 'Evidence Summarization'
  | 'Control Deficiency Analysis'
  | 'GHG Variance Explanation'
  | 'Disclosure Gap Analysis'
  | 'Materiality Assessment Assistance'
  | 'Findings Drafting'
  | 'Management Action Recommendations'
  | 'Audit Report Narrative Assistance'
  | 'Methodology Question Answering';

export type AiValidationStatus =
  | 'Verified Grounded Draft (Requires Human Review)'
  | 'Grounded with Stripped Unverified Citations'
  | 'Insufficient Evidence Flagged'
  | 'Blocked — Prompt Injection or Scope Violation';

export interface AiFactClassificationBlock {
  verifiedApplicationData: string[];
  userProvidedInformation: string[];
  methodologyReferences: string[];
  aiInterpretationAndRecommendations: string[];
  missingOrUnverifiedInformation: string[];
}

export interface AiAuditRequest {
  requestId: string;
  engagementId: string;
  taskType: AiAuditTaskType;
  selectedRecordIds: string[];
  userQuestion: string;
  methodologyContext: string;
  createdAt: string;
}

export interface AiAuditResponse {
  responseId: string;
  requestId: string;
  engagementId: string;
  taskType: AiAuditTaskType;
  modelId: string;
  generatedContent: string;
  sourceRecordIds: string[];
  evidenceReferences: string[];
  strippedCitationIds?: string[];
  factClassification?: AiFactClassificationBlock;
  promptInjectionDetected?: boolean;
  promptInjectionIndicators?: string[];
  limitations: string;
  mandatoryReviewLabel: 'AI-generated draft — requires professional review.';
  validationStatus: AiValidationStatus;
  humanReviewedAndApplied?: boolean;
  appliedTargetRecordId?: string | null;
  appliedByActor?: string | null;
  appliedAt?: string | null;
  generatedAt: string;
}

export type RestoreMode = 'Merge' | 'Replace';

export interface EncodedEvidenceBlobRecord {
  evidenceId: string;
  base64Bytes: string;
  byteLength: number;
  sha256Checksum: string;
  mimeType: string;
  documentName: string;
  uploadedAt: string;
}

export interface BackupManifest {
  manifestId: string;
  backupVersion: 'v1.0.0';
  dbSchemaVersion: number;
  scope: 'Full Application' | 'Single Engagement';
  engagementId: string | 'ALL';
  createdAt: string;
  createdBy: string;
  storeRecordCounts: Record<string, number>;
  binaryBlobCount: number;
  binaryBlobTotalBytes: number;
  archiveChecksumSha256: string;
}

export interface BackupArchiveEnvelope {
  manifest: BackupManifest;
  stores: Record<string, unknown[]>;
  encodedEvidenceBlobs: EncodedEvidenceBlobRecord[];
}

export interface RestoreConflictItem {
  storeName: string;
  recordId: string;
  conflictType: 'Existing Record Will Be Overwritten/Merged' | 'Binary Checksum Mismatch' | 'Orphan Relationship';
  summary: string;
}

export interface RestoreValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest: BackupManifest | null;
  schemaCompatible: boolean;
  archiveChecksumVerified: boolean;
  binaryChecksumsVerified: boolean;
  verifiedBinaryCount: number;
  totalRecordsToRestore: number;
  storePreviewCounts: Record<string, number>;
  conflicts: RestoreConflictItem[];
}
