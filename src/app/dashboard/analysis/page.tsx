'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  BarChart3, 
  Database, 
  Brain, 
  FileText,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { DatasetSelector } from './components/DatasetSelector';
import { StatisticalSummary } from './components/StatisticalSummary';

import { AIInsights } from './components/AIInsights';
import { ExportButton } from './components/ExportButton';
import { type AnalysisResult, type AnalysisProgress, analysisService } from '@/services/analysis-service';
import { AnalysisProgress as AnalysisProgressComponent } from './components/AnalysisProgress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ selectedData, datasetMetadata, analysisResult, activeTab });
      if (typeof window !== 'undefined') sessionStorage.setItem(CACHE_KEY, payload);
    } catch {}
  }, [selectedData, datasetMetadata, analysisResult, activeTab]);

  const handleResetPage = () => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem(CACHE_KEY);
    } catch {}
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
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
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
      const extraColumns = cleanedKeys.filter(k => !profileColumns.includes(k));

      // Ensure `source` is appended last if present
      const profileWithoutSource = profileColumns.filter(c => c !== 'source');
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
      } catch {}
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
      } catch {}
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
      } catch {}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Data Analysis
          </h1>
          <div className="flex items-center gap-2">
            {analysisResult && datasetMetadata && (
              <ExportButton
                datasetName={datasetMetadata.name}
                profile={analysisResult.profile}
                insights={analysisResult.aiInsights ?? { columnInsights: [], deepInsights: null }}
                rawData={selectedData}
                className="hidden sm:inline-flex"
              />
            )}
            <Button variant="outline" size="sm" onClick={handleResetPage}>
              Reset
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Upload or choose a dataset, then run automated profiling and AI insights.</span>
        </div>
      </div>

      <DatasetSelector
        onDatasetSelect={handleDatasetSelect}
        onAnalysisStart={handleAnalysisStart}
      />

      <div ref={analysisSectionRef} className="space-y-4">
        {analysisError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
        )}

        {isAnalyzing && analysisProgress && (
          <AnalysisProgressComponent progress={analysisProgress} />
        )}

        {hasData && !isAnalyzing && !hasAnalysis && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Click "Analyze Dataset" in the selector above to start profiling.
            </CardContent>
          </Card>
        )}

        {hasAnalysis && analysisResult && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'overview' | 'profiling' | 'insights')}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profiling">Profiling</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Dataset Overview
                  </CardTitle>
                  <CardDescription>
                    Automatic summary of structure and quality for {datasetMetadata?.name || 'your dataset'}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticalSummary profile={analysisResult.profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profiling">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Data Profiling
                    </CardTitle>
                    <CardDescription>
                      Detailed column statistics and quality checks. Use Smart Fix to auto-clean common issues.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCleanFromProfiling}
                    disabled={isCleaning || !hasAnalysis || !hasData}
                  >
                    {isCleaning ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cleaning…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Smart Fix (AI Clean)
                      </span>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <StatisticalSummary profile={analysisResult.profile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights">
              <AIInsights
                data={selectedData}
                profile={analysisResult.profile}
                aiInsights={analysisResult.aiInsights}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={cleanPreviewOpen} onOpenChange={setCleanPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cleaned Dataset Preview</DialogTitle>
            <DialogDescription>Review fixes and choose how to apply them</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isCleaning && cleanedCandidate.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{cleaningMessage || 'Running Smart Fix on your dataset…'}</span>
                </div>
                {/* cleaning skeleton content */}
              </div>
            ) : diffSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-sm">
                  <div className="font-medium">Rows</div>
                  <div className="text-muted-foreground">
                    {diffSummary.afterRows} / {diffSummary.beforeRows}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Dropped rows</div>
                  <div className="text-muted-foreground">{diffSummary.dropped}</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Changed cells</div>
                  <div className="text-muted-foreground">{diffSummary.changedCells}</div>
                </div>
                {/* diff summary content */}
              </div>
            )}
            {(!isCleaning && oldQuality !== null) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-sm">
                  <div className="font-medium">Quality before</div>
                  <div className="text-muted-foreground">{oldQuality?.toFixed(1)}%</div>
                </div>
                {newQuality !== null && (
                  <div className="text-sm">
                    <div className="font-medium">Quality after</div>
                    <div className="text-muted-foreground">{newQuality.toFixed(1)}%</div>
                  </div>
                )}
                {/* quality comparison content */}
              </div>
            )}

            {!isCleaning && cleaningSummaryText && (
              <div className="border rounded-lg p-3 space-y-2 bg-background/40">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  <span>Cleaning summary</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {cleaningSummaryText}
                </p>
              </div>
            )}
            {!isCleaning && columnCleaningSummaries.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-background/40">
                <div className="text-xs font-medium text-muted-foreground">Top columns fixed</div>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {columnCleaningSummaries.map((col) => (
                    <div key={col.name} className="flex flex-col text-xs">
                      <span className="font-semibold text-foreground">{col.name}</span>
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
                <div className="bg-muted px-4 py-2 text-sm font-medium">Preview (first 10 rows)</div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {columnsInOrder.map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium truncate max-w-32">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cleanedCandidate.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          {columnsInOrder.map((key) => (
                            <td key={key} className="px-3 py-2 truncate max-w-32">{row[key] === null || row[key] === undefined ? (
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
    </div>
  );
}