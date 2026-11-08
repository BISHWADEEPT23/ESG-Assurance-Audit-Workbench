import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddCircleOutlined as AddCircleOutlineIcon,
  BalanceOutlined as BalanceOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  ESGPillar,
  FinancialEffectType,
  ImpactPolarity,
  ImpactType,
  MaterialityTimeHorizon,
} from '../types/domain';

export const MaterialityWorkbenchPage: React.FC = () => {
  const {
    financialMateriality,
    impactMateriality,
    auditMateriality,
    doubleMaterialityMatrix,
    activeEngagementId,
    activeActor,
    saveFinancialMateriality,
    saveImpactMateriality,
    saveAuditMateriality,
  } = useWorkbench();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Financial Materiality Dialog
  const [finDialogOpen, setFinDialogOpen] = useState(false);
  const [finTopic, setFinTopic] = useState('Industrial Circular Packaging & Scrap Recovery');
  const [finPillar, setFinPillar] = useState<ESGPillar>('Environmental');
  const [finHorizon, setFinHorizon] = useState<MaterialityTimeHorizon>('Medium');
  const [finEffectType, setFinEffectType] = useState<FinancialEffectType>('Cost');
  const [finMagnitude, setFinMagnitude] = useState<number>(4);
  const [finLikelihood, setFinLikelihood] = useState<number>(4);
  const [finThreshold, setFinThreshold] = useState<number>(12);
  const [finRationale, setFinRationale] = useState(
    'Recycled alloy procurement savings and EU packaging compliance exposure.'
  );

  // Impact Materiality Dialog
  const [impDialogOpen, setImpDialogOpen] = useState(false);
  const [impTopic, setImpTopic] = useState('Industrial Circular Packaging & Scrap Recovery');
  const [impType, setImpType] = useState<ImpactType>('Actual');
  const [impPolarity, setImpPolarity] = useState<ImpactPolarity>('Negative');
  const [impScale, setImpScale] = useState<number>(4);
  const [impScope, setImpScope] = useState<number>(4);
  const [impIrremediable, setImpIrremediable] = useState<number>(3);
  const [impLikelihood, setImpLikelihood] = useState<number>(4);
  const [impThreshold, setImpThreshold] = useState<number>(3.5);
  const [impRationale, setImpRationale] = useState(
    'Actual industrial foundry slag and metal swarf generation across 5 manufacturing sites.'
  );

  // Audit Materiality Dialog
  const [audDialogOpen, setAudDialogOpen] = useState(false);
  const [audCode, setAudCode] = useState('ESRS-E3-WATER');
  const [audName, setAudName] = useState('Consolidated Municipal & Process Water Withdrawal');
  const [audBase, setAudBase] = useState<number>(142500);
  const [audPlanPct, setAudPlanPct] = useState<number>(4.0);
  const [audPerfPct, setAudPerfPct] = useState<number>(3.0);
  const [audTrivialPct, setAudTrivialPct] = useState<number>(0.2);
  const [audUnit, setAudUnit] = useState('m3');
  const [audQualitative, setAudQualitative] = useState(
    'Metered municipal water invoices across 5 plants; 75% performance materiality ratio.'
  );

  const engFinancial = useMemo(
    () => financialMateriality.filter((f) => f.engagementId === activeEngagementId),
    [financialMateriality, activeEngagementId]
  );

  const engImpact = useMemo(
    () => impactMateriality.filter((i) => i.engagementId === activeEngagementId),
    [impactMateriality, activeEngagementId]
  );

  const engAuditMat = useMemo(
    () => auditMateriality.filter((a) => a.engagementId === activeEngagementId),
    [auditMateriality, activeEngagementId]
  );

  const scatterData = useMemo(
    () =>
      doubleMaterialityMatrix.map((row) => ({
        name: row.esgTopic,
        pillar: row.pillar,
        impactScore: row.impactScore ?? 0,
        financialScore: row.financialScore ?? 0,
        classification: row.classification,
        impactType: row.impactType ?? 'Actual',
      })),
    [doubleMaterialityMatrix]
  );

  const handleSaveFinancial = async () => {
    try {
      setFormError(null);
      const saved = await saveFinancialMateriality({
        engagementId: activeEngagementId,
        esgTopic: finTopic,
        pillar: finPillar,
        timeHorizon: finHorizon,
        financialEffectType: finEffectType,
        magnitudeScore: Number(finMagnitude),
        likelihoodScore: Number(finLikelihood),
        materialityThreshold: Number(finThreshold),
        rationale: finRationale,
        assessedBy: activeActor,
        reviewedBy: null,
      });
      setFinDialogOpen(false);
      setFeedback(
        `Saved Financial Materiality for "${saved.esgTopic}" (Score=${saved.financialMaterialityScore}, Material=${saved.isFinanciallyMaterial}).`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save financial materiality.');
    }
  };

  const handleSaveImpact = async () => {
    try {
      setFormError(null);
      const saved = await saveImpactMateriality({
        engagementId: activeEngagementId,
        esgTopic: impTopic,
        impactType: impType,
        polarity: impPolarity,
        scaleScore: Number(impScale),
        scopeScore: Number(impScope),
        irremediableCharacterScore: Number(impIrremediable),
        likelihoodScore: impType === 'Actual' ? null : Number(impLikelihood),
        impactThreshold: Number(impThreshold),
        rationale: impRationale,
        assessedBy: activeActor,
        reviewedBy: null,
      });
      setImpDialogOpen(false);
      setFeedback(
        `Saved Impact Materiality for "${saved.esgTopic}" [${saved.impactType}]: Severity=${saved.severityScore}, Score=${saved.impactMaterialityScore} (Likelihood=${saved.likelihoodScore ?? 'NULL - Actual Impact'}).`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save impact materiality.');
    }
  };

  const handleSaveAuditMat = async () => {
    try {
      setFormError(null);
      const base = Number(audBase);
      const planPct = Number(audPlanPct);
      const perfPct = Number(audPerfPct);
      const trivPct = Number(audTrivialPct);

      const saved = await saveAuditMateriality({
        engagementId: activeEngagementId,
        metricCode: audCode,
        metricName: audName,
        benchmarkBaseValue: base,
        planningMaterialityPct: planPct,
        planningMaterialityAbsolute: Number(((base * planPct) / 100).toFixed(4)),
        performanceMaterialityPct: perfPct,
        performanceMaterialityAbsolute: Number(((base * perfPct) / 100).toFixed(4)),
        clearlyTrivialThresholdPct: trivPct,
        clearlyTrivialAbsolute: Number(((base * trivPct) / 100).toFixed(4)),
        unit: audUnit,
        qualitativeFactors: audQualitative,
        approvedBy: activeActor,
      });
      setAudDialogOpen(false);
      setFeedback(
        `Saved Audit Materiality benchmark for ${saved.metricCode} (Planning=${saved.planningMaterialityAbsolute} ${saved.unit}).`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save audit materiality.');
    }
  };

  const classificationChipColor = (
    c: string
  ): 'error' | 'warning' | 'info' | 'default' => {
    if (c === 'Double Material') return 'error';
    if (c === 'Financially Material Only') return 'warning';
    if (c === 'Impact Material Only') return 'info';
    return 'default';
  };

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
            Materiality Assessment Workbench
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Distinct Financial Materiality, Impact Materiality (Actual vs Potential), Double-Materiality Matrix &amp; Metric-Specific Audit Materiality
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => {
              setFormError(null);
              setFinDialogOpen(true);
            }}
          >
            Assess Financial Materiality
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => {
              setFormError(null);
              setImpDialogOpen(true);
            }}
          >
            Assess Impact Materiality
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<BalanceOutlinedIcon />}
            onClick={() => {
              setFormError(null);
              setAudDialogOpen(true);
            }}
          >
            Add Audit Materiality Benchmark
          </Button>
        </Box>
      </Box>

      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2.5 }}>
        <strong>Analytical Methodology Guardrails:</strong> (1) Double-materiality scores and thresholds are configurable internal analytical indicators. (2) For <strong>Actual</strong> impacts, Impact Materiality is evaluated strictly on Severity <code>(Scale + Scope + Irremediability) / 3</code> with <code>likelihood = null</code>; likelihood is applied only to <strong>Potential</strong> impacts. (3) Metric-specific <strong>Audit Materiality</strong> (Planning, Performance, and Clearly Trivial thresholds) is maintained independently from topic-level financial/impact materiality.
      </Alert>

      {feedback && (
        <Alert severity="success" onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}

      {/* Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                DOUBLE MATERIAL TOPICS
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {doubleMaterialityMatrix.filter((r) => r.classification === 'Double Material').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Both Financially &amp; Impact Material
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                SINGLE-DIMENSION MATERIAL
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {
                  doubleMaterialityMatrix.filter(
                    (r) =>
                      r.classification === 'Financially Material Only' ||
                      r.classification === 'Impact Material Only'
                  ).length
                }
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Financial-Only or Impact-Only Topics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                ACTUAL vs POTENTIAL IMPACTS
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {engImpact.filter((i) => i.impactType === 'Actual').length} /{' '}
                {engImpact.filter((i) => i.impactType === 'Potential').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Actual (Likelihood=null) vs Potential
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                AUDIT MATERIALITY BENCHMARKS
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {engAuditMat.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Quantitative Metric Tolerance Thresholds
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`Double-Materiality Matrix (${doubleMaterialityMatrix.length})`} />
        <Tab label={`Financial Materiality (${engFinancial.length})`} />
        <Tab label={`Impact Materiality (${engImpact.length})`} />
        <Tab label={`Audit Materiality Thresholds (${engAuditMat.length})`} />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Double-Materiality Matrix (Internal Analytical Indicator)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  X-Axis: Impact Materiality Score (1–5) • Y-Axis: Financial Materiality Score (1–25)
                </Typography>
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="impactScore"
                        name="Impact Score"
                        domain={[0, 5]}
                        label={{ value: 'Impact Materiality (1-5)', position: 'bottom', offset: 0 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="financialScore"
                        name="Financial Score"
                        domain={[0, 25]}
                        label={{
                          value: 'Financial Score (1-25)',
                          angle: -90,
                          position: 'insideLeft',
                        }}
                      />
                      <ZAxis range={[90, 90]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <ReferenceLine x={3.5} stroke="#087F8C" strokeDasharray="4 4" />
                      <ReferenceLine y={12} stroke="#ED6C02" strokeDasharray="4 4" />
                      <Scatter
                        name="ESG Topics"
                        data={scatterData}
                        fill="#123047"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Accessible Tabular Double-Materiality Classification Summary
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>ESG Topic</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Pillar</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Financial Score</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Impact Score</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Classification</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {doubleMaterialityMatrix.map((row) => (
                        <TableRow key={row.esgTopic}>
                          <TableCell sx={{ fontWeight: 600 }}>{row.esgTopic}</TableCell>
                          <TableCell>{row.pillar}</TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {row.financialScore ?? 'N/A'} (Thr: {row.financialThreshold ?? 12})
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {row.impactScore ?? 'N/A'} [{row.impactType ?? 'N/A'}]
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={classificationChipColor(row.classification)}
                              label={row.classification}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ESG Topic</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pillar</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Horizon</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Effect Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mag × Lik = Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Threshold</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Conclusion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {engFinancial.map((f) => (
                <TableRow key={f.assessmentId}>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {f.assessmentId}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{f.esgTopic}</TableCell>
                  <TableCell>{f.pillar}</TableCell>
                  <TableCell>{f.timeHorizon}</TableCell>
                  <TableCell>{f.financialEffectType}</TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {f.magnitudeScore} × {f.likelihoodScore} = {f.financialMaterialityScore}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {f.materialityThreshold}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={f.isFinanciallyMaterial ? 'warning' : 'default'}
                      label={f.isFinanciallyMaterial ? 'Financially Material' : 'Below Threshold'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 2 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ESG Topic</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Impact Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scale / Scope / Irremediable</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Likelihood</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Impact Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Conclusion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {engImpact.map((i) => (
                <TableRow key={i.impactAssessmentId}>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {i.impactAssessmentId}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{i.esgTopic}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={i.impactType === 'Actual' ? 'primary' : 'secondary'}
                      label={`${i.impactType} (${i.polarity})`}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {i.scaleScore} / {i.scopeScore} / {i.irremediableCharacterScore}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {i.severityScore}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {i.likelihoodScore === null ? 'NULL (Actual Impact)' : i.likelihoodScore}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {i.impactMaterialityScore} (Thr: {i.impactThreshold})
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={i.isImpactMaterial ? 'info' : 'default'}
                      label={i.isImpactMaterial ? 'Impact Material' : 'Below Threshold'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 3 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Metric Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Metric Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Benchmark Base</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Planning Materiality</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Performance Materiality</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Clearly Trivial Threshold</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Qualitative Factors</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {engAuditMat.map((am) => (
                <TableRow key={am.auditMaterialityId}>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {am.metricCode}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{am.metricName}</TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {am.benchmarkBaseValue.toLocaleString()} {am.unit}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {am.planningMaterialityAbsolute} {am.unit} ({am.planningMaterialityPct}%)
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {am.performanceMaterialityAbsolute} {am.unit} ({am.performanceMaterialityPct}%)
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {am.clearlyTrivialAbsolute} {am.unit} ({am.clearlyTrivialThresholdPct}%)
                  </TableCell>
                  <TableCell>{am.qualitativeFactors}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog: Financial Materiality */}
      <Dialog
        open={finDialogOpen}
        onClose={() => setFinDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assess Financial Materiality (Outside-In Enterprise Value Effect)</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="ESG Topic"
                value={finTopic}
                onChange={(e) => setFinTopic(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Pillar</InputLabel>
                <Select
                  label="Pillar"
                  value={finPillar}
                  onChange={(e) => setFinPillar(e.target.value as ESGPillar)}
                >
                  <MenuItem value="Environmental">Environmental</MenuItem>
                  <MenuItem value="Social">Social</MenuItem>
                  <MenuItem value="Governance">Governance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Horizon</InputLabel>
                <Select
                  label="Time Horizon"
                  value={finHorizon}
                  onChange={(e) => setFinHorizon(e.target.value as MaterialityTimeHorizon)}
                >
                  <MenuItem value="Short">Short</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Long">Long</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Financial Effect</InputLabel>
                <Select
                  label="Financial Effect"
                  value={finEffectType}
                  onChange={(e) => setFinEffectType(e.target.value as FinancialEffectType)}
                >
                  <MenuItem value="Revenue">Revenue</MenuItem>
                  <MenuItem value="Cost">Cost</MenuItem>
                  <MenuItem value="Capital Access">Capital Access</MenuItem>
                  <MenuItem value="Asset Impairment">Asset Impairment</MenuItem>
                  <MenuItem value="Regulatory Penalty">Regulatory Penalty</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Magnitude (1-5)"
                value={finMagnitude}
                onChange={(e) => setFinMagnitude(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Likelihood (1-5)"
                value={finLikelihood}
                onChange={(e) => setFinLikelihood(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Threshold (1-25)"
                value={finThreshold}
                onChange={(e) => setFinThreshold(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Financial Materiality Rationale"
                value={finRationale}
                onChange={(e) => setFinRationale(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveFinancial()}>
            Save Financial Materiality
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Impact Materiality */}
      <Dialog
        open={impDialogOpen}
        onClose={() => setImpDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assess Impact Materiality (Inside-Out Environmental &amp; Social Impact)</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="ESG Topic"
                value={impTopic}
                onChange={(e) => setImpTopic(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Impact Type</InputLabel>
                <Select
                  label="Impact Type"
                  value={impType}
                  onChange={(e) => setImpType(e.target.value as ImpactType)}
                >
                  <MenuItem value="Actual">Actual Impact (Likelihood = NULL)</MenuItem>
                  <MenuItem value="Potential">Potential Impact (Uses Likelihood 1-5)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Polarity</InputLabel>
                <Select
                  label="Polarity"
                  value={impPolarity}
                  onChange={(e) => setImpPolarity(e.target.value as ImpactPolarity)}
                >
                  <MenuItem value="Negative">Negative</MenuItem>
                  <MenuItem value="Positive">Positive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Scale (1-5)"
                value={impScale}
                onChange={(e) => setImpScale(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Scope (1-5)"
                value={impScope}
                onChange={(e) => setImpScope(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Irremediable (1-5)"
                value={impIrremediable}
                onChange={(e) => setImpIrremediable(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                disabled={impType === 'Actual'}
                label={
                  impType === 'Actual'
                    ? 'Likelihood (Disabled for Actual Impacts)'
                    : 'Likelihood Score (1-5)'
                }
                value={impType === 'Actual' ? '' : impLikelihood}
                onChange={(e) => setImpLikelihood(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Impact Threshold (1-5)"
                value={impThreshold}
                onChange={(e) => setImpThreshold(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Impact Materiality Rationale"
                value={impRationale}
                onChange={(e) => setImpRationale(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveImpact()}>
            Save Impact Materiality
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Audit Materiality */}
      <Dialog
        open={audDialogOpen}
        onClose={() => setAudDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Metric-Specific Audit Materiality Benchmark</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                size="small"
                label="Metric Code"
                value={audCode}
                onChange={(e) => setAudCode(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                fullWidth
                size="small"
                label="Metric Name"
                value={audName}
                onChange={(e) => setAudName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Benchmark Base Value"
                value={audBase}
                onChange={(e) => setAudBase(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Unit (e.g. tCO2e, m3)"
                value={audUnit}
                onChange={(e) => setAudUnit(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Planning Mat (%)"
                value={audPlanPct}
                onChange={(e) => setAudPlanPct(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Performance Mat (%)"
                value={audPerfPct}
                onChange={(e) => setAudPerfPct(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Clearly Trivial (%)"
                value={audTrivialPct}
                onChange={(e) => setAudTrivialPct(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Qualitative Factors & Haircut Rationale"
                value={audQualitative}
                onChange={(e) => setAudQualitative(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAudDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveAuditMat()}>
            Save Audit Materiality Benchmark
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
