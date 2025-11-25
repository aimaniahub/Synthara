"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ChartSpec } from '@/types/dataviz';

const ResponsiveLine = dynamic<any>(() => import('@nivo/line').then(m => m.ResponsiveLine), { ssr: false });
const ResponsiveBar = dynamic<any>(() => import('@nivo/bar').then(m => m.ResponsiveBar), { ssr: false });
const ResponsiveScatterPlot = dynamic<any>(() => import('@nivo/scatterplot').then(m => m.ResponsiveScatterPlot), { ssr: false });

type Props = {
  spec: ChartSpec;
  rows: Record<string, any>[];
};

const commonTheme = {
  text: { fontSize: 11, fill: '#e5e7eb' },
  axis: {
    ticks: {
      text: {
        fill: '#9ca3af',
      },
    },
  },
  grid: {
    line: {
      stroke: '#1f2933',
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: '#020617',
      color: '#e5e7eb',
      fontSize: 12,
    },
  },
} as const;


function isFiniteNumber(v: any) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n);
  }
  return false;
}

function toNumber(v: any): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    // Strip common formatting: commas, currency symbols, spaces
    const cleaned = v
      .replace(/[$€,]/g, '')
      .replace(/\s+/g, '')
      .trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? new Date(t) : null;
  }
  return null;
}

function aggregate(values: number[], agg: ChartSpec['aggregation'] = 'sum') {
  if (!values.length) return 0;
  if (agg === 'count') return values.length;
  if (agg === 'mean') return values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + b, 0);
}

export function NivoChartRenderer({ spec, rows }: Props) {
  if (!rows?.length) return null;
  if (spec.type === 'line') {
    if (!spec.xField || !spec.yField) return null;
    const byX = new Map<string, number[]>();
    for (const r of rows) {
      const d = parseDate(r[spec.xField]);
      const yv = toNumber(r[spec.yField]);
      if (!d || yv === null) continue;
      const key = d.toISOString().slice(0, 10);
      const arr = byX.get(key) || [];
      arr.push(yv);
      byX.set(key, arr);
    }
    const points = Array.from(byX.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, vals]) => ({ x: k, y: aggregate(vals, spec.aggregation) }));

    return (
      <div className="h-72 w-full">
        <ResponsiveLine
          data={[{ id: spec.title, data: points }]}
          margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', stacked: false }}
          axisBottom={{ tickRotation: -30 }}
          colors={['#38bdf8']}
          pointSize={6}
          useMesh
          theme={commonTheme}
        />
      </div>
    );
  }

  if (spec.type === 'bar') {
    if (!spec.xField || !spec.yField) return null;
    const xKey = spec.xField;
    const yKey = spec.yField;
    const isCount = spec.aggregation === 'count';
    const MAX_CATEGORIES = 10;
    if (isCount) {
      const counts = new Map<string, number>();
      for (const r of rows) {
        const k = r[xKey];
        if (k === null || k === undefined) continue;
        const key = String(k);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      let data = Array.from(counts.entries()).map(([k, count]) => ({ [xKey]: k, [yKey]: count }));

      if (!data.length) return null;

      // Sort by value desc and keep top N to avoid overcrowding
      data = data
        .slice()
        .sort((a, b) => (b[yKey] as number) - (a[yKey] as number))
        .slice(0, MAX_CATEGORIES);

      const labels = data.map(d => String(d[xKey]));
      const longest = labels.reduce((m, v) => Math.max(m, v.length), 0);
      const many = labels.length > 8;
      const useHorizontal = many || longest > 10;

      return (
        <div className="h-72 w-full">
          <ResponsiveBar
            data={data}
            keys={[yKey]}
            indexBy={xKey}
            layout={useHorizontal ? 'horizontal' : 'vertical'}
            margin={{ top: 20, right: 20, bottom: useHorizontal ? 40 : 60, left: useHorizontal ? 80 : 50 }}
            padding={0.3}
            colors={['#22c55e']}
            axisBottom={useHorizontal ? { tickRotation: 0 } : { tickRotation: -30 }}
            axisLeft={useHorizontal ? undefined : { tickRotation: 0 }}
            enableGridY
            theme={commonTheme}
            labelSkipWidth={16}
            labelSkipHeight={16}
            labelTextColor="#0f172a"
          />
        </div>
      );
    }

    const byCat = new Map<string, number[]>();
    for (const r of rows) {
      const k = r[xKey];
      const yv = toNumber(r[yKey]);
      if (k === null || k === undefined || yv === null) continue;
      const key = String(k);
      const arr = byCat.get(key) || [];
      arr.push(yv);
      byCat.set(key, arr);
    }
    let data = Array.from(byCat.entries()).map(([k, vals]) => ({ [xKey]: k, [yKey]: aggregate(vals, spec.aggregation) }));

    if (!data.length) return null;

    // Sort by value desc and keep top N to avoid overcrowding
    data = data
      .slice()
      .sort((a, b) => (b[yKey] as number) - (a[yKey] as number))
      .slice(0, MAX_CATEGORIES);

    const labels = data.map(d => String(d[xKey]));
    const longest = labels.reduce((m, v) => Math.max(m, v.length), 0);
    const many = labels.length > 8;
    const useHorizontal = many || longest > 10;

    return (
      <div className="h-72 w-full">
        <ResponsiveBar
          data={data}
          keys={[yKey]}
          indexBy={xKey}
          layout={useHorizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 20, bottom: useHorizontal ? 40 : 60, left: useHorizontal ? 80 : 50 }}
          padding={0.3}
          colors={['#22c55e']}
          axisBottom={useHorizontal ? { tickRotation: 0 } : { tickRotation: -30 }}
          axisLeft={useHorizontal ? undefined : { tickRotation: 0 }}
          enableGridY
          theme={commonTheme}
          labelSkipWidth={16}
          labelSkipHeight={16}
          labelTextColor="#0f172a"
        />
      </div>
    );
  }

  if (spec.type === 'scatter') {
    if (!spec.xField || !spec.yField) return null;
    const pts: { x: number; y: number }[] = [];
    for (const r of rows) {
      const xv = toNumber(r[spec.xField]);
      const yv = toNumber(r[spec.yField]);
      if (xv === null || yv === null) continue;
      pts.push({ x: xv, y: yv });
    }
    const limited = pts.slice(0, 1000);

    return (
      <div className="h-72 w-full">
        <ResponsiveScatterPlot
          data={[{ id: spec.title, data: limited }]}
          margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
          xScale={{ type: 'linear' }}
          yScale={{ type: 'linear' }}
          colors={['#f97316']}
          blendMode="multiply"
          theme={commonTheme}
        />
      </div>
    );
  }

  return null;
}

export default NivoChartRenderer;
