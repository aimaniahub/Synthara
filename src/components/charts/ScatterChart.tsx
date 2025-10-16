'use client';

import React from 'react';
import { ScatterChart as MuiScatterChart } from '@mui/x-charts/ScatterChart';
import { ChartWrapper } from './ChartWrapper';
import { ScatterChartProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function ScatterChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: ScatterChartProps) {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  // Transform data for MUI X Charts
  const chartData = React.useMemo(() => {
    if (!data?.series || data.series.length === 0) return null;

    return data.series.map((series, index) => ({
      data: series.data,
      label: series.label || `Series ${index + 1}`,
      color: series.color || colors?.[index] || getChartColor(index),
    }));
  }, [data, colors]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for chart'}
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
      <MuiScatterChart
        series={chartData}
        height={config.height || 300}
        grid={{ vertical: showGrid, horizontal: showGrid }}
        tooltip={{ trigger: showTooltip ? 'item' : 'none' }}
        legend={showLegend ? { hidden: false } : { hidden: true }}
        axisHighlight={{ x: 'line', y: 'line' }}
        onItemClick={onDataPointClick}
      />
    </ChartWrapper>
  );
}
