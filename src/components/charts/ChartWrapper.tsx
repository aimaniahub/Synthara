'use client';

import React, { useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Alert, Skeleton, Typography } from '@mui/material';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, Loader2, Brain, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useMuiTheme } from '@/lib/mui-theme-adapter';
import { ChartConfig, VisualizationInsight } from '@/types/charts';
import { CHART_SPACING, HIGHLIGHT_CONFIG } from '@/lib/chart-gradients';

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
}, ref) => {
  const muiTheme = useMuiTheme();
  const theme = useMemo(() => createTheme(muiTheme), [muiTheme]);
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
      <Box className={`w-full ${className}`}>
        {title && (
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {description}
          </Typography>
        )}
        <Skeleton
          variant="rectangular"
          width="100%"
          height={height}
          sx={{ borderRadius: 2 }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={`w-full ${className}`}>
        {title && (
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {description}
          </Typography>
        )}
        <Alert 
          severity="error" 
          icon={<AlertCircle className="h-4 w-4" />}
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: '1rem',
            }
          }}
        >
          {error}
        </Alert>
      </Box>
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
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box 
        ref={wrapperRef}
        className={`w-full ${className}`}
        sx={{
          borderRadius: CHART_SPACING.borderRadius.card,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          overflow: 'hidden',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-1px)',
          }
        }}
      >
        {/* Header with AI insights */}
        <Box 
          className="flex items-start justify-between p-4 pb-2"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.default',
          }}
        >
          <Box className="flex-1">
            {title && (
              <Box className="flex items-center gap-2 mb-1">
                <Typography 
                  variant="h6" 
                  component="h3"
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    lineHeight: 1.4,
                  }}
                >
                  {title}
                </Typography>
                {aiGenerated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-1"
                          sx={{
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            border: 'none',
                            fontWeight: 500,
                          }}
                        >
                          <Brain className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>AI-generated visualization</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Box>
            )}
            {description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                className="mb-2"
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                }}
              >
                {description}
              </Typography>
            )}
          </Box>
          
          {/* AI Insights and Confidence */}
          <Box className="flex items-center gap-2">
            {primaryInsight && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-1 ${getInsightColor(primaryInsight.severity)}`}
                      sx={{
                        fontWeight: 500,
                        border: '1px solid',
                        borderColor: primaryInsight.severity === 'high' ? 'error.main' : 
                                   primaryInsight.severity === 'medium' ? 'warning.main' : 'info.main',
                      }}
                    >
                      {getInsightIcon(primaryInsight.type)}
                      <span className="ml-1">{primaryInsight.message}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-medium">{primaryInsight.message}</p>
                      {primaryInsight.recommendation && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {primaryInsight.recommendation}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
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
                      sx={{
                        backgroundColor: 'secondary.main',
                        color: 'secondary.contrastText',
                        border: 'none',
                        fontWeight: 500,
                      }}
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
          </Box>
        </Box>

        {/* Rationale tooltip */}
        {rationale && (
          <Box className="mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    className="cursor-help underline decoration-dotted"
                  >
                    Why this visualization?
                  </Typography>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{rationale}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Box>
        )}

        <Box
          sx={{
            width: responsive ? '100%' : width,
            height: height,
            margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
            position: 'relative',
            padding: '16px',
            '& .MuiCharts-root': {
              width: '100%',
              height: '100%',
            },
            '& .MuiChartsAxis-root': {
              '& .MuiChartsAxis-tick': {
                fontSize: '0.75rem',
                fill: 'text.secondary',
              },
              '& .MuiChartsAxis-tickLabel': {
                fontSize: '0.75rem',
                fill: 'text.secondary',
              },
            },
            '& .MuiChartsLegend-root': {
              '& .MuiChartsLegend-series': {
                fontSize: '0.75rem',
              },
            },
            '& .MuiChartsTooltip-root': {
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: CHART_SPACING.borderRadius.element,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
});

ChartWrapper.displayName = 'ChartWrapper';

// Loading state component
export function ChartLoading({ height = 300 }: { height?: number }) {
  return (
    <Box className="w-full">
      <Skeleton
        variant="rectangular"
        width="100%"
        height={height}
        sx={{ borderRadius: 2 }}
      />
    </Box>
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
    <Box className="w-full">
      <Alert 
        severity="error" 
        icon={<AlertCircle className="h-4 w-4" />}
        sx={{ 
          borderRadius: 2,
          minHeight: height,
          display: 'flex',
          alignItems: 'center',
          '& .MuiAlert-icon': {
            fontSize: '1rem',
          }
        }}
      >
        {error}
      </Alert>
    </Box>
  );
}
