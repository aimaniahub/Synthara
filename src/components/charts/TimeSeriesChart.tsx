'use client';

import React from 'react';
import { LineChart as MuiLineChart } from '@mui/x-charts/LineChart';
import { ChartWrapper } from './ChartWrapper';
import { TimeSeriesProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function TimeSeriesChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: TimeSeriesProps) {
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
      data: series.data.map(point => point.y),
      label: series.label || `Series ${index + 1}`,
      color: series.color || colors?.[index] || getChartColor(index),
      curve: series.curve || 'linear',
    }));
  }, [data, colors]);

  const xAxisData = React.useMemo(() => {
    if (data?.series && data.series[0]?.data) {
      return data.series[0].data.map(point => point.x);
    }
    return [];
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for time series chart'}
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
        series={chartData}
        xAxis={[{
          data: xAxisData,
          scaleType: 'time',
          valueFormatter: (value) => {
            // Format time values appropriately
            if (typeof value === 'number') {
              return new Date(value).toLocaleDateString();
            }
            return String(value);
          },
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
