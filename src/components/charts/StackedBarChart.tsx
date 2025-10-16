'use client';

import React from 'react';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { ChartWrapper } from './ChartWrapper';
import { StackedBarProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function StackedBarChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: StackedBarProps) {
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

  const xAxisData = React.useMemo(() => {
    if (data?.xAxis?.data) {
      return data.xAxis.data;
    }
    return [];
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for stacked bar chart'}
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
      <MuiBarChart
        series={chartData}
        xAxis={[{
          data: xAxisData,
          scaleType: data.xAxis?.scaleType || 'band',
        }]}
        height={config.height || 300}
        grid={{ vertical: showGrid, horizontal: showGrid }}
        tooltip={{ trigger: showTooltip ? 'item' : 'none' }}
        legend={showLegend ? { hidden: false } : { hidden: true }}
        axisHighlight={{ x: 'line', y: 'line' }}
        onItemClick={onDataPointClick}
        layout="horizontal"
        stackOffset="expand" // This makes it a stacked bar chart
      />
    </ChartWrapper>
  );
}
