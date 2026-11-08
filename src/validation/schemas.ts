import { z } from 'zod';

export const ReportingYearSchema = z.enum(['FY 2024', 'FY 2025', 'FY 2026']);

export const EngagementTypeSchema = z.enum([
  'Internal ESG Audit',
  'ESG Assurance Readiness',
  'GHG Inventory Verification Readiness',
  'Sustainability Disclosure Controls Review',
]);

export const PlannedAssuranceLevelSchema = z.enum([
  'Planned Limited Assurance Readiness',
  'Planned Reasonable Assurance Readiness',
  'Internal Audit Advisory Only',
  'No External Assurance Planned',
]);

export const EngagementStatusSchema = z.enum([
  'Planning',
  'Fieldwork',
  'Review',
  'Readiness Complete (Internal)',
  'Archived',
]);

export const AssuranceEngagementInputSchema = z
  .object({
    organizationId: z.string().min(1, 'Organization is required'),
    engagementName: z
      .string()
      .trim()
      .min(3, 'Engagement name must be at least 3 characters')
      .max(160, 'Engagement name cannot exceed 160 characters'),
    engagementObjective: z
      .string()
      .trim()
      .min(10, 'Engagement objective must be at least 10 characters')
      .max(500, 'Engagement objective cannot exceed 500 characters'),
    reportingBoundary: z
      .string()
      .trim()
      .min(5, 'Reporting boundary is required')
      .max(300, 'Reporting boundary cannot exceed 300 characters'),
    reportingYear: ReportingYearSchema,
    engagementType: EngagementTypeSchema,
    assuranceLevel: PlannedAssuranceLevelSchema,
    engagementStatus: EngagementStatusSchema,
    scopeDescription: z
      .string()
      .trim()
      .min(10, 'Scope description must be at least 10 characters')
      .max(1000, 'Scope description cannot exceed 1000 characters'),
    plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date (YYYY-MM-DD) required'),
    plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date (YYYY-MM-DD) required'),
    methodologyVersion: z.string().trim().min(1, 'Methodology version is required'),
  })
  .refine(
    (data) => {
      const start = new Date(data.plannedStartDate).getTime();
      const end = new Date(data.plannedEndDate).getTime();
      return !Number.isNaN(start) && !Number.isNaN(end) && end >= start;
    },
    {
      message: 'Planned end date must be on or after the planned start date.',
      path: ['plannedEndDate'],
    }
  );

export const ESGPillarSchema = z.enum(['Environmental', 'Social', 'Governance']);

export const AssertionTypeSchema = z.enum([
  'Completeness',
  'Accuracy',
  'Occurrence',
  'Cutoff',
  'Classification',
  'Consistency',
  'Presentation',
]);

export const ValueBasisSchema = z.enum([
  'Reported',
  'Estimated',
  'Missing',
  'Not Applicable',
  'Verified Zero',
]);

export const AssertionReviewStatusSchema = z.enum([
  'Unreviewed',
  'In Review',
  'Reviewed',
  'Flagged',
  'Archived',
]);

export const ESGAssertionInputSchema = z
  .object({
    engagementId: z.string().min(1, 'Engagement is required'),
    metricCode: z
      .string()
      .trim()
      .min(2, 'Metric code is required (e.g., GHG-SC1-01)')
      .max(40, 'Metric code too long'),
    metricName: z
      .string()
      .trim()
      .min(3, 'Metric name is required')
      .max(150, 'Metric name too long'),
    pillar: ESGPillarSchema,
    reportingYear: ReportingYearSchema,
    facilityId: z.string().min(1, 'Facility is required'),
    reportedValue: z.number().nullable(),
    valueBasis: ValueBasisSchema,
    unit: z.string().trim().min(1, 'Unit is required').max(30, 'Unit too long'),
    assertionType: AssertionTypeSchema,
    reportingBoundary: z
      .string()
      .trim()
      .min(3, 'Reporting boundary is required')
      .max(200, 'Reporting boundary too long'),
    dataSource: z.string().trim().max(250, 'Data source too long'),
    calculationMethod: z.string().trim().min(2, 'Calculation method is required').max(250),
    reviewStatus: AssertionReviewStatusSchema,
    requiresEvidence: z.boolean(),
    linkedEvidenceIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.valueBasis === 'Missing' && data.reportedValue !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing values must remain null; do not convert missing values into zero or numbers.',
        path: ['reportedValue'],
      });
    }
    if (data.valueBasis === 'Not Applicable' && data.reportedValue !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Not-applicable values must have a null reported value.',
        path: ['reportedValue'],
      });
    }
    if (data.valueBasis === 'Verified Zero' && data.reportedValue !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Verified Zero basis requires an explicit reported value of 0.',
        path: ['reportedValue'],
      });
    }
    if (
      (data.valueBasis === 'Reported' || data.valueBasis === 'Estimated') &&
      data.reportedValue === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.valueBasis} basis requires a numeric value (or switch Value Basis to Missing).`,
        path: ['reportedValue'],
      });
    }
  });

export const ControlFrequencySchema = z.enum([
  'Continuous',
  'Daily',
  'Monthly',
  'Quarterly',
  'Annual',
  'Ad-Hoc',
]);

export const ControlTypeSchema = z.enum(['Preventive', 'Detective', 'Corrective']);

export const ControlDesignStatusSchema = z.enum([
  'Undocumented',
  'Draft',
  'Documented',
  'Requires Remediation',
]);

export const ControlOperatingStatusSchema = z.enum([
  'Not Tested',
  'Testing Planned (Phase 2)',
  'Exception Identified',
  'Operating Effectively',
  'Operating Ineffectively',
  'Inconclusive',
]);

export const InternalControlInputSchema = z.object({
  engagementId: z.string().min(1, 'Engagement is required'),
  controlCode: z
    .string()
    .trim()
    .min(3, 'Control code is required (e.g., ENV-CTRL-01)')
    .max(40, 'Control code too long'),
  controlName: z
    .string()
    .trim()
    .min(4, 'Control name must be at least 4 characters')
    .max(160, 'Control name too long'),
  pillar: ESGPillarSchema,
  controlObjective: z
    .string()
    .trim()
    .min(8, 'Control objective is required')
    .max(500, 'Control objective too long'),
  riskDescription: z
    .string()
    .trim()
    .min(8, 'Risk description is required')
    .max(500, 'Risk description too long'),
  controlOwner: z
    .string()
    .trim()
    .min(2, 'Control owner must be assigned')
    .max(120, 'Control owner name too long'),
  controlFrequency: ControlFrequencySchema,
  controlType: ControlTypeSchema,
  controlDescription: z
    .string()
    .trim()
    .min(10, 'Control description must be at least 10 characters')
    .max(1000, 'Control description too long'),
  designStatus: ControlDesignStatusSchema,
  operatingStatus: ControlOperatingStatusSchema,
  linkedAssertionIds: z.array(z.string()),
  linkedEvidenceIds: z.array(z.string()),
  lastReviewedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date (YYYY-MM-DD) required'),
});

export const LinkedEntityTypeSchema = z.enum([
  'ESGAssertion',
  'InternalControl',
  'AssuranceEngagement',
  'AuditProcedure',
  'SampleItem',
  'DesignTest',
  'OperatingTest',
  'GHGRecalculation',
  'AuditFinding',
]);

export const EvidenceUploadInputSchema = z.object({
  engagementId: z.string().min(1, 'Engagement is required'),
  linkedEntityType: LinkedEntityTypeSchema,
  linkedEntityId: z.string().min(1, 'Linked entity is required'),
  evidenceType: z.enum([
    'Utility Invoice',
    'Meter Calibration Log',
    'Calculation Workpaper',
    'Emission Factor Reference',
    'HR Payroll Extract',
    'Safety Incident Log',
    'Board Resolution / Policy',
    'Third-Party Statement',
  ]),
  reviewerNotes: z.string().trim().max(500, 'Reviewer notes cannot exceed 500 characters'),
});

// ============================================================================
// PHASE 2 ZOD VALIDATION SCHEMAS
// ============================================================================

export const AuditPlanStatusSchema = z.enum([
  'Draft',
  'Under Review',
  'Approved for Internal Testing',
  'Testing in Progress',
  'Testing Completed',
  'Closed',
]);

export const RiskBandSchema = z.enum(['Low', 'Moderate', 'High', 'Critical']);

export const AuditPlanInputSchema = z
  .object({
    engagementId: z.string().min(1, 'Engagement is required'),
    reportingYear: ReportingYearSchema,
    auditObjective: z.string().trim().min(10, 'Audit objective must be at least 10 characters'),
    auditScope: z.string().trim().min(10, 'Audit scope must be at least 10 characters'),
    reportingBoundary: z.string().trim().min(5, 'Reporting boundary is required'),
    auditCriteria: z.string().trim().min(5, 'Audit criteria (e.g., ISO 14064-3 / ESRS) required'),
    methodologyVersion: z.string().trim().min(2, 'Methodology version is required'),
    plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date (YYYY-MM-DD) required'),
    plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date (YYYY-MM-DD) required'),
    planningMateriality: z.number().positive('Planning materiality must be greater than zero'),
    materialityUnit: z.string().trim().min(1, 'Materiality unit (e.g., tCO2e or %) is required'),
    materialityRationale: z
      .string()
      .trim()
      .min(10, 'Materiality rationale must be documented (at least 10 characters)'),
    overallRiskAssessment: RiskBandSchema,
    status: AuditPlanStatusSchema,
  })
  .refine(
    (data) => {
      const start = new Date(data.plannedStartDate).getTime();
      const end = new Date(data.plannedEndDate).getTime();
      return !Number.isNaN(start) && !Number.isNaN(end) && end >= start;
    },
    {
      message: 'Audit plan end date must be on or after the start date.',
      path: ['plannedEndDate'],
    }
  );

export const AuditProcedureTypeSchema = z.enum([
  'Inquiry',
  'Inspection',
  'Observation',
  'Reperformance',
  'Recalculation',
  'Analytical Review',
]);

export const AuditProcedureStatusSchema = z.enum([
  'Planned',
  'In Progress',
  'Submitted for Review',
  'Completed',
  'Blocked',
]);

export const AuditProcedureInputSchema = z
  .object({
    auditPlanId: z.string().min(1, 'Audit Plan is required'),
    linkedAssertionIds: z.array(z.string()).min(1, 'Link at least one ESG assertion'),
    linkedControlIds: z.array(z.string()).min(1, 'Link at least one internal control'),
    procedureName: z.string().trim().min(5, 'Procedure name is required'),
    auditObjective: z.string().trim().min(10, 'Procedure objective is required'),
    procedureType: AuditProcedureTypeSchema,
    testingMethod: z.string().trim().min(5, 'Testing method description is required'),
    populationDefinition: z.string().trim().min(5, 'Population definition is required'),
    expectedEvidence: z.string().trim().min(5, 'Expected evidence description is required'),
    assignedPreparer: z.string().trim().min(2, 'Assigned preparer is required'),
    assignedReviewer: z.string().trim().min(2, 'Assigned reviewer is required'),
    plannedSampleSize: z.number().int().min(1, 'Planned sample size must be at least 1'),
    status: AuditProcedureStatusSchema,
  })
  .refine((data) => data.assignedPreparer.trim() !== data.assignedReviewer.trim(), {
    message: 'Assigned reviewer must be independent from the assigned preparer.',
    path: ['assignedReviewer'],
  });

export const RiskCategorySchema = z.enum([
  'Data Completeness',
  'Measurement & Calibration',
  'Emission Factor Selection',
  'Consolidation Boundary',
  'Manual Spreadsheet Processing',
  'Supplier Primary Data',
  'Regulatory Classification',
]);

export const RiskAssessmentInputSchema = z
  .object({
    engagementId: z.string().min(1, 'Engagement is required'),
    linkedAssertionId: z.string().min(1, 'Linked assertion is required'),
    linkedControlId: z.string().min(1, 'Linked control is required'),
    riskCategory: RiskCategorySchema,
    likelihood: z.number().int().min(1, 'Likelihood must be 1–5').max(5, 'Likelihood must be 1–5'),
    impact: z.number().int().min(1, 'Impact must be 1–5').max(5, 'Impact must be 1–5'),
    controlEffectivenessBasis: z.string().trim().nullable(),
    controlRiskScore: z.number().int().min(1).max(5).nullable(),
    assessmentRationale: z.string().trim().min(10, 'Assessment rationale is required'),
    evidenceReferences: z.array(z.string()),
    assessedBy: z.string().trim().min(2, 'Assessor identity is required'),
  })
  .superRefine((data, ctx) => {
    const hasBasis =
      Boolean(data.controlEffectivenessBasis) &&
      data.controlEffectivenessBasis!.trim().length >= 5;
    if (!hasBasis && data.controlRiskScore !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Control risk and residual risk cannot be scored without a documented control-effectiveness basis.',
        path: ['controlRiskScore'],
      });
    }
  });

// ============================================================================
// PHASE 3 ZOD VALIDATION SCHEMAS (v0.3.0)
// ============================================================================

export const DisclosureFrameworkInputSchema = z.object({
  frameworkName: z.string().trim().min(2, 'Framework name is required').max(160),
  frameworkVersion: z.string().trim().min(1, 'Framework version is required').max(80),
  issuingOrganization: z.string().trim().min(2, 'Issuing organization is required').max(160),
  jurisdiction: z.string().trim().min(2, 'Jurisdiction is required').max(120),
  effectivePeriod: z.string().trim().min(2, 'Effective period is required').max(120),
  description: z.string().trim().min(5, 'Description is required').max(800),
  isCustomFramework: z.boolean(),
});

export const DisclosureRequirementTypeSchema = z.enum([
  'Quantitative',
  'Qualitative',
  'Policy / Governance',
  'Hybrid',
]);

export const DisclosureApplicabilityStatusSchema = z.enum([
  'Applicable',
  'Not Applicable',
]);

export const DisclosureRequirementInputSchema = z.object({
  frameworkId: z.string().min(1, 'Framework ID is required'),
  requirementCode: z
    .string()
    .trim()
    .min(2, 'Requirement code is required')
    .max(60)
    .regex(/^[A-Za-z0-9._\-\s:()]+$/, 'Requirement code contains invalid characters'),
  requirementTitle: z.string().trim().min(4, 'Requirement title is required').max(200),
  pillar: ESGPillarSchema,
  topic: z.string().trim().min(2, 'Topic is required').max(120),
  subTopic: z.string().trim().min(2, 'Sub-topic is required').max(120),
  requirementType: DisclosureRequirementTypeSchema,
  mandatoryLevel: z.string().trim().min(2, 'Mandatory level is required').max(80),
  expectedUnit: z.string().trim().min(1, 'Expected unit is required').max(60),
  guidanceSummary: z.string().trim().min(5, 'Guidance summary is required').max(1000),
  applicabilityStatus: DisclosureApplicabilityStatusSchema,
});

export const DisclosureMappingStatusSchema = z.enum([
  'Not Mapped',
  'Partially Mapped',
  'Fully Mapped',
]);

export const DisclosureMappingInputSchema = z.object({
  engagementId: z.string().min(1, 'Engagement ID is required'),
  frameworkId: z.string().min(1, 'Framework ID is required'),
  requirementId: z.string().min(1, 'Requirement ID is required'),
  linkedAssertionIds: z.array(z.string()),
  linkedControlIds: z.array(z.string()),
  linkedProcedureIds: z.array(z.string()),
  linkedEvidenceIds: z.array(z.string()),
  mappingStatus: DisclosureMappingStatusSchema,
  coveragePercentage: z.number().min(0).max(100),
  mappingRationale: z.string().trim().min(5, 'Mapping rationale is required').max(800),
  identifiedGaps: z.string().trim().max(800),
  mappedBy: z.string().trim().min(2, 'Mapped by actor is required').max(120),
  reviewedBy: z.string().trim().nullable(),
});

export const FinancialMaterialityInputSchema = z.object({
  engagementId: z.string().min(1, 'Engagement is required'),
  esgTopic: z.string().trim().min(3, 'ESG topic is required').max(160),
  pillar: ESGPillarSchema,
  timeHorizon: z.enum(['Short', 'Medium', 'Long']),
  financialEffectType: z.enum([
    'Revenue',
    'Cost',
    'Capital Access',
    'Asset Impairment',
    'Regulatory Penalty',
  ]),
  magnitudeScore: z.number().int().min(1).max(5),
  likelihoodScore: z.number().int().min(1).max(5),
  materialityThreshold: z.number().min(1).max(25),
  rationale: z.string().trim().min(5, 'Rationale is required').max(1000),
  assessedBy: z.string().trim().min(2, 'Assessed by actor is required').max(120),
  reviewedBy: z.string().trim().nullable(),
});

export const ImpactMaterialityInputSchema = z
  .object({
    engagementId: z.string().min(1, 'Engagement is required'),
    esgTopic: z.string().trim().min(3, 'ESG topic is required').max(160),
    impactType: z.enum(['Actual', 'Potential']),
    polarity: z.enum(['Positive', 'Negative']),
    scaleScore: z.number().int().min(1).max(5),
    scopeScore: z.number().int().min(1).max(5),
    irremediableCharacterScore: z.number().int().min(1).max(5),
    likelihoodScore: z.number().int().min(1).max(5).nullable(),
    impactThreshold: z.number().min(1).max(5),
    rationale: z.string().trim().min(5, 'Rationale is required').max(1000),
    assessedBy: z.string().trim().min(2, 'Assessed by actor is required').max(120),
    reviewedBy: z.string().trim().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.impactType === 'Actual' && data.likelihoodScore !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Actual impacts must have likelihoodScore set to null; do not mechanically apply likelihood to actual impacts.',
        path: ['likelihoodScore'],
      });
    }
    if (data.impactType === 'Potential' && data.likelihoodScore === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Potential impacts require a likelihoodScore between 1 and 5.',
        path: ['likelihoodScore'],
      });
    }
  });

export const AuditMaterialityInputSchema = z
  .object({
    engagementId: z.string().min(1, 'Engagement is required'),
    metricCode: z.string().trim().min(2, 'Metric code is required').max(60),
    metricName: z.string().trim().min(3, 'Metric name is required').max(160),
    benchmarkBaseValue: z.number().positive('Benchmark base value must be > 0'),
    planningMaterialityPct: z.number().positive('Planning materiality % must be > 0').max(100),
    planningMaterialityAbsolute: z.number().positive('Planning materiality must be > 0'),
    performanceMaterialityPct: z.number().positive('Performance materiality % must be > 0').max(100),
    performanceMaterialityAbsolute: z.number().positive('Performance materiality must be > 0'),
    clearlyTrivialThresholdPct: z.number().positive('Clearly trivial % must be > 0').max(100),
    clearlyTrivialAbsolute: z.number().positive('Clearly trivial threshold must be > 0'),
    unit: z.string().trim().min(1, 'Unit is required').max(40),
    qualitativeFactors: z.string().trim().min(5, 'Qualitative factors are required').max(800),
    approvedBy: z.string().trim().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.performanceMaterialityAbsolute > data.planningMaterialityAbsolute) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Performance Materiality cannot exceed Planning Materiality (Performance Materiality must be <= Planning Materiality).',
        path: ['performanceMaterialityAbsolute'],
      });
    }
    if (data.clearlyTrivialAbsolute >= data.performanceMaterialityAbsolute) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Clearly Trivial Threshold must be strictly lower than Performance Materiality.',
        path: ['clearlyTrivialAbsolute'],
      });
    }
  });

export const StructuredJsonExportSchema = z.object({
  schemaVersion: z.enum(['v0.3.0', 'v1.0.0']),
  exportedAt: z.string().min(1),
  snapshotId: z.string().min(1),
  reportId: z.string().min(1),
  engagementId: z.string().min(1),
  reportType: z.string().min(1),
  reportingPeriod: ReportingYearSchema,
  methodologyVersion: z.string().min(1),
  disclaimerStatement: z.string().min(20),
  reportSnapshotHash: z.string().length(64),
  excludedHashMetadataFields: z.array(z.string()),
  sourceRecordIds: z.array(z.string()),
  reportSections: z.array(
    z.object({
      sectionId: z.string(),
      sectionOrder: z.number(),
      sectionTitle: z.string(),
      included: z.boolean(),
      narrativeSummary: z.string(),
      keyMetrics: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          unit: z.string().optional(),
        })
      ),
      tableHeaders: z.array(z.string()).optional(),
      tableRows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).optional(),
    })
  ),
});

// ============================================================================
// PHASE 4 ZOD VALIDATION SCHEMAS (v1.0.0)
// ============================================================================

export const AiAuditTaskTypeSchema = z.enum([
  'Audit Procedure Drafting',
  'Evidence Summarization',
  'Control Deficiency Analysis',
  'GHG Variance Explanation',
  'Disclosure Gap Analysis',
  'Materiality Assessment Assistance',
  'Findings Drafting',
  'Management Action Recommendations',
  'Audit Report Narrative Assistance',
  'Methodology Question Answering',
]);

export const AiAuditRequestInputSchema = z.object({
  engagementId: z.string().trim().min(1, 'Engagement ID is required').max(80),
  taskType: AiAuditTaskTypeSchema,
  selectedRecordIds: z
    .array(z.string().trim().min(1).max(80))
    .max(60, 'Cannot select more than 60 records in a single grounding context'),
  userQuestion: z
    .string()
    .trim()
    .min(5, 'User question or objective must be at least 5 characters')
    .max(2000, 'User question cannot exceed 2,000 characters'),
  methodologyContext: z
    .string()
    .trim()
    .min(3, 'Methodology context is required')
    .max(500, 'Methodology context cannot exceed 500 characters'),
});

export const EncodedEvidenceBlobSchema = z.object({
  evidenceId: z.string().min(1),
  base64Bytes: z.string().min(1),
  byteLength: z.number().int().nonnegative(),
  sha256Checksum: z.string().min(16),
  mimeType: z.string().min(1),
  documentName: z.string().min(1),
  uploadedAt: z.string().min(1),
});

export const BackupManifestSchema = z.object({
  manifestId: z.string().min(1),
  backupVersion: z.literal('v1.0.0'),
  dbSchemaVersion: z.number().int().min(1).max(10),
  scope: z.enum(['Full Application', 'Single Engagement']),
  engagementId: z.string().min(1),
  createdAt: z.string().min(1),
  createdBy: z.string().min(1),
  storeRecordCounts: z.record(z.string(), z.number().int().nonnegative()),
  binaryBlobCount: z.number().int().nonnegative(),
  binaryBlobTotalBytes: z.number().int().nonnegative(),
  archiveChecksumSha256: z.string().length(64),
});

export const BackupArchiveEnvelopeSchema = z.object({
  manifest: BackupManifestSchema,
  stores: z.record(z.string(), z.array(z.unknown())),
  encodedEvidenceBlobs: z.array(EncodedEvidenceBlobSchema),
});
