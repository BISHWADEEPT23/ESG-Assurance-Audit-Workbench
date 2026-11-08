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
  FormGroup,
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
import {
  AddTaskOutlined as AddTaskOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  DownloadOutlined as DownloadOutlinedIcon,
  GppGoodOutlined as GppGoodOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
  PictureAsPdfOutlined as PictureAsPdfOutlinedIcon,
  TableChartOutlined as TableChartOutlinedIcon,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  AssuranceReportReviewStatus,
  AssuranceReportType,
} from '../types/domain';
import {
  MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER,
  verifyFrozenReportSnapshotIntegrity,
} from '../services/assuranceReportingEngine';
import { CsvExportCategory } from '../services/exportEngine';

const ALL_REPORT_TYPES: AssuranceReportType[] = [
  'ESG Audit Readiness Report',
  'GHG Verification Readiness Report',
  'Internal Control Testing Summary',
  'Evidence Coverage Report',
  'Findings & Remediation Report',
  'Disclosure Traceability Report',
  'Management Action Summary',
];

const DEFAULT_SECTION_IDS = [
  'SEC-01-EXEC-SUMMARY',
  'SEC-02-ENGAGEMENT-INFO',
  'SEC-03-CRITERIA-METHODOLOGY',
  'SEC-04-WORK-PERFORMED-TESTING',
  'SEC-05-EVIDENCE-REVIEWED',
  'SEC-06-GHG-RECALCULATION',
  'SEC-07-FINDINGS-EXCEPTIONS',
  'SEC-08-DISCLOSURE-TRACEABILITY',
];

export const AssuranceReportsPage: React.FC = () => {
  const {
    assuranceReports,
    reportSnapshots,
    activeEngagementId,
    activeActor,
    generateAndFreezeAssuranceReport,
    updateAssuranceReportStatus,
    exportReportSnapshot,
  } = useWorkbench();

  const [selectedReportType, setSelectedReportType] = useState<AssuranceReportType>(
    'ESG Audit Readiness Report'
  );
  const [includedSectionIds, setIncludedSectionIds] = useState<string[]>(DEFAULT_SECTION_IDS);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [csvCategory, setCsvCategory] = useState<CsvExportCategory>('disclosure-mappings');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSnapshot = useMemo(() => {
    if (selectedSnapshotId) {
      const found = reportSnapshots.find((s) => s.snapshotId === selectedSnapshotId);
      if (found) return found;
    }
    return (
      reportSnapshots.find((s) => s.engagementId === activeEngagementId) ??
      reportSnapshots[0] ??
      null
    );
  }, [reportSnapshots, selectedSnapshotId, activeEngagementId]);

  const activeReport = useMemo(() => {
    if (!activeSnapshot) return null;
    return (
      assuranceReports.find((r) => r.reportId === activeSnapshot.reportId) ??
      activeSnapshot.reportData
    );
  }, [assuranceReports, activeSnapshot]);

  const integrityVerification = useMemo(() => {
    if (!activeSnapshot) return null;
    return verifyFrozenReportSnapshotIntegrity(activeSnapshot);
  }, [activeSnapshot]);

  const handleToggleSection = (sectionId: string) => {
    setIncludedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleGenerateSnapshot = async () => {
    try {
      setErrorMsg(null);
      const res = await generateAndFreezeAssuranceReport({
        engagementId: activeEngagementId,
        reportType: selectedReportType,
        includedSectionIds,
      });
      setSelectedSnapshotId(res.snapshot.snapshotId);
      setFeedback(
        `Frozen new ${res.report.reportType} snapshot (${res.snapshot.snapshotId} | Hash: ${res.snapshot.reportSnapshotHash.slice(0, 16)}...).`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate assurance report.');
    }
  };

  const handleStatusTransition = async (nextStatus: AssuranceReportReviewStatus) => {
    if (!activeReport) return;
    try {
      setErrorMsg(null);
      const updated = await updateAssuranceReportStatus({
        reportId: activeReport.reportId,
        nextStatus,
      });
      setFeedback(`Updated report ${updated.reportId} status to "${updated.reviewStatus}".`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Report status transition rejected.');
    }
  };

  const handleExport = (format: 'pdf' | 'xlsx' | 'csv' | 'json') => {
    if (!activeSnapshot) return;
    try {
      setErrorMsg(null);
      const res = exportReportSnapshot({
        snapshotId: activeSnapshot.snapshotId,
        format,
        csvCategory,
      });
      setFeedback(
        `Exported ${format.toUpperCase()} package "${res.filename}" (${res.byteLength.toLocaleString()} bytes) from frozen snapshot ${activeSnapshot.snapshotId}.`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed.');
    }
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
            Assurance Reporting &amp; Multi-Format Export Engine
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deterministic Report Builder, Immutable Frozen Snapshots, SHA-256 Content Hashing &amp; Synchronized PDF / XLSX / CSV / JSON Exports
          </Typography>
        </Box>
        {activeSnapshot && (
          <Chip
            icon={<LockOutlinedIcon />}
            color="primary"
            label={`Active Snapshot: ${activeSnapshot.snapshotId} (v${activeReport?.versionNumber ?? 1})`}
            sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
          />
        )}
      </Box>

      {/* Mandatory Non-Opinion Assurance Disclaimer Banner */}
      <Alert severity="warning" sx={{ mb: 2.5 }}>
        <strong>Mandatory Assurance-Readiness Disclaimer:</strong>{' '}
        {MANDATORY_INTERNAL_ASSURANCE_DISCLAIMER}
      </Alert>

      {feedback && (
        <Alert severity="success" onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Report Generator & Multi-Format Export Controls */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                1. Configure &amp; Freeze New Report Snapshot
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Assurance Report Type (7 Supported Types)</InputLabel>
                    <Select
                      label="Assurance Report Type (7 Supported Types)"
                      value={selectedReportType}
                      onChange={(e) =>
                        setSelectedReportType(e.target.value as AssuranceReportType)
                      }
                    >
                      {ALL_REPORT_TYPES.map((rt) => (
                        <MenuItem key={rt} value={rt}>
                          {rt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    INCLUDED REPORT SECTIONS:
                  </Typography>
                  <FormGroup row sx={{ mt: 0.5 }}>
                    {DEFAULT_SECTION_IDS.map((secId, idx) => (
                      <FormControlLabel
                        key={secId}
                        control={
                          <Checkbox
                            size="small"
                            checked={includedSectionIds.includes(secId)}
                            onChange={() => handleToggleSection(secId)}
                          />
                        }
                        label={
                          <Typography variant="caption">
                            Sec {idx + 1} ({secId.replace('SEC-0', '').slice(2)})
                          </Typography>
                        }
                      />
                    ))}
                  </FormGroup>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddTaskOutlinedIcon />}
                    onClick={() => void handleGenerateSnapshot()}
                  >
                    Generate &amp; Freeze Immutable Report Snapshot
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                2. Select Frozen Snapshot &amp; Export Synchronized Package
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 7 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Frozen Report Snapshot</InputLabel>
                    <Select
                      label="Frozen Report Snapshot"
                      value={activeSnapshot?.snapshotId ?? ''}
                      onChange={(e) => setSelectedSnapshotId(e.target.value)}
                    >
                      {reportSnapshots.map((s) => (
                        <MenuItem key={s.snapshotId} value={s.snapshotId}>
                          {s.snapshotId} — {s.reportType} ({s.engagementId})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>CSV Module Dataset</InputLabel>
                    <Select
                      label="CSV Module Dataset"
                      value={csvCategory}
                      onChange={(e) => setCsvCategory(e.target.value as CsvExportCategory)}
                    >
                      <MenuItem value="disclosure-mappings">Disclosure Mappings CSV</MenuItem>
                      <MenuItem value="testing-results">Control Testing Results CSV</MenuItem>
                      <MenuItem value="findings">Audit Findings CSV</MenuItem>
                      <MenuItem value="ghg-recalculations">GHG Recalculations CSV</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<PictureAsPdfOutlinedIcon />}
                      onClick={() => handleExport('pdf')}
                    >
                      Export PDF Report
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      startIcon={<TableChartOutlinedIcon />}
                      onClick={() => handleExport('xlsx')}
                    >
                      Export 8-Sheet XLSX
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadOutlinedIcon />}
                      onClick={() => handleExport('csv')}
                    >
                      Export Module CSV
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DescriptionOutlinedIcon />}
                      onClick={() => handleExport('json')}
                    >
                      Export Validated JSON
                    </Button>
                  </Box>
                </Grid>

                {activeReport && (
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        <strong>Status:</strong> {activeReport.reviewStatus} •{' '}
                        <strong>Prepared By:</strong> {activeReport.generatedBy.split('(')[0]}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={activeReport.reviewStatus !== 'Draft Snapshot'}
                          onClick={() =>
                            void handleStatusTransition('Submitted for Internal Review')
                          }
                        >
                          Submit for Review
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={
                            activeReport.reviewStatus !== 'Submitted for Internal Review'
                          }
                          onClick={() =>
                            void handleStatusTransition('Approved Internal Readiness Report')
                          }
                        >
                          Approve Report (4-Eyes)
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snapshot Hash Integrity & Preview */}
      {activeSnapshot && activeReport && (
        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {activeReport.reportType} — {activeReport.engagementId} ({activeReport.reportingPeriod})
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: 'JetBrains Mono, monospace', display: 'block', mt: 0.5 }}
                >
                  Snapshot Hash (SHA-256): {activeSnapshot.reportSnapshotHash} • Excluded Volatile Metadata:{' '}
                  [{activeSnapshot.excludedHashMetadataFields.join(', ')}]
                </Typography>
              </Box>
              {integrityVerification && (
                <Chip
                  icon={<GppGoodOutlinedIcon />}
                  color={integrityVerification.valid ? 'success' : 'error'}
                  label={
                    integrityVerification.valid
                      ? 'Snapshot Content Hash Verified (Bit-for-Bit Reproducible)'
                      : 'Snapshot Integrity Mismatch'
                  }
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {activeReport.reportSections
                .filter((sec) => sec.included)
                .sort((a, b) => a.sectionOrder - b.sectionOrder)
                .map((sec) => (
                  <Card key={sec.sectionId} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        {sec.sectionTitle}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {sec.narrativeSummary}
                      </Typography>

                      {sec.keyMetrics.length > 0 && (
                        <Grid container spacing={1.5} sx={{ mb: sec.tableRows ? 2 : 0 }}>
                          {sec.keyMetrics.map((m) => (
                            <Grid key={m.label} size={{ xs: 12, sm: 6, md: 3 }}>
                              <Paper variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {m.label}
                                </Typography>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 700,
                                    fontFamily: 'JetBrains Mono, monospace',
                                  }}
                                >
                                  {m.value}{' '}
                                  {m.unit && (
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      ({m.unit})
                                    </Typography>
                                  )}
                                </Typography>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      )}

                      {sec.tableHeaders && sec.tableRows && sec.tableRows.length > 0 && (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {sec.tableHeaders.map((h) => (
                                  <TableCell key={h} sx={{ fontWeight: 700 }}>
                                    {h}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {sec.tableRows.slice(0, 10).map((r, rIdx) => (
                                <TableRow key={rIdx}>
                                  {r.map((cell, cIdx) => (
                                    <TableCell
                                      key={cIdx}
                                      sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                                    >
                                      {cell === null || cell === undefined ? 'NULL' : String(cell)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
