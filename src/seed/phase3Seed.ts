import {
  AssuranceReport,
  AuditMaterialityAssessment,
  DisclosureFramework,
  DisclosureMapping,
  DisclosureRequirement,
  FinancialMaterialityAssessment,
  FrozenReportSnapshot,
  ImpactMaterialityAssessment,
} from '../types/domain';
import { SyntheticDataset } from './syntheticDataset';
import { Phase2SyntheticDataset } from './phase2Seed';
import {
  evaluateFinancialMateriality,
  evaluateImpactMateriality,
  validateAuditMateriality,
} from '../services/materialityEngine';
import { generateAssuranceReportAndSnapshot } from '../services/assuranceReportingEngine';

export interface Phase3SyntheticDataset {
  disclosureFrameworks: DisclosureFramework[];
  disclosureRequirements: DisclosureRequirement[];
  disclosureMappings: DisclosureMapping[];
  financialMateriality: FinancialMaterialityAssessment[];
  impactMateriality: ImpactMaterialityAssessment[];
  auditMateriality: AuditMaterialityAssessment[];
  assuranceReports: AssuranceReport[];
  reportSnapshots: FrozenReportSnapshot[];
}

const P3_SEED_TIMESTAMP = '2026-02-01T10:00:00.000Z';

export function generatePhase3SyntheticDataset(
  p1: SyntheticDataset,
  p2: Phase2SyntheticDataset
): Phase3SyntheticDataset {
  // 1. Four Framework Families (BRSR, GRI Standards, ESRS, IFRS S1 and IFRS S2)
  const disclosureFrameworks: DisclosureFramework[] = [
    {
      frameworkId: 'FWK-ESRS-2023',
      frameworkName: 'ESRS',
      frameworkVersion: 'ESRS Set 1 (Delegated Act 2023/2772)',
      issuingOrganization: 'EFRAG / European Commission',
      jurisdiction: 'European Union (CSRD)',
      effectivePeriod: 'FY 2024 onwards',
      description:
        'Illustrative analytical reference mapping for European Sustainability Reporting Standards (ESRS E1 Climate, E3 Water, E5 Circular Economy, S1 Own Workforce, G1 Business Conduct).',
      isCustomFramework: false,
      createdAt: P3_SEED_TIMESTAMP,
    },
    {
      frameworkId: 'FWK-GRI-2021',
      frameworkName: 'GRI Standards',
      frameworkVersion: 'GRI Universal Standards 2021 & Topic Standards',
      issuingOrganization: 'Global Reporting Initiative (GSSB)',
      jurisdiction: 'Global Multi-Stakeholder',
      effectivePeriod: '2023 onwards',
      description:
        'Illustrative analytical reference mapping for GRI 302 (Energy), GRI 305 (Emissions), GRI 303 (Water), GRI 306 (Waste), and GRI 403 (Occupational Health & Safety).',
      isCustomFramework: false,
      createdAt: P3_SEED_TIMESTAMP,
    },
    {
      frameworkId: 'FWK-IFRS-2023',
      frameworkName: 'IFRS S1 and IFRS S2',
      frameworkVersion: 'ISSB IFRS S1 & S2 (June 2023)',
      issuingOrganization: 'International Sustainability Standards Board (ISSB)',
      jurisdiction: 'Global Capital Markets',
      effectivePeriod: 'Annual periods beginning on or after 1 Jan 2024',
      description:
        'Illustrative analytical reference mapping for IFRS S1 General Sustainability-related Financial Information and IFRS S2 Climate-related Disclosures.',
      isCustomFramework: false,
      createdAt: P3_SEED_TIMESTAMP,
    },
    {
      frameworkId: 'FWK-BRSR-2023',
      frameworkName: 'BRSR',
      frameworkVersion: 'SEBI BRSR Core & Comprehensive Framework 2023',
      issuingOrganization: 'Securities and Exchange Board of India (SEBI)',
      jurisdiction: 'India (Subsidiary / Value-Chain Reference)',
      effectivePeriod: 'FY 2023-24 onwards',
      description:
        'Illustrative analytical reference mapping for Principle 6 (Environment & Energy/GHG Footprint), Principle 3 (Employee Well-being & Safety), and Principle 1 (Ethics & Transparency).',
      isCustomFramework: false,
      createdAt: P3_SEED_TIMESTAMP,
    },
  ];

  // 2. Disclosure Requirements (16 requirements across the 4 frameworks, including Not Applicable items)
  const disclosureRequirements: DisclosureRequirement[] = [
    // ESRS (5 requirements, 1 Not Applicable)
    {
      requirementId: 'REQ-ESRS-E1-6-S1',
      frameworkId: 'FWK-ESRS-2023',
      requirementCode: 'ESRS E1-6 (44)',
      requirementTitle: 'Gross Scope 1 GHG Emissions',
      pillar: 'Environmental',
      topic: 'GHG Emissions - Scope 1',
      subTopic: 'Stationary & Mobile Combustion',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Mandatory (Subject to Materiality)',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Disclose gross Scope 1 greenhouse gas emissions in metric tonnes of CO2 equivalent across consolidated operational control facilities.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-ESRS-E1-6-S2',
      frameworkId: 'FWK-ESRS-2023',
      requirementCode: 'ESRS E1-6 (49)',
      requirementTitle: 'Gross Scope 2 Location-Based & Market-Based GHG Emissions',
      pillar: 'Environmental',
      topic: 'GHG Emissions - Scope 2 (Location)',
      subTopic: 'Dual Scope 2 Reporting',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Mandatory (Subject to Materiality)',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Disclose gross location-based and market-based Scope 2 GHG emissions separately without combining into a single aggregate.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-ESRS-E1-6-S3',
      frameworkId: 'FWK-ESRS-2023',
      requirementCode: 'ESRS E1-6 (51)',
      requirementTitle: 'Gross Scope 3 Value-Chain GHG Emissions by Category',
      pillar: 'Environmental',
      topic: 'GHG Emissions - Scope 3',
      subTopic: 'Purchased Goods, Logistics & Commuting',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Mandatory (Subject to Materiality)',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Disclose significant Scope 3 GHG emissions across applicable upstream and downstream categories.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-ESRS-S1-14',
      frameworkId: 'FWK-ESRS-2023',
      requirementCode: 'ESRS S1-14 (88)',
      requirementTitle: 'Workforce Health & Safety — Total Recordable Incident Rate (TRIR)',
      pillar: 'Social',
      topic: 'Occupational Health & Safety',
      subTopic: 'Recordable Work-Related Injuries',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Mandatory',
      expectedUnit: 'rate per 200k hrs',
      guidanceSummary:
        'Disclose work-related injuries and recordable incident rates covering own workforce across all operating sites.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-ESRS-E4-BIO',
      frameworkId: 'FWK-ESRS-2023',
      requirementCode: 'ESRS E4-5 (38)',
      requirementTitle: 'Marine Protected Area Deep-Sea Extraction Footprint',
      pillar: 'Environmental',
      topic: 'Biodiversity & Marine Extraction',
      subTopic: 'Offshore Seabed Operations',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Conditional',
      expectedUnit: 'hectares',
      guidanceSummary:
        'Applicable only to entities with offshore or marine extraction operations. Designated Not Applicable for inland precision manufacturing.',
      applicabilityStatus: 'Not Applicable',
    },

    // GRI Standards (4 requirements, 1 Not Applicable)
    {
      requirementId: 'REQ-GRI-305-1',
      frameworkId: 'FWK-GRI-2021',
      requirementCode: 'GRI 305-1',
      requirementTitle: 'Direct (Scope 1) GHG Emissions',
      pillar: 'Environmental',
      topic: 'GHG Emissions - Scope 1',
      subTopic: 'Direct Emissions',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Topic-Specific',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Report gross direct (Scope 1) GHG emissions in metric tons of CO2 equivalent, consolidation approach, and source of emission factors.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-GRI-303-3',
      frameworkId: 'FWK-GRI-2021',
      requirementCode: 'GRI 303-3',
      requirementTitle: 'Total Water Withdrawal across All Areas',
      pillar: 'Environmental',
      topic: 'Water Withdrawal & Discharge',
      subTopic: 'Municipal & Groundwater Intake',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Topic-Specific',
      expectedUnit: 'm3',
      guidanceSummary:
        'Report total water withdrawal from all areas in megaliters or cubic meters, broken down by source.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-GRI-306-3',
      frameworkId: 'FWK-GRI-2021',
      requirementCode: 'GRI 306-3',
      requirementTitle: 'Hazardous & Non-Hazardous Waste Generated',
      pillar: 'Environmental',
      topic: 'Hazardous & Non-Hazardous Waste',
      subTopic: 'Industrial Waste Streams',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Topic-Specific',
      expectedUnit: 'metric tons',
      guidanceSummary:
        'Report total weight of waste generated in metric tons and a breakdown of this total by composition of the waste.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-GRI-411-1',
      frameworkId: 'FWK-GRI-2021',
      requirementCode: 'GRI 411-1',
      requirementTitle: 'Incidents of Violations Involving Rights of Indigenous Peoples',
      pillar: 'Social',
      topic: 'Indigenous Rights',
      subTopic: 'Greenfield Land Acquisition',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Conditional',
      expectedUnit: 'count',
      guidanceSummary:
        'Designated Not Applicable as all 5 European plants operate within zoned industrial parks with zero indigenous territory overlap.',
      applicabilityStatus: 'Not Applicable',
    },

    // IFRS S1 and S2 (4 requirements)
    {
      requirementId: 'REQ-IFRS-S2-29A',
      frameworkId: 'FWK-IFRS-2023',
      requirementCode: 'IFRS S2.29(a)',
      requirementTitle: 'Absolute Gross GHG Emissions (Scope 1, Scope 2, Scope 3)',
      pillar: 'Environmental',
      topic: 'GHG Emissions - Scope 1',
      subTopic: 'Cross-Industry Climate Metric',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Mandatory',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Disclose absolute gross greenhouse gas emissions generated during the reporting period, measured in accordance with the GHG Protocol.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-IFRS-S2-29B',
      frameworkId: 'FWK-IFRS-2023',
      requirementCode: 'IFRS S2.29(b)-(d)',
      requirementTitle: 'Climate Transition Risks, Physical Risks & Capital Deployment',
      pillar: 'Governance',
      topic: 'Board Sustainability Oversight',
      subTopic: 'Climate Risk Governance',
      requirementType: 'Qualitative',
      mandatoryLevel: 'Mandatory',
      expectedUnit: 'narrative / %',
      guidanceSummary:
        'Disclose climate-related transition and physical risk governance, oversight frequency, and capital allocation.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-IFRS-S1-GOV',
      frameworkId: 'FWK-IFRS-2023',
      requirementCode: 'IFRS S1.27',
      requirementTitle: 'Governance Body Oversight of Sustainability-Related Risks',
      pillar: 'Governance',
      topic: 'Ethics & Anti-Corruption',
      subTopic: 'Audit & Sustainability Committee',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Mandatory',
      expectedUnit: '%',
      guidanceSummary:
        'Disclose governance processes, controls and procedures used to monitor and manage sustainability-related risks and opportunities.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-IFRS-S2-FIN-EM',
      frameworkId: 'FWK-IFRS-2023',
      requirementCode: 'IFRS S2.B62',
      requirementTitle: 'Financed Emissions — Commercial Banking & Asset Management',
      pillar: 'Environmental',
      topic: 'Financed Emissions',
      subTopic: 'Financial Institutions Only',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Sector-Specific',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Applicable only to asset managers, commercial banks, and insurers. Designated Not Applicable for industrial manufacturing.',
      applicabilityStatus: 'Not Applicable',
    },

    // BRSR (3 requirements)
    {
      requirementId: 'REQ-BRSR-P6-E1',
      frameworkId: 'FWK-BRSR-2023',
      requirementCode: 'BRSR-P6-EI-1',
      requirementTitle: 'Principle 6 Essential Indicator 1 — Total Energy Consumption & Intensity',
      pillar: 'Environmental',
      topic: 'Energy Consumption',
      subTopic: 'Renewable & Non-Renewable Electricity',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Essential Indicator (BRSR Core)',
      expectedUnit: 'MWh',
      guidanceSummary:
        'Disclose total energy consumed from renewable and non-renewable sources and energy intensity per unit of output.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-BRSR-P6-E7',
      frameworkId: 'FWK-BRSR-2023',
      requirementCode: 'BRSR-P6-EI-7',
      requirementTitle: 'Principle 6 Essential Indicator 7 — Scope 1 & Scope 2 GHG Footprint',
      pillar: 'Environmental',
      topic: 'GHG Emissions - Scope 1',
      subTopic: 'BRSR Core GHG Footprint',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Essential Indicator (BRSR Core)',
      expectedUnit: 'tCO2e',
      guidanceSummary:
        'Provide details of greenhouse gas emissions (Scope 1 and Scope 2) and GHG emission intensity.',
      applicabilityStatus: 'Applicable',
    },
    {
      requirementId: 'REQ-BRSR-P3-E11',
      frameworkId: 'FWK-BRSR-2023',
      requirementCode: 'BRSR-P3-EI-11',
      requirementTitle: 'Principle 3 Essential Indicator 11 — Safety Incidents & LTIFR',
      pillar: 'Social',
      topic: 'Occupational Health & Safety',
      subTopic: 'Safety Incident Disclosures',
      requirementType: 'Quantitative',
      mandatoryLevel: 'Essential Indicator (BRSR Core)',
      expectedUnit: 'rate per 200k hrs',
      guidanceSummary:
        'Details of safety related incidents including Lost Time Injury Frequency Rate (LTIFR) and recordable work-related injuries.',
      applicabilityStatus: 'Applicable',
    },
  ];

  // 3. Disclosure Mappings for ENG-2025-002 (plus baseline mappings for ENG-2024-001)
  // Note: AST-ASN-013..032 belong to ENG-2025-002 in Phase 1 seed. Let's inspect p1.assertions for ENG-2025-002 dynamically so IDs are 100% guaranteed to match!
  const eng2025Assertions = p1.assertions.filter((a) => a.engagementId === 'ENG-2025-002');
  const eng2025Controls = p1.controls.filter((c) => c.engagementId === 'ENG-2025-002');
  const eng2025Evidence = p1.evidence.filter((e) => e.engagementId === 'ENG-2025-002');
  const eng2025Procedures = p2.auditProcedures.filter((p) => p.auditPlanId === 'PLN-2025-002');

  const findAsnByTopic = (topicKeyword: string, fallbackIndex = 0) =>
    eng2025Assertions.find((a) =>
      `${a.metricName} ${a.metricCode}`.toLowerCase().includes(topicKeyword.toLowerCase())
    )?.assertionId ??
    eng2025Assertions[fallbackIndex]?.assertionId ??
    'AST-ASN-021';

  const findCtrlByPillar = (pillar: 'Environmental' | 'Social' | 'Governance', idx = 0) =>
    eng2025Controls.filter((c) => c.pillar === pillar)[idx]?.controlId ??
    eng2025Controls[0]?.controlId ??
    'AST-CTL-009';

  const findEvdForEntity = (entityId: string, fallbackIdx = 0) =>
    eng2025Evidence.find((e) => e.linkedEntityId === entityId)?.evidenceId ??
    eng2025Evidence[fallbackIdx]?.evidenceId ??
    'AST-EVD-015';

  const asnScope1 = findAsnByTopic('Scope 1', 0);
  const asnScope2Loc = findAsnByTopic('Scope 2 (Location)', 1);
  const asnScope3 = findAsnByTopic('Scope 3', 3);
  const asnWater = findAsnByTopic('Water', 5);
  const asnWaste = findAsnByTopic('Waste', 6);
  const asnSafety = findAsnByTopic('Safety', 7);
  const asnEthics = findAsnByTopic('Ethics', 10);
  const asnEnergy = findAsnByTopic('Energy', 4);

  const ctlEnv1 = findCtrlByPillar('Environmental', 0);
  const ctlEnv2 = findCtrlByPillar('Environmental', 1);
  const ctlSoc1 = findCtrlByPillar('Social', 0);
  const ctlGov1 = findCtrlByPillar('Governance', 0);

  const prc1 = eng2025Procedures[0]?.procedureId ?? 'PRC-2025-001';
  const prc2 = eng2025Procedures[1]?.procedureId ?? 'PRC-2025-002';
  const prc3 = eng2025Procedures[2]?.procedureId ?? 'PRC-2025-003';
  const prc5 = eng2025Procedures[4]?.procedureId ?? 'PRC-2025-005';
  const prc7 = eng2025Procedures[4]?.procedureId ?? 'PRC-2025-005';

  const disclosureMappings: DisclosureMapping[] = [
    {
      mappingId: 'MAP-2025-001',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-ESRS-2023',
      requirementId: 'REQ-ESRS-E1-6-S1',
      linkedAssertionIds: [asnScope1],
      linkedControlIds: [ctlEnv1],
      linkedProcedureIds: [prc1],
      linkedEvidenceIds: [findEvdForEntity(asnScope1, 0)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 100,
      mappingRationale:
        'Mapped to consolidated FY 2025 Scope 1 stationary and mobile combustion assertions, meter calibration control, and recalculation procedure PRC-2025-001.',
      identifiedGaps: 'None — full invoice and calibration log coverage.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-002',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-ESRS-2023',
      requirementId: 'REQ-ESRS-E1-6-S2',
      linkedAssertionIds: [asnScope2Loc],
      linkedControlIds: [ctlEnv2],
      linkedProcedureIds: [prc2],
      linkedEvidenceIds: [findEvdForEntity(asnScope2Loc, 1)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 100,
      mappingRationale:
        'Mapped to dual Scope 2 Location-Based and Market-Based assertions and GoO contractual instrument inspection procedure PRC-2025-002.',
      identifiedGaps: 'Market-based GoO retirement vintage mismatch at Stuttgart under remediation.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-003',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-ESRS-2023',
      requirementId: 'REQ-ESRS-E1-6-S3',
      linkedAssertionIds: [asnScope3],
      linkedControlIds: [ctlEnv2],
      linkedProcedureIds: [prc3],
      linkedEvidenceIds: [findEvdForEntity(asnScope3, 2)],
      mappingStatus: 'Partially Mapped',
      coveragePercentage: 75,
      mappingRationale:
        'Mapped to upstream Categories 1, 3, 4, 6, and 7 assertions and MUS freight invoice sampling procedure PRC-2025-003.',
      identifiedGaps: 'Category 1 supplier-specific primary LCA factor coverage remains at 68%.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: null,
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-004',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-ESRS-2023',
      requirementId: 'REQ-ESRS-S1-14',
      linkedAssertionIds: [asnSafety],
      linkedControlIds: [ctlSoc1],
      linkedProcedureIds: [prc7],
      linkedEvidenceIds: [findEvdForEntity(asnSafety, 3)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 100,
      mappingRationale:
        'Mapped to ISO 45001 TRIR assertions, contractor shift log reconciliation control, and walkthrough procedure PRC-2025-007.',
      identifiedGaps: 'Contractor shift-hour sign-off exceptions identified at Gdansk plant.',
      mappedBy: 'Henrik Lindqvist (VP Human Resources & EHS)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-005',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-GRI-2021',
      requirementId: 'REQ-GRI-305-1',
      linkedAssertionIds: [asnScope1],
      linkedControlIds: [ctlEnv1],
      linkedProcedureIds: [prc1],
      linkedEvidenceIds: [findEvdForEntity(asnScope1, 0)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 100,
      mappingRationale:
        'Cross-referenced with ESRS E1-6 Scope 1 inventory assertions and DEFRA/UBA recalculation workpapers.',
      identifiedGaps: 'None.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-006',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-GRI-2021',
      requirementId: 'REQ-GRI-303-3',
      linkedAssertionIds: [asnWater],
      linkedControlIds: [ctlEnv1],
      linkedProcedureIds: [prc5],
      linkedEvidenceIds: [findEvdForEntity(asnWater, 4)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 90,
      mappingRationale:
        'Mapped to municipal and closed-loop cooling water withdrawal assertions and analytical review procedure PRC-2025-005.',
      identifiedGaps: 'Lyon Q4 municipal water meter replacement log pending upload.',
      mappedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-007',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-GRI-2021',
      requirementId: 'REQ-GRI-306-3',
      linkedAssertionIds: [asnWaste],
      linkedControlIds: [ctlEnv2],
      linkedProcedureIds: [],
      linkedEvidenceIds: [],
      mappingStatus: 'Partially Mapped',
      coveragePercentage: 55,
      mappingRationale:
        'Mapped to hazardous foundry slag and non-hazardous scrap assertions; substantive hazardous waste manifest vouching procedure pending assignment.',
      identifiedGaps: 'Missing linked audit procedure and uploaded manifest evidence.',
      mappedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: null,
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-008',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-IFRS-2023',
      requirementId: 'REQ-IFRS-S2-29A',
      linkedAssertionIds: [asnScope1, asnScope2Loc, asnScope3],
      linkedControlIds: [ctlEnv1, ctlEnv2],
      linkedProcedureIds: [prc1, prc2, prc3],
      linkedEvidenceIds: [findEvdForEntity(asnScope1, 0), findEvdForEntity(asnScope2Loc, 1)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 95,
      mappingRationale:
        'Mapped to consolidated Scopes 1, 2, and 3 GHG assertions and ISO 14064-3 recalculation procedures.',
      identifiedGaps: 'Scope 2 market-based variance finding AUD-FND-2025-001 open.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-009',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-IFRS-2023',
      requirementId: 'REQ-IFRS-S1-GOV',
      linkedAssertionIds: [asnEthics],
      linkedControlIds: [ctlGov1],
      linkedProcedureIds: [],
      linkedEvidenceIds: [findEvdForEntity(asnEthics, 5)],
      mappingStatus: 'Partially Mapped',
      coveragePercentage: 70,
      mappingRationale:
        'Mapped to anti-corruption training and board oversight assertions and quarterly compliance sign-off control.',
      identifiedGaps: 'Board committee charter walkthrough procedure pending.',
      mappedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      reviewedBy: 'Henrik Lindqvist (VP Human Resources & EHS)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-010',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-BRSR-2023',
      requirementId: 'REQ-BRSR-P6-E1',
      linkedAssertionIds: [asnEnergy],
      linkedControlIds: [ctlEnv1],
      linkedProcedureIds: [prc1],
      linkedEvidenceIds: [findEvdForEntity(asnEnergy, 6)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 100,
      mappingRationale:
        'Mapped to total MWh electricity and natural gas thermal energy consumption assertions.',
      identifiedGaps: 'None.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    {
      mappingId: 'MAP-2025-011',
      engagementId: 'ENG-2025-002',
      frameworkId: 'FWK-BRSR-2023',
      requirementId: 'REQ-BRSR-P6-E7',
      linkedAssertionIds: [asnScope1, asnScope2Loc],
      linkedControlIds: [ctlEnv1, ctlEnv2],
      linkedProcedureIds: [prc1, prc2],
      linkedEvidenceIds: [findEvdForEntity(asnScope1, 0)],
      mappingStatus: 'Fully Mapped',
      coveragePercentage: 100,
      mappingRationale:
        'Mapped to Scope 1 and Scope 2 GHG footprint assertions and recalculation procedures.',
      identifiedGaps: 'None.',
      mappedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      updatedAt: P3_SEED_TIMESTAMP,
    },
    // Intentionally leave REQ-IFRS-S2-29B and REQ-BRSR-P3-E11 unmapped in ENG-2025-002 so "Not Mapped" status is also visible and testable!
  ];

  // 4. Financial Materiality Assessments (6 topics for ENG-2025-002)
  const financialMateriality: FinancialMaterialityAssessment[] = [
    evaluateFinancialMateriality({
      assessmentId: 'FIN-MAT-2025-001',
      engagementId: 'ENG-2025-002',
      esgTopic: 'GHG Emissions - Scope 1 & EU ETS Carbon Pricing',
      pillar: 'Environmental',
      timeHorizon: 'Medium',
      financialEffectType: 'Cost',
      magnitudeScore: 5,
      likelihoodScore: 4,
      materialityThreshold: 12,
      rationale:
        'Direct exposure to EU ETS allowance price volatility and CBAM compliance across Stuttgart Thermal Foundry and Munich Assembly.',
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateFinancialMateriality({
      assessmentId: 'FIN-MAT-2025-002',
      engagementId: 'ENG-2025-002',
      esgTopic: 'GHG Emissions - Scope 2 Renewable Electricity Contracting',
      pillar: 'Environmental',
      timeHorizon: 'Short',
      financialEffectType: 'Cost',
      magnitudeScore: 4,
      likelihoodScore: 4,
      materialityThreshold: 12,
      rationale:
        'Industrial power tariff fluctuations and long-term PPA / Guarantee of Origin procurement costs across 5 European plants.',
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateFinancialMateriality({
      assessmentId: 'FIN-MAT-2025-003',
      engagementId: 'ENG-2025-002',
      esgTopic: 'GHG Emissions - Scope 3 Low-Carbon Steel & Aluminum Sourcing',
      pillar: 'Environmental',
      timeHorizon: 'Long',
      financialEffectType: 'Capital Access',
      magnitudeScore: 4,
      likelihoodScore: 4,
      materialityThreshold: 12,
      rationale:
        'OEM automotive and aerospace customer tender requirements and sustainability-linked revolving credit facility margin ratchets.',
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateFinancialMateriality({
      assessmentId: 'FIN-MAT-2025-004',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Occupational Health & Safety (ISO 45001 Operations)',
      pillar: 'Social',
      timeHorizon: 'Short',
      financialEffectType: 'Cost',
      magnitudeScore: 4,
      likelihoodScore: 3,
      materialityThreshold: 12,
      rationale:
        'Potential plant downtime, regulatory penalties, and skilled technician retention across heavy thermal and fabrication lines.',
      assessedBy: 'Henrik Lindqvist (VP Human Resources & EHS)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateFinancialMateriality({
      assessmentId: 'FIN-MAT-2025-005',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Water Withdrawal & Closed-Loop Cooling Systems',
      pillar: 'Environmental',
      timeHorizon: 'Medium',
      financialEffectType: 'Asset Impairment',
      magnitudeScore: 3,
      likelihoodScore: 2,
      materialityThreshold: 12,
      rationale:
        'Moderate municipal water tariff exposure; closed-loop recirculation at Munich and Stuttgart mitigates drought curtailment risk.',
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateFinancialMateriality({
      assessmentId: 'FIN-MAT-2025-006',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Ethics, Anti-Corruption & Export Control Governance',
      pillar: 'Governance',
      timeHorizon: 'Short',
      financialEffectType: 'Revenue',
      magnitudeScore: 5,
      likelihoodScore: 2,
      materialityThreshold: 12,
      rationale:
        'Debarment risk on regulated European defense and clean-tech infrastructure contracts if compliance controls fail.',
      assessedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      reviewedBy: 'Henrik Lindqvist (VP Human Resources & EHS)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
  ];

  // 5. Impact Materiality Assessments (6 topics for ENG-2025-002 — both Actual with likelihood: null and Potential with likelihood: 1..5)
  const impactMateriality: ImpactMaterialityAssessment[] = [
    evaluateImpactMateriality({
      impactAssessmentId: 'IMP-MAT-2025-001',
      engagementId: 'ENG-2025-002',
      esgTopic: 'GHG Emissions - Scope 1 & EU ETS Carbon Pricing',
      impactType: 'Actual',
      polarity: 'Negative',
      scaleScore: 4,
      scopeScore: 5,
      irremediableCharacterScore: 4,
      likelihoodScore: null, // Actual impact: likelihood is strictly null
      impactThreshold: 3.5,
      rationale:
        'Actual atmospheric radiative forcing from natural gas thermal foundry furnaces and fleet diesel combustion.',
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateImpactMateriality({
      impactAssessmentId: 'IMP-MAT-2025-002',
      engagementId: 'ENG-2025-002',
      esgTopic: 'GHG Emissions - Scope 2 Renewable Electricity Contracting',
      impactType: 'Actual',
      polarity: 'Negative',
      scaleScore: 4,
      scopeScore: 4,
      irremediableCharacterScore: 4,
      likelihoodScore: null, // Actual impact
      impactThreshold: 3.5,
      rationale:
        'Actual indirect grid emissions from high-load electric induction furnaces in Poland and Germany.',
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateImpactMateriality({
      impactAssessmentId: 'IMP-MAT-2025-003',
      engagementId: 'ENG-2025-002',
      esgTopic: 'GHG Emissions - Scope 3 Low-Carbon Steel & Aluminum Sourcing',
      impactType: 'Actual',
      polarity: 'Negative',
      scaleScore: 5,
      scopeScore: 5,
      irremediableCharacterScore: 4,
      likelihoodScore: null, // Actual impact
      impactThreshold: 3.5,
      rationale:
        'Actual upstream blast-furnace steel and primary aluminum smelting emissions embedded in purchased alloys.',
      assessedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateImpactMateriality({
      impactAssessmentId: 'IMP-MAT-2025-004',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Occupational Health & Safety (ISO 45001 Operations)',
      impactType: 'Potential',
      polarity: 'Negative',
      scaleScore: 5,
      scopeScore: 3,
      irremediableCharacterScore: 4,
      likelihoodScore: 4, // Potential impact: uses likelihood 4
      impactThreshold: 3.0,
      rationale:
        'Potential severe thermal burn or mechanical crush injury hazard on foundry pouring and heavy stamping lines.',
      assessedBy: 'Henrik Lindqvist (VP Human Resources & EHS)',
      reviewedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateImpactMateriality({
      impactAssessmentId: 'IMP-MAT-2025-005',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Water Withdrawal & Closed-Loop Cooling Systems',
      impactType: 'Actual',
      polarity: 'Negative',
      scaleScore: 3,
      scopeScore: 2,
      irremediableCharacterScore: 2,
      likelihoodScore: null, // Actual impact below 3.5 threshold -> Financial Only / Not Material
      impactThreshold: 3.5,
      rationale:
        'Actual municipal water withdrawal in non-water-stressed river basins with >85% closed-loop cooling recirculation.',
      assessedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
      reviewedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    evaluateImpactMateriality({
      impactAssessmentId: 'IMP-MAT-2025-006',
      engagementId: 'ENG-2025-002',
      esgTopic: 'Ethics, Anti-Corruption & Export Control Governance',
      impactType: 'Potential',
      polarity: 'Negative',
      scaleScore: 3,
      scopeScore: 2,
      irremediableCharacterScore: 2,
      likelihoodScore: 2, // Potential impact: severity 2.33 * (2/5) = 0.93 < 3.0 -> Financially Material Only!
      impactThreshold: 3.0,
      rationale:
        'Low potential external societal impact given strict EU supplier screening, though financially material due to contract debarment clauses.',
      assessedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      reviewedBy: 'Henrik Lindqvist (VP Human Resources & EHS)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
  ];

  // 6. Audit Materiality Assessments (Metric-Specific Planning, Performance, and Clearly Trivial Thresholds)
  const auditMateriality: AuditMaterialityAssessment[] = [
    validateAuditMateriality({
      auditMaterialityId: 'AUD-MAT-2025-001',
      engagementId: 'ENG-2025-002',
      metricCode: 'ESRS-E1-S1',
      metricName: 'Consolidated Gross Scope 1 GHG Emissions',
      benchmarkBaseValue: 18450,
      planningMaterialityPct: 4.0,
      planningMaterialityAbsolute: 738.0,
      performanceMaterialityPct: 3.0,
      performanceMaterialityAbsolute: 553.5,
      clearlyTrivialThresholdPct: 0.2,
      clearlyTrivialAbsolute: 36.9,
      unit: 'tCO2e',
      qualitativeFactors:
        'High external scrutiny under CSRD ESRS E1 and EU ETS reconciliation; 75% performance materiality haircut applied.',
      approvedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    validateAuditMateriality({
      auditMaterialityId: 'AUD-MAT-2025-002',
      engagementId: 'ENG-2025-002',
      metricCode: 'ESRS-E1-S2-LOC',
      metricName: 'Consolidated Gross Scope 2 Location-Based GHG Emissions',
      benchmarkBaseValue: 14120,
      planningMaterialityPct: 4.0,
      planningMaterialityAbsolute: 564.8,
      performanceMaterialityPct: 3.0,
      performanceMaterialityAbsolute: 423.6,
      clearlyTrivialThresholdPct: 0.2,
      clearlyTrivialAbsolute: 28.24,
      unit: 'tCO2e',
      qualitativeFactors:
        'Separate benchmark from Scope 2 Market-Based emissions; invoices are high-precision utility meter bills.',
      approvedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    validateAuditMateriality({
      auditMaterialityId: 'AUD-MAT-2025-003',
      engagementId: 'ENG-2025-002',
      metricCode: 'ESRS-E1-S2-MKT',
      metricName: 'Consolidated Gross Scope 2 Market-Based GHG Emissions',
      benchmarkBaseValue: 6890,
      planningMaterialityPct: 4.0,
      planningMaterialityAbsolute: 275.6,
      performanceMaterialityPct: 2.8,
      performanceMaterialityAbsolute: 192.92,
      clearlyTrivialThresholdPct: 0.2,
      clearlyTrivialAbsolute: 13.78,
      unit: 'tCO2e',
      qualitativeFactors:
        'Elevated contractual instrument vintage risk on Guarantee of Origin (GoO) retirements warrants 70% performance materiality ratio.',
      approvedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    validateAuditMateriality({
      auditMaterialityId: 'AUD-MAT-2025-004',
      engagementId: 'ENG-2025-002',
      metricCode: 'ESRS-E1-S3-TOT',
      metricName: 'Consolidated Gross Scope 3 Value-Chain GHG Emissions',
      benchmarkBaseValue: 94200,
      planningMaterialityPct: 5.0,
      planningMaterialityAbsolute: 4710.0,
      performanceMaterialityPct: 3.75,
      performanceMaterialityAbsolute: 3532.5,
      clearlyTrivialThresholdPct: 0.25,
      clearlyTrivialAbsolute: 235.5,
      unit: 'tCO2e',
      qualitativeFactors:
        'Higher inherent estimation uncertainty across secondary LCA emission factors in Category 1 and Category 4.',
      approvedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
    validateAuditMateriality({
      auditMaterialityId: 'AUD-MAT-2025-005',
      engagementId: 'ENG-2025-002',
      metricCode: 'ESRS-S1-TRIR',
      metricName: 'Total Recordable Incident Rate (TRIR — Employees & Contractors)',
      benchmarkBaseValue: 1.45,
      planningMaterialityPct: 2.0,
      planningMaterialityAbsolute: 0.029,
      performanceMaterialityPct: 1.5,
      performanceMaterialityAbsolute: 0.0218,
      clearlyTrivialThresholdPct: 0.1,
      clearlyTrivialAbsolute: 0.0015,
      unit: 'rate per 200k hrs',
      qualitativeFactors:
        'Safety incident rates carry high qualitative sensitivity and executive remuneration linkage; tightened 2.0% threshold applied.',
      approvedBy: 'Dr. Elena Rostova (General Counsel & Chief Compliance Officer)',
      updatedAt: P3_SEED_TIMESTAMP,
    }),
  ];

  // 7. Generate initial frozen Assurance Report & Snapshot for ENG-2025-002
  const eng2025 = p1.engagements.find((e) => e.engagementId === 'ENG-2025-002') ?? p1.engagements[0];
  const initialGen = generateAssuranceReportAndSnapshot({
    reportId: 'RPT-2025-001',
    snapshotId: 'SNP-2025-001',
    reportType: 'ESG Audit Readiness Report',
    generatedBy: 'Martina Bergmann (Corporate Sustainability Controller)',
    generatedAt: P3_SEED_TIMESTAMP,
    versionNumber: 1,
    ctx: {
      engagement: eng2025,
      assertions: p1.assertions,
      controls: p1.controls,
      evidence: p1.evidence,
      dqFindings: p1.findings,
      auditPlans: p2.auditPlans,
      auditProcedures: p2.auditProcedures,
      riskAssessments: p2.riskAssessments,
      samplingPlans: p2.samplingPlans,
      sampleItems: p2.sampleItems,
      designTests: p2.designTests,
      operatingTests: p2.operatingTests,
      emissionActivities: p2.emissionActivities,
      emissionFactors: p2.emissionFactors,
      ghgRecalculations: p2.ghgRecalculations,
      auditFindings: p2.auditFindings,
      disclosureFrameworks,
      disclosureRequirements,
      disclosureMappings,
      financialMateriality,
      impactMateriality,
      auditMateriality,
    },
  });

  const secondGen = generateAssuranceReportAndSnapshot({
    reportId: 'RPT-2025-002',
    snapshotId: 'SNP-2025-002',
    reportType: 'GHG Verification Readiness Report',
    generatedBy: 'Dr. Lukas Weber (Head of Energy Engineering)',
    generatedAt: '2026-02-02T14:30:00.000Z',
    versionNumber: 1,
    ctx: {
      engagement: eng2025,
      assertions: p1.assertions,
      controls: p1.controls,
      evidence: p1.evidence,
      dqFindings: p1.findings,
      auditPlans: p2.auditPlans,
      auditProcedures: p2.auditProcedures,
      riskAssessments: p2.riskAssessments,
      samplingPlans: p2.samplingPlans,
      sampleItems: p2.sampleItems,
      designTests: p2.designTests,
      operatingTests: p2.operatingTests,
      emissionActivities: p2.emissionActivities,
      emissionFactors: p2.emissionFactors,
      ghgRecalculations: p2.ghgRecalculations,
      auditFindings: p2.auditFindings,
      disclosureFrameworks,
      disclosureRequirements,
      disclosureMappings,
      financialMateriality,
      impactMateriality,
      auditMateriality,
    },
  });

  return {
    disclosureFrameworks,
    disclosureRequirements,
    disclosureMappings,
    financialMateriality,
    impactMateriality,
    auditMateriality,
    assuranceReports: [initialGen.report, secondGen.report],
    reportSnapshots: [initialGen.snapshot, secondGen.snapshot],
  };
}
