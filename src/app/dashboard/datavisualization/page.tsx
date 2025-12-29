"use client";

import React, { useMemo, useState, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  TrendingUp,
  Settings,
  ArrowUpRight,
  Database,
  Sparkles,
  Loader2
} from "lucide-react";
import type { ColumnInfo, ChartSpec, SuggestChartsResponse } from "@/types/dataviz";

const MLInsightBadge = dynamic(
  () => import("@/components/dataviz/MLInsightBadge").then(m => m.MLInsightBadge),
  { ssr: false }
);

const NivoChartRenderer = dynamic(
  () => import("@/components/dataviz/NivoChartRenderer"),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

const DatasetPicker = dynamic(
  () => import("@/components/dataviz/DatasetPicker"),
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

export default function DataVisualizationPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specs, setSpecs] = useState<ChartSpec[]>([]);
  const [datasetName, setDatasetName] = useState<string>('');
  const [datasetMeta, setDatasetMeta] = useState<{ id?: string; name: string; source: 'saved' | 'uploaded' } | null>(null);
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
    setDatasetMeta(metadata);
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
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasData = rows.length > 0;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-10 animate-in fade-in duration-700">
      {/* Interactive Selection Card */}
      <Card className="modern-card border-none shadow-sm overflow-hidden bg-background/20 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 items-end">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Intelligence Source</Label>
            <Suspense fallback={<div className="p-4 text-xs text-muted-foreground italic flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> Sequencing source...</div>}>
              <DatasetPicker onChange={handleDatasetSelect} hidePreview />
            </Suspense>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Generator Mode</Label>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 h-12 text-xs font-black uppercase tracking-widest rounded-xl border border-primary/20 bg-primary/5 text-primary">
                <Sparkles className="size-4 mr-2" /> AI Suggested
              </Button>
              <Button variant="ghost" className="flex-1 h-12 text-xs font-black uppercase tracking-widest rounded-xl text-muted-foreground hover:bg-muted/50" disabled>
                <Settings className="size-4 mr-2" /> Manual Forge
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={requestSuggestions}
              disabled={!hasData || isGenerating}
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.1em] text-xs bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isGenerating ? <Loader2 className="size-4 animate-spin mr-2" /> : <TrendingUp className="size-4 mr-2" />}
              {isGenerating ? "Synthesizing..." : "Generate Canvas"}
            </Button>
          </div>
        </div>
      </Card>

      {rows.length > 0 && !specs.length && (
        <Card className="modern-card border-none shadow-sm overflow-hidden bg-background/20 backdrop-blur-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Dataset Logic Probe</h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                {datasetMeta?.source === 'saved' ? 'Saved' : 'Uploaded'} · {rows.length} Rows · {Object.keys(rows[0] || {}).length} Columns
              </Badge>
            </div>
            <div className="overflow-x-auto border border-border/10 rounded-xl bg-muted/5">
              <table className="w-full text-[10px] technical-font">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/20">
                    {Object.keys(rows[0] || {}).map(k => (
                      <th key={k} className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground/60">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="hover:bg-primary/5 transition-colors">
                      {Object.keys(rows[0] || {}).map(k => (
                        <td key={k} className="px-4 py-3 font-medium text-foreground/80 truncate max-w-xs">{String(r[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center">
              <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Viewing restricted sequence · 10 of {rows.length} rows</p>
            </div>
          </div>
        </Card>
      )}

      {aiMeta?.aiUsed && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Synthesis Report Active</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground font-bold italic uppercase tracking-tight">
            Synthesized by <span className="text-foreground">{aiMeta.model || "Core AI"}</span>
          </p>
        </div>
      )}

      {/* Immersive Canvas: Chart Visualization Stage */}
      <div className="space-y-10">
        {error && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/50 bg-destructive/5 px-6 py-4">
            <AlertDescription className="text-xs font-bold tracking-tight">{error}</AlertDescription>
          </Alert>
        )}

        {!hasData && (
          <div className="flex flex-col items-center justify-center p-20 bg-muted/5 rounded-3xl border border-dashed border-border/20">
            <Database className="size-10 text-muted-foreground/20 mb-4" />
            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Connect Intelligence Source to Begin</h3>
          </div>
        )}

        {hasData && isGenerating && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass-modern p-8 space-y-6 h-[500px]">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40 bg-muted/60" />
                  <Skeleton className="h-6 w-20 rounded-full bg-muted/40" />
                </div>
                <Skeleton className="h-[350px] w-full rounded-3xl bg-muted/20" />
              </div>
            ))}
          </div>
        )}

        {hasData && specs.length > 0 && !isGenerating && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {specs.map((spec) => (
              <div key={spec.id} className="group relative flex flex-col h-full">
                {/* Advanced ML Insight Badge - Floating or Dedicated Top Slot */}
                {spec.mlInsight && (
                  <div className="mb-6 animate-in slide-in-from-left-4 duration-700 delay-300">
                    <MLInsightBadge insight={spec.mlInsight} />
                  </div>
                )}

                <div className="flex-1 modern-card border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col bg-background/40 backdrop-blur-xl group-hover:bg-background/60 transition-all duration-700">
                  <div className="px-8 py-6 border-b border-border/5 flex items-center justify-between bg-muted/5 group-hover:bg-muted/10 transition-colors">
                    <div className="space-y-1.5">
                      <h3 className="font-black text-lg text-foreground tracking-tight uppercase group-hover:text-primary transition-colors duration-500">{spec.title}</h3>
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{spec.type} ANALYTICS SEQUENCE</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <Button size="icon" variant="ghost" className="rounded-xl size-10 hover:bg-primary/10 hover:text-primary transition-all">
                        <ArrowUpRight className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="rounded-xl size-10 hover:bg-primary/10 hover:text-primary transition-all">
                        <Settings className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-8 sm:p-12 flex-1 flex flex-col">
                    <div className="h-[450px] w-full bg-transparent relative">
                      {/* Decorative background for the chart area */}
                      <div className="absolute inset-0 bg-primary/[0.02] rounded-3xl -m-4 blur-3xl pointer-events-none" />
                      <NivoChartRenderer spec={spec} rows={rows} />
                    </div>

                    {spec.description && (
                      <div className="mt-10 p-6 rounded-2xl bg-secondary/20 border border-border/5 relative overflow-hidden group-hover:border-primary/10 transition-all duration-700">
                        <p className="text-[11px] text-muted-foreground font-bold leading-relaxed italic relative z-10 group-hover:text-foreground/80 transition-colors">
                          PROBE DESCRIPTION: {spec.description}
                        </p>
                        <Sparkles className="absolute -right-4 -bottom-4 size-16 text-primary/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasData && specs.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center p-12 opacity-50">
            <TrendingUp className="size-8 text-muted-foreground/20 mb-3" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Ready for Synthesis • Click Generate Canvas to Begin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
