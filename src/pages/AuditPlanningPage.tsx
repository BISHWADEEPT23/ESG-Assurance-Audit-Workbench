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
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Assignment as PlanIcon,
  Calculate as SampleIcon,
  CheckCircleOutlined,
  Edit as EditIcon,
  PlaylistAddCheck as ProcedureIcon,
  WarningAmber as RiskIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkbench } from '../context/WorkbenchContext';
import {
  AuditPlan,
  AuditPlanStatus,
  AuditProcedure,
  AuditProcedureStatus,
  AuditProcedureType,
  RiskAssessment,
  RiskCategory,
  SampleItem,
  SamplingMethod,
} from '../types/domain';
import { calculateInherentRisk } from '../services/riskEngine';

const PLAN_STATUSES: AuditPlanStatus[] = [
  'Draft',
  'Under Review',
  'Approved for Internal Testing',
  'Testing in Progress',
  'Testing Completed',
  'Closed',
];

const PROCEDURE_TYPES: AuditProcedureType[] = [
  'Inquiry',
  'Observation',
  'Inspection',
  'Reperformance',
  'Recalculation',
  'Analytical Review',
];

const PROCEDURE_STATUSES: AuditProcedureStatus[] = [
  'Planned',
  'In Progress',
  'Submitted for Review',
  'Completed',
  'Blocked',
];

const RISK_CATEGORIES: RiskCategory[] = [
  'Data Completeness',
  'Measurement & Calibration',
  'Emission Factor Selection',
  'Consolidation Boundary',
  'Manual Spreadsheet Processing',
  'Supplier Primary Data',
  'Regulatory Classification',
];

const SAMPLING_METHODS: SamplingMethod[] = [
  'Simple Random Sampling',
  'Systematic Sampling',
  'Monetary-Unit Sampling',
  'Risk-Based Judgmental Selection',
];

export const AuditPlanningPage: React.FC = () => {
  const {
    engagements,
    assertions,
    controls,
    auditPlans,
    auditProcedures,
    riskAssessments,
    samplingPlans,
    sampleItems,
    filters,
    activeActor,
    saveAuditPlan,
    saveAuditProcedure,
    saveRiskAssessment,
    createSamplingPlanAndSelectItems,
    updateSampleItemResult,
  } = useWorkbench();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Audit Plan Dialog State
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | undefined>(undefined);
  const [planForm, setPlanForm] = useState<Omit<AuditPlan, 'auditPlanId' | 'createdAt' | 'updatedAt'>>({
    engagementId: engagements[1]?.engagementId ?? 'ENG-2025-002',
    reportingYear: 'FY 2025',
    auditObjective: '',
    auditScope: '',
    reportingBoundary: 'Operational Control (EU & North America)',
    auditCriteria: 'CSRD / ESRS E1 & GHG Protocol + ISO 14064-3:2019',
    methodologyVersion: 'ISO 14064-3:2019 / ISSA 5000 (v0.2.0)',
    plannedStartDate: '2026-01-15',
    plannedEndDate: '2026-03-31',
    planningMateriality: 5.0,
    materialityUnit: '% of Scope Total tCO2e',
    materialityRationale: '',
    overallRiskAssessment: 'High',
    status: 'Draft',
  });

  // Audit Procedure Dialog State
  const [procDialogOpen, setProcDialogOpen] = useState(false);
  const [editingProcId, setEditingProcId] = useState<string | undefined>(undefined);
  const [procForm, setProcForm] = useState<Omit<AuditProcedure, 'procedureId' | 'createdAt' | 'updatedAt'>>({
    auditPlanId: auditPlans[0]?.auditPlanId ?? 'APL-2025-001',
    linkedAssertionIds: [assertions[0]?.assertionId ?? 'AST-ASN-001'],
    linkedControlIds: [controls[0]?.controlId ?? 'AST-CTL-001'],
    procedureName: '',
    auditObjective: '',
    procedureType: 'Recalculation',
    testingMethod: 'Statistical Sampling',
    populationDefinition: '',
    expectedEvidence: '',
    assignedPreparer: activeActor,
    assignedReviewer: 'Dr. Henrik Lindqvist (Lead ESG Assurance Partner)',
    plannedSampleSize: 8,
    status: 'Planned',
  });

  // Risk Assessment Dialog State
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState<string | undefined>(undefined);
  const [riskForm, setRiskForm] = useState<{
    engagementId: string;
    linkedAssertionId: string;
    linkedControlId: string;
    riskCategory: RiskCategory;
    likelihood: number;
    impact: number;
    controlEffectivenessBasis: string;
    controlRiskScore: string;
    assessmentRationale: string;
    assessedBy: string;
  }>({
    engagementId: engagements[1]?.engagementId ?? 'ENG-2025-002',
    linkedAssertionId: assertions[0]?.assertionId ?? 'AST-ASN-001',
    linkedControlId: controls[0]?.controlId ?? 'AST-CTL-001',
    riskCategory: 'Measurement & Calibration',
    likelihood: 4,
    impact: 4,
    controlEffectivenessBasis: '',
    controlRiskScore: '',
    assessmentRationale: '',
    assessedBy: activeActor,
  });

  // Sampling Plan Dialog State
  const [samplingDialogOpen, setSamplingDialogOpen] = useState(false);
  const [samplingForm, setSamplingForm] = useState<{
    procedureId: string;
    populationId: string;
    samplingMethod: SamplingMethod;
    requestedSampleSize: number;
    randomSeed: number;
    judgmentalRationale: string;
    riskCriteria: string;
  }>({
    procedureId: auditProcedures[0]?.procedureId ?? 'PRC-001',
    populationId: 'POP-FY2025-METERS',
    samplingMethod: 'Simple Random Sampling',
    requestedSampleSize: 6,
    randomSeed: 20250214,
    judgmentalRationale:
      'Seeded Simple Random Sampling without replacement across facility meter and invoice population.',
    riskCriteria: 'High-volume combustion and grid electricity facilities',
  });

  const filteredPlans = useMemo(() => {
    return auditPlans.filter((p) => {
      if (filters.engagementId !== 'ALL' && p.engagementId !== filters.engagementId) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          p.auditPlanId.toLowerCase().includes(q) ||
          p.auditObjective.toLowerCase().includes(q) ||
          p.auditCriteria.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditPlans, filters.engagementId, statusFilter, searchTerm]);

  const filteredProcedures = useMemo(() => {
    return auditProcedures.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          p.procedureId.toLowerCase().includes(q) ||
          p.procedureName.toLowerCase().includes(q) ||
          p.procedureType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditProcedures, searchTerm]);

  const filteredRisks = useMemo(() => {
    return riskAssessments.filter((r) => {
      if (filters.engagementId !== 'ALL' && r.engagementId !== filters.engagementId) return false;
      return true;
    });
  }, [riskAssessments, filters.engagementId]);

  // 5x5 Inherent Risk Heatmap Matrix (Impact 5..1 rows, Likelihood 1..5 cols)
  const heatmapMatrix = useMemo(() => {
    const rows: Array<{
      impact: number;
      cells: Array<{
        likelihood: number;
        score: number;
        band: string;
        count: number;
      }>;
    }> = [];
    const impacts = [5, 4, 3, 2, 1];
    const likelihoods = [1, 2, 3, 4, 5];

    for (const impact of impacts) {
      const cells = likelihoods.map((likelihood) => {
        const { inherentRiskScore, inherentRiskBand } = calculateInherentRisk(likelihood, impact);
        const count = filteredRisks.filter(
          (r) => r.likelihood === likelihood && r.impact === impact
        ).length;
        return { likelihood, score: inherentRiskScore, band: inherentRiskBand, count };
      });
      rows.push({ impact, cells });
    }
    return rows;
  }, [filteredRisks]);

  // Risk by ESG Pillar chart
  const riskByPillarData = useMemo(() => {
    const pillars = ['Environmental', 'Social', 'Governance'] as const;
    return pillars.map((pillar) => {
      const pillarAssertionIds = new Set(
        assertions.filter((a) => a.pillar === pillar).map((a) => a.assertionId)
      );
      const matching = filteredRisks.filter((r) => pillarAssertionIds.has(r.linkedAssertionId));
      return {
        pillar,
        Critical: matching.filter((r) => r.inherentRiskBand === 'Critical').length,
        High: matching.filter((r) => r.inherentRiskBand === 'High').length,
        Moderate: matching.filter((r) => r.inherentRiskBand === 'Moderate').length,
        Low: matching.filter((r) => r.inherentRiskBand === 'Low').length,
      };
    });
  }, [filteredRisks, assertions]);

  const openEditPlan = (plan?: AuditPlan) => {
    setFormError(null);
    if (plan) {
      setEditingPlanId(plan.auditPlanId);
      setPlanForm({
        engagementId: plan.engagementId,
        reportingYear: plan.reportingYear,
        auditObjective: plan.auditObjective,
        auditScope: plan.auditScope,
        reportingBoundary: plan.reportingBoundary,
        auditCriteria: plan.auditCriteria,
        methodologyVersion: plan.methodologyVersion,
        plannedStartDate: plan.plannedStartDate,
        plannedEndDate: plan.plannedEndDate,
        planningMateriality: plan.planningMateriality,
        materialityUnit: plan.materialityUnit,
        materialityRationale: plan.materialityRationale,
        overallRiskAssessment: plan.overallRiskAssessment,
        status: plan.status,
      });
    } else {
      setEditingPlanId(undefined);
    }
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      setFormError(null);
      if (planForm.auditObjective.trim().length < 10) {
        setFormError('Audit objective must be at least 10 characters.');
        return;
      }
      if (planForm.planningMateriality <= 0) {
        setFormError('Planning materiality must be greater than zero.');
        return;
      }
      const saved = await saveAuditPlan(planForm, editingPlanId);
      setPlanDialogOpen(false);
      setSuccessMsg(
        `Audit Plan ${saved.auditPlanId} saved (${saved.status}). Note: An approved audit plan is an internal workflow milestone, not an independent assurance opinion.`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save audit plan.');
    }
  };

  const openEditProcedure = (proc?: AuditProcedure) => {
    setFormError(null);
    if (proc) {
      setEditingProcId(proc.procedureId);
      setProcForm({
        auditPlanId: proc.auditPlanId,
        linkedAssertionIds: proc.linkedAssertionIds,
        linkedControlIds: proc.linkedControlIds,
        procedureName: proc.procedureName,
        auditObjective: proc.auditObjective,
        procedureType: proc.procedureType,
        testingMethod: proc.testingMethod,
        populationDefinition: proc.populationDefinition,
        expectedEvidence: proc.expectedEvidence,
        assignedPreparer: proc.assignedPreparer,
        assignedReviewer: proc.assignedReviewer,
        plannedSampleSize: proc.plannedSampleSize,
        status: proc.status,
      });
    } else {
      setEditingProcId(undefined);
    }
    setProcDialogOpen(true);
  };

  const handleSaveProcedure = async () => {
    try {
      setFormError(null);
      if (procForm.procedureName.trim().length < 5) {
        setFormError('Procedure name must be at least 5 characters.');
        return;
      }
      const saved = await saveAuditProcedure(procForm, editingProcId);
      setProcDialogOpen(false);
      setSuccessMsg(`Audit Procedure ${saved.procedureId} saved (${saved.status}).`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save audit procedure.');
    }
  };

  const openEditRisk = (risk?: RiskAssessment) => {
    setFormError(null);
    if (risk) {
      setEditingRiskId(risk.riskAssessmentId);
      setRiskForm({
        engagementId: risk.engagementId,
        linkedAssertionId: risk.linkedAssertionId,
        linkedControlId: risk.linkedControlId,
        riskCategory: risk.riskCategory,
        likelihood: risk.likelihood,
        impact: risk.impact,
        controlEffectivenessBasis: risk.controlEffectivenessBasis ?? '',
        controlRiskScore: risk.controlRiskScore !== null ? String(risk.controlRiskScore) : '',
        assessmentRationale: risk.assessmentRationale,
        assessedBy: risk.assessedBy,
      });
    } else {
      setEditingRiskId(undefined);
    }
    setRiskDialogOpen(true);
  };

  const handleSaveRisk = async () => {
    try {
      setFormError(null);
      if (riskForm.assessmentRationale.trim().length < 8) {
        setFormError('Assessment rationale must be at least 8 characters.');
        return;
      }
      const parsedCtlScore =
        riskForm.controlRiskScore.trim() !== '' ? Number(riskForm.controlRiskScore) : null;
      const saved = await saveRiskAssessment(
        {
          engagementId: riskForm.engagementId,
          linkedAssertionId: riskForm.linkedAssertionId,
          linkedControlId: riskForm.linkedControlId,
          riskCategory: riskForm.riskCategory,
          likelihood: riskForm.likelihood,
          impact: riskForm.impact,
          controlEffectivenessBasis: riskForm.controlEffectivenessBasis.trim() || null,
          controlRiskScore: parsedCtlScore,
          assessmentRationale: riskForm.assessmentRationale,
          evidenceReferences: [],
          assessedBy: riskForm.assessedBy,
        },
        editingRiskId
      );
      setRiskDialogOpen(false);
      setSuccessMsg(
        `Risk Assessment ${saved.riskAssessmentId} saved: Inherent = ${saved.inherentRiskScore} (${saved.inherentRiskBand}), Residual = ${
          saved.residualRiskScore !== null
            ? `${saved.residualRiskScore} (${saved.residualRiskBand})`
            : 'Unassessed (no documented control-effectiveness basis)'
        }.`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save risk assessment.');
    }
  };

  const handleExecuteSampling = async () => {
    try {
      setFormError(null);
      const res = await createSamplingPlanAndSelectItems({
        procedureId: samplingForm.procedureId,
        populationId: samplingForm.populationId,
        samplingMethod: samplingForm.samplingMethod,
        requestedSampleSize: samplingForm.requestedSampleSize,
        randomSeed: samplingForm.randomSeed,
        judgmentalRationale: samplingForm.judgmentalRationale,
        riskCriteria: samplingForm.riskCriteria,
      });
      setSamplingDialogOpen(false);
      setSuccessMsg(
        `Sampling Plan ${res.plan.samplingPlanId} executed (${res.plan.samplingMethod}): ${res.items.length} sample items deterministically selected.`
      );
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Sampling execution failed.');
    }
  };

  const planColumns: GridColDef<AuditPlan>[] = [
    {
      field: 'auditPlanId',
      headerName: 'Plan ID',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'engagementId', headerName: 'Engagement', width: 150 },
    { field: 'reportingYear', headerName: 'Period', width: 95 },
    { field: 'auditObjective', headerName: 'Audit Objective', flex: 1, minWidth: 260 },
    {
      field: 'planningMateriality',
      headerName: 'Materiality Threshold',
      width: 190,
      renderCell: (params: GridRenderCellParams<AuditPlan>) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {params.row.planningMateriality} {params.row.materialityUnit}
        </Typography>
      ),
    },
    {
      field: 'overallRiskAssessment',
      headerName: 'Overall Risk',
      width: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={
            params.value === 'Critical' || params.value === 'High'
              ? 'error'
              : params.value === 'Moderate'
                ? 'warning'
                : 'success'
          }
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Workflow Milestone',
      width: 210,
      renderCell: (params) => (
        <Chip
          size="small"
          variant="outlined"
          color={params.value === 'Approved for Internal Testing' ? 'success' : 'primary'}
          label={params.value}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params: GridRenderCellParams<AuditPlan>) => (
        <Button size="small" startIcon={<EditIcon />} onClick={() => openEditPlan(params.row)}>
          Edit
        </Button>
      ),
    },
  ];

  const procedureColumns: GridColDef<AuditProcedure>[] = [
    {
      field: 'procedureId',
      headerName: 'Proc ID',
      width: 115,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'auditPlanId', headerName: 'Plan ID', width: 145 },
    { field: 'procedureName', headerName: 'Procedure Name', flex: 1, minWidth: 240 },
    {
      field: 'procedureType',
      headerName: 'Type',
      width: 140,
      renderCell: (params) => <Chip size="small" label={params.value} />,
    },
    { field: 'testingMethod', headerName: 'Testing Method', width: 175 },
    {
      field: 'plannedSampleSize',
      headerName: 'Planned Sample',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
          n = {params.value}
        </Typography>
      ),
    },
    { field: 'assignedPreparer', headerName: 'Preparer', width: 180 },
    {
      field: 'status',
      headerName: 'Status',
      width: 155,
      renderCell: (params) => (
        <Chip
          size="small"
          color={
            params.value === 'Completed'
              ? 'success'
              : params.value === 'In Progress'
                ? 'primary'
                : 'default'
          }
          label={params.value}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<AuditProcedure>) => (
        <Button size="small" startIcon={<EditIcon />} onClick={() => openEditProcedure(params.row)}>
          Edit
        </Button>
      ),
    },
  ];

  const riskColumns: GridColDef<RiskAssessment>[] = [
    {
      field: 'riskAssessmentId',
      headerName: 'Risk ID',
      width: 110,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'linkedAssertionId', headerName: 'Assertion', width: 130 },
    { field: 'linkedControlId', headerName: 'Control', width: 130 },
    { field: 'riskCategory', headerName: 'Risk Category', width: 200 },
    {
      field: 'inherentRiskScore',
      headerName: 'Inherent Risk (L×I)',
      width: 175,
      renderCell: (params: GridRenderCellParams<RiskAssessment>) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            {params.row.likelihood}×{params.row.impact} = {params.row.inherentRiskScore}
          </Typography>
          <Chip
            size="small"
            label={params.row.inherentRiskBand}
            color={
              params.row.inherentRiskBand === 'Critical' || params.row.inherentRiskBand === 'High'
                ? 'error'
                : params.row.inherentRiskBand === 'Moderate'
                  ? 'warning'
                  : 'success'
            }
          />
        </Stack>
      ),
    },
    {
      field: 'residualRiskScore',
      headerName: 'Residual Risk',
      width: 195,
      renderCell: (params: GridRenderCellParams<RiskAssessment>) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {params.row.residualRiskScore !== null ? params.row.residualRiskScore : 'NULL'}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={params.row.residualRiskBand}
            color={params.row.residualRiskBand === 'Unassessed' ? 'default' : 'primary'}
          />
        </Stack>
      ),
    },
    { field: 'controlEffectivenessBasis', headerName: 'Control Effectiveness Basis', flex: 1, minWidth: 240 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RiskAssessment>) => (
        <Button size="small" startIcon={<EditIcon />} onClick={() => openEditRisk(params.row)}>
          Edit
        </Button>
      ),
    },
  ];

  const sampleItemColumns: GridColDef<SampleItem>[] = [
    {
      field: 'sampleItemId',
      headerName: 'Sample Item ID',
      width: 165,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'samplingPlanId', headerName: 'Sampling Plan', width: 125 },
    { field: 'populationRecordId', headerName: 'Population Record ID', width: 165 },
    {
      field: 'selectedValue',
      headerName: 'Selected Value',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {Number(params.value).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'hitCount',
      headerName: 'MUS Hits',
      width: 95,
      renderCell: (params) => (
        <Chip size="small" variant="outlined" label={`${params.value ?? 1}x`} />
      ),
    },
    { field: 'selectionReason', headerName: 'Selection Reason / Formula', flex: 1, minWidth: 220 },
    {
      field: 'testingStatus',
      headerName: 'Testing Status',
      width: 205,
      renderCell: (params) => (
        <Chip
          size="small"
          color={
            params.value === 'Tested - No Exception'
              ? 'success'
              : params.value === 'Tested - Exception Identified'
                ? 'error'
                : 'default'
          }
          label={params.value}
        />
      ),
    },
    {
      field: 'quickAction',
      headerName: 'Mark Tested',
      width: 185,
      sortable: false,
      renderCell: (params: GridRenderCellParams<SampleItem>) => (
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            color="success"
            onClick={() =>
              void updateSampleItemResult(params.row.sampleItemId, {
                testingStatus: 'Tested - No Exception',
                exceptionNotes: '',
              })
            }
          >
            Pass
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() =>
              void updateSampleItemResult(params.row.sampleItemId, {
                testingStatus: 'Tested - Exception Identified',
                exceptionNotes: 'Variance identified during source-to-ledger voucher inspection.',
              })
            }
          >
            Exception
          </Button>
        </Stack>
      ),
    },
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
            Audit Planning, Risk Assessment & Sampling Engine
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ISO 14064-3 & ISSA 5000 planning materiality, 5×5 inherent/residual risk scoring, and deterministic PRNG / MUS sampling
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<PlanIcon />}
            onClick={() => openEditPlan(undefined)}
          >
            New Audit Plan
          </Button>
          <Button
            variant="outlined"
            startIcon={<ProcedureIcon />}
            onClick={() => openEditProcedure(undefined)}
          >
            New Procedure
          </Button>
          <Button
            variant="outlined"
            startIcon={<RiskIcon />}
            onClick={() => openEditRisk(undefined)}
          >
            Assess Risk
          </Button>
          <Button
            variant="contained"
            startIcon={<SampleIcon />}
            onClick={() => {
              setFormError(null);
              setSamplingDialogOpen(true);
            }}
          >
            Generate Audit Sample
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

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 2, pt: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Audit Plans & Procedures (${filteredPlans.length} Plans / ${filteredProcedures.length} Procs)`} />
          <Tab label={`Risk Assessment & 5×5 Heatmap (${filteredRisks.length})`} />
          <Tab label={`Audit Sampling Engine (${samplingPlans.length} Plans / ${sampleItems.length} Items)`} />
        </Tabs>

        <CardContent>
          {activeTab === 0 && (
            <Stack spacing={3}>
              <Alert severity="info">
                <strong>Methodological Guardrail:</strong> An approved audit plan (
                <code>Approved for Internal Testing</code>) is an internal workflow milestone and
                never constitutes an independent assurance opinion.
              </Alert>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  size="small"
                  label="Search Audit Plans or Procedures"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ minWidth: 280 }}
                />
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Plan Status Filter</InputLabel>
                  <Select
                    label="Plan Status Filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    {PLAN_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Audit Plans
                </Typography>
                <Box sx={{ height: 280, width: '100%' }}>
                  <DataGrid
                    rows={filteredPlans}
                    getRowId={(r) => r.auditPlanId}
                    columns={planColumns}
                    disableRowSelectionOnClick
                    pageSizeOptions={[5, 10]}
                  />
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Audit Procedures & Linked Workpapers
                </Typography>
                <Box sx={{ height: 360, width: '100%' }}>
                  <DataGrid
                    rows={filteredProcedures}
                    getRowId={(r) => r.procedureId}
                    columns={procedureColumns}
                    disableRowSelectionOnClick
                    pageSizeOptions={[5, 10]}
                  />
                </Box>
              </Box>
            </Stack>
          )}

          {activeTab === 1 && (
            <Stack spacing={3}>
              <Alert severity="warning">
                <strong>Residual Risk Guardrail:</strong> Inherent Risk = Likelihood × Impact (1–25:
                1–5 Low, 6–10 Moderate, 11–15 High, 16–25 Critical). Residual Risk cannot be reduced
                below Inherent Risk unless a documented control-effectiveness basis exists;
                otherwise Residual Risk remains <code>Unassessed (NULL)</code>.
              </Alert>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        5×5 Inherent Risk Heatmap (Likelihood vs. Impact)
                      </Typography>
                      <Stack spacing={1}>
                        {heatmapMatrix.map((row) => (
                          <Stack
                            key={row.impact}
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ width: 70, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
                            >
                              Impact {row.impact}
                            </Typography>
                            {row.cells.map((cell) => {
                              const bg =
                                cell.band === 'Critical'
                                  ? 'rgba(211, 47, 47, 0.18)'
                                  : cell.band === 'High'
                                    ? 'rgba(237, 108, 2, 0.18)'
                                    : cell.band === 'Moderate'
                                      ? 'rgba(2, 136, 209, 0.15)'
                                      : 'rgba(46, 125, 50, 0.14)';
                              return (
                                <Box
                                  key={`${row.impact}-${cell.likelihood}`}
                                  sx={{
                                    flex: 1,
                                    p: 1,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: bg,
                                    textAlign: 'center',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                                  >
                                    Score {cell.score}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {cell.count} {cell.count === 1 ? 'assertion' : 'assertions'}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Stack>
                        ))}
                        <Stack direction="row" spacing={1} sx={{ pl: '78px' }}>
                          {[1, 2, 3, 4, 5].map((l) => (
                            <Typography
                              key={l}
                              variant="caption"
                              sx={{ flex: 1, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}
                            >
                              Likelihood {l}
                            </Typography>
                          ))}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Risk Distribution by ESG Pillar
                      </Typography>
                      <Box sx={{ height: 260, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={riskByPillarData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="pillar" />
                            <YAxis allowDecimals={false} />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="Critical" stackId="a" fill="#D32F2F" />
                            <Bar dataKey="High" stackId="a" fill="#ED6C02" />
                            <Bar dataKey="Moderate" stackId="a" fill="#087F8C" />
                            <Bar dataKey="Low" stackId="a" fill="#2E7D32" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ height: 380, width: '100%' }}>
                <DataGrid
                  rows={filteredRisks}
                  getRowId={(r) => r.riskAssessmentId}
                  columns={riskColumns}
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10]}
                />
              </Box>
            </Stack>
          )}

          {activeTab === 2 && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                {samplingPlans.map((plan) => {
                  const items = sampleItems.filter(
                    (i) => i.samplingPlanId === plan.samplingPlanId
                  );
                  const tested = items.filter(
                    (i) => i.testingStatus !== 'Selected - Untested'
                  ).length;
                  const exceptions = items.filter(
                    (i) => i.testingStatus === 'Tested - Exception Identified'
                  ).length;
                  return (
                    <Grid key={plan.samplingPlanId} size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack
                            direction="row"
                            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                            >
                              {plan.samplingPlanId} — {plan.samplingMethod}
                            </Typography>
                            <Chip
                              size="small"
                              color={plan.isStatistical ? 'primary' : 'secondary'}
                              label={plan.isStatistical ? 'Statistical' : 'Non-Statistical Judgmental'}
                            />
                          </Stack>
                          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`Population N = ${plan.populationSize}`}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`Sample n = ${plan.actualSampleSize}`}
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`PRNG Seed: ${plan.randomSeed}`}
                            />
                            <Chip
                              size="small"
                              color={tested === items.length ? 'success' : 'info'}
                              label={`Tested: ${tested}/${items.length}`}
                            />
                            <Chip
                              size="small"
                              color={exceptions > 0 ? 'error' : 'default'}
                              label={`Exceptions: ${exceptions}`}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Selected Audit Sample Items & Exception Tracking
                </Typography>
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={sampleItems}
                    getRowId={(r) => r.sampleItemId}
                    columns={sampleItemColumns}
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25]}
                  />
                </Box>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Audit Plan Dialog */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlanId ? `Edit Audit Plan ${editingPlanId}` : 'Create Audit Plan'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Engagement</InputLabel>
                  <Select
                    label="Engagement"
                    value={planForm.engagementId}
                    onChange={(e) => setPlanForm({ ...planForm, engagementId: e.target.value })}
                  >
                    {engagements.map((eng) => (
                      <MenuItem key={eng.engagementId} value={eng.engagementId}>
                        {eng.engagementId} — {eng.engagementName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Workflow Milestone Status</InputLabel>
                  <Select
                    label="Workflow Milestone Status"
                    value={planForm.status}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, status: e.target.value as AuditPlanStatus })
                    }
                  >
                    {PLAN_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Audit Objective"
              value={planForm.auditObjective}
              onChange={(e) => setPlanForm({ ...planForm, auditObjective: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Audit Scope"
              value={planForm.auditScope}
              onChange={(e) => setPlanForm({ ...planForm, auditScope: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Planning Materiality"
                  value={planForm.planningMateriality}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, planningMateriality: Number(e.target.value) })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Materiality Unit"
                  value={planForm.materialityUnit}
                  onChange={(e) => setPlanForm({ ...planForm, materialityUnit: e.target.value })}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Materiality Rationale"
              value={planForm.materialityRationale}
              onChange={(e) => setPlanForm({ ...planForm, materialityRationale: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSavePlan()}>
            Save Audit Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Procedure Dialog */}
      <Dialog open={procDialogOpen} onClose={() => setProcDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProcId ? `Edit Audit Procedure ${editingProcId}` : 'Create Audit Procedure'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              fullWidth
              size="small"
              label="Procedure Name"
              value={procForm.procedureName}
              onChange={(e) => setProcForm({ ...procForm, procedureName: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Procedure Type</InputLabel>
                  <Select
                    label="Procedure Type"
                    value={procForm.procedureType}
                    onChange={(e) =>
                      setProcForm({
                        ...procForm,
                        procedureType: e.target.value as AuditProcedureType,
                      })
                    }
                  >
                    {PROCEDURE_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Testing Method"
                  value={procForm.testingMethod}
                  onChange={(e) => setProcForm({ ...procForm, testingMethod: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={procForm.status}
                    onChange={(e) =>
                      setProcForm({
                        ...procForm,
                        status: e.target.value as AuditProcedureStatus,
                      })
                    }
                  >
                    {PROCEDURE_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Audit Objective"
              value={procForm.auditObjective}
              onChange={(e) => setProcForm({ ...procForm, auditObjective: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Population Definition"
              value={procForm.populationDefinition}
              onChange={(e) => setProcForm({ ...procForm, populationDefinition: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="Expected Evidence"
              value={procForm.expectedEvidence}
              onChange={(e) => setProcForm({ ...procForm, expectedEvidence: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveProcedure()}>
            Save Procedure
          </Button>
        </DialogActions>
      </Dialog>

      {/* Risk Assessment Dialog */}
      <Dialog open={riskDialogOpen} onClose={() => setRiskDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRiskId ? `Edit Risk Assessment ${editingRiskId}` : 'New Assertion Risk Assessment'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target ESG Assertion</InputLabel>
                  <Select
                    label="Target ESG Assertion"
                    value={riskForm.linkedAssertionId}
                    onChange={(e) =>
                      setRiskForm({ ...riskForm, linkedAssertionId: e.target.value })
                    }
                  >
                    {assertions.slice(0, 25).map((a) => (
                      <MenuItem key={a.assertionId} value={a.assertionId}>
                        {a.assertionId} — {a.metricCode}: {a.metricName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Linked Internal Control</InputLabel>
                  <Select
                    label="Linked Internal Control"
                    value={riskForm.linkedControlId}
                    onChange={(e) =>
                      setRiskForm({ ...riskForm, linkedControlId: e.target.value })
                    }
                  >
                    {controls.map((c) => (
                      <MenuItem key={c.controlId} value={c.controlId}>
                        {c.controlId} — {c.controlName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Likelihood Score (1–5)</InputLabel>
                  <Select
                    label="Likelihood Score (1–5)"
                    value={riskForm.likelihood}
                    onChange={(e) =>
                      setRiskForm({ ...riskForm, likelihood: Number(e.target.value) })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Impact Score (1–5)</InputLabel>
                  <Select
                    label="Impact Score (1–5)"
                    value={riskForm.impact}
                    onChange={(e) => setRiskForm({ ...riskForm, impact: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Risk Category</InputLabel>
                  <Select
                    label="Risk Category"
                    value={riskForm.riskCategory}
                    onChange={(e) =>
                      setRiskForm({
                        ...riskForm,
                        riskCategory: e.target.value as RiskCategory,
                      })
                    }
                  >
                    {RISK_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              size="small"
              label="Documented Control Effectiveness Basis (Leave blank if controls are untested)"
              placeholder="e.g., AST-CTL-001 tested Operating Effectively across 8/8 sample items"
              value={riskForm.controlEffectivenessBasis}
              onChange={(e) =>
                setRiskForm({ ...riskForm, controlEffectivenessBasis: e.target.value })
              }
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Control Risk Score (1–5, ignored if Control Effectiveness Basis is empty)"
              value={riskForm.controlRiskScore}
              onChange={(e) => setRiskForm({ ...riskForm, controlRiskScore: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Assessment Rationale"
              value={riskForm.assessmentRationale}
              onChange={(e) =>
                setRiskForm({ ...riskForm, assessmentRationale: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRiskDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveRisk()}>
            Evaluate & Save Risk
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sampling Generator Dialog */}
      <Dialog
        open={samplingDialogOpen}
        onClose={() => setSamplingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execute Deterministic Audit Sampling Plan</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Audit Procedure</InputLabel>
                  <Select
                    label="Target Audit Procedure"
                    value={samplingForm.procedureId}
                    onChange={(e) =>
                      setSamplingForm({ ...samplingForm, procedureId: e.target.value })
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
                  <InputLabel>Sampling Method</InputLabel>
                  <Select
                    label="Sampling Method"
                    value={samplingForm.samplingMethod}
                    onChange={(e) =>
                      setSamplingForm({
                        ...samplingForm,
                        samplingMethod: e.target.value as SamplingMethod,
                      })
                    }
                  >
                    {SAMPLING_METHODS.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
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
                  type="number"
                  label="Requested Sample Size (n)"
                  value={samplingForm.requestedSampleSize}
                  onChange={(e) =>
                    setSamplingForm({
                      ...samplingForm,
                      requestedSampleSize: Number(e.target.value),
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="PRNG Seed (Reproducibility)"
                  value={samplingForm.randomSeed}
                  onChange={(e) =>
                    setSamplingForm({ ...samplingForm, randomSeed: Number(e.target.value) })
                  }
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Selection Rationale (Mandatory for Risk-Based Judgmental Selection)"
              value={samplingForm.judgmentalRationale}
              onChange={(e) =>
                setSamplingForm({ ...samplingForm, judgmentalRationale: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSamplingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleExecuteSampling()}>
            Run Deterministic Selection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
