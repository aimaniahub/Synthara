'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  BookOpen,
  Star,
  Zap,
  Target
} from 'lucide-react';
import { type DatasetProfile } from '@/services/analysis-service';
import { visualizationOrchestrator, type ChartRenderData } from '@/lib/visualization-orchestrator';
import { CHART_SPACING } from '@/lib/chart-gradients';
const BarChart = dynamic(() => import('@/components/charts/BarChart').then(m => m.BarChart), { ssr: false });
const LineChart = dynamic(() => import('@/components/charts/LineChart').then(m => m.LineChart), { ssr: false });
const PieChart = dynamic(() => import('@/components/charts/PieChart').then(m => m.PieChart), { ssr: false });
const HistogramChart = dynamic(() => import('@/components/charts/HistogramChart').then(m => m.HistogramChart), { ssr: false });
const BoxPlotChart = dynamic(() => import('@/components/charts/BoxPlotChart').then(m => m.BoxPlotChart), { ssr: false });
const MissingDataChart = dynamic(() => import('@/components/charts/MissingDataChart').then(m => m.MissingDataChart), { ssr: false });
const AreaChart = dynamic(() => import('@/components/charts/AreaChart').then(m => m.AreaChart), { ssr: false });
const TimeSeriesChart = dynamic(() => import('@/components/charts/TimeSeriesChart').then(m => m.TimeSeriesChart), { ssr: false });
const HeatmapChart = dynamic(() => import('@/components/charts/HeatmapChart').then(m => m.HeatmapChart), { ssr: false });
const ScatterPlotAdvanced = dynamic(() => import('@/components/charts/ScatterPlotAdvanced').then(m => m.ScatterPlotAdvanced), { ssr: false });
const StackedBarChart = dynamic(() => import('@/components/charts/StackedBarChart').then(m => m.StackedBarChart), { ssr: false });
const RadarChart = dynamic(() => import('@/components/charts/RadarChart').then(m => m.RadarChart), { ssr: false });
const TreemapChart = dynamic(() => import('@/components/charts/TreemapChart').then(m => m.TreemapChart), { ssr: false });

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
  const [layout, setLayout] = useState<'grid' | 'dashboard' | 'story'>('dashboard');
  const [filter, setFilter] = useState<'all' | 'distribution' | 'correlation' | 'trend' | 'anomaly' | 'comparison' | 'pattern'>('all');
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // Generate AI-driven visualizations
  useEffect(() => {
    const generateVisualizations = async () => {
      if (!data.length || !profile.columns.length) return;

      setIsLoading(true);
      setError(null);

      try {
        const numericCount = profile.numericColumns.length;
        const categoricalCount = profile.categoricalColumns.length;
        const totalCols = profile.totalColumns;
        const computedMaxCharts = totalCols <= 5 ? 4 : totalCols <= 10 ? 6 : 8;
        const result = await visualizationOrchestrator.orchestrateVisualizations({
          data,
          profile,
          userQuery,
          maxCharts: computedMaxCharts,
          layout
        });

        if (result.success) {
          setCharts(result.charts);
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

  // Sort charts by confidence and priority for hero chart selection
  const sortedCharts = filteredCharts.sort((a, b) => {
    // Primary sort by confidence
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Secondary sort by insight type priority
    const typePriority = {
      'trend': 5,
      'correlation': 4,
      'distribution': 3,
      'anomaly': 2,
      'comparison': 1,
      'pattern': 0
    };
    return (typePriority[b.insightType as keyof typeof typePriority] || 0) - 
           (typePriority[a.insightType as keyof typeof typePriority] || 0);
  });

  // Select hero chart (most important)
  const heroChart = sortedCharts.length > 0 ? sortedCharts[0] : null;
  const supportingCharts = sortedCharts.slice(1);

  // Group supporting charts by insight type for better organization
  const groupedCharts = supportingCharts.reduce((groups, chart) => {
    const type = chart.insightType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(chart);
    return groups;
  }, {} as Record<string, ChartRenderData[]>);

  // Render chart component based on type
  const renderChart = (chart: ChartRenderData, isHero: boolean = false) => {
    const heroHeight = layout === 'dashboard' ? CHART_SPACING.heights.standard : CHART_SPACING.heights.hero;
    const itemHeight = layout === 'dashboard' ? CHART_SPACING.heights.compact : CHART_SPACING.heights.standard;

    const commonProps = {
      data: chart.data,
      config: {
        ...chart.config,
        height: isHero ? heroHeight : itemHeight,
        title: chart.config.title || `${chart.insightType.charAt(0).toUpperCase() + chart.insightType.slice(1)} Analysis`,
        description: chart.config.description || `AI-generated ${chart.insightType} visualization`,
      },
      className: "w-full h-full",
      insights: chart.insights,
      confidence: chart.confidence,
      rationale: chart.rationale,
      aiGenerated: true,
      metrics: chart.dataColumns,
    };

    const startEditing = () => {
      setEditing(prev => ({ ...prev, [chart.id]: true }));
      setSelections(prev => ({ ...prev, [chart.id]: chart.dataColumns }));
    };
    const cancelEditing = () => setEditing(prev => ({ ...prev, [chart.id]: false }));

    const applySelection = async () => {
      const cols = selections[chart.id] || chart.dataColumns;
      try {
        const newData = visualizationOrchestrator.generateChartDataFor(chart.chartType, cols, data, profile);
        setCharts(prev => prev.map(c => c.id === chart.id ? {
          ...c,
          data: newData,
          dataColumns: cols,
          config: {
            ...c.config,
            xAxisLabel: chart.chartType === 'scatter' || chart.chartType === 'scatter-advanced' || chart.chartType === 'timeseries' ? cols[0] : c.config.xAxisLabel || cols[0],
            yAxisLabel: chart.chartType === 'scatter' || chart.chartType === 'scatter-advanced' || chart.chartType === 'timeseries' ? cols[1] : c.config.yAxisLabel,
          }
        } : c));
      } finally {
        cancelEditing();
      }
    };

    const renderOverrideUI = () => {
      const numeric = profile.numericColumns;
      const categorical = profile.categoricalColumns;
      const dateCols = profile.columns.filter(c => c.type === 'date').map(c => c.name);
      const selected = selections[chart.id] || chart.dataColumns;

      const setSel = (idx: number, val: string) => {
        const next = [...(selected || [])];
        next[idx] = val;
        setSelections(prev => ({ ...prev, [chart.id]: next }));
      };

      switch (chart.chartType) {
        case 'histogram':
        case 'line':
        case 'area':
        case 'bar':
        case 'treemap': {
          const options = chart.chartType === 'histogram' || chart.chartType === 'line' || chart.chartType === 'area' ? numeric : categorical;
          return (
            <div className="flex items-center gap-2">
              <label className="text-sm">Column</label>
              <select className="border rounded px-2 py-1 text-sm" value={selected[0] || ''} onChange={e => setSel(0, e.target.value)}>
                <option value="" disabled>Select column</option>
                {options.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <Button size="sm" onClick={applySelection}>Apply</Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancel</Button>
            </div>
          );
        }
        case 'scatter':
        case 'scatter-advanced': {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">X</label>
              <select className="border rounded px-2 py-1 text-sm" value={selected[0] || ''} onChange={e => setSel(0, e.target.value)}>
                <option value="" disabled>Select X</option>
                {numeric.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <label className="text-sm">Y</label>
              <select className="border rounded px-2 py-1 text-sm" value={selected[1] || ''} onChange={e => setSel(1, e.target.value)}>
                <option value="" disabled>Select Y</option>
                {numeric.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <Button size="sm" onClick={applySelection}>Apply</Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancel</Button>
            </div>
          );
        }
        case 'timeseries': {
          return (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">Time</label>
              <select className="border rounded px-2 py-1 text-sm" value={selected[0] || ''} onChange={e => setSel(0, e.target.value)}>
                <option value="" disabled>Select time</option>
                {dateCols.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <label className="text-sm">Value</label>
              <select className="border rounded px-2 py-1 text-sm" value={selected[1] || ''} onChange={e => setSel(1, e.target.value)}>
                <option value="" disabled>Select value</option>
                {numeric.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <Button size="sm" onClick={applySelection}>Apply</Button>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancel</Button>
            </div>
          );
        }
        default:
          return null;
      }
    };

    const chartNode = (() => {
      switch (chart.chartType) {
        case 'bar':
          return <BarChart {...commonProps} />;
        case 'line':
          return <LineChart {...commonProps} />;
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
    })();

    return (
      <div className="space-y-2">
        {chartNode}
        {!isHero && (
          <div className="flex items-center justify-between px-2">
            <div className="text-xs text-muted-foreground">Metrics: {chart.dataColumns.join(', ')}</div>
            <div className="flex items-center gap-2">
              {['bar','pie','histogram','line','area','scatter','scatter-advanced','timeseries','treemap'].includes(chart.chartType) && (
                editing[chart.id]
                  ? renderOverrideUI()
                  : <Button size="sm" variant="outline" onClick={startEditing}>Edit metrics</Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
        <CardContent className="space-y-6">
          {/* Hero Chart Section */}
          {heroChart && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Key Insight</h3>
                </div>
                <Badge variant="outline" className="capitalize">
                  {heroChart.insightType} Analysis
                </Badge>
                <Badge variant="outline">
                  {Math.round(heroChart.confidence * 100)}% Confidence
                </Badge>
              </div>
              
              <div className="relative">
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm">Primary Insight</span>
                  </div>
                </div>
                {renderChart(heroChart, true)}
              </div>
            </div>
          )}

          {/* Supporting Charts Section */}
          {Object.keys(groupedCharts).length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Supporting Insights</h3>
              </div>
              
              {Object.entries(groupedCharts).map(([insightType, charts]) => (
                <div key={insightType} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {insightType} Insights
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {charts.length} visualization{charts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className={`grid gap-6 ${
                    layout === 'dashboard' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' :
                    layout === 'story' ? 'grid-cols-1' :
                    'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  }`}>
                    {charts.map((chart) => (
                      <div key={chart.id} className="group">
                        {renderChart(chart)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
