'use client';

import React, { useMemo, forwardRef } from 'react';
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
import { ChartWrapper, ChartWrapperRef } from './ChartWrapper';
import { BarChartProps } from '@/types/charts';
import { CHART_SPACING, getPaletteColor } from '@/lib/chart-gradients';

export const BarChart = forwardRef<ChartWrapperRef, BarChartProps>(({
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
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  const xValues = useMemo(() => {
    if (data?.xAxis?.data && Array.isArray(data.xAxis.data)) {
      return data.xAxis.data;
    }
    if (data?.series?.[0]?.data) {
      return data.series[0].data.map((_, idx) => `Item ${idx + 1}`);
    }
    return [];
  }, [data]);

  const chartData = useMemo(() => {
    if (!xValues.length) return [];

    return xValues.map((x, index) => {
      const point: Record<string, number | string> = {
        label: String(x),
      };

      data?.series?.forEach((series, sIndex) => {
        const value = Array.isArray(series.data) ? series.data[index] : undefined;
        if (value !== undefined) {
          point[`series_${sIndex}`] = value;
        }
      });

      return point;
    });
  }, [data, xValues]);

  const resolvedSeries = useMemo(() => {
    return data?.series?.map((series, index) => ({
      key: `series_${index}`,
      label: series.label || `Series ${index + 1}`,
      color: series.color || colors?.[index] || getPaletteColor(index, 'blueberryTwilight'),
    })) ?? [];
  }, [data, colors]);

  if (!resolvedSeries.length || !chartData.length) {
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
        <RechartsBarChart data={chartData} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />}

          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.xAxisLabel}
          />

          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.yAxisLabel}
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

          {resolvedSeries.map(series => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              fill={series.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
              isAnimationActive
              onClick={(payload: unknown) => {
                if (onDataPointClick) {
                  onDataPointClick(payload);
                }
              }}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
});

BarChart.displayName = 'BarChart';