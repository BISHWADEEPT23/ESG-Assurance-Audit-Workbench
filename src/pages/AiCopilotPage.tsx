import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoAwesomeOutlined,
  CheckCircleOutlined,
  GppGoodOutlined,
  PlaylistAddCheckOutlined,
  PsychologyOutlined,
  SecurityOutlined,
  VerifiedUserOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import { AiAuditTaskType } from '../types/domain';
import {
  AI_TASK_DESCRIPTIONS,
  MANDATORY_AI_REVIEW_LABEL,
} from '../services/aiCopilotEngine';

const ALL_TASK_TYPES: AiAuditTaskType[] = [
  'Audit Procedure Drafting',
  'Evidence Summarization',
  'Control Deficiency Analysis',
  'GHG Variance Explanation',
  'Disclosure Gap Analysis',
  'Materiality Assessment Assistance',
  'Findings Drafting',
  'Management Action Recommendations',
  'Audit Report Narrative Assistance',
  'Methodology Question Answering',
];

export const AiCopilotPage: React.FC = () => {
  const {
    engagements,
    activeEngagementId,
    assertions,
    controls,
    evidence,
    ghgRecalculations,
    emissionActivities,
    auditFindings,
    disclosureMappings,
    financialMateriality,
    impactMateriality,
    aiAuditResponses,
    runAiAuditCopilotTask,
    applyAiDraftToWorkpaper,
    activeActor,
  } = useWorkbench();

  const [selectedTask, setSelectedTask] = useState<AiAuditTaskType>('Audit Procedure Drafting');
  const [userQuestion, setUserQuestion] = useState<string>(
    AI_TASK_DESCRIPTIONS['Audit Procedure Drafting'].defaultPrompt
  );
  const [methodologyContext, setMethodologyContext] = useState<string>(
    AI_TASK_DESCRIPTIONS['Audit Procedure Drafting'].methodologyStandard
  );
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    severity: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [humanConfirmedMap, setHumanConfirmedMap] = useState<Record<string, boolean>>({});

  const activeEngagement = useMemo(
    () =>
      engagements.find((e) => e.engagementId === activeEngagementId) ?? engagements[0],
    [engagements, activeEngagementId]
  );

  // Build engagement-scoped selectable records
  const selectableRecords = useMemo(() => {
    if (!activeEngagement) return [];
    const engId = activeEngagement.engagementId;
    const items: Array<{ id: string; category: string; label: string }> = [];

    for (const a of assertions.filter((x) => x.engagementId === engId).slice(0, 12)) {
      items.push({
        id: a.assertionId,
        category: 'ESG Assertion',
        label: `${a.assertionId} · ${a.metricCode} (${a.reportedValue ?? 'NULL'} ${a.unit} | ${a.valueBasis})`,
      });
    }
    for (const c of controls.filter((x) => x.engagementId === engId).slice(0, 8)) {
      items.push({
        id: c.controlId,
        category: 'Internal Control',
        label: `${c.controlId} · ${c.controlCode} (${c.operatingStatus})`,
      });
    }
    const engActivityIds = new Set(
      emissionActivities.filter((x) => x.engagementId === engId).map((x) => x.activityId)
    );
    for (const r of ghgRecalculations.filter((x) => engActivityIds.has(x.activityId)).slice(0, 8)) {
      items.push({
        id: r.recalculationId,
        category: 'GHG Recalculation',
        label: `${r.recalculationId} · Calc ${r.calculatedEmissions} vs Rep ${r.reportedEmissions} tCO2e (${r.varianceStatus})`,
      });
    }
    for (const f of auditFindings.filter((x) => x.engagementId === engId).slice(0, 8)) {
      items.push({
        id: f.auditFindingId,
        category: 'Audit Finding',
        label: `${f.auditFindingId} · [${f.severity}] ${f.findingType} (${f.remediationStatus})`,
      });
    }
    for (const m of disclosureMappings.filter((x) => x.engagementId === engId).slice(0, 8)) {
      items.push({
        id: m.mappingId,
        category: 'Disclosure Mapping',
        label: `${m.mappingId} · Req ${m.requirementId} (${m.mappingStatus} — ${m.coveragePercentage}%)`,
      });
    }
    for (const fm of financialMateriality.filter((x) => x.engagementId === engId).slice(0, 6)) {
      items.push({
        id: fm.assessmentId,
        category: 'Financial Materiality',
        label: `${fm.assessmentId} · ${fm.esgTopic} (Score=${fm.financialMaterialityScore})`,
      });
    }
    for (const im of impactMateriality.filter((x) => x.engagementId === engId).slice(0, 6)) {
      items.push({
        id: im.impactAssessmentId,
        category: 'Impact Materiality',
        label: `${im.impactAssessmentId} · ${im.esgTopic} [${im.impactType}] (Score=${im.impactMaterialityScore})`,
      });
    }
    for (const ev of evidence.filter((x) => x.engagementId === engId).slice(0, 8)) {
      items.push({
        id: ev.evidenceId,
        category: 'Evidence Record',
        label: `${ev.evidenceId} · ${ev.documentName} (${ev.verificationStatus})`,
      });
    }
    return items;
  }, [
    activeEngagement,
    assertions,
    controls,
    emissionActivities,
    ghgRecalculations,
    auditFindings,
    disclosureMappings,
    financialMateriality,
    impactMateriality,
    evidence,
  ]);

  const handleTaskChange = (nextTask: AiAuditTaskType) => {
    setSelectedTask(nextTask);
    setUserQuestion(AI_TASK_DESCRIPTIONS[nextTask].defaultPrompt);
    setMethodologyContext(AI_TASK_DESCRIPTIONS[nextTask].methodologyStandard);
  };

  const handleSelectRecommendedRecords = () => {
    const autoIds = selectableRecords.slice(0, 4).map((r) => r.id);
    setSelectedRecordIds(autoIds);
  };

  const handleExecuteCopilot = async () => {
    if (!activeEngagement) return;
    setRunning(true);
    setStatusMessage(null);
    try {
      const { response } = await runAiAuditCopilotTask({
        engagementId: activeEngagement.engagementId,
        taskType: selectedTask,
        selectedRecordIds,
        userQuestion,
        methodologyContext,
      });
      setStatusMessage({
        severity:
          response.validationStatus === 'Blocked — Prompt Injection or Scope Violation'
            ? 'error'
            : response.validationStatus === 'Insufficient Evidence Flagged'
              ? 'warning'
              : 'success',
        text: `Generated AI Audit Copilot response ${response.responseId} via ${response.modelId} (${response.validationStatus}).`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        severity: 'error',
        text: err instanceof Error ? err.message : 'Failed to execute AI Audit Copilot task.',
      });
    } finally {
      setRunning(false);
    }
  };

  const handleApplyDraft = async (
    responseId: string,
    targetEntityType: 'AuditProcedureDraft' | 'AuditFindingDraft'
  ) => {
    const confirmed = Boolean(humanConfirmedMap[responseId]);
    try {
      const res = await applyAiDraftToWorkpaper({
        responseId,
        targetEntityType,
        humanConfirmedReview: confirmed,
      });
      setStatusMessage({
        severity: 'success',
        text: `Human-reviewed AI draft ${responseId} saved to controlled workpapers as ${res.createdEntityId} by ${activeActor}.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        severity: 'error',
        text: err instanceof Error ? err.message : 'Failed to apply AI draft.',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background:
            'linear-gradient(135deg, rgba(18, 48, 71, 0.96) 0%, rgba(8, 127, 140, 0.92) 100%)',
          color: '#FFFFFF',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
              <PsychologyOutlined sx={{ fontSize: 22, color: '#80DEEA' }} />
              <Typography
                variant="overline"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.08em',
                  color: '#80DEEA',
                  fontWeight: 700,
                }}
              >
                PHASE 4 · MODULE A &amp; B · SERVER-SIDE GEMINI AI AUDIT COPILOT
              </Typography>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              Evidence-Grounded AI Audit Copilot &amp; 5-Zone Security Guardrails
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.84)', mt: 0.5 }}>
              Engagement-scoped retrieval across 10 assurance capabilities with citation verification,
              prompt-injection neutralization, deterministic offline fallback, and mandatory human
              approval gates.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Chip
              icon={<SecurityOutlined sx={{ color: '#FFFFFF !important' }} />}
              label="Zone 1–5 Threat Controls Active"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.16)',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <Chip
              icon={<VerifiedUserOutlined sx={{ color: '#FFFFFF !important' }} />}
              label="Human 4-Eyes Gate Enforced"
              size="small"
              sx={{
                bgcolor: 'rgba(22, 160, 133, 0.35)',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {statusMessage && (
        <Alert
          severity={statusMessage.severity}
          onClose={() => setStatusMessage(null)}
          sx={{ borderRadius: 2 }}
        >
          {statusMessage.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Copilot Task Configuration & Grounding Scope Selector */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Configure Engagement-Grounded Copilot Request
              </Typography>

              <Alert severity="info" icon={<GppGoodOutlined fontSize="small" />}>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
                  <strong>Active Engagement Boundary:</strong>{' '}
                  {activeEngagement?.engagementId} — {activeEngagement?.engagementName} (
                  {activeEngagement?.reportingYear}). Cross-engagement record access is blocked by
                  Zone 4 isolation.
                </Typography>
              </Alert>

              <FormControl fullWidth size="small">
                <InputLabel id="ai-task-select-label">AI Copilot Capability (10 Tasks)</InputLabel>
                <Select
                  labelId="ai-task-select-label"
                  id="ai-task-select"
                  label="AI Copilot Capability (10 Tasks)"
                  value={selectedTask}
                  onChange={(e) => handleTaskChange(e.target.value as AiAuditTaskType)}
                >
                  {ALL_TASK_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {AI_TASK_DESCRIPTIONS[t].title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="caption" color="text.secondary">
                {AI_TASK_DESCRIPTIONS[selectedTask].description}
              </Typography>

              <TextField
                label="Methodology Standard & Criteria Context"
                size="small"
                fullWidth
                value={methodologyContext}
                onChange={(e) => setMethodologyContext(e.target.value)}
              />

              <Box>
                <Stack
                  direction="row"
                  sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    GROUNDED ENGAGEMENT RECORDS ({selectedRecordIds.length} SELECTED)
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSelectRecommendedRecords}
                    >
                      Auto-Select 4 Records
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => setSelectedRecordIds([])}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>

                <FormControl fullWidth size="small">
                  <InputLabel id="ai-grounding-records-label">
                    Select Grounding Source Records ({selectableRecords.length} available)
                  </InputLabel>
                  <Select
                    labelId="ai-grounding-records-label"
                    id="ai-grounding-records-select"
                    multiple
                    label={`Select Grounding Source Records (${selectableRecords.length} available)`}
                    value={selectedRecordIds}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedRecordIds(typeof val === 'string' ? val.split(',') : val);
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((id) => (
                          <Chip
                            key={id}
                            label={id}
                            size="small"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {selectableRecords.map((rec) => (
                      <MenuItem key={rec.id} value={rec.id}>
                        <Checkbox checked={selectedRecordIds.includes(rec.id)} size="small" />
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700,
                              display: 'block',
                            }}
                          >
                            [{rec.category}] {rec.id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {rec.label}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Auditor Question / Drafting Objective"
                multiline
                minRows={3}
                fullWidth
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                helperText="All prompts and grounded records pass through Zone 1 & Zone 2 prompt-injection sanitization."
              />

              <Button
                variant="contained"
                color="primary"
                startIcon={<AutoAwesomeOutlined />}
                disabled={running}
                onClick={() => void handleExecuteCopilot()}
                sx={{ py: 1.2, fontWeight: 700 }}
              >
                {running
                  ? 'Synthesizing Grounded Draft...'
                  : 'Generate Grounded AI Audit Draft'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Generated AI Responses, Fact Classification & Human Review Gate */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                AI Audit Copilot Workpaper Ledger ({aiAuditResponses.length})
              </Typography>
              <Chip
                label={MANDATORY_AI_REVIEW_LABEL}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {aiAuditResponses.length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: 2, p: 4, textAlign: 'center' }}>
                <PsychologyOutlined sx={{ fontSize: 42, color: 'text.secondary', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  No AI Audit Copilot Drafts Generated Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                  Select one of the 10 ESG audit capabilities on the left, pick grounding records from{' '}
                  {activeEngagement?.engagementId}, and click &ldquo;Generate Grounded AI Audit Draft&rdquo;.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    handleSelectRecommendedRecords();
                  }}
                >
                  Preload Sample Engagement Records
                </Button>
              </Card>
            ) : (
              aiAuditResponses.map((res) => {
                const isBlocked =
                  res.validationStatus === 'Blocked — Prompt Injection or Scope Violation';
                const isInsufficient =
                  res.validationStatus === 'Insufficient Evidence Flagged';

                return (
                  <Card
                    key={res.responseId}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: isBlocked
                        ? 'error.main'
                        : isInsufficient
                          ? 'warning.main'
                          : 'divider',
                    }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700,
                              color: 'text.secondary',
                            }}
                          >
                            {res.responseId} · REQ {res.requestId} · {res.engagementId} · MODEL:{' '}
                            {res.modelId}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {res.taskType}
                          </Typography>
                        </Box>
                        <Chip
                          icon={
                            isBlocked || isInsufficient ? (
                              <WarningAmberOutlined fontSize="small" />
                            ) : (
                              <CheckCircleOutlined fontSize="small" />
                            )
                          }
                          label={res.validationStatus}
                          size="small"
                          color={
                            isBlocked ? 'error' : isInsufficient ? 'warning' : 'success'
                          }
                        />
                      </Stack>

                      {/* Mandatory AI Review Label Banner */}
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {res.mandatoryReviewLabel}
                        </Typography>
                      </Alert>

                      {/* Generated Narrative */}
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: 'action.hover',
                          borderRadius: 1.5,
                          whiteSpace: 'pre-wrap',
                          fontFamily: "'Public Sans', sans-serif",
                          fontSize: '0.84rem',
                          lineHeight: 1.55,
                        }}
                      >
                        {res.generatedContent}
                      </Paper>

                      {/* Grounded Citations & Evidence References */}
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, mr: 1 }}>
                          Grounded Source IDs ({res.sourceRecordIds.length}):
                        </Typography>
                        {res.sourceRecordIds.length === 0 ? (
                          <Chip label="None Selected" size="small" variant="outlined" />
                        ) : (
                          res.sourceRecordIds.map((id) => (
                            <Chip
                              key={id}
                              label={id}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.7rem',
                              }}
                            />
                          ))
                        )}
                        {res.evidenceReferences.map((evId) => (
                          <Chip
                            key={evId}
                            label={`Evidence: ${evId}`}
                            size="small"
                            color="secondary"
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.7rem',
                            }}
                          />
                        ))}
                      </Stack>

                      {/* 5-Category Fact Classification */}
                      {res.factClassification && (
                        <Box
                          sx={{
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, display: 'block', mb: 1 }}
                          >
                            FACT &amp; EPISTEMIC BOUNDARY CLASSIFICATION (MODULE A SECTION 5)
                          </Typography>
                          <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                1. Verified Application Data:
                              </Typography>
                              {res.factClassification.verifiedApplicationData.slice(0, 3).map((item, idx) => (
                                <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                  • {item}
                                </Typography>
                              ))}
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                5. Missing / Unverified Information:
                              </Typography>
                              {res.factClassification.missingOrUnverifiedInformation.map((item, idx) => (
                                <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                  • {item}
                                </Typography>
                              ))}
                            </Grid>
                          </Grid>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary">
                        <strong>Limitations &amp; Guardrails:</strong> {res.limitations}
                      </Typography>

                      <Divider />

                      {/* Human-in-the-Loop Workpaper Application Gate */}
                      {res.humanReviewedAndApplied ? (
                        <Alert severity="success" icon={<PlaylistAddCheckOutlined fontSize="small" />}>
                          <Typography variant="caption">
                            <strong>Human Review Completed:</strong> Applied to workpaper{' '}
                            <code>{res.appliedTargetRecordId}</code> by {res.appliedByActor} at{' '}
                            {res.appliedAt?.slice(0, 19).replace('T', ' ')}.
                          </Typography>
                        </Alert>
                      ) : (
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={Boolean(humanConfirmedMap[res.responseId])}
                                disabled={isBlocked}
                                onChange={(e) =>
                                  setHumanConfirmedMap((prev) => ({
                                    ...prev,
                                    [res.responseId]: e.target.checked,
                                  }))
                                }
                              />
                            }
                            label={
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                I have professionally reviewed this AI draft ({activeActor})
                              </Typography>
                            }
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={isBlocked || !humanConfirmedMap[res.responseId]}
                              onClick={() =>
                                void handleApplyDraft(res.responseId, 'AuditProcedureDraft')
                              }
                            >
                              Save as Planned Procedure
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="secondary"
                              disabled={isBlocked || !humanConfirmedMap[res.responseId]}
                              onClick={() =>
                                void handleApplyDraft(res.responseId, 'AuditFindingDraft')
                              }
                            >
                              Save as Open Finding Draft
                            </Button>
                          </Stack>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
