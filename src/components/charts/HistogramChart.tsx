'use client';

import React from 'react';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { ChartWrapper } from './ChartWrapper';
import { HistogramProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function HistogramChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: HistogramProps) {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  // Transform histogram data for MUI X Charts
  const chartData = React.useMemo(() => {
    if (!data?.bins || data.bins.length === 0) return null;

    const binLabels = data.bins.map((bin, index) => 
      `${bin.start.toFixed(1)}-${bin.end.toFixed(1)}`
    );
    const binValues = data.bins.map(bin => bin.count);

    return [
      {
        data: binValues,
        label: 'Frequency',
        color: colors?.[0] || getChartColor(0),
      },
    ];
  }, [data, colors]);

  const xAxisData = React.useMemo(() => {
    if (!data?.bins) return [];
    return data.bins.map((bin, index) => 
      `${bin.start.toFixed(1)}-${bin.end.toFixed(1)}`
    );
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for histogram'}
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
        xAxis={[
          {
            data: xAxisData,
            scaleType: 'band',
          },
        ]}
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
