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
import { AddOutlined, EditOutlined } from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  ControlDesignStatus,
  ControlFrequency,
  ControlOperatingStatus,
  ControlType,
  ESGPillar,
  InternalControl,
} from '../types/domain';
import { InternalControlInputSchema } from '../validation/schemas';

export const ControlLibraryPage: React.FC = () => {
  const { engagements, assertions, controls, evidence, saveControl } = useWorkbench();

  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('ALL');
  const [designFilter, setDesignFilter] = useState<string>('ALL');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<InternalControl | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [engagementId, setEngagementId] = useState('ENG-2025-002');
  const [controlCode, setControlCode] = useState('ENV-CTL-026');
  const [controlName, setControlName] = useState('');
  const [pillar, setPillar] = useState<ESGPillar>('Environmental');
  const [controlObjective, setControlObjective] = useState('');
  const [riskDescription, setRiskDescription] = useState('');
  const [controlOwner, setControlOwner] = useState('');
  const [controlFrequency, setControlFrequency] = useState<ControlFrequency>('Monthly');
  const [controlType, setControlType] = useState<ControlType>('Detective');
  const [controlDescription, setControlDescription] = useState('');
  const [designStatus, setDesignStatus] = useState<ControlDesignStatus>('Documented');
  const [operatingStatus, setOperatingStatus] =
    useState<ControlOperatingStatus>('Not Tested');
  const [linkedAssertionIds, setLinkedAssertionIds] = useState<string[]>([]);
  const [linkedEvidenceIds, setLinkedEvidenceIds] = useState<string[]>([]);
  const [lastReviewedDate, setLastReviewedDate] = useState('2025-12-01');

  const openCreateDialog = () => {
    setEditingControl(null);
    setEngagementId(engagements[1]?.engagementId ?? 'ENG-2025-002');
    setControlCode(`ENV-CTL-${String(controls.length + 1).padStart(3, '0')}`);
    setControlName('');
    setPillar('Environmental');
    setControlObjective('');
    setRiskDescription('');
    setControlOwner('');
    setControlFrequency('Monthly');
    setControlType('Detective');
    setControlDescription('');
    setDesignStatus('Draft');
    setOperatingStatus('Not Tested');
    setLinkedAssertionIds([]);
    setLinkedEvidenceIds([]);
    setLastReviewedDate('2025-12-15');
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (ctl: InternalControl) => {
    setEditingControl(ctl);
    setEngagementId(ctl.engagementId);
    setControlCode(ctl.controlCode);
    setControlName(ctl.controlName);
    setPillar(ctl.pillar);
    setControlObjective(ctl.controlObjective);
    setRiskDescription(ctl.riskDescription);
    setControlOwner(ctl.controlOwner);
    setControlFrequency(ctl.controlFrequency);
    setControlType(ctl.controlType);
    setControlDescription(ctl.controlDescription);
    setDesignStatus(ctl.designStatus);
    setOperatingStatus(ctl.operatingStatus);
    setLinkedAssertionIds(ctl.linkedAssertionIds);
    setLinkedEvidenceIds(ctl.linkedEvidenceIds);
    setLastReviewedDate(ctl.lastReviewedDate);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    const candidate = {
      engagementId,
      controlCode,
      controlName,
      pillar,
      controlObjective,
      riskDescription,
      controlOwner,
      controlFrequency,
      controlType,
      controlDescription,
      designStatus,
      operatingStatus,
      linkedAssertionIds,
      linkedEvidenceIds,
      lastReviewedDate,
    };

    const parsed = InternalControlInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }

    await saveControl(parsed.data, editingControl?.controlId);
    setDialogOpen(false);
  };

  const filteredControls = useMemo(() => {
    return controls.filter((c) => {
      if (pillarFilter !== 'ALL' && c.pillar !== pillarFilter) return false;
      if (designFilter !== 'ALL' && c.designStatus !== designFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.controlId.toLowerCase().includes(q) ||
          c.controlCode.toLowerCase().includes(q) ||
          c.controlName.toLowerCase().includes(q) ||
          c.controlOwner.toLowerCase().includes(q) ||
          c.riskDescription.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [controls, pillarFilter, designFilter, searchQuery]);

  const columns: GridColDef<InternalControl>[] = [
    {
      field: 'controlCode',
      headerName: 'Control Code',
      width: 135,
      renderCell: (params: GridRenderCellParams<InternalControl>) => (
        <span className="font-mono text-xs font-semibold">{params.row.controlCode}</span>
      ),
    },
    {
      field: 'controlName',
      headerName: 'Control Name & Risk Mitigated',
      minWidth: 280,
      flex: 1,
      renderCell: (params: GridRenderCellParams<InternalControl>) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>
            {params.row.controlName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            Risk: {params.row.riskDescription}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'pillar',
      headerName: 'Pillar',
      width: 120,
    },
    {
      field: 'controlOwner',
      headerName: 'Control Owner',
      width: 210,
      renderCell: (params: GridRenderCellParams<InternalControl>) => {
        const isUnassigned =
          !params.row.controlOwner ||
          params.row.controlOwner.toLowerCase() === 'unassigned';
        return (
          <span
            className={
              isUnassigned
                ? 'font-mono text-xs text-red-600 dark:text-red-400 font-bold'
                : 'text-xs'
            }
          >
            {params.row.controlOwner || 'Unassigned (DQ-05)'}
          </span>
        );
      },
    },
    {
      field: 'controlFrequency',
      headerName: 'Frequency',
      width: 110,
    },
    {
      field: 'controlType',
      headerName: 'Type',
      width: 105,
    },
    {
      field: 'designStatus',
      headerName: 'Design Status',
      width: 155,
      renderCell: (params: GridRenderCellParams<InternalControl>) => (
        <span className="font-mono text-xs font-semibold">{params.row.designStatus}</span>
      ),
    },
    {
      field: 'operatingStatus',
      headerName: 'Operating Status',
      width: 175,
      renderCell: (params: GridRenderCellParams<InternalControl>) => (
        <span className="font-mono text-xs">{params.row.operatingStatus}</span>
      ),
    },
    {
      field: 'linkedAssertionIds',
      headerName: 'Assertions',
      width: 105,
      renderCell: (params: GridRenderCellParams<InternalControl>) => (
        <span className="font-mono text-xs">
          {params.row.linkedAssertionIds.length} linked
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params: GridRenderCellParams<InternalControl>) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditOutlined fontSize="small" />}
          onClick={() => openEditDialog(params.row)}
        >
          Edit
        </Button>
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
            <Typography variant="h5">Internal ESG Control Library</Typography>
            <Typography variant="body2" color="text.secondary">
              Document internal controls, assign owners, link risks and ESG assertions, and track
              design documentation status.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openCreateDialog}
            data-testid="btn-new-control"
          >
            New Control
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2.5 }}>
          <strong>Operating Effectiveness Boundary:</strong> Per methodology rules, controls cannot
          be labeled &quot;Effective&quot; without completed sample testing (scheduled for Phase 2
          Control Testing). Phase 1 tracks <strong>Control Design Documentation Status</strong> and{' '}
          <strong>Control Owner Assignment (Rule DQ-05)</strong>.
        </Alert>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Control Code, Name, Owner, or Risk"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="ctl-pillar-filter">Filter Pillar</InputLabel>
              <Select
                labelId="ctl-pillar-filter"
                label="Filter Pillar"
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
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="ctl-design-filter">Design Status</InputLabel>
              <Select
                labelId="ctl-design-filter"
                label="Design Status"
                value={designFilter}
                onChange={(e) => setDesignFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Design Statuses</MenuItem>
                <MenuItem value="Documented">Documented</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Undocumented">Undocumented</MenuItem>
                <MenuItem value="Requires Remediation">Requires Remediation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <DataGrid
          rows={filteredControls}
          columns={columns}
          getRowId={(row) => row.controlId}
          rowHeight={54}
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Create / Edit Control Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingControl
            ? `Edit Internal Control (${editingControl.controlCode})`
            : 'Create New Internal ESG Control'}
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="control-form-error">
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Control Code"
                value={controlCode}
                onChange={(e) => setControlCode(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-control-code' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                label="Control Name"
                value={controlName}
                onChange={(e) => setControlName(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-control-name' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-ctl-pillar">ESG Pillar</InputLabel>
                <Select
                  labelId="form-ctl-pillar"
                  label="ESG Pillar"
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
                <InputLabel id="form-ctl-freq">Frequency</InputLabel>
                <Select
                  labelId="form-ctl-freq"
                  label="Frequency"
                  value={controlFrequency}
                  onChange={(e) => setControlFrequency(e.target.value as ControlFrequency)}
                >
                  <MenuItem value="Continuous">Continuous</MenuItem>
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                  <MenuItem value="Quarterly">Quarterly</MenuItem>
                  <MenuItem value="Annual">Annual</MenuItem>
                  <MenuItem value="Ad-Hoc">Ad-Hoc</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-ctl-type">Control Type</InputLabel>
                <Select
                  labelId="form-ctl-type"
                  label="Control Type"
                  value={controlType}
                  onChange={(e) => setControlType(e.target.value as ControlType)}
                >
                  <MenuItem value="Preventive">Preventive</MenuItem>
                  <MenuItem value="Detective">Detective</MenuItem>
                  <MenuItem value="Corrective">Corrective</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Control Owner"
                value={controlOwner}
                onChange={(e) => setControlOwner(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-control-owner' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-ctl-design">Design Status</InputLabel>
                <Select
                  labelId="form-ctl-design"
                  label="Design Status"
                  value={designStatus}
                  onChange={(e) => setDesignStatus(e.target.value as ControlDesignStatus)}
                >
                  <MenuItem value="Documented">Documented</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Undocumented">Undocumented</MenuItem>
                  <MenuItem value="Requires Remediation">Requires Remediation</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-ctl-op">Operating Status</InputLabel>
                <Select
                  labelId="form-ctl-op"
                  label="Operating Status"
                  value={operatingStatus}
                  onChange={(e) => setOperatingStatus(e.target.value as ControlOperatingStatus)}
                >
                  <MenuItem value="Not Tested">Not Tested</MenuItem>
                  <MenuItem value="Testing Planned (Phase 2)">
                    Testing Planned (Phase 2)
                  </MenuItem>
                  <MenuItem value="Exception Identified">Exception Identified</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Control Objective"
                value={controlObjective}
                onChange={(e) => setControlObjective(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-control-objective' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Risk Description Mitigated"
                value={riskDescription}
                onChange={(e) => setRiskDescription(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-risk-description' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Control Procedure Description"
                value={controlDescription}
                onChange={(e) => setControlDescription(e.target.value)}
                slotProps={{ htmlInput: { 'data-testid': 'input-control-description' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-ctl-assertions">Linked ESG Assertions</InputLabel>
                <Select
                  labelId="form-ctl-assertions"
                  multiple
                  value={linkedAssertionIds}
                  onChange={(e) =>
                    setLinkedAssertionIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                  input={<OutlinedInput label="Linked ESG Assertions" />}
                  renderValue={(selected) => `${selected.length} assertion(s) linked`}
                >
                  {assertions.slice(0, 30).map((asn) => (
                    <MenuItem key={asn.assertionId} value={asn.assertionId}>
                      <Checkbox checked={linkedAssertionIds.includes(asn.assertionId)} />
                      <ListItemText
                        primary={`${asn.assertionId} — ${asn.metricCode}`}
                        secondary={asn.metricName}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="form-ctl-ev">Linked Evidence References</InputLabel>
                <Select
                  labelId="form-ctl-ev"
                  multiple
                  value={linkedEvidenceIds}
                  onChange={(e) =>
                    setLinkedEvidenceIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                  input={<OutlinedInput label="Linked Evidence References" />}
                  renderValue={(selected) => `${selected.length} evidence ref(s) linked`}
                >
                  {evidence.map((ev) => (
                    <MenuItem key={ev.evidenceId} value={ev.evidenceId}>
                      <Checkbox checked={linkedEvidenceIds.includes(ev.evidenceId)} />
                      <ListItemText primary={`${ev.evidenceId} — ${ev.documentName}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            data-testid="btn-save-control"
          >
            Save Control
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
