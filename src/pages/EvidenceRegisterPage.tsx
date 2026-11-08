import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  CloudUploadOutlined,
  DownloadOutlined,
  RateReviewOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  EvidenceRecord,
  EvidenceType,
  EvidenceVerificationStatus,
  LinkedEntityType,
} from '../types/domain';
import { EvidenceUploadInputSchema } from '../validation/schemas';
import { validateEvidenceFile } from '../utils/security';

export const EvidenceRegisterPage: React.FC = () => {
  const {
    engagements,
    assertions,
    controls,
    evidence,
    auditProcedures,
    sampleItems,
    designTests,
    operatingTests,
    ghgRecalculations,
    auditFindings,
    uploadEvidence,
    reviewEvidence,
    downloadEvidence,
  } = useWorkbench();

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'ALL' | 'UPLOADED' | 'DEMO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Upload Dialog State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [engagementId, setEngagementId] = useState('ENG-2025-002');
  const [linkedEntityType, setLinkedEntityType] = useState<LinkedEntityType>('ESGAssertion');
  const [linkedEntityId, setLinkedEntityId] = useState('AST-ASN-039');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('Utility Invoice');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review Dialog State
  const [reviewTarget, setReviewTarget] = useState<EvidenceRecord | null>(null);
  const [nextReviewStatus, setNextReviewStatus] =
    useState<EvidenceVerificationStatus>('Accepted');
  const [nextReviewNotes, setNextReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const entityChoices = useMemo(() => {
    switch (linkedEntityType) {
      case 'ESGAssertion':
        return assertions.map((a) => ({
          id: a.assertionId,
          label: `${a.assertionId} — ${a.metricCode} (${a.facilityId})`,
        }));
      case 'InternalControl':
        return controls.map((c) => ({
          id: c.controlId,
          label: `${c.controlCode} — ${c.controlName}`,
        }));
      case 'AuditProcedure':
        return auditProcedures.map((p) => ({
          id: p.procedureId,
          label: `${p.procedureId} — ${p.procedureName}`,
        }));
      case 'SampleItem':
        return sampleItems.map((s) => ({
          id: s.sampleItemId,
          label: `${s.sampleItemId} — ${s.populationRecordId}`,
        }));
      case 'DesignTest':
        return designTests.map((d) => ({
          id: d.designTestId,
          label: `${d.designTestId} — Control ${d.controlId}`,
        }));
      case 'OperatingTest':
        return operatingTests.map((o) => ({
          id: o.operatingTestId,
          label: `${o.operatingTestId} — Control ${o.controlId}`,
        }));
      case 'GHGRecalculation':
        return ghgRecalculations.map((rec) => ({
          id: rec.recalculationId,
          label: `${rec.recalculationId} — Activity ${rec.activityId}`,
        }));
      case 'AuditFinding':
        return auditFindings.map((af) => ({
          id: af.auditFindingId,
          label: `${af.auditFindingId} — ${af.findingType}`,
        }));
      default:
        return engagements.map((e) => ({
          id: e.engagementId,
          label: `${e.engagementId} — ${e.engagementName}`,
        }));
    }
  }, [
    linkedEntityType,
    assertions,
    controls,
    engagements,
    auditProcedures,
    sampleItems,
    designTests,
    operatingTests,
    ghgRecalculations,
    auditFindings,
  ]);

  const handleOpenUpload = () => {
    setSelectedFile(null);
    setEngagementId(engagements[1]?.engagementId ?? 'ENG-2025-002');
    setLinkedEntityType('ESGAssertion');
    setLinkedEntityId('AST-ASN-039');
    setEvidenceType('Utility Invoice');
    setReviewerNotes('');
    setUploadError(null);
    setUploadOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setSelectedFile(null);
      return;
    }
    const check = validateEvidenceFile(f);
    if (!check.valid) {
      setUploadError(check.error ?? 'Invalid file selected.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(f);
  };

  const handleUploadSubmit = async () => {
    setUploadError(null);
    if (!selectedFile) {
      setUploadError('Please select a valid PDF, CSV, TXT, JSON, PNG, or JPEG file (max 5 MB).');
      return;
    }

    const parsed = EvidenceUploadInputSchema.safeParse({
      engagementId,
      linkedEntityType,
      linkedEntityId,
      evidenceType,
      reviewerNotes,
    });

    if (!parsed.success) {
      setUploadError(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }

    try {
      await uploadEvidence({
        file: selectedFile,
        ...parsed.data,
      });
      setUploadOpen(false);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Evidence upload failed.');
    }
  };

  const handleOpenReview = (record: EvidenceRecord) => {
    setReviewTarget(record);
    setNextReviewStatus(
      record.verificationStatus === 'Accepted' || record.verificationStatus === 'Rejected'
        ? record.verificationStatus
        : 'Accepted'
    );
    setNextReviewNotes(record.reviewerNotes);
    setReviewError(null);
  };

  const handleReviewSubmit = async () => {
    if (!reviewTarget) return;
    setReviewError(null);
    try {
      await reviewEvidence(reviewTarget.evidenceId, nextReviewStatus, nextReviewNotes);
      setReviewTarget(null);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to update review status.');
    }
  };

  const filteredEvidence = useMemo(() => {
    return evidence.filter((ev) => {
      if (sourceTypeFilter === 'UPLOADED' && ev.isMetadataOnlyDemo) return false;
      if (sourceTypeFilter === 'DEMO' && !ev.isMetadataOnlyDemo) return false;
      if (statusFilter !== 'ALL' && ev.verificationStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          ev.evidenceId.toLowerCase().includes(q) ||
          ev.documentName.toLowerCase().includes(q) ||
          ev.linkedEntityId.toLowerCase().includes(q) ||
          ev.checksum.toLowerCase().includes(q) ||
          ev.evidenceType.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [evidence, sourceTypeFilter, statusFilter, searchQuery]);

  const uploadedFilesCount = evidence.filter((e) => !e.isMetadataOnlyDemo).length;
  const demoMetadataCount = evidence.filter((e) => e.isMetadataOnlyDemo).length;

  const columns: GridColDef<EvidenceRecord>[] = [
    {
      field: 'evidenceId',
      headerName: 'Evidence ID',
      width: 135,
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) => (
        <span className="font-mono text-xs font-semibold">{params.row.evidenceId}</span>
      ),
    },
    {
      field: 'isMetadataOnlyDemo',
      headerName: 'Record Provenance',
      width: 185,
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) =>
        params.row.isMetadataOnlyDemo ? (
          <span className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">
            DEMO METADATA ONLY
          </span>
        ) : (
          <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold">
            UPLOADED BINARY FILE
          </span>
        ),
    },
    {
      field: 'documentName',
      headerName: 'Document Name & SHA-256 Checksum',
      flex: 1,
      minWidth: 270,
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.79rem' }} noWrap>
            {params.row.documentName}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', display: 'block' }}
            noWrap
          >
            SHA-256: {params.row.checksum.slice(0, 28)}...
          </Typography>
        </Box>
      ),
    },
    {
      field: 'evidenceType',
      headerName: 'Evidence Class',
      width: 165,
    },
    {
      field: 'linkedEntityId',
      headerName: 'Linked Entity',
      width: 140,
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) => (
        <span className="font-mono text-xs">{params.row.linkedEntityId}</span>
      ),
    },
    {
      field: 'fileSize',
      headerName: 'File Size',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) => (
        <span className="font-mono text-xs tabular-nums">
          {params.row.isMetadataOnlyDemo
            ? 'N/A (No Binary)'
            : `${(params.row.fileSize / 1024).toFixed(1)} KB`}
        </span>
      ),
    },
    {
      field: 'verificationStatus',
      headerName: 'Verification Status',
      width: 215,
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) => (
        <span className="font-mono text-xs font-semibold">
          {params.row.verificationStatus}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 210,
      sortable: false,
      renderCell: (params: GridRenderCellParams<EvidenceRecord>) => (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', height: '100%' }}>
          {!params.row.isMetadataOnlyDemo ? (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlined fontSize="small" />}
                onClick={() => void downloadEvidence(params.row.evidenceId)}
              >
                Download
              </Button>
              <Button
                size="small"
                variant="text"
                startIcon={<RateReviewOutlined fontSize="small" />}
                onClick={() => handleOpenReview(params.row)}
              >
                Review
              </Button>
            </>
          ) : (
            <Typography
              variant="caption"
              sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}
            >
              Demo Ref (Not Downloadable)
            </Typography>
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
            <Typography variant="h5">Evidence Register &amp; Binary Workpaper Vault</Typography>
            <Typography variant="body2" color="text.secondary">
              Upload, checksum (SHA-256), link, and review supporting audit evidence in IndexedDB.
              Currently storing <strong>{uploadedFilesCount} uploaded binary file(s)</strong> and{' '}
              <strong>{demoMetadataCount} synthetic metadata-only demo references</strong>.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CloudUploadOutlined />}
            onClick={handleOpenUpload}
            data-testid="btn-upload-evidence"
          >
            Upload Evidence File
          </Button>
        </Box>

        <Alert severity="warning" sx={{ mb: 2.5 }}>
          <strong>Evidence Provenance &amp; Integrity Policy:</strong> The 40 seeded demonstration
          records are <strong>Metadata-Only References</strong> (marked{' '}
          <code>DEMO METADATA ONLY</code>). Per audit integrity requirements, unavailable
          metadata-only records cannot be downloaded or marked as verified/accepted. Upload actual
          PDF, CSV, TXT, JSON, PNG, or JPEG files (max 5 MB) to persist binary bytes in IndexedDB,
          compute SHA-256 digests, download files, and record reviewer acceptance.
        </Alert>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Evidence ID, Document Name, Entity ID, or SHA-256"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="ev-source-filter">Record Provenance</InputLabel>
              <Select
                labelId="ev-source-filter"
                label="Record Provenance"
                value={sourceTypeFilter}
                onChange={(e) =>
                  setSourceTypeFilter(e.target.value as 'ALL' | 'UPLOADED' | 'DEMO')
                }
              >
                <MenuItem value="ALL">All Evidence Records ({evidence.length})</MenuItem>
                <MenuItem value="UPLOADED">
                  Uploaded Binary Files Only ({uploadedFilesCount})
                </MenuItem>
                <MenuItem value="DEMO">
                  Metadata-Only Demo References ({demoMetadataCount})
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="ev-status-filter">Verification Status</InputLabel>
              <Select
                labelId="ev-status-filter"
                label="Verification Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="Uploaded - Pending Review">Uploaded - Pending Review</MenuItem>
                <MenuItem value="Accepted">Accepted</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
                <MenuItem value="Metadata Only (Demo Unavailable)">
                  Metadata Only (Demo Unavailable)
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <DataGrid
          rows={filteredEvidence}
          columns={columns}
          getRowId={(row) => row.evidenceId}
          rowHeight={54}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Upload Evidence Dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Binary Evidence File to IndexedDB</DialogTitle>
        <DialogContent dividers>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="evidence-upload-error">
              {uploadError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ py: 2, borderStyle: 'dashed' }}
              >
                {selectedFile
                  ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                  : 'Choose File (PDF, CSV, TXT, JSON, PNG, JPEG — Max 5 MB)'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.csv,.txt,.json,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  data-testid="input-evidence-file"
                />
              </Button>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="upl-eng">Engagement</InputLabel>
                <Select
                  labelId="upl-eng"
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

            <Grid size={{ xs: 12, md: 5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="upl-entity-type">Link To Entity Type</InputLabel>
                <Select
                  labelId="upl-entity-type"
                  label="Link To Entity Type"
                  value={linkedEntityType}
                  onChange={(e) => {
                    const nextType = e.target.value as LinkedEntityType;
                    setLinkedEntityType(nextType);
                    if (nextType === 'ESGAssertion') {
                      setLinkedEntityId(assertions[0]?.assertionId ?? 'AST-ASN-001');
                    } else if (nextType === 'InternalControl') {
                      setLinkedEntityId(controls[0]?.controlId ?? 'AST-CTL-001');
                    } else {
                      setLinkedEntityId(engagements[0]?.engagementId ?? 'ENG-2024-001');
                    }
                  }}
                >
                  <MenuItem value="ESGAssertion">ESG Assertion</MenuItem>
                  <MenuItem value="InternalControl">Internal Control</MenuItem>
                  <MenuItem value="AssuranceEngagement">Assurance Engagement</MenuItem>
                  <MenuItem value="AuditProcedure">Audit Procedure</MenuItem>
                  <MenuItem value="SampleItem">Sample Item</MenuItem>
                  <MenuItem value="DesignTest">Control Design Test</MenuItem>
                  <MenuItem value="OperatingTest">Control Operating Test</MenuItem>
                  <MenuItem value="GHGRecalculation">GHG Recalculation Result</MenuItem>
                  <MenuItem value="AuditFinding">Audit Finding (Remediation)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="upl-entity-id">Target Entity</InputLabel>
                <Select
                  labelId="upl-entity-id"
                  label="Target Entity"
                  value={linkedEntityId}
                  onChange={(e) => setLinkedEntityId(e.target.value)}
                >
                  {entityChoices.map((choice) => (
                    <MenuItem key={choice.id} value={choice.id}>
                      {choice.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="upl-ev-type">Evidence Classification</InputLabel>
                <Select
                  labelId="upl-ev-type"
                  label="Evidence Classification"
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                >
                  <MenuItem value="Utility Invoice">Utility Invoice</MenuItem>
                  <MenuItem value="Meter Calibration Log">Meter Calibration Log</MenuItem>
                  <MenuItem value="Calculation Workpaper">Calculation Workpaper</MenuItem>
                  <MenuItem value="Emission Factor Reference">Emission Factor Reference</MenuItem>
                  <MenuItem value="HR Payroll Extract">HR Payroll Extract</MenuItem>
                  <MenuItem value="Safety Incident Log">Safety Incident Log</MenuItem>
                  <MenuItem value="Board Resolution / Policy">Board Resolution / Policy</MenuItem>
                  <MenuItem value="Third-Party Statement">Third-Party Statement</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Reviewer / Uploader Notes"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleUploadSubmit()}
            data-testid="btn-confirm-upload"
          >
            Persist Binary &amp; Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Uploaded Evidence Dialog */}
      <Dialog
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Review Uploaded Evidence ({reviewTarget?.evidenceId})
        </DialogTitle>
        <DialogContent dividers>
          {reviewError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reviewError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Document: <strong>{reviewTarget?.documentName}</strong>
            <br />
            SHA-256: <code className="text-xs">{reviewTarget?.checksum}</code>
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="rev-status-select">Verification Decision</InputLabel>
            <Select
              labelId="rev-status-select"
              label="Verification Decision"
              value={nextReviewStatus}
              onChange={(e) =>
                setNextReviewStatus(e.target.value as EvidenceVerificationStatus)
              }
            >
              <MenuItem value="Uploaded - Pending Review">Uploaded - Pending Review</MenuItem>
              <MenuItem value="Accepted">Accepted</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label="Audit Reviewer Notes"
            value={nextReviewNotes}
            onChange={(e) => setNextReviewNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReviewTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleReviewSubmit()}>
            Save Review Decision
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
