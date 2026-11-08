import {
  AuditFinding,
  AuditPlan,
  AuditProcedure,
  DesignTest,
  EmissionActivityRecord,
  EmissionFactorRecord,
  GHGRecalculationResult,
  OperatingTest,
  PopulationItemRecord,
  ReviewRecord,
  RiskAssessment,
  SampleItem,
  SamplingPlan,
} from '../types/domain';
import { evaluateRiskAssessment } from '../services/riskEngine';
import { executeAuditSampling } from '../services/samplingEngine';
import { executeGhgShadowRecalculation } from '../services/ghgEngine';

export interface Phase2SyntheticDataset {
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
}

const P2_SEED_TIMESTAMP = '2026-01-20T10:00:00.000Z';

export function generatePhase2SyntheticDataset(): Phase2SyntheticDataset {
  // 1. Audit Plans (3)
  const auditPlans: AuditPlan[] = [
    {
      auditPlanId: 'PLN-2024-001',
      engagementId: 'ENG-2024-001',
      reportingYear: 'FY 2024',
      auditObjective:
        'Verify historical FY 2024 Scope 1, Scope 2, and occupational safety baseline assertions and internal control design.',
      auditScope: 'All 5 European plants — Scope 1 stationary/mobile, Scope 2 grid, and ISO 45001 TRIR.',
      reportingBoundary: 'Operational Control - 5 European Manufacturing Facilities',
      auditCriteria: 'GHG Protocol Corporate Standard, ISO 14064-3, ESRS E1 & S1',
      methodologyVersion: 'ISAE 3000 / ISO 14064-3 Internal Readiness v1.2',
      plannedStartDate: '2024-10-05',
      plannedEndDate: '2025-02-20',
      planningMateriality: 5.0,
      materialityUnit: '% of Scope 1+2 tCO2e',
      materialityRationale:
        '5% quantitative planning threshold aligned with internal ESG audit materiality guidelines for baseline inventories.',
      overallRiskAssessment: 'Moderate',
      status: 'Testing Completed',
      createdAt: '2024-10-01T09:00:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      auditPlanId: 'PLN-2025-002',
      engagementId: 'ENG-2025-002',
      reportingYear: 'FY 2025',
      auditObjective:
        'Execute CSRD / ESRS pre-assurance control testing, statistical sampling, and independent GHG shadow recalculation across Scopes 1, 2, and 3.',
      auditScope:
        'Consolidated manufacturing operations covering ESRS E1 (Scopes 1, 2, 3 Cat 1/3/4/6/7), E3 (Water), E5 (Waste), S1 (Workforce), and G1 (Ethics).',
      reportingBoundary: 'Operational Control - Consolidated Manufacturing Operations',
      auditCriteria: 'ESRS Set 1, GHG Protocol Corporate & Scope 3 Standards, ISSA 5000 Readiness',
      methodologyVersion: 'CSRD / ISSA 5000 Readiness Framework v2.0',
      plannedStartDate: '2025-09-10',
      plannedEndDate: '2026-03-25',
      planningMateriality: 4.0,
      materialityUnit: '% of Pillar Total',
      materialityRationale:
        '4% conservative pre-assurance materiality threshold to identify and remediate misstatements prior to external practitioner verification.',
      overallRiskAssessment: 'High',
      status: 'Testing in Progress',
      createdAt: '2025-09-01T09:00:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      auditPlanId: 'PLN-2026-003',
      engagementId: 'ENG-2026-003',
      reportingYear: 'FY 2026',
      auditObjective:
        'Establish early-cycle control design walkthroughs and automated meter calibration verification for FY 2026.',
      auditScope: 'Munich, Stuttgart, Gdansk, Lyon, and newly commissioned Graz facility.',
      reportingBoundary: 'Operational Control - Including Graz Commissioning Site',
      auditCriteria: 'ISO 14064-1:2018 & ISO 14064-3:2019 Readiness',
      methodologyVersion: 'GHG Protocol / ISO 14064-1 Readiness v2.1',
      plannedStartDate: '2026-01-20',
      plannedEndDate: '2026-11-15',
      planningMateriality: 3.5,
      materialityUnit: '% of Total GHG Inventory',
      materialityRationale:
        'Tightened 3.5% threshold for planned reasonable assurance readiness preparation.',
      overallRiskAssessment: 'High',
      status: 'Approved for Internal Testing',
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
  ];

  // 2. Audit Procedures (8) covering all 6 procedure types
  const auditProcedures: AuditProcedure[] = [
    {
      procedureId: 'PRC-2025-001',
      auditPlanId: 'PLN-2025-002',
      linkedAssertionIds: ['AST-ASN-001', 'AST-ASN-013', 'AST-ASN-025'],
      linkedControlIds: ['AST-CTL-001', 'AST-CTL-006'],
      procedureName: 'Scope 1 Natural Gas Meter-to-Invoice Inspection & Recalculation',
      auditObjective:
        'Verify physical natural gas consumption (m3) against utility invoices and recalculate tCO2e using DEFRA 2025 factors.',
      procedureType: 'Recalculation',
      testingMethod: 'Independent shadow recalculation and monthly invoice inspection.',
      populationDefinition: '60 monthly natural gas meter & invoice postings across 5 facilities in FY 2025.',
      expectedEvidence: 'Monthly utility gas invoices, calibration logs, and SAP EHS meter extract.',
      assignedPreparer: 'Martina Bergmann (Corporate Sustainability Controller)',
      assignedReviewer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      plannedSampleSize: 8,
      status: 'Completed',
      createdAt: P2_SEED_TIMESTAMP,
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      procedureId: 'PRC-2025-002',
      auditPlanId: 'PLN-2025-002',
      linkedAssertionIds: ['AST-ASN-002', 'AST-ASN-014', 'AST-ASN-026'],
      linkedControlIds: ['AST-CTL-002', 'AST-CTL-004'],
      procedureName: 'Scope 2 Location & Market-Based Electricity Instrument Inspection',
      auditObjective:
        'Inspect grid electricity invoices and Guarantee of Origin (GoO) retirement statements for vintage and boundary eligibility.',
      procedureType: 'Inspection',
      testingMethod: 'Vouching of MWh consumption and GoO contractual retirement certificates.',
      populationDefinition: 'All facility electricity accounts and renewable attribute certificates for FY 2025.',
      expectedEvidence: 'Utility tariff bills, GoO registry retirement statements, AIB residual mix reference.',
      assignedPreparer: 'Martina Bergmann (Corporate Sustainability Controller)',
      assignedReviewer: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      plannedSampleSize: 6,
      status: 'In Progress',
      createdAt: P2_SEED_TIMESTAMP,
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      procedureId: 'PRC-2025-003',
      auditPlanId: 'PLN-2025-002',
      linkedAssertionIds: ['AST-ASN-003', 'AST-ASN-016', 'AST-ASN-027'],
      linkedControlIds: ['AST-CTL-005'],
      procedureName: 'Scope 3 Cat 1 Raw Material Supplier EPD & Spend Reperformance',
      auditObjective:
        'Reperform physical weight and spend-based Scope 3 Category 1 emissions calculations using Monetary-Unit Sampling.',
      procedureType: 'Reperformance',
      testingMethod: 'Monetary-unit sampling of high-value steel/aluminum purchase orders and EPD factor check.',
      populationDefinition: 'Top tier-1 raw metal and polymer procurement batches in FY 2025.',
      expectedEvidence: 'ERP purchase orders, weighbridge receipts, supplier EPDs, Ecoinvent v3.10 factor table.',
      assignedPreparer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      assignedReviewer: 'Martina Bergmann (Corporate Sustainability Controller)',
      plannedSampleSize: 6,
      status: 'In Progress',
      createdAt: P2_SEED_TIMESTAMP,
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      procedureId: 'PRC-2025-004',
      auditPlanId: 'PLN-2025-002',
      linkedAssertionIds: ['AST-ASN-006', 'AST-ASN-030'],
      linkedControlIds: ['AST-CTL-009'],
      procedureName: 'Hazardous Waste Weighbridge & Manifest Physical Observation',
      auditObjective:
        'Observe hazardous waste container weighing and inspect manifest chain-of-custody logs.',
      procedureType: 'Observation',
      testingMethod: 'On-site observation of weighbridge procedures and manifest reconciliation.',
      populationDefinition: 'All hazardous waste shipments from Stuttgart and Gdansk plants.',
      expectedEvidence: 'Signed waste transfer manifests and weighbridge calibration certificate.',
      assignedPreparer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      assignedReviewer: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      plannedSampleSize: 5,
      status: 'Blocked',
      createdAt: P2_SEED_TIMESTAMP,
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      procedureId: 'PRC-2025-005',
      auditPlanId: 'PLN-2025-002',
      linkedAssertionIds: ['AST-ASN-007', 'AST-ASN-008', 'AST-ASN-031'],
      linkedControlIds: ['AST-CTL-011', 'AST-CTL-012'],
      procedureName: 'Workforce FTE Census & OSHA Recordable Incident Analytical Review',
      auditObjective:
        'Perform monthly analytical trend review of FTE headcount and cross-check safety incident logs.',
      procedureType: 'Analytical Review',
      testingMethod: 'Month-over-month variance analysis and payroll-to-Workday reconciliation.',
      populationDefinition: '12 monthly HR census snapshots and plant EHS incident registers.',
      expectedEvidence: 'Workday HCM payroll extract and ISO 45001 incident log.',
      assignedPreparer: 'Sabine Hartmann (VP Human Resources)',
      assignedReviewer: 'Martina Bergmann (Corporate Sustainability Controller)',
      plannedSampleSize: 6,
      status: 'Completed',
      createdAt: P2_SEED_TIMESTAMP,
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      procedureId: 'PRC-2025-006',
      auditPlanId: 'PLN-2025-002',
      linkedAssertionIds: ['AST-ASN-010', 'AST-ASN-011'],
      linkedControlIds: ['AST-CTL-019', 'AST-CTL-020'],
      procedureName: 'Ethics Hotline & Anti-Corruption Attestation Governance Inquiry',
      auditObjective:
        'Inquire of General Counsel and inspect EthicsPoint log for substantiated whistleblower cases.',
      procedureType: 'Inquiry',
      testingMethod: 'Structured management inquiry corroborated by independent hotline register inspection.',
      populationDefinition: 'All FY 2025 ethics hotline tickets and annual compliance attestations.',
      expectedEvidence: 'Ethics Committee minutes and compliance portal completion extract.',
      assignedPreparer: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      assignedReviewer: 'Martina Bergmann (Corporate Sustainability Controller)',
      plannedSampleSize: 4,
      status: 'Completed',
      createdAt: P2_SEED_TIMESTAMP,
      updatedAt: P2_SEED_TIMESTAMP,
    },
  ];

  // 3. Risk Assessments (12) using deterministic evaluateRiskAssessment
  const riskInputs = [
    {
      riskAssessmentId: 'RSK-2025-001',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-001',
      linkedControlId: 'AST-CTL-001',
      riskCategory: 'Measurement & Calibration' as const,
      likelihood: 3,
      impact: 4,
      controlEffectivenessBasis:
        'Operating effectiveness test OPT-2025-001 completed and approved with zero exceptions across 8 sampled meter reconciliations.',
      controlRiskScore: 2,
      controlIsTestedAndEffective: true,
      assessmentRationale:
        'Stationary combustion gas meters are calibrated quarterly and reconciled monthly against utility invoices.',
      evidenceReferences: ['EVD-DEMO-001'],
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-002',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-003',
      linkedControlId: 'AST-CTL-005',
      riskCategory: 'Supplier Primary Data' as const,
      likelihood: 5,
      impact: 5,
      controlEffectivenessBasis: null, // Untested control -> residual risk MUST remain null / Unassessed
      controlRiskScore: null,
      controlIsTestedAndEffective: false,
      assessmentRationale:
        'Scope 3 Cat 1 raw metal supplier EPDs have high inherent estimation uncertainty and control ENV-CTL-005 is still in Draft status.',
      evidenceReferences: ['EVD-DEMO-003'],
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-003',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-029',
      linkedControlId: 'AST-CTL-003',
      riskCategory: 'Emission Factor Selection' as const,
      likelihood: 4,
      impact: 4,
      controlEffectivenessBasis: null,
      controlRiskScore: null,
      controlIsTestedAndEffective: false,
      assessmentRationale:
        'Incompatible unit (Liters vs tCO2e) detected on AST-ASN-029; control effectiveness not yet verified.',
      evidenceReferences: ['EVD-DEMO-015'],
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-004',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-039',
      linkedControlId: 'AST-CTL-009',
      riskCategory: 'Data Completeness' as const,
      likelihood: 5,
      impact: 4,
      controlEffectivenessBasis: null,
      controlRiskScore: null,
      controlIsTestedAndEffective: false,
      assessmentRationale:
        'Control ENV-CTL-009 is Unassigned (DQ-05) and assertion AST-ASN-039 lacks supporting evidence (DQ-04).',
      evidenceReferences: [],
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-005',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-007',
      linkedControlId: 'AST-CTL-011',
      riskCategory: 'Data Completeness' as const,
      likelihood: 2,
      impact: 3,
      controlEffectivenessBasis:
        'Operating effectiveness test OPT-2025-002 verified monthly Workday HCM census reconciliations with zero exceptions.',
      controlRiskScore: 1,
      controlIsTestedAndEffective: true,
      assessmentRationale: 'Automated HRIS integration with low historical error rate.',
      evidenceReferences: ['EVD-DEMO-007'],
      assessedBy: 'Sabine Hartmann (VP Human Resources)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-006',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-011',
      linkedControlId: 'AST-CTL-020',
      riskCategory: 'Regulatory Classification' as const,
      likelihood: 1,
      impact: 4,
      controlEffectivenessBasis:
        'Operating test OPT-2025-003 confirmed independent EthicsPoint log review by General Counsel.',
      controlRiskScore: 2,
      controlIsTestedAndEffective: true,
      assessmentRationale: 'Low volume of hotline tickets with independent legal committee oversight.',
      evidenceReferences: ['EVD-DEMO-011'],
      assessedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-007',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-055',
      linkedControlId: 'AST-CTL-021',
      riskCategory: 'Manual Spreadsheet Processing' as const,
      likelihood: 5,
      impact: 4,
      controlEffectivenessBasis: null,
      controlRiskScore: null,
      controlIsTestedAndEffective: false,
      assessmentRationale:
        'Manual spreadsheet control GOV-CTL-021 is unowned and AST-ASN-055 uses an unsupported calculation proxy.',
      evidenceReferences: [],
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
    {
      riskAssessmentId: 'RSK-2025-008',
      engagementId: 'ENG-2025-002',
      linkedAssertionId: 'AST-ASN-058',
      linkedControlId: 'AST-CTL-010',
      riskCategory: 'Consolidation Boundary' as const,
      likelihood: 3,
      impact: 5,
      controlEffectivenessBasis: null,
      controlRiskScore: null,
      controlIsTestedAndEffective: false,
      assessmentRationale:
        'Boundary completeness risk identified on secondary paint shop annex (DQ-09).',
      evidenceReferences: ['EVD-DEMO-020'],
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      assessedAt: P2_SEED_TIMESTAMP,
    },
  ];

  const riskAssessments: RiskAssessment[] = riskInputs.map((inp) =>
    evaluateRiskAssessment(inp)
  );

  // 4. Reproducible Sampling Plans (4) covering all 4 methods
  const gasPopulation: PopulationItemRecord[] = Array.from({ length: 20 }, (_, i) => ({
    recordId: `AST-ASN-${String(i + 1).padStart(3, '0')}`,
    label: `Monthly Facility Gas & Energy Posting #${i + 1}`,
    bookValue: Number((1200 + ((i * 317) % 1800)).toFixed(2)),
    facilityId: `FAC-0${(i % 5) + 1}`,
    riskFlagged: i === 4 || i === 11 || i === 17,
  }));

  const srsResult = executeAuditSampling({
    samplingPlanId: 'SMP-2025-001',
    procedureId: 'PRC-2025-001',
    populationId: 'POP-FY25-GAS-METERS',
    populationRecords: gasPopulation,
    samplingMethod: 'Simple Random Sampling',
    requestedSampleSize: 6,
    randomSeed: 202501,
    orderingRule: 'Assertion ID Ascending',
    selectionTimestamp: P2_SEED_TIMESTAMP,
  });
  // Mark all 6 items in SMP-2025-001 as Tested - No Exception so OPT-2025-001 satisfies all guardrails
  srsResult.items.forEach((item) => {
    item.testingStatus = 'Tested - No Exception';
    item.linkedEvidenceIds = ['EVD-DEMO-001'];
  });

  const sysResult = executeAuditSampling({
    samplingPlanId: 'SMP-2025-002',
    procedureId: 'PRC-2025-005',
    populationId: 'POP-FY25-HR-CENSUS',
    populationRecords: gasPopulation.slice(0, 15),
    samplingMethod: 'Systematic Sampling',
    requestedSampleSize: 5,
    randomSeed: 202502,
    systematicStartPosition: 1,
    orderingRule: 'Monthly Census Chronological Order',
    selectionTimestamp: P2_SEED_TIMESTAMP,
  });
  sysResult.items.forEach((item) => {
    item.testingStatus = 'Tested - No Exception';
    item.linkedEvidenceIds = ['EVD-DEMO-007'];
  });

  // Monetary-Unit Sampling population with a large anchor item to demonstrate multiplicity (hitCount > 1)
  const musPopulation: PopulationItemRecord[] = [
    {
      recordId: 'PO-2025-STEEL-001',
      label: 'ThyssenKrupp Low-Carbon Steel Coil Batch A',
      bookValue: 4500, // Large item that receives multiple monetary hits
      facilityId: 'FAC-MUN-01',
      riskFlagged: true,
    },
    {
      recordId: 'PO-2025-ALUM-002',
      label: 'Hydro Primary Aluminum Ingots Q1',
      bookValue: 950,
      facilityId: 'FAC-STU-02',
    },
    {
      recordId: 'PO-2025-POLY-003',
      label: 'BASF Engineering Polymers Shipment',
      bookValue: 820,
      facilityId: 'FAC-LYO-04',
    },
    {
      recordId: 'PO-2025-COPP-004',
      label: 'KGHM Copper Rod Cathode Lot',
      bookValue: 1100,
      facilityId: 'FAC-GDN-03',
    },
    {
      recordId: 'PO-2025-PACK-005',
      label: 'Mondi Corrugated Industrial Packaging',
      bookValue: 630,
      facilityId: 'FAC-3RD-05',
    },
    {
      recordId: 'PO-2025-FAST-006',
      label: 'Precision Titanium Fasteners Batch',
      bookValue: 1000,
      facilityId: 'FAC-MUN-01',
    },
  ];

  const musResult = executeAuditSampling({
    samplingPlanId: 'SMP-2025-003',
    procedureId: 'PRC-2025-003',
    populationId: 'POP-FY25-SCOPE3-CAT1-POS',
    populationRecords: musPopulation,
    samplingMethod: 'Monetary-Unit Sampling',
    requestedSampleSize: 6,
    randomSeed: 202503,
    systematicStartPosition: 250,
    orderingRule: 'Purchase Order ID Ascending',
    selectionTimestamp: P2_SEED_TIMESTAMP,
  });
  // Mark 1 item with an exception and others tested
  musResult.items.forEach((item, idx) => {
    item.testingStatus = idx === 1 ? 'Tested - Exception Identified' : 'Tested - No Exception';
    if (idx === 1) {
      item.exceptionNotes =
        'Supplier EPD factor vintage was 2021 instead of contractual 2025 factor.';
    }
    item.linkedEvidenceIds = ['EVD-DEMO-003'];
  });

  const judgmentalResult = executeAuditSampling({
    samplingPlanId: 'SMP-2025-004',
    procedureId: 'PRC-2025-002',
    populationId: 'POP-FY25-ELEC-ACCOUNTS',
    populationRecords: gasPopulation.slice(0, 12),
    samplingMethod: 'Risk-Based Judgmental Selection',
    requestedSampleSize: 4,
    randomSeed: 202504,
    judgmentalRationale:
      'Targeted non-statistical selection of assertions flagged by deterministic DQ rules and highest MWh consumption plants.',
    riskCriteria: 'DQ-Flagged Assertions + Top 2 Thermal Consumption Plants',
    selectionTimestamp: P2_SEED_TIMESTAMP,
  });

  const samplingPlans: SamplingPlan[] = [
    srsResult.plan,
    sysResult.plan,
    musResult.plan,
    judgmentalResult.plan,
  ];

  const sampleItems: SampleItem[] = [
    ...srsResult.items,
    ...sysResult.items,
    ...musResult.items,
    ...judgmentalResult.items,
  ];

  // 5. Control Testing Workpapers: Design Tests (4) & Operating Tests (4)
  const designTests: DesignTest[] = [
    {
      designTestId: 'DST-2025-001',
      controlId: 'AST-CTL-001',
      procedureId: 'PRC-2025-001',
      testObjective:
        'Verify whether monthly natural gas invoice-to-meter reconciliation is designed to prevent and detect completeness and accuracy errors.',
      designCriteria: 'COSO Internal Control Integrated Framework & ISO 14064-3 Control Design',
      walkthroughDescription:
        'Traced November 2025 Munich plant natural gas flowmeter log through SAP EHS staging table to monthly Stadtwerke München utility invoice and controller sign-off.',
      evidenceIds: ['EVD-DEMO-001'],
      testResult: 'Adequately Designed',
      preparer: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewStatus: 'Approved',
      conclusionRationale:
        'Automated 2% variance threshold in SAP EHS flags discrepancies prior to ledger posting; design is appropriate.',
      testedAt: P2_SEED_TIMESTAMP,
    },
    {
      designTestId: 'DST-2025-002',
      controlId: 'AST-CTL-009',
      procedureId: 'PRC-2025-004',
      testObjective:
        'Evaluate design of hazardous waste manifest and weighbridge reconciliation control.',
      designCriteria: 'ESRS E5 Circular Economy & Waste Control Criteria',
      walkthroughDescription:
        'Attempted walkthrough of Gdansk and Stuttgart waste manifest logs; identified that control owner role has been vacant since Q3 2025 and no written SOP exists.',
      evidenceIds: ['EVD-DEMO-009'],
      testResult: 'Design Deficiency',
      preparer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewer: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      reviewStatus: 'Approved',
      conclusionRationale:
        'Material design deficiency: Control lacks an assigned owner (DQ-05) and formal reconciliation threshold.',
      testedAt: P2_SEED_TIMESTAMP,
    },
    {
      designTestId: 'DST-2025-003',
      controlId: 'AST-CTL-011',
      procedureId: 'PRC-2025-005',
      testObjective: 'Evaluate design of monthly Workday HCM workforce FTE census reconciliation.',
      designCriteria: 'ESRS S1 Own Workforce Reporting Controls',
      walkthroughDescription:
        'Walked through automated Workday-to-Payroll interface and HR VP sign-off checklist.',
      evidenceIds: ['EVD-DEMO-007'],
      testResult: 'Adequately Designed',
      preparer: 'Sabine Hartmann (VP Human Resources)',
      reviewer: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewStatus: 'Approved',
      conclusionRationale: 'Control design appropriately prevents duplicate headcount reporting.',
      testedAt: P2_SEED_TIMESTAMP,
    },
    {
      designTestId: 'DST-2025-004',
      controlId: 'AST-CTL-021',
      procedureId: 'PRC-2025-006',
      testObjective: 'Evaluate spreadsheet formula lock and version control on pre-assurance tables.',
      designCriteria: 'ITGC & End-User Computing (EUC) Control Standards',
      walkthroughDescription:
        'Inspected consolidation workbook permissions; cells were unlocked and lacked peer-review sign-off.',
      evidenceIds: ['EVD-DEMO-021'],
      testResult: 'Design Deficiency',
      preparer: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewer: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      reviewStatus: 'Submitted for Review',
      conclusionRationale: 'Unassigned control owner and unlocked formula cells create high overwrite risk.',
      testedAt: P2_SEED_TIMESTAMP,
    },
  ];

  const operatingTests: OperatingTest[] = [
    {
      operatingTestId: 'OPT-2025-001',
      controlId: 'AST-CTL-001',
      samplingPlanId: 'SMP-2025-001',
      testingPeriod: 'FY 2025 (2025-01-01 to 2025-12-31)',
      testProcedure:
        'Inspected 6 randomly sampled monthly natural gas meter-to-invoice reconciliations across Munich and Stuttgart plants and verified engineering sign-off.',
      sampleResults: srsResult.items.map((itm) => ({
        sampleItemId: itm.sampleItemId,
        passed: true,
        exceptionDetail: 'No exception noted.',
      })),
      exceptions: 0,
      exceptionsEvaluated: true,
      exceptionEvaluationNotes: 'Zero exceptions across all 6 sampled monthly reconciliations.',
      evidenceIds: ['EVD-DEMO-001'],
      preparer: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      conclusion: 'Operating Effectively',
      conclusionRationale:
        'All 6 sampled monthly reconciliations operated effectively throughout FY 2025 with timely variance sign-off.',
      reviewStatus: 'Approved',
      testedAt: P2_SEED_TIMESTAMP,
    },
    {
      operatingTestId: 'OPT-2025-002',
      controlId: 'AST-CTL-011',
      samplingPlanId: 'SMP-2025-002',
      testingPeriod: 'FY 2025 (2025-01-01 to 2025-12-31)',
      testProcedure:
        'Tested 5 systematically sampled monthly Workday HCM census reconciliations against plant payroll registers.',
      sampleResults: sysResult.items.map((itm) => ({
        sampleItemId: itm.sampleItemId,
        passed: true,
        exceptionDetail: 'No exception noted.',
      })),
      exceptions: 0,
      exceptionsEvaluated: true,
      exceptionEvaluationNotes: 'Zero exceptions across systematic sample.',
      evidenceIds: ['EVD-DEMO-007'],
      preparer: 'Sabine Hartmann (VP Human Resources)',
      reviewer: 'Martina Bergmann (Corporate Sustainability Controller)',
      conclusion: 'Operating Effectively',
      conclusionRationale: 'Control operated effectively across all sampled months in FY 2025.',
      reviewStatus: 'Approved',
      testedAt: P2_SEED_TIMESTAMP,
    },
    {
      operatingTestId: 'OPT-2025-003',
      controlId: 'AST-CTL-005',
      samplingPlanId: 'SMP-2025-003',
      testingPeriod: 'FY 2025 (2025-01-01 to 2025-12-31)',
      testProcedure:
        'Tested Monetary-Unit Sample of Scope 3 Category 1 supplier EPD validations and procurement weight reconciliations.',
      sampleResults: musResult.items.map((itm, idx) => ({
        sampleItemId: itm.sampleItemId,
        passed: idx !== 1,
        exceptionDetail:
          idx === 1
            ? 'Supplier aluminum batch used outdated 2021 EPD factor without controller override approval.'
            : 'Verified against supplier EPD.',
      })),
      exceptions: 1,
      exceptionsEvaluated: true,
      exceptionEvaluationNotes:
        '1 operating exception identified on PO-2025-ALUM-002; control concluded as Operating Ineffectively pending remediation.',
      evidenceIds: ['EVD-DEMO-003'],
      preparer: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewer: 'Martina Bergmann (Corporate Sustainability Controller)',
      conclusion: 'Operating Ineffectively',
      conclusionRationale:
        'Operating exception on supplier EPD vintage check indicates control did not operate consistently during Q1 2025.',
      reviewStatus: 'Approved',
      testedAt: P2_SEED_TIMESTAMP,
    },
  ];

  // 6. Emission Factor Catalog (12 Factors with full provenance across Scopes 1, 2, 3)
  const emissionFactors: EmissionFactorRecord[] = [
    {
      emissionFactorId: 'EF-SC1-GAS-CO2-2025',
      factorName: 'Natural Gas Stationary Combustion — CO2 (Germany/EU)',
      factorSource: 'UK DESNZ / DEFRA & UBA Germany GHG Conversion Factors',
      factorVersion: 'v2025.1',
      geography: 'Germany / EU',
      applicableYear: 'FY 2025',
      gas: 'CO2',
      factorValue: 2.02, // 2.02 kgCO2 / m3
      numeratorUnit: 'kgCO2',
      denominatorUnit: 'm3',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'DEFRA 2025 Table 1.1 Natural Gas (m3)',
    },
    {
      emissionFactorId: 'EF-SC1-GAS-CH4-2025',
      factorName: 'Natural Gas Stationary Combustion — CH4 (IPCC AR6)',
      factorSource: 'IPCC 2006 / AR6 Stationary Combustion Default',
      factorVersion: 'v2025.1',
      geography: 'Global / EU',
      applicableYear: 'FY 2025',
      gas: 'CH4',
      factorValue: 0.004, // 0.004 kgCH4 / m3
      numeratorUnit: 'kgCH4',
      denominatorUnit: 'm3',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 27.9, // AR6 fossil CH4 GWP-100
      sourceReference: 'IPCC AR6 WG1 Table 7.15 (CH4 Fossil GWP100 = 27.9)',
    },
    {
      emissionFactorId: 'EF-SC1-DIESEL-2025',
      factorName: 'Industrial Mobile Fleet Diesel Combustion (B7)',
      factorSource: 'DEFRA / UBA 2025 Mobile Fuels',
      factorVersion: 'v2025.1',
      geography: 'European Union',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 2.512, // 2.512 kgCO2e / Liter
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'Liters',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'DEFRA 2025 Liquid Fuels — Diesel (average biofuel blend)',
    },
    {
      emissionFactorId: 'EF-SC1-HFC134A-2025',
      factorName: 'Fugitive Refrigerant Leakage — HFC-134a (Chillers)',
      factorSource: 'IPCC AR6 Refrigerant GWP Schedule',
      factorVersion: 'AR6-2025',
      geography: 'Global',
      applicableYear: 'FY 2025',
      gas: 'HFC-134a',
      factorValue: 1.0, // 1 kg HFC-134a per kg leaked
      numeratorUnit: 'kgHFC-134a',
      denominatorUnit: 'kg',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1530, // 1530 kgCO2e per kg HFC-134a
      sourceReference: 'IPCC AR6 WG1 Chapter 7 — HFC-134a 100-yr GWP = 1,530',
    },
    {
      emissionFactorId: 'EF-SC1-PROC-ALU-2025',
      factorName: 'Industrial Thermal Foundry Process Fluxing Factor',
      factorSource: 'UBA Germany Process Emissions Inventory',
      factorVersion: 'v2025.1',
      geography: 'Germany',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.42, // 0.42 tCO2e / Metric Ton metal processed
      numeratorUnit: 'tCO2e',
      denominatorUnit: 'Metric Tons',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'NIR Germany 2025 Industrial Processes Chapter 4',
    },
    {
      emissionFactorId: 'EF-SC2-LOC-DE-2025',
      factorName: 'Germany Grid Average Location-Based Factor',
      factorSource: 'IEA / Umweltbundesamt (UBA) Grid Mix',
      factorVersion: 'v2025.2',
      geography: 'Germany',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.38, // 0.38 tCO2e / MWh
      numeratorUnit: 'tCO2e',
      denominatorUnit: 'MWh',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'IEA / UBA Strommix 2025 (380 gCO2e/kWh)',
    },
    {
      emissionFactorId: 'EF-SC2-MKT-GOO-2025',
      factorName: 'Verified Guarantee of Origin (GoO) Hydropower Contractual Instrument',
      factorSource: 'AIB European Attribute Mix / Contractual GoO Registry',
      factorVersion: 'v2025.1',
      geography: 'Germany / Austria',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.0, // Eligible contractual zero factor
      numeratorUnit: 'tCO2e',
      denominatorUnit: 'MWh',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'GHG Protocol Scope 2 Quality Criteria Verified GoO Retirement',
    },
    {
      emissionFactorId: 'EF-SC2-MKT-RESID-PL-2025',
      factorName: 'Poland AIB Unbundled Residual Mix Factor',
      factorSource: 'Association of Issuing Bodies (AIB) European Residual Mixes',
      factorVersion: 'v2025.1',
      geography: 'Poland',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.785, // 0.785 tCO2e / MWh
      numeratorUnit: 'tCO2e',
      denominatorUnit: 'MWh',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'AIB 2025 Residual Mix Table — Poland (785 gCO2e/kWh)',
    },
    {
      emissionFactorId: 'EF-SC3-CAT1-STEEL-2025',
      factorName: 'Scope 3 Cat 1 — Hot-Rolled Low-Alloy Steel (Cradle-to-Gate)',
      factorSource: 'Ecoinvent v3.10 / WorldSteel LCA',
      factorVersion: 'v3.10',
      geography: 'European Union',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 1.85, // 1.85 tCO2e / Metric Ton
      numeratorUnit: 'tCO2e',
      denominatorUnit: 'Metric Tons',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'Ecoinvent v3.10 market for steel, low-alloyed, hot rolled (RER)',
    },
    {
      emissionFactorId: 'EF-SC3-CAT1-SPEND-2025',
      factorName: 'Scope 3 Cat 1 — Industrial Electronic Components (Spend-Based EEIO)',
      factorSource: 'EXIOBASE / US EPA Supply Chain EEIO Adjusted',
      factorVersion: 'v2025-EUR',
      geography: 'European Union',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.32, // 0.32 kgCO2e / EUR
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'EUR',
      factorCurrency: 'EUR',
      factorBaseYear: 2023,
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'EXIOBASE v3.8 Machinery & Electronic Components (Base Year 2023 EUR)',
    },
    {
      emissionFactorId: 'EF-SC3-CAT3-WTT-2025',
      factorName: 'Scope 3 Cat 3 — Upstream Well-to-Tank (WTT) & T&D Grid Losses',
      factorSource: 'DEFRA 2025 WTT & T&D Electricity Factors',
      factorVersion: 'v2025.1',
      geography: 'Germany / EU',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.095, // 0.095 tCO2e / MWh
      numeratorUnit: 'tCO2e',
      denominatorUnit: 'MWh',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'DEFRA 2025 Scope 3 Category 3 FERA Combined WTT + T&D',
    },
    {
      emissionFactorId: 'EF-SC3-CAT4-FREIGHT-2025',
      factorName: 'Scope 3 Cat 4 — Heavy Good Vehicle (HGV >32t) Road Freight',
      factorSource: 'GLEC Framework v3.0 / DEFRA 2025 Freight',
      factorVersion: 'v3.0',
      geography: 'European Union',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.082, // 0.082 kgCO2e / tonne-km
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'tonne-km',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'GLEC Framework v3.0 Articulated HGV Average Load',
    },
    {
      emissionFactorId: 'EF-SC3-CAT6-AIR-2025',
      factorName: 'Scope 3 Cat 6 — Short/Medium-Haul Business Air Travel (With RF)',
      factorSource: 'DEFRA 2025 Business Travel — Air',
      factorVersion: 'v2025.1',
      geography: 'Europe',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.156, // 0.156 kgCO2e / passenger-km
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'passenger-km',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'DEFRA 2025 Short-haul international flights with radiative forcing',
    },
    {
      emissionFactorId: 'EF-SC3-CAT7-COMMUTE-2025',
      factorName: 'Scope 3 Cat 7 — Employee Commuting Passenger Car & Rail Blend',
      factorSource: 'UBA Germany Mobility Factor Library',
      factorVersion: 'v2025.1',
      geography: 'Europe',
      applicableYear: 'FY 2025',
      gas: 'CO2e',
      factorValue: 0.118, // 0.118 kgCO2e / passenger-km
      numeratorUnit: 'kgCO2e',
      denominatorUnit: 'passenger-km',
      gwpBasis: 'IPCC AR6 (100-yr)',
      gwpValue: 1,
      sourceReference: 'UBA TREMOD 2025 Passenger Commute Modal Split',
    },
  ];

  // 7. Emission Activity Records (11) covering Scope 1 (all 4 types), Scope 2 (Location & Market), and Scope 3 (Categories 1, 3, 4, 6, 7)
  const emissionActivities: EmissionActivityRecord[] = [
    {
      activityId: 'ACT-SC1-STAT-001',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-MUN-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 1',
      scope3Category: null,
      activityType: 'Stationary Combustion',
      activityQuantity: 700000, // 700,000 m3 * 2.02 kgCO2/m3 = 1,414.0 tCO2e
      activityUnit: 'm3',
      valueStatus: 'Reported',
      calculationMethod: 'Calibrated Flowmeter Volume x DEFRA 2025 Natural Gas Factor',
      sourceReference: 'Munich Plant Meter Log #MUC-GAS-25',
      reportedEmissions: 1414.0, // Exact match -> 0% variance
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-025',
      evidenceIds: ['EVD-DEMO-001'],
    },
    {
      activityId: 'ACT-SC1-MOB-002',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-STU-02',
      reportingYear: 'FY 2025',
      scope: 'Scope 1',
      scope3Category: null,
      activityType: 'Mobile Combustion',
      activityQuantity: 85000, // 85,000 Liters * 2.512 kgCO2e/L = 213.52 tCO2e
      activityUnit: 'Liters',
      valueStatus: 'Reported',
      calculationMethod: 'Fleet Fuel Card Statements x DEFRA Diesel Factor',
      sourceReference: 'Stuttgart Forklift & Fleet Fuel Ledger',
      reportedEmissions: 209.0, // +2.16% variance -> Review Required
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-026',
      evidenceIds: ['EVD-DEMO-002'],
    },
    {
      activityId: 'ACT-SC1-FUG-003',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-LYO-04',
      reportingYear: 'FY 2025',
      scope: 'Scope 1',
      scope3Category: null,
      activityType: 'Fugitive Emissions',
      activityQuantity: 42, // 42 kg HFC-134a * 1530 GWP = 64,260 kgCO2e = 64.26 tCO2e
      activityUnit: 'kg',
      valueStatus: 'Reported',
      calculationMethod: 'Chiller Maintenance Recharge Mass Balance x IPCC AR6 GWP (1530)',
      sourceReference: 'Lyon HVAC Service Certificate #LYO-REF-25',
      reportedEmissions: 54.6, // +17.69% variance -> Material Variance Candidate (used outdated AR4 GWP 1300!)
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-027',
      evidenceIds: ['EVD-DEMO-007'],
    },
    {
      activityId: 'ACT-SC1-PROC-004',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-STU-02',
      reportingYear: 'FY 2025',
      scope: 'Scope 1',
      scope3Category: null,
      activityType: 'Process Emissions',
      activityQuantity: 1200, // 1,200 Metric Tons * 0.42 tCO2e/t = 504.0 tCO2e
      activityUnit: 'Metric Tons',
      valueStatus: 'Reported',
      calculationMethod: 'Foundry Metal Throughput x UBA Process Factor',
      sourceReference: 'Stuttgart Foundry Production Ledger',
      reportedEmissions: 504.0,
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-028',
      evidenceIds: ['EVD-DEMO-008'],
    },
    {
      activityId: 'ACT-SC2-LOC-005',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-MUN-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 2 Location-Based',
      scope3Category: null,
      activityType: 'Grid Electricity (Location-Based)',
      activityQuantity: 5800, // 5,800 MWh * 0.38 tCO2e/MWh = 2,204.0 tCO2e
      activityUnit: 'MWh',
      valueStatus: 'Reported',
      calculationMethod: 'Grid Electricity MWh x IEA/UBA Germany Location Factor',
      sourceReference: 'Siemens EMS Sub-Meter Summary FY25',
      reportedEmissions: 2180.0, // +1.10% variance -> Review Required
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-002',
      evidenceIds: ['EVD-DEMO-002'],
    },
    {
      activityId: 'ACT-SC2-MKT-006',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-MUN-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 2 Market-Based',
      scope3Category: null,
      activityType: 'Contractual / Residual Electricity (Market-Based)',
      activityQuantity: 5800, // 5,800 MWh covered by verified hydropower GoOs -> 0 tCO2e
      activityUnit: 'MWh',
      valueStatus: 'Reported',
      contractualInstrumentStatus: 'Eligible GoO / REC Verified',
      calculationMethod: 'Verified Hydropower GoO Retirement Matched to Munich Plant Consumption',
      sourceReference: 'UBA HKNR Registry Cancellation Statement #DE-2025-8841',
      reportedEmissions: 0, // Zero reported -> percentageVariance MUST be null (undefined)!
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-014',
      evidenceIds: ['EVD-DEMO-004'],
    },
    {
      activityId: 'ACT-SC2-MKT-007',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-GDN-03',
      reportingYear: 'FY 2025',
      scope: 'Scope 2 Market-Based',
      scope3Category: null,
      activityType: 'Contractual / Residual Electricity (Market-Based)',
      activityQuantity: 3200, // 3,200 MWh * 0.785 Poland Residual Mix = 2,512.0 tCO2e
      activityUnit: 'MWh',
      valueStatus: 'Reported',
      contractualInstrumentStatus: 'Residual Mix Applied',
      calculationMethod: 'Uncovered Grid Consumption x AIB Poland Residual Mix Factor',
      sourceReference: 'Gdansk Utility Invoices & AIB 2025 Table',
      reportedEmissions: 2100.0, // +19.62% variance -> Material Variance Candidate (plant mistakenly used location factor instead of residual mix!)
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-034',
      evidenceIds: ['EVD-DEMO-005'],
    },
    {
      activityId: 'ACT-SC3-CAT1-008',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-MUN-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 3',
      scope3Category: 'Category 1: Purchased Goods and Services',
      activityType: 'Activity-Based Physical',
      activityQuantity: 3050, // 3,050 Metric Tons steel * 1.85 tCO2e/t = 5,642.5 tCO2e
      activityUnit: 'Metric Tons',
      valueStatus: 'Reported',
      calculationMethod: 'Physical Weight Method (Metric Tons x Ecoinvent v3.10 Factor)',
      sourceReference: 'SAP MM Steel Receipts Ledger FY25',
      reportedEmissions: 5640.25, // +0.04% -> Within Tolerance
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: 'AST-ASN-003',
      evidenceIds: ['EVD-DEMO-003'],
    },
    {
      activityId: 'ACT-SC3-CAT3-009',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-MUN-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 3',
      scope3Category: 'Category 3: Fuel- and Energy-Related Activities',
      activityType: 'Activity-Based Physical',
      activityQuantity: 5800, // 5,800 MWh * 0.095 tCO2e/MWh = 551.0 tCO2e
      activityUnit: 'MWh',
      valueStatus: 'Reported',
      calculationMethod: 'Consumed Electricity MWh x DEFRA WTT + T&D Factor',
      sourceReference: 'Siemens EMS MWh Log',
      reportedEmissions: 551.0,
      reportedEmissionsUnit: 'tCO2e',
      evidenceIds: ['EVD-DEMO-002'],
    },
    {
      activityId: 'ACT-SC3-CAT4-010',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-GDN-03',
      reportingYear: 'FY 2025',
      scope: 'Scope 3',
      scope3Category: 'Category 4: Upstream Transportation and Distribution',
      activityType: 'Activity-Based Physical',
      activityQuantity: 4200000, // 4,200,000 tonne-km * 0.082 kgCO2e/tkm = 344.4 tCO2e
      activityUnit: 'tonne-km',
      valueStatus: 'Estimated',
      calculationMethod: 'Shipment Mass x Road Distance x GLEC HGV Factor',
      sourceReference: 'Freight Forwarder Telemetry Manifest',
      reportedEmissions: 344.4,
      reportedEmissionsUnit: 'tCO2e',
      evidenceIds: ['EVD-DEMO-010'],
    },
    {
      activityId: 'ACT-SC3-CAT6-011',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-LYO-04',
      reportingYear: 'FY 2025',
      scope: 'Scope 3',
      scope3Category: 'Category 6: Business Travel',
      activityType: 'Activity-Based Physical',
      activityQuantity: 650000, // 650,000 passenger-km * 0.156 kgCO2e/pkm = 101.4 tCO2e
      activityUnit: 'passenger-km',
      valueStatus: 'Reported',
      calculationMethod: 'Corporate Travel Agency Flight Distance x DEFRA Air Factor',
      sourceReference: 'Concur Travel Booking Extract FY25',
      reportedEmissions: 101.4,
      reportedEmissionsUnit: 'tCO2e',
      evidenceIds: ['EVD-DEMO-012'],
    },
    {
      activityId: 'ACT-SC3-CAT7-012',
      engagementId: 'ENG-2025-002',
      facilityId: 'FAC-MUN-01',
      reportingYear: 'FY 2025',
      scope: 'Scope 3',
      scope3Category: 'Category 7: Employee Commuting',
      activityType: 'Activity-Based Physical',
      activityQuantity: 1850000, // 1,850,000 passenger-km * 0.118 kgCO2e/pkm = 218.3 tCO2e
      activityUnit: 'passenger-km',
      valueStatus: 'Estimated',
      calculationMethod: 'Annual Employee Commute Survey Modal Split x UBA Factor',
      sourceReference: 'HR Annual Mobility Survey Workpaper',
      reportedEmissions: 218.3,
      reportedEmissionsUnit: 'tCO2e',
      evidenceIds: ['EVD-DEMO-014'],
    },
  ];

  // Pair each activity with its canonical factor and run deterministic recalculation
  const activityFactorPairs: Array<{ actId: string; efId: string }> = [
    { actId: 'ACT-SC1-STAT-001', efId: 'EF-SC1-GAS-CO2-2025' },
    { actId: 'ACT-SC1-MOB-002', efId: 'EF-SC1-DIESEL-2025' },
    { actId: 'ACT-SC1-FUG-003', efId: 'EF-SC1-HFC134A-2025' },
    { actId: 'ACT-SC1-PROC-004', efId: 'EF-SC1-PROC-ALU-2025' },
    { actId: 'ACT-SC2-LOC-005', efId: 'EF-SC2-LOC-DE-2025' },
    { actId: 'ACT-SC2-MKT-006', efId: 'EF-SC2-MKT-GOO-2025' },
    { actId: 'ACT-SC2-MKT-007', efId: 'EF-SC2-MKT-RESID-PL-2025' },
    { actId: 'ACT-SC3-CAT1-008', efId: 'EF-SC3-CAT1-STEEL-2025' },
    { actId: 'ACT-SC3-CAT3-009', efId: 'EF-SC3-CAT3-WTT-2025' },
    { actId: 'ACT-SC3-CAT4-010', efId: 'EF-SC3-CAT4-FREIGHT-2025' },
    { actId: 'ACT-SC3-CAT6-011', efId: 'EF-SC3-CAT6-AIR-2025' },
    { actId: 'ACT-SC3-CAT7-012', efId: 'EF-SC3-CAT7-COMMUTE-2025' },
  ];

  const efMap = new Map(emissionFactors.map((f) => [f.emissionFactorId, f]));
  const actMap = new Map(emissionActivities.map((a) => [a.activityId, a]));

  const ghgRecalculations: GHGRecalculationResult[] = activityFactorPairs.map(
    (pair, idx) =>
      executeGhgShadowRecalculation({
        recalculationId: `REC-2025-${String(idx + 1).padStart(3, '0')}`,
        activity: actMap.get(pair.actId)!,
        factor: efMap.get(pair.efId)!,
        calculationTimestamp: P2_SEED_TIMESTAMP,
      })
  );

  // 8. Audit Findings & Remediation Register (6)
  const auditFindings: AuditFinding[] = [
    {
      auditFindingId: 'AFD-2025-001',
      engagementId: 'ENG-2025-002',
      procedureId: 'PRC-2025-004',
      linkedAssertionId: 'AST-ASN-039',
      linkedControlId: 'AST-CTL-009',
      findingType: 'Control Design Deficiency',
      severity: 'Critical',
      description:
        'Hazardous waste manifest reconciliation control (ENV-CTL-009) has no assigned control owner and lacks documented reconciliation thresholds.',
      rootCause:
        'Turnover in Gdansk EHS department without formal handover of control ownership.',
      impact:
        'Potential unrecorded hazardous waste shipments or misstated ESRS E5 diversion rates.',
      evidenceIds: ['EVD-DEMO-009'],
      responsibleOwner: 'Piotr Kowalski (Gdansk Plant Operations Lead)',
      remediationAction:
        'Assign formal control owner, publish SOP for monthly weighbridge-to-manifest reconciliation, and attach Q4 evidence.',
      targetDate: '2026-02-01', // Overdue relative to current date
      remediationStatus: 'Open',
      retestStatus: 'Not Retested',
      createdAt: '2025-11-15T10:00:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      auditFindingId: 'AFD-2025-002',
      engagementId: 'ENG-2025-002',
      procedureId: 'PRC-2025-003',
      linkedAssertionId: 'AST-ASN-003',
      linkedControlId: 'AST-CTL-005',
      findingType: 'Control Operating Exception',
      severity: 'High',
      description:
        'Monetary-unit sample testing (OPT-2025-003) identified 1 aluminum procurement batch calculated using an outdated 2021 supplier EPD factor.',
      rootCause:
        'Procurement analyst did not verify EPD validity period before entering factor into Scope 3 workbook.',
      impact: 'Understatement of Scope 3 Category 1 emissions by 48.2 tCO2e on batch PO-2025-ALUM-002.',
      evidenceIds: ['EVD-DEMO-003'],
      responsibleOwner: 'Henrik Lindqvist (VP Sustainable Procurement)',
      remediationAction:
        'Update supplier EPD factor table to 2025 vintage and enforce mandatory two-person review on Scope 3 factor updates.',
      targetDate: '2026-03-15',
      remediationStatus: 'In Progress',
      retestStatus: 'Not Retested',
      createdAt: '2025-12-01T11:00:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      auditFindingId: 'AFD-2025-003',
      engagementId: 'ENG-2025-002',
      procedureId: 'PRC-2025-001',
      linkedAssertionId: 'AST-ASN-027',
      linkedControlId: 'AST-CTL-007',
      findingType: 'GHG Recalculation Variance',
      severity: 'High',
      description:
        'Shadow recalculation REC-2025-003 identified a +17.69% (+9.66 tCO2e) variance on Lyon HFC-134a fugitive emissions due to use of outdated IPCC AR4 GWP (1,300) instead of IPCC AR6 GWP (1,530).',
      rootCause: 'Legacy plant spreadsheet formula hardcoded AR4 GWP multiplier.',
      impact: 'Understatement of Scope 1 fugitive emissions by 9.66 tCO2e.',
      evidenceIds: ['EVD-DEMO-007'],
      responsibleOwner: 'Claire Moreau (Lyon EHS Manager)',
      remediationAction:
        'Update refrigerant calculation template to IPCC AR6 GWP (1,530) and lock formula cells.',
      targetDate: '2026-02-28',
      remediationStatus: 'Ready for Retest',
      retestStatus: 'Not Retested',
      createdAt: '2025-12-10T14:00:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      auditFindingId: 'AFD-2025-004',
      engagementId: 'ENG-2025-002',
      procedureId: 'PRC-2025-002',
      linkedAssertionId: 'AST-ASN-034',
      linkedControlId: 'AST-CTL-004',
      findingType: 'GHG Recalculation Variance',
      severity: 'Critical',
      description:
        'Shadow recalculation REC-2025-007 on Gdansk Scope 2 Market-Based electricity identified a +19.62% (+412.0 tCO2e) material variance candidate because the facility applied a location-based average factor instead of the AIB Poland residual mix factor (0.785 tCO2e/MWh).',
      rootCause:
        'Lack of AIB residual mix lookup table in the Gdansk energy reporting template.',
      impact: 'Material understatement of Scope 2 Market-Based emissions by 412.0 tCO2e.',
      evidenceIds: ['EVD-DEMO-005'],
      responsibleOwner: 'Martina Bergmann (Corporate Sustainability Controller)',
      remediationAction:
        'Restate Gdansk Scope 2 Market-Based assertion using the AIB 2025 residual mix factor and attach updated workpaper.',
      targetDate: '2026-01-31',
      remediationStatus: 'Action Planned',
      retestStatus: 'Not Retested',
      createdAt: '2025-12-18T09:30:00.000Z',
      updatedAt: P2_SEED_TIMESTAMP,
    },
    {
      auditFindingId: 'AFD-2024-005',
      engagementId: 'ENG-2024-001',
      procedureId: 'PRC-2025-005',
      linkedAssertionId: 'AST-ASN-008',
      linkedControlId: 'AST-CTL-012',
      findingType: 'Documentation / Evidence Gap',
      severity: 'Medium',
      description:
        'Q4 2024 Stuttgart contractor hours log lacked signed supervisor verification prior to TRIR calculation.',
      rootCause: 'Delayed timesheet submission from maintenance subcontractor.',
      impact: 'Minor denominator timing difference with zero impact on recordable incident count.',
      evidenceIds: ['EVD-DEMO-008'],
      responsibleOwner: 'Tomasz Zielinski (Group Health & Safety Director)',
      remediationAction:
        'Obtained signed contractor hours attestation and completed retest verification.',
      targetDate: '2025-02-15',
      remediationStatus: 'Closed',
      retestStatus: 'Retest Passed',
      retestNotes: 'Verified signed contractor timesheet archive and re-ran TRIR calculation.',
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-02-18T15:00:00.000Z',
    },
  ];

  // 9. Review Workflow Records (6)
  const reviews: ReviewRecord[] = [
    {
      reviewId: 'REV-2025-001',
      engagementId: 'ENG-2025-002',
      entityType: 'AuditPlan',
      entityId: 'PLN-2025-002',
      preparedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      reviewStatus: 'Approved',
      reviewComments: 'Audit plan materiality rationale and ESRS scope approved for internal testing.',
      reviewedAt: '2025-09-12T14:00:00.000Z',
      approvalTimestamp: '2025-09-12T14:00:00.000Z',
    },
    {
      reviewId: 'REV-2025-002',
      engagementId: 'ENG-2025-002',
      entityType: 'OperatingTest',
      entityId: 'OPT-2025-001',
      preparedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewStatus: 'Approved',
      reviewComments: 'Verified all 6 SRS sample items and meter calibration references.',
      reviewedAt: P2_SEED_TIMESTAMP,
      approvalTimestamp: P2_SEED_TIMESTAMP,
    },
    {
      reviewId: 'REV-2025-003',
      engagementId: 'ENG-2025-002',
      entityType: 'OperatingTest',
      entityId: 'OPT-2025-002',
      preparedBy: 'Sabine Hartmann (VP Human Resources)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewStatus: 'Approved',
      reviewComments: 'Systematic sample of Workday HCM census reconciliations verified with zero exceptions.',
      reviewedAt: P2_SEED_TIMESTAMP,
      approvalTimestamp: P2_SEED_TIMESTAMP,
    },
    {
      reviewId: 'REV-2025-004',
      engagementId: 'ENG-2025-002',
      entityType: 'DesignTest',
      entityId: 'DST-2025-004',
      preparedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: null,
      reviewStatus: 'Submitted for Review',
      reviewComments: 'Awaiting independent review of manual spreadsheet control deficiency.',
      reviewedAt: null,
      approvalTimestamp: null,
    },
    {
      reviewId: 'REV-2025-005',
      engagementId: 'ENG-2025-002',
      entityType: 'GHGRecalculation',
      entityId: 'REC-2025-007',
      preparedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: null,
      reviewStatus: 'Submitted for Review',
      reviewComments: 'Submitted Gdansk Scope 2 Market-Based residual mix variance calculation for controller review.',
      reviewedAt: null,
      approvalTimestamp: null,
    },
  ];

  return {
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
  };
}
