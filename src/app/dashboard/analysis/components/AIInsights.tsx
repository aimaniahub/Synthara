'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Sparkles
} from 'lucide-react';
// AI analysis will be handled server-side through API
import { type DatasetProfile, type ColumnInsight, type DeepInsight } from '@/services/analysis-service';

interface AIInsightsProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  aiInsights?: {
    columnInsights: ColumnInsight[];
    deepInsights: DeepInsight | null;
  };
  className?: string;
  view?: 'summary' | 'correlations' | 'all';
}

export function AIInsights({ data, profile, aiInsights, className, view = 'all' }: AIInsightsProps) {
  // ... existing state ...
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showAllCorr, setShowAllCorr] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  // ... truncate function ...
  const MAX_LIST_ITEMS = 3;
  const TRUNCATE_CHARS = 180;

  const truncate = (text: string, max = TRUNCATE_CHARS) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);

    try {
      const response = await fetch('/api/analyze-dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data.slice(0, 100),
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze dataset');
      const result = await response.json();
      if (result.success && result.analysis.aiInsights) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      setRetryError('Failed to generate AI insights. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  const columnInsights = aiInsights?.columnInsights || [];
  const deepInsights = aiInsights?.deepInsights || null;

  if (!aiInsights) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/20 border border-border/30">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">Synthesizing intelligence scope...</span>
        </div>
      </div>
    );
  }

  if (retryError) {
    return (
      <div className={className}>
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{retryError}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} className="mt-4" variant="outline" disabled={isRetrying}>
          {isRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Retry Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-10 ${className}`}>
      {deepInsights && (
        <>
          {/* Intelligence Summary & Recommendations */}
          {(view === 'summary' || view === 'all') && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Intelligence Report</h3>
                </div>
                <p className="text-lg text-foreground font-black leading-relaxed tracking-tight">
                  {deepInsights.summary}
                </p>
              </div>

              {deepInsights.recommendations.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 ml-1">
                    <Lightbulb className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Actionable Protocols</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(showAllRecs ? deepInsights.recommendations : deepInsights.recommendations.slice(0, 6)).map((rec, index) => (
                      <div key={index} className="p-5 rounded-2xl bg-secondary/30 border border-border/50 text-sm font-bold flex gap-4 hover:border-primary/20 transition-all group shadow-sm items-start">
                        <div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black group-hover:bg-emerald-500 group-hover:text-white transition-colors">{index + 1}</div>
                        <span className="leading-snug pt-0.5">{rec}</span>
                      </div>
                    ))}
                  </div>
                  {deepInsights.recommendations.length > 6 && (
                    <Button variant="ghost" size="sm" className="w-full h-12 text-xs font-black hover:bg-secondary/50 rounded-xl uppercase tracking-widest border border-border/10" onClick={() => setShowAllRecs(v => !v)}>
                      {showAllRecs ? 'Close Archives' : `Retrieve ${deepInsights.recommendations.length - 6} More Protocols`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Correlations View */}
          {(view === 'correlations' || view === 'all') && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="space-y-6">
                <div className="flex items-center gap-2 ml-1">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Entity Relationships</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {deepInsights.correlations.length > 0 ? (
                    (showAllCorr ? deepInsights.correlations : deepInsights.correlations.slice(0, 6)).map((corr: any, index) => (
                      <div key={index} className="p-6 rounded-2xl bg-secondary/30 border border-border/50 space-y-4 hover:border-blue-500/20 transition-all group shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm uppercase tracking-tight truncate max-w-[180px]">
                            {corr.columnA} <span className="text-blue-500 mx-1.5">↔</span> {corr.columnB}
                          </span>
                          <Badge variant="secondary" className="text-[10px] uppercase font-black px-2 py-0.5 bg-blue-500/10 text-blue-600 border-none">
                            {corr.strength}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed font-bold group-hover:text-foreground transition-colors line-clamp-4">{corr.insight}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full p-12 rounded-2xl border border-dashed border-border/50 bg-secondary/10 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="size-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground/50">
                        <TrendingUp className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground uppercase tracking-tight">No Significant Patterns Detected</p>
                        <p className="text-xs text-muted-foreground font-medium max-w-sm">
                          The current data slice does not exhibit strong entity relationships or statistical correlations. Try analyzing a larger or different segment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {deepInsights.correlations.length > 6 && (
                  <Button variant="ghost" size="sm" className="w-full h-12 text-xs font-black hover:bg-secondary/50 rounded-xl uppercase tracking-widest border border-border/10" onClick={() => setShowAllCorr(v => !v)}>
                    {showAllCorr ? 'Close Correlations' : `Map ${deepInsights.correlations.length - 6} Hidden Patterns`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fallback Column Insights */}
      {view === 'all' && columnInsights.length > 0 && !deepInsights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {columnInsights.map((insight, idx) => (
            <div key={idx} className="p-6 rounded-2xl border border-border/50 bg-secondary/20 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm uppercase tracking-wider">{insight.column}</span>
                <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5">
                  {insight.dataQuality}% Health
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-black leading-relaxed">{insight.semanticMeaning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
