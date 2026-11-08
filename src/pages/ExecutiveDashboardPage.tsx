import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  FilterAltOffOutlined,
  SyncOutlined,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  AssertionReviewStatus,
  ESGPillar,
  ReportingYear,
} from '../types/domain';
import {
  applyGlobalFilters,
  calculateAssuranceReadinessMetrics,
  ENGAGEMENT_PROGRESS_WEIGHTS,
} from '../methodology/readinessCalculator';
import { summarizeGhgInventory } from '../services/ghgEngine';
import { VALIDATION_RULE_DEFINITIONS } from '../validation/dqEngine';

const CHART_COLORS = ['#123047', '#087F8C', '#16A085', '#ED6C02', '#D32F2F', '#607080'];

export const ExecutiveDashboardPage: React.FC = () => {
  const {
    engagements,
    facilities,
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
    ghgRecalculations,
    auditFindings,
    filters,
    setFilters,
    resetFilters,
    filteredData,
    metrics,
    phase2Metrics,
    resolveFinding,
    triggerDeterministicRevalidation,
  } = useWorkbench();

  const [revalidating, setRevalidating] = useState(false);
  const [revalStatusBanner, setRevalStatusBanner] = useState<string | null>(null);

  const handleRunValidation = async () => {
    setRevalidating(true);
    const updated = await triggerDeterministicRevalidation();
    const reopened = updated.filter((f) => f.status === 'Reopened').length;
    setRevalStatusBanner(
      `Executed DQ-01..DQ-10 across stored records: ${updated.filter((f) => f.status !== 'Resolved').length} active findings (${reopened} reopened after revalidation check).`
    );
    setRevalidating(false);
  };

  // Phase 1 Charts Data
  const engagementStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filteredData.engagements) {
      counts[e.engagementStatus] = (counts[e.engagementStatus] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [filteredData.engagements]);

  const assertionsByPillarData = useMemo(() => {
    const pillars: ESGPillar[] = ['Environmental', 'Social', 'Governance'];
    return pillars.map((pillar) => {
      const subset = filteredData.assertions.filter((a) => a.pillar === pillar);
      return {
        pillar,
        Reviewed: subset.filter((a) => a.reviewStatus === 'Reviewed').length,
        InReview: subset.filter((a) => a.reviewStatus === 'In Review').length,
        Unreviewed: subset.filter((a) => a.reviewStatus === 'Unreviewed').length,
        Flagged: subset.filter((a) => a.reviewStatus === 'Flagged').length,
      };
    });
  }, [filteredData.assertions]);

  const controlDocData = useMemo(() => {
    const statuses = ['Documented', 'Draft', 'Undocumented', 'Requires Remediation'];
    return statuses.map((status) => ({
      name: status,
      value: filteredData.controls.filter((c) => c.designStatus === status).length,
    }));
  }, [filteredData.controls]);

  const evidenceStatusData = useMemo(() => {
    const statuses = [
      'Metadata Only (Demo Unavailable)',
      'Uploaded - Pending Review',
      'Accepted',
      'Rejected',
    ];
    return statuses.map((status) => ({
      status: status.replace(' (Demo Unavailable)', ''),
      count: filteredData.evidence.filter((ev) => ev.verificationStatus === status).length,
    }));
  }, [filteredData.evidence]);

  const findingsBySeverityData = useMemo(() => {
    const activeFindings = filteredData.findings.filter((f) => f.status !== 'Resolved');
    return (['High', 'Medium', 'Low'] as const).map((severity) => ({
      severity,
      Open: activeFindings.filter((f) => f.severity === severity && f.status === 'Open').length,
      Reopened: activeFindings.filter((f) => f.severity === severity && f.status === 'Reopened')
        .length,
    }));
  }, [filteredData.findings]);

  const readinessByEngagementData = useMemo(() => {
    return engagements
      .filter((e) => e.engagementStatus !== 'Archived')
      .map((eng) => {
        const subFiltered = applyGlobalFilters(
          { engagements, assertions, controls, evidence, findings },
          {
            engagementId: eng.engagementId,
            reportingYear: 'ALL',
            facilityId: filters.facilityId,
            pillar: filters.pillar,
            reviewStatus: filters.reviewStatus,
          }
        );
        const engMetrics = calculateAssuranceReadinessMetrics(subFiltered, evidence);
        return {
          name: eng.reportingYear,
          AssertionReview: engMetrics.assertionReviewCoveragePct,
          ControlDocs: engMetrics.controlDocumentationCoveragePct,
          EvidenceCoverage: engMetrics.evidenceCoveragePct,
          WeightedProgress: engMetrics.engagementCompletionPct,
        };
      });
  }, [engagements, assertions, controls, evidence, findings, filters]);

  // Phase 2 Charts Data (7 Charts from Section 15)
  const p2TestingProgressData = useMemo(() => {
    const statuses = ['Draft', 'In Progress', 'Completed', 'Reviewed', 'Approved'];
    return statuses.map((status) => ({
      status,
      Procedures: auditProcedures.filter((p) => p.status === status).length,
    }));
  }, [auditProcedures]);

  const p2RiskBandData = useMemo(() => {
    const bands = ['Critical', 'High', 'Moderate', 'Low'];
    return bands.map((band) => ({
      band,
      Inherent: riskAssessments.filter((r) => r.inherentRiskBand === band).length,
      Residual: riskAssessments.filter((r) => r.residualRiskBand === band).length,
    }));
  }, [riskAssessments]);

  const p2ControlTestResultsData = useMemo(() => {
    const conclusions = [
      'Operating Effectively',
      'Exception Identified',
      'Operating Ineffectively',
      'Inconclusive',
    ];
    return conclusions.map((c) => ({
      name: c,
      count: operatingTests.filter((o) => o.conclusion === c).length,
    }));
  }, [operatingTests]);

  const p2SamplingCoverageData = useMemo(() => {
    return samplingPlans.map((sp) => {
      const items = sampleItems.filter((i) => i.samplingPlanId === sp.samplingPlanId);
      const tested = items.filter((i) => i.testingStatus !== 'Selected - Untested').length;
      return {
        plan: sp.samplingPlanId,
        Selected: items.length,
        Tested: tested,
      };
    });
  }, [samplingPlans, sampleItems]);

  const ghgSummary = useMemo(
    () => summarizeGhgInventory(emissionActivities, ghgRecalculations),
    [emissionActivities, ghgRecalculations]
  );

  const p2GhgComparisonData = useMemo(() => {
    return [
      {
        scope: 'Scope 1 + 2 (Loc)',
        Reported: Number((ghgSummary.scope1TotalReported + ghgSummary.scope2LocationReported).toFixed(2)),
        Recalculated: Number((ghgSummary.scope1TotalRecalculated + ghgSummary.scope2LocationRecalculated).toFixed(2)),
      },
      {
        scope: 'Scope 2 Market-Based',
        Reported: Number(ghgSummary.scope2MarketReported.toFixed(2)),
        Recalculated: Number(ghgSummary.scope2MarketRecalculated.toFixed(2)),
      },
    ];
  }, [ghgSummary]);

  const p2AuditFindingsSeverityData = useMemo(() => {
    return (['Critical', 'High', 'Medium', 'Low'] as const).map((severity) => ({
      severity,
      Open: auditFindings.filter((f) => f.severity === severity && f.remediationStatus !== 'Closed').length,
      Closed: auditFindings.filter((f) => f.severity === severity && f.remediationStatus === 'Closed').length,
    }));
  }, [auditFindings]);

  const p2RemediationAgingData = useMemo(() => {
    return [
      {
        stage: 'Open',
        count: auditFindings.filter((f) => f.remediationStatus === 'Open').length,
      },
      {
        stage: 'In Progress',
        count: auditFindings.filter(
          (f) => f.remediationStatus === 'Action Planned' || f.remediationStatus === 'In Progress'
        ).length,
      },
      {
        stage: 'Ready for Retest',
        count: auditFindings.filter((f) => f.remediationStatus === 'Ready for Retest').length,
      },
      {
        stage: 'Closed (Verified)',
        count: auditFindings.filter((f) => f.remediationStatus === 'Closed').length,
      },
    ];
  }, [auditFindings]);

  const kpiCards = [
    {
      id: 'kpi-active-engagements',
      label: '01. Active Engagements',
      value: String(metrics.activeEngagementsCount),
      subtext: `Of ${engagements.length} total stored engagements`,
      tone: 'primary',
    },
    {
      id: 'kpi-total-assertions',
      label: '02. Total ESG Assertions',
      value: String(metrics.totalAssertionsCount),
      subtext: `${metrics.applicableAssertionsCount} applicable · ${metrics.excludedNotApplicableAssertionsCount} N/A excluded`,
      tone: 'primary',
    },
    {
      id: 'kpi-assertions-reviewed',
      label: '03. Assertions Reviewed',
      value: `${metrics.assertionReviewCoveragePct.toFixed(1)}%`,
      subtext: `${metrics.reviewedAssertionsCount} / ${metrics.applicableAssertionsCount} applicable assertions`,
      tone: 'teal',
    },
    {
      id: 'kpi-control-inventory',
      label: '04. Control Inventory',
      value: String(metrics.totalControlsCount),
      subtext: 'Environmental, Social & Governance controls',
      tone: 'primary',
    },
    {
      id: 'kpi-controls-documented',
      label: '05. Documented Control Design',
      value: `${metrics.controlDocumentationCoveragePct.toFixed(1)}%`,
      subtext: `${metrics.documentedControlsCount} / ${metrics.applicableControlsCount} controls documented`,
      tone: 'teal',
    },
    {
      id: 'kpi-evidence-coverage',
      label: '06. Evidence Coverage',
      value: `${metrics.evidenceCoveragePct.toFixed(1)}%`,
      subtext: `${metrics.assertionsWithAvailableEvidenceCount} / ${metrics.assertionsRequiringEvidenceCount} assertions linked`,
      tone: 'teal',
    },
    {
      id: 'kpi-evidence-accepted',
      label: '07. Evidence Accepted',
      value: `${metrics.acceptedEvidenceCount} (${metrics.evidenceAcceptanceRatePct.toFixed(1)}%)`,
      subtext: `${metrics.reviewedEvidenceCount} uploaded files reviewed (demo refs excluded)`,
      tone: 'success',
    },
    {
      id: 'kpi-open-findings',
      label: '08. Open Validation Findings',
      value: String(metrics.openFindingsCount),
      subtext: 'Deterministic DQ-01..DQ-10 engine violations',
      tone: metrics.openFindingsCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'kpi-high-severity',
      label: '09. High-Severity Issues',
      value: String(metrics.highSeverityFindingsCount),
      subtext: 'Critical missing values, duplicates, or unit errors',
      tone: metrics.highSeverityFindingsCount > 0 ? 'error' : 'success',
    },
    {
      id: 'kpi-engagement-completion',
      label: '10. Weighted Readiness Progress',
      value: `${metrics.engagementCompletionPct.toFixed(1)}%`,
      subtext: 'Operational progress indicator (Non-assurance opinion)',
      tone: 'primary',
    },
  ];

  const approvedPlansCount = auditPlans.filter(
    (p) =>
      p.status === 'Approved for Internal Testing' ||
      p.status === 'Testing in Progress' ||
      p.status === 'Testing Completed' ||
      p.status === 'Closed'
  ).length;
  const highAndCriticalRisksCount = riskAssessments.filter(
    (r) => r.inherentRiskBand === 'High' || r.inherentRiskBand === 'Critical'
  ).length;
  const operatingEffectiveCount = operatingTests.filter(
    (o) => o.conclusion === 'Operating Effectively' && o.reviewStatus === 'Approved'
  ).length;
  const testedSamplesCount = sampleItems.filter(
    (s) => s.testingStatus !== 'Selected - Untested'
  ).length;

  const phase2KpiCards = [
    {
      id: 'p2-kpi-approved-plans',
      label: 'P2-01. Approved Audit Plans',
      value: `${approvedPlansCount} (${phase2Metrics.auditPlanCompletionPct.toFixed(0)}%)`,
      subtext: 'Internal testing milestone reached',
      tone: 'primary',
    },
    {
      id: 'p2-kpi-procedures-completed',
      label: 'P2-02. Audit Procedures Completed',
      value: `${phase2Metrics.proceduresCompletedCount} / ${phase2Metrics.proceduresScheduledCount}`,
      subtext: 'Workprogram execution status',
      tone: 'teal',
    },
    {
      id: 'p2-kpi-high-critical-risks',
      label: 'P2-03. High / Critical Risk Assertions',
      value: String(highAndCriticalRisksCount),
      subtext: 'Inherent Risk Score ≥ 11 (5×5 matrix)',
      tone: 'warning',
    },
    {
      id: 'p2-kpi-controls-tested-design',
      label: 'P2-04. Controls Tested for Design',
      value: String(designTests.length),
      subtext: `${phase2Metrics.designDeficienciesCount} design deficiencies logged`,
      tone: 'teal',
    },
    {
      id: 'p2-kpi-controls-operating-effectively',
      label: 'P2-05. Controls Operating Effectively',
      value: `${operatingEffectiveCount} / ${operatingTests.length}`,
      subtext: 'Passed all 7 operating guardrails & 4-eyes sign-off',
      tone: 'success',
    },
    {
      id: 'p2-kpi-control-exceptions',
      label: 'P2-06. Control Exceptions Identified',
      value: String(phase2Metrics.operatingExceptionsCount),
      subtext: 'Sample deviations logged during testing',
      tone: phase2Metrics.operatingExceptionsCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'p2-kpi-sample-items-tested',
      label: 'P2-07. Sample Items Tested',
      value: `${testedSamplesCount} / ${sampleItems.length} (${phase2Metrics.sampleTestingCompletionPct.toFixed(0)}%)`,
      subtext: 'Seeded PRNG, Systematic, MUS & Judgmental items',
      tone: 'teal',
    },
    {
      id: 'p2-kpi-ghg-sources-recalculated',
      label: 'P2-08. GHG Sources Recalculated',
      value: `${ghgRecalculations.length} (${phase2Metrics.ghgRecalculationCoveragePct.toFixed(0)}%)`,
      subtext: 'Scope 1, Scope 2 (Loc/Mkt) & Scope 3 Cat 1,3,4,6,7',
      tone: 'primary',
    },
    {
      id: 'p2-kpi-reported-vs-recalc-ghg',
      label: 'P2-09. Scope 1+2 (Loc) Reported vs Recalc',
      value: `${(ghgSummary.scope1TotalReported + ghgSummary.scope2LocationReported).toFixed(1)} vs ${(ghgSummary.scope1TotalRecalculated + ghgSummary.scope2LocationRecalculated).toFixed(1)}`,
      subtext: `tCO2e · Scope 2 Market Recalc: ${ghgSummary.scope2MarketRecalculated.toFixed(1)} tCO2e`,
      tone: 'teal',
    },
    {
      id: 'p2-kpi-material-ghg-variances',
      label: 'P2-10. Unresolved GHG Variances',
      value: String(phase2Metrics.unresolvedGhgVariancesCount),
      subtext: 'Exceeding materiality threshold or unit/factor blocks',
      tone: phase2Metrics.unresolvedGhgVariancesCount > 0 ? 'error' : 'success',
    },
    {
      id: 'p2-kpi-open-audit-findings',
      label: 'P2-11. Open Audit Findings',
      value: String(phase2Metrics.openAuditFindingsCount),
      subtext: `${phase2Metrics.pendingReviewsCount} workpapers awaiting independent review`,
      tone: phase2Metrics.openAuditFindingsCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'p2-kpi-overdue-remediation',
      label: 'P2-12. Overdue Remediation Actions',
      value: String(phase2Metrics.overdueRemediationCount),
      subtext: 'CAP items past scheduled due date',
      tone: phase2Metrics.overdueRemediationCount > 0 ? 'error' : 'success',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Global Filter Strip */}
      <Paper sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box>
            <Typography variant="h5">Executive Assurance &amp; Readiness Dashboard (v0.2.0)</Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time deterministic readiness, risk, sampling, control testing, and GHG verification telemetry calculated directly from IndexedDB v2 stores.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterAltOffOutlined />}
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<SyncOutlined />}
              onClick={() => void handleRunValidation()}
              disabled={revalidating}
            >
              {revalidating ? 'Running DQ Engine...' : 'Revalidate DQ Rules'}
            </Button>
          </Box>
        </Box>

        {revalStatusBanner && (
          <Alert
            severity="info"
            onClose={() => setRevalStatusBanner(null)}
            sx={{ mb: 2 }}
          >
            {revalStatusBanner}
          </Alert>
        )}

        {/* Global Multi-Dimension Filters */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dash-filter-engagement">Engagement</InputLabel>
              <Select
                labelId="dash-filter-engagement"
                data-testid="filter-engagement"
                label="Engagement"
                value={filters.engagementId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, engagementId: e.target.value }))
                }
              >
                <MenuItem value="ALL">All Engagements</MenuItem>
                {engagements.map((eng) => (
                  <MenuItem key={eng.engagementId} value={eng.engagementId}>
                    {eng.reportingYear} — {eng.engagementName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dash-filter-year">Reporting Year</InputLabel>
              <Select
                labelId="dash-filter-year"
                data-testid="filter-reporting-year"
                label="Reporting Year"
                value={filters.reportingYear}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    reportingYear: e.target.value as ReportingYear | 'ALL',
                  }))
                }
              >
                <MenuItem value="ALL">All Reporting Years</MenuItem>
                <MenuItem value="FY 2024">FY 2024</MenuItem>
                <MenuItem value="FY 2025">FY 2025</MenuItem>
                <MenuItem value="FY 2026">FY 2026</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dash-filter-facility">Manufacturing Facility</InputLabel>
              <Select
                labelId="dash-filter-facility"
                data-testid="filter-facility"
                label="Manufacturing Facility"
                value={filters.facilityId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, facilityId: e.target.value }))
                }
              >
                <MenuItem value="ALL">All 5 Facilities</MenuItem>
                {facilities.map((fac) => (
                  <MenuItem key={fac.facilityId} value={fac.facilityId}>
                    {fac.facilityCode} — {fac.facilityName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dash-filter-pillar">ESG Pillar</InputLabel>
              <Select
                labelId="dash-filter-pillar"
                data-testid="filter-pillar"
                label="ESG Pillar"
                value={filters.pillar}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    pillar: e.target.value as ESGPillar | 'ALL',
                  }))
                }
              >
                <MenuItem value="ALL">All Pillars (E, S, G)</MenuItem>
                <MenuItem value="Environmental">Environmental</MenuItem>
                <MenuItem value="Social">Social</MenuItem>
                <MenuItem value="Governance">Governance</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="dash-filter-status">Review Status</InputLabel>
              <Select
                labelId="dash-filter-status"
                data-testid="filter-review-status"
                label="Review Status"
                value={filters.reviewStatus}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    reviewStatus: e.target.value as AssertionReviewStatus | 'ALL',
                  }))
                }
              >
                <MenuItem value="ALL">All Review Statuses</MenuItem>
                <MenuItem value="Reviewed">Reviewed</MenuItem>
                <MenuItem value="In Review">In Review</MenuItem>
                <MenuItem value="Unreviewed">Unreviewed</MenuItem>
                <MenuItem value="Flagged">Flagged</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Phase 1: 10 Elevated Material UI KPI Cards */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: -1.5 }}>
        Phase 1 Foundation &amp; Readiness KPIs
      </Typography>
      <Grid container spacing={2}>
        {kpiCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={card.id}>
            <Card data-testid={card.id} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.25 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.75,
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    fontSize: '1.65rem',
                    color:
                      card.tone === 'error'
                        ? 'error.main'
                        : card.tone === 'warning'
                          ? 'warning.main'
                          : card.tone === 'success'
                            ? 'success.main'
                            : card.tone === 'teal'
                              ? 'secondary.main'
                              : 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {card.subtext}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Phase 2: 12 Audit Planning, Control Testing & GHG Verification KPI Cards */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: -1.5 }}>
        Phase 2 Audit Planning, Control Testing &amp; GHG Verification KPIs
      </Typography>
      <Grid container spacing={2}>
        {phase2KpiCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.id}>
            <Card data-testid={card.id} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.25 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.75,
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    color:
                      card.tone === 'error'
                        ? 'error.main'
                        : card.tone === 'warning'
                          ? 'warning.main'
                          : card.tone === 'success'
                            ? 'success.main'
                            : card.tone === 'teal'
                              ? 'secondary.main'
                              : 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {card.subtext}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Weighted Progress Methodology Transparency Banner */}
      <Paper sx={{ p: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Weighted Readiness Progress Formula:</strong> Scope Definition (
          {ENGAGEMENT_PROGRESS_WEIGHTS.scopeDefinition * 100}%) + Assertion Review Coverage (
          {ENGAGEMENT_PROGRESS_WEIGHTS.assertionReview * 100}%) + Control Documentation Coverage (
          {ENGAGEMENT_PROGRESS_WEIGHTS.controlDocumentation * 100}%) + Evidence Review Blend (
          {ENGAGEMENT_PROGRESS_WEIGHTS.evidenceReview * 100}%).
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}
        >
          Operational Indicator Only · Not an Assurance Opinion
        </Typography>
      </Paper>

      {/* Phase 2: 7 Analytical Charts Grid */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: -1.5 }}>
        Phase 2 Assurance Execution &amp; GHG Verification Analytics (7 Charts)
      </Typography>
      <Grid container spacing={2.5}>
        {/* P2 Chart 1: Audit Testing Progress */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Paper sx={{ p: 2.5, height: 320, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              1. Audit Procedure Testing Progress
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p2TestingProgressData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="Procedures" fill="#123047" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* P2 Chart 2: Inherent vs Residual Risk Band Distribution */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Paper sx={{ p: 2.5, height: 320, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              2. Inherent vs. Residual Risk Bands
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p2RiskBandData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="band" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Inherent" fill="#D32F2F" />
                  <Bar dataKey="Residual" fill="#087F8C" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* P2 Chart 3: Control Testing Results */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Paper sx={{ p: 2.5, height: 320, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              3. Control Operating Effectiveness Results
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p2ControlTestResultsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={135} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="count" name="Controls" fill="#16A085" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* P2 Chart 4: Sampling Coverage */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Paper sx={{ p: 2.5, height: 320, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              4. Audit Sampling Coverage by Plan
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p2SamplingCoverageData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="plan" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Selected" fill="#123047" />
                  <Bar dataKey="Tested" fill="#2E7D32" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* P2 Chart 5: GHG Reported vs Recalculated */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Paper sx={{ p: 2.5, height: 320, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              5. GHG Reported vs. Shadow Recalculated (tCO2e)
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p2GhgComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="scope" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Reported" fill="#123047" />
                  <Bar dataKey="Recalculated" fill="#16A085" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* P2 Chart 6: Audit Findings by Severity & P2 Chart 7: Remediation Aging */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Paper sx={{ p: 2.5, height: 320, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              6 &amp; 7. Findings by Severity &amp; CAP Remediation Lifecycle
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 165 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p2AuditFindingsSeverityData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="severity" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Open" fill="#ED6C02" />
                  <Bar dataKey="Closed" fill="#2E7D32" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
              {p2RemediationAgingData.map((item) => (
                <Typography
                  key={item.stage}
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {item.stage}: <strong>{item.count}</strong>
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Phase 1: 6 Analytical Charts Grid */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: -1.5 }}>
        Phase 1 Readiness &amp; Data Quality Analytics (6 Charts)
      </Typography>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, height: 360, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" gutterBottom>
              Audit Readiness Coverage by Engagement (%)
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={readinessByEngagementData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="AssertionReview" name="Assertion Review %" fill="#123047" />
                  <Bar dataKey="ControlDocs" name="Control Docs %" fill="#087F8C" />
                  <Bar dataKey="EvidenceCoverage" name="Evidence Linked %" fill="#16A085" />
                  <Bar dataKey="WeightedProgress" name="Weighted Progress %" fill="#ED6C02" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, height: 360, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" gutterBottom>
              ESG Assertions by Pillar &amp; Review Status
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assertionsByPillarData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="pillar" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Reviewed" stackId="a" fill="#2E7D32" />
                  <Bar dataKey="InReview" name="In Review" stackId="a" fill="#087F8C" />
                  <Bar dataKey="Unreviewed" stackId="a" fill="#607080" />
                  <Bar dataKey="Flagged" stackId="a" fill="#D32F2F" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, height: 340, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" gutterBottom>
              Control Documentation Coverage
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={controlDocData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {controlDocData.map((_entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, height: 340, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" gutterBottom>
              Evidence Register Review Status
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evidenceStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={125} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="count" name="Records" fill="#087F8C" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, height: 340, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" gutterBottom>
              Validation Findings by Severity &amp; Engagement Status
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={findingsBySeverityData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="severity" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Open" fill="#D32F2F" />
                  <Bar dataKey="Reopened" fill="#ED6C02" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              {engagementStatusData.map((st) => (
                <Typography
                  key={st.name}
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {st.name}: <strong>{st.count}</strong>
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Deterministic Data Quality Validation Findings Ledger (DQ-01..DQ-10) */}
      <Paper sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h6">
              Deterministic Data Quality Findings ({filteredData.findings.length} Total ·{' '}
              {metrics.openFindingsCount} Active)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Rules DQ-01 through DQ-10 evaluate missing values, duplicates, incompatible units,
              missing evidence, missing control owners, period mismatches, and unsupported methods.
            </Typography>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Finding ID</TableCell>
                <TableCell>Rule ID</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Entity Reference</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.findings.map((finding) => (
                <TableRow key={finding.findingId} hover>
                  <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                    {finding.findingId}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {finding.ruleId} ({VALIDATION_RULE_DEFINITIONS[finding.ruleId]?.title})
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color:
                          finding.severity === 'High'
                            ? 'error.main'
                            : finding.severity === 'Medium'
                              ? 'warning.main'
                              : 'text.secondary',
                      }}
                    >
                      {finding.severity}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                    {finding.linkedEntityId}
                  </TableCell>
                  <TableCell>{finding.description}</TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        color:
                          finding.status === 'Resolved'
                            ? 'success.main'
                            : finding.status === 'Reopened'
                              ? 'error.main'
                              : 'warning.main',
                      }}
                    >
                      {finding.status}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {finding.status !== 'Resolved' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CheckCircleOutlined fontSize="small" />}
                        onClick={() =>
                          void resolveFinding(
                            finding.findingId,
                            'Marked resolved from Executive Dashboard'
                          )
                        }
                      >
                        Mark Resolved
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Resolved (Subject to Revalidation)
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
