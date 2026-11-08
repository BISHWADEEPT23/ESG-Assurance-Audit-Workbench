import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountTreeOutlined,
  AssessmentOutlined,
  AssignmentOutlined,
  BalanceOutlined,
  ChevronLeft,
  ChevronRight,
  CloudDoneOutlined,
  DarkModeOutlined,
  DashboardOutlined,
  DescriptionOutlined,
  FactCheckOutlined,
  FolderSpecialOutlined,
  GppGoodOutlined,
  HistoryEduOutlined,
  InsightsOutlined,
  LightModeOutlined,
  Menu as MenuIcon,
  NotificationsOutlined,
  PsychologyOutlined,
  ReportProblemOutlined,
  RestartAltOutlined,
  ScienceOutlined,
  SettingsOutlined,
  StorageOutlined,
  VerifiedUserOutlined,
} from '@mui/icons-material';
import { useWorkbench } from '../context/WorkbenchContext';
import { ReportingYear } from '../types/domain';

export interface NavModuleItem {
  id: string;
  label: string;
  path: string;
  phase: 1 | 2;
  icon: React.ReactNode;
  description: string;
}

export const WORKBENCH_MODULES: NavModuleItem[] = [
  {
    id: 'dashboard',
    label: 'Executive Assurance Dashboard',
    path: '/',
    phase: 1,
    icon: <DashboardOutlined fontSize="small" />,
    description: 'Deterministic assurance-readiness KPIs, DQ findings, and coverage analytics',
  },
  {
    id: 'engagements',
    label: 'Engagement Management',
    path: '/engagements',
    phase: 1,
    icon: <AssignmentOutlined fontSize="small" />,
    description: 'Plan, edit, scope, and track internal ESG audit & readiness engagements',
  },
  {
    id: 'assertions',
    label: 'ESG Assertions & Data',
    path: '/assertions',
    phase: 1,
    icon: <AssessmentOutlined fontSize="small" />,
    description: 'Quantitative ESG assertion ledger with Missing vs. Zero integrity and CSV export',
  },
  {
    id: 'controls',
    label: 'Control Library',
    path: '/controls',
    phase: 1,
    icon: <GppGoodOutlined fontSize="small" />,
    description: 'Internal ESG control catalog across Environmental, Social, and Governance pillars',
  },
  {
    id: 'audit-planning',
    label: 'Audit Planning',
    path: '/audit-planning',
    phase: 1,
    icon: <FactCheckOutlined fontSize="small" />,
    description: 'Risk-based materiality scoping, 5x5 risk heatmap, and seeded PRNG / MUS sampling',
  },
  {
    id: 'evidence',
    label: 'Evidence Register',
    path: '/evidence',
    phase: 1,
    icon: <FolderSpecialOutlined fontSize="small" />,
    description: 'SHA-256 checksummed binary file storage in IndexedDB and review workflow',
  },
  {
    id: 'control-testing',
    label: 'Control Testing',
    path: '/control-testing',
    phase: 1,
    icon: <VerifiedUserOutlined fontSize="small" />,
    description: 'Test of Design walkthroughs, Operating Effectiveness testing, and 4-eyes review',
  },
  {
    id: 'ghg-verification',
    label: 'GHG Verification',
    path: '/ghg-verification',
    phase: 1,
    icon: <ScienceOutlined fontSize="small" />,
    description: 'ISO 14064-3 shadow recalculation engines for Scope 1, Scope 2 (Loc/Mkt), and Scope 3',
  },
  {
    id: 'findings-remediation',
    label: 'Findings & Remediation',
    path: '/findings-remediation',
    phase: 1,
    icon: <ReportProblemOutlined fontSize="small" />,
    description: 'Audit Findings, Corrective Action Plans (CAP), retesting, and closure guardrails',
  },
  {
    id: 'disclosure-traceability',
    label: 'Disclosure Traceability',
    path: '/disclosure-traceability',
    phase: 1,
    icon: <AccountTreeOutlined fontSize="small" />,
    description: '4-Framework Disclosure Library (ESRS, GRI, IFRS S1/S2, BRSR) & 9-Stage Traceability',
  },
  {
    id: 'materiality',
    label: 'Materiality Workbench',
    path: '/materiality',
    phase: 1,
    icon: <BalanceOutlined fontSize="small" />,
    description: 'Financial, Impact (Actual vs Potential), Double-Materiality Matrix & Audit Materiality',
  },
  {
    id: 'assurance-reports',
    label: 'Assurance Reports',
    path: '/assurance-reports',
    phase: 1,
    icon: <DescriptionOutlined fontSize="small" />,
    description: 'Immutable Frozen Report Snapshots, SHA-256 Hashing & PDF/XLSX/CSV/JSON Exports',
  },
  {
    id: 'advanced-analytics',
    label: 'Advanced Analytics',
    path: '/advanced-analytics',
    phase: 1,
    icon: <InsightsOutlined fontSize="small" />,
    description: 'Testing, Dual Scope 2 GHG, Findings Aging & Disclosure Coverage Visualizations',
  },
  {
    id: 'ai-copilot',
    label: 'AI Audit Copilot',
    path: '/ai-copilot',
    phase: 1,
    icon: <PsychologyOutlined fontSize="small" />,
    description: 'Server-side Gemini AI Audit Copilot across 10 capabilities with 5-zone security & offline fallback',
  },
  {
    id: 'backup-restore',
    label: 'Backup & Resilience',
    path: '/backup-restore',
    phase: 1,
    icon: <StorageOutlined fontSize="small" />,
    description: 'Full & engagement-scoped IndexedDB v4 backup, SHA-256 binary restore, and Merge/Replace governance',
  },
  {
    id: 'audit-trail',
    label: 'Audit Trail',
    path: '/audit-trail',
    phase: 1,
    icon: <HistoryEduOutlined fontSize="small" />,
    description: 'Append-only chronological log of entity changes, uploads, and resolutions',
  },
  {
    id: 'settings',
    label: 'Settings & Methodology',
    path: '/settings',
    phase: 1,
    icon: <SettingsOutlined fontSize="small" />,
    description: 'Assurance readiness equations, denominator exclusions, DQ rules, and security posture',
  },
];

const DRAWER_EXPANDED_WIDTH = 276;
const DRAWER_COLLAPSED_WIDTH = 72;

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const {
    organization,
    engagements,
    findings,
    filters,
    setFilters,
    resetFilters,
    themeMode,
    toggleThemeMode,
    errorBanner,
    retryOperation,
    clearErrorBanner,
  } = useWorkbench();

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const currentModule =
    WORKBENCH_MODULES.find((m) => m.path === location.pathname) ?? WORKBENCH_MODULES[0];

  const openFindings = findings.filter((f) => f.status !== 'Resolved');
  const highSeverityFindings = openFindings.filter((f) => f.severity === 'High');

  const drawerWidth = isMobile
    ? DRAWER_EXPANDED_WIDTH
    : desktopCollapsed
      ? DRAWER_COLLAPSED_WIDTH
      : DRAWER_EXPANDED_WIDTH;

  const phase1Modules = WORKBENCH_MODULES.filter((m) => m.phase === 1);
  const phase2Modules = WORKBENCH_MODULES.filter((m) => m.phase === 2);

  const renderDrawerContent = (collapsed: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2.25,
          py: 2,
          minHeight: 64,
          backgroundColor: themeMode === 'dark' ? '#0B151E' : '#123047',
          color: '#FFFFFF',
        }}
      >
        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                color: '#FFFFFF',
              }}
            >
              ESG Assurance Workbench
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'rgba(255,255,255,0.72)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
              }}
            >
              v1.0.0 · Production Release (33 Stores)
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton
            onClick={() => setDesktopCollapsed((prev) => !prev)}
            size="small"
            aria-label={collapsed ? 'Expand navigation drawer' : 'Collapse navigation drawer'}
            sx={{ color: '#FFFFFF' }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Organization Summary Banner */}
      {!collapsed && organization && (
        <Box
          sx={{
            px: 2.25,
            py: 1.5,
            backgroundColor:
              themeMode === 'dark' ? 'rgba(8, 127, 140, 0.12)' : 'rgba(8, 127, 140, 0.06)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}
          >
            SYNTHETIC DEMO ENTITY
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {organization.organizationName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
            {organization.country} · {organization.reportingCurrency} · 5 Plants
          </Typography>
        </Box>
      )}

      {/* Navigation Lists */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              px: 2.5,
              py: 0.75,
              display: 'block',
              fontWeight: 700,
              color: 'text.secondary',
              letterSpacing: '0.04em',
            }}
          >
            PHASE 1 — ACTIVE WORKSPACES
          </Typography>
        )}
        <List dense disablePadding>
          {phase1Modules.map((item) => {
            const active = location.pathname === item.path;
            return (
              <ListItem key={item.id} disablePadding sx={{ px: 1, mb: 0.25 }}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    selected={active}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: 1.5,
                      minHeight: 40,
                      justifyContent: collapsed ? 'center' : 'initial',
                      px: collapsed ? 1.5 : 1.75,
                      '&.Mui-selected': {
                        backgroundColor:
                          themeMode === 'dark'
                            ? 'rgba(26, 163, 181, 0.2)'
                            : 'rgba(18, 48, 71, 0.09)',
                        color: themeMode === 'dark' ? '#4DD0E1' : '#123047',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: collapsed ? 0 : 1.5,
                        justifyContent: 'center',
                        color: active
                          ? themeMode === 'dark'
                            ? '#4DD0E1'
                            : '#087F8C'
                          : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: {
                            noWrap: true,
                            sx: {
                              fontSize: '0.82rem',
                              fontWeight: active ? 600 : 500,
                            },
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 1.25 }} />

        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              px: 2.5,
              py: 0.75,
              display: 'block',
              fontWeight: 700,
              color: 'text.secondary',
              letterSpacing: '0.04em',
            }}
          >
            PHASE 2 — ROADMAP MODULES
          </Typography>
        )}
        <List dense disablePadding>
          {phase2Modules.map((item) => {
            const active = location.pathname === item.path;
            return (
              <ListItem key={item.id} disablePadding sx={{ px: 1, mb: 0.25 }}>
                <Tooltip title={collapsed ? `${item.label} (Phase 2)` : ''} placement="right">
                  <ListItemButton
                    selected={active}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: 1.5,
                      minHeight: 38,
                      justifyContent: collapsed ? 'center' : 'initial',
                      px: collapsed ? 1.5 : 1.75,
                      opacity: active ? 1 : 0.78,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: collapsed ? 0 : 1.5,
                        justifyContent: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        secondary="Phase 2 Placeholder"
                        slotProps={{
                          primary: {
                            noWrap: true,
                            sx: {
                              fontSize: '0.8rem',
                              fontWeight: active ? 600 : 400,
                            },
                          },
                          secondary: {
                            sx: {
                              fontSize: '0.68rem',
                              fontFamily: "'JetBrains Mono', monospace",
                            },
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Local-First Storage Footer Note */}
      {!collapsed && (
        <Box
          sx={{
            p: 1.75,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CloudDoneOutlined sx={{ fontSize: 18, color: '#16A085' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
            IndexedDB Local-First · Deterministic Seed Active
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="Workbench navigation"
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            slotProps={{ root: { keepMounted: true } }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_EXPANDED_WIDTH,
              },
            }}
          >
            {renderDrawerContent(false)}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                transition: 'width 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                overflowX: 'hidden',
              },
            }}
          >
            {renderDrawerContent(desktopCollapsed)}
          </Drawer>
        )}
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {/* Sticky Enterprise AppBar */}
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: theme.zIndex.appBar,
          }}
        >
          <Toolbar
            sx={{
              gap: { xs: 1, md: 2 },
              minHeight: { xs: 56, md: 64 },
              px: { xs: 2, md: 3 },
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            {/* Left Zone: Mobile Menu + Breadcrumbs */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              {isMobile && (
                <IconButton
                  edge="start"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: '0.78rem' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={() => navigate('/')}
                  >
                    Asterion Manufacturing Ltd.
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.primary', fontWeight: 600 }}
                  >
                    {currentModule.label}
                  </Typography>
                </Breadcrumbs>
              </Box>
            </Box>

            {/* Right Zone: Global Engagement & Period Selectors, Notifications, Theme Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              {/* Global Engagement Selector */}
              <FormControl size="small" sx={{ minWidth: { xs: 150, sm: 230 } }}>
                <InputLabel id="global-engagement-select-label">Engagement Scope</InputLabel>
                <Select
                  labelId="global-engagement-select-label"
                  id="global-engagement-select"
                  label="Engagement Scope"
                  value={filters.engagementId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      engagementId: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="ALL">All Engagements ({engagements.length})</MenuItem>
                  {engagements.map((eng) => (
                    <MenuItem key={eng.engagementId} value={eng.engagementId}>
                      {eng.reportingYear} — {eng.engagementName.slice(0, 32)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Global Reporting Period Selector */}
              <FormControl size="small" sx={{ minWidth: 125 }}>
                <InputLabel id="global-year-select-label">Reporting Period</InputLabel>
                <Select
                  labelId="global-year-select-label"
                  id="global-year-select"
                  label="Reporting Period"
                  value={filters.reportingYear}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      reportingYear: e.target.value as ReportingYear | 'ALL',
                    }))
                  }
                >
                  <MenuItem value="ALL">All Periods</MenuItem>
                  <MenuItem value="FY 2024">FY 2024</MenuItem>
                  <MenuItem value="FY 2025">FY 2025</MenuItem>
                  <MenuItem value="FY 2026">FY 2026</MenuItem>
                </Select>
              </FormControl>

              {(filters.engagementId !== 'ALL' ||
                filters.reportingYear !== 'ALL' ||
                filters.facilityId !== 'ALL' ||
                filters.pillar !== 'ALL' ||
                filters.reviewStatus !== 'ALL') && (
                <Tooltip title="Reset all global filters">
                  <IconButton
                    size="small"
                    onClick={resetFilters}
                    aria-label="Reset global filters"
                  >
                    <RestartAltOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {/* Notification Center */}
              <Tooltip title="Validation Findings & Readiness Alerts">
                <IconButton
                  onClick={(e) => setNotifAnchor(e.currentTarget)}
                  aria-label="Open notifications"
                  size="small"
                >
                  <Badge badgeContent={highSeverityFindings.length} color="error">
                    <NotificationsOutlined fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={notifAnchor}
                open={Boolean(notifAnchor)}
                onClose={() => setNotifAnchor(null)}
                slotProps={{ paper: { sx: { width: 360, maxHeight: 420, p: 1 } } }}
              >
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography variant="subtitle2">
                    Deterministic Validation Alerts ({openFindings.length} Open)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {highSeverityFindings.length} High-Severity DQ Findings Require Action
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                {openFindings.slice(0, 6).map((f) => (
                  <MenuItem
                    key={f.findingId}
                    onClick={() => {
                      setNotifAnchor(null);
                      navigate('/findings-remediation');
                    }}
                    sx={{ whiteSpace: 'normal', alignItems: 'flex-start', py: 1 }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          color: f.severity === 'High' ? 'error.main' : 'warning.main',
                        }}
                      >
                        {f.ruleId} · {f.severity} · {f.linkedEntityId}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                        {f.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>

              {/* Theme Toggle */}
              <Tooltip
                title={
                  themeMode === 'light'
                    ? 'Switch to Dark Mode (persisted)'
                    : 'Switch to Light Mode (persisted)'
                }
              >
                <IconButton
                  onClick={() => void toggleThemeMode()}
                  aria-label="Toggle color theme"
                  size="small"
                >
                  {themeMode === 'light' ? (
                    <DarkModeOutlined fontSize="small" />
                  ) : (
                    <LightModeOutlined fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Explicit Error Escalation Banner with Retry Save Option */}
        {errorBanner && (
          <Alert
            severity="error"
            onClose={clearErrorBanner}
            action={
              retryOperation ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void retryOperation.retryFn()}
                >
                  Retry Save
                </Button>
              ) : undefined
            }
            sx={{ mx: 3, mt: 2, borderRadius: 2 }}
          >
            {errorBanner}
          </Alert>
        )}

        {/* Synthetic Demonstration Dataset & Non-Assurance Disclaimer Strip */}
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 0.85,
            bgcolor:
              themeMode === 'dark' ? 'rgba(237, 108, 2, 0.12)' : 'rgba(237, 108, 2, 0.08)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
            <strong>SYNTHETIC DEMONSTRATION DATASET:</strong> Asterion Manufacturing Ltd. records are synthetic for internal assurance-readiness evaluation only. No independent limited or reasonable assurance opinion has been issued.
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}
          >
            Rules Engine: DQ-01..DQ-10 Active
          </Typography>
        </Box>

        {/* Main Workspace Container */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            maxWidth: 1600,
            width: '100%',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
