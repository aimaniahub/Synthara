'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Activity,
  AlertCircle,
  Brain,
  RefreshCw,
  Filter,
  Grid3X3,
  LayoutDashboard,
  BookOpen
} from 'lucide-react';
import { type DatasetProfile } from '@/services/analysis-service';
import { visualizationOrchestrator, type ChartRenderData } from '@/lib/visualization-orchestrator';
import {
  BarChart,
  PieChart,
  HistogramChart,
  BoxPlotChart,
  MissingDataChart,
  AreaChart,
  TimeSeriesChart,
  HeatmapChart,
  ScatterPlotAdvanced,
  StackedBarChart,
  RadarChart,
  TreemapChart,
  type ChartConfig,
} from '@/components/charts';

interface VisualizationPanelProps {
  data: Record<string, any>[];
  profile: DatasetProfile;
  className?: string;
  userQuery?: string;
}

export function VisualizationPanel({ data, profile, className, userQuery }: VisualizationPanelProps) {
  const [charts, setCharts] = useState<ChartRenderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<'grid' | 'dashboard' | 'story'>('grid');
  const [filter, setFilter] = useState<'all' | 'distribution' | 'correlation' | 'trend' | 'anomaly' | 'comparison' | 'pattern'>('all');

  // Generate AI-driven visualizations
  useEffect(() => {
    const generateVisualizations = async () => {
      if (!data.length || !profile.columns.length) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await visualizationOrchestrator.orchestrateVisualizations({
          data,
          profile,
          userQuery,
          maxCharts: 8,
          layout
        });

        if (result.success) {
          setCharts(result.charts);
          setLayout(result.analysis.suggestedLayout);
        } else {
          setError(result.error || 'Failed to generate visualizations');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Visualization generation failed');
      } finally {
        setIsLoading(false);
      }
    };

    generateVisualizations();
  }, [data, profile, userQuery, layout]);

  // Filter charts based on insight type
  const filteredCharts = charts.filter(chart => 
    filter === 'all' || chart.insightType === filter
  );

  // Group charts by insight type for better organization
  const groupedCharts = filteredCharts.reduce((groups, chart) => {
    const type = chart.insightType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(chart);
    return groups;
  }, {} as Record<string, ChartRenderData[]>);

  // Render chart component based on type
  const renderChart = (chart: ChartRenderData) => {
    const commonProps = {
      data: chart.data,
      config: chart.config,
      className: "w-full h-full",
      insights: chart.insights,
      confidence: chart.confidence,
      rationale: chart.rationale,
      aiGenerated: true,
    };

    switch (chart.chartType) {
      case 'bar':
        return <BarChart {...commonProps} />;
      case 'line':
        return <BarChart {...commonProps} />; // Using BarChart as fallback
      case 'pie':
        return <PieChart {...commonProps} />;
      case 'scatter':
      case 'scatter-advanced':
        return <ScatterPlotAdvanced {...commonProps} />;
      case 'histogram':
        return <HistogramChart {...commonProps} />;
      case 'boxplot':
        return <BoxPlotChart {...commonProps} />;
      case 'area':
        return <AreaChart {...commonProps} />;
      case 'timeseries':
        return <TimeSeriesChart {...commonProps} />;
      case 'heatmap':
        return <HeatmapChart {...commonProps} />;
      case 'stacked-bar':
        return <StackedBarChart {...commonProps} />;
      case 'radar':
        return <RadarChart {...commonProps} />;
      case 'treemap':
        return <TreemapChart {...commonProps} />;
      case 'missing-data':
        return <MissingDataChart {...commonProps} />;
      default:
        return <div className="flex items-center justify-center h-full text-muted-foreground">
          Unsupported chart type: {chart.chartType}
        </div>;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Visualizations
          </CardTitle>
          <CardDescription>
            AI is analyzing your data and generating optimal visualizations...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="text-lg">Generating visualizations...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visualizations
          </CardTitle>
          <CardDescription>
            Interactive charts and graphs for your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (filteredCharts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visualizations
          </CardTitle>
          <CardDescription>
            Interactive charts and graphs for your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No visualizations available for the selected filter. Try changing the filter or ensure your dataset has appropriate data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Data Visualizations
              </CardTitle>
              <CardDescription>
                Intelligent charts selected and generated by AI based on your data patterns
              </CardDescription>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Layout selector */}
              <div className="flex items-center gap-1">
                <Button
                  variant={layout === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'dashboard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout('dashboard')}
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'story' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout('story')}
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Filter selector */}
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-2 py-1 text-sm border rounded"
                >
                  <option value="all">All Types</option>
                  <option value="distribution">Distributions</option>
                  <option value="correlation">Correlations</option>
                  <option value="trend">Trends</option>
                  <option value="anomaly">Anomalies</option>
                  <option value="comparison">Comparisons</option>
                  <option value="pattern">Patterns</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Grouped charts by insight type */}
          {Object.entries(groupedCharts).map(([insightType, charts]) => (
            <div key={insightType} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="capitalize">
                  {insightType} Insights
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {charts.length} visualization{charts.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className={`grid gap-6 ${
                layout === 'dashboard' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' :
                layout === 'story' ? 'grid-cols-1' :
                'grid-cols-1 lg:grid-cols-2'
              }`}>
                {charts.map((chart) => (
                  <Card key={chart.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="h-80">
                        {renderChart(chart)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
