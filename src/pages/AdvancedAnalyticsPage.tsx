import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { InsightsOutlined as InsightsOutlinedIcon } from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkbench } from '../context/WorkbenchContext';

export const AdvancedAnalyticsPage: React.FC = () => {
  const {
    advancedAnalytics,
    assertions,
    controls,
    evidence,
    auditProcedures,
    riskAssessments,
    auditFindings,
    activeEngagementId,
  } = useWorkbench();

  const [showTabularAlternatives, setShowTabularAlternatives] = useState<boolean>(true);

  const { testingAnalytics, ghgAnalytics, findingsAnalytics, disclosureAnalytics, doubleMaterialityMatrix } =
    advancedAnalytics;

  // Chart 1: Disclosure Coverage by Framework
  const chart1Data = useMemo(
    () =>
      disclosureAnalytics.byFramework.map((fw) => ({
        framework: fw.frameworkName,
        applicableInScope: fw.applicableCount,
        mapped: fw.mappedCount,
        internallyReviewed: fw.internallyReviewedCount,
        excludedNA: fw.notApplicableCount,
        coveragePct: fw.coveragePct,
      })),
    [disclosureAnalytics.byFramework]
  );

  // Chart 2: Testing Completion by ESG Pillar
  const chart2Data = useMemo(() => {
    const pillars: Array<'Environmental' | 'Social' | 'Governance'> = [
      'Environmental',
      'Social',
      'Governance',
    ];
    const ctrlPillarMap = new Map(controls.map((c) => [c.controlId, c.pillar]));
    const asnPillarMap = new Map(assertions.map((a) => [a.assertionId, a.pillar]));

    return pillars.map((p) => {
      const procsForPillar = auditProcedures.filter((proc) => {
        const hasAsn = proc.linkedAssertionIds.some((id) => asnPillarMap.get(id) === p);
        const hasCtl = proc.linkedControlIds.some((id) => ctrlPillarMap.get(id) === p);
        return hasAsn || hasCtl;
      });
      const completed = procsForPillar.filter((pr) => pr.status === 'Completed').length;
      return {
        pillar: p,
        plannedProcedures: procsForPillar.length,
        completedProcedures: completed,
        completionRatePct:
          procsForPillar.length === 0
            ? 0
            : Number(((completed / procsForPillar.length) * 100).toFixed(1)),
      };
    });
  }, [controls, assertions, auditProcedures]);

  // Chart 3: Inherent vs Residual Risk Comparison
  const chart3Data = useMemo(() => {
    return riskAssessments
      .filter((r) => r.engagementId === activeEngagementId)
      .map((r) => ({
        riskId: r.riskAssessmentId,
        category: r.riskCategory,
        inherentScore: r.inherentRiskScore,
        residualScore: r.residualRiskScore ?? r.inherentRiskScore,
        residualBand: r.residualRiskBand,
      }));
  }, [riskAssessments, activeEngagementId]);

  // Chart 4: GHG Reported vs Recalculated (Strict separation of Scope 2 Location-Based and Market-Based)
  const chart4Data = useMemo(
    () => [
      {
        scope: 'Scope 1 Direct',
        reported: ghgAnalytics.scope1ReportedTco2e,
        recalculated: ghgAnalytics.scope1RecalculatedTco2e,
        variance: ghgAnalytics.scope1VarianceTco2e,
      },
      {
        scope: 'Scope 2 (Location)',
        reported: ghgAnalytics.scope2LocationReportedTco2e,
        recalculated: ghgAnalytics.scope2LocationRecalculatedTco2e,
        variance: ghgAnalytics.scope2LocationVarianceTco2e,
      },
      {
        scope: 'Scope 2 (Market)',
        reported: ghgAnalytics.scope2MarketReportedTco2e,
        recalculated: ghgAnalytics.scope2MarketRecalculatedTco2e,
        variance: ghgAnalytics.scope2MarketVarianceTco2e,
      },
      {
        scope: 'Scope 3 Value Chain',
        reported: ghgAnalytics.scope3ReportedTco2e,
        recalculated: ghgAnalytics.scope3RecalculatedTco2e,
        variance: ghgAnalytics.scope3VarianceTco2e,
      },
    ],
    [ghgAnalytics]
  );

  // Chart 5: Findings by Severity & Remediation Status
  const chart5Data = useMemo(() => {
    const severities: Array<'Critical' | 'High' | 'Medium' | 'Low'> = [
      'Critical',
      'High',
      'Medium',
      'Low',
    ];
    const engFinds = auditFindings.filter((f) => f.engagementId === activeEngagementId);
    return severities.map((sev) => {
      const subset = engFinds.filter((f) => f.severity === sev);
      return {
        severity: sev,
        openOrInProgress: subset.filter((f) => f.remediationStatus !== 'Closed').length,
        closedVerified: subset.filter((f) => f.remediationStatus === 'Closed').length,
        total: subset.length,
      };
    });
  }, [auditFindings, activeEngagementId]);

  // Chart 6: Evidence Verification Funnel
  const chart6Data = useMemo(() => {
    const engEv = evidence.filter((e) => e.engagementId === activeEngagementId);
    const uploaded = engEv.filter((e) => !e.isMetadataOnlyDemo);
    const accepted = uploaded.filter((e) => e.verificationStatus === 'Accepted');
    const pending = uploaded.filter(
      (e) => e.verificationStatus === 'Uploaded - Pending Review'
    );
    const demoOnly = engEv.filter((e) => e.isMetadataOnlyDemo);

    return [
      { stage: '1. Total Catalog Records', count: engEv.length },
      { stage: '2. Demo Metadata Only (Excluded)', count: demoOnly.length },
      { stage: '3. Uploaded Binary Artifacts', count: uploaded.length },
      { stage: '4. Pending Review', count: pending.length },
      { stage: '5. Accepted & Verified', count: accepted.length },
    ];
  }, [evidence, activeEngagementId]);

  // Chart 7: Double-Materiality Matrix
  const chart7Data = useMemo(
    () =>
      doubleMaterialityMatrix.map((row) => ({
        topic: row.esgTopic,
        impactScore: row.impactScore ?? 0,
        financialScore: row.financialScore ?? 0,
        classification: row.classification,
      })),
    [doubleMaterialityMatrix]
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Advanced Audit &amp; Assurance Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quantitative Testing Analytics, Dual Scope 2 GHG Verification, Findings Aging &amp; Denominator-Aware Disclosure Analytics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showTabularAlternatives}
                onChange={(e) => setShowTabularAlternatives(e.target.checked)}
              />
            }
            label="Show Accessible Tabular Data Alternatives"
          />
          <Chip
            icon={<InsightsOutlinedIcon />}
            color="primary"
            label={`Engagement: ${activeEngagementId}`}
          />
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2.5 }}>
        <strong>Analytical Integrity Rules:</strong> Scope 2 Location-Based and Market-Based GHG totals are maintained strictly separate and never combined into a single Scope 2 sum. Requirements marked <code>Not Applicable</code> ({disclosureAnalytics.excludedNotApplicableCount}) are excluded from applicable disclosure coverage denominators.
      </Alert>

      {/* Top 4 Domain Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                7.1 TESTING ANALYTICS
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {testingAnalytics.testingCompletionRatePct}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {testingAnalytics.completedProcedures}/{testingAnalytics.plannedProcedures} Procedures • {testingAnalytics.controlsTested} Controls Tested • {testingAnalytics.operatingExceptions} Exceptions • Backlog: {testingAnalytics.reviewerBacklogCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                7.2 GHG RECALCULATION COVERAGE
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {ghgAnalytics.recalculationCoveragePct}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Missing Factors: {ghgAnalytics.missingEmissionFactorsCount} • Unit Failures: {ghgAnalytics.unitValidationFailuresCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                7.3 FINDINGS &amp; REMEDIATION AGING
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {findingsAnalytics.openFindingsCount} Open
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Avg Age: {findingsAnalytics.averageRemediationAgeDays}d • Overdue: {findingsAnalytics.overdueCorrectiveActionsCount} • Retest: {findingsAnalytics.retestingCompletionPct}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                7.4 DISCLOSURE COVERAGE
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {disclosureAnalytics.mappingCompletenessPct}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {disclosureAnalytics.mappedRequirementsCount}/{disclosureAnalytics.applicableRequirementsInScopeCount} Applicable Mapped ({disclosureAnalytics.excludedNotApplicableCount} N/A Excluded)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 7 Visualizations Grid */}
      <Grid container spacing={2.5}>
        {/* Visualization 1: Disclosure Coverage by Framework */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                1. Disclosure Coverage by Framework (Applicable In-Scope vs Mapped)
              </Typography>
              <Box sx={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart1Data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="framework" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="applicableInScope" name="Applicable In Scope" fill="#123047" />
                    <Bar dataKey="mapped" name="Mapped" fill="#087F8C" />
                    <Bar dataKey="internallyReviewed" name="Internally Reviewed" fill="#16A085" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {showTabularAlternatives && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small" aria-label="Disclosure Coverage by Framework Table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Framework</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Applicable</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Excluded N/A</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Mapped</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Coverage %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chart1Data.map((r) => (
                        <TableRow key={r.framework}>
                          <TableCell sx={{ fontWeight: 600 }}>{r.framework}</TableCell>
                          <TableCell>{r.applicableInScope}</TableCell>
                          <TableCell>{r.excludedNA}</TableCell>
                          <TableCell>{r.mapped}</TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.coveragePct}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization 2: Testing Completion by ESG Pillar */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                2. Testing Completion by ESG Pillar
              </Typography>
              <Box sx={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart2Data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pillar" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="plannedProcedures" name="Planned Procedures" fill="#607080" />
                    <Bar dataKey="completedProcedures" name="Completed Procedures" fill="#2E7D32" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {showTabularAlternatives && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small" aria-label="Testing Completion by ESG Pillar Table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Pillar</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Planned</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Completed</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Completion Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chart2Data.map((r) => (
                        <TableRow key={r.pillar}>
                          <TableCell sx={{ fontWeight: 600 }}>{r.pillar}</TableCell>
                          <TableCell>{r.plannedProcedures}</TableCell>
                          <TableCell>{r.completedProcedures}</TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.completionRatePct}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization 3: Inherent vs Residual Risk Comparison */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                3. Inherent vs Residual Risk Heatmap &amp; Profile
              </Typography>
              <Box sx={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart3Data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="riskId" />
                    <YAxis domain={[0, 25]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="inherentScore" name="Inherent Risk (1-25)" fill="#D32F2F" />
                    <Bar dataKey="residualScore" name="Residual Risk" fill="#087F8C" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {showTabularAlternatives && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small" aria-label="Inherent vs Residual Risk Table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Risk ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Inherent Score</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Residual Band</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chart3Data.map((r) => (
                        <TableRow key={r.riskId}>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.riskId}
                          </TableCell>
                          <TableCell>{r.category}</TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.inherentScore}
                          </TableCell>
                          <TableCell>{r.residualBand}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization 4: GHG Reported vs Recalculated Comparison */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                4. GHG Reported vs Recalculated (Dual Scope 2 Separation)
              </Typography>
              <Box sx={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart4Data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scope" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reported" name="Reported (tCO2e)" fill="#123047" />
                    <Bar dataKey="recalculated" name="Recalculated (tCO2e)" fill="#16A085" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {showTabularAlternatives && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small" aria-label="GHG Reported vs Recalculated Table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>GHG Scope</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Reported (tCO2e)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Recalculated (tCO2e)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Variance (tCO2e)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chart4Data.map((r) => (
                        <TableRow key={r.scope}>
                          <TableCell sx={{ fontWeight: 600 }}>{r.scope}</TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.reported.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.recalculated.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.variance >= 0 ? `+${r.variance.toFixed(2)}` : r.variance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization 5: Findings by Severity and Remediation Status */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                5. Findings by Severity &amp; Remediation Status
              </Typography>
              <Box sx={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart5Data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="severity" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="openOrInProgress" name="Open / In Remediation" fill="#ED6C02" />
                    <Bar dataKey="closedVerified" name="Closed & Retested" fill="#2E7D32" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {showTabularAlternatives && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small" aria-label="Findings by Severity Table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Open / In Remediation</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Closed &amp; Verified</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chart5Data.map((r) => (
                        <TableRow key={r.severity}>
                          <TableCell sx={{ fontWeight: 600 }}>{r.severity}</TableCell>
                          <TableCell>{r.openOrInProgress}</TableCell>
                          <TableCell>{r.closedVerified}</TableCell>
                          <TableCell>{r.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization 6: Evidence Verification Funnel */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                6. Evidence Provenance &amp; Verification Funnel
              </Typography>
              <Box sx={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart6Data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="stage" width={190} />
                    <Tooltip />
                    <Bar dataKey="count" name="Evidence Records" fill="#087F8C" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {showTabularAlternatives && (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small" aria-label="Evidence Verification Funnel Table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Funnel Stage</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Record Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chart6Data.map((r) => (
                        <TableRow key={r.stage}>
                          <TableCell sx={{ fontWeight: 600 }}>{r.stage}</TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {r.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization 7: Double-Materiality Matrix */}
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                7. Double-Materiality Analytical Matrix (Impact Score vs Financial Score)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="impactScore" name="Impact" domain={[0, 5]} />
                        <YAxis
                          type="number"
                          dataKey="financialScore"
                          name="Financial"
                          domain={[0, 25]}
                        />
                        <Tooltip />
                        <Scatter name="Topics" data={chart7Data} fill="#123047" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 7 }}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small" aria-label="Double Materiality Matrix Table">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>ESG Topic</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Impact Score</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Financial Score</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Classification</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chart7Data.map((r) => (
                          <TableRow key={r.topic}>
                            <TableCell sx={{ fontWeight: 600 }}>{r.topic}</TableCell>
                            <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {r.impactScore}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {r.financialScore}
                            </TableCell>
                            <TableCell>{r.classification}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
