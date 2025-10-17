'use client';

import React, { useState, forwardRef } from 'react';
import { LineChart as MuiLineChart } from '@mui/x-charts/LineChart';
import { ChartWrapper, ChartWrapperRef } from './ChartWrapper';
import { LineChartProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';
import { CHART_GRADIENTS, GradientDef, HIGHLIGHT_CONFIG, CHART_SPACING } from '@/lib/chart-gradients';

export const LineChart = forwardRef<ChartWrapperRef, LineChartProps>(({
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
        data: Array.isArray(series.data) ? series.data : [],
        label: series.label || `Series ${index + 1}`,
        color: baseColor,
        curve: series.curve || 'linear',
        id: `series-${index}`,
        area: series.area || false,
        areaOpacity: series.areaOpacity || 0.1,
      };
    });
  }, [data, colors]);

  // Generate gradient definitions for area fills
  const gradientDefs = React.useMemo(() => {
    if (!chartData) return null;
    
    return (
      <defs>
        {chartData.map((series, index) => {
          if (series.area) {
            const gradient = CHART_GRADIENTS.areaVertical(series.color, series.areaOpacity || 0.1, index);
            return <GradientDef key={gradient.id} gradient={gradient} />;
          }
          return null;
        }).filter(Boolean)}
      </defs>
    );
  }, [chartData]);

  const xAxisData = React.useMemo(() => {
    if (data?.xAxis?.data && Array.isArray(data.xAxis.data)) {
      return data.xAxis.data;
    }
    // Generate default labels if not provided
    if (chartData && chartData[0]?.data && Array.isArray(chartData[0].data)) {
      return chartData[0].data.map((_, index) => index);
    }
    return [];
  }, [data, chartData]);

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
      ref={ref}
      config={config}
      className={className}
      loading={loading}
      error={error}
      title={config.title}
      description={config.description}
      chartType="line"
      {...props}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        {gradientDefs}
      </svg>
      <MuiLineChart
        series={chartData.map(series => ({
          data: series.data,
          label: series.label,
          color: series.color,
          curve: series.curve,
          id: series.id,
          area: series.area,
          areaOpacity: series.areaOpacity,
        }))}
        xAxis={[
          {
            data: xAxisData,
            scaleType: data.xAxis?.scaleType || 'linear',
            label: data.xAxis?.label,
            labelStyle: {
              fontSize: '0.875rem',
              fontWeight: 500,
            },
            tickLabelStyle: {
              fontSize: '0.75rem',
            },
          },
        ]}
        yAxis={[
          {
            label: data.yAxis?.label,
            labelStyle: {
              fontSize: '0.875rem',
              fontWeight: 500,
            },
            tickLabelStyle: {
              fontSize: '0.75rem',
            },
          },
        ]}
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
          line: {
            style: {
              transition: 'all 0.2s ease-in-out',
            },
          },
          area: {
            style: {
              transition: 'all 0.2s ease-in-out',
            },
          },
        }}
        colors={colors || undefined}
      />
    </ChartWrapper>
  );
});

LineChart.displayName = 'LineChart';
