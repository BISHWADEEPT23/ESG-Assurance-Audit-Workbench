import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  AddOutlined,
  ArchiveOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  AssertionReviewStatus,
  AssertionType,
  ESGAssertion,
  ESGPillar,
  ReportingYear,
  ValueBasis,
} from '../types/domain';
import { ESGAssertionInputSchema } from '../validation/schemas';
import { generateAssertionsCsv } from '../utils/security';

export const ESGAssertionsPage: React.FC = () => {
  const {
    engagements,
    facilities,
    assertions,
    evidence,
    saveAssertion,
    archiveAssertion,
  } = useWorkbench();

  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('ALL');
  const [basisFilter, setBasisFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssertion, setEditingAssertion] = useState<ESGAssertion | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [engagementId, setEngagementId] = useState('ENG-2025-002');
  const [metricCode, setMetricCode] = useState('GHG-SC1-01');
  const [metricName, setMetricName] = useState('Direct Scope 1 Stationary Combustion Emissions');
  const [pillar, setPillar] = useState<ESGPillar>('Environmental');
  const [reportingYear, setReportingYear] = useState<ReportingYear>('FY 2025');
  const [facilityId, setFacilityId] = useState('FAC-MUN-01');
  const [valueBasis, setValueBasis] = useState<ValueBasis>('Reported');
  const [reportedValueStr, setReportedValueStr] = useState<string>('1250.5');
  const [unit, setUnit] = useState('tCO2e');
  const [assertionType, setAssertionType] = useState<AssertionType>('Accuracy');
  const [reportingBoundary, setReportingBoundary] = useState(
    'Operational Control - Facility Complete'
  );
  const [dataSource, setDataSource] = useState('SAP EHS Utility Meter Ledger');
  const [calculationMethod, setCalculationMethod] = useState(
    'Activity Data x DEFRA 2025 Emission Factor'
  );
  const [reviewStatus, setReviewStatus] = useState<AssertionReviewStatus>('Unreviewed');
  const [requiresEvidence, setRequiresEvidence] = useState<boolean>(true);
  const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>([]);

  const engagementsMap = useMemo(
    () => new Map(engagements.map((e) => [e.engagementId, e])),
    [engagements]
  );
  const facilitiesMap = useMemo(
    () => new Map(facilities.map((f) => [f.facilityId, f])),
    [facilities]
  );

  const openCreateDialog = () => {
    setEditingAssertion(null);
    const defaultEng = engagements[1] ?? engagements[0];
    setEngagementId(defaultEng?.engagementId ?? 'ENG-2025-002');
    setReportingYear(defaultEng?.reportingYear ?? 'FY 2025');
    setFacilityId(facilities[0]?.facilityId ?? 'FAC-MUN-01');
    setMetricCode('GHG-SC1-01');
    setMetricName('Direct Scope 1 Stationary Combustion Emissions');
    setPillar('Environmental');
    setValueBasis('Reported');
    setReportedValueStr('1400');
    setUnit('tCO2e');
    setAssertionType('Accuracy');
    setReportingBoundary('Operational Control - Facility Complete');
    setDataSource('SAP EHS Utility Meter Ledger');
    setCalculationMethod('Activity Data x DEFRA 2025 Emission Factor');
    setReviewStatus('Unreviewed');
    setRequiresEvidence(true);
    setLinkedEvidenceIds([]);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (asn: ESGAssertion) => {
    setEditingAssertion(asn);
    setEngagementId(asn.engagementId);
    setMetricCode(asn.metricCode);
    setMetricName(asn.metricName);
    setPillar(asn.pillar);
    setReportingYear(asn.reportingYear);
    setFacilityId(asn.facilityId);
    setValueBasis(asn.valueBasis);
    setReportedValueStr(asn.reportedValue === null ? '' : String(asn.reportedValue));
    setUnit(asn.unit);
    setAssertionType(asn.assertionType);
    setReportingBoundary(asn.reportingBoundary);
    setDataSource(asn.dataSource);
    setCalculationMethod(asn.calculationMethod);
    setReviewStatus(asn.reviewStatus);
    setRequiresEvidence(asn.requiresEvidence);
    setLinkedEvidenceIds(asn.linkedEvidenceIds);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleValueBasisChange = (nextBasis: ValueBasis) => {
    setValueBasis(nextBasis);
    if (nextBasis === 'Missing' || nextBasis === 'Not Applicable') {
      // Missing & N/A values MUST remain null; never auto-convert to zero!
      setReportedValueStr('');
    } else if (nextBasis === 'Verified Zero') {
      setReportedValueStr('0');
    }
  };

  const handleSave = async () => {
    setFormError(null);

    let parsedNumber: number | null = null;
    if (reportedValueStr.trim() !== '') {
      const n = Number(reportedValueStr);
      if (Number.isNaN(n)) {
        setFormError('Reported value must be a valid number or empty (null) for Missing/N/A.');
        return;
      }
      parsedNumber = n;
    }

    const candidate = {
      engagementId,
      metricCode,
      metricName,
      pillar,
      reportingYear,
      facilityId,
      reportedValue: parsedNumber,
      valueBasis,
      unit,
      assertionType,
      reportingBoundary,
      dataSource,
      calculationMethod,
      reviewStatus,
      requiresEvidence,
      linkedEvidenceIds,
    };

    const parsed = ESGAssertionInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }

    await saveAssertion(parsed.data, editingAssertion?.assertionId);
    setDialogOpen(false);
  };

  const filteredAssertions = useMemo(() => {
    return assertions.filter((a) => {
      if (statusFilter === 'ALL' && a.reviewStatus === 'Archived') return false;
      if (statusFilter !== 'ALL' && a.reviewStatus !== statusFilter) return false;
      if (pillarFilter !== 'ALL' && a.pillar !== pillarFilter) return false;
      if (basisFilter !== 'ALL' && a.valueBasis !== basisFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const facName = facilitiesMap.get(a.facilityId)?.facilityName.toLowerCase() ?? '';
        const matches =
          a.assertionId.toLowerCase().includes(q) ||
          a.metricCode.toLowerCase().includes(q) ||
          a.metricName.toLowerCase().includes(q) ||
          a.dataSource.toLowerCase().includes(q) ||
          facName.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [assertions, statusFilter, pillarFilter, basisFilter, searchQuery, facilitiesMap]);

  const handleExportCsv = () => {
    const csvContent = generateAssertionsCsv(filteredAssertions, engagementsMap, facilitiesMap);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asterion_esg_assertions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef<ESGAssertion>[] = [
    {
      field: 'assertionId',
      headerName: 'Assertion ID',
      width: 125,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <span className="font-mono text-xs font-semibold">{params.row.assertionId}</span>
      ),
    },
    {
      field: 'metricCode',
      headerName: 'Metric Code & Name',
      minWidth: 250,
      flex: 1,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <Box sx={{ py: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, display: 'block' }}
          >
            {params.row.metricCode} · {params.row.pillar}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.78rem' }} noWrap>
            {params.row.metricName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'facilityId',
      headerName: 'Facility',
      width: 180,
      valueGetter: (_value, row) =>
        facilitiesMap.get(row.facilityId)?.facilityName ?? row.facilityId,
    },
    {
      field: 'reportingYear',
      headerName: 'Period',
      width: 95,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <span className="font-mono text-xs">{params.row.reportingYear}</span>
      ),
    },
    {
      field: 'assertionType',
      headerName: 'Assertion',
      width: 120,
    },
    {
      field: 'reportedValue',
      headerName: 'Reported Value',
      width: 155,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => {
        const val = params.row.reportedValue;
        if (val === null) {
          return (
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">
              NULL ({params.row.valueBasis})
            </span>
          );
        }
        return (
          <span className="font-mono text-xs font-semibold tabular-nums">
            {val.toLocaleString()} {params.row.unit}
          </span>
        );
      },
    },
    {
      field: 'valueBasis',
      headerName: 'Value Basis',
      width: 135,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <span className="font-mono text-xs">{params.row.valueBasis}</span>
      ),
    },
    {
      field: 'reviewStatus',
      headerName: 'Review Status',
      width: 120,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <span className="font-mono text-xs font-semibold">{params.row.reviewStatus}</span>
      ),
    },
    {
      field: 'linkedEvidenceIds',
      headerName: 'Evidence',
      width: 105,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <span className="font-mono text-xs">
          {params.row.linkedEvidenceIds.length} linked
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ESGAssertion>) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlined fontSize="small" />}
            onClick={() => openEditDialog(params.row)}
          >
            Edit
          </Button>
          {params.row.reviewStatus !== 'Archived' && (
            <Button
              size="small"
              color="warning"
              onClick={() => void archiveAssertion(params.row.assertionId)}
              aria-label={`Archive ${params.row.assertionId}`}
            >
              <ArchiveOutlined fontSize="small" />
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5">ESG Assertions &amp; Quantitative Data Ledger</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage facility-level sustainability assertions across Environmental, Social, and
              Governance metrics. Missing values remain strictly <code>null</code> and are never
              coerced to zero.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlined />}
              onClick={handleExportCsv}
              data-testid="btn-export-csv"
            >
              Export CSV (Sanitized)
            </Button>
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={openCreateDialog}
              data-testid="btn-new-assertion"
            >
              New Assertion
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 4.5 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Assertion ID, Metric Code, Facility, or Data Source"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 4, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="asn-pillar-filter">ESG Pillar</InputLabel>
              <Select
                labelId="asn-pillar-filter"
                label="ESG Pillar"
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Pillars</MenuItem>
                <MenuItem value="Environmental">Environmental</MenuItem>
                <MenuItem value="Social">Social</MenuItem>
                <MenuItem value="Governance">Governance</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 4, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="asn-basis-filter">Value Basis</InputLabel>
              <Select
                labelId="asn-basis-filter"
                label="Value Basis"
                value={basisFilter}
                onChange={(e) => setBasisFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Value Bases</MenuItem>
                <MenuItem value="Reported">Reported</MenuItem>
                <MenuItem value="Estimated">Estimated</MenuItem>
                <MenuItem value="Verified Zero">Verified Zero</MenuItem>
                <MenuItem value="Missing">Missing (NULL)</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable (NULL)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 4, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="asn-status-filter">Review Status</InputLabel>
              <Select
                labelId="asn-status-filter"
                label="Review Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Active</MenuItem>
                <MenuItem value="Reviewed">Reviewed</MenuItem>
                <MenuItem value="In Review">In Review</MenuItem>
                <MenuItem value="Unreviewed">Unreviewed</MenuItem>
                <MenuItem value="Flagged">Flagged</MenuItem>
                <MenuItem value="Archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <DataGrid
          rows={filteredAssertions}
          columns={columns}
          getRowId={(row) => row.assertionId}
          rowHeight={52}
          pageSizeOptions={[10, 20, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Create / Edit Assertion Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAssertion
            ? `Edit ESG Assertion (${editingAssertion.assertionId})`
            : 'Create New ESG Assertion'}
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="assertion-form-error">
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-eng">Engagement</InputLabel>
                <Select
                  labelId="form-asn-eng"
                  label="Engagement"
                  value={engagementId}
                  onChange={(e) => setEngagementId(e.target.value)}
                >
                  {engagements.map((eng) => (
                    <MenuItem key={eng.engagementId} value={eng.engagementId}>
                      {eng.reportingYear} — {eng.engagementName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-fac">Facility</InputLabel>
                <Select
                  labelId="form-asn-fac"
                  label="Facility"
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                >
                  {facilities.map((fac) => (
                    <MenuItem key={fac.facilityId} value={fac.facilityId}>
                      {fac.facilityCode} — {fac.facilityName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Metric Code (e.g. GHG-SC1-01)"
                value={metricCode}
                onChange={(e) => setMetricCode(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-metric-code' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                size="small"
                label="Metric Name"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-metric-name' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-pillar">Pillar</InputLabel>
                <Select
                  labelId="form-asn-pillar"
                  label="Pillar"
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value as ESGPillar)}
                >
                  <MenuItem value="Environmental">Environmental</MenuItem>
                  <MenuItem value="Social">Social</MenuItem>
                  <MenuItem value="Governance">Governance</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-basis">Value Basis</InputLabel>
                <Select
                  labelId="form-asn-basis"
                  label="Value Basis"
                  value={valueBasis}
                  onChange={(e) => handleValueBasisChange(e.target.value as ValueBasis)}
                  inputProps={{ 'data-testid': 'select-value-basis' }}
                >
                  <MenuItem value="Reported">Reported</MenuItem>
                  <MenuItem value="Estimated">Estimated</MenuItem>
                  <MenuItem value="Verified Zero">Verified Zero (Explicit 0)</MenuItem>
                  <MenuItem value="Missing">Missing (Must Remain NULL)</MenuItem>
                  <MenuItem value="Not Applicable">Not Applicable (NULL)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label={
                  valueBasis === 'Missing' || valueBasis === 'Not Applicable'
                    ? 'Reported Value (NULL)'
                    : 'Reported Value'
                }
                disabled={valueBasis === 'Missing' || valueBasis === 'Not Applicable'}
                value={reportedValueStr}
                onChange={(e) => setReportedValueStr(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-reported-value' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Unit (e.g. tCO2e, MWh, m3, FTE)"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-unit' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-type">Assertion Type</InputLabel>
                <Select
                  labelId="form-asn-type"
                  label="Assertion Type"
                  value={assertionType}
                  onChange={(e) => setAssertionType(e.target.value as AssertionType)}
                >
                  <MenuItem value="Completeness">Completeness</MenuItem>
                  <MenuItem value="Accuracy">Accuracy</MenuItem>
                  <MenuItem value="Occurrence">Occurrence</MenuItem>
                  <MenuItem value="Cutoff">Cutoff</MenuItem>
                  <MenuItem value="Classification">Classification</MenuItem>
                  <MenuItem value="Consistency">Consistency</MenuItem>
                  <MenuItem value="Presentation">Presentation</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-year">Reporting Period</InputLabel>
                <Select
                  labelId="form-asn-year"
                  label="Reporting Period"
                  value={reportingYear}
                  onChange={(e) => setReportingYear(e.target.value as ReportingYear)}
                >
                  <MenuItem value="FY 2024">FY 2024</MenuItem>
                  <MenuItem value="FY 2025">FY 2025</MenuItem>
                  <MenuItem value="FY 2026">FY 2026</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-status">Review Status</InputLabel>
                <Select
                  labelId="form-asn-status"
                  label="Review Status"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as AssertionReviewStatus)}
                >
                  <MenuItem value="Unreviewed">Unreviewed</MenuItem>
                  <MenuItem value="In Review">In Review</MenuItem>
                  <MenuItem value="Reviewed">Reviewed</MenuItem>
                  <MenuItem value="Flagged">Flagged</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Reporting Boundary"
                value={reportingBoundary}
                onChange={(e) => setReportingBoundary(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Primary Data Source"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-data-source' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Calculation Method"
                value={calculationMethod}
                onChange={(e) => setCalculationMethod(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-calculation-method' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-asn-evidence">Linked Evidence Records</InputLabel>
                <Select
                  labelId="form-asn-evidence"
                  multiple
                  value={linkedEvidenceIds}
                  onChange={(e) =>
                    setLinkedEvidenceIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                  input={<OutlinedInput label="Linked Evidence Records" />}
                  renderValue={(selected) => `${selected.length} evidence record(s) linked`}
                >
                  {evidence.map((ev) => (
                    <MenuItem key={ev.evidenceId} value={ev.evidenceId}>
                      <Checkbox checked={linkedEvidenceIds.includes(ev.evidenceId)} />
                      <ListItemText
                        primary={`${ev.evidenceId} — ${ev.documentName}`}
                        secondary={ev.verificationStatus}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={requiresEvidence}
                    onChange={(e) => setRequiresEvidence(e.target.checked)}
                  />
                }
                label="Requires Evidence"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            data-testid="btn-save-assertion"
          >
            Save Assertion
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
