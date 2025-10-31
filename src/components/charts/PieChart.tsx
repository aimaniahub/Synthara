'use client';

import React, { useMemo, forwardRef } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import { ChartWrapper, ChartWrapperRef } from './ChartWrapper';
import { PieChartProps } from '@/types/charts';
import { CHART_SPACING, getPaletteColor } from '@/lib/chart-gradients';

export const PieChart = forwardRef<ChartWrapperRef, PieChartProps>(({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  ...props
}, ref) => {
  const {
    showLegend = true,
    showTooltip = true,
    colors,
  } = config;

  const chartData = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];

    return data.data.map((item, index) => ({
      name: item.label,
      value: item.value,
      color: item.color || colors?.[index] || getPaletteColor(index, 'blueberryTwilight'),
    }));
  }, [data, colors]);

  if (!chartData.length) {
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
      ref={ref}
      config={config}
      className={className}
      loading={loading}
      error={error}
      title={config.title}
      description={config.description}
      {...props}
    >
      <ResponsiveContainer width="100%" height={config.height || CHART_SPACING.heights.standard}>
        <RechartsPieChart margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={data.innerRadius || 0}
            outerRadius={data.outerRadius || 80}
            paddingAngle={data.paddingAngle || 2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{stroke: 'hsl(var(--border))'}}
            isAnimationActive
            onClick={(payload: unknown) => {
              if (onDataPointClick) {
                onDataPointClick(payload);
              }
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>

          {showTooltip && (
            <RechartsTooltip
              contentStyle={{
                borderRadius: CHART_SPACING.borderRadius.element,
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                background: 'hsl(var(--card))',
              }}
            />
          )}

          {showLegend && (
            <RechartsLegend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 16 }} />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
});

PieChart.displayName = 'PieChart';
