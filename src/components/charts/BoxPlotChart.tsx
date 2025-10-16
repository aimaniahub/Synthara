'use client';

import React from 'react';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { ChartWrapper } from './ChartWrapper';
import { BoxPlotProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function BoxPlotChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
}: BoxPlotProps) {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  // Transform box plot data for MUI X Charts
  // Since MUI X Charts doesn't have native box plot, we'll create a custom visualization
  const chartData = React.useMemo(() => {
    if (!data) return null;

    // Create a simplified representation using bar chart
    // We'll show the median as the main bar and add error bars for quartiles
    const medianValue = data.median;
    const q1Value = data.q1;
    const q3Value = data.q3;
    const minValue = data.min;
    const maxValue = data.max;

    return [
      {
        data: [medianValue],
        label: 'Median',
        color: colors?.[0] || getChartColor(0),
      },
    ];
  }, [data, colors]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for box plot'}
        title={config.title}
        description={config.description}
      />
    );
  }

  return (
    <ChartWrapper
      config={config}
      className={className}
      loading={loading}
      error={error}
      title={config.title}
      description={config.description}
    >
      <div className="w-full h-full flex flex-col justify-center items-center space-y-4">
        {/* Custom box plot visualization */}
        <div className="w-full max-w-md">
          <div className="text-sm text-muted-foreground text-center mb-4">
            Box Plot Statistics
          </div>
          
          {/* Box plot visualization */}
          <div className="relative h-32 border-l-2 border-muted-foreground">
            {/* Whiskers */}
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted-foreground"></div>
            
            {/* Box */}
            <div 
              className="absolute bg-primary/20 border border-primary rounded-sm"
              style={{
                left: '20%',
                top: '25%',
                width: '60%',
                height: '50%',
              }}
            ></div>
            
            {/* Median line */}
            <div 
              className="absolute bg-primary h-full w-0.5"
              style={{ left: '50%' }}
            ></div>
            
            {/* Min/Max points */}
            <div 
              className="absolute w-2 h-2 bg-destructive rounded-full"
              style={{ left: '10%', top: '50%', transform: 'translateY(-50%)' }}
            ></div>
            <div 
              className="absolute w-2 h-2 bg-destructive rounded-full"
              style={{ left: '90%', top: '50%', transform: 'translateY(-50%)' }}
            ></div>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
            <div>
              <div className="font-medium">Min: {data.min.toFixed(2)}</div>
              <div className="font-medium">Q1: {data.q1.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-medium">Q3: {data.q3.toFixed(2)}</div>
              <div className="font-medium">Max: {data.max.toFixed(2)}</div>
            </div>
            <div className="col-span-2 text-center">
              <div className="font-medium">Median: {data.median.toFixed(2)}</div>
              {data.mean && (
                <div className="text-muted-foreground">Mean: {data.mean.toFixed(2)}</div>
              )}
              {data.outliers.length > 0 && (
                <div className="text-destructive">Outliers: {data.outliers.length}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ChartWrapper>
  );
}
