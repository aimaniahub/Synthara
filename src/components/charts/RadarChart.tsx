'use client';

import React from 'react';
import { ChartWrapper } from './ChartWrapper';
import { RadarProps } from '@/types/charts';

export function RadarChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  onDataPointHover,
}: RadarProps) {
  const {
    showLegend = true,
    showTooltip = true,
    colors,
  } = config;

  // Transform data for radar chart
  const radarData = React.useMemo(() => {
    if (!data?.series || data.series.length === 0) return null;

    return data.series.map((series, index) => ({
      ...series,
      color: series.color || colors?.[index] || `hsl(${index * 60}, 70%, 50%)`,
    }));
  }, [data, colors]);

  if (!radarData || radarData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for radar chart'}
        title={config.title}
        description={config.description}
      />
    );
  }

  // Get all unique labels for the radar axes
  const allLabels = React.useMemo(() => {
    const labels = new Set<string>();
    radarData.forEach(series => {
      series.data.forEach(point => labels.add(point.label));
    });
    return Array.from(labels);
  }, [radarData]);

  const maxValue = data.maxValue || Math.max(...radarData.flatMap(series => series.data.map(point => point.value)));
  const minValue = data.minValue || 0;

  // Calculate positions for radar points
  const getRadarPoint = (value: number, label: string, seriesIndex: number) => {
    const labelIndex = allLabels.indexOf(label);
    const angle = (labelIndex * 2 * Math.PI) / allLabels.length - Math.PI / 2;
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const radius = normalizedValue * 0.8; // 80% of the chart radius
    
    return {
      x: 0.5 + radius * Math.cos(angle),
      y: 0.5 + radius * Math.sin(angle),
      value,
      label,
    };
  };

  return (
    <ChartWrapper
      config={config}
      className={className}
      loading={loading}
      error={error}
      title={config.title}
      description={config.description}
    >
      <div className="w-full h-full relative">
        <svg viewBox="0 0 1 1" className="w-full h-full">
          {/* Grid circles */}
          {[0.2, 0.4, 0.6, 0.8].map((radius, index) => (
            <circle
              key={index}
              cx="0.5"
              cy="0.5"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="0.002"
            />
          ))}
          
          {/* Grid lines */}
          {allLabels.map((label, index) => {
            const angle = (index * 2 * Math.PI) / allLabels.length - Math.PI / 2;
            const x2 = 0.5 + 0.8 * Math.cos(angle);
            const y2 = 0.5 + 0.8 * Math.sin(angle);
            
            return (
              <line
                key={index}
                x1="0.5"
                y1="0.5"
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="0.002"
              />
            );
          })}
          
          {/* Data series */}
          {radarData.map((series, seriesIndex) => {
            const points = series.data.map(point => 
              getRadarPoint(point.value, point.label, seriesIndex)
            );
            
            // Create path for the series
            const pathData = points.map((point, index) => 
              `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
            ).join(' ') + ' Z';
            
            return (
              <g key={seriesIndex}>
                {/* Fill area */}
                <path
                  d={pathData}
                  fill={series.color}
                  fillOpacity="0.2"
                  stroke="none"
                />
                
                {/* Stroke */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="0.005"
                />
                
                {/* Data points */}
                {points.map((point, pointIndex) => (
                  <circle
                    key={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="0.01"
                    fill={series.color}
                    stroke="white"
                    strokeWidth="0.002"
                    className="cursor-pointer hover:r-2 transition-all"
                    onClick={() => onDataPointClick?.({ 
                      series: series.label, 
                      label: point.label, 
                      value: point.value 
                    })}
                    onMouseEnter={() => onDataPointHover?.({ 
                      series: series.label, 
                      label: point.label, 
                      value: point.value 
                    })}
                  />
                ))}
              </g>
            );
          })}
          
          {/* Axis labels */}
          {allLabels.map((label, index) => {
            const angle = (index * 2 * Math.PI) / allLabels.length - Math.PI / 2;
            const x = 0.5 + 0.9 * Math.cos(angle);
            const y = 0.5 + 0.9 * Math.sin(angle);
            
            return (
              <text
                key={index}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="0.03"
                fill="currentColor"
                className="text-xs"
              >
                {label}
              </text>
            );
          })}
        </svg>
        
        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-2 p-2">
            {radarData.map((series, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: series.color }}
                />
                <span>{series.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartWrapper>
  );
}
