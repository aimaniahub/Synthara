'use client';

import React from 'react';
import { LineChart as MuiLineChart } from '@mui/x-charts/LineChart';
import { ChartWrapper } from './ChartWrapper';
import { AreaChartProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function AreaChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: AreaChartProps) {
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
      area: true,
      fillOpacity: series.fillOpacity || 0.3,
    }));
  }, [data, colors]);

  const xAxisData = React.useMemo(() => {
    if (data?.xAxis?.data) {
      return data.xAxis.data;
    }
    // Generate default labels if not provided
    if (chartData && chartData[0]?.data) {
      return chartData[0].data.map((_, index) => index);
    }
    return [];
  }, [data, chartData]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for area chart'}
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
      <MuiLineChart
        series={chartData.map(series => ({
          ...series,
          area: true,
          fillOpacity: series.fillOpacity || 0.3,
        }))}
        xAxis={[{
          data: xAxisData,
          scaleType: data.xAxis?.scaleType || 'linear',
        }]}
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
