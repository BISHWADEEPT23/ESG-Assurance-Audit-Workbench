import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoAwesomeOutlined,
  CheckCircleOutlined,
  ConstructionOutlined,
  PlayArrowOutlined,
  SyncOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import { VALIDATION_RULE_DEFINITIONS } from '../validation/dqEngine';

interface FuturePhaseProps {
  moduleId: string;
  title: string;
  subtitle: string;
  plannedCapabilities: string[];
  phaseTarget: string;
}

export const FuturePhasePlaceholderPage: React.FC<FuturePhaseProps> = ({
  moduleId,
  title,
  subtitle,
  plannedCapabilities,
  phaseTarget,
}) => {
  const {
    filteredData,
    metrics,
    resolveFinding,
    triggerDeterministicRevalidation,
  } = useWorkbench();

  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [revalidating, setRevalidating] = useState(false);
  const [revalMessage, setRevalMessage] = useState<string | null>(null);

  // Optional Server-Side Gemini Advisory Preview for AI Audit Assistant
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);

  const handleRevalidate = async () => {
    setRevalidating(true);
    const updated = await triggerDeterministicRevalidation();
    const reopenedCount = updated.filter((f) => f.status === 'Reopened').length;
    setRevalMessage(
      `Deterministic revalidation complete across DQ-01..DQ-10. ${updated.filter((f) => f.status !== 'Resolved').length} active findings (${reopenedCount} reopened because underlying defect still persists).`
    );
    setRevalidating(false);
  };

  const handleRequestAiBrief = async () => {
    setAiLoading(true);
    setAiBrief(null);
    try {
      const response = await fetch('/api/audit-assistant/readiness-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementName:
            filteredData.engagements[0]?.engagementName ?? 'Consolidated Asterion Scope',
          openFindingsCount: metrics.openFindingsCount,
          assertionCoverage: metrics.assertionReviewCoveragePct,
          evidenceCoverage: metrics.evidenceCoveragePct,
        }),
      });
      const payload = await response.json();
      setAiBrief(payload.brief || payload.fallbackBrief || 'No advisory returned.');
      setAiModel(payload.modelUsed || 'Fallback Deterministic Advisory');
    } catch {
      setAiBrief(
        'Server-side AI endpoint unreachable. Refer to deterministic DQ-01..DQ-10 findings in the table.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <ConstructionOutlined color="secondary" />
          <Typography
            variant="caption"
            sx={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              color: 'secondary.main',
            }}
          >
            {phaseTarget.toUpperCase()} — ARCHITECTURAL BOUNDARY
          </Typography>
        </Box>
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 850, mb: 2.5 }}>
          {subtitle}
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Phase 1 Implementation Boundary:</strong> Full workflow automation for{' '}
          <strong>{title}</strong> is scheduled for {phaseTarget}. No fabricated or fake workflow
          states are shown here. Use the active Phase 1 modules (Executive Dashboard, Engagement
          Management, ESG Assertions, Control Library, Evidence Register, Audit Trail, and Settings
          &amp; Methodology) for all persistent assurance-readiness operations.
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          Planned {phaseTarget} Specifications:
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {plannedCapabilities.map((cap, idx) => (
            <Grid size={{ xs: 12, md: 6 }} key={idx}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ py: 1.75 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}
                  >
                    SPEC-0{idx + 1}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {cap}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* For Findings & Remediation route, also provide live access to the Phase 1 Deterministic Validation Engine (DQ-01..DQ-10) */}
      {moduleId === 'findings-remediation' && (
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6">
                Phase 1 Active Engine: Deterministic Data Quality Findings (DQ-01 to DQ-10)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Per Section 11: Marking a finding resolved without fixing the underlying assertion or
                control defect will NOT bypass validation—running Revalidation will automatically
                reopen unresolved defects.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SyncOutlined />}
              onClick={() => void handleRevalidate()}
              disabled={revalidating}
            >
              {revalidating ? 'Revalidating...' : 'Run Deterministic Revalidation'}
            </Button>
          </Box>

          {revalMessage && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setRevalMessage(null)}>
              {revalMessage}
            </Alert>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Finding ID</TableCell>
                  <TableCell>Rule</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Entity Ref</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Resolution Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.findings.map((f) => (
                  <TableRow key={f.findingId} hover>
                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                      {f.findingId}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {f.ruleId} — {VALIDATION_RULE_DEFINITIONS[f.ruleId]?.title}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color:
                            f.severity === 'High'
                              ? 'error.main'
                              : f.severity === 'Medium'
                                ? 'warning.main'
                                : 'text.secondary',
                        }}
                      >
                        {f.severity}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                      {f.linkedEntityId}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 340 }}>{f.description}</TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          color:
                            f.status === 'Resolved'
                              ? 'success.main'
                              : f.status === 'Reopened'
                                ? 'error.main'
                                : 'warning.main',
                        }}
                      >
                        {f.status}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {f.status !== 'Resolved' ? (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <TextField
                            size="small"
                            placeholder="Resolution note..."
                            value={resolutionNotes[f.findingId] ?? ''}
                            onChange={(e) =>
                              setResolutionNotes((prev) => ({
                                ...prev,
                                [f.findingId]: e.target.value,
                              }))
                            }
                            sx={{ width: 160 }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CheckCircleOutlined fontSize="small" />}
                            onClick={() =>
                              void resolveFinding(
                                f.findingId,
                                resolutionNotes[f.findingId] || 'Reviewer marked resolved'
                              )
                            }
                          >
                            Resolve
                          </Button>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {f.resolutionNote || 'Marked Resolved (Re-run DQ to verify fix)'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* For AI Audit Assistant route, provide server-side Gemini proxy readiness brief preview */}
      {moduleId === 'ai-assistant' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Server-Side Gemini API Proxy Readiness Brief (Preview)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Communicates exclusively via the Express backend route{' '}
            <code>POST /api/audit-assistant/readiness-brief</code> using the resilient model
            fallback ladder (<code>gemini-3.6-flash</code> → <code>gemini-3.1-flash-lite</code> →{' '}
            <code>gemini-flash-latest</code> → <code>gemini-3.7-flash</code>). No API keys are
            exposed to the browser.
          </Typography>
          <Button
            variant="contained"
            startIcon={
              aiLoading ? <CircularProgress size={16} color="inherit" /> : <PlayArrowOutlined />
            }
            onClick={() => void handleRequestAiBrief()}
            disabled={aiLoading}
          >
            Generate Advisory Readiness Brief
          </Button>
          {aiBrief && (
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AutoAwesomeOutlined fontSize="small" color="secondary" />
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
                >
                  Model: {aiModel} · Internal Advisory Only (Non-Opinion)
                </Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {aiBrief}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
