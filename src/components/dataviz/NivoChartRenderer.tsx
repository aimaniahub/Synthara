"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ChartSpec } from '@/types/dataviz';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { EmptyChartState } from './EmptyChartState';

const ResponsiveLine = dynamic<any>(() => import('@nivo/line').then(m => m.ResponsiveLine), { ssr: false });
const ResponsiveBar = dynamic<any>(() => import('@nivo/bar').then(m => m.ResponsiveBar), { ssr: false });
const ResponsiveScatterPlot = dynamic<any>(() => import('@nivo/scatterplot').then(m => m.ResponsiveScatterPlot), { ssr: false });
const ResponsivePie = dynamic<any>(() => import('@nivo/pie').then(m => m.ResponsivePie), { ssr: false });
const ResponsiveRadar = dynamic<any>(() => import('@nivo/radar').then(m => m.ResponsiveRadar), { ssr: false });
const ResponsiveBoxPlot = dynamic<any>(() => import('@nivo/boxplot').then(m => m.ResponsiveBoxPlot), { ssr: false });

type Props = {
  spec: ChartSpec;
  rows: Record<string, any>[];
};

const commonTheme = {
  text: {
    fontSize: 10,
    fill: '#94a3b8',
    fontWeight: 900,
    fontFamily: 'inherit',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  },
  axis: {
    domain: {
      line: {
        stroke: '#1e293b',
        strokeWidth: 1,
      },
    },
    ticks: {
      line: {
        stroke: '#1e293b',
        strokeWidth: 1,
      },
      text: {
        fill: '#94a3b8',
        fontWeight: 700,
        fontSize: 10
      },
    },
    legend: {
      text: {
        fill: '#94a3b8',
        fontWeight: 900,
      }
    }
  },
  grid: {
    line: {
      stroke: '#0f172a',
      strokeWidth: 1,
      strokeDasharray: '4 4',
    },
  },
  tooltip: {
    container: {
      background: '#020617',
      color: '#f8fafc',
      fontSize: 11,
      borderRadius: '12px',
      border: '1px solid #1e293b',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      padding: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
  },
} as const;

function getFieldCaseInsensitive(obj: Record<string, any>, field: string): any {
  if (!field) return undefined;
  if (obj.hasOwnProperty(field)) return obj[field];
  const lowerField = field.toLowerCase();
  const normalizedField = field.replace(/[\s_-]/g, '').toLowerCase();

  for (const key in obj) {
    if (key.toLowerCase() === lowerField) return obj[key];
    if (key.replace(/[\s_-]/g, '').toLowerCase() === normalizedField) return obj[key];
  }
  return obj[field];
}

function parseXValue(v: any): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    if (v >= 1900 && v <= 2100) return String(v); // It's a year
    if (v > 1000000000) return new Date(v).toISOString().slice(0, 10); // Epoch
    return String(v);
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const t = Date.parse(v);
    if (!isNaN(t)) {
      const d = new Date(t);
      // If it looks like a full timestamp, just use YYYY-MM-DD
      return d.toISOString().slice(0, 10);
    }
    return v;
  }
  return String(v ?? '');
}

function toNumber(v: any): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const cleaned = v.replace(/[$€,]/g, '').replace(/\s+/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function aggregate(values: number[], agg: ChartSpec['aggregation'] = 'sum') {
  const cleanValues = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!cleanValues.length) return 0;
  if (agg === 'count') return cleanValues.length;
  if (agg === 'mean') return cleanValues.reduce((a, b) => a + b, 0) / cleanValues.length;
  return cleanValues.reduce((a, b) => a + b, 0);
}

export function NivoChartRenderer({ spec, rows }: Props) {
  const chart = useMemo(() => {
    if (!rows?.length) return <EmptyChartState title={spec.title} />;

    try {
      switch (spec.type) {
        case 'line': {
          if (!spec.xField || !spec.yField) return <EmptyChartState title={spec.title} />;
          const isCount = spec.yField === '__count__' || spec.aggregation === 'count';
          const byX = new Map<string, number>();

          for (const r of rows) {
            const xv = getFieldCaseInsensitive(r, spec.xField);
            const xStr = parseXValue(xv);
            if (!xStr) continue;

            if (isCount) {
              byX.set(xStr, (byX.get(xStr) || 0) + 1);
            } else {
              const yv = toNumber(getFieldCaseInsensitive(r, spec.yField!));
              if (yv !== null) {
                // For simplicity in line charts, we sum if there are multiple values for same X
                byX.set(xStr, (byX.get(xStr) || 0) + yv);
              }
            }
          }

          const points = Array.from(byX.entries())
            .map(([k, v]) => ({ x: k, y: v }))
            .sort((a, b) => String(a.x).localeCompare(String(b.x)));

          if (!points.length) return <EmptyChartState title={spec.title} />;

          return (
            <ResponsiveLine
              data={[{ id: spec.title, data: points }]}
              margin={{ top: 30, right: 30, bottom: 60, left: 60 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              axisBottom={{ tickRotation: -45, legend: spec.xField, legendOffset: 50, legendPosition: 'middle' }}
              axisLeft={{ legend: spec.yField, legendOffset: -50, legendPosition: 'middle' }}
              colors={['#0ea5e9']}
              lineWidth={3}
              pointSize={8}
              pointColor="#0ea5e9"
              enableArea={true}
              areaOpacity={0.1}
              useMesh
              theme={commonTheme}
              animate={true}
            />
          );
        }

        case 'bar':
        case 'histogram': {
          if (!spec.xField || !spec.yField) return <EmptyChartState title={spec.title} />;
          const xKey = spec.xField;
          const yKey = spec.yField;
          const isCount = spec.aggregation === 'count';
          const MAX_CATEGORIES = 12;

          let data: any[] = [];
          if (isCount) {
            const counts = new Map<string, number>();
            for (const r of rows) {
              const kv = getFieldCaseInsensitive(r, xKey);
              if (kv === null || kv === undefined || kv === '') continue;

              // Handle comma separated tags (e.g. "Equity, Commodity")
              const vals = String(kv).split(',').map(s => s.trim()).filter(Boolean);
              for (const val of vals) {
                counts.set(val, (counts.get(val) || 0) + 1);
              }
            }
            data = Array.from(counts.entries()).map(([k, count]) => ({ [xKey]: k, [yKey]: count }));
          } else {
            const byCat = new Map<string, number[]>();
            for (const r of rows) {
              const kv = getFieldCaseInsensitive(r, xKey);
              const yv = toNumber(getFieldCaseInsensitive(r, yKey));
              if (kv === null || kv === undefined || kv === '' || yv === null) continue;

              const vals = String(kv).split(',').map(s => s.trim()).filter(Boolean);
              for (const val of vals) {
                const arr = byCat.get(val) || [];
                arr.push(yv);
                byCat.set(val, arr);
              }
            }
            data = Array.from(byCat.entries()).map(([k, vals]) => ({ [xKey]: k, [yKey]: aggregate(vals, spec.aggregation) }));
          }

          if (!data.length) return <EmptyChartState title={spec.title} />;

          data = data.sort((a, b) => b[yKey] - a[yKey]).slice(0, MAX_CATEGORIES);

          return (
            <ResponsiveBar
              data={data}
              keys={[yKey]}
              indexBy={xKey}
              margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
              padding={0.3}
              colors={spec.type === 'histogram' ? ['#8b5cf6'] : ['#10b981']}
              borderRadius={6}
              axisBottom={{ tickRotation: -25 }}
              theme={commonTheme}
              animate={true}
            />
          );
        }

        case 'scatter': {
          if (!spec.xField || !spec.yField) return <EmptyChartState title={spec.title} />;
          const pts: { x: number; y: number }[] = [];
          for (const r of rows) {
            const xv = toNumber(getFieldCaseInsensitive(r, spec.xField));
            const yv = toNumber(getFieldCaseInsensitive(r, spec.yField));
            if (xv !== null && yv !== null) pts.push({ x: xv, y: yv });
          }
          if (!pts.length) return <EmptyChartState title={spec.title} />;

          return (
            <ResponsiveScatterPlot
              data={[{ id: spec.title, data: pts.slice(0, 1000) }]}
              margin={{ top: 30, right: 30, bottom: 60, left: 60 }}
              xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
              axisBottom={{ legend: spec.xField, legendPosition: 'middle', legendOffset: 45 }}
              axisLeft={{ legend: spec.yField, legendPosition: 'middle', legendOffset: -50 }}
              colors={['#f59e0b']}
              nodeSize={8}
              theme={commonTheme}
              animate={true}
            />
          );
        }

        case 'pie': {
          if (!spec.xField) return <EmptyChartState title={spec.title} />;
          const xKey = spec.xField;
          const counts = new Map<string, number>();
          for (const r of rows) {
            const kv = getFieldCaseInsensitive(r, xKey);
            if (kv === null || kv === undefined) continue;
            const key = String(kv);
            counts.set(key, (counts.get(key) || 0) + 1);
          }
          const data = Array.from(counts.entries())
            .map(([label, value]) => ({ id: label, label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

          if (!data.length) return <EmptyChartState title={spec.title} />;

          return (
            <ResponsivePie
              data={data}
              margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ scheme: 'nivo' }}
              theme={commonTheme}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#94a3b8"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
            />
          );
        }

        case 'radar': {
          if (!spec.xField || !spec.yField) return <EmptyChartState title={spec.title} />;
          const xKey = spec.xField;
          const yKey = spec.yField;
          const data = rows.slice(0, 8).map(r => ({
            key: parseXValue(getFieldCaseInsensitive(r, xKey)),
            value: toNumber(getFieldCaseInsensitive(r, yKey)) || 0,
          }));

          if (!data.length) return <EmptyChartState title={spec.title} />;

          return (
            <ResponsiveRadar
              data={data}
              keys={['value']}
              indexBy="key"
              maxValue="auto"
              margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
              curve="linearClosed"
              borderWidth={2}
              borderColor={{ from: 'color' }}
              gridLevels={5}
              gridShape="circular"
              gridLabelOffset={36}
              enableDots={true}
              dotSize={10}
              dotColor={{ from: 'color' }}
              dotBorderWidth={2}
              dotBorderColor={{ from: 'color' }}
              theme={commonTheme}
              colors={['#ec4899']}
              fillOpacity={0.25}
            />
          );
        }

        case 'box': {
          if (!spec.yField) return <EmptyChartState title={spec.title} />;
          const yKey = spec.yField;
          const xKey = spec.xField;

          let data: any[] = [];
          if (xKey) {
            const byX = new Map<string, number[]>();
            for (const r of rows) {
              const xv = String(getFieldCaseInsensitive(r, xKey));
              const yv = toNumber(getFieldCaseInsensitive(r, yKey));
              if (yv === null) continue;
              const arr = byX.get(xv) || [];
              arr.push(yv);
              byX.set(xv, arr);
            }
            data = Array.from(byX.entries()).map(([group, values]) => ({ group, values }));
          } else {
            const values = rows.map(r => toNumber(getFieldCaseInsensitive(r, yKey))).filter(v => v !== null) as number[];
            data = [{ group: 'All', values }];
          }

          if (!data.length || !data[0].values.length) return <EmptyChartState title={spec.title} />;

          return (
            <ResponsiveBoxPlot
              data={data}
              margin={{ top: 60, right: 40, bottom: 60, left: 80 }}
              minValue="auto"
              maxValue="auto"
              layout="vertical"
              padding={0.12}
              enableGridX={false}
              axisLeft={{ legend: yKey, legendPosition: 'middle', legendOffset: -60 }}
              colors={['#f97316']}
              theme={commonTheme}
              animate={true}
            />
          );
        }

        default:
          return <EmptyChartState title={spec.title} />;
      }
    } catch (err) {
      console.error('Rendering error for spec', spec, err);
      return <EmptyChartState title={spec.title} />;
    }
  }, [spec, rows]);

  return (
    <ChartErrorBoundary chartTitle={spec.title}>
      <div className="h-full w-full">
        {chart}
      </div>
    </ChartErrorBoundary>
  );
}

export default NivoChartRenderer;
