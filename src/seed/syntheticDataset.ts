import {
  AssuranceEngagement,
  AuditEvent,
  ESGAssertion,
  ESGPillar,
  EvidenceRecord,
  EvidenceType,
  Facility,
  InternalControl,
  Organization,
  ReportingYear,
  ValidationFinding,
} from '../types/domain';
import { runDeterministicValidation } from '../validation/dqEngine';

export interface SyntheticDataset {
  organization: Organization;
  facilities: Facility[];
  engagements: AssuranceEngagement[];
  assertions: ESGAssertion[];
  controls: InternalControl[];
  evidence: EvidenceRecord[];
  findings: ValidationFinding[];
  auditEvents: AuditEvent[];
}

const SEED_TIMESTAMP = '2026-01-15T09:00:00.000Z';

/**
 * Generates a 100% deterministic synthetic dataset for:
 * Asterion Manufacturing Ltd.
 * - 1 Organization
 * - 5 Manufacturing Facilities
 * - 3 Synthetic Audit Engagements (FY 2024, FY 2025, FY 2026)
 * - 60 ESG Assertions (with deliberate quality defects across DQ-01..DQ-10)
 * - 25 Internal Controls (with deliberate unowned & draft controls)
 * - 40 Evidence Metadata Records (explicitly marked as metadata-only demo unavailable)
 * - 15 Deterministic Validation Findings
 * - 100 Audit History Events
 */
export function generateSyntheticDataset(): SyntheticDataset {
  const organization: Organization = {
    organizationId: 'ORG-ASTERION-001',
    organizationName: 'Asterion Manufacturing Ltd.',
    industry: 'Precision Industrial & Clean-Tech Manufacturing',
    country: 'Germany',
    reportingCurrency: 'EUR',
    reportingBoundary: 'Operational Control Consolidation (5 Global Manufacturing Plants)',
    createdAt: '2024-01-10T08:00:00.000Z',
    updatedAt: SEED_TIMESTAMP,
  };

  const facilities: Facility[] = [
    {
      facilityId: 'FAC-MUN-01',
      organizationId: organization.organizationId,
      facilityCode: 'DE-MUC-01',
      facilityName: 'Munich Precision Assembly Plant',
      country: 'Germany',
      operationalStatus: 'Active',
      includedInBoundary: true,
    },
    {
      facilityId: 'FAC-STU-02',
      organizationId: organization.organizationId,
      facilityCode: 'DE-STR-02',
      facilityName: 'Stuttgart Thermal Foundry',
      country: 'Germany',
      operationalStatus: 'Active',
      includedInBoundary: true,
    },
    {
      facilityId: 'FAC-GDN-03',
      organizationId: organization.organizationId,
      facilityCode: 'PL-GDN-03',
      facilityName: 'Gdansk Component Fabrication Hub',
      country: 'Poland',
      operationalStatus: 'Active',
      includedInBoundary: true,
    },
    {
      facilityId: 'FAC-LYO-04',
      organizationId: organization.organizationId,
      facilityCode: 'FR-LYS-04',
      facilityName: 'Lyon Advanced Polymers Facility',
      country: 'France',
      operationalStatus: 'Active',
      includedInBoundary: true,
    },
    {
      facilityId: 'FAC-3RD-05',
      organizationId: organization.organizationId,
      facilityCode: 'AT-GRZ-05',
      facilityName: 'Graz Packaging & Logistics Center',
      country: 'Austria',
      operationalStatus: 'Commissioning',
      includedInBoundary: true,
    },
  ];

  const engagements: AssuranceEngagement[] = [
    {
      engagementId: 'ENG-2024-001',
      organizationId: organization.organizationId,
      engagementName: 'FY 2024 Internal ESG Audit & Baseline Review',
      engagementObjective:
        'Evaluate internal control design and historical baseline accuracy across Scope 1, Scope 2, and workforce safety disclosures for FY 2024.',
      reportingBoundary: 'Operational Control - 5 European Manufacturing Facilities',
      reportingYear: 'FY 2024',
      engagementType: 'Internal ESG Audit',
      assuranceLevel: 'Internal Audit Advisory Only',
      engagementStatus: 'Readiness Complete (Internal)',
      scopeDescription:
        'Internal audit review of stationary combustion, purchased electricity, water withdrawal, occupational safety incidents, and ethics governance metrics for FY 2024.',
      plannedStartDate: '2024-10-01',
      plannedEndDate: '2025-02-28',
      methodologyVersion: 'ISAE 3000 / ISO 14064-3 Internal Readiness v1.2',
      isSyntheticDemo: true,
      createdAt: '2024-09-15T10:00:00.000Z',
      updatedAt: '2025-03-01T16:30:00.000Z',
    },
    {
      engagementId: 'ENG-2025-002',
      organizationId: organization.organizationId,
      engagementName: 'FY 2025 CSRD / ESRS Assurance Readiness Assessment',
      engagementObjective:
        'Assess pre-assurance readiness of environmental, social, and governance disclosures and internal control documentation prior to external practitioner engagement.',
      reportingBoundary: 'Operational Control - Consolidated Manufacturing Operations',
      reportingYear: 'FY 2025',
      engagementType: 'ESG Assurance Readiness',
      assuranceLevel: 'Planned Limited Assurance Readiness',
      engagementStatus: 'Fieldwork',
      scopeDescription:
        'Comprehensive assurance-readiness evaluation covering ESRS E1 (Climate), E3 (Water), E5 (Waste), S1 (Own Workforce), and G1 (Business Conduct) assertions.',
      plannedStartDate: '2025-09-01',
      plannedEndDate: '2026-03-31',
      methodologyVersion: 'CSRD / ISSA 5000 Readiness Framework v2.0',
      isSyntheticDemo: true,
      createdAt: '2025-08-20T09:00:00.000Z',
      updatedAt: SEED_TIMESTAMP,
    },
    {
      engagementId: 'ENG-2026-003',
      organizationId: organization.organizationId,
      engagementName: 'FY 2026 GHG Inventory & Disclosure Controls Planning',
      engagementObjective:
        'Establish forward-looking GHG inventory verification readiness and automated meter reconciliation controls for FY 2026.',
      reportingBoundary: 'Operational Control - Including Graz Commissioning Site',
      reportingYear: 'FY 2026',
      engagementType: 'GHG Inventory Verification Readiness',
      assuranceLevel: 'Planned Reasonable Assurance Readiness',
      engagementStatus: 'Planning',
      scopeDescription:
        'Early-cycle control design review and assertion completeness check for FY 2026 Scope 1, Scope 2 (Location & Market-based), and Scope 3 Category 1 purchased goods.',
      plannedStartDate: '2026-01-15',
      plannedEndDate: '2026-11-30',
      methodologyVersion: 'GHG Protocol / ISO 14064-1 Readiness v2.1',
      isSyntheticDemo: true,
      createdAt: '2026-01-05T11:00:00.000Z',
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  // 40 Evidence Metadata Records (Metadata-only demo references; not downloadable or verified)
  const evidenceTypes: EvidenceType[] = [
    'Utility Invoice',
    'Meter Calibration Log',
    'Calculation Workpaper',
    'Emission Factor Reference',
    'HR Payroll Extract',
    'Safety Incident Log',
    'Board Resolution / Policy',
    'Third-Party Statement',
  ];

  const evidence: EvidenceRecord[] = Array.from({ length: 40 }, (_, idx) => {
    const num = idx + 1;
    const evId = `EVD-DEMO-${String(num).padStart(3, '0')}`;
    const engIdx = idx < 15 ? 0 : idx < 30 ? 1 : 2;
    const engagement = engagements[engIdx];
    const evType = evidenceTypes[idx % evidenceTypes.length];
    const targetAssertionNum = (idx % 38) + 1;
    const linkedAssertionId = `AST-ASN-${String(targetAssertionNum).padStart(3, '0')}`;

    return {
      evidenceId: evId,
      engagementId: engagement.engagementId,
      linkedEntityType: idx < 35 ? 'ESGAssertion' : 'InternalControl',
      linkedEntityId:
        idx < 35
          ? linkedAssertionId
          : `AST-CTL-${String((idx - 34) * 3).padStart(3, '0')}`,
      evidenceType: evType,
      documentName: `DEMO_METADATA_REF_${engagement.reportingYear.replace(' ', '')}_${evType
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')}_${String(num).padStart(2, '0')}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 0,
      checksum: `DEMO-METADATA-ONLY-NO-BINARY-PAYLOAD-${String(num).padStart(4, '0')}`,
      verificationStatus: 'Metadata Only (Demo Unavailable)',
      isMetadataOnlyDemo: true,
      reviewerNotes:
        'SYNTHETIC METADATA-ONLY REFERENCE: Binary file is intentionally unavailable in demonstration seed. Upload a real file to verify or download.',
      uploadedAt: '2025-11-10T12:00:00.000Z',
      reviewedAt: null,
    };
  });

  // Metric Catalog for the 60 ESG assertions
  const metricTemplates: Array<{
    code: string;
    name: string;
    pillar: ESGPillar;
    unit: string;
    calc: string;
    source: string;
    baseValue: number;
  }> = [
    {
      code: 'GHG-SC1-01',
      name: 'Direct Scope 1 Stationary Combustion Emissions',
      pillar: 'Environmental',
      unit: 'tCO2e',
      calc: 'Activity Data (Natural Gas m3) x DEFRA 2025 Emission Factor',
      source: 'SAP EHS Utility Meter Ledger',
      baseValue: 1420.5,
    },
    {
      code: 'GHG-SC2-01',
      name: 'Indirect Scope 2 Location-Based Electricity Emissions',
      pillar: 'Environmental',
      unit: 'tCO2e',
      calc: 'Grid Electricity Consumed (MWh) x IEA Country Grid Factor',
      source: 'Regional Grid Utility Invoices & Smart Meter Logs',
      baseValue: 2180.0,
    },
    {
      code: 'GHG-SC3-01',
      name: 'Scope 3 Cat 1 Purchased Goods & Raw Metals Emissions',
      pillar: 'Environmental',
      unit: 'tCO2e',
      calc: 'Physical Weight Method (Metric Tons Steel/Aluminum x Ecoinvent v3.10 Factor)',
      source: 'ERP Procurement Receipts & Supplier EPDs',
      baseValue: 5640.25,
    },
    {
      code: 'ENV-EN-01',
      name: 'Total Industrial Electricity Consumption',
      pillar: 'Environmental',
      unit: 'MWh',
      calc: 'Direct Sub-Metered Aggregation Reconciled to Monthly Invoices',
      source: 'Siemens Energy Management System (EMS)',
      baseValue: 6450.0,
    },
    {
      code: 'ENV-WT-01',
      name: 'Total Municipal & Groundwater Withdrawal',
      pillar: 'Environmental',
      unit: 'm3',
      calc: 'Calibrated Flowmeter Cumulative Readings',
      source: 'Facility Utility Water Meter Logs',
      baseValue: 18900.0,
    },
    {
      code: 'ENV-WS-01',
      name: 'Hazardous & Non-Hazardous Manufacturing Waste Diverted',
      pillar: 'Environmental',
      unit: 'Metric Tons',
      calc: 'Certified Weighbridge Transfer Note Summation',
      source: 'Licensed Waste Hauler Manifest Archive',
      baseValue: 312.8,
    },
    {
      code: 'SOC-WF-01',
      name: 'Permanent Full-Time Manufacturing Workforce',
      pillar: 'Social',
      unit: 'FTE',
      calc: 'Active Contract Headcount Normalized by Contractual Hours',
      source: 'Workday HCM Monthly Census Snapshot',
      baseValue: 410.0,
    },
    {
      code: 'SOC-HS-01',
      name: 'Recordable Work-Related Injury Frequency',
      pillar: 'Social',
      unit: 'Incidents',
      calc: 'Direct Count of OSHA/ISO 45001 Recordable Cases in Period',
      source: 'EHS Incident Management Portal',
      baseValue: 2.0,
    },
    {
      code: 'SOC-TR-01',
      name: 'Technical & Sustainability Compliance Training Hours',
      pillar: 'Social',
      unit: 'Hours',
      calc: 'Completed LMS Session Duration x Verified Attendance',
      source: 'Cornerstone Learning Management System (LMS)',
      baseValue: 8240.0,
    },
    {
      code: 'GOV-ET-01',
      name: 'Employees Completing Annual Anti-Corruption Attestation',
      pillar: 'Governance',
      unit: '%',
      calc: '(Signed Code of Conduct Attestations / Total Active Employees) x 100',
      source: 'Compliance Portal Attestation Register',
      baseValue: 98.4,
    },
    {
      code: 'GOV-ET-02',
      name: 'Substantiated Whistleblower & Ethics Hotline Cases',
      pillar: 'Governance',
      unit: 'Cases',
      calc: 'Closed Ethics Committee Investigation Ledger Count',
      source: 'EthicsPoint Independent Governance Log',
      baseValue: 0,
    },
    {
      code: 'GOV-BD-01',
      name: 'Supervisory Board ESG Oversight & Independence Ratio',
      pillar: 'Governance',
      unit: '%',
      calc: '(Independent Directors on Audit & Sustainability Committee / Total Members) x 100',
      source: 'Corporate Secretary Governance Charter File',
      baseValue: 80.0,
    },
  ];

  const assertionTypes = [
    'Completeness',
    'Accuracy',
    'Occurrence',
    'Cutoff',
    'Classification',
    'Consistency',
    'Presentation',
  ] as const;

  const assertions: ESGAssertion[] = Array.from({ length: 60 }, (_, idx) => {
    const num = idx + 1;
    const assertionId = `AST-ASN-${String(num).padStart(3, '0')}`;
    const engIdx = idx < 20 ? 0 : idx < 42 ? 1 : 2;
    const engagement = engagements[engIdx];
    const facility = facilities[idx % facilities.length];
    const template = metricTemplates[idx % metricTemplates.length];
    const assertionType = assertionTypes[idx % assertionTypes.length];
    const defaultEvId = `EVD-DEMO-${String((idx % 35) + 1).padStart(3, '0')}`;

    const isZeroMetric = template.code === 'GOV-ET-02';
    const baseVal = isZeroMetric
      ? 0
      : Number((template.baseValue + (idx % 7) * 37.5).toFixed(2));

    let reviewStatus: ESGAssertion['reviewStatus'] =
      idx < 16
        ? 'Reviewed'
        : idx < 28
          ? 'Reviewed'
          : idx < 42
            ? 'In Review'
            : 'Unreviewed';

    const item: ESGAssertion = {
      assertionId,
      engagementId: engagement.engagementId,
      metricCode: template.code,
      metricName: template.name,
      pillar: template.pillar,
      reportingYear: engagement.reportingYear,
      facilityId: facility.facilityId,
      reportedValue: baseVal,
      valueBasis: isZeroMetric ? 'Verified Zero' : idx % 9 === 0 ? 'Estimated' : 'Reported',
      unit: template.unit,
      assertionType,
      reportingBoundary: 'Operational Control - Facility Complete',
      dataSource: template.source,
      calculationMethod: template.calc,
      reviewStatus,
      requiresEvidence: true,
      linkedEvidenceIds: [defaultEvId],
      isSyntheticDemo: true,
      createdAt: '2025-10-01T08:00:00.000Z',
      updatedAt: SEED_TIMESTAMP,
    };

    // Inject the 13 deliberate assertion defects so DQ-01..DQ-10 produce exactly 15 findings (with 2 DQ-05 control defects)
    if (num === 5 || num === 12) {
      // DQ-01: Missing required assertion value
      item.reportedValue = null;
      item.valueBasis = 'Missing';
      item.reviewStatus = 'Flagged';
    } else if (num === 18) {
      // DQ-02: Duplicate of AST-ASN-017
      const prevTemplate = metricTemplates[16 % metricTemplates.length];
      item.engagementId = engagements[0].engagementId;
      item.reportingYear = engagements[0].reportingYear;
      item.facilityId = facilities[16 % facilities.length].facilityId;
      item.metricCode = prevTemplate.code;
      item.metricName = prevTemplate.name;
      item.pillar = prevTemplate.pillar;
      item.unit = prevTemplate.unit;
      item.assertionType = assertionTypes[16 % assertionTypes.length];
      item.reviewStatus = 'Flagged';
    } else if (num === 24) {
      // DQ-02: Duplicate of AST-ASN-023
      const prevTemplate = metricTemplates[22 % metricTemplates.length];
      item.engagementId = engagements[1].engagementId;
      item.reportingYear = engagements[1].reportingYear;
      item.facilityId = facilities[22 % facilities.length].facilityId;
      item.metricCode = prevTemplate.code;
      item.metricName = prevTemplate.name;
      item.pillar = prevTemplate.pillar;
      item.unit = prevTemplate.unit;
      item.assertionType = assertionTypes[22 % assertionTypes.length];
      item.reviewStatus = 'Flagged';
    } else if (num === 29) {
      // DQ-03: Incompatible unit on GHG-SC1-01
      item.metricCode = 'GHG-SC1-01';
      item.metricName = 'Direct Scope 1 Stationary Combustion Emissions';
      item.pillar = 'Environmental';
      item.unit = 'Liters';
      item.reviewStatus = 'Flagged';
    } else if (num === 34) {
      // DQ-03: Incompatible unit on GHG-SC2-01
      item.metricCode = 'GHG-SC2-01';
      item.metricName = 'Indirect Scope 2 Location-Based Electricity Emissions';
      item.pillar = 'Environmental';
      item.unit = 'MWh';
      item.reviewStatus = 'Flagged';
    } else if (num === 39 || num === 44) {
      // DQ-04: Missing evidence
      item.requiresEvidence = true;
      item.linkedEvidenceIds = [];
      item.reviewStatus = 'Flagged';
    } else if (num === 48) {
      // DQ-06: Invalid reporting period alignment (Parent engagement is FY 2026, assertion says FY 2024)
      item.engagementId = 'ENG-2026-003';
      item.reportingYear = 'FY 2024';
      item.reviewStatus = 'Flagged';
    } else if (num === 51) {
      // DQ-07: Missing vs zero conflict (reportedValue = 0 but valueBasis is 'Reported' instead of 'Verified Zero')
      item.reportedValue = 0;
      item.valueBasis = 'Reported';
      item.reviewStatus = 'Flagged';
    } else if (num === 55) {
      // DQ-08: Unsupported calculation method
      item.calculationMethod = 'Unverified Spend Proxy - Rough Guess Without Emission Factor';
      item.reviewStatus = 'Flagged';
    } else if (num === 58) {
      // DQ-09: Incomplete facility coverage / boundary mismatch
      item.reportingBoundary = 'Incomplete Boundary - Excluded Secondary Paint Shop Annex';
      item.reviewStatus = 'Flagged';
    } else if (num === 60) {
      // DQ-10: Missing source reference
      item.dataSource = '';
      item.reviewStatus = 'Flagged';
    } else if (num === 15 || num === 40) {
      // Explicit Not Applicable examples (properly null so they do not trigger DQ-01)
      item.valueBasis = 'Not Applicable';
      item.reportedValue = null;
      item.requiresEvidence = false;
      item.linkedEvidenceIds = [];
    }

    return item;
  });

  // 25 Internal Controls across Environmental, Social, and Governance pillars
  const controlBlueprints: Array<{
    code: string;
    name: string;
    pillar: ESGPillar;
    objective: string;
    risk: string;
    owner: string;
    freq: InternalControl['controlFrequency'];
    type: InternalControl['controlType'];
    design: InternalControl['designStatus'];
  }> = [
    {
      code: 'ENV-CTL-001',
      name: 'Monthly Natural Gas Consumption Invoice-to-Meter Reconciliation',
      pillar: 'Environmental',
      objective: 'Ensure Scope 1 stationary combustion gas volumes match calibrated flowmeters and billing statements.',
      risk: 'Incomplete or misstated Scope 1 fuel consumption data due to unbilled meter drift.',
      owner: 'Dr. Lukas Weber (Head of Energy Engineering)',
      freq: 'Monthly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-002',
      name: 'Industrial Electricity Invoice & Grid Tariff Verification',
      pillar: 'Environmental',
      objective: 'Verify MWh electricity consumption across all 5 plants against utility provider statements.',
      risk: 'Cutoff errors or duplicate utility invoice postings in Scope 2 calculations.',
      owner: 'Martina Bergmann (Corporate Sustainability Controller)',
      freq: 'Monthly',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-003',
      name: 'Annual GHG Emission Factor Repository Approval',
      pillar: 'Environmental',
      objective: 'Ensure DEFRA, IEA, and Ecoinvent emission factors are formally reviewed and locked before calculation.',
      risk: 'Use of outdated or unauthorized emission factors distorting tCO2e disclosures.',
      owner: 'Dr. Lukas Weber (Head of Energy Engineering)',
      freq: 'Annual',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-004',
      name: 'Scope 2 Market-Based Guarantee of Origin (GoO) Certificate Review',
      pillar: 'Environmental',
      objective: 'Validate contractual retirement and vintage match of renewable energy certificates.',
      risk: 'Double counting or ineligible renewable attributes claimed under Scope 2 market-based reporting.',
      owner: 'Martina Bergmann (Corporate Sustainability Controller)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-005',
      name: 'Scope 3 Category 1 Supplier Primary Data Validation',
      pillar: 'Environmental',
      objective: 'Screen tier-1 steel and polymer supplier EPDs for boundary consistency and plausibility.',
      risk: 'Material misstatement in Scope 3 upstream emissions due to unverified supplier factors.',
      owner: 'Henrik Lindqvist (VP Sustainable Procurement)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Draft',
    },
    {
      code: 'ENV-CTL-006',
      name: 'Automated Flowmeter Calibration & Maintenance Schedule Check',
      pillar: 'Environmental',
      objective: 'Confirm thermal and water flowmeters undergo ISO-compliant physical calibration.',
      risk: 'Systematic measurement bias in physical consumption logs.',
      owner: 'Piotr Kowalski (Gdansk Plant Operations Lead)',
      freq: 'Quarterly',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-007',
      name: 'Refrigerant Fugitive Leakage Maintenance Log Reconciliation',
      pillar: 'Environmental',
      objective: 'Reconcile HVAC and chiller top-up certificates against high-GWP refrigerant inventory.',
      risk: 'Omission of fugitive HFC emissions from Scope 1 inventory.',
      owner: 'Claire Moreau (Lyon EHS Manager)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-008',
      name: 'Municipal & Groundwater Withdrawal Meter Cutoff Review',
      pillar: 'Environmental',
      objective: 'Verify year-end water meter accruals and physical readings across all European plants.',
      risk: 'Inaccurate period cutoff for ESRS E3 water withdrawal metrics.',
      owner: 'Claire Moreau (Lyon EHS Manager)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'ENV-CTL-009',
      name: 'Hazardous Waste Manifest & Weighbridge Reconciliation',
      pillar: 'Environmental',
      objective: 'Match hazardous waste disposal certificates to plant weighbridge exit logs.',
      risk: 'Unrecorded hazardous waste shipments or misclassified diversion rates.',
      owner: 'Unassigned', // Deliberate DQ-05 defect #1
      freq: 'Monthly',
      type: 'Detective',
      design: 'Undocumented',
    },
    {
      code: 'ENV-CTL-010',
      name: 'Facility Organizational Boundary Consolidation Review',
      pillar: 'Environmental',
      objective: 'Review newly commissioned, acquired, or divested sites for GHG consolidation boundary inclusion.',
      risk: 'Incomplete reporting boundary excluding active manufacturing facilities.',
      owner: 'Martina Bergmann (Corporate Sustainability Controller)',
      freq: 'Annual',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'SOC-CTL-011',
      name: 'Workday HCM Active Workforce & FTE Census Reconciliation',
      pillar: 'Social',
      objective: 'Reconcile HR payroll headcount extracts with plant-level timekeeping systems.',
      risk: 'Duplicate or terminated personnel included in ESRS S1 workforce disclosures.',
      owner: 'Sabine Hartmann (VP Human Resources)',
      freq: 'Monthly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'SOC-CTL-012',
      name: 'Occupational Health & Safety Incident Root-Cause & Classification Review',
      pillar: 'Social',
      objective: 'Ensure all lost-time and recordable injuries are logged and classified per ISO 45001.',
      risk: 'Underreporting or misclassification of workplace safety incidents.',
      owner: 'Tomasz Zielinski (Group Health & Safety Director)',
      freq: 'Monthly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'SOC-CTL-013',
      name: 'Contractor & Temporary Worker Hours Worked Verification',
      pillar: 'Social',
      objective: 'Validate third-party agency timesheets used in TRIR rate denominators.',
      risk: 'Distorted injury frequency rates due to inaccurate contractor exposure hours.',
      owner: 'Tomasz Zielinski (Group Health & Safety Director)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Draft',
    },
    {
      code: 'SOC-CTL-014',
      name: 'LMS Training Completion & Attendance Log Validation',
      pillar: 'Social',
      objective: 'Verify employee training hours recorded in LMS against signed safety induction sheets.',
      risk: 'Inflated training hours per FTE reported in social sustainability disclosures.',
      owner: 'Sabine Hartmann (VP Human Resources)',
      freq: 'Quarterly',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'SOC-CTL-015',
      name: 'Gender Pay Equity & Remuneration Classification Audit',
      pillar: 'Social',
      objective: 'Validate job grade mappings and gross hourly pay inputs for gender pay gap metrics.',
      risk: 'Inconsistent job band classification distorting unadjusted gender pay gap calculations.',
      owner: 'Sabine Hartmann (VP Human Resources)',
      freq: 'Annual',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'SOC-CTL-016',
      name: 'Collective Bargaining & Works Council Coverage Verification',
      pillar: 'Social',
      objective: 'Confirm percentage of employees covered by collective bargaining agreements per country.',
      risk: 'Inaccurate social dialogue coverage disclosures across German, Polish, and French sites.',
      owner: 'Sabine Hartmann (VP Human Resources)',
      freq: 'Annual',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'SOC-CTL-017',
      name: 'Supplier Code of Conduct Social Audit Follow-Up Control',
      pillar: 'Social',
      objective: 'Track corrective action plans for high-risk raw material suppliers.',
      risk: 'Unmitigated labor rights non-compliance in upstream supply chain.',
      owner: 'Henrik Lindqvist (VP Sustainable Procurement)',
      freq: 'Quarterly',
      type: 'Corrective',
      design: 'Draft',
    },
    {
      code: 'GOV-CTL-018',
      name: 'Annual Corporate Sustainability Policy & Charter Board Approval',
      pillar: 'Governance',
      objective: 'Ensure climate transition and human rights policies receive formal Supervisory Board ratification.',
      risk: 'Outdated governance policies lacking executive accountability.',
      owner: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      freq: 'Annual',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'GOV-CTL-019',
      name: 'Anti-Bribery & Business Ethics Training Completion Verification',
      pillar: 'Governance',
      objective: 'Monitor mandatory annual ethics attestation across all salaried and procurement staff.',
      risk: 'Non-compliance with anti-corruption training targets.',
      owner: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'GOV-CTL-020',
      name: 'Whistleblower & Grievance Hotline Case Escalation Review',
      pillar: 'Governance',
      objective: 'Ensure independent triage, investigation logging, and Audit Committee reporting of ethics cases.',
      risk: 'Omission or improper closure of substantiated whistleblower reports.',
      owner: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      freq: 'Quarterly',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'GOV-CTL-021',
      name: 'Manual Spreadsheet Formula & Version Lock Control for ESG Disclosures',
      pillar: 'Governance',
      objective: 'Enforce change-control and peer review on consolidation workbooks prior to disclosure.',
      risk: 'Uncontrolled formula overwrites in pre-assurance disclosure tables.',
      owner: 'Unassigned', // Deliberate DQ-05 defect #2
      freq: 'Quarterly',
      type: 'Preventive',
      design: 'Requires Remediation',
    },
    {
      code: 'GOV-CTL-022',
      name: 'Executive Disclosure Committee Pre-Assurance Sign-Off',
      pillar: 'Governance',
      objective: 'Require formal sign-off by CFO, Head of ESG, and General Counsel on final ESG assertion package.',
      risk: 'Publication of unreviewed or inconsistent sustainability assertions.',
      owner: 'Martina Bergmann (Corporate Sustainability Controller)',
      freq: 'Annual',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'GOV-CTL-023',
      name: 'Political Contributions & Trade Association Lobbying Alignment Review',
      pillar: 'Governance',
      objective: 'Verify all trade association memberships align with Asterion Paris Agreement climate commitments.',
      risk: 'Unreported lobbying expenditures contradicting stated decarbonization targets.',
      owner: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      freq: 'Annual',
      type: 'Detective',
      design: 'Documented',
    },
    {
      code: 'GOV-CTL-024',
      name: 'IT General Controls (ITGC) Access Review for SAP EHS & EMS Systems',
      pillar: 'Governance',
      objective: 'Restrict write/edit permissions on primary energy and emissions source tables.',
      risk: 'Unauthorized modification of underlying environmental activity data.',
      owner: 'Markus Vance (Director of Enterprise IT Security)',
      freq: 'Quarterly',
      type: 'Preventive',
      design: 'Documented',
    },
    {
      code: 'GOV-CTL-025',
      name: 'Double Materiality Assessment (IRO) Annual Refresh Control',
      pillar: 'Governance',
      objective: 'Review impacts, risks, and opportunities with internal and external stakeholders.',
      risk: 'Omission of material sustainability topics from assurance readiness scope.',
      owner: 'Martina Bergmann (Corporate Sustainability Controller)',
      freq: 'Annual',
      type: 'Preventive',
      design: 'Draft',
    },
  ];

  const controls: InternalControl[] = controlBlueprints.map((bp, idx) => {
    const num = idx + 1;
    const controlId = `AST-CTL-${String(num).padStart(3, '0')}`;
    const engIdx = idx < 8 ? 0 : idx < 18 ? 1 : 2;
    const engagement = engagements[engIdx];
    const linkedAsn1 = `AST-ASN-${String(((idx * 2) % 60) + 1).padStart(3, '0')}`;
    const linkedAsn2 = `AST-ASN-${String(((idx * 2 + 1) % 60) + 1).padStart(3, '0')}`;

    return {
      controlId,
      engagementId: engagement.engagementId,
      controlCode: bp.code,
      controlName: bp.name,
      pillar: bp.pillar,
      controlObjective: bp.objective,
      riskDescription: bp.risk,
      controlOwner: bp.owner,
      controlFrequency: bp.freq,
      controlType: bp.type,
      controlDescription: `${bp.objective} Executed on a ${bp.freq.toLowerCase()} cadence with evidence retained in the internal audit workpaper repository.`,
      designStatus: bp.design,
      operatingStatus: 'Not Tested',
      linkedAssertionIds: [linkedAsn1, linkedAsn2],
      linkedEvidenceIds:
        idx < 5 ? [`EVD-DEMO-${String(36 + idx).padStart(3, '0')}`] : [],
      lastReviewedDate: bp.design === 'Documented' ? '2025-12-01' : '2024-06-15',
      isSyntheticDemo: true,
      createdAt: '2025-09-01T08:00:00.000Z',
      updatedAt: SEED_TIMESTAMP,
    };
  });

  // Deterministic execution of DQ-01..DQ-10 produces the exact 15 validation findings
  const findings = runDeterministicValidation({
    engagements,
    facilities,
    assertions,
    controls,
    evidence,
    existingFindings: [],
    nowIso: SEED_TIMESTAMP,
  });

  // Generate 100 deterministic Audit History Events
  const actors = [
    'Martina Bergmann (Sustainability Controller)',
    'Dr. Lukas Weber (Energy Engineering Lead)',
    'Sabine Hartmann (VP Human Resources)',
    'Dr. Elena Rostova (Chief Compliance Officer)',
    'Internal Audit System (Deterministic Seed)',
  ];

  const auditEvents: AuditEvent[] = Array.from({ length: 100 }, (_, idx) => {
    const num = idx + 1;
    const eventId = `AUD-EVT-${String(num).padStart(4, '0')}`;
    const dayOffset = Math.floor(idx / 3);
    const hourOffset = idx % 24;
    const date = new Date(Date.UTC(2025, 9, 1 + dayOffset, hourOffset, (idx * 7) % 60, 0));
    const timestamp = date.toISOString();
    const actor = actors[idx % actors.length];

    if (idx < 3) {
      const eng = engagements[idx];
      return {
        eventId,
        engagementId: eng.engagementId,
        entityType: 'AssuranceEngagement',
        entityId: eng.engagementId,
        action: 'ENGAGEMENT_CREATED',
        actor,
        timestamp,
        previousValue: 'null',
        newValue: `${eng.engagementName} (${eng.reportingYear} | ${eng.engagementStatus})`,
      };
    } else if (idx < 63) {
      const asn = assertions[idx - 3];
      return {
        eventId,
        engagementId: asn.engagementId,
        entityType: 'ESGAssertion',
        entityId: asn.assertionId,
        action: asn.reviewStatus === 'Flagged' ? 'ASSERTION_FLAGGED_BY_DQ' : 'ASSERTION_LOGGED',
        actor,
        timestamp,
        previousValue: 'Unreviewed',
        newValue: `${asn.metricCode}: ${asn.reportedValue ?? 'NULL'} ${asn.unit} (${asn.reviewStatus})`,
      };
    } else if (idx < 88) {
      const ctl = controls[idx - 63];
      return {
        eventId,
        engagementId: ctl.engagementId,
        entityType: 'InternalControl',
        entityId: ctl.controlId,
        action: 'CONTROL_DOCUMENTATION_UPDATED',
        actor,
        timestamp,
        previousValue: 'Draft',
        newValue: `${ctl.controlCode} Design Status: ${ctl.designStatus} | Owner: ${ctl.controlOwner}`,
      };
    } else {
      const fnd = findings[(idx - 88) % findings.length];
      return {
        eventId,
        engagementId: fnd.engagementId,
        entityType: 'ValidationFinding',
        entityId: fnd.findingId,
        action: 'VALIDATION_FINDING_DETECTED',
        actor: 'Deterministic Validation Engine v0.1.0',
        timestamp,
        previousValue: 'None',
        newValue: `${fnd.ruleId} [${fnd.severity}]: ${fnd.description}`,
      };
    }
  });

  return {
    organization,
    facilities,
    engagements,
    assertions,
    controls,
    evidence,
    findings,
    auditEvents,
  };
}
