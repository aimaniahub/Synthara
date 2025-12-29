'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import {
  BarChart3,
  Database,
  DatabaseZap,
  Brain,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { DatasetSelector } from './components/DatasetSelector';
import { StatisticalSummary } from './components/StatisticalSummary';

import { type AnalysisResult, type AnalysisProgress, analysisService } from '@/services/analysis-service';
import { AnalysisProgress as AnalysisProgressComponent } from './components/AnalysisProgress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const AIInsights = dynamic(() => import('./components/AIInsights').then(m => m.AIInsights), {
  ssr: false,
});

const ExportButton = dynamic(() => import('./components/ExportButton').then(m => m.ExportButton), {
  ssr: false,
});

export default function DataAnalysisPage() {
  const [selectedData, setSelectedData] = useState<Record<string, any>[]>([]);
  const [datasetMetadata, setDatasetMetadata] = useState<{ id?: string; name: string; source: 'saved' | 'uploaded' } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const analysisSectionRef = useRef<HTMLDivElement>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningMessage, setCleaningMessage] = useState<string | null>(null);
  const [cleaningError, setCleaningError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'profiling' | 'insights'>('overview');
  const CACHE_KEY = 'analysis_state_v1';
  const [cleanPreviewOpen, setCleanPreviewOpen] = useState(false);
  const [cleanedCandidate, setCleanedCandidate] = useState<Record<string, any>[]>([]);
  const [cleaningPlan, setCleaningPlan] = useState<any>(null);
  const [columnsInOrder, setColumnsInOrder] = useState<string[]>([]);
  const [diffSummary, setDiffSummary] = useState<{
    beforeRows: number;
    afterRows: number;
    dropped: number;
    changedCells: number;
    filledByCol: Record<string, number>;
    parsedNumbers: number;
    trimmedStrings: number;
  } | null>(null);
  const [isAppending, setIsAppending] = useState(false);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [appendSuccess, setAppendSuccess] = useState(false);
  const [cleaningSteps, setCleaningSteps] = useState<Array<{ label: string; status: 'pending' | 'running' | 'done' }>>([]);
  const [oldQuality, setOldQuality] = useState<number | null>(null);
  const [newQuality, setNewQuality] = useState<number | null>(null);
  const [cleaningSummaryText, setCleaningSummaryText] = useState<string | null>(null);
  const [columnCleaningSummaries, setColumnCleaningSummaries] = useState<Array<{ name: string; summary: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(CACHE_KEY) : null;
      if (raw) {
        const saved = JSON.parse(raw);
        setSelectedData(saved.selectedData || []);
        setDatasetMetadata(saved.datasetMetadata || null);
        setAnalysisResult(saved.analysisResult || null);
        setActiveTab(saved.activeTab || 'overview');
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ selectedData, datasetMetadata, analysisResult, activeTab });
      if (typeof window !== 'undefined') sessionStorage.setItem(CACHE_KEY, payload);
    } catch { }
  }, [selectedData, datasetMetadata, analysisResult, activeTab]);

  const handleResetPage = () => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem(CACHE_KEY);
    } catch { }
    setSelectedData([]);
    setDatasetMetadata(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisProgress(null);
    setActiveTab('overview');
  };

  const handleDatasetSelect = (data: Record<string, any>[], metadata: { id?: string; name: string; source: 'saved' | 'uploaded' }) => {
    setSelectedData(data);
    setDatasetMetadata(metadata);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisProgress(null);
    setActiveTab('overview');
  };

  const handleAnalysisStart = async () => {
    if (selectedData.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress({
      stage: 'structure',
      percentage: 0,
      message: 'Starting analysis...'
    });

    // Auto-scroll to analysis section
    setTimeout(() => {
      analysisSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);

    try {
      // Simulate progressive stages (visualization stage removed)
      const stages = [
        { stage: 'structure' as const, percentage: 25, message: 'Analyzing data structure and column types...' },
        { stage: 'statistics' as const, percentage: 50, message: 'Computing statistical measures and correlations...' },
        { stage: 'ai-insights' as const, percentage: 75, message: 'Creating AI-powered insights and recommendations...' }
      ];

      // Update progress through stages
      for (const stage of stages) {
        setAnalysisProgress(stage);
        await new Promise(resolve => setTimeout(resolve, 7000)); // Simulate processing time (7s per step)
      }

      // Use server-side API for analysis
      // Limit rows sent to server to prevent oversized request bodies while preserving representative sample
      const MAX_ANALYSIS_ROWS = 1000;
      const analysisRows = selectedData.slice(0, Math.min(MAX_ANALYSIS_ROWS, selectedData.length));

      const response = await fetch('/api/analyze-dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: analysisRows,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze dataset');
      }

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.analysis);
        setAnalysisProgress({
          stage: 'complete',
          percentage: 100,
          message: 'Analysis completed successfully!'
        });
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
      setAnalysisProgress(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasData = selectedData.length > 0;
  const hasAnalysis = analysisResult !== null;

  async function handleCleanFromProfiling() {
    if (!hasData || !analysisResult) return;
    setIsCleaning(true);
    setCleaningError(null);
    setCleaningMessage('Step 1/4: Preparing AI cleaning plan for your dataset...');
    setCleanPreviewOpen(true);
    setAppendError(null);
    setAppendSuccess(false);
    setCleanedCandidate([]);
    setColumnsInOrder([]);
    setDiffSummary(null);
    setOldQuality(analysisResult.profile.overallQuality);
    setNewQuality(null);
    setCleaningSummaryText(null);
    setColumnCleaningSummaries([]);
    setCleaningSteps([
      { label: 'Preparing cleaning plan', status: 'running' },
      { label: 'Cleaning dataset with AI', status: 'pending' },
      { label: 'Computing summary of fixes', status: 'pending' },
      { label: 'Recomputing data quality', status: 'pending' }
    ]);

    try {
      // Map analysis types to cleaning schema types
      const baseSchema = analysisResult.profile.columns.map(col => ({
        name: col.name,
        type: col.type === 'numeric' ? 'number' as const : 'string' as const,
      }));

      // Ensure schema is aware of a `source` column if it exists in the data but not in the profile
      const hasSourceInProfile = baseSchema.some(col => col.name === 'source');
      const hasSourceInRows = selectedData.some(row => Object.prototype.hasOwnProperty.call(row, 'source'));
      const schema = hasSourceInProfile || !hasSourceInRows
        ? baseSchema
        : [...baseSchema, { name: 'source', type: 'string' as const }];

      const userQuery = datasetMetadata?.name || 'Smart dataset cleaning';

      setCleaningMessage('Step 2/4: Applying AI cleaning rules to each row...');
      setCleaningSteps((s) => s.map((step, i) => i === 0 ? { ...step, status: 'done' } : i === 1 ? { ...step, status: 'running' } : step));
      const res = await fetch('/api/analysis/smart-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, rows: selectedData, userQuery })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success || !Array.isArray(payload.cleanedRows)) {
        throw new Error(payload?.error || 'Failed to clean dataset');
      }

      const cleanedRows: Record<string, any>[] = payload.cleanedRows;

      // Determine column order: start with analysis profile columns, then append any new ones (e.g., `source`)
      const profileColumns = analysisResult.profile.columns.map(c => c.name);
      const cleanedFirst = cleanedRows[0] || {};
      const cleanedKeys = Object.keys(cleanedFirst);
      // Only keep profile columns that are still present after cleaning, so
      // dropped columns (e.g. very sparse ones) do not appear in the preview.
      const profileExisting = profileColumns.filter((name) => cleanedKeys.includes(name));
      const extraColumns = cleanedKeys.filter(k => !profileColumns.includes(k));

      // Ensure `source` is appended last if present
      const profileWithoutSource = profileExisting.filter(c => c !== 'source');
      const extraWithoutSource = extraColumns.filter(k => k !== 'source');
      const hasSource = cleanedKeys.includes('source');
      const newColumnsInOrder = [
        ...profileWithoutSource,
        ...extraWithoutSource,
        ...(hasSource ? ['source'] : []),
      ];

      const before = selectedData;
      const after = cleanedRows;
      setCleaningSteps((s) => s.map((step, i) => i === 1 ? { ...step, status: 'done' } : i === 2 ? { ...step, status: 'running' } : step));
      const minLen = Math.min(before.length, after.length);
      let changedCells = 0;
      let parsedNumbers = 0;
      let trimmedStrings = 0;
      const filledByCol: Record<string, number> = Object.fromEntries(newColumnsInOrder.map(c => [c, 0]));
      for (let i = 0; i < minLen; i++) {
        const b = before[i] || {};
        const a = after[i] || {};
        for (const col of newColumnsInOrder) {
          const bv = b?.[col];
          const av = a?.[col];
          const bMissing = bv === null || bv === undefined || (typeof bv === 'string' && bv.trim() === '');
          if (bMissing && (av !== null && av !== undefined && !(typeof av === 'string' && av.trim() === ''))) {
            filledByCol[col] = (filledByCol[col] || 0) + 1;
          }
          if (bv !== av) {
            changedCells++;
            if (typeof bv === 'string' && typeof av === 'number') parsedNumbers++;
            if (typeof bv === 'string' && typeof av === 'string' && bv.trim() === av && bv !== av) trimmedStrings++;
          }
        }
      }
      setColumnsInOrder(newColumnsInOrder);
      setCleaningPlan(payload.plan || null);
      setCleanedCandidate(cleanedRows);
      const diff = {
        beforeRows: before.length,
        afterRows: after.length,
        dropped: Math.max(0, before.length - after.length),
        changedCells,
        filledByCol,
        parsedNumbers,
        trimmedStrings,
      };
      setDiffSummary(diff);
      setCleaningSteps((s) => s.map((step, i) => i === 2 ? { ...step, status: 'done' } : i === 3 ? { ...step, status: 'running' } : step));
      try {
        const newProfile = analysisService.analyzeDataset(cleanedRows).profile;
        setNewQuality(newProfile.overallQuality);

        const totalFilled = Object.values(diff.filledByCol).reduce((a, b) => a + b, 0);
        const columnsWithFills = Object.entries(diff.filledByCol).filter(([, count]) => (count as number) > 0);

        const headlineLines: string[] = [];
        headlineLines.push(
          `Rows: kept ${diff.afterRows} of ${diff.beforeRows} (${diff.dropped} dropped).`
        );
        if (totalFilled > 0) {
          headlineLines.push(
            `Missing values: filled ${totalFilled} cells across ${columnsWithFills.length} columns.`
          );
        }
        if (diff.parsedNumbers > 0) {
          headlineLines.push(
            `Type conversions: parsed ${diff.parsedNumbers} values from text into numbers.`
          );
        }
        if (diff.trimmedStrings > 0) {
          headlineLines.push(
            `String cleanup: trimmed whitespace in about ${diff.trimmedStrings} text cells.`
          );
        }
        headlineLines.push(
          `Data quality: ${analysisResult.profile.overallQuality.toFixed(1)}% → ${newProfile.overallQuality.toFixed(1)}%.`
        );
        if (payload.plan?.rationale) {
          headlineLines.push(`AI rationale: ${payload.plan.rationale}`);
        }
        setCleaningSummaryText(headlineLines.join('\n'));

        if (payload.plan && Array.isArray(payload.plan.columns)) {
          const topColumns = columnsWithFills
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 6)
            .map(([name, count]) => ({ name, count: count as number }));

          const perCol: Array<{ name: string; summary: string }> = [];
          for (const { name, count } of topColumns) {
            const planCol = (payload.plan as any).columns.find((c: any) => c.name === name);
            if (!planCol) continue;

            const parts: string[] = [];
            if (planCol.trim) parts.push('trimmed text');
            if (planCol.parseNumber) parts.push('parsed numbers from strings when possible');
            if (planCol.fillStrategy && planCol.fillStrategy !== 'none') {
              if (planCol.fillStrategy === 'constant') {
                const v = planCol.fillValue;
                parts.push(
                  v !== undefined && v !== null
                    ? `filled ${count} missing values with "${String(v)}"`
                    : `filled ${count} missing values with a constant value`
                );
              } else {
                parts.push(`filled ${count} missing values using ${planCol.fillStrategy}`);
              }
            } else if (count > 0) {
              parts.push(`filled ${count} missing values`);
            }
            if (Array.isArray(planCol.replace) && planCol.replace.length > 0) {
              parts.push(`normalized ${planCol.replace.length} value patterns`);
            }
            if (planCol.dropIfMissing) {
              parts.push('would drop rows that still have missing values here, but this plan preferred filling');
            }

            if (!parts.length) continue;
            perCol.push({ name, summary: parts.join('; ') });
          }

          setColumnCleaningSummaries(perCol);
        } else {
          setColumnCleaningSummaries([]);
        }
      } catch { }
      setCleaningSteps((s) => s.map((step, i) => i === 3 ? { ...step, status: 'done' } : step));
      setCleaningMessage(null);
    } catch (e: any) {
      setCleaningError(e?.message || 'Cleaning failed');
      setCleaningMessage(null);
    } finally {
      setIsCleaning(false);
    }
  }

  // Visually advance cleaning steps while long-running cleaning is in progress
  useEffect(() => {
    if (!isCleaning || cleanedCandidate.length > 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setCleaningSteps((steps) => {
        const runningIndex = steps.findIndex((step) => step.status === 'running');

        // If nothing is running or we're already on the last step, keep current state
        if (runningIndex === -1 || runningIndex >= steps.length - 1) {
          return steps;
        }

        return steps.map((step, index) => {
          if (index < runningIndex) {
            return { ...step, status: 'done' };
          }
          if (index === runningIndex + 1) {
            return { ...step, status: 'running' };
          }
          if (index === runningIndex) {
            return { ...step, status: 'done' };
          }
          return step;
        });
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isCleaning, cleanedCandidate.length]);

  function handleApplyCleanedToView() {
    if (!cleanedCandidate.length) return;
    setSelectedData(cleanedCandidate);
    (async () => {
      try {
        const MAX_ANALYSIS_ROWS = 1000;
        const analysisRows = cleanedCandidate.slice(0, Math.min(MAX_ANALYSIS_ROWS, cleanedCandidate.length));
        const response = await fetch('/api/analyze-dataset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: analysisRows }),
        });
        if (response.ok) {
          const result = await response.json().catch(() => null);
          if (result?.success && result.analysis) {
            setAnalysisResult(result.analysis);
          }
        }
      } catch { }
      setCleanPreviewOpen(false);
    })();
  }

  async function handleAppendAndSave() {
    if (!datasetMetadata?.id || !cleanedCandidate.length || !columnsInOrder.length) return;
    setIsAppending(true);
    setAppendError(null);
    setAppendSuccess(false);
    try {
      const appendRes = await fetch('/api/datasets/append-cleaned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: datasetMetadata.id, columns: columnsInOrder, rows: cleanedCandidate })
      });
      const appendPayload = await appendRes.json().catch(() => null);
      if (!appendRes.ok || !appendPayload?.success) {
        throw new Error(appendPayload?.error || 'Failed to append cleaned data');
      }
      setAppendSuccess(true);
      setSelectedData(cleanedCandidate);
      try {
        const MAX_ANALYSIS_ROWS = 1000;
        const analysisRows = cleanedCandidate.slice(0, Math.min(MAX_ANALYSIS_ROWS, cleanedCandidate.length));
        const response = await fetch('/api/analyze-dataset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: analysisRows }),
        });
        if (response.ok) {
          const result = await response.json().catch(() => null);
          if (result?.success && result.analysis) {
            setAnalysisResult(result.analysis);
          }
        }
      } catch { }
      if (oldQuality !== null && newQuality !== null) {
        toast({ title: 'Saved', description: `Cleaned data appended. Data quality improved from ${oldQuality.toFixed(1)}% to ${newQuality.toFixed(1)}%.` });
      } else {
        toast({ title: 'Saved', description: 'Cleaned data appended successfully.' });
      }
      setTimeout(() => setCleanPreviewOpen(false), 1200);
    } catch (err: any) {
      setAppendError(err?.message || 'Failed to append cleaned data');
      toast({ title: 'Append failed', description: err?.message || 'Failed to append cleaned data', variant: 'destructive' });
    } finally {
      setIsAppending(false);
    }
  }

  return (
    <div className="space-y-10 w-full max-w-[1600px] mx-auto pt-4 pb-12">
      <DatasetSelector
        onDatasetSelect={handleDatasetSelect}
        onAnalysisStart={handleAnalysisStart}
      />

      <div ref={analysisSectionRef} className="space-y-8">
        {analysisError && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/50 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
        )}

        {isAnalyzing && analysisProgress && (
          <AnalysisProgressComponent progress={analysisProgress} />
        )}

        {/* Results Area (Triggered only after analysis) */}
        {hasAnalysis && analysisResult && (
          <div className="animate-in fade-in zoom-in-95 duration-700 space-y-8">
            {/* Analysis Actions & Export */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CheckCircle className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Synthesis Complete</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">Full intelligence report generated for protocol execution.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {datasetMetadata && (
                  <ExportButton
                    datasetName={datasetMetadata.name}
                    profile={analysisResult.profile}
                    insights={analysisResult.aiInsights ?? { columnInsights: [], deepInsights: null }}
                    rawData={selectedData}
                    className="h-10 px-4 rounded-xl text-xs font-bold shadow-lg shadow-primary/10"
                  />
                )}
                <Button
                  variant="outline"
                  onClick={handleResetPage}
                  className="h-10 px-4 rounded-xl text-xs font-bold border-border/50"
                >
                  Reset
                </Button>
              </div>
            </div>

            <Tabs defaultValue="intelligence" className="w-full space-y-8">
              <div className="flex items-center justify-center">
                <TabsList className="bg-secondary/20 p-1 rounded-xl border border-border/30 h-11">
                  <TabsTrigger value="intelligence" className="rounded-lg px-6 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Intelligence
                  </TabsTrigger>
                  <TabsTrigger value="relationships" className="rounded-lg px-6 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Relationships
                  </TabsTrigger>
                  <TabsTrigger value="profiling" className="rounded-lg px-6 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Profiling
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Intelligence Tab */}
              <TabsContent value="intelligence" className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Metric Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Rows", value: analysisResult.profile.totalRows.toLocaleString(), icon: DatabaseZap, color: "text-blue-500" },
                    { label: "Total Columns", value: analysisResult.profile.totalColumns, icon: BarChart3, color: "text-emerald-500" },
                    { label: "Data Quality", value: `${analysisResult.profile.overallQuality.toFixed(1)}%`, icon: CheckCircle, color: "text-primary" },
                    { label: "Gaps Found", value: analysisResult.profile.missingDataPattern.length, icon: AlertTriangle, color: "text-orange-500" }
                  ].map((stat, i) => (
                    <div key={i} className="modern-card p-4 flex items-center justify-between group hover:border-primary/20 transition-all border-none shadow-sm">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{stat.label}</p>
                        <p className="text-xl font-black text-foreground tracking-tight">{stat.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg bg-secondary/50 ${stat.color} group-hover:scale-105 transition-transform`}>
                        <stat.icon className="size-4" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 ml-1">
                    <Sparkles className="size-3.5 text-primary" />
                    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Discovery Insights</h2>
                  </div>
                  <AIInsights
                    data={selectedData}
                    profile={analysisResult.profile}
                    aiInsights={analysisResult.aiInsights}
                    view="summary"
                    className="p-0 border-none shadow-none bg-transparent"
                  />
                </div>
              </TabsContent>

              {/* Relationships Tab */}
              <TabsContent value="relationships" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 ml-1">
                  <Brain className="size-3.5 text-blue-500" />
                  <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Network Analysis</h2>
                </div>
                <AIInsights
                  data={selectedData}
                  profile={analysisResult.profile}
                  aiInsights={analysisResult.aiInsights}
                  view="correlations"
                  className="p-0 border-none shadow-none bg-transparent"
                />
              </TabsContent>

              {/* Profiling Tab */}
              <TabsContent value="profiling" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between gap-2 ml-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-3.5 text-emerald-500" />
                    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Feature Distribution</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCleanFromProfiling}
                    disabled={isCleaning}
                    className="h-8 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5 border border-primary/10 shadow-sm"
                  >
                    {isCleaning ? <Loader2 className="size-3 animate-spin mr-2" /> : <Sparkles className="size-3 mr-2" />}
                    Optimize Schema
                  </Button>
                </div>
                <StatisticalSummary
                  profile={analysisResult.profile}
                  className="space-y-4"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <Dialog open={cleanPreviewOpen} onOpenChange={setCleanPreviewOpen}>
        <DialogContent className="max-w-4xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>Cleaned Dataset Preview</DialogTitle>
            <DialogDescription>Review fixes and choose how to apply them</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            {isCleaning && cleanedCandidate.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{cleaningMessage || 'Running Smart Fix on your dataset…'}</span>
                </div>
                {/* cleaning skeleton content */}
              </div>
            ) : diffSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Rows</div>
                  <div className="text-muted-foreground">
                    {diffSummary.afterRows} / {diffSummary.beforeRows}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Dropped rows</div>
                  <div className="text-muted-foreground">{diffSummary.dropped}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Changed cells</div>
                  <div className="text-muted-foreground">{diffSummary.changedCells}</div>
                </div>
                {/* diff summary content */}
              </div>
            )}
            {(!isCleaning && oldQuality !== null) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Quality before</div>
                  <div className="text-muted-foreground">{oldQuality?.toFixed(1)}%</div>
                </div>
                {newQuality !== null && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">Quality after</div>
                    <div className="text-muted-foreground">{newQuality.toFixed(1)}%</div>
                  </div>
                )}
                {/* quality comparison content */}
              </div>
            )}

            {!isCleaning && cleaningSummaryText && (
              <div className="border rounded-lg p-2.5 space-y-1.5 bg-background/40">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <FileText className="h-4 w-4" />
                  <span>Cleaning summary</span>
                </div>
                <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                  {cleaningSummaryText}
                </p>
              </div>
            )}
            {!isCleaning && columnCleaningSummaries.length > 0 && (
              <div className="border rounded-lg p-2.5 space-y-1.5 bg-background/40">
                <div className="text-[11px] font-medium text-muted-foreground">Top columns fixed</div>
                <div className="space-y-1 max-h-36 overflow-auto">
                  {columnCleaningSummaries.map((col) => (
                    <div key={col.name} className="flex flex-col text-[11px]">
                      <span className="font-semibold text-foreground truncate">{col.name}</span>
                      <span className="text-muted-foreground">{col.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {appendError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{appendError}</AlertDescription>
              </Alert>
            )}
            {appendSuccess && (
              <Alert>
                <AlertDescription>Cleaned data appended and view updated.</AlertDescription>
              </Alert>
            )}
            {cleaningError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cleaningError}</AlertDescription>
              </Alert>
            )}
            {!isCleaning && cleanedCandidate.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 text-xs sm:text-sm font-medium">Preview (first 10 rows)</div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {columnsInOrder.map((key) => (
                          <th key={key} className="px-2 py-1.5 text-left font-medium truncate max-w-32">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cleanedCandidate.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          {columnsInOrder.map((key) => (
                            <td key={key} className="px-2 py-1.5 truncate max-w-32">{row[key] === null || row[key] === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : (
                              String(row[key])
                            )}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full gap-2">
              <div className="text-xs text-muted-foreground">
                {diffSummary ? (
                  <span>Filled values in {Object.values(diffSummary.filledByCol).reduce((a, b) => a + b, 0)} cells</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setCleanPreviewOpen(false)}>Close</Button>
                <Button variant="secondary" onClick={handleApplyCleanedToView}>Apply to View</Button>
                <Button onClick={handleAppendAndSave} disabled={isAppending || !(datasetMetadata?.source === 'saved' && datasetMetadata?.id)}>
                  {isAppending ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Appending…</span>
                  ) : (
                    'Append and Save'
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}