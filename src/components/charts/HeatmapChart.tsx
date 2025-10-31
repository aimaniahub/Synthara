'use client';

import React from 'react';
import { ChartWrapper } from './ChartWrapper';
import { HeatmapProps } from '@/types/charts';
import { getDivergingColor, getSequentialColor } from '@/lib/visualization-colors';

export function HeatmapChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
  ...props
}: HeatmapProps) {
  const {
    showLegend = true,
    showTooltip = true,
    colors,
  } = config;

  // Transform data for heatmap visualization
  const heatmapData = React.useMemo(() => {
    if (!data?.data || data.data.length === 0) return null;

    // Create a matrix from the data
    const matrix: number[][] = [];
    const xLabels = data.xLabels || [];
    const yLabels = data.yLabels || [];

    // Initialize matrix with zeros
    for (let i = 0; i < yLabels.length; i++) {
      matrix[i] = new Array(xLabels.length).fill(0);
    }

    // Fill matrix with values
    data.data.forEach(item => {
      const xIndex = xLabels.indexOf(item.x);
      const yIndex = yLabels.indexOf(item.y);
      if (xIndex !== -1 && yIndex !== -1) {
        matrix[yIndex][xIndex] = item.value;
      }
    });

    return { matrix, xLabels, yLabels };
  }, [data]);

  const getCellColor = React.useCallback((value: number) => {
    const { min, max, type } = data.colorScale;
    const normalizedValue = (value - min) / (max - min);
    
    if (type === 'diverging') {
      return getDivergingColor(normalizedValue * 2 - 1); // Convert 0-1 to -1 to 1
    } else {
      return getSequentialColor(normalizedValue);
    }
  }, [data.colorScale]);

  if (!heatmapData) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for heatmap'}
        title={config.title}
        description={config.description}
        {...props}
      />
    );
  }

  const { matrix, xLabels, yLabels } = heatmapData;

  return (
    <ChartWrapper
      config={config}
      className={className}
      loading={loading}
      error={error}
      title={config.title}
      description={config.description}
      {...props}
    >
      <div className="w-full h-full p-4">
        <div className="grid gap-1" style={{ 
          gridTemplateColumns: `repeat(${xLabels.length}, 1fr)`,
          gridTemplateRows: `repeat(${yLabels.length}, 1fr)`,
          height: '100%',
          minHeight: '200px'
        }}>
          {matrix.map((row, yIndex) => 
            row.map((value, xIndex) => (
              <div
                key={`${xIndex}-${yIndex}`}
                className="flex items-center justify-center text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: getCellColor(value),
                  color: value > (data.colorScale.min + data.colorScale.max) / 2 ? 'white' : 'black',
                }}
                onClick={() => onDataPointClick?.({ x: xLabels[xIndex], y: yLabels[yIndex], value })}
                onMouseEnter={() => onDataPointHover?.({ x: xLabels[xIndex], y: yLabels[yIndex], value })}
                title={`${xLabels[xIndex]} × ${yLabels[yIndex]}: ${value.toFixed(2)}`}
              >
                {value.toFixed(1)}
              </div>
            ))
          )}
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {xLabels.map((label, index) => (
            <div key={index} className="text-center">
              {label}
            </div>
          ))}
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-4 flex flex-col justify-between h-full text-xs text-muted-foreground">
          {yLabels.map((label, index) => (
            <div key={index} className="flex items-center h-6">
              {label}
            </div>
          ))}
        </div>
      </div>
    </ChartWrapper>
  );
}
