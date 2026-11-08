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
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  AuditFinding,
  AuditFindingSeverity,
  AuditFindingType,
  RemediationStatus,
  RetestStatus,
} from '../types/domain';
import { validateAuditFindingClosure } from '../services/controlTestingEngine';

const FINDING_TYPES: AuditFindingType[] = [
  'Control Design Deficiency',
  'Control Operating Exception',
  'GHG Recalculation Variance',
  'Sampling Exception',
  'Documentation / Evidence Gap',
];

const SEVERITIES: AuditFindingSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

const REMEDIATION_STATUSES: RemediationStatus[] = [
  'Open',
  'Action Planned',
  'In Progress',
  'Ready for Retest',
  'Closed',
  'Reopened',
];

const RETEST_STATUSES: RetestStatus[] = [
  'Not Retested',
  'Retest Passed',
  'Retest Failed',
  'Approved Alternative Disposition',
];

export const FindingsRemediationPage: React.FC = () => {
  const {
    engagements,
    assertions,
    controls,
    evidence,
    auditProcedures,
    auditFindings,
    findings,
    filters,
    saveAuditFinding,
  } = useWorkbench();

  const activeEngagementId =
    filters.engagementId !== 'ALL'
      ? filters.engagementId
      : engagements[1]?.engagementId ?? 'ENG-2025-002';

  const [tabIndex, setTabIndex] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);
  const [draft, setDraft] = useState<{
    procedureId: string;
    linkedAssertionId: string;
    linkedControlId: string;
    findingType: AuditFindingType;
    severity: AuditFindingSeverity;
    description: string;
    rootCause: string;
    impact: string;
    evidenceIds: string[];
    responsibleOwner: string;
    remediationAction: string;
    targetDate: string;
    remediationStatus: RemediationStatus;
    retestStatus: RetestStatus;
    retestNotes: string;
  }>({
    procedureId: '',
    linkedAssertionId: '',
    linkedControlId: '',
    findingType: 'Control Operating Exception',
    severity: 'High',
    description: '',
    rootCause: '',
    impact: '',
    evidenceIds: [],
    responsibleOwner: 'Facility ESG Controller',
    remediationAction: '',
    targetDate: '2025-06-30',
    remediationStatus: 'Open',
    retestStatus: 'Not Retested',
    retestNotes: '',
  });

  const engagementAuditFindings = useMemo(
    () =>
      auditFindings.filter(
        (f) =>
          (filters.engagementId === 'ALL' || f.engagementId === filters.engagementId) &&
          (severityFilter === 'ALL' || f.severity === severityFilter) &&
          (statusFilter === 'ALL' || f.remediationStatus === statusFilter)
      ),
    [auditFindings, filters.engagementId, severityFilter, statusFilter]
  );

  const engagementValidationFindings = useMemo(
    () =>
      findings.filter(
        (v) => filters.engagementId === 'ALL' || v.engagementId === filters.engagementId
      ),
    [findings, filters.engagementId]
  );

  const engagementEvidence = useMemo(
    () =>
      evidence.filter(
        (e) => filters.engagementId === 'ALL' || e.engagementId === filters.engagementId
      ),
    [evidence, filters.engagementId]
  );

  const evidenceMap = useMemo(
    () => new Map(evidence.map((e) => [e.evidenceId, e])),
    [evidence]
  );

  const handleOpenCreate = () => {
    setEditingFinding(null);
    setDraft({
      procedureId: auditProcedures[0]?.procedureId || 'PROC-001',
      linkedAssertionId: assertions[0]?.assertionId || 'AST-ASN-001',
      linkedControlId: controls[0]?.controlId || 'AST-CTL-001',
      findingType: 'Control Operating Exception',
      severity: 'High',
      description: '',
      rootCause: '',
      impact: '',
      evidenceIds: [],
      responsibleOwner: 'Facility ESG Controller',
      remediationAction: '',
      targetDate: '2025-06-30',
      remediationStatus: 'Open',
      retestStatus: 'Not Retested',
      retestNotes: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (finding: AuditFinding) => {
    setEditingFinding(finding);
    setDraft({
      procedureId: finding.procedureId,
      linkedAssertionId: finding.linkedAssertionId || 'AST-ASN-001',
      linkedControlId: finding.linkedControlId || 'AST-CTL-001',
      findingType: finding.findingType,
      severity: finding.severity,
      description: finding.description,
      rootCause: finding.rootCause,
      impact: finding.impact,
      evidenceIds: finding.evidenceIds,
      responsibleOwner: finding.responsibleOwner,
      remediationAction: finding.remediationAction,
      targetDate: finding.targetDate,
      remediationStatus: finding.remediationStatus,
      retestStatus: finding.retestStatus,
      retestNotes: finding.retestNotes || '',
    });
    setDialogOpen(true);
  };

  const handleSaveFinding = async () => {
    if (!draft.description.trim() || !draft.rootCause.trim()) {
      setFeedback({
        severity: 'error',
        message: 'Finding description and root cause analysis are mandatory.',
      });
      return;
    }

    const now = new Date().toISOString();
    const record: AuditFinding = {
      auditFindingId: editingFinding?.auditFindingId || `AF-${Date.now()}`,
      engagementId: editingFinding?.engagementId || activeEngagementId,
      procedureId: draft.procedureId || auditProcedures[0]?.procedureId || 'PROC-001',
      linkedAssertionId: draft.linkedAssertionId || 'AST-ASN-001',
      linkedControlId: draft.linkedControlId || 'AST-CTL-001',
      findingType: draft.findingType,
      severity: draft.severity,
      description: draft.description,
      rootCause: draft.rootCause,
      impact: draft.impact,
      evidenceIds: draft.evidenceIds,
      responsibleOwner: draft.responsibleOwner,
      remediationAction: draft.remediationAction,
      targetDate: draft.targetDate,
      remediationStatus: draft.remediationStatus,
      retestStatus: draft.retestStatus,
      retestNotes: draft.retestNotes,
      createdAt: editingFinding?.createdAt || now,
      updatedAt: now,
    };

    const closureCheck = validateAuditFindingClosure(record, evidenceMap);
    if (!closureCheck.valid) {
      setFeedback({
        severity: 'error',
        message: `Finding Closure Guardrail Blocked: ${closureCheck.errors.join(' ')}`,
      });
      return;
    }

    try {
      await saveAuditFinding(
        {
          engagementId: record.engagementId,
          procedureId: record.procedureId,
          linkedAssertionId: record.linkedAssertionId,
          linkedControlId: record.linkedControlId,
          findingType: record.findingType,
          severity: record.severity,
          description: record.description,
          rootCause: record.rootCause,
          impact: record.impact,
          evidenceIds: record.evidenceIds,
          responsibleOwner: record.responsibleOwner,
          remediationAction: record.remediationAction,
          targetDate: record.targetDate,
          remediationStatus: record.remediationStatus,
          retestStatus: record.retestStatus,
          retestNotes: record.retestNotes,
        },
        editingFinding?.auditFindingId
      );
      setDialogOpen(false);
      setFeedback({
        severity: 'success',
        message: `Saved Audit Finding ${record.auditFindingId} (${record.remediationStatus}).`,
      });
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Failed to save Audit Finding.',
      });
    }
  };

  const handleReopenFinding = async (finding: AuditFinding) => {
    try {
      await saveAuditFinding(
        {
          engagementId: finding.engagementId,
          procedureId: finding.procedureId,
          linkedAssertionId: finding.linkedAssertionId,
          linkedControlId: finding.linkedControlId,
          findingType: finding.findingType,
          severity: finding.severity,
          description: finding.description,
          rootCause: finding.rootCause,
          impact: finding.impact,
          evidenceIds: finding.evidenceIds,
          responsibleOwner: finding.responsibleOwner,
          remediationAction: finding.remediationAction,
          targetDate: finding.targetDate,
          remediationStatus: 'Reopened',
          retestStatus: 'Not Retested',
          retestNotes: finding.retestNotes,
        },
        finding.auditFindingId
      );
      setFeedback({
        severity: 'warning',
        message: `Reopened Audit Finding ${finding.auditFindingId} for additional remediation and retesting.`,
      });
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Failed to reopen finding.',
      });
    }
  };

  const findingColumns: GridColDef<AuditFinding>[] = [
    { field: 'auditFindingId', headerName: 'Finding ID', width: 125 },
    { field: 'findingType', headerName: 'Finding Type', width: 205 },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 115,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={
            params.value === 'Critical' || params.value === 'High'
              ? 'error'
              : params.value === 'Medium'
                ? 'warning'
                : 'info'
          }
        />
      ),
    },
    { field: 'description', headerName: 'Finding Description', flex: 1, minWidth: 250 },
    { field: 'responsibleOwner', headerName: 'Owner', width: 160 },
    { field: 'targetDate', headerName: 'Target Date', width: 120 },
    {
      field: 'remediationStatus',
      headerName: 'Status',
      width: 145,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={
            params.value === 'Closed'
              ? 'success'
              : params.value === 'Ready for Retest'
                ? 'info'
                : params.value === 'Reopened'
                  ? 'error'
                  : 'warning'
          }
        />
      ),
    },
    {
      field: 'retestStatus',
      headerName: 'Retest Disposition',
      width: 210,
      renderCell: (params) => (
        <Chip
          size="small"
          variant="outlined"
          label={params.value}
          color={
            params.value === 'Retest Passed' || params.value === 'Approved Alternative Disposition'
              ? 'success'
              : params.value === 'Retest Failed'
                ? 'error'
                : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={() => handleOpenEdit(params.row)}
          >
            Edit
          </Button>
          {params.row.remediationStatus === 'Closed' && (
            <Button
              size="small"
              color="warning"
              variant="outlined"
              startIcon={<LockResetOutlinedIcon />}
              onClick={() => void handleReopenFinding(params.row)}
            >
              Reopen
            </Button>
          )}
        </Box>
      ),
    },
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
            Findings &amp; Remediation Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Root-cause analysis, corrective action plans, remediation evidence linkage, and mandatory retest verification before closure
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={handleOpenCreate}>
          Log Audit Finding
        </Button>
      </Box>

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}

      <Card variant="outlined">
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label={`Phase 2 Substantive & Control Audit Findings (${engagementAuditFindings.length})`} />
          <Tab label={`Phase 1 Automated Data Validation Exceptions (${engagementValidationFindings.length})`} />
        </Tabs>

        <CardContent>
          {tabIndex === 0 && (
            <Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    label="Severity"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Severities</MenuItem>
                    {SEVERITIES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Remediation Status</InputLabel>
                  <Select
                    label="Remediation Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    {REMEDIATION_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Alert severity="info" icon={<VerifiedOutlinedIcon />} sx={{ py: 0, flex: 1 }}>
                  Closure Guardrail: A finding cannot be set to <strong>Closed</strong> unless remediation action, remediation evidence, and <strong>Retest Passed</strong> (or Approved Alternative Disposition) are documented.
                </Alert>
              </Box>

              <Box sx={{ height: 500, width: '100%' }}>
                <DataGrid
                  rows={engagementAuditFindings}
                  columns={findingColumns}
                  getRowId={(r) => r.auditFindingId}
                  disableRowSelectionOnClick
                  pageSizeOptions={[10, 25]}
                />
              </Box>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {engagementValidationFindings.map((vf) => (
                <Card key={vf.findingId} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {vf.findingId} — Rule {vf.ruleId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {vf.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Affected Entity: {vf.linkedEntityType} ({vf.linkedEntityId})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label={vf.severity} color={vf.severity === 'High' ? 'error' : 'warning'} />
                      <Chip size="small" variant="outlined" label={vf.status} />
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Finding Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingFinding ? `Edit Audit Finding ${editingFinding.auditFindingId}` : 'Log New Audit Finding'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Finding Type</InputLabel>
                <Select
                  label="Finding Type"
                  value={draft.findingType}
                  onChange={(e) => setDraft({ ...draft, findingType: e.target.value as AuditFindingType })}
                >
                  {FINDING_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  label="Severity"
                  value={draft.severity}
                  onChange={(e) => setDraft({ ...draft, severity: e.target.value as AuditFindingSeverity })}
                >
                  {SEVERITIES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Finding Description"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Root Cause Analysis"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={draft.rootCause}
                onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Quantitative / Assurance Impact"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={draft.impact}
                onChange={(e) => setDraft({ ...draft, impact: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Responsible Remediation Owner"
                size="small"
                fullWidth
                value={draft.responsibleOwner}
                onChange={(e) => setDraft({ ...draft, responsibleOwner: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Target Completion Date"
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={draft.targetDate}
                onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Corrective / Remediation Action Plan"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={draft.remediationAction}
                onChange={(e) => setDraft({ ...draft, remediationAction: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Linked Remediation &amp; Audit Evidence</InputLabel>
                <Select
                  multiple
                  label="Linked Remediation & Audit Evidence"
                  value={draft.evidenceIds}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      evidenceIds:
                        typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
                    })
                  }
                >
                  {engagementEvidence.map((ev) => (
                    <MenuItem key={ev.evidenceId} value={ev.evidenceId}>
                      {ev.evidenceId} — {ev.documentName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Remediation Status</InputLabel>
                <Select
                  label="Remediation Status"
                  value={draft.remediationStatus}
                  onChange={(e) =>
                    setDraft({ ...draft, remediationStatus: e.target.value as RemediationStatus })
                  }
                >
                  {REMEDIATION_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Retest Status</InputLabel>
                <Select
                  label="Retest Status"
                  value={draft.retestStatus}
                  onChange={(e) => setDraft({ ...draft, retestStatus: e.target.value as RetestStatus })}
                >
                  {RETEST_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Retest / Alternative Disposition Workpaper Notes"
                size="small"
                fullWidth
                value={draft.retestNotes}
                onChange={(e) => setDraft({ ...draft, retestNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveFinding()}>
            Save Finding
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
