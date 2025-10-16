'use client';

import React from 'react';
import { PieChart as MuiPieChart } from '@mui/x-charts/PieChart';
import { ChartWrapper } from './ChartWrapper';
import { PieChartProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';

export function PieChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: PieChartProps) {
  const {
    showLegend = true,
    showTooltip = true,
    colors,
  } = config;

  // Transform data for MUI X Charts
  const chartData = React.useMemo(() => {
    if (!data?.data || data.data.length === 0) return null;

    return data.data.map((item, index) => ({
      id: item.id || index,
      value: item.value,
      label: item.label,
      color: item.color || colors?.[index] || getChartColor(index),
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
      <MuiPieChart
        series={[
          {
            data: chartData,
            innerRadius: data.innerRadius || 0,
            outerRadius: data.outerRadius || 80,
            paddingAngle: data.paddingAngle || 0,
            startAngle: data.startAngle || 0,
            endAngle: data.endAngle || 360,
          },
        ]}
        height={config.height || 300}
        tooltip={{ trigger: showTooltip ? 'item' : 'none' }}
        legend={showLegend ? { hidden: false } : { hidden: true }}
        onItemClick={onDataPointClick}
      />
    </ChartWrapper>
  );
}
