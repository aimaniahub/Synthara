'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { DatasetSelector } from './components/DatasetSelector';
import { StatisticalSummary } from './components/StatisticalSummary';

import { AIInsights } from './components/AIInsights';
import { ExportButton } from './components/ExportButton';
import { type AnalysisResult, type AnalysisProgress } from '@/services/analysis-service';
import { AnalysisProgress as AnalysisProgressComponent } from './components/AnalysisProgress';

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
    setCleaningMessage('Preparing cleaning plan...');

    try {
      // Map analysis types to cleaning schema types
      const schema = analysisResult.profile.columns.map(col => ({
        name: col.name,
        type: col.type === 'numeric' ? 'number' as const : 'string' as const,
      }));

      setCleaningMessage('Cleaning dataset with AI...');
      const res = await fetch('/api/train/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, rows: selectedData })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success || !Array.isArray(payload.cleanedRows)) {
        throw new Error(payload?.error || 'Failed to clean dataset');
      }

      const cleanedRows: Record<string, any>[] = payload.cleanedRows;
      const columnsInOrder = analysisResult.profile.columns.map(c => c.name);

      // Update current view to cleaned rows
      setSelectedData(cleanedRows);
      setCleaningMessage('Appending cleaned rows to saved dataset...');

      if (datasetMetadata?.source === 'saved' && datasetMetadata?.id) {
        const appendRes = await fetch('/api/datasets/append-cleaned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datasetId: datasetMetadata.id, columns: columnsInOrder, rows: cleanedRows })
        });
        const appendPayload = await appendRes.json().catch(() => null);
        if (!appendRes.ok || !appendPayload?.success) {
          throw new Error(appendPayload?.error || 'Failed to append cleaned data');
        }
      }

      setCleaningMessage('Cleaning completed. You can re-run analysis for updated insights.');
    } catch (e: any) {
      setCleaningError(e?.message || 'Cleaning failed');
      setCleaningMessage(null);
    } finally {
      setIsCleaning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Data Analysis
          </h1>
          <Button variant="outline" size="sm" onClick={handleResetPage}>Reset</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Analyze your datasets with AI-powered insights
        </p>
      </div>

      {/* Dataset Selection */}
      <DatasetSelector
        onDatasetSelect={handleDatasetSelect}
        onAnalysisStart={handleAnalysisStart}
      />

      {/* Analysis Results */}
      {hasData && (
        <div ref={analysisSectionRef} className="space-y-6">
          {/* Analysis Progress */}
          {isAnalyzing && analysisProgress && (
            <AnalysisProgressComponent progress={analysisProgress} />
          )}

          {/* Analysis Status (fallback) */}
          {isAnalyzing && !analysisProgress && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Analyzing dataset...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Error */}
          {analysisError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {analysisError}
              </AlertDescription>
            </Alert>
          )}

          {/* Analysis Results Tabs */}
          {hasAnalysis && analysisResult && (
            <div className="space-y-4">
              {/* Export Button */}
              <div className="flex justify-end">
                <ExportButton
                  datasetName={datasetMetadata?.name || 'Unknown Dataset'}
                  profile={analysisResult.profile}
                  insights={{
                    columnInsights: [],
                    deepInsights: analysisResult.insights
                  }}
                  rawData={selectedData}
                />
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="profiling" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Profiling
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Insights
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <StatisticalSummary profile={analysisResult.profile} />
                </TabsContent>

                <TabsContent value="profiling" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Data Profiling
                      </CardTitle>
                      <CardDescription>
                        Detailed analysis of data types, missing values, and quality metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Cleaning recommendation */}
                        {analysisResult.profile.overallQuality < 95 || analysisResult.profile.missingDataPattern.length > 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {isCleaning ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>{cleaningMessage || 'Cleaning in progress...'}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div>
                                    Data quality can be improved. We detected missing or inconsistent values.
                                    {cleaningError ? (
                                      <div className="text-destructive mt-1 text-sm">{cleaningError}</div>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        ) : null}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-foreground">
                              {analysisResult.profile.numericColumns.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Numeric Columns</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-foreground">
                              {analysisResult.profile.categoricalColumns.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Categorical Columns</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-foreground">
                              {analysisResult.profile.missingDataPattern.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Missing Data Columns</div>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-foreground">
                              {analysisResult.profile.overallQuality.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Data Quality</div>
                          </div>
                        </div>

                        {/* Column Details Table */}
                        <div className="space-y-2">
                          <h4 className="font-medium">Column Details</h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left">Column</th>
                                  <th className="px-4 py-2 text-left">Type</th>
                                  <th className="px-4 py-2 text-left">Count</th>
                                  <th className="px-4 py-2 text-left">Missing</th>
                                  <th className="px-4 py-2 text-left">Unique</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisResult.profile.columns.map((col, index) => (
                                  <tr key={index} className="border-t">
                                    <td className="px-4 py-2 font-medium">{col.name}</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-1 rounded text-xs bg-muted text-foreground`}>
                                        {col.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">{col.count.toLocaleString()}</td>
                                    <td className="px-4 py-2">
                                      <span className={'text-muted-foreground'}>
                                        {col.missingPercentage.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">{col.unique.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="space-y-6">
                  <AIInsights 
                    data={selectedData} 
                    profile={analysisResult.profile}
                    aiInsights={analysisResult.aiInsights}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* No Analysis Yet */}
          {hasData && !hasAnalysis && !isAnalyzing && !analysisError && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-lg font-medium">Ready to Analyze</p>
                  <p className="text-muted-foreground">
                    Click "Analyze Dataset" to start the analysis process
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No Data Selected */}
      {!hasData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Database className="h-16 w-16 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No Dataset Selected</h3>
                <p className="text-muted-foreground max-w-md">
                  Select a saved dataset or upload a CSV file to begin your analysis. 
                  Our AI will provide insights, visualizations, and recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}