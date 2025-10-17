'use client';

import React, { useState, forwardRef } from 'react';
import { PieChart as MuiPieChart } from '@mui/x-charts/PieChart';
import { ChartWrapper, ChartWrapperRef } from './ChartWrapper';
import { PieChartProps } from '@/types/charts';
import { getChartColor } from '@/lib/mui-theme-adapter';
import { CHART_GRADIENTS, GradientDef, HIGHLIGHT_CONFIG, CHART_SPACING } from '@/lib/chart-gradients';

export const PieChart = forwardRef<ChartWrapperRef, PieChartProps>(({
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
    colors,
  } = config;

  // State for highlighting
  const [highlightedItem, setHighlightedItem] = useState<{ seriesId: string; dataIndex: number } | null>(null);

  // Transform data for MUI X Charts with gradients
  const chartData = React.useMemo(() => {
    if (!data?.data || data.data.length === 0) return null;

    return data.data.map((item, index) => {
      const baseColor = item.color || colors?.[index] || getChartColor(index, 'blueberryTwilight');
      
      return {
        id: item.id || index,
        value: item.value,
        label: item.label,
        color: baseColor,
      };
    });
  }, [data, colors]);

  // Generate gradient definitions for pie slices
  const gradientDefs = React.useMemo(() => {
    if (!chartData) return null;
    
    return (
      <defs>
        {chartData.map((item, index) => {
          const gradient = CHART_GRADIENTS.pieRadial(item.color, 0.8, index);
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
      chartType="pie"
      {...props}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        {gradientDefs}
      </svg>
      <MuiPieChart
        series={[
          {
            data: chartData,
            innerRadius: data.innerRadius || 0,
            outerRadius: data.outerRadius || 80,
            paddingAngle: data.paddingAngle || 2,
            startAngle: data.startAngle || 0,
            endAngle: data.endAngle || 360,
            id: 'pie-series',
          },
        ]}
        height={config.height || CHART_SPACING.heights.standard}
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
        onItemClick={onDataPointClick}
        slotProps={{
          pieArc: {
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

PieChart.displayName = 'PieChart';
