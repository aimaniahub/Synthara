'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Loader2, RefreshCcw, Database } from 'lucide-react';
import { DatasetSelector } from '@/app/dashboard/analysis/components/DatasetSelector';
import type { ColumnInfo, ChartSpec, SuggestChartsResponse } from '@/types/dataviz';

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

export default function AIChartSuggestionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [datasetName, setDatasetName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
  };

  const generateAndGo = async () => {
    if (!columns.length) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/dataviz/suggest-charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetName, columns, userGoal: 'explore correlations and key metrics' }),
      });
      const payload = await res.json().catch(() => null) as SuggestChartsResponse | null;
      if (!res.ok || !payload?.charts) {
        throw new Error((payload as any)?.error || 'Failed to get chart suggestions');
      }

      // Persist to sessionStorage and navigate to visualization page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('dv_rows_v1', JSON.stringify(rows));
        sessionStorage.setItem('dv_specs_v1', JSON.stringify(payload.charts));
        sessionStorage.setItem('dv_dataset_name_v1', datasetName);
      }
      setAiMeta(payload.meta);
      router.push('/dashboard/datavisualization');
    } catch (e: any) {
      setError(e?.message || 'Failed to suggest charts');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasData = rows.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Chart Suggestions
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRows([]); setError(null); }}>Reset</Button>
            <Button size="sm" onClick={generateAndGo} disabled={!hasData || isGenerating}>
              {isGenerating ? (<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating…</span>) : (
                <span className="inline-flex items-center gap-2"><RefreshCcw className="h-4 w-4" /> Generate & Open Charts</span>
              )}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Pick a dataset. We send only the headers to the backend, ask OpenRouter to propose charts, then open the visualization page.</p>
        </div>
      </div>

      {/* Dataset Selector */}
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading dataset selector...</div>}>
        <DatasetSelector onDatasetSelect={handleDatasetSelect} onAnalysisStart={() => {}} hideAnalyzeButton />
      </Suspense>

      {/* Empty state */}
      {!hasData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Database className="h-16 w-16 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No Dataset Selected</h3>
                <p className="text-muted-foreground max-w-md">Choose a saved dataset or upload a CSV to begin.</p>
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

      {/* Loading skeletons */}
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
    </div>
  );
}
