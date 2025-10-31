'use client';

import React, { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from 'recharts';
import { ChartWrapper } from './ChartWrapper';
import { HistogramProps } from '@/types/charts';
import { CHART_SPACING, getPaletteColor } from '@/lib/chart-gradients';

export function HistogramChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  ...props
}: HistogramProps) {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  const chartData = useMemo(() => {
    if (!data?.bins || data.bins.length === 0) return [];

    return data.bins.map((bin) => ({
      range: `${bin.start.toFixed(1)}-${bin.end.toFixed(1)}`,
      frequency: bin.count,
    }));
  }, [data]);

  if (!chartData.length) {
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

  const barColor = colors?.[0] || getPaletteColor(0, 'blueberryTwilight');

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
      <ResponsiveContainer width="100%" height={config.height || CHART_SPACING.heights.standard}>
        <RechartsBarChart data={chartData} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />}

          <XAxis
            dataKey="range"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.xAxisLabel || 'Range'}
          />

          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.yAxisLabel || 'Frequency'}
          />

          {showTooltip && (
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
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

          <Bar
            dataKey="frequency"
            name="Frequency"
            fill={barColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
            isAnimationActive
            onClick={(payload: unknown) => {
              if (onDataPointClick) {
                onDataPointClick(payload);
              }
            }}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
