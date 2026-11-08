import React, { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  BackupOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  ErrorOutlined,
  RestorePageOutlined,
  SecurityOutlined,
  StorageOutlined,
  UploadFileOutlined,
  VerifiedUserOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  BackupArchiveEnvelope,
  RestoreMode,
  RestoreValidationReport,
} from '../types/domain';
import { DB_VERSION, STORE_KEY_PATHS } from '../db/repository';

export const BackupRestorePage: React.FC = () => {
  const {
    engagements,
    activeEngagementId,
    backupManifests,
    createAndDownloadBackupArchive,
    validateBackupArchive,
    restoreFromBackupArchive,
    activeActor,
  } = useWorkbench();

  const [backupScope, setBackupScope] = useState<'Full Application' | 'Single Engagement'>(
    'Full Application'
  );
  const [selectedEngagementId, setSelectedEngagementId] = useState<string>(activeEngagementId);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('Merge');
  const [confirmDestructiveReplace, setConfirmDestructiveReplace] = useState<boolean>(false);

  const [stagedArchive, setStagedArchive] = useState<BackupArchiveEnvelope | null>(null);
  const [validationReport, setValidationReport] = useState<RestoreValidationReport | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [banner, setBanner] = useState<{
    severity: 'success' | 'warning' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleCreateBackup = async (downloadToBrowser: boolean) => {
    setBusy(true);
    setBanner(null);
    try {
      const { archive, filename } = await createAndDownloadBackupArchive({
        scope: backupScope,
        engagementId: backupScope === 'Single Engagement' ? selectedEngagementId : 'ALL',
        downloadToBrowser,
      });
      setStagedArchive(archive);
      const report = await validateBackupArchive(archive);
      setValidationReport(report);
      setBanner({
        severity: 'success',
        message: `Created ${backupScope} backup "${filename}" (Manifest ${archive.manifest.manifestId}, ${archive.manifest.binaryBlobCount} binary evidence blobs, SHA-256: ${archive.manifest.archiveChecksumSha256.slice(0, 16)}...).`,
      });
    } catch (err: unknown) {
      setBanner({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Failed to create backup archive.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUploadBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setBanner(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupArchiveEnvelope;
      setStagedArchive(parsed);
      const report = await validateBackupArchive(parsed);
      setValidationReport(report);
      setBanner({
        severity: report.valid ? 'info' : 'error',
        message: report.valid
          ? `Backup archive "${file.name}" validated (${report.totalRecordsToRestore} records, ${report.verifiedBinaryCount} verified binary blobs). Ready for ${restoreMode} restore.`
          : `Backup archive "${file.name}" failed validation: ${report.errors.join(' ')}`,
      });
    } catch (err: unknown) {
      setValidationReport(null);
      setBanner({
        severity: 'error',
        message:
          err instanceof Error
            ? `Invalid backup JSON file: ${err.message}`
            : 'Invalid backup JSON file.',
      });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleExecuteRestore = async () => {
    if (!stagedArchive) return;
    setBusy(true);
    setBanner(null);
    try {
      const report = await restoreFromBackupArchive({
        rawArchive: stagedArchive,
        mode: restoreMode,
        confirmDestructiveReplace,
      });
      setValidationReport(report);
      setBanner({
        severity: 'success',
        message: `Successfully executed transactional ${restoreMode} restore from manifest ${stagedArchive.manifest.manifestId} (${report.totalRecordsToRestore} records and ${report.verifiedBinaryCount} binary evidence files verified).`,
      });
    } catch (err: unknown) {
      setBanner({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Restore operation failed.',
      });
    } finally {
      setBusy(false);
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
            'linear-gradient(135deg, rgba(18, 48, 71, 0.96) 0%, rgba(22, 160, 133, 0.90) 100%)',
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
              <StorageOutlined sx={{ fontSize: 22, color: '#A7FFEB' }} />
              <Typography
                variant="overline"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.08em',
                  color: '#A7FFEB',
                  fontWeight: 700,
                }}
              >
                PHASE 4 · MODULE C &amp; D · DATA RESILIENCE, BACKUP &amp; SECURITY BOUNDARIES
              </Typography>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              IndexedDB v{DB_VERSION} Backup, Binary Evidence Restore &amp; Security Governance
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.86)', mt: 0.5 }}>
              Full-application and single-engagement backup archives across {STORE_KEY_PATHS.length}{' '}
              object stores with Base64 binary evidence blobs, SHA-256 checksum verification,
              conflict preview, and transactional Merge / Replace restoration.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Chip
              icon={<VerifiedUserOutlined sx={{ color: '#FFFFFF !important' }} />}
              label={`IndexedDB v${DB_VERSION} (${STORE_KEY_PATHS.length} Stores)`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <Chip
              icon={<SecurityOutlined sx={{ color: '#FFFFFF !important' }} />}
              label="SHA-256 Binary Integrity"
              size="small"
              sx={{
                bgcolor: 'rgba(0,0,0,0.25)',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {banner && (
        <Alert severity={banner.severity} onClose={() => setBanner(null)} sx={{ borderRadius: 2 }}>
          {banner.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Create Backup & Upload Restore Archive */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2.5}>
            {/* Create Backup Card */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  1. Generate Cryptographically Checksummed Backup Archive
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Exports all IndexedDB v{DB_VERSION} records, frozen report snapshots, audit trail
                  events, and uploaded binary evidence files (`evidenceBlobs`) with SHA-256
                  integrity manifests.
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel id="backup-scope-label">Backup Scope</InputLabel>
                  <Select
                    labelId="backup-scope-label"
                    id="backup-scope-select"
                    label="Backup Scope"
                    value={backupScope}
                    onChange={(e) =>
                      setBackupScope(
                        e.target.value as 'Full Application' | 'Single Engagement'
                      )
                    }
                  >
                    <MenuItem value="Full Application">
                      Full Application Backup (All {STORE_KEY_PATHS.length} Object Stores &amp; Binary Blobs)
                    </MenuItem>
                    <MenuItem value="Single Engagement">
                      Single Engagement Backup (Scoped Workpapers &amp; Linked Binary Blobs)
                    </MenuItem>
                  </Select>
                </FormControl>

                {backupScope === 'Single Engagement' && (
                  <FormControl fullWidth size="small">
                    <InputLabel id="backup-eng-label">Target Engagement</InputLabel>
                    <Select
                      labelId="backup-eng-label"
                      id="backup-eng-select"
                      label="Target Engagement"
                      value={selectedEngagementId}
                      onChange={(e) => setSelectedEngagementId(e.target.value)}
                    >
                      {engagements.map((eng) => (
                        <MenuItem key={eng.engagementId} value={eng.engagementId}>
                          {eng.engagementId} — {eng.engagementName} ({eng.reportingYear})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CloudDownloadOutlined />}
                    disabled={busy}
                    onClick={() => void handleCreateBackup(true)}
                    sx={{ flex: 1 }}
                  >
                    Export &amp; Download Backup (.json)
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<BackupOutlined />}
                    disabled={busy}
                    onClick={() => void handleCreateBackup(false)}
                  >
                    Stage Snapshot for Preview
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Restore Archive Card */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  2. Validate &amp; Restore Backup Archive
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Every archive is verified for schema compatibility, archive SHA-256 digest, binary
                  blob SHA-256 checksums, and referential integrity before modifying local data.
                </Typography>

                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileOutlined />}
                  disabled={busy}
                >
                  Load Backup Archive File (.json)
                  <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => void handleUploadBackupFile(e)}
                  />
                </Button>

                <FormControl fullWidth size="small">
                  <InputLabel id="restore-mode-label">Restore Execution Mode</InputLabel>
                  <Select
                    labelId="restore-mode-label"
                    id="restore-mode-select"
                    label="Restore Execution Mode"
                    value={restoreMode}
                    onChange={(e) => {
                      setRestoreMode(e.target.value as RestoreMode);
                      setConfirmDestructiveReplace(false);
                    }}
                  >
                    <MenuItem value="Merge">
                      Merge Mode (Non-Destructive — Updates matching IDs &amp; preserves other records)
                    </MenuItem>
                    <MenuItem value="Replace">
                      Replace Mode (Destructive — Clears stores &amp; restores exact archive snapshot)
                    </MenuItem>
                  </Select>
                </FormControl>

                {restoreMode === 'Replace' && (
                  <Alert severity="warning">
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={confirmDestructiveReplace}
                          onChange={(e) => setConfirmDestructiveReplace(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          I confirm destructive Replace mode ({activeActor}): existing local stores
                          will be cleared and replaced by the validated backup archive.
                        </Typography>
                      }
                    />
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color={restoreMode === 'Replace' ? 'warning' : 'secondary'}
                  startIcon={<RestorePageOutlined />}
                  disabled={
                    busy ||
                    !stagedArchive ||
                    !validationReport?.valid ||
                    (restoreMode === 'Replace' && !confirmDestructiveReplace)
                  }
                  onClick={() => void handleExecuteRestore()}
                >
                  Execute Transactional {restoreMode} Restore
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Restore Validation Inspector & Governance Boundary Disclosures */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2.5}>
            {/* Validation Report & Preview */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Pre-Restore Integrity &amp; Conflict Verification Report
                  </Typography>
                  {validationReport && (
                    <Chip
                      icon={
                        validationReport.valid ? (
                          <CheckCircleOutlined fontSize="small" />
                        ) : (
                          <ErrorOutlined fontSize="small" />
                        )
                      }
                      label={
                        validationReport.valid
                          ? 'Archive Verified & Ready'
                          : 'Validation Failed — Restore Blocked'
                      }
                      color={validationReport.valid ? 'success' : 'error'}
                      size="small"
                    />
                  )}
                </Stack>

                {!validationReport ? (
                  <Typography variant="body2" color="text.secondary">
                    Click &ldquo;Stage Snapshot for Preview&rdquo; or upload a `.json` backup archive to inspect
                    record counts, binary SHA-256 verification, and conflict detection before
                    restoring.
                  </Typography>
                ) : (
                  <>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            SCHEMA VERSION
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                          >
                            v{validationReport.manifest?.dbSchemaVersion ?? '?'} (Compatible:{' '}
                            {validationReport.schemaCompatible ? 'YES' : 'NO'})
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            ARCHIVE SHA-256
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                          >
                            {validationReport.archiveChecksumVerified ? 'VERIFIED' : 'MISMATCH'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            BINARY BLOBS VERIFIED
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                          >
                            {validationReport.verifiedBinaryCount} (
                            {validationReport.binaryChecksumsVerified ? 'SHA-256 OK' : 'FAILED'})
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            TOTAL RECORDS
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                          >
                            {validationReport.totalRecordsToRestore}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {validationReport.errors.length > 0 && (
                      <Alert severity="error">
                        {validationReport.errors.map((err, i) => (
                          <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                            • {err}
                          </Typography>
                        ))}
                      </Alert>
                    )}

                    <TableContainer
                      component={Paper}
                      variant="outlined"
                      sx={{ maxHeight: 240, borderRadius: 1.5 }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Object Store</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Records in Archive
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Matching Local IDs
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(validationReport.storePreviewCounts).map(
                            ([storeName, count]) => {
                              const storeConflicts = validationReport.conflicts.filter(
                                (c) => c.storeName === storeName
                              ).length;
                              return (
                                <TableRow key={storeName} hover>
                                  <TableCell
                                    sx={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: '0.76rem',
                                    }}
                                  >
                                    {storeName}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: '0.76rem',
                                    }}
                                  >
                                    {count}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: '0.76rem',
                                    }}
                                  >
                                    {storeConflicts}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recorded Backup Manifests & Explicit Security/Governance Boundary Disclosures */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Backup Manifest Ledger ({backupManifests.length}) &amp; Security Boundary
                  Disclosures
                </Typography>

                <Alert severity="info" icon={<SecurityOutlined fontSize="small" />}>
                  <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45 }}>
                    <strong>Governance &amp; Local-First Security Boundary Disclosure:</strong>
                    <br />• <strong>Simulated Local Actor Control:</strong> In local-first browser
                    mode, preparer and reviewer selection enforces application-level 4-eyes
                    segregation of duties (blocking self-approval across procedures, tests, findings,
                    and reports) as a simulated workflow control rather than server-authenticated
                    cryptographic identity.
                    <br />• <strong>Browser-Local Audit Trail:</strong> The append-only{' '}
                    <code>auditEvents</code> store and SHA-256 frozen report snapshots detect
                    accidental or application-level modification, but browser-resident IndexedDB
                    storage is not independently tamper-proof against a user with local DevTools
                    access unless paired with server-enforced authentication.
                  </Typography>
                </Alert>

                <Divider />

                {backupManifests.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No backup manifests generated in this session yet.
                  </Typography>
                ) : (
                  backupManifests.slice(0, 5).map((m) => (
                    <Box
                      key={m.manifestId}
                      sx={{
                        p: 1.25,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
                        >
                          {m.manifestId} · {m.scope} ({m.engagementId})
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Created {m.createdAt.slice(0, 19).replace('T', ' ')} by {m.createdBy} ·{' '}
                          {m.binaryBlobCount} binary blobs ({m.binaryBlobTotalBytes} bytes)
                        </Typography>
                      </Box>
                      <Chip
                        label={`SHA-256: ${m.archiveChecksumSha256.slice(0, 12)}...`}
                        size="small"
                        variant="outlined"
                        sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}
                      />
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
