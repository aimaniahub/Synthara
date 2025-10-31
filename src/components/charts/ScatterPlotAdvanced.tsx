'use client';

import React, { useMemo, forwardRef } from 'react';
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
import { ChartWrapper, ChartWrapperRef } from './ChartWrapper';
import { ScatterAdvancedProps } from '@/types/charts';
import { CHART_SPACING, getPaletteColor } from '@/lib/chart-gradients';

export const ScatterPlotAdvanced = forwardRef<ChartWrapperRef, ScatterAdvancedProps>(({ 
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

  const resolvedSeries = useMemo(() => {
    if (!data?.series || data.series.length === 0) return [];
    return data.series.map((series, index) => ({
      data: Array.isArray(series.data) ? series.data.map(point => ({
        x: typeof point.x === 'number' ? point.x : 0,
        y: typeof point.y === 'number' ? point.y : 0,
        id: point.label || `${point.x}-${point.y}`,
      })) : [],
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
        error={error || 'No data available for scatter plot'}
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
        <RechartsScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />}

          <XAxis
            dataKey="x"
            type="number"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.xAxisLabel || data.xAxis?.label}
          />
          <YAxis
            dataKey="y"
            type="number"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={showAxis ? { stroke: 'hsl(var(--border))' } : false}
            label={config.yAxisLabel || data.yAxis?.label}
          />
          <ZAxis range={[60, 60]} />

          {showTooltip && (
            <RechartsTooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                borderRadius: CHART_SPACING.borderRadius.element,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
              }}
            />
          )}

          {showLegend && (
            <RechartsLegend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 16 }} />
          )}

          {resolvedSeries.map((series, index) => (
            <Scatter
              key={`scatter-adv-${index}`}
              name={series.label}
              data={series.data}
              fill={series.color}
              isAnimationActive={false}
              onClick={(payload: unknown) => onDataPointClick?.(payload)}
            />
          ))}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
});

ScatterPlotAdvanced.displayName = 'ScatterPlotAdvanced';
