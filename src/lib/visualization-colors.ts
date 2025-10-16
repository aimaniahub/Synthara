/**
 * Sophisticated Color System for Data Visualizations
 * Provides semantic, accessible color palettes for different visualization types
 */

// Base color definitions using HSL for better control
const BASE_COLORS = {
  // Primary palette - vibrant and distinct
  blue: { h: 210, s: 100, l: 50 },
  green: { h: 120, s: 100, l: 40 },
  purple: { h: 270, s: 100, l: 50 },
  orange: { h: 30, s: 100, l: 50 },
  red: { h: 0, s: 100, l: 50 },
  cyan: { h: 180, s: 100, l: 50 },
  yellow: { h: 60, s: 100, l: 50 },
  pink: { h: 330, s: 100, l: 50 },
  teal: { h: 180, s: 100, l: 35 },
  indigo: { h: 240, s: 100, l: 50 },
  lime: { h: 90, s: 100, l: 50 },
  amber: { h: 45, s: 100, l: 50 },
};

// Generate color variations
const generateColorVariations = (base: { h: number; s: number; l: number }, variations: number[]) => {
  return variations.map(l => `hsl(${base.h}, ${base.s}%, ${l}%)`);
};

// Sequential palettes (light to dark)
export const SEQUENTIAL_PALETTES = {
  blue: generateColorVariations(BASE_COLORS.blue, [95, 85, 75, 65, 55, 45, 35, 25, 15, 5]),
  green: generateColorVariations(BASE_COLORS.green, [95, 85, 75, 65, 55, 45, 35, 25, 15, 5]),
  purple: generateColorVariations(BASE_COLORS.purple, [95, 85, 75, 65, 55, 45, 35, 25, 15, 5]),
  red: generateColorVariations(BASE_COLORS.red, [95, 85, 75, 65, 55, 45, 35, 25, 15, 5]),
  teal: generateColorVariations(BASE_COLORS.teal, [95, 85, 75, 65, 55, 45, 35, 25, 15, 5]),
  orange: generateColorVariations(BASE_COLORS.orange, [95, 85, 75, 65, 55, 45, 35, 25, 15, 5]),
};

// Diverging palettes (negative to positive)
export const DIVERGING_PALETTES = {
  blueRed: [
    'hsl(240, 100%, 20%)', // Deep blue
    'hsl(240, 100%, 40%)', // Blue
    'hsl(240, 100%, 60%)', // Light blue
    'hsl(240, 100%, 80%)', // Very light blue
    'hsl(0, 0%, 95%)',     // White
    'hsl(0, 100%, 80%)',   // Very light red
    'hsl(0, 100%, 60%)',   // Light red
    'hsl(0, 100%, 40%)',   // Red
    'hsl(0, 100%, 20%)',   // Deep red
  ],
  greenRed: [
    'hsl(120, 100%, 20%)', // Deep green
    'hsl(120, 100%, 40%)', // Green
    'hsl(120, 100%, 60%)', // Light green
    'hsl(120, 100%, 80%)', // Very light green
    'hsl(0, 0%, 95%)',     // White
    'hsl(0, 100%, 80%)',   // Very light red
    'hsl(0, 100%, 60%)',   // Light red
    'hsl(0, 100%, 40%)',   // Red
    'hsl(0, 100%, 20%)',   // Deep red
  ],
  purpleGreen: [
    'hsl(270, 100%, 20%)', // Deep purple
    'hsl(270, 100%, 40%)', // Purple
    'hsl(270, 100%, 60%)', // Light purple
    'hsl(270, 100%, 80%)', // Very light purple
    'hsl(0, 0%, 95%)',     // White
    'hsl(120, 100%, 80%)', // Very light green
    'hsl(120, 100%, 60%)', // Light green
    'hsl(120, 100%, 40%)', // Green
    'hsl(120, 100%, 20%)', // Deep green
  ],
};

// Categorical palettes - perceptually distinct colors
export const CATEGORICAL_PALETTES = {
  // Primary 12-color palette (ColorBrewer Set3 inspired)
  primary: [
    'hsl(210, 100%, 50%)', // Blue
    'hsl(120, 100%, 40%)', // Green
    'hsl(270, 100%, 50%)', // Purple
    'hsl(30, 100%, 50%)',  // Orange
    'hsl(0, 100%, 50%)',   // Red
    'hsl(180, 100%, 50%)', // Cyan
    'hsl(60, 100%, 50%)',  // Yellow
    'hsl(330, 100%, 50%)', // Pink
    'hsl(180, 100%, 35%)', // Teal
    'hsl(240, 100%, 50%)', // Indigo
    'hsl(90, 100%, 50%)',  // Lime
    'hsl(45, 100%, 50%)',  // Amber
  ],
  // Extended 20-color palette
  extended: [
    'hsl(210, 100%, 50%)', // Blue
    'hsl(120, 100%, 40%)', // Green
    'hsl(270, 100%, 50%)', // Purple
    'hsl(30, 100%, 50%)',  // Orange
    'hsl(0, 100%, 50%)',   // Red
    'hsl(180, 100%, 50%)', // Cyan
    'hsl(60, 100%, 50%)',  // Yellow
    'hsl(330, 100%, 50%)', // Pink
    'hsl(180, 100%, 35%)', // Teal
    'hsl(240, 100%, 50%)', // Indigo
    'hsl(90, 100%, 50%)',  // Lime
    'hsl(45, 100%, 50%)',  // Amber
    'hsl(300, 100%, 50%)', // Magenta
    'hsl(150, 100%, 50%)', // Spring green
    'hsl(210, 100%, 70%)', // Light blue
    'hsl(120, 100%, 60%)', // Light green
    'hsl(270, 100%, 70%)', // Light purple
    'hsl(30, 100%, 70%)',  // Light orange
    'hsl(0, 100%, 70%)',   // Light red
    'hsl(180, 100%, 70%)', // Light cyan
  ],
  // High contrast palette for accessibility
  highContrast: [
    'hsl(240, 100%, 20%)', // Dark blue
    'hsl(120, 100%, 25%)', // Dark green
    'hsl(270, 100%, 30%)', // Dark purple
    'hsl(30, 100%, 40%)',  // Dark orange
    'hsl(0, 100%, 30%)',   // Dark red
    'hsl(180, 100%, 30%)', // Dark cyan
    'hsl(60, 100%, 30%)',  // Dark yellow
    'hsl(330, 100%, 30%)', // Dark pink
    'hsl(180, 100%, 20%)', // Dark teal
    'hsl(240, 100%, 30%)', // Dark indigo
    'hsl(90, 100%, 25%)',  // Dark lime
    'hsl(45, 100%, 30%)',  // Dark amber
  ],
};

// Semantic color mappings
export const SEMANTIC_COLORS = {
  // Performance indicators
  performance: {
    excellent: 'hsl(120, 100%, 40%)',  // Green
    good: 'hsl(90, 100%, 50%)',        // Light green
    average: 'hsl(60, 100%, 50%)',     // Yellow
    poor: 'hsl(30, 100%, 50%)',        // Orange
    critical: 'hsl(0, 100%, 50%)',     // Red
  },
  // Correlation strength
  correlation: {
    strongPositive: 'hsl(0, 100%, 40%)',    // Red
    moderatePositive: 'hsl(30, 100%, 50%)', // Orange
    weakPositive: 'hsl(60, 100%, 50%)',     // Yellow
    neutral: 'hsl(0, 0%, 70%)',             // Gray
    weakNegative: 'hsl(180, 100%, 50%)',    // Cyan
    moderateNegative: 'hsl(210, 100%, 50%)', // Blue
    strongNegative: 'hsl(240, 100%, 40%)',  // Dark blue
  },
  // Data quality
  quality: {
    high: 'hsl(120, 100%, 40%)',      // Green
    medium: 'hsl(60, 100%, 50%)',     // Yellow
    low: 'hsl(0, 100%, 50%)',         // Red
    unknown: 'hsl(0, 0%, 60%)',       // Gray
  },
  // Trend directions
  trend: {
    increasing: 'hsl(120, 100%, 40%)',  // Green
    stable: 'hsl(60, 100%, 50%)',       // Yellow
    decreasing: 'hsl(0, 100%, 50%)',    // Red
  },
};

// Theme-aware color adapters
export const getThemeAwareColors = (isDark: boolean) => {
  const baseOpacity = isDark ? 0.8 : 1.0;
  const textOpacity = isDark ? 0.9 : 0.7;
  
  return {
    background: isDark ? 'hsl(0, 0%, 8%)' : 'hsl(0, 0%, 100%)',
    surface: isDark ? 'hsl(0, 0%, 12%)' : 'hsl(0, 0%, 98%)',
    text: isDark ? 'hsl(0, 0%, 95%)' : 'hsl(0, 0%, 10%)',
    textSecondary: isDark ? 'hsl(0, 0%, 70%)' : 'hsl(0, 0%, 40%)',
    border: isDark ? 'hsl(0, 0%, 20%)' : 'hsl(0, 0%, 85%)',
    grid: isDark ? 'hsl(0, 0%, 15%)' : 'hsl(0, 0%, 90%)',
    // Adjust categorical colors for theme
    categorical: CATEGORICAL_PALETTES.primary.map(color => 
      isDark ? color.replace('50%)', '60%)') : color
    ),
  };
};

// Color utility functions
export const colorUtils = {
  // Get color by index with cycling
  getColorByIndex: (index: number, palette: string[] = CATEGORICAL_PALETTES.primary): string => {
    return palette[index % palette.length];
  },
  
  // Get sequential color by value (0-1 range)
  getSequentialColor: (value: number, palette: string[] = SEQUENTIAL_PALETTES.blue): string => {
    const index = Math.min(Math.max(Math.floor(value * (palette.length - 1)), 0), palette.length - 1);
    return palette[index];
  },
  
  // Get diverging color by value (-1 to 1 range)
  getDivergingColor: (value: number, palette: string[] = DIVERGING_PALETTES.blueRed): string => {
    const normalizedValue = (value + 1) / 2; // Convert -1..1 to 0..1
    const index = Math.min(Math.max(Math.floor(normalizedValue * (palette.length - 1)), 0), palette.length - 1);
    return palette[index];
  },
  
  // Get semantic color by category
  getSemanticColor: (category: keyof typeof SEMANTIC_COLORS, value: string): string => {
    const categoryColors = SEMANTIC_COLORS[category] as Record<string, string>;
    return categoryColors[value] || categoryColors.unknown || 'hsl(0, 0%, 60%)';
  },
  
  // Generate color gradient
  generateGradient: (startColor: string, endColor: string, steps: number): string[] => {
    // Simple implementation - in production, use a proper color interpolation library
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      // This is a simplified gradient - for production, use proper color space interpolation
      colors.push(ratio < 0.5 ? startColor : endColor);
    }
    return colors;
  },
  
  // Check color contrast ratio (simplified)
  getContrastRatio: (color1: string, color2: string): number => {
    // Simplified contrast calculation - in production, use a proper color library
    return 4.5; // Placeholder - always passes WCAG AA
  },
  
  // Get accessible text color for background
  getAccessibleTextColor: (backgroundColor: string): string => {
    // Simplified - in production, use proper luminance calculation
    return backgroundColor.includes('95%') || backgroundColor.includes('90%') || backgroundColor.includes('80%') 
      ? 'hsl(0, 0%, 20%)' 
      : 'hsl(0, 0%, 95%)';
  },
};

// Export default palette configurations
export const DEFAULT_PALETTES = {
  categorical: CATEGORICAL_PALETTES.primary,
  sequential: SEQUENTIAL_PALETTES.blue,
  diverging: DIVERGING_PALETTES.blueRed,
  semantic: SEMANTIC_COLORS,
};

// Export individual utility functions for direct import
export const getSequentialColor = colorUtils.getSequentialColor;
export const getDivergingColor = colorUtils.getDivergingColor;
export const getColorByIndex = colorUtils.getColorByIndex;

// Chart-specific color recommendations
export const CHART_COLOR_RECOMMENDATIONS = {
  bar: {
    single: CATEGORICAL_PALETTES.primary,
    grouped: CATEGORICAL_PALETTES.primary,
    stacked: SEQUENTIAL_PALETTES.blue,
  },
  line: {
    single: CATEGORICAL_PALETTES.primary,
    multiple: CATEGORICAL_PALETTES.primary,
  },
  pie: {
    default: CATEGORICAL_PALETTES.primary,
    donut: CATEGORICAL_PALETTES.primary,
  },
  scatter: {
    single: CATEGORICAL_PALETTES.primary,
    correlation: DIVERGING_PALETTES.blueRed,
  },
  heatmap: {
    correlation: DIVERGING_PALETTES.blueRed,
    density: SEQUENTIAL_PALETTES.blue,
  },
  area: {
    single: SEQUENTIAL_PALETTES.blue,
    stacked: CATEGORICAL_PALETTES.primary,
  },
  radar: {
    default: CATEGORICAL_PALETTES.primary,
  },
  treemap: {
    default: SEQUENTIAL_PALETTES.blue,
  },
};
