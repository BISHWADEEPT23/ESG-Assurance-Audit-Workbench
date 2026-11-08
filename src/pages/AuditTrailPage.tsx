import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
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
import { useWorkbench } from '../context/WorkbenchContext';
import { AuditEvent } from '../types/domain';
import { sanitizeDisplayText } from '../utils/security';

export const AuditTrailPage: React.FC = () => {
  const { auditEvents, engagements } = useWorkbench();

  const [searchQuery, setSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [engagementFilter, setEngagementFilter] = useState<string>('ALL');

  const filteredEvents = useMemo(() => {
    return auditEvents.filter((evt) => {
      if (entityTypeFilter !== 'ALL' && evt.entityType !== entityTypeFilter) return false;
      if (engagementFilter !== 'ALL' && evt.engagementId !== engagementFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          evt.eventId.toLowerCase().includes(q) ||
          evt.entityId.toLowerCase().includes(q) ||
          evt.action.toLowerCase().includes(q) ||
          evt.actor.toLowerCase().includes(q) ||
          evt.newValue.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [auditEvents, entityTypeFilter, engagementFilter, searchQuery]);

  const columns: GridColDef<AuditEvent>[] = [
    {
      field: 'timestamp',
      headerName: 'UTC Timestamp',
      width: 185,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="font-mono text-xs tabular-nums">
          {params.row.timestamp.replace('T', ' ').slice(0, 19)}Z
        </span>
      ),
    },
    {
      field: 'eventId',
      headerName: 'Event ID',
      width: 155,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="font-mono text-xs font-semibold">{params.row.eventId}</span>
      ),
    },
    {
      field: 'action',
      headerName: 'Audit Action',
      width: 230,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="font-mono text-xs font-bold">{params.row.action}</span>
      ),
    },
    {
      field: 'entityType',
      headerName: 'Entity Type',
      width: 165,
    },
    {
      field: 'entityId',
      headerName: 'Entity ID',
      width: 135,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="font-mono text-xs">{params.row.entityId}</span>
      ),
    },
    {
      field: 'actor',
      headerName: 'Actor',
      width: 230,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="text-xs">{sanitizeDisplayText(params.row.actor, 120)}</span>
      ),
    },
    {
      field: 'previousValue',
      headerName: 'Previous Value',
      width: 180,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="font-mono text-xs text-slate-500">
          {sanitizeDisplayText(params.row.previousValue, 200)}
        </span>
      ),
    },
    {
      field: 'newValue',
      headerName: 'New Value',
      minWidth: 280,
      flex: 1,
      renderCell: (params: GridRenderCellParams<AuditEvent>) => (
        <span className="font-mono text-xs">
          {sanitizeDisplayText(params.row.newValue, 300)}
        </span>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h5" gutterBottom>
          Chronological Audit Trail ({auditEvents.length} Recorded Events)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Append-only application event ledger capturing engagement creation, assertion edits,
          control updates, binary evidence uploads, review sign-offs, and validation resolutions.
        </Typography>

        <Alert severity="warning" sx={{ mb: 2.5 }}>
          <strong>Browser-Local Audit Log Governance Limitation (Section 13):</strong> While audit
          events are strictly append-only through the normal application interface, browser-local
          IndexedDB storage resides on the client device and is <strong>not tamper-proof</strong>{' '}
          against local browser DevTools inspection or storage clearing. It is not equivalent to an
          independently controlled, cryptographically signed server-side audit trail.
        </Alert>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Event ID, Action, Entity ID, Actor, or State Change"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="aud-entity-type">Entity Type</InputLabel>
              <Select
                labelId="aud-entity-type"
                label="Entity Type"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Entity Types</MenuItem>
                <MenuItem value="AssuranceEngagement">AssuranceEngagement</MenuItem>
                <MenuItem value="ESGAssertion">ESGAssertion</MenuItem>
                <MenuItem value="InternalControl">InternalControl</MenuItem>
                <MenuItem value="EvidenceRecord">EvidenceRecord</MenuItem>
                <MenuItem value="ValidationFinding">ValidationFinding</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="aud-eng-filter">Engagement</InputLabel>
              <Select
                labelId="aud-eng-filter"
                label="Engagement"
                value={engagementFilter}
                onChange={(e) => setEngagementFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Engagements</MenuItem>
                {engagements.map((eng) => (
                  <MenuItem key={eng.engagementId} value={eng.engagementId}>
                    {eng.reportingYear} — {eng.engagementId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <DataGrid
          rows={filteredEvents}
          columns={columns}
          getRowId={(row) => row.eventId}
          pageSizeOptions={[15, 30, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 15, page: 0 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
};
