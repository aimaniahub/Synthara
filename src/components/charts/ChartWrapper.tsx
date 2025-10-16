'use client';

import React, { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Alert, Skeleton, Typography } from '@mui/material';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, Loader2, Brain, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useMuiTheme } from '@/lib/mui-theme-adapter';
import { ChartConfig, VisualizationInsight } from '@/types/charts';

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

export function ChartWrapper({
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
}: ChartWrapperProps) {
  const muiTheme = useMuiTheme();
  const theme = useMemo(() => createTheme(muiTheme), [muiTheme]);

  const {
    height = 300,
    width = '100%',
    responsive = true,
    margin = { top: 20, right: 20, bottom: 20, left: 20 },
  } = config;

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
      <Box className={`w-full ${className}`}>
        {/* Header with AI insights */}
        <Box className="flex items-start justify-between mb-2">
          <Box className="flex-1">
            {title && (
              <Box className="flex items-center gap-2 mb-1">
                <Typography variant="h6" component="h3">
                  {title}
                </Typography>
                {aiGenerated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs">
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
              <Typography variant="body2" color="text.secondary" className="mb-2">
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
                      className={`text-xs ${getInsightColor(primaryInsight.severity)}`}
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
                    <Badge variant="outline" className="text-xs">
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
            '& .MuiCharts-root': {
              width: '100%',
              height: '100%',
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

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
