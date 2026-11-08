import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { RestartAltOutlined } from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import { VALIDATION_RULE_DEFINITIONS } from '../validation/dqEngine';
import { ENGAGEMENT_PROGRESS_WEIGHTS } from '../methodology/readinessCalculator';

export const SettingsMethodologyPage: React.FC = () => {
  const {
    activeActor,
    setActiveActor,
    themeMode,
    toggleThemeMode,
    resetDemoDataset,
    metrics,
  } = useWorkbench();

  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetDemo = async () => {
    await resetDemoDataset();
    setResetMessage(
      'Synthetic dataset for Asterion Manufacturing Ltd. has been deterministically restored to baseline (3 engagements, 5 facilities, 60 assertions, 25 controls, 40 metadata records, 15 DQ findings, 100 audit events).'
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Active Session & Environment Controls */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Settings, Assurance Readiness Methodology &amp; Governance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Configure active reviewer attribution, theme persistence, deterministic seed restoration,
          and inspect formal equations governing operational readiness metrics.
        </Typography>

        {resetMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResetMessage(null)}>
            {resetMessage}
          </Alert>
        )}

        <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="settings-actor-label">Active Audit Reviewer Identity</InputLabel>
              <Select
                labelId="settings-actor-label"
                label="Active Audit Reviewer Identity"
                value={activeActor}
                onChange={(e) => setActiveActor(e.target.value)}
              >
                <MenuItem value="Martina Bergmann (Corporate Sustainability Controller)">
                  Martina Bergmann (Corporate Sustainability Controller)
                </MenuItem>
                <MenuItem value="Dr. Lukas Weber (Head of Energy Engineering)">
                  Dr. Lukas Weber (Head of Energy Engineering)
                </MenuItem>
                <MenuItem value="Sabine Hartmann (VP Human Resources)">
                  Sabine Hartmann (VP Human Resources)
                </MenuItem>
                <MenuItem value="Dr. Elena Rostova (General Counsel & Chief Compliance Officer)">
                  Dr. Elena Rostova (General Counsel &amp; Chief Compliance Officer)
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => void toggleThemeMode()}>
              Switch to {themeMode === 'light' ? 'Dark' : 'Light'} Theme (Current: {themeMode})
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAltOutlined />}
              onClick={() => void handleResetDemo()}
              data-testid="btn-reset-seed"
            >
              Restore Deterministic Seed Dataset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Section 12: Assurance Readiness Methodology & Denominator Exclusions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Assurance Readiness Operational Indicators &amp; Denominator Exclusions
        </Typography>
        <Alert severity="info" sx={{ mb: 2.5 }}>
          <strong>Important Distinction:</strong> Evidence availability coverage measures whether a
          logged reference or uploaded file is linked to an assertion. It does{' '}
          <strong>not</strong> establish evidence sufficiency or appropriateness under ISAE 3000 or
          ISSA 5000, nor does engagement progress represent an audit quality score or assurance
          opinion.
        </Alert>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  FORMULA 01 · ASSERTION REVIEW COVERAGE
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700 }}>
                  Reviewed Assertions / Applicable Assertions × 100
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Denominator Exclusion:</strong> Explicitly excludes{' '}
                  <code>Archived</code> assertions and assertions with{' '}
                  <code>valueBasis === &quot;Not Applicable&quot;</code> (currently{' '}
                  {metrics.excludedNotApplicableAssertionsCount} N/A assertions excluded).
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  FORMULA 02 · CONTROL DOCUMENTATION COVERAGE
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700 }}>
                  Controls with Complete Documentation / Applicable Controls × 100
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Criteria:</strong> Counts internal controls where{' '}
                  <code>designStatus === &quot;Documented&quot;</code>. Does not imply operating
                  effectiveness prior to Phase 2 sample testing.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  FORMULA 03 · EVIDENCE COVERAGE
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700 }}>
                  Assertions with Required Available Evidence / Assertions Requiring Evidence × 100
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Denominator Exclusion:</strong> Excludes assertions where{' '}
                  <code>requiresEvidence === false</code> or{' '}
                  <code>valueBasis === &quot;Not Applicable&quot;</code>. Rejected evidence records
                  are excluded from the numerator.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                >
                  FORMULA 04 · EVIDENCE ACCEPTANCE RATE
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700 }}>
                  Accepted Evidence Records / Reviewed Evidence Records × 100
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Denominator Exclusion:</strong> Excludes unreviewed uploads (
                  <code>Uploaded - Pending Review</code>) and synthetic metadata-only demonstration
                  references (<code>isMetadataOnlyDemo === true</code>).
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="subtitle1" gutterBottom>
          Documented Weighted Engagement Progress Model
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Weighted Operational Completion ={' '}
          <code>
            {ENGAGEMENT_PROGRESS_WEIGHTS.scopeDefinition * 100}% Scope Definition +{' '}
            {ENGAGEMENT_PROGRESS_WEIGHTS.assertionReview * 100}% Assertion Review Coverage +{' '}
            {ENGAGEMENT_PROGRESS_WEIGHTS.controlDocumentation * 100}% Control Documentation Coverage
            + {ENGAGEMENT_PROGRESS_WEIGHTS.evidenceReview * 100}% Evidence Review Blend
          </code>
        </Typography>
      </Paper>

      {/* Deterministic Data Quality Rules Reference (DQ-01..DQ-10) */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Deterministic Data Quality Rule Catalog (DQ-01 to DQ-10)
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rule ID</TableCell>
                <TableCell>Rule Title</TableCell>
                <TableCell>Default Severity</TableCell>
                <TableCell>Deterministic Specification</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(VALIDATION_RULE_DEFINITIONS).map(([ruleId, def]) => (
                <TableRow key={ruleId}>
                  <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {ruleId}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{def.title}</TableCell>
                  <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {def.defaultSeverity}
                  </TableCell>
                  <TableCell>{def.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
