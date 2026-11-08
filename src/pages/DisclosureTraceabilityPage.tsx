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
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountTreeOutlined as AccountTreeOutlinedIcon,
  AddCircleOutlined as AddCircleOutlineIcon,
  DownloadOutlined as DownloadOutlinedIcon,
  EditOutlined as EditOutlinedIcon,
  LibraryBooksOutlined as LibraryBooksOutlinedIcon,
  UploadFileOutlined as UploadFileOutlinedIcon,
  VerifiedUserOutlined as VerifiedUserOutlinedIcon,
  WarningAmberOutlined as WarningAmberOutlinedIcon,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import { buildEvidenceLineageChains } from '../services/lineageEngine';
import {
  DisclosureApplicabilityStatus,
  DisclosureMappingStatus,
  DisclosureRequirement,
  DisclosureRequirementType,
  ESGPillar,
} from '../types/domain';

export const DisclosureTraceabilityPage: React.FC = () => {
  const {
    assertions,
    controls,
    evidence,
    auditProcedures,
    sampleItems,
    designTests,
    operatingTests,
    emissionActivities,
    ghgRecalculations,
    auditFindings,
    disclosureFrameworks,
    disclosureRequirements,
    disclosureMappings,
    traceabilityResults,
    disclosureAnalytics,
    activeEngagementId,
    activeActor,
    reportSnapshots,
    saveDisclosureRequirement,
    importRequirementCatalog,
    saveDisclosureMapping,
    exportReportSnapshot,
  } = useWorkbench();

  const [activeTab, setActiveTab] = useState<number>(0);

  // Filters for Tab 0 (Disclosure Framework & 9-Stage Traceability)
  const [frameworkFilter, setFrameworkFilter] = useState<string>('ALL');
  const [pillarFilter, setPillarFilter] = useState<string>('ALL');
  const [traceStatusFilter, setTraceStatusFilter] = useState<string>('ALL');
  const [applicabilityFilter, setApplicabilityFilter] = useState<string>('ALL');
  const [reqSearch, setReqSearch] = useState<string>('');

  // Filters for Tab 1 (Phase 2 Evidence-Centric Lineage)
  const [searchQuery, setSearchQuery] = useState('');
  const [provenanceFilter, setProvenanceFilter] = useState<string>('ALL');

  // Dialog states
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<DisclosureRequirement | null>(null);
  const [mapStatus, setMapStatus] = useState<DisclosureMappingStatus>('Fully Mapped');
  const [mapCoveragePct, setMapCoveragePct] = useState<number>(100);
  const [mapAssertionIds, setMapAssertionIds] = useState<string[]>([]);
  const [mapControlIds, setMapControlIds] = useState<string[]>([]);
  const [mapProcedureIds, setMapProcedureIds] = useState<string[]>([]);
  const [mapEvidenceIds, setMapEvidenceIds] = useState<string[]>([]);
  const [mapRationale, setMapRationale] = useState<string>('');
  const [mapGaps, setMapGaps] = useState<string>('');
  const [mapReviewedBy, setMapReviewedBy] = useState<string>('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Add Requirement Dialog
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [newReqFrameworkId, setNewReqFrameworkId] = useState<string>('FWK-ESRS-2023');
  const [newReqCode, setNewReqCode] = useState<string>('');
  const [newReqTitle, setNewReqTitle] = useState<string>('');
  const [newReqPillar, setNewReqPillar] = useState<ESGPillar>('Environmental');
  const [newReqTopic, setNewReqTopic] = useState<string>('GHG Emissions - Scope 1');
  const [newReqSubTopic, setNewReqSubTopic] = useState<string>('Custom Subtopic');
  const [newReqType, setNewReqType] = useState<DisclosureRequirementType>('Quantitative');
  const [newReqMandatory, setNewReqMandatory] = useState<string>('Mandatory');
  const [newReqUnit, setNewReqUnit] = useState<string>('tCO2e');
  const [newReqGuidance, setNewReqGuidance] = useState<string>('');
  const [newReqApplicability, setNewReqApplicability] =
    useState<DisclosureApplicabilityStatus>('Applicable');

  // Import Catalog Dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const traceMap = useMemo(
    () => new Map(traceabilityResults.map((t) => [t.requirementId, t])),
    [traceabilityResults]
  );

  const frameworkMap = useMemo(
    () => new Map(disclosureFrameworks.map((f) => [f.frameworkId, f])),
    [disclosureFrameworks]
  );

  const filteredRequirements = useMemo(() => {
    return disclosureRequirements.filter((req) => {
      if (frameworkFilter !== 'ALL' && req.frameworkId !== frameworkFilter) return false;
      if (pillarFilter !== 'ALL' && req.pillar !== pillarFilter) return false;
      if (applicabilityFilter !== 'ALL' && req.applicabilityStatus !== applicabilityFilter)
        return false;
      const tr = traceMap.get(req.requirementId);
      if (traceStatusFilter !== 'ALL' && tr?.traceabilityStatus !== traceStatusFilter) return false;
      const q = reqSearch.trim().toLowerCase();
      if (q) {
        const matches =
          req.requirementCode.toLowerCase().includes(q) ||
          req.requirementTitle.toLowerCase().includes(q) ||
          req.topic.toLowerCase().includes(q) ||
          req.subTopic.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    disclosureRequirements,
    frameworkFilter,
    pillarFilter,
    applicabilityFilter,
    traceStatusFilter,
    reqSearch,
    traceMap,
  ]);

  const engAssertions = useMemo(
    () => assertions.filter((a) => a.engagementId === activeEngagementId),
    [assertions, activeEngagementId]
  );
  const engControls = useMemo(
    () => controls.filter((c) => c.engagementId === activeEngagementId),
    [controls, activeEngagementId]
  );
  const engEvidence = useMemo(
    () => evidence.filter((e) => e.engagementId === activeEngagementId),
    [evidence, activeEngagementId]
  );

  const openMappingModal = (req: DisclosureRequirement) => {
    setSelectedReq(req);
    setDialogError(null);
    const existing = disclosureMappings.find(
      (m) => m.engagementId === activeEngagementId && m.requirementId === req.requirementId
    );
    if (existing) {
      setMapStatus(existing.mappingStatus);
      setMapCoveragePct(existing.coveragePercentage);
      setMapAssertionIds(existing.linkedAssertionIds);
      setMapControlIds(existing.linkedControlIds);
      setMapProcedureIds(existing.linkedProcedureIds);
      setMapEvidenceIds(existing.linkedEvidenceIds);
      setMapRationale(existing.mappingRationale);
      setMapGaps(existing.identifiedGaps);
      setMapReviewedBy(existing.reviewedBy ?? '');
    } else {
      setMapStatus('Partially Mapped');
      setMapCoveragePct(75);
      setMapAssertionIds(engAssertions[0] ? [engAssertions[0].assertionId] : []);
      setMapControlIds(engControls[0] ? [engControls[0].controlId] : []);
      setMapProcedureIds(auditProcedures[0] ? [auditProcedures[0].procedureId] : []);
      setMapEvidenceIds(engEvidence[0] ? [engEvidence[0].evidenceId] : []);
      setMapRationale(
        `Analytical mapping of ${req.requirementCode} (${req.requirementTitle}) to internal engagement assertions and controls.`
      );
      setMapGaps('Pending completion of operating effectiveness sample testing.');
      setMapReviewedBy('');
    }
    setMappingDialogOpen(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedReq) return;
    try {
      setDialogError(null);
      const existing = disclosureMappings.find(
        (m) => m.engagementId === activeEngagementId && m.requirementId === selectedReq.requirementId
      );
      await saveDisclosureMapping(
        {
          engagementId: activeEngagementId,
          frameworkId: selectedReq.frameworkId,
          requirementId: selectedReq.requirementId,
          linkedAssertionIds: mapAssertionIds,
          linkedControlIds: mapControlIds,
          linkedProcedureIds: mapProcedureIds,
          linkedEvidenceIds: mapEvidenceIds,
          mappingStatus: mapStatus,
          coveragePercentage: Number(mapCoveragePct),
          mappingRationale: mapRationale,
          identifiedGaps: mapGaps,
          mappedBy: activeActor,
          reviewedBy: mapReviewedBy.trim() ? mapReviewedBy.trim() : null,
        },
        existing?.mappingId
      );
      setMappingDialogOpen(false);
      setActionFeedback(`Saved disclosure mapping for ${selectedReq.requirementCode}.`);
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Failed to save mapping.');
    }
  };

  const handleCreateRequirement = async () => {
    try {
      setDialogError(null);
      const created = await saveDisclosureRequirement({
        frameworkId: newReqFrameworkId,
        requirementCode: newReqCode,
        requirementTitle: newReqTitle,
        pillar: newReqPillar,
        topic: newReqTopic,
        subTopic: newReqSubTopic,
        requirementType: newReqType,
        mandatoryLevel: newReqMandatory,
        expectedUnit: newReqUnit,
        guidanceSummary: newReqGuidance,
        applicabilityStatus: newReqApplicability,
      });
      setReqDialogOpen(false);
      setNewReqCode('');
      setNewReqTitle('');
      setNewReqGuidance('');
      setActionFeedback(
        `Added requirement ${created.requirementCode} (${created.applicabilityStatus}).`
      );
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Failed to create requirement.');
    }
  };

  const handleImportCatalog = async () => {
    try {
      setDialogError(null);
      const parsed = JSON.parse(importJsonText) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('Catalog import payload must be a JSON array of requirement objects.');
      }
      const imported = await importRequirementCatalog(parsed);
      setImportDialogOpen(false);
      setImportJsonText('');
      setActionFeedback(`Imported ${imported.length} disclosure requirement(s) into catalog.`);
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Invalid JSON catalog.');
    }
  };

  const engagementChains = useMemo(() => {
    const allChains = buildEvidenceLineageChains({
      assertions: engAssertions,
      controls,
      evidence: engEvidence,
      procedures: auditProcedures,
      sampleItems,
      designTests,
      operatingTests,
      emissionActivities: emissionActivities.filter((a) => a.engagementId === activeEngagementId),
      ghgRecalculations,
      auditFindings: auditFindings.filter((f) => f.engagementId === activeEngagementId),
    });

    return allChains.filter((c) => {
      const matchesProvenance =
        provenanceFilter === 'ALL' || c.provenanceCategory === provenanceFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (c.evidenceRecord?.evidenceId.toLowerCase().includes(q) ?? false) ||
        (c.evidenceRecord?.documentName.toLowerCase().includes(q) ?? false) ||
        (c.assertion?.metricName.toLowerCase().includes(q) ?? false) ||
        (c.control?.controlName.toLowerCase().includes(q) ?? false) ||
        (c.finding?.auditFindingId.toLowerCase().includes(q) ?? false);
      return matchesProvenance && matchesSearch;
    });
  }, [
    engAssertions,
    controls,
    engEvidence,
    auditProcedures,
    sampleItems,
    designTests,
    operatingTests,
    emissionActivities,
    activeEngagementId,
    ghgRecalculations,
    auditFindings,
    provenanceFilter,
    searchQuery,
  ]);

  const statusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status) {
      case 'Internally Reviewed':
        return 'success';
      case 'Testing Pending':
      case 'Partially Mapped':
        return 'info';
      case 'Evidence Missing':
        return 'warning';
      case 'Exceptions Identified':
        return 'error';
      default:
        return 'default';
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
            Evidence Lineage &amp; Disclosure Traceability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-Framework Disclosure Library (ESRS, GRI, IFRS S1/S2, BRSR) &amp; 9-Stage Disclosure-to-Evidence Traceability Engine
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => {
              setDialogError(null);
              setReqDialogOpen(true);
            }}
          >
            Add Requirement
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => {
              setDialogError(null);
              setImportJsonText(
                JSON.stringify(
                  [
                    {
                      frameworkId: 'FWK-ESRS-2023',
                      requirementCode: 'ESRS E3-4 (28)',
                      requirementTitle: 'Total Water Consumption in Water-Stressed Areas',
                      pillar: 'Environmental',
                      topic: 'Water Withdrawal & Discharge',
                      subTopic: 'Water Stress Basins',
                      requirementType: 'Quantitative',
                      mandatoryLevel: 'Mandatory (Subject to Materiality)',
                      expectedUnit: 'm3',
                      guidanceSummary: 'Disclose water consumption in areas at water risk.',
                      applicabilityStatus: 'Applicable',
                    },
                  ],
                  null,
                  2
                )
              );
              setImportDialogOpen(true);
            }}
          >
            Import Catalog JSON
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<DownloadOutlinedIcon />}
            onClick={() => {
              const snapId = reportSnapshots[0]?.snapshotId ?? 'SNP-2025-001';
              const res = exportReportSnapshot({
                snapshotId: snapId,
                format: 'csv',
                csvCategory: 'disclosure-mappings',
              });
              setActionFeedback(`Exported ${res.filename} (${res.byteLength} bytes).`);
            }}
          >
            Export Mappings CSV
          </Button>
        </Box>
      </Box>

      {/* Mandatory Section 3.4 Illustrative Analytical Reference Notice */}
      <Alert severity="info" icon={<LibraryBooksOutlinedIcon />} sx={{ mb: 2.5 }}>
        <strong>Methodology &amp; Licensing Notice:</strong> Framework requirement summaries and cross-framework mappings (ESRS, GRI Standards, IFRS S1/S2, BRSR) are illustrative analytical references for internal assurance-readiness tracking and do not reproduce copyrighted full text of external standards or represent officially approved regulatory crosswalks.
      </Alert>

      {actionFeedback && (
        <Alert severity="success" onClose={() => setActionFeedback(null)} sx={{ mb: 2 }}>
          {actionFeedback}
        </Alert>
      )}

      {/* Disclosure Coverage KPI Strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                APPLICABLE REQUIREMENTS IN SCOPE
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {disclosureAnalytics.applicableRequirementsInScopeCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Total Catalog: {disclosureAnalytics.totalCatalogRequirementsCount} ({disclosureAnalytics.excludedNotApplicableCount} Not Applicable excluded from denominator)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                MAPPING COMPLETENESS
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {disclosureAnalytics.mappingCompletenessPct}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, disclosureAnalytics.mappingCompletenessPct)}
                sx={{ my: 1, height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary">
                {disclosureAnalytics.mappedRequirementsCount} Mapped • {disclosureAnalytics.unmappedRequirementsCount} Unmapped
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                EVIDENCE &amp; TESTING COVERAGE
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {disclosureAnalytics.evidenceCoveragePct}% / {disclosureAnalytics.testingCoveragePct}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Uploaded Accepted Evidence / Completed Test Procedures
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                INTERNALLY REVIEWED vs EXCEPTIONS
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {disclosureAnalytics.internallyReviewedCount} / {disclosureAnalytics.exceptionsIdentifiedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Internally Reviewed Disclosures vs Disclosures with Open Findings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label={`9-Stage Disclosure-to-Evidence Traceability (${filteredRequirements.length})`}
        />
        <Tab
          label={`Framework Coverage Summary (${disclosureFrameworks.length} Frameworks)`}
        />
        <Tab
          label={`Evidence-to-Finding Provenance Chains (${engagementChains.length})`}
        />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 2.5, p: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Code, Title, or Topic..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Framework Family</InputLabel>
                  <Select
                    label="Framework Family"
                    value={frameworkFilter}
                    onChange={(e) => setFrameworkFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All 4 Frameworks</MenuItem>
                    {disclosureFrameworks.map((fw) => (
                      <MenuItem key={fw.frameworkId} value={fw.frameworkId}>
                        {fw.frameworkName} ({fw.frameworkVersion.slice(0, 16)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>ESG Pillar</InputLabel>
                  <Select
                    label="ESG Pillar"
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
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Traceability Status</InputLabel>
                  <Select
                    label="Traceability Status"
                    value={traceStatusFilter}
                    onChange={(e) => setTraceStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Traceability Statuses</MenuItem>
                    <MenuItem value="Internally Reviewed">Internally Reviewed</MenuItem>
                    <MenuItem value="Exceptions Identified">Exceptions Identified</MenuItem>
                    <MenuItem value="Testing Pending">Testing Pending</MenuItem>
                    <MenuItem value="Evidence Missing">Evidence Missing</MenuItem>
                    <MenuItem value="Partially Mapped">Partially Mapped</MenuItem>
                    <MenuItem value="Not Mapped">Not Mapped</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Applicability</InputLabel>
                  <Select
                    label="Applicability"
                    value={applicabilityFilter}
                    onChange={(e) => setApplicabilityFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Catalog Items</MenuItem>
                    <MenuItem value="Applicable">Applicable Only</MenuItem>
                    <MenuItem value="Not Applicable">Not Applicable (Excluded)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredRequirements.map((req) => {
              const fw = frameworkMap.get(req.frameworkId);
              const tr = traceMap.get(req.requirementId);
              const mapping = disclosureMappings.find(
                (m) =>
                  m.engagementId === activeEngagementId && m.requirementId === req.requirementId
              );

              return (
                <Card key={req.requirementId} variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: 1.5,
                        mb: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          color="primary"
                          label={req.requirementCode}
                          sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${fw?.frameworkName ?? req.frameworkId} • ${req.pillar}`}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {req.requirementTitle}
                        </Typography>
                        {req.applicabilityStatus === 'Not Applicable' && (
                          <Chip
                            size="small"
                            color="default"
                            label="Not Applicable (Excluded from Denominator)"
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {tr && (
                          <Chip
                            size="small"
                            color={statusColor(tr.traceabilityStatus)}
                            label={`Traceability: ${tr.traceabilityStatus}`}
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => openMappingModal(req)}
                        >
                          {mapping ? 'Edit Mapping' : 'Map Requirement'}
                        </Button>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {req.guidanceSummary} • <strong>Expected Unit:</strong> {req.expectedUnit} •{' '}
                      <strong>Type:</strong> {req.requirementType} ({req.mandatoryLevel})
                    </Typography>

                    {/* 9-Stage Logical Lineage Strip */}
                    {tr && (
                      <Grid container spacing={1} sx={{ alignItems: 'stretch' }}>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #123047',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              1. REQUIREMENT
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {req.requirementCode}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #087F8C',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              2. ASSERTIONS
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedAssertions.join(', ') || 'None'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #16A085',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              3. SOURCE RECORDS
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedSourceRecords.slice(0, 3).join(', ') || 'Direct'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #123047',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              4. CONTROLS
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedControls.join(', ') || 'None'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #087F8C',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              5. PROCEDURES
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedProcedures.join(', ') || 'None'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #16A085',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              6-7. SAMPLES &amp; TESTS
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedTests.join(', ') || 'Pending'} ({tr.linkedSamples.length} smp)
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop: '3px solid #2E7D32',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              8. EVIDENCE
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedEvidence.join(', ') || 'None'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              height: '100%',
                              borderTop:
                                tr.linkedFindings.length > 0
                                  ? '3px solid #D32F2F'
                                  : '3px solid #607080',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                              9. FINDINGS
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {tr.linkedFindings.join(', ') || '0 Open'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    )}

                    {tr && tr.missingLinks.length > 0 && req.applicabilityStatus === 'Applicable' && (
                      <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
                        <Typography variant="caption">
                          <strong>Missing Lineage / Readiness Gaps:</strong>{' '}
                          {tr.missingLinks.join(' • ')}
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Grid container spacing={2}>
          {disclosureAnalytics.byFramework.map((fwStat) => {
            const fw = frameworkMap.get(fwStat.frameworkId);
            return (
              <Grid key={fwStat.frameworkId} size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {fwStat.frameworkName}
                      </Typography>
                      <Chip
                        size="small"
                        color="primary"
                        label={`${fwStat.coveragePct}% Mapped`}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      Version: {fwStat.frameworkVersion} • Issuing Body: {fw?.issuingOrganization} • Jurisdiction: {fw?.jurisdiction}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {fw?.description}
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          Applicable In Scope
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {fwStat.applicableCount}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          Excluded N/A
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {fwStat.notApplicableCount}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          Internally Reviewed
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {fwStat.internallyReviewedCount}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {activeTab === 2 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField
                size="small"
                label="Search Evidence ID, Assertion, Control, or Finding..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel>Lineage Provenance Category</InputLabel>
                <Select
                  label="Lineage Provenance Category"
                  value={provenanceFilter}
                  onChange={(e) => setProvenanceFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Provenance Categories</MenuItem>
                  <MenuItem value="Accepted Evidence">Accepted Evidence</MenuItem>
                  <MenuItem value="Unreviewed Uploaded Evidence">
                    Unreviewed Uploaded Evidence
                  </MenuItem>
                  <MenuItem value="Rejected Evidence">Rejected Evidence</MenuItem>
                  <MenuItem value="Metadata-Only Demo Reference">
                    Metadata-Only Demo Reference
                  </MenuItem>
                  <MenuItem value="Missing Evidence">Missing Evidence</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Card>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {engagementChains.map((chain) => (
              <Card key={chain.chainId} variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        color="primary"
                        label={chain.evidenceRecord?.evidenceId ?? 'NO-EVIDENCE'}
                        sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {chain.evidenceRecord?.documentName ?? 'Missing Supporting Evidence'}
                      </Typography>
                      <Chip size="small" variant="outlined" label={chain.provenanceCategory} />
                    </Box>
                    <Chip
                      size="small"
                      icon={<VerifiedUserOutlinedIcon />}
                      label={chain.assertionIndependentlyVerifiedNote}
                      color={chain.provenanceCategory === 'Accepted Evidence' ? 'info' : 'warning'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Assertion: {chain.assertion?.assertionId ?? 'N/A'} • Control:{' '}
                    {chain.control?.controlId ?? 'N/A'} • Finding:{' '}
                    {chain.finding?.auditFindingId ?? 'None'}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Dialog: Edit Disclosure Mapping */}
      <Dialog
        open={mappingDialogOpen}
        onClose={() => setMappingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Map Disclosure Requirement — {selectedReq?.requirementCode} ({selectedReq?.requirementTitle})
        </DialogTitle>
        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Mapping Status</InputLabel>
                <Select
                  label="Mapping Status"
                  value={mapStatus}
                  onChange={(e) => setMapStatus(e.target.value as DisclosureMappingStatus)}
                >
                  <MenuItem value="Not Mapped">Not Mapped</MenuItem>
                  <MenuItem value="Partially Mapped">Partially Mapped</MenuItem>
                  <MenuItem value="Fully Mapped">Fully Mapped</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Coverage Percentage (0 - 100%)"
                value={mapCoveragePct}
                onChange={(e) => setMapCoveragePct(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Linked ESG Assertions</InputLabel>
                <Select
                  multiple
                  label="Linked ESG Assertions"
                  value={mapAssertionIds}
                  onChange={(e) =>
                    setMapAssertionIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                >
                  {engAssertions.map((a) => (
                    <MenuItem key={a.assertionId} value={a.assertionId}>
                      {a.assertionId} — {a.metricName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Linked Internal Controls</InputLabel>
                <Select
                  multiple
                  label="Linked Internal Controls"
                  value={mapControlIds}
                  onChange={(e) =>
                    setMapControlIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                >
                  {engControls.map((c) => (
                    <MenuItem key={c.controlId} value={c.controlId}>
                      {c.controlId} — {c.controlName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Linked Audit Procedures</InputLabel>
                <Select
                  multiple
                  label="Linked Audit Procedures"
                  value={mapProcedureIds}
                  onChange={(e) =>
                    setMapProcedureIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                >
                  {auditProcedures.map((p) => (
                    <MenuItem key={p.procedureId} value={p.procedureId}>
                      {p.procedureId} — {p.procedureName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Linked Evidence Records</InputLabel>
                <Select
                  multiple
                  label="Linked Evidence Records"
                  value={mapEvidenceIds}
                  onChange={(e) =>
                    setMapEvidenceIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : e.target.value
                    )
                  }
                >
                  {engEvidence.map((ev) => (
                    <MenuItem key={ev.evidenceId} value={ev.evidenceId}>
                      {ev.evidenceId} — {ev.documentName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Mapping Rationale"
                value={mapRationale}
                onChange={(e) => setMapRationale(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Identified Gaps"
                value={mapGaps}
                onChange={(e) => setMapGaps(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Reviewed By (Independent Reviewer)"
                value={mapReviewedBy}
                onChange={(e) => setMapReviewedBy(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveMapping()}>
            Save Disclosure Mapping
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Create Disclosure Requirement */}
      <Dialog
        open={reqDialogOpen}
        onClose={() => setReqDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Disclosure Requirement to Catalog</DialogTitle>
        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Framework</InputLabel>
                <Select
                  label="Framework"
                  value={newReqFrameworkId}
                  onChange={(e) => setNewReqFrameworkId(e.target.value)}
                >
                  {disclosureFrameworks.map((fw) => (
                    <MenuItem key={fw.frameworkId} value={fw.frameworkId}>
                      {fw.frameworkName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Requirement Code (e.g. ESRS E2-4)"
                value={newReqCode}
                onChange={(e) => setNewReqCode(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Requirement Title"
                value={newReqTitle}
                onChange={(e) => setNewReqTitle(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ESG Pillar</InputLabel>
                <Select
                  label="ESG Pillar"
                  value={newReqPillar}
                  onChange={(e) => setNewReqPillar(e.target.value as ESGPillar)}
                >
                  <MenuItem value="Environmental">Environmental</MenuItem>
                  <MenuItem value="Social">Social</MenuItem>
                  <MenuItem value="Governance">Governance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Applicability Status</InputLabel>
                <Select
                  label="Applicability Status"
                  value={newReqApplicability}
                  onChange={(e) =>
                    setNewReqApplicability(e.target.value as DisclosureApplicabilityStatus)
                  }
                >
                  <MenuItem value="Applicable">Applicable</MenuItem>
                  <MenuItem value="Not Applicable">Not Applicable (Excluded)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Topic"
                value={newReqTopic}
                onChange={(e) => setNewReqTopic(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Expected Unit"
                value={newReqUnit}
                onChange={(e) => setNewReqUnit(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Guidance Summary (Illustrative Reference)"
                value={newReqGuidance}
                onChange={(e) => setNewReqGuidance(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleCreateRequirement()}>
            Save Requirement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Import JSON Requirement Catalog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Configurable Requirement Catalog (JSON)</DialogTitle>
        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            All imported fields are validated with Zod and sanitized against HTML/script injection. Duplicate requirement codes within the same framework are rejected.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleImportCatalog()}>
            Validate &amp; Import Catalog
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
