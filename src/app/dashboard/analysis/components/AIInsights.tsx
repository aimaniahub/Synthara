'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle,
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
}

export function AIInsights({ data, profile, aiInsights, className }: AIInsightsProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [showAllCorr, setShowAllCorr] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  const MAX_LIST_ITEMS = 3;
  const MAX_COLUMN_ITEMS = 6;
  const TRUNCATE_CHARS = 180;

  const truncate = (text: string, max = TRUNCATE_CHARS) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);

    try {
      // Call the server-side API for AI analysis
      const response = await fetch('/api/analyze-dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data.slice(0, 100), // Send first 100 rows for analysis
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze dataset');
      }

      const result = await response.json();
      
      if (result.success && result.analysis.aiInsights) {
        // Update parent component with new insights
        // This would require a callback prop to update the parent state
        window.location.reload(); // Simple fallback for now
      }

    } catch (error) {
      console.error('Error generating AI insights:', error);
      setRetryError('Failed to generate AI insights. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  const getQualityColor = (quality: number) => {
    return 'text-foreground';
  };

  const getQualityBadgeVariant = (quality: number): "default" | "secondary" | "destructive" | "outline" => {
    if (quality >= 80) return 'default';
    if (quality >= 60) return 'secondary';
    return 'destructive';
  };

  // Use passed-in insights or show loading/error states
  const columnInsights = aiInsights?.columnInsights || [];
  const deepInsights = aiInsights?.deepInsights || null;

  if (!aiInsights) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
          <CardDescription>
            AI insights are being generated...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating insights...</span>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (retryError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{retryError}</AlertDescription>
          </Alert>
          <Button 
            onClick={handleRetry} 
            className="mt-4"
            variant="outline"
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Summary and Next Steps */}
      {deepInsights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Summary
              </CardTitle>
              <CardDescription>Key takeaways</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{truncate(deepInsights.summary || '')}</p>
            </CardContent>
          </Card>
          {deepInsights.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  What to do next
                </CardTitle>
                <CardDescription>Top actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(showAllRecs ? deepInsights.recommendations : deepInsights.recommendations.slice(0, MAX_LIST_ITEMS)).map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{truncate(recommendation)}</span>
                    </li>
                  ))}
                </ul>
                {deepInsights.recommendations.length > MAX_LIST_ITEMS && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAllRecs(v => !v)}>
                    {showAllRecs ? 'Show less' : 'Show more'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Column Insights (concise) */}
      {columnInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Column Insights
            </CardTitle>
            <CardDescription>Short notes per column</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(showAllColumns ? columnInsights : columnInsights.slice(0, MAX_COLUMN_ITEMS)).map((insight, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{insight.column}</h4>
                  <Badge variant={getQualityBadgeVariant(insight.dataQuality)}>{insight.dataQuality}% quality</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{truncate(insight.semanticMeaning)}</p>
                {index < columnInsights.length - 1 && <Separator />}
              </div>
            ))}
            {columnInsights.length > MAX_COLUMN_ITEMS && (
              <Button variant="outline" size="sm" onClick={() => setShowAllColumns(v => !v)}>
                {showAllColumns ? 'Show less' : 'Show more'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Correlations (concise) */}
      {deepInsights && deepInsights.correlations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Correlations
            </CardTitle>
            <CardDescription>Important relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(showAllCorr ? deepInsights.correlations : deepInsights.correlations.slice(0, MAX_LIST_ITEMS)).map((correlation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{truncate(correlation)}</span>
                </li>
              ))}
            </ul>
            {deepInsights.correlations.length > MAX_LIST_ITEMS && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAllCorr(v => !v)}>
                {showAllCorr ? 'Show less' : 'Show more'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* No insights available */}
      {columnInsights.length === 0 && !deepInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis
            </CardTitle>
            <CardDescription>AI-powered insights and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No AI insights available. This might be due to insufficient data or API configuration issues.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
