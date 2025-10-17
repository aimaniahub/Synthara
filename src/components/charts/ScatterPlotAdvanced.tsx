'use client';

import React, { useState, forwardRef } from 'react';
import { ScatterChart as MuiScatterChart } from '@mui/x-charts/ScatterChart';
import { ChartWrapper, ChartWrapperRef } from './ChartWrapper';
import { ScatterAdvancedProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';
import { CHART_GRADIENTS, GradientDef, HIGHLIGHT_CONFIG, CHART_SPACING } from '@/lib/chart-gradients';

export const ScatterPlotAdvanced = forwardRef<ChartWrapperRef, ScatterAdvancedProps>(({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
  ...props
}, ref) => {
  const {
    showLegend = true,
    showTooltip = true,
    showGrid = true,
    showAxis = true,
    colors,
  } = config;

  // State for highlighting
  const [highlightedItem, setHighlightedItem] = useState<{ seriesId: string; dataIndex: number } | null>(null);

  // Transform data for MUI X Charts with gradients
  const chartData = React.useMemo(() => {
    if (!data?.series || data.series.length === 0) return null;

    return data.series.map((series, index) => {
      const baseColor = series.color || colors?.[index] || getChartColor(index, 'blueberryTwilight');
      
      return {
        data: Array.isArray(series.data) ? series.data.map(point => ({
          x: typeof point.x === 'number' ? point.x : 0,
          y: typeof point.y === 'number' ? point.y : 0,
          id: point.label || `${point.x}-${point.y}`,
        })) : [],
        label: series.label || `Series ${index + 1}`,
        color: baseColor,
        id: `series-${index}`,
      };
    });
  }, [data, colors]);

  // Generate gradient definitions for scatter points
  const gradientDefs = React.useMemo(() => {
    if (!chartData) return null;
    
    return (
      <defs>
        {chartData.map((series, index) => {
          const gradient = CHART_GRADIENTS.scatterRadial(series.color, 0.7, index);
          return <GradientDef key={gradient.id} gradient={gradient} />;
        })}
      </defs>
    );
  }, [chartData]);

  if (!chartData || chartData.length === 0) {
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
      chartType="scatter"
      {...props}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        {gradientDefs}
      </svg>
      <MuiScatterChart
        series={chartData.map(series => ({
          data: series.data,
          label: series.label,
          color: series.color,
          id: series.id,
        }))}
        xAxis={[{
          label: data.xAxis?.label || 'X Axis',
          scaleType: data.xAxis?.scaleType || 'linear',
          labelStyle: {
            fontSize: '0.875rem',
            fontWeight: 500,
          },
          tickLabelStyle: {
            fontSize: '0.75rem',
          },
        }]}
        yAxis={[{
          label: data.yAxis?.label || 'Y Axis',
          scaleType: data.yAxis?.scaleType || 'linear',
          labelStyle: {
            fontSize: '0.875rem',
            fontWeight: 500,
          },
          tickLabelStyle: {
            fontSize: '0.75rem',
          },
        }]}
        height={config.height || CHART_SPACING.heights.standard}
        grid={{ 
          vertical: showGrid, 
          horizontal: showGrid,
          verticalSubGrid: false,
          horizontalSubGrid: false,
        }}
        tooltip={{ 
          trigger: showTooltip ? 'item' : 'none',
          placement: 'top',
          slotProps: {
            popper: {
              sx: {
                '& .MuiChartsTooltip-root': {
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: CHART_SPACING.borderRadius.element,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                },
              },
            },
          },
        }}
        legend={showLegend ? { 
          hidden: false,
          direction: 'row',
          position: { vertical: 'bottom', horizontal: 'middle' },
          padding: 16,
        } : { hidden: true }}
        axisHighlight={{ 
          x: 'line', 
          y: 'line',
        }}
        highlight={{ 
          highlightScope: {
            highlighted: 'item',
            faded: 'global',
          },
        }}
        highlightedItem={highlightedItem}
        onHighlightChange={(item) => setHighlightedItem(item)}
        onItemClick={onDataPointClick}
        slotProps={{
          scatter: {
            style: {
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
            },
          },
        }}
        colors={colors || undefined}
      />
    </ChartWrapper>
  );
});

ScatterPlotAdvanced.displayName = 'ScatterPlotAdvanced';
