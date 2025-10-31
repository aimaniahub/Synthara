'use client';

import React from 'react';
import { ChartWrapper } from './ChartWrapper';
import { TreemapProps } from '@/types/charts';
import { getPaletteColor } from '@/lib/chart-gradients';

interface TreemapNode {
  id: string;
  value: number;
  label: string;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: TreemapNode[];
}

export function TreemapChart({
  data,
  config = {},
  className = '',
  loading = false,
  error = null,
  onDataPointClick,
  ...props
}: TreemapProps) {
  const {
    showLegend = true,
    showTooltip = true,
    colors,
  } = config;

  // Calculate treemap layout using squarified algorithm
  const calculateTreemapLayout = React.useCallback((nodes: TreemapNode[], width: number, height: number): TreemapNode[] => {
    if (nodes.length === 0) return [];

    // Sort nodes by value (descending)
    const sortedNodes = [...nodes].sort((a, b) => b.value - a.value);
    const totalValue = sortedNodes.reduce((sum, node) => sum + node.value, 0);

    // Simple treemap layout (simplified squarified algorithm)
    const result: TreemapNode[] = [];
    let currentRow: TreemapNode[] = [];
    let currentRowHeight = 0;
    let currentY = 0;

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const nodeArea = (node.value / totalValue) * (width * height);
      const nodeHeight = nodeArea / width;
      
      currentRow.push(node);
      currentRowHeight = Math.max(currentRowHeight, nodeHeight);

      // Check if we should start a new row
      const nextNode = sortedNodes[i + 1];
      if (nextNode) {
        const nextNodeArea = (nextNode.value / totalValue) * (width * height);
        const nextNodeHeight = nextNodeArea / width;
        const newRowHeight = Math.max(currentRowHeight, nextNodeHeight);
        
        // If adding the next node would make the row worse, start a new row
        if (currentRow.length > 1 && newRowHeight > currentRowHeight * 1.2) {
          // Layout current row
          const rowWidth = width / currentRow.length;
          currentRow.forEach((rowNode, index) => {
            result.push({
              ...rowNode,
              x: index * rowWidth,
              y: currentY,
              width: rowWidth,
              height: currentRowHeight,
            });
          });
          
          currentY += currentRowHeight;
          currentRow = [];
          currentRowHeight = 0;
        }
      }
    }

    // Layout remaining nodes
    if (currentRow.length > 0) {
      const rowWidth = width / currentRow.length;
      currentRow.forEach((rowNode, index) => {
        result.push({
          ...rowNode,
          x: index * rowWidth,
          y: currentY,
          width: rowWidth,
          height: currentRowHeight,
        });
      });
    }

    return result;
  }, []);

  // Transform data for treemap
  const treemapData = React.useMemo(() => {
    if (!data?.data || data.data.length === 0) return null;

    const nodes = data.data.map((item, index) => ({
      ...item,
      color: item.color || colors?.[index] || getPaletteColor(index, 'blueberryTwilight'),
    }));

    return calculateTreemapLayout(nodes, 1, 1); // Normalized coordinates
  }, [data, colors, calculateTreemapLayout]);

  if (!treemapData || treemapData.length === 0) {
    return (
      <ChartWrapper
        config={config}
        className={className}
        loading={loading}
        error={error || 'No data available for treemap'}
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
      {...props}
    >
      <div className="w-full h-full relative">
        <svg viewBox="0 0 1 1" className="w-full h-full">
          {treemapData.map((node, index) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={node.color}
                stroke="white"
                strokeWidth="0.002"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onDataPointClick?.(node)}
              />
              
              {/* Label */}
              {(node.width ?? 0) > 0.1 && (node.height ?? 0) > 0.05 && (
                <text
                  x={node.x! + node.width! / 2}
                  y={node.y! + node.height! / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min((node.width || 0) * 20, (node.height || 0) * 20, 0.03)}
                  fill="white"
                  className="pointer-events-none"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {node.label}
                </text>
              )}
              
              {/* Value */}
              {(node.width ?? 0) > 0.15 && (node.height ?? 0) > 0.08 && (
                <text
                  x={node.x! + node.width! / 2}
                  y={node.y! + node.height! / 2 + 0.02}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min((node.width || 0) * 15, (node.height || 0) * 15, 0.02)}
                  fill="white"
                  className="pointer-events-none"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {node.value.toLocaleString()}
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-2 p-2">
            {treemapData.slice(0, 8).map((node, index) => (
              <div key={node.id} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: node.color }}
                />
                <span>{node.label}</span>
                <span className="text-muted-foreground">({node.value})</span>
              </div>
            ))}
            {treemapData.length > 8 && (
              <div className="text-xs text-muted-foreground">
                +{treemapData.length - 8} more
              </div>
            )}
          </div>
        )}
      </div>
    </ChartWrapper>
  );
}
