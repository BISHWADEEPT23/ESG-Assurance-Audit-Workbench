import React, { useMemo } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { createWorkbenchTheme } from './theme/muiTheme';
import { AppShell } from './components/AppShell';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
import { EngagementManagementPage } from './pages/EngagementManagementPage';
import { ESGAssertionsPage } from './pages/ESGAssertionsPage';
import { ControlLibraryPage } from './pages/ControlLibraryPage';
import { EvidenceRegisterPage } from './pages/EvidenceRegisterPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { SettingsMethodologyPage } from './pages/SettingsMethodologyPage';
import { AuditPlanningPage } from './pages/AuditPlanningPage';
import { ControlTestingPage } from './pages/ControlTestingPage';
import { GHGVerificationPage } from './pages/GHGVerificationPage';
import { FindingsRemediationPage } from './pages/FindingsRemediationPage';
import { DisclosureTraceabilityPage } from './pages/DisclosureTraceabilityPage';
import { MaterialityWorkbenchPage } from './pages/MaterialityWorkbenchPage';
import { AssuranceReportsPage } from './pages/AssuranceReportsPage';
import { AdvancedAnalyticsPage } from './pages/AdvancedAnalyticsPage';
import { AiCopilotPage } from './pages/AiCopilotPage';
import { BackupRestorePage } from './pages/BackupRestorePage';

const WorkbenchThemedRouter: React.FC = () => {
  const { themeMode, loading } = useWorkbench();
  const muiTheme = useMemo(() => createWorkbenchTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppShell>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 360,
              gap: 2,
            }}
          >
            <CircularProgress color="secondary" />
            <Typography variant="body2" color="text.secondary">
              Initializing IndexedDB v4 Repository (33 Stores) &amp; Deterministic Assurance Engines...
            </Typography>
          </Box>
        ) : (
          <Routes>
            {/* Phase 1, Phase 2, Phase 3 & Phase 4 Production Workspaces (v1.0.0) */}
            <Route path="/" element={<ExecutiveDashboardPage />} />
            <Route path="/engagements" element={<EngagementManagementPage />} />
            <Route path="/assertions" element={<ESGAssertionsPage />} />
            <Route path="/controls" element={<ControlLibraryPage />} />
            <Route path="/audit-planning" element={<AuditPlanningPage />} />
            <Route path="/evidence" element={<EvidenceRegisterPage />} />
            <Route path="/control-testing" element={<ControlTestingPage />} />
            <Route path="/ghg-verification" element={<GHGVerificationPage />} />
            <Route path="/findings-remediation" element={<FindingsRemediationPage />} />
            <Route path="/findings" element={<FindingsRemediationPage />} />
            <Route path="/disclosure-traceability" element={<DisclosureTraceabilityPage />} />
            <Route path="/materiality" element={<MaterialityWorkbenchPage />} />
            <Route path="/assurance-reports" element={<AssuranceReportsPage />} />
            <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
            <Route path="/ai-copilot" element={<AiCopilotPage />} />
            <Route path="/ai-assistant" element={<AiCopilotPage />} />
            <Route path="/backup-restore" element={<BackupRestorePage />} />
            <Route path="/audit-trail" element={<AuditTrailPage />} />
            <Route path="/settings" element={<SettingsMethodologyPage />} />
          </Routes>
        )}
      </AppShell>
    </ThemeProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <WorkbenchProvider>
        <WorkbenchThemedRouter />
      </WorkbenchProvider>
    </BrowserRouter>
  );
}
