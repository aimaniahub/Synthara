'use client';

import React, { useMemo, useState, Suspense, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, BarChart3, Loader2, RefreshCcw } from 'lucide-react';
import NivoChartRenderer from '@/components/dataviz/NivoChartRenderer';
import type { ColumnInfo, ChartSpec, SuggestChartsResponse } from '@/types/dataviz';
import DatasetPicker from '@/components/dataviz/DatasetPicker';
import { Skeleton } from '@/components/ui/skeleton';

function inferType(values: any[]): ColumnInfo['type'] {
  let num = 0, str = 0, dat = 0, bool = 0;
  const max = Math.min(values.length, 200);
  for (let i = 0; i < max; i++) {
    const v = values[i];
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'boolean') { bool++; continue; }
    if (typeof v === 'number' && Number.isFinite(v)) { num++; continue; }
    if (typeof v === 'string') {
      const t = v.trim().toLowerCase();
      if (t === 'true' || t === 'false') { bool++; continue; }
      const n = Number(v);
      if (Number.isFinite(n)) { num++; continue; }
      const d = Date.parse(v);
      if (Number.isFinite(d)) { dat++; continue; }
      str++;
      continue;
    }
    str++;
  }
  if (num >= dat && num >= bool && num >= str) return 'number';
  if (dat >= num && dat >= bool && dat >= str) return 'date';
  if (bool >= num && bool >= dat && bool >= str) return 'boolean';
  return 'string';
}

export default function DataVisualizationPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specs, setSpecs] = useState<ChartSpec[]>([]);
  const [datasetName, setDatasetName] = useState<string>('');
  const [aiMeta, setAiMeta] = useState<SuggestChartsResponse['meta']>();

  const columns: ColumnInfo[] = useMemo(() => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0] || {});
    const sampleValuesByKey: Record<string, any[]> = Object.fromEntries(
      keys.map(k => [k, rows.slice(0, Math.min(rows.length, 500)).map(r => r?.[k])])
    );
    return keys.map((k) => ({ name: k, type: inferType(sampleValuesByKey[k]) }));
  }, [rows]);

  const handleDatasetSelect = (data: Record<string, any>[], metadata: { id?: string; name: string; source: 'saved' | 'uploaded' }) => {
    setRows(data);
    setDatasetName(metadata?.name || 'Dataset');
    setSpecs([]);
    setError(null);
  };

  const requestSuggestions = async () => {
    if (!columns.length) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/dataviz/suggest-charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetName, columns, userGoal: 'explore correlations and key metrics', availableTypes: ['bar', 'line', 'scatter'] }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.charts) {
        throw new Error(payload?.error || 'Failed to get chart suggestions');
      }
      const charts = (payload.charts as ChartSpec[]).filter(
        (c) => c && (c.type === 'bar' || c.type === 'line' || c.type === 'scatter')
      );
      setSpecs(charts);
      setAiMeta(payload.meta);
    } catch (e: any) {
      setError(e?.message || 'Failed to suggest charts');
    } finally {
      setIsGenerating(false);
    }
  };

  // Pull forwarded specs/rows from sessionStorage when navigating from AI Chart Suggestions
  useEffect(() => {
    try {
      if (!specs.length && typeof window !== 'undefined') {
        const rawSpecs = sessionStorage.getItem('dv_specs_v1');
        const rawName = sessionStorage.getItem('dv_dataset_name_v1');
        const rawRows = sessionStorage.getItem('dv_rows_v1');
        if (rawSpecs && rawRows) {
          const parsedSpecs = JSON.parse(rawSpecs) as ChartSpec[];
          const parsedRows = JSON.parse(rawRows) as Record<string, any>[];
          const filteredSpecs = Array.isArray(parsedSpecs)
            ? parsedSpecs.filter((c) => c && (c.type === 'bar' || c.type === 'line' || c.type === 'scatter'))
            : [];
          setSpecs(filteredSpecs);
          setRows(Array.isArray(parsedRows) ? parsedRows : []);
          if (rawName) setDatasetName(rawName);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = rows.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Data Visualization
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRows([]); setSpecs([]); setError(null); }}>Reset</Button>
            <Button size="sm" onClick={requestSuggestions} disabled={!hasData || isGenerating}>
              {isGenerating ? (<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating…</span>) : (
                <span className="inline-flex items-center gap-2"><RefreshCcw className="h-4 w-4" /> Generate Suggestions</span>
              )}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Select a dataset, we send only headers to the backend to suggest charts, then render with Nivo.</p>
          {aiMeta?.aiUsed ? (
            <p className="mt-1">Suggestions generated by AI {aiMeta.model ? `(${aiMeta.model})` : ''}.</p>
          ) : null}
        </div>
      </div>

      {/* Dataset Picker (standalone, not reusing analysis UI) */}
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading dataset picker...</div>}>
        <DatasetPicker onChange={handleDatasetSelect} />
      </Suspense>

      {/* Empty State */}
      {!hasData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Database className="h-16 w-16 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No dataset selected</h3>
                <p className="text-muted-foreground max-w-md">Choose a saved dataset or upload a CSV to begin. Only headers are sent to AI.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading skeletons while generating */}
      {hasData && isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0,1,2].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      {hasData && specs.length > 0 && !isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {specs.map((spec) => (
            <Card key={spec.id} className="w-full">
              <CardHeader>
                <CardTitle className="text-base">{spec.title}</CardTitle>
                {spec.description ? (
                  <CardDescription>{spec.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <NivoChartRenderer spec={spec} rows={rows} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Helper when specs not generated */}
      {hasData && specs.length === 0 && !isGenerating && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Click "Generate Suggestions" to view charts.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
