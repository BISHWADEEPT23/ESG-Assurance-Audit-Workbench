import React, { useState } from 'react';
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
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircleOutlined,
  Edit as EditIcon,
  FactCheck as TestIcon,
  Gavel as ReviewIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  DesignTest,
  DesignTestResult,
  OperatingTest,
  OperatingTestConclusion,
  ReviewRecord,
  ReviewWorkflowStatus,
} from '../types/domain';

const DESIGN_RESULTS: DesignTestResult[] = [
  'Adequately Designed',
  'Design Deficiency',
  'Inconclusive',
  'Not Tested',
];

const OPERATING_CONCLUSIONS: OperatingTestConclusion[] = [
  'Operating Effectively',
  'Operating Ineffectively',
  'Inconclusive',
  'Not Tested',
];

const REVIEW_STATUSES: ReviewWorkflowStatus[] = [
  'Draft',
  'Submitted for Review',
  'Changes Requested',
  'Approved',
  'Rejected',
];

export const ControlTestingPage: React.FC = () => {
  const {
    engagements,
    controls,
    auditProcedures,
    samplingPlans,
    evidence,
    designTests,
    operatingTests,
    reviews,
    saveDesignTest,
    saveOperatingTest,
    submitReviewDecision,
  } = useWorkbench();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Design Test Dialog
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [editingDesignId, setEditingDesignId] = useState<string | undefined>(undefined);
  const [designForm, setDesignForm] = useState<Omit<DesignTest, 'designTestId' | 'testedAt'>>({
    controlId: controls[0]?.controlId ?? 'AST-CTL-001',
    procedureId: auditProcedures[0]?.procedureId ?? 'PRC-001',
    testObjective: 'Verify design of automated PLC meter capture and supervisor sign-off.',
    designCriteria: 'COSO Internal Control Framework & ISO 14064-3',
    walkthroughDescription: 'Traced monthly gas invoice and PLC log from sensor to ESG consolidation ledger.',
    evidenceIds: [evidence[0]?.evidenceId ?? 'EVD-2024-001'],
    testResult: 'Adequately Designed',
    preparer: 'Lukas Weber (Senior ESG Internal Auditor)',
    reviewer: 'Dr. Henrik Lindqvist (Lead ESG Assurance Partner)',
    reviewStatus: 'Approved',
    conclusionRationale: 'Control design attributes prevent unapproved manual overrides.',
  });

  // Operating Test Dialog
  const [opDialogOpen, setOpDialogOpen] = useState(false);
  const [editingOpId, setEditingOpId] = useState<string | undefined>(undefined);
  const [opForm, setOpForm] = useState<Omit<OperatingTest, 'operatingTestId' | 'testedAt'>>({
    controlId: controls[0]?.controlId ?? 'AST-CTL-001',
    samplingPlanId: samplingPlans[0]?.samplingPlanId ?? 'SMP-001',
    testingPeriod: 'FY 2025 (Jan–Dec)',
    testProcedure: 'Inspected calibration certificates and supervisor sign-offs across all sampled items.',
    sampleResults: [{ sampleItemId: 'SMP-001-ITM-001', passed: true, exceptionDetail: 'No exception' }],
    exceptions: 0,
    exceptionsEvaluated: true,
    exceptionEvaluationNotes: 'Zero exceptions noted across sampled items.',
    evidenceIds: [evidence[0]?.evidenceId ?? 'EVD-2024-001'],
    preparer: 'Lukas Weber (Senior ESG Internal Auditor)',
    reviewer: 'Dr. Henrik Lindqvist (Lead ESG Assurance Partner)',
    conclusion: 'Operating Effectively',
    conclusionRationale: 'Control operated effectively throughout the testing period with 0% deviation rate.',
    reviewStatus: 'Approved',
  });

  // Review Workflow Dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<{
    engagementId: string;
    entityType: ReviewRecord['entityType'];
    entityId: string;
    preparedBy: string;
    reviewedBy: string;
    targetStatus: ReviewWorkflowStatus;
    reviewComments: string;
  }>({
    engagementId: engagements[1]?.engagementId ?? 'ENG-2025-002',
    entityType: 'OperatingTest',
    entityId: operatingTests[0]?.operatingTestId ?? 'OT-001',
    preparedBy: 'Lukas Weber (Senior ESG Internal Auditor)',
    reviewedBy: 'Dr. Henrik Lindqvist (Lead ESG Assurance Partner)',
    targetStatus: 'Approved',
    reviewComments: 'Independent partner review completed; sample workpapers verified.',
  });

  const openEditDesignTest = (dt?: DesignTest) => {
    setFormError(null);
    if (dt) {
      setEditingDesignId(dt.designTestId);
      setDesignForm({
        controlId: dt.controlId,
        procedureId: dt.procedureId,
        testObjective: dt.testObjective,
        designCriteria: dt.designCriteria,
        walkthroughDescription: dt.walkthroughDescription,
        evidenceIds: dt.evidenceIds,
        testResult: dt.testResult,
        preparer: dt.preparer,
        reviewer: dt.reviewer,
        reviewStatus: dt.reviewStatus,
        conclusionRationale: dt.conclusionRationale,
      });
    } else {
      setEditingDesignId(undefined);
    }
    setDesignDialogOpen(true);
  };

  const handleSaveDesignTest = async () => {
    try {
      setFormError(null);
      const saved = await saveDesignTest(designForm, editingDesignId);
      setDesignDialogOpen(false);
      setSuccessMsg(`Test of Design ${saved.designTestId} saved (${saved.testResult}).`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save Test of Design.');
    }
  };

  const openEditOperatingTest = (ot?: OperatingTest) => {
    setFormError(null);
    if (ot) {
      setEditingOpId(ot.operatingTestId);
      setOpForm({
        controlId: ot.controlId,
        samplingPlanId: ot.samplingPlanId,
        testingPeriod: ot.testingPeriod,
        testProcedure: ot.testProcedure,
        sampleResults: ot.sampleResults,
        exceptions: ot.exceptions,
        exceptionsEvaluated: ot.exceptionsEvaluated,
        exceptionEvaluationNotes: ot.exceptionEvaluationNotes,
        evidenceIds: ot.evidenceIds,
        preparer: ot.preparer,
        reviewer: ot.reviewer,
        conclusion: ot.conclusion,
        conclusionRationale: ot.conclusionRationale,
        reviewStatus: ot.reviewStatus,
      });
    } else {
      setEditingOpId(undefined);
    }
    setOpDialogOpen(true);
  };

  const handleSaveOperatingTest = async () => {
    try {
      setFormError(null);
      const saved = await saveOperatingTest(opForm, editingOpId);
      setOpDialogOpen(false);
      setSuccessMsg(
        `Operating Test ${saved.operatingTestId} saved (${saved.conclusion} | Exceptions: ${saved.exceptions}).`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save Operating Test.');
    }
  };

  const handleSubmitReview = async () => {
    try {
      setFormError(null);
      const saved = await submitReviewDecision({
        engagementId: reviewForm.engagementId,
        entityType: reviewForm.entityType,
        entityId: reviewForm.entityId,
        preparedBy: reviewForm.preparedBy,
        reviewedBy: reviewForm.reviewedBy.trim() || null,
        targetStatus: reviewForm.targetStatus,
        reviewComments: reviewForm.reviewComments,
      });
      setReviewDialogOpen(false);
      setSuccessMsg(
        `Review Record ${saved.reviewId} persisted: ${saved.entityType} (${saved.entityId}) marked ${saved.reviewStatus} by independent reviewer ${saved.reviewedBy}.`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Review submission blocked by guardrail.');
    }
  };

  const designColumns: GridColDef<DesignTest>[] = [
    {
      field: 'designTestId',
      headerName: 'Design Test ID',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'controlId', headerName: 'Control ID', width: 130 },
    { field: 'procedureId', headerName: 'Procedure ID', width: 120 },
    { field: 'testObjective', headerName: 'Test Objective', flex: 1, minWidth: 230 },
    {
      field: 'testResult',
      headerName: 'Design Result',
      width: 175,
      renderCell: (params) => (
        <Chip
          size="small"
          color={
            params.value === 'Adequately Designed'
              ? 'success'
              : params.value === 'Inconclusive'
                ? 'warning'
                : 'error'
          }
          label={params.value}
        />
      ),
    },
    { field: 'preparer', headerName: 'Preparer', width: 170 },
    { field: 'reviewer', headerName: 'Reviewer', width: 170 },
    {
      field: 'reviewStatus',
      headerName: 'Review Status',
      width: 150,
      renderCell: (params) => <Chip size="small" variant="outlined" label={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<DesignTest>) => (
        <Button size="small" startIcon={<EditIcon />} onClick={() => openEditDesignTest(params.row)}>
          Edit
        </Button>
      ),
    },
  ];

  const operatingColumns: GridColDef<OperatingTest>[] = [
    {
      field: 'operatingTestId',
      headerName: 'Op Test ID',
      width: 115,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'controlId', headerName: 'Control ID', width: 130 },
    { field: 'samplingPlanId', headerName: 'Sampling Plan', width: 125 },
    { field: 'testingPeriod', headerName: 'Testing Period', width: 150 },
    {
      field: 'exceptions',
      headerName: 'Exceptions',
      width: 120,
      renderCell: (params: GridRenderCellParams<OperatingTest>) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: params.row.exceptions > 0 ? 'error.main' : 'success.main',
            fontWeight: 600,
          }}
        >
          {params.row.exceptions} exc
        </Typography>
      ),
    },
    {
      field: 'conclusion',
      headerName: 'Operating Conclusion',
      width: 200,
      renderCell: (params) => (
        <Chip
          size="small"
          color={
            params.value === 'Operating Effectively'
              ? 'success'
              : params.value === 'Inconclusive'
                ? 'warning'
                : 'error'
          }
          label={params.value}
        />
      ),
    },
    { field: 'preparer', headerName: 'Preparer', width: 165 },
    { field: 'reviewer', headerName: 'Independent Reviewer', width: 175 },
    {
      field: 'reviewStatus',
      headerName: 'Review Status',
      width: 145,
      renderCell: (params) => <Chip size="small" variant="outlined" label={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<OperatingTest>) => (
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => openEditOperatingTest(params.row)}
        >
          Edit
        </Button>
      ),
    },
  ];

  const reviewColumns: GridColDef<ReviewRecord>[] = [
    {
      field: 'reviewId',
      headerName: 'Review ID',
      width: 115,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'entityType', headerName: 'Workpaper Type', width: 160 },
    {
      field: 'entityId',
      headerName: 'Workpaper ID',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'preparedBy', headerName: 'Prepared By', width: 200 },
    { field: 'reviewedBy', headerName: 'Reviewed By (Independent)', width: 210 },
    {
      field: 'reviewStatus',
      headerName: 'Decision',
      width: 165,
      renderCell: (params) => (
        <Chip
          size="small"
          color={
            params.value === 'Approved'
              ? 'success'
              : params.value === 'Changes Requested' || params.value === 'Rejected'
                ? 'error'
                : 'info'
          }
          label={params.value}
        />
      ),
    },
    { field: 'reviewComments', headerName: 'Review Sign-Off Notes', flex: 1, minWidth: 260 },
  ];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Control Testing Workbench & Review Sign-Off
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Test of Design walkthroughs, Operating Effectiveness sample execution, and 4-eyes independent review sign-off
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => openEditDesignTest(undefined)}
          >
            New Test of Design
          </Button>
          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={() => openEditOperatingTest(undefined)}
          >
            New Operating Test
          </Button>
          <Button
            variant="contained"
            startIcon={<ReviewIcon />}
            onClick={() => {
              setFormError(null);
              setReviewDialogOpen(true);
            }}
          >
            Record Independent Review
          </Button>
        </Stack>
      </Stack>

      {successMsg && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlined fontSize="inherit" />}
          onClose={() => setSuccessMsg(null)}
          sx={{ mb: 2 }}
        >
          {successMsg}
        </Alert>
      )}

      <Card>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 2, pt: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Operating Effectiveness Tests (${operatingTests.length})`} />
          <Tab label={`Test of Design Walkthroughs (${designTests.length})`} />
          <Tab label={`Independent Review Sign-Off Queue (${reviews.length})`} />
        </Tabs>

        <CardContent>
          {activeTab === 0 && (
            <Stack spacing={2.5}>
              <Alert severity="info">
                <strong>7 Mandatory Operating Effectiveness Guardrails:</strong> A control cannot be
                marked <code>Operating Effectively</code> unless: (1) Test procedure is documented,
                (2) Testing period is defined, (3) Sampled items have completed testing, (4)
                Supporting evidence is linked, (5) Exceptions are evaluated (0 exceptions), (6)
                Preparer rationale is documented, and (7) An independent reviewer (
                <code>reviewer !== preparer</code>) has approved the workpaper.
              </Alert>
              <Box sx={{ height: 420, width: '100%' }}>
                <DataGrid
                  rows={operatingTests}
                  getRowId={(r) => r.operatingTestId}
                  columns={operatingColumns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10]}
                />
              </Box>
            </Stack>
          )}

          {activeTab === 1 && (
            <Stack spacing={2.5}>
              <Alert severity="info">
                <strong>Walkthrough Guardrail:</strong> Concluding a control design as{' '}
                <code>Adequately Designed</code> requires a documented walkthrough narrative,
                linked evidence, and reviewer independence.
              </Alert>
              <Box sx={{ height: 420, width: '100%' }}>
                <DataGrid
                  rows={designTests}
                  getRowId={(r) => r.designTestId}
                  columns={designColumns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10]}
                />
              </Box>
            </Stack>
          )}

          {activeTab === 2 && (
            <Stack spacing={2.5}>
              <Alert severity="warning">
                <strong>Self-Approval Prevention Guardrail:</strong> The Review Workflow strictly
                enforces 4-eyes independence (<code>reviewedBy !== preparedBy</code>). Self-approval
                attempts are blocked.
              </Alert>
              <Box sx={{ height: 420, width: '100%' }}>
                <DataGrid
                  rows={reviews}
                  getRowId={(r) => r.reviewId}
                  columns={reviewColumns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10]}
                />
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Operating Test Dialog */}
      <Dialog open={opDialogOpen} onClose={() => setOpDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOpId
            ? `Edit Operating Effectiveness Test ${editingOpId}`
            : 'New Operating Effectiveness Test'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Internal Control</InputLabel>
                  <Select
                    label="Internal Control"
                    value={opForm.controlId}
                    onChange={(e) => setOpForm({ ...opForm, controlId: e.target.value })}
                  >
                    {controls.map((c) => (
                      <MenuItem key={c.controlId} value={c.controlId}>
                        {c.controlId} — {c.controlName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Linked Sampling Plan</InputLabel>
                  <Select
                    label="Linked Sampling Plan"
                    value={opForm.samplingPlanId}
                    onChange={(e) => setOpForm({ ...opForm, samplingPlanId: e.target.value })}
                  >
                    {samplingPlans.map((sp) => (
                      <MenuItem key={sp.samplingPlanId} value={sp.samplingPlanId}>
                        {sp.samplingPlanId} ({sp.samplingMethod}, n={sp.actualSampleSize})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Testing Period"
                  value={opForm.testingPeriod}
                  onChange={(e) => setOpForm({ ...opForm, testingPeriod: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Exceptions Identified"
                  value={opForm.exceptions}
                  onChange={(e) => setOpForm({ ...opForm, exceptions: Number(e.target.value) })}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={opForm.exceptionsEvaluated}
                  onChange={(e) =>
                    setOpForm({ ...opForm, exceptionsEvaluated: e.target.checked })
                  }
                />
              }
              label="Sample Exceptions Formally Evaluated"
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Operating Conclusion</InputLabel>
                  <Select
                    label="Operating Conclusion"
                    value={opForm.conclusion}
                    onChange={(e) =>
                      setOpForm({
                        ...opForm,
                        conclusion: e.target.value as OperatingTestConclusion,
                      })
                    }
                  >
                    {OPERATING_CONCLUSIONS.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Review Workflow Status</InputLabel>
                  <Select
                    label="Review Workflow Status"
                    value={opForm.reviewStatus}
                    onChange={(e) =>
                      setOpForm({
                        ...opForm,
                        reviewStatus: e.target.value as ReviewWorkflowStatus,
                      })
                    }
                  >
                    {REVIEW_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Preparer"
                  value={opForm.preparer}
                  onChange={(e) => setOpForm({ ...opForm, preparer: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reviewer (Must differ from Preparer)"
                  value={opForm.reviewer}
                  onChange={(e) => setOpForm({ ...opForm, reviewer: e.target.value })}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Test Procedure Description"
              value={opForm.testProcedure}
              onChange={(e) => setOpForm({ ...opForm, testProcedure: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Conclusion Rationale"
              value={opForm.conclusionRationale}
              onChange={(e) => setOpForm({ ...opForm, conclusionRationale: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveOperatingTest()}>
            Validate Guardrails & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Design Test Dialog */}
      <Dialog
        open={designDialogOpen}
        onClose={() => setDesignDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingDesignId
            ? `Edit Test of Design ${editingDesignId}`
            : 'New Control Test of Design'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormControl fullWidth size="small">
              <InputLabel>Internal Control</InputLabel>
              <Select
                label="Internal Control"
                value={designForm.controlId}
                onChange={(e) => setDesignForm({ ...designForm, controlId: e.target.value })}
              >
                {controls.map((c) => (
                  <MenuItem key={c.controlId} value={c.controlId}>
                    {c.controlId} — {c.controlName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Test Objective"
              value={designForm.testObjective}
              onChange={(e) => setDesignForm({ ...designForm, testObjective: e.target.value })}
            />

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Walkthrough Description"
              value={designForm.walkthroughDescription}
              onChange={(e) =>
                setDesignForm({ ...designForm, walkthroughDescription: e.target.value })
              }
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Design Test Result</InputLabel>
                  <Select
                    label="Design Test Result"
                    value={designForm.testResult}
                    onChange={(e) =>
                      setDesignForm({
                        ...designForm,
                        testResult: e.target.value as DesignTestResult,
                      })
                    }
                  >
                    {DESIGN_RESULTS.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Conclusion Rationale"
                  value={designForm.conclusionRationale}
                  onChange={(e) =>
                    setDesignForm({ ...designForm, conclusionRationale: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveDesignTest()}>
            Save Test of Design
          </Button>
        </DialogActions>
      </Dialog>

      {/* Independent Review Decision Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Independent Workpaper Review Decision</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormControl fullWidth size="small">
              <InputLabel>Workpaper Entity Type</InputLabel>
              <Select
                label="Workpaper Entity Type"
                value={reviewForm.entityType}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    entityType: e.target.value as ReviewRecord['entityType'],
                  })
                }
              >
                <MenuItem value="AuditPlan">AuditPlan</MenuItem>
                <MenuItem value="AuditProcedure">AuditProcedure</MenuItem>
                <MenuItem value="DesignTest">DesignTest</MenuItem>
                <MenuItem value="OperatingTest">OperatingTest</MenuItem>
                <MenuItem value="GHGRecalculation">GHGRecalculation</MenuItem>
                <MenuItem value="AuditFinding">AuditFinding</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Workpaper ID"
              value={reviewForm.entityId}
              onChange={(e) => setReviewForm({ ...reviewForm, entityId: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Prepared By"
              value={reviewForm.preparedBy}
              onChange={(e) => setReviewForm({ ...reviewForm, preparedBy: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Reviewed By (Must NOT match Prepared By)"
              value={reviewForm.reviewedBy}
              onChange={(e) => setReviewForm({ ...reviewForm, reviewedBy: e.target.value })}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Review Decision</InputLabel>
              <Select
                label="Review Decision"
                value={reviewForm.targetStatus}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    targetStatus: e.target.value as ReviewWorkflowStatus,
                  })
                }
              >
                {REVIEW_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Reviewer Comments & Sign-Off Notes"
              value={reviewForm.reviewComments}
              onChange={(e) => setReviewForm({ ...reviewForm, reviewComments: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSubmitReview()}>
            Verify Independence & Sign Off
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
