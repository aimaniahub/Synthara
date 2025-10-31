'use client';

import React, { useMemo } from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { ChartWrapper } from './ChartWrapper';
import { ScatterChartProps } from '@/types/charts';
import { CHART_SPACING, getPaletteColor } from '@/lib/chart-gradients';

export function ScatterChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
}: ScatterChartProps) {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  const resolvedSeries = useMemo(() => {
    if (!data?.series || data.series.length === 0) return [];

    return data.series.map((series, index) => ({
      data: series.data,
      label: series.label || `Series ${index + 1}`,
      color: series.color || colors?.[index] || getPaletteColor(index, 'blueberryTwilight'),
    }));
  }, [data, colors]);

  if (!resolvedSeries.length) {
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
      <ResponsiveContainer width="100%" height={config.height || CHART_SPACING.heights.standard}>
        <RechartsScatterChart margin={{ top: 16, right: 24, bottom: 0, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />}

          <XAxis
            dataKey="x"
            type="number"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.xAxisLabel}
          />

          <YAxis
            dataKey="y"
            type="number"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.yAxisLabel}
          />

          <ZAxis range={[60, 60]} />

          {showTooltip && (
            <RechartsTooltip
              cursor={{ strokeDasharray: '3 3' }}
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

          {resolvedSeries.map((series, index) => (
            <Scatter
              key={`scatter-${index}`}
              name={series.label}
              data={series.data}
              fill={series.color}
              isAnimationActive
              onClick={(payload: unknown) => {
                if (onDataPointClick) {
                  onDataPointClick(payload);
                }
              }}
            />
          ))}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
