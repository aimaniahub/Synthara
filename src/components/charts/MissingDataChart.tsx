'use client';

import React from 'react';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';
import { ChartWrapper } from './ChartWrapper';
import { MissingDataChartProps } from '@/types/charts';
import { getChartColor, getChartColorByName } from '@/lib/mui-theme-adapter';

export function MissingDataChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: MissingDataChartProps) {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  // Transform missing data for MUI X Charts
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return null;

    const columnNames = data.map(item => item.column);
    const missingPercentages = data.map(item => item.missingPercentage);

    return [
      {
        data: missingPercentages,
        label: 'Missing Data %',
      },
    ];
  }, [data, colors]);

  const xAxisData = React.useMemo(() => {
    if (!data) return [];
    return data.map(item => item.column);
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No missing data information available'}
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
        tooltip={{ 
          trigger: showTooltip ? 'item' : 'none',
          formatter: (value, name, props) => [
            `${value?.toFixed(1)}%`,
            'Missing Data'
          ]
        }}
        legend={showLegend ? { hidden: false } : { hidden: true }}
        axisHighlight={{ x: 'line', y: 'line' }}
        onItemClick={onDataPointClick}
      />
    </ChartWrapper>
  );
}
