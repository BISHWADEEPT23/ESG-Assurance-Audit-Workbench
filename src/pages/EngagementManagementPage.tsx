import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  AddOutlined,
  ArchiveOutlined,
  EditOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  AssuranceEngagement,
  EngagementStatus,
  EngagementType,
  PlannedAssuranceLevel,
  ReportingYear,
} from '../types/domain';
import { AssuranceEngagementInputSchema } from '../validation/schemas';

export const EngagementManagementPage: React.FC = () => {
  const {
    organization,
    engagements,
    assertions,
    controls,
    saveEngagement,
    updateEngagementStatus,
  } = useWorkbench();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');

  // Create / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<AssuranceEngagement | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AssuranceEngagement | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields
  const [engagementName, setEngagementName] = useState('');
  const [engagementObjective, setEngagementObjective] = useState('');
  const [reportingBoundary, setReportingBoundary] = useState('');
  const [reportingYear, setReportingYear] = useState<ReportingYear>('FY 2025');
  const [engagementType, setEngagementType] = useState<EngagementType>('ESG Assurance Readiness');
  const [assuranceLevel, setAssuranceLevel] = useState<PlannedAssuranceLevel>(
    'Planned Limited Assurance Readiness'
  );
  const [engagementStatus, setEngagementStatus] = useState<EngagementStatus>('Planning');
  const [scopeDescription, setScopeDescription] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('2025-09-01');
  const [plannedEndDate, setPlannedEndDate] = useState('2026-03-31');
  const [methodologyVersion, setMethodologyVersion] = useState(
    'CSRD / ISSA 5000 Readiness Framework v2.0'
  );

  const openCreateDialog = () => {
    setEditingEngagement(null);
    setEngagementName('');
    setEngagementObjective('');
    setReportingBoundary(
      organization?.reportingBoundary ?? 'Operational Control - 5 Manufacturing Plants'
    );
    setReportingYear('FY 2026');
    setEngagementType('ESG Assurance Readiness');
    setAssuranceLevel('Planned Limited Assurance Readiness');
    setEngagementStatus('Planning');
    setScopeDescription('');
    setPlannedStartDate('2026-02-01');
    setPlannedEndDate('2026-09-30');
    setMethodologyVersion('CSRD / ISSA 5000 Readiness Framework v2.0');
    setValidationError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (eng: AssuranceEngagement) => {
    setEditingEngagement(eng);
    setEngagementName(eng.engagementName);
    setEngagementObjective(eng.engagementObjective);
    setReportingBoundary(eng.reportingBoundary);
    setReportingYear(eng.reportingYear);
    setEngagementType(eng.engagementType);
    setAssuranceLevel(eng.assuranceLevel);
    setEngagementStatus(eng.engagementStatus);
    setScopeDescription(eng.scopeDescription);
    setPlannedStartDate(eng.plannedStartDate);
    setPlannedEndDate(eng.plannedEndDate);
    setMethodologyVersion(eng.methodologyVersion);
    setValidationError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setValidationError(null);
    const candidate = {
      organizationId: organization?.organizationId ?? 'ORG-ASTERION-001',
      engagementName,
      engagementObjective,
      reportingBoundary,
      reportingYear,
      engagementType,
      assuranceLevel,
      engagementStatus,
      scopeDescription,
      plannedStartDate,
      plannedEndDate,
      methodologyVersion,
    };

    const parsed = AssuranceEngagementInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setValidationError(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }

    await saveEngagement(parsed.data, editingEngagement?.engagementId);
    setDialogOpen(false);
  };

  const filteredEngagements = useMemo(() => {
    return engagements.filter((eng) => {
      if (statusFilter !== 'ALL' && eng.engagementStatus !== statusFilter) return false;
      if (yearFilter !== 'ALL' && eng.reportingYear !== yearFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          eng.engagementId.toLowerCase().includes(q) ||
          eng.engagementName.toLowerCase().includes(q) ||
          eng.engagementType.toLowerCase().includes(q) ||
          eng.scopeDescription.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [engagements, statusFilter, yearFilter, searchQuery]);

  const columns: GridColDef<AssuranceEngagement>[] = [
    {
      field: 'engagementId',
      headerName: 'Engagement ID',
      width: 140,
      renderCell: (params: GridRenderCellParams<AssuranceEngagement>) => (
        <span className="font-mono text-xs font-semibold">{params.row.engagementId}</span>
      ),
    },
    {
      field: 'engagementName',
      headerName: 'Engagement Name',
      flex: 1,
      minWidth: 240,
    },
    {
      field: 'reportingYear',
      headerName: 'Period',
      width: 105,
      renderCell: (params: GridRenderCellParams<AssuranceEngagement>) => (
        <span className="font-mono text-xs">{params.row.reportingYear}</span>
      ),
    },
    {
      field: 'engagementType',
      headerName: 'Engagement Type',
      width: 210,
    },
    {
      field: 'assuranceLevel',
      headerName: 'Planned Assurance Attribute',
      width: 230,
    },
    {
      field: 'engagementStatus',
      headerName: 'Status',
      width: 195,
      renderCell: (params: GridRenderCellParams<AssuranceEngagement>) => (
        <span className="font-mono text-xs font-semibold">{params.row.engagementStatus}</span>
      ),
    },
    {
      field: 'plannedStartDate',
      headerName: 'Planned Dates',
      width: 195,
      renderCell: (params: GridRenderCellParams<AssuranceEngagement>) => (
        <span className="font-mono text-xs">
          {params.row.plannedStartDate} → {params.row.plannedEndDate}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 240,
      sortable: false,
      renderCell: (params: GridRenderCellParams<AssuranceEngagement>) => (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', height: '100%' }}>
          <Button
            size="small"
            variant="text"
            startIcon={<VisibilityOutlined fontSize="small" />}
            onClick={() => setSelectedDetails(params.row)}
          >
            View
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlined fontSize="small" />}
            onClick={() => openEditDialog(params.row)}
          >
            Edit
          </Button>
          {params.row.engagementStatus !== 'Archived' && (
            <Button
              size="small"
              color="warning"
              variant="text"
              startIcon={<ArchiveOutlined fontSize="small" />}
              onClick={() =>
                void updateEngagementStatus(params.row.engagementId, 'Archived')
              }
            >
              Archive
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
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5">Assurance Engagement Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Plan, scope, and manage internal ESG audit and assurance-readiness engagements for{' '}
              {organization?.organizationName ?? 'Asterion Manufacturing Ltd.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openCreateDialog}
            data-testid="btn-new-engagement"
          >
            New Engagement
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2.5 }}>
          <strong>Planned Assurance Level Notice:</strong> Assurance level is recorded strictly as a
          planned engagement attribute. Setting an engagement status to{' '}
          <code>Readiness Complete (Internal)</code> indicates internal preparation completion only
          and never implies an independent limited or reasonable assurance opinion has been issued.
        </Alert>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Search by ID, Name, Type, or Scope"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="eng-status-filter">Filter Status</InputLabel>
              <Select
                labelId="eng-status-filter"
                label="Filter Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="Planning">Planning</MenuItem>
                <MenuItem value="Fieldwork">Fieldwork</MenuItem>
                <MenuItem value="Review">Review</MenuItem>
                <MenuItem value="Readiness Complete (Internal)">
                  Readiness Complete (Internal)
                </MenuItem>
                <MenuItem value="Archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="eng-year-filter">Filter Period</InputLabel>
              <Select
                labelId="eng-year-filter"
                label="Filter Period"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Periods</MenuItem>
                <MenuItem value="FY 2024">FY 2024</MenuItem>
                <MenuItem value="FY 2025">FY 2025</MenuItem>
                <MenuItem value="FY 2026">FY 2026</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ width: '100%' }}>
          <DataGrid
            rows={filteredEngagements}
            columns={columns}
            getRowId={(row) => row.engagementId}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>

      {/* Selected Engagement Details Inspector */}
      {selectedDetails && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6">
              Engagement Dossier: {selectedDetails.engagementName} ({selectedDetails.engagementId})
            </Typography>
            <Button size="small" onClick={() => setSelectedDetails(null)}>
              Close Details
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                ENGAGEMENT OBJECTIVE
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {selectedDetails.engagementObjective}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                SCOPE DESCRIPTION
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {selectedDetails.scopeDescription}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                REPORTING BOUNDARY &amp; METHODOLOGY
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Boundary: {selectedDetails.reportingBoundary}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Methodology: {selectedDetails.methodologyVersion}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Planned Assurance Attribute: <strong>{selectedDetails.assuranceLevel}</strong>
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Linked Assertions:{' '}
                {assertions.filter((a) => a.engagementId === selectedDetails.engagementId).length} ·
                Linked Controls:{' '}
                {controls.filter((c) => c.engagementId === selectedDetails.engagementId).length}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Create / Edit Engagement Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEngagement
            ? `Edit Engagement (${editingEngagement.engagementId})`
            : 'Create New Assurance-Readiness Engagement'}
        </DialogTitle>
        <DialogContent dividers>
          {validationError && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="engagement-form-error">
              {validationError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                label="Engagement Name"
                value={engagementName}
                onChange={(e) => setEngagementName(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-engagement-name' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-eng-year">Reporting Year</InputLabel>
                <Select
                  labelId="form-eng-year"
                  label="Reporting Year"
                  value={reportingYear}
                  onChange={(e) => setReportingYear(e.target.value as ReportingYear)}
                >
                  <MenuItem value="FY 2024">FY 2024</MenuItem>
                  <MenuItem value="FY 2025">FY 2025</MenuItem>
                  <MenuItem value="FY 2026">FY 2026</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-eng-type">Engagement Type</InputLabel>
                <Select
                  labelId="form-eng-type"
                  label="Engagement Type"
                  value={engagementType}
                  onChange={(e) => setEngagementType(e.target.value as EngagementType)}
                >
                  <MenuItem value="Internal ESG Audit">Internal ESG Audit</MenuItem>
                  <MenuItem value="ESG Assurance Readiness">ESG Assurance Readiness</MenuItem>
                  <MenuItem value="GHG Inventory Verification Readiness">
                    GHG Inventory Verification Readiness
                  </MenuItem>
                  <MenuItem value="Sustainability Disclosure Controls Review">
                    Sustainability Disclosure Controls Review
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-eng-assurance">
                  Planned Assurance Level (Planning Attribute Only)
                </InputLabel>
                <Select
                  labelId="form-eng-assurance"
                  label="Planned Assurance Level (Planning Attribute Only)"
                  value={assuranceLevel}
                  onChange={(e) => setAssuranceLevel(e.target.value as PlannedAssuranceLevel)}
                >
                  <MenuItem value="Planned Limited Assurance Readiness">
                    Planned Limited Assurance Readiness
                  </MenuItem>
                  <MenuItem value="Planned Reasonable Assurance Readiness">
                    Planned Reasonable Assurance Readiness
                  </MenuItem>
                  <MenuItem value="Internal Audit Advisory Only">
                    Internal Audit Advisory Only
                  </MenuItem>
                  <MenuItem value="No External Assurance Planned">
                    No External Assurance Planned
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-eng-status">Status</InputLabel>
                <Select
                  labelId="form-eng-status"
                  label="Status"
                  value={engagementStatus}
                  onChange={(e) => setEngagementStatus(e.target.value as EngagementStatus)}
                >
                  <MenuItem value="Planning">Planning</MenuItem>
                  <MenuItem value="Fieldwork">Fieldwork</MenuItem>
                  <MenuItem value="Review">Review</MenuItem>
                  <MenuItem value="Readiness Complete (Internal)">
                    Readiness Complete (Internal)
                  </MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Planned Start Date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { 'data-testid': 'input-start-date' },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Planned End Date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { 'data-testid': 'input-end-date' },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Reporting Boundary"
                value={reportingBoundary}
                onChange={(e) => setReportingBoundary(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-reporting-boundary' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Methodology Version"
                value={methodologyVersion}
                onChange={(e) => setMethodologyVersion(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Engagement Objective"
                value={engagementObjective}
                onChange={(e) => setEngagementObjective(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-engagement-objective' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Scope Description"
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-scope-description' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            data-testid="btn-save-engagement"
          >
            Save Engagement
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
