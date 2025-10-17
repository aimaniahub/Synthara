'use client';

import React from 'react';

// Professional color palettes inspired by MUI X Charts documentation
export const CHART_PALETTES = {
  blueberryTwilight: [
    '#2e4f8a', '#4169b5', '#5983d0', '#7a9de8', '#9bb5f0',
    '#b8c8f8', '#d5d9ff', '#f0f2ff', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'
  ],
  category10: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ],
  modern: [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#06b6d4', '#3b82f6', '#ef4444', '#f97316', '#84cc16'
  ],
  pastel: [
    '#a8e6cf', '#ffd3a5', '#fdae6b', '#ff8a80', '#f8bbd9',
    '#e1bee7', '#c5cae9', '#bbdefb', '#b3e5fc', '#b2ebf2'
  ]
} as const;

// Gradient definitions for different chart types
export const CHART_GRADIENTS = {
  // Bar chart gradients
  barVertical: (color: string, opacity: number = 0.8, index: number = 0) => ({
    id: `barGradient-${color.replace('#', '')}-${index}`,
    type: 'linear' as const,
    x1: 0, y1: 0, x2: 0, y2: 1,
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: opacity },
      { offset: '100%', stopColor: color, stopOpacity: opacity * 0.3 }
    ]
  }),
  
  // Area chart gradients
  areaVertical: (color: string, opacity: number = 0.6, index: number = 0) => ({
    id: `areaGradient-${color.replace('#', '')}-${index}`,
    type: 'linear' as const,
    x1: 0, y1: 0, x2: 0, y2: 1,
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: opacity },
      { offset: '100%', stopColor: color, stopOpacity: 0.05 }
    ]
  }),
  
  // Line chart gradients
  lineVertical: (color: string, opacity: number = 0.4, index: number = 0) => ({
    id: `lineGradient-${color.replace('#', '')}-${index}`,
    type: 'linear' as const,
    x1: 0, y1: 0, x2: 0, y2: 1,
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: opacity },
      { offset: '50%', stopColor: color, stopOpacity: opacity * 0.6 },
      { offset: '100%', stopColor: color, stopOpacity: 0.1 }
    ]
  }),
  
  // Pie chart gradients
  pieRadial: (color: string, opacity: number = 0.8, index: number = 0) => ({
    id: `pieGradient-${color.replace('#', '')}-${index}`,
    type: 'radial' as const,
    cx: '50%', cy: '50%', r: '50%',
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: opacity },
      { offset: '100%', stopColor: color, stopOpacity: opacity * 0.6 }
    ]
  }),
  
  // Scatter plot gradients
  scatterRadial: (color: string, opacity: number = 0.7, index: number = 0) => ({
    id: `scatterGradient-${color.replace('#', '')}-${index}`,
    type: 'radial' as const,
    cx: '50%', cy: '50%', r: '50%',
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: opacity },
      { offset: '70%', stopColor: color, stopOpacity: opacity * 0.8 },
      { offset: '100%', stopColor: color, stopOpacity: 0.1 }
    ]
  })
} as const;

// Color map configurations for value-based coloring
export const COLOR_MAPS = {
  // Piecewise color map for discrete values
  piecewise: (thresholds: number[], colors: string[]) => ({
    type: 'piecewise' as const,
    thresholds,
    colors
  }),
  
  // Continuous color map for continuous values
  continuous: (min: number, max: number, colorRange: [string, string]) => ({
    type: 'continuous' as const,
    min,
    max,
    color: colorRange
  }),
  
  // Ordinal color map for categorical values
  ordinal: (values: (string | number)[], colors: string[], unknownColor?: string) => ({
    type: 'ordinal' as const,
    values,
    colors,
    unknownColor
  })
} as const;

// Predefined color schemes for different data types
export const DATA_TYPE_COLORS = {
  positive: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  negative: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  neutral: ['#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'],
  categorical: CHART_PALETTES.category10,
  sequential: ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'],
  diverging: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488']
} as const;

// Helper function to get gradient color for a series
export const getGradientColor = (color: string, chartType: 'bar' | 'area' | 'line' | 'pie' | 'scatter', opacity?: number): string => {
  const gradient = CHART_GRADIENTS[`${chartType}${chartType === 'pie' || chartType === 'scatter' ? 'Radial' : 'Vertical'}`](color, opacity);
  return `url(#${gradient.id})`;
};

// Helper function to get palette color by index
export const getPaletteColor = (index: number, palette: keyof typeof CHART_PALETTES = 'blueberryTwilight'): string => {
  const colors = CHART_PALETTES[palette];
  return colors[index % colors.length];
};

// Helper function to generate color variations
export const generateColorVariations = (baseColor: string, count: number): string[] => {
  const variations: string[] = [];
  const baseHue = parseInt(baseColor.slice(1, 3), 16);
  const baseSat = parseInt(baseColor.slice(3, 5), 16);
  const baseLight = parseInt(baseColor.slice(5, 7), 16);
  
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i * 30)) % 360;
    const saturation = Math.max(20, baseSat - (i * 10));
    const lightness = Math.max(30, baseLight - (i * 5));
    
    variations.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return variations;
};

// Helper function to create gradient SVG string
export const createGradientSVG = (gradient: ReturnType<typeof CHART_GRADIENTS[keyof typeof CHART_GRADIENTS]>, className?: string): string => {
  if (gradient.type === 'linear') {
    const stops = gradient.stops.map(stop => 
      `<stop offset="${stop.offset}" stopColor="${stop.stopColor}" stopOpacity="${stop.stopOpacity}" />`
    ).join('');
    
    return `<linearGradient id="${gradient.id}" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}"${className ? ` class="${className}"` : ''}>${stops}</linearGradient>`;
  }
  
  const stops = gradient.stops.map(stop => 
    `<stop offset="${stop.offset}" stopColor="${stop.stopColor}" stopOpacity="${stop.stopOpacity}" />`
  ).join('');
  
  return `<radialGradient id="${gradient.id}" cx="${gradient.cx}" cy="${gradient.cy}" r="${gradient.r}"${className ? ` class="${className}"` : ''}>${stops}</radialGradient>`;
};

// React component for gradient definitions
export const GradientDef: React.FC<{ gradient: ReturnType<typeof CHART_GRADIENTS[keyof typeof CHART_GRADIENTS]>; className?: string }> = ({ gradient, className }) => {
  const gradientSVG = createGradientSVG(gradient, className);
  
  return React.createElement('g', {
    dangerouslySetInnerHTML: { __html: gradientSVG }
  });
};

// Chart highlighting configuration
export const HIGHLIGHT_CONFIG = {
  // Fade opacity for non-highlighted items
  fadeOpacity: 0.3,
  
  // Highlight colors
  highlightColors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b'
  },
  
  // Animation duration
  animationDuration: 200,
  
  // Highlight scope options
  scope: {
    series: 'series' as const,
    item: 'item' as const,
    none: 'none' as const
  }
} as const;

// Chart spacing and sizing configurations
export const CHART_SPACING = {
  // Margins for different chart types
  margins: {
    default: { top: 20, right: 20, bottom: 20, left: 20 },
    withAxis: { top: 40, right: 100, bottom: 60, left: 80 },
    compact: { top: 10, right: 10, bottom: 10, left: 10 },
    spacious: { top: 60, right: 120, bottom: 80, left: 100 }
  },
  
  // Heights for different chart types
  heights: {
    hero: 500,
    standard: 300,
    compact: 200,
    small: 150
  },
  
  // Border radius
  borderRadius: {
    card: 12,
    element: 8,
    small: 4
  }
} as const;
