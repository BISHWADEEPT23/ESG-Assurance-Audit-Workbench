import { createTheme, Theme } from '@mui/material/styles';

/**
 * Enterprise Material UI Theme (Section 2)
 * Primary Navy: #123047
 * Primary Teal: #087F8C
 * Emerald Accent: #16A085
 * Light Background: #F5F7FA
 * White Surface: #FFFFFF
 * Primary Text: #1C2B36
 * Secondary Text: #607080
 * Success: #2E7D32
 * Warning: #ED6C02
 * Error: #D32F2F
 */
export function createWorkbenchTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#1AA3B5' : '#123047',
        light: '#1F4E70',
        dark: '#0B1F2E',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#087F8C',
        light: '#16A085',
        dark: '#055A63',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#2E7D32',
      },
      warning: {
        main: '#ED6C02',
      },
      error: {
        main: '#D32F2F',
      },
      background: {
        default: isDark ? '#0D1821' : '#F5F7FA',
        paper: isDark ? '#13222F' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F0F4F8' : '#1C2B36',
        secondary: isDark ? '#9FB0C0' : '#607080',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(18, 48, 71, 0.1)',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 600,
        letterSpacing: '-0.015em',
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      subtitle1: {
        fontWeight: 600,
      },
      subtitle2: {
        fontWeight: 600,
        fontSize: '0.8125rem',
      },
      body1: {
        fontSize: '0.9375rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.4)'
              : '0 1px 3px rgba(18, 48, 71, 0.06), 0 1px 2px rgba(18, 48, 71, 0.04)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(18, 48, 71, 0.08)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12,
            boxShadow: isDark
              ? '0 2px 6px rgba(0,0,0,0.45)'
              : '0 2px 6px rgba(18, 48, 71, 0.05)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(18, 48, 71, 0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '7px 16px',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            backgroundColor: isDark ? '#172A3A' : '#F8FAFC',
            color: isDark ? '#D0DCE8' : '#1C2B36',
          },
        },
      },
    },
  });
}
