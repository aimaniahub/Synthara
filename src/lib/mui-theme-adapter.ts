'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { useTheme } from 'next-themes';

// Helper function to get CSS variable value
const getCSSVariable = (variable: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};

// Convert HSL CSS variable to MUI color format
const hslToMuiColor = (hslVar: string): string => {
  const value = getCSSVariable(hslVar);
  if (!value) return '#000000';
  
  // Convert "hue sat% light%" to "hsl(hue, sat%, light%)"
  const parts = value.split(' ');
  if (parts.length === 3) {
    const [h, s, l] = parts;
    return `hsl(${h}, ${s}, ${l})`;
  }
  return value;
};

// Create MUI theme that adapts to the current theme mode
export const createAdaptiveMuiTheme = (isDark: boolean): ThemeOptions => {
  const mode = isDark ? 'dark' : 'light';
  
  // Get theme colors from CSS variables
  const primary = hslToMuiColor('--primary');
  const secondary = hslToMuiColor('--secondary');
  const background = hslToMuiColor('--background');
  const paper = hslToMuiColor('--card');
  const textPrimary = hslToMuiColor('--foreground');
  const textSecondary = hslToMuiColor('--muted-foreground');
  const divider = hslToMuiColor('--border');
  
  // Chart colors from CSS variables
  const chartColors = [
    hslToMuiColor('--chart-1'),
    hslToMuiColor('--chart-2'),
    hslToMuiColor('--chart-3'),
    hslToMuiColor('--chart-4'),
    hslToMuiColor('--chart-5'),
  ];

  return {
    palette: {
      mode,
      primary: {
        main: primary,
        contrastText: hslToMuiColor('--primary-foreground'),
      },
      secondary: {
        main: secondary,
        contrastText: hslToMuiColor('--secondary-foreground'),
      },
      background: {
        default: background,
        paper: paper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: divider,
      // Custom chart colors
      chart: {
        primary: chartColors[0],
        secondary: chartColors[1],
        tertiary: chartColors[2],
        quaternary: chartColors[3],
        quinary: chartColors[4],
      },
    },
    typography: {
      fontFamily: [
        'var(--font-inter)',
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ].join(','),
      h1: {
        fontFamily: [
          'var(--font-space-grotesk)',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
      h2: {
        fontFamily: [
          'var(--font-space-grotesk)',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
      h3: {
        fontFamily: [
          'var(--font-space-grotesk)',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
      h4: {
        fontFamily: [
          'var(--font-space-grotesk)',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
      h5: {
        fontFamily: [
          'var(--font-space-grotesk)',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
      h6: {
        fontFamily: [
          'var(--font-space-grotesk)',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ].join(','),
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Remove default gradient
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${divider}`,
            borderRadius: '12px',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: paper,
            color: textPrimary,
            border: `1px solid ${divider}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
  };
};

// Hook to get the current MUI theme
export const useMuiTheme = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // Return a default theme during SSR
  if (typeof window === 'undefined') {
    return createAdaptiveMuiTheme(false); // Default to light theme during SSR
  }
  
  return createAdaptiveMuiTheme(isDark);
};

// Chart color palette for consistent usage
export const CHART_COLORS = {
  primary: 'var(--chart-1)',
  secondary: 'var(--chart-2)',
  tertiary: 'var(--chart-3)',
  quaternary: 'var(--chart-4)',
  quinary: 'var(--chart-5)',
  success: 'var(--chart-1)', // emerald
  warning: 'var(--chart-5)', // yellow
  error: 'hsl(0 84.2% 60.2%)', // red
  info: 'var(--chart-3)', // cyan
} as const;

// Helper function to get chart color by index
export const getChartColor = (index: number): string => {
  const colors = Object.values(CHART_COLORS);
  return colors[index % colors.length];
};

// Helper function to get chart color by name
export const getChartColorByName = (name: keyof typeof CHART_COLORS): string => {
  return CHART_COLORS[name];
};
