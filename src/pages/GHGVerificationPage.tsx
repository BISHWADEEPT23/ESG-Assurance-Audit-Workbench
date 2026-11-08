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
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  EmissionActivityRecord,
  GHGActivityType,
  GHGScope,
  GHGRecalculationResult,
  Scope3Category,
} from '../types/domain';
import { summarizeGhgInventory } from '../services/ghgEngine';

const SCOPES: GHGScope[] = [
  'Scope 1',
  'Scope 2 Location-Based',
  'Scope 2 Market-Based',
  'Scope 3',
];

const ACTIVITY_TYPES: GHGActivityType[] = [
  'Stationary Combustion',
  'Mobile Combustion',
  'Fugitive Emissions',
  'Process Emissions',
  'Grid Electricity (Location-Based)',
  'Contractual / Residual Electricity (Market-Based)',
  'Activity-Based Physical',
  'Spend-Based Economic',
];

const SCOPE3_CATEGORIES: Scope3Category[] = [
  'Category 1: Purchased Goods and Services',
  'Category 3: Fuel- and Energy-Related Activities',
  'Category 4: Upstream Transportation and Distribution',
  'Category 6: Business Travel',
  'Category 7: Employee Commuting',
];

export const GHGVerificationPage: React.FC = () => {
  const {
    engagements,
    facilities,
    assertions,
    evidence,
    emissionActivities,
    emissionFactors,
    ghgRecalculations,
    filters,
    saveEmissionActivity,
    runGhgShadowRecalculation,
  } = useWorkbench();

  const activeEngagementId =
    filters.engagementId !== 'ALL'
      ? filters.engagementId
      : engagements[1]?.engagementId ?? 'ENG-2025-002';

  const activeReportingYear =
    filters.reportingYear !== 'ALL'
      ? filters.reportingYear
      : engagements.find((e) => e.engagementId === activeEngagementId)?.reportingYear ?? 'FY 2025';

  const [tabIndex, setTabIndex] = useState(0);
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [selectedFactorMap, setSelectedFactorMap] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [actDraft, setActDraft] = useState<{
    facilityId: string;
    scope: GHGScope;
    scope3Category: Scope3Category | '';
    activityType: GHGActivityType;
    activityQuantity: number;
    activityUnit: string;
    valueStatus: 'Reported' | 'Estimated' | 'Unavailable';
    spendCurrency: string;
    currencyConversionRate: number;
    priceYearDeflator: number;
    contractualInstrumentStatus:
      | 'Eligible GoO / REC Verified'
      | 'Residual Mix Applied'
      | 'Instrument Ineligible / Unverified'
      | 'Factor Unavailable';
    calculationMethod: string;
    sourceReference: string;
    reportedEmissions: number;
    linkedAssertionId: string;
    evidenceIds: string[];
  }>({
    facilityId: '',
    scope: 'Scope 1',
    scope3Category: '',
    activityType: 'Stationary Combustion',
    activityQuantity: 1000,
    activityUnit: 'm3',
    valueStatus: 'Reported',
    spendCurrency: 'USD',
    currencyConversionRate: 1,
    priceYearDeflator: 1,
    contractualInstrumentStatus: 'Eligible GoO / REC Verified',
    calculationMethod: 'Activity-Based Physical',
    sourceReference: 'Utility Billing Ledger Q4',
    reportedEmissions: 2.02,
    linkedAssertionId: '',
    evidenceIds: [],
  });

  const engagementActivities = useMemo(
    () =>
      emissionActivities.filter(
        (a) =>
          (filters.engagementId === 'ALL' || a.engagementId === filters.engagementId) &&
          (filters.reportingYear === 'ALL' || a.reportingYear === filters.reportingYear)
      ),
    [emissionActivities, filters.engagementId, filters.reportingYear]
  );

  const filteredActivities = useMemo(
    () =>
      engagementActivities.filter((a) => scopeFilter === 'ALL' || a.scope === scopeFilter),
    [engagementActivities, scopeFilter]
  );

  const engagementAssertions = useMemo(
    () => assertions.filter((a) => a.engagementId === activeEngagementId),
    [assertions, activeEngagementId]
  );

  const recalculationByActivityId = useMemo(() => {
    const map = new Map<string, GHGRecalculationResult>();
    for (const r of ghgRecalculations) {
      map.set(r.activityId, r);
    }
    return map;
  }, [ghgRecalculations]);

  const engagementRecalculations = useMemo(() => {
    const actIds = new Set(engagementActivities.map((a) => a.activityId));
    return ghgRecalculations.filter((r) => actIds.has(r.activityId));
  }, [ghgRecalculations, engagementActivities]);

  const inventorySummary = useMemo(
    () => summarizeGhgInventory(engagementActivities, engagementRecalculations),
    [engagementActivities, engagementRecalculations]
  );

  const handleRunSingleRecalc = async (act: EmissionActivityRecord) => {
    const factorId = selectedFactorMap[act.activityId] || emissionFactors[0]?.emissionFactorId;
    if (!factorId) {
      setFeedback({ severity: 'error', message: 'Please select an Emission Factor first.' });
      return;
    }
    try {
      const res = await runGhgShadowRecalculation(act.activityId, factorId);
      setFeedback({
        severity: res.varianceStatus === 'Within Tolerance' ? 'success' : 'warning',
        message: `Shadow recalculation completed for ${act.activityId}: Calculated ${res.calculatedEmissions.toFixed(4)} tCO2e vs Reported ${res.reportedEmissions.toFixed(4)} tCO2e (${res.varianceStatus}).`,
      });
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Recalculation failed.',
      });
    }
  };

  const handleRunAllRecalculations = async () => {
    let count = 0;
    for (const act of engagementActivities) {
      const existing = recalculationByActivityId.get(act.activityId);
      const factorId =
        selectedFactorMap[act.activityId] ||
        existing?.emissionFactorId ||
        emissionFactors[0]?.emissionFactorId;
      if (factorId) {
        try {
          await runGhgShadowRecalculation(act.activityId, factorId);
          count++;
        } catch {
          // Skip records blocked by unavailable quantities or incompatible units
        }
      }
    }
    setFeedback({
      severity: 'success',
      message: `Executed deterministic GHG shadow recalculation across ${count} activity records.`,
    });
  };

  const handleSaveActivity = async () => {
    if (!actDraft.sourceReference.trim()) {
      setFeedback({ severity: 'error', message: 'Source reference is required.' });
      return;
    }
    const newRecord: EmissionActivityRecord = {
      activityId: `ACT-${Date.now()}`,
      engagementId: activeEngagementId,
      facilityId: actDraft.facilityId || facilities[0]?.facilityId || 'FAC-001',
      reportingYear: activeReportingYear,
      scope: actDraft.scope,
      scope3Category: actDraft.scope === 'Scope 3' && actDraft.scope3Category ? actDraft.scope3Category : null,
      activityType: actDraft.activityType,
      activityQuantity: actDraft.valueStatus === 'Unavailable' ? null : Number(actDraft.activityQuantity),
      activityUnit: actDraft.activityUnit,
      valueStatus: actDraft.valueStatus,
      spendCurrency: actDraft.activityType === 'Spend-Based Economic' ? actDraft.spendCurrency : null,
      currencyConversionRate:
        actDraft.activityType === 'Spend-Based Economic' ? Number(actDraft.currencyConversionRate) : null,
      priceYearDeflator:
        actDraft.activityType === 'Spend-Based Economic' ? Number(actDraft.priceYearDeflator) : null,
      contractualInstrumentStatus:
        actDraft.scope === 'Scope 2 Market-Based' ? actDraft.contractualInstrumentStatus : null,
      calculationMethod: actDraft.calculationMethod,
      sourceReference: actDraft.sourceReference,
      reportedEmissions: Number(actDraft.reportedEmissions),
      reportedEmissionsUnit: 'tCO2e',
      linkedAssertionId: actDraft.linkedAssertionId || engagementAssertions[0]?.assertionId || 'AST-ASN-001',
      evidenceIds: actDraft.evidenceIds.length > 0 ? actDraft.evidenceIds : [evidence[0]?.evidenceId ?? 'EVD-001'],
    };

    const matchingFactor =
      emissionFactors.find((ef) => ef.applicableYear === activeReportingYear) ||
      emissionFactors[0];

    try {
      await saveEmissionActivity(newRecord, matchingFactor.emissionFactorId);
      setDialogOpen(false);
      setFeedback({
        severity: 'success',
        message: `Added GHG Activity Record ${newRecord.activityId} and executed shadow recalculation.`,
      });
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Failed to save activity record.',
      });
    }
  };

  const activityColumns: GridColDef<EmissionActivityRecord>[] = [
    { field: 'activityId', headerName: 'Activity ID', width: 125 },
    { field: 'scope', headerName: 'GHG Scope', width: 175 },
    { field: 'activityType', headerName: 'Activity Type', width: 185 },
    {
      field: 'activityQuantity',
      headerName: 'Activity Data',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {params.row.activityQuantity !== null
            ? `${params.row.activityQuantity.toLocaleString()} ${params.row.activityUnit}`
            : 'UNAVAILABLE'}
        </Typography>
      ),
    },
    {
      field: 'valueStatus',
      headerName: 'Data Status',
      width: 125,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={
            params.value === 'Reported'
              ? 'success'
              : params.value === 'Estimated'
                ? 'warning'
                : 'error'
          }
        />
      ),
    },
    {
      field: 'reportedEmissions',
      headerName: 'Reported (tCO2e)',
      width: 145,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.row.reportedEmissions.toFixed(3)}
        </Typography>
      ),
    },
    {
      field: 'factorSelector',
      headerName: 'Emission Factor (Versioned)',
      width: 250,
      sortable: false,
      renderCell: (params) => {
        const existingRecalc = recalculationByActivityId.get(params.row.activityId);
        const currentFactorId =
          selectedFactorMap[params.row.activityId] ||
          existingRecalc?.emissionFactorId ||
          emissionFactors[0]?.emissionFactorId ||
          '';
        return (
          <Select
            size="small"
            fullWidth
            value={currentFactorId}
            onChange={(e) =>
              setSelectedFactorMap((prev) => ({
                ...prev,
                [params.row.activityId]: e.target.value,
              }))
            }
            sx={{ fontSize: '0.78rem' }}
          >
            {emissionFactors.map((ef) => (
              <MenuItem key={ef.emissionFactorId} value={ef.emissionFactorId}>
                {ef.emissionFactorId} — {ef.factorName} ({ef.gwpBasis})
              </MenuItem>
            ))}
          </Select>
        );
      },
    },
    {
      field: 'shadowResult',
      headerName: 'Shadow Recalc (tCO2e)',
      width: 165,
      sortable: false,
      renderCell: (params) => {
        const recalc = recalculationByActivityId.get(params.row.activityId);
        if (!recalc) {
          return <Chip size="small" label="Not Run" variant="outlined" />;
        }
        return (
          <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            {recalc.calculatedEmissions.toFixed(4)}
          </Typography>
        );
      },
    },
    {
      field: 'varianceStatus',
      headerName: 'Reconciliation Status',
      width: 200,
      sortable: false,
      renderCell: (params) => {
        const recalc = recalculationByActivityId.get(params.row.activityId);
        if (!recalc) return <Typography variant="caption" color="text.secondary">—</Typography>;
        return (
          <Chip
            size="small"
            label={`${recalc.varianceStatus}${
              recalc.percentageVariance !== null ? ` (${recalc.percentageVariance.toFixed(2)}%)` : ''
            }`}
            color={
              recalc.varianceStatus === 'Within Tolerance'
                ? 'success'
                : recalc.varianceStatus === 'Review Required'
                  ? 'warning'
                  : 'error'
            }
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Execute',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrowOutlinedIcon />}
          onClick={() => void handleRunSingleRecalc(params.row)}
        >
          Recalc
        </Button>
      ),
    },
  ];

  const factorColumns: GridColDef[] = [
    { field: 'emissionFactorId', headerName: 'Factor ID', width: 120 },
    { field: 'factorName', headerName: 'Factor Name', flex: 1, minWidth: 220 },
    { field: 'factorSource', headerName: 'Authority / Source', width: 150 },
    { field: 'factorVersion', headerName: 'Version', width: 110 },
    { field: 'geography', headerName: 'Geography', width: 120 },
    { field: 'gas', headerName: 'Gas', width: 95 },
    {
      field: 'factorValue',
      headerName: 'Factor Value',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {params.row.factorValue} {params.row.numeratorUnit}/{params.row.denominatorUnit}
        </Typography>
      ),
    },
    { field: 'gwpBasis', headerName: 'GWP Basis', width: 140 },
    { field: 'gwpValue', headerName: 'GWP100', width: 95 },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            GHG Verification &amp; Shadow Recalculation Engine
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deterministic ISO 14064-3 / GHG Protocol recalculation across Scope 1, Scope 2 (separate Location-Based &amp; Market-Based totals), and Scope 3 categories
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add Activity Record
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ScienceOutlinedIcon />}
            onClick={() => void handleRunAllRecalculations()}
          >
            Execute Shadow Recalculation Batch
          </Button>
        </Box>
      </Box>

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}

      {inventorySummary.mixedGwpWarning && (
        <Alert severity="warning" icon={<WarningAmberOutlinedIcon />} sx={{ mb: 2 }}>
          <strong>Mixed GWP Assessment Basis Warning:</strong> {inventorySummary.mixedGwpWarning}
        </Alert>
      )}

      {/* Separate Scope 1, Scope 2 Location, Scope 2 Market, Scope 3 Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                SCOPE 1 DIRECT EMISSIONS (tCO2e)
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, mt: 0.5 }}>
                {inventorySummary.scope1TotalRecalculated.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reported: {inventorySummary.scope1TotalReported.toFixed(2)} tCO2e
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                SCOPE 2 LOCATION-BASED (tCO2e)
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, mt: 0.5 }}>
                {inventorySummary.scope2LocationRecalculated.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reported: {inventorySummary.scope2LocationReported.toFixed(2)} tCO2e (Never summed with Market)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                SCOPE 2 MARKET-BASED (tCO2e)
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, mt: 0.5 }}>
                {inventorySummary.scope2MarketRecalculated.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reported: {inventorySummary.scope2MarketReported.toFixed(2)} tCO2e (Instrument verified)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                SCOPE 3 VALUE CHAIN (tCO2e)
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, mt: 0.5 }}>
                {inventorySummary.scope3TotalRecalculated.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reported: {inventorySummary.scope3TotalReported.toFixed(2)} tCO2e
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label={`Activity Records & Shadow Recalculation (${engagementActivities.length})`} />
          <Tab label={`Reconciliation Diagnostics (${engagementRecalculations.length})`} />
          <Tab label={`Versioned Emission Factor Registry (${emissionFactors.length})`} />
        </Tabs>

        <CardContent>
          {tabIndex === 0 && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel>Filter by GHG Scope</InputLabel>
                  <Select
                    label="Filter by GHG Scope"
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Scopes ({engagementActivities.length})</MenuItem>
                    {SCOPES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  Formula: Normalized Activity × Emission Factor (to kg gas) × GWP100 ÷ 1,000 = tCO2e. Zero-tolerance against silent substitution of unavailable values.
                </Typography>
              </Box>

              <Box sx={{ height: 520, width: '100%' }}>
                <DataGrid
                  rows={filteredActivities}
                  columns={activityColumns}
                  getRowId={(r) => r.activityId}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                />
              </Box>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {engagementRecalculations.map((rec) => {
                const act = engagementActivities.find((a) => a.activityId === rec.activityId);
                return (
                  <Card key={rec.recalculationId} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                            {rec.recalculationId} — Activity {rec.activityId}
                          </Typography>
                          <Chip
                            size="small"
                            icon={
                              rec.varianceStatus === 'Within Tolerance' ? (
                                <CheckCircleOutlinedIcon />
                              ) : (
                                <WarningAmberOutlinedIcon />
                              )
                            }
                            label={rec.varianceStatus}
                            color={
                              rec.varianceStatus === 'Within Tolerance'
                                ? 'success'
                                : rec.varianceStatus === 'Review Required'
                                  ? 'warning'
                                  : 'error'
                            }
                          />
                          <Chip size="small" variant="outlined" label={`GWP: ${rec.gwpBasis} (${rec.gwpApplied})`} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {act?.scope} • {act?.activityType} • Source: {act?.sourceReference}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                        <Typography variant="body2">
                          Reported: <strong>{rec.reportedEmissions.toFixed(4)} tCO2e</strong> | Shadow Recalc:{' '}
                          <strong>{rec.calculatedEmissions.toFixed(4)} tCO2e</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Abs Variance: {rec.absoluteVariance.toFixed(4)} tCO2e | Pct Variance:{' '}
                          {rec.percentageVariance !== null
                            ? `${rec.percentageVariance.toFixed(2)}%`
                            : 'null (Reported = 0)'}
                        </Typography>
                      </Box>
                    </Box>
                    {rec.diagnosticFlags.length > 0 && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {rec.diagnosticFlags.map((flag, i) => (
                            <Typography key={i} variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                              • {flag}
                            </Typography>
                          ))}
                        </Box>
                      </>
                    )}
                  </Card>
                );
              })}
            </Box>
          )}

          {tabIndex === 2 && (
            <Box sx={{ height: 480, width: '100%' }}>
              <DataGrid
                rows={emissionFactors}
                columns={factorColumns}
                getRowId={(r) => r.emissionFactorId}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25]}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Activity Record Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add GHG Activity Record</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>GHG Scope</InputLabel>
                <Select
                  label="GHG Scope"
                  value={actDraft.scope}
                  onChange={(e) => setActDraft({ ...actDraft, scope: e.target.value as GHGScope })}
                >
                  {SCOPES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Activity Type</InputLabel>
                <Select
                  label="Activity Type"
                  value={actDraft.activityType}
                  onChange={(e) => setActDraft({ ...actDraft, activityType: e.target.value as GHGActivityType })}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {actDraft.scope === 'Scope 3' && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Scope 3 Category</InputLabel>
                  <Select
                    label="Scope 3 Category"
                    value={actDraft.scope3Category}
                    onChange={(e) =>
                      setActDraft({ ...actDraft, scope3Category: e.target.value as Scope3Category })
                    }
                  >
                    {SCOPE3_CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Activity Quantity"
                type="number"
                size="small"
                fullWidth
                value={actDraft.activityQuantity}
                onChange={(e) => setActDraft({ ...actDraft, activityQuantity: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Activity Unit (e.g., kWh, m3, Liters, USD)"
                size="small"
                fullWidth
                value={actDraft.activityUnit}
                onChange={(e) => setActDraft({ ...actDraft, activityUnit: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Value Status</InputLabel>
                <Select
                  label="Value Status"
                  value={actDraft.valueStatus}
                  onChange={(e) =>
                    setActDraft({
                      ...actDraft,
                      valueStatus: e.target.value as 'Reported' | 'Estimated' | 'Unavailable',
                    })
                  }
                >
                  <MenuItem value="Reported">Reported</MenuItem>
                  <MenuItem value="Estimated">Estimated</MenuItem>
                  <MenuItem value="Unavailable">Unavailable (Test Guardrail)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Calculation Method"
                size="small"
                fullWidth
                value={actDraft.calculationMethod}
                onChange={(e) =>
                  setActDraft({ ...actDraft, calculationMethod: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Reported Emissions (tCO2e)"
                type="number"
                size="small"
                fullWidth
                value={actDraft.reportedEmissions}
                onChange={(e) => setActDraft({ ...actDraft, reportedEmissions: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Source Reference / Utility Ledger ID"
                size="small"
                fullWidth
                value={actDraft.sourceReference}
                onChange={(e) => setActDraft({ ...actDraft, sourceReference: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveActivity()}>
            Save Activity Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
