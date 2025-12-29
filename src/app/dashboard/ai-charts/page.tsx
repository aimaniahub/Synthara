'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Loader2, RefreshCcw, Database, Sparkles } from 'lucide-react';
import type { ColumnInfo, ChartSpec, SuggestChartsResponse } from '@/types/dataviz';

const DatasetSelector = dynamic(
  () => import('@/app/dashboard/analysis/components/DatasetSelector').then(m => m.DatasetSelector),
  { ssr: false }
);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="glass-modern p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden group">
        <div className="space-y-2 relative z-10 flex-1">
          <h1 className="text-3xl font-black text-foreground tracking-tighter leading-none">
            AI Chart <span className="text-gradient-primary">Suggestions</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Automatically generate optimized charts and insights from your dataset using AI analysis.
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <Button variant="outline" className="h-11 px-5 rounded-lg font-bold border-border/50 hover:bg-secondary/50 transition-all" onClick={() => { setRows([]); setError(null); }}>
            Reset
          </Button>
          <Button
            disabled={!hasData || isGenerating}
            onClick={generateAndGo}
            className="h-11 px-6 rounded-lg font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Analyzing...</span>
            ) : (
              <span className="flex items-center gap-2"><RefreshCcw className="size-4" /> Suggest Charts</span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Wing: Selection Rail */}
        <div className="xl:col-span-4 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Data Source</h2>
            <div className="glass-modern p-1 overflow-hidden">
              <Suspense fallback={<div className="p-8 text-center"><Loader2 className="size-8 animate-spin text-primary/30 mx-auto" /></div>}>
                <DatasetSelector onDatasetSelect={handleDatasetSelect} onAnalysisStart={() => { }} hideAnalyzeButton />
              </Suspense>
            </div>
          </div>

          <div className="glass-modern p-6 bg-primary/5 border-primary/20 space-y-4">
            <div className="flex items-center gap-3">
              <Brain className="size-4 text-primary" />
              <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">AI Strategy</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">
              AI prioritizes <span className="text-foreground font-bold">patterns</span> and <span className="text-foreground font-bold">correlations</span> to suggest the most impactful visualizations.
            </p>
          </div>
        </div>

        {/* Right Wing: Canvas */}
        <div className="xl:col-span-8 space-y-8">
          {!hasData && (
            <div className="glass-modern min-h-[400px] flex items-center justify-center bg-transparent border-dashed border-2 border-border/50">
              <div className="text-center space-y-6">
                <div className="size-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                  <Database className="size-8 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground tracking-tighter">Select a Dataset</h3>
                  <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                    Choose a dataset from the <span className="text-primary font-bold">Library</span> to start generating AI chart suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasData && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="glass-modern p-8 flex items-center justify-between overflow-hidden relative">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-xl bg-primary/10 text-primary">
                    <Database className="size-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Dataset Selected</p>
                    <h3 className="text-2xl font-black text-foreground tracking-tighter">{datasetName}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Rows</p>
                  <p className="text-2xl font-black text-primary tracking-tighter">{rows.length.toLocaleString()}</p>
                </div>
              </div>

              {isGenerating ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass-modern p-1 overflow-hidden">
                      <div className="h-48 bg-muted/20 animate-pulse flex items-center justify-center">
                        <RefreshCcw className="size-8 text-muted-foreground/10 animate-spin" />
                      </div>
                      <div className="p-6 space-y-4">
                        <Skeleton className="h-4 w-1/2 bg-muted/40" />
                        <Skeleton className="h-3 w-3/4 bg-muted/30" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-modern p-16 text-center border-dashed border-2 border-border/50">
                  <div className="max-w-md mx-auto space-y-8">
                    <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto transition-transform hover:scale-110">
                      <Sparkles className="size-10" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-2xl font-black text-foreground tracking-tighter">Ready to Visualize</h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        Data is loaded. Click <span className="text-foreground font-bold">Suggest Charts</span> to have AI design your dashboard automatically.
                      </p>
                    </div>
                    <Button size="lg" onClick={generateAndGo} className="h-14 px-10 rounded-2xl font-black bg-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-[1.05] active:scale-[0.95] transition-all">
                      Go to Visualization
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4">
              <div className="p-2 rounded-xl bg-destructive/20 text-destructive">
                <RefreshCcw className="size-5 rotate-45" />
              </div>
              <p className="text-sm font-bold text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
