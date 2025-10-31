'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, Brain, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { ChartConfig, VisualizationInsight } from '@/types/charts';
import { CHART_SPACING } from '@/lib/chart-gradients';
import { cn } from '@/lib/utils';

interface ChartWrapperProps {
  children?: React.ReactNode;
  config?: ChartConfig;
  className?: string;
  loading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
  // AI enhancement props
  insights?: VisualizationInsight[];
  confidence?: number;
  rationale?: string;
  aiGenerated?: boolean;
  metrics?: string[];
}

export interface ChartWrapperRef {
  getElement: () => HTMLElement | null;
}

export const ChartWrapper = forwardRef<ChartWrapperRef, ChartWrapperProps>(({ 
  children,
  config = {},
  className = '',
  loading = false,
  error = null,
  title,
  description,
  insights = [],
  confidence,
  rationale,
  aiGenerated = false,
  metrics,
}, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    height = CHART_SPACING.heights.standard,
    width = '100%',
    responsive = true,
    margin = CHART_SPACING.margins.withAxis,
  } = config;

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getElement: () => wrapperRef.current,
  }), [loading, error]);

  if (loading) {
    return (
      <div
        className={cn(
          'w-full rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all',
          'p-6 space-y-3',
          className,
        )}
      >
        {title && (
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'w-full rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all',
          'p-6 space-y-3',
          className,
        )}
      >
        {title && (
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <Alert variant="destructive" className="mt-2" style={{ minHeight: height }}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get insight badge for the most important insight
  const primaryInsight = insights.find(insight => insight.severity === 'high') || insights[0];
  
  const getInsightIcon = (type: VisualizationInsight['type']) => {
    switch (type) {
      case 'strong-correlation': return <TrendingUp className="h-3 w-3" />;
      case 'outliers-detected': return <AlertTriangle className="h-3 w-3" />;
      case 'seasonal-pattern': return <TrendingUp className="h-3 w-3" />;
      case 'trending-up': return <TrendingUp className="h-3 w-3" />;
      case 'trending-down': return <TrendingUp className="h-3 w-3" />;
      case 'high-variance': return <AlertTriangle className="h-3 w-3" />;
      case 'low-quality': return <AlertCircle className="h-3 w-3" />;
      case 'anomaly': return <AlertTriangle className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const getInsightColor = (severity: VisualizationInsight['severity']) => {
    switch (severity) {
      case 'high':
      case 'medium':
      case 'low':
        return 'bg-muted text-foreground border';
      default:
        return 'bg-muted text-foreground border';
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'w-full rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5 overflow-hidden',
        className,
      )}
    >
      <div className="flex items-start justify-between border-b border-border/60 bg-muted/20 p-4 pb-2">
        <div className="flex-1">
          {title && (
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold leading-tight">{title}</h3>
              {aiGenerated && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Brain className="h-3 w-3" />
                        AI
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI-generated visualization</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          {description && (
            <p className="mb-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {primaryInsight && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn('flex items-center gap-1 border', getInsightColor(primaryInsight.severity))}
                  >
                    {getInsightIcon(primaryInsight.type)}
                    <span className="ml-1">{primaryInsight.message}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-1">
                    <p className="font-medium">{primaryInsight.message}</p>
                    {primaryInsight.recommendation && (
                      <p className="text-sm text-muted-foreground">
                        {primaryInsight.recommendation}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round(primaryInsight.confidence * 100)}%
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {confidence !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-1"
                  >
                    {Math.round(confidence * 100)}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI confidence score</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {metrics && metrics.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    Cols: {metrics.join(', ')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Columns used for this chart</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {rationale && (
        <div className="px-4 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="cursor-help text-xs text-muted-foreground underline decoration-dotted">
                  Why this visualization?
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{rationale}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div
        className="relative"
        style={{
          width: responsive ? '100%' : width,
          height,
          padding: '16px',
        }}
      >
        {children}
      </div>
    </div>
  );
});

ChartWrapper.displayName = 'ChartWrapper';

// Loading state component
export function ChartLoading({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full rounded-xl border border-border bg-card p-6 shadow-sm">
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

// Error state component
export function ChartError({ 
  error, 
  height = 300 
}: { 
  error: string; 
  height?: number;
}) {
  return (
    <div className="w-full rounded-xl border border-border bg-card p-6 shadow-sm">
      <Alert variant="destructive" style={{ minHeight: height }}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );
}
