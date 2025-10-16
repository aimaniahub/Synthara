/**
 * Visualization Orchestrator
 * Coordinates AI analysis with chart rendering and manages the visualization pipeline
 */

import { visualizationAIService } from '@/services/visualization-ai-service';
import { geminiService } from '@/services/gemini-service';
import { type DatasetProfile } from '@/services/analysis-service';
import { 
  type AIVisualizationRecommendation, 
  type VisualizationInsight, 
  type AIVisualizationAnalysis,
  type ChartType,
  type ChartConfig
} from '@/types/charts';
import { 
  CATEGORICAL_PALETTES, 
  SEQUENTIAL_PALETTES, 
  DIVERGING_PALETTES,
  CHART_COLOR_RECOMMENDATIONS,
  colorUtils 
} from '@/lib/visualization-colors';

export interface VisualizationOrchestratorInput {
  data: Record<string, any>[];
  profile: DatasetProfile;
  userQuery?: string;
  maxCharts?: number;
  layout?: 'grid' | 'dashboard' | 'story';
}

export interface ChartRenderData {
  id: string;
  chartType: ChartType;
  title: string;
  description: string;
  rationale: string;
  confidence: number;
  dataColumns: string[];
  colorScheme: string[];
  insightType: 'distribution' | 'correlation' | 'trend' | 'anomaly' | 'comparison' | 'pattern';
  config: ChartConfig;
  insights: VisualizationInsight[];
  data: any; // Chart-specific data
  priority: number;
}

export class VisualizationOrchestrator {
  /**
   * Orchestrate the complete visualization pipeline
   */
  async orchestrateVisualizations(input: VisualizationOrchestratorInput): Promise<{
    success: boolean;
    charts: ChartRenderData[];
    analysis: AIVisualizationAnalysis;
    error?: string;
  }> {
    try {
      // Step 1: AI Analysis
      const analysis = await visualizationAIService.analyzeVisualizationNeeds({
        data: input.data,
        profile: input.profile,
        userQuery: input.userQuery,
        maxCharts: input.maxCharts || 8
      });

      if (!analysis.recommendations || analysis.recommendations.length === 0) {
        return {
          success: false,
          charts: [],
          analysis,
          error: 'No visualization recommendations generated'
        };
      }

      // Step 2: Generate chart data and enhance with AI insights
      const charts = await this.generateChartData(analysis.recommendations, input.data, input.profile);

      // Step 3: Sort by priority and apply layout constraints
      const sortedCharts = this.sortAndFilterCharts(charts, input.maxCharts || 8);

      return {
        success: true,
        charts: sortedCharts,
        analysis
      };

    } catch (error) {
      console.error('[VisualizationOrchestrator] Orchestration failed:', error);
      return {
        success: false,
        charts: [],
        analysis: {
          recommendations: [],
          insights: [],
          dataCharacteristics: {
            hasTemporalData: false,
            hasCorrelations: false,
            hasOutliers: false,
            hasSeasonality: false,
            dataQuality: 0,
            complexity: 'low'
          },
          suggestedLayout: 'grid'
        },
        error: error instanceof Error ? error.message : 'Visualization orchestration failed'
      };
    }
  }

  /**
   * Generate chart data for each recommendation
   */
  private async generateChartData(
    recommendations: AIVisualizationRecommendation[],
    data: Record<string, any>[],
    profile: DatasetProfile
  ): Promise<ChartRenderData[]> {
    const charts: ChartRenderData[] = [];

    for (const recommendation of recommendations) {
      try {
        // Generate chart-specific data
        const chartData = this.generateChartSpecificData(recommendation, data, profile);
        
        // Enhance with AI insights for the specific chart
        const enhancedInsights = await this.generateChartInsights(recommendation, data, profile);
        
        // Apply color scheme
        const colorScheme = this.applyColorScheme(recommendation, chartData);

        charts.push({
          id: recommendation.id,
          chartType: recommendation.chartType,
          title: recommendation.title,
          description: recommendation.description,
          rationale: recommendation.rationale,
          confidence: recommendation.confidence,
          dataColumns: recommendation.dataColumns,
          colorScheme,
          insightType: recommendation.insightType,
          config: {
            ...recommendation.config,
            colors: colorScheme,
          },
          insights: enhancedInsights,
          data: chartData,
          priority: recommendation.priority
        });

      } catch (error) {
        console.error(`[VisualizationOrchestrator] Failed to generate chart ${recommendation.id}:`, error);
        // Continue with other charts
      }
    }

    return charts;
  }

  /**
   * Generate chart-specific data based on chart type
   */
  private generateChartSpecificData(
    recommendation: AIVisualizationRecommendation,
    data: Record<string, any>[],
    profile: DatasetProfile
  ): any {
    const { chartType, dataColumns } = recommendation;

    switch (chartType) {
      case 'bar':
        return this.generateBarChartData(data, dataColumns);
      
      case 'line':
        return this.generateLineChartData(data, dataColumns);
      
      case 'pie':
        return this.generatePieChartData(data, dataColumns);
      
      case 'scatter':
      case 'scatter-advanced':
        return this.generateScatterChartData(data, dataColumns);
      
      case 'histogram':
        return this.generateHistogramData(data, dataColumns);
      
      case 'boxplot':
        return this.generateBoxPlotData(data, dataColumns);
      
      case 'area':
        return this.generateAreaChartData(data, dataColumns);
      
      case 'timeseries':
        return this.generateTimeSeriesData(data, dataColumns);
      
      case 'heatmap':
        return this.generateHeatmapData(data, dataColumns, profile);
      
      case 'stacked-bar':
        return this.generateStackedBarData(data, dataColumns);
      
      case 'radar':
        return this.generateRadarData(data, dataColumns);
      
      case 'treemap':
        return this.generateTreemapData(data, dataColumns);
      
      case 'missing-data':
        return this.generateMissingDataChart(data, profile);
      
      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
  }

  /**
   * Generate bar chart data
   */
  private generateBarChartData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const valueCounts = new Map<any, number>();
    
    data.forEach(row => {
      const value = row[column];
      if (value !== null && value !== undefined && value !== '') {
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      }
    });

    const sortedEntries = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      series: [{
        data: sortedEntries.map(([, count]) => count),
        label: column,
      }],
      xAxis: {
        data: sortedEntries.map(([value]) => String(value)),
        scaleType: 'band' as const,
      }
    };
  }

  /**
   * Generate line chart data
   */
  private generateLineChartData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    return {
      series: [{
        data: values,
        label: column,
      }],
      xAxis: {
        data: values.map((_, index) => index),
        scaleType: 'linear' as const,
      }
    };
  }

  /**
   * Generate pie chart data
   */
  private generatePieChartData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const valueCounts = new Map<any, number>();
    
    data.forEach(row => {
      const value = row[column];
      if (value !== null && value !== undefined && value !== '') {
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      }
    });

    const sortedEntries = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      data: sortedEntries.map(([value, count], index) => ({
        id: index,
        label: String(value),
        value: count,
      }))
    };
  }

  /**
   * Generate scatter chart data
   */
  private generateScatterChartData(data: Record<string, any>[], columns: string[]) {
    const [xColumn, yColumn] = columns;
    const points = data
      .filter(row => 
        row[xColumn] !== null && row[xColumn] !== undefined && 
        row[yColumn] !== null && row[yColumn] !== undefined
      )
      .map(row => ({
        x: Number(row[xColumn]),
        y: Number(row[yColumn]),
        label: `${row[xColumn]}, ${row[yColumn]}`
      }));

    return {
      series: [{
        data: points,
        label: `${xColumn} vs ${yColumn}`,
        showTrendLine: true,
      }],
      xAxis: {
        label: xColumn,
        scaleType: 'linear' as const,
      },
      yAxis: {
        label: yColumn,
        scaleType: 'linear' as const,
      }
    };
  }

  /**
   * Generate histogram data
   */
  private generateHistogramData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const values = data
      .map(row => Number(row[column]))
      .filter(v => !isNaN(v));

    if (values.length === 0) return { bins: [], totalCount: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const bins = 10;
    const binWidth = (max - min) / bins;
    
    const histogramBins = Array.from({ length: bins }, (_, i) => {
      const start = min + i * binWidth;
      const end = min + (i + 1) * binWidth;
      const count = values.filter(v => v >= start && v < end).length;
      return { start, end, count };
    });

    return {
      bins: histogramBins,
      totalCount: values.length,
    };
  }

  /**
   * Generate box plot data
   */
  private generateBoxPlotData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const values = data
      .map(row => Number(row[column]))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };

    const n = values.length;
    const q1 = values[Math.floor(n * 0.25)];
    const median = values[Math.floor(n * 0.5)];
    const q3 = values[Math.floor(n * 0.75)];
    
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    
    const outliers = values.filter(v => v < lowerFence || v > upperFence);
    
    return {
      min: values[0],
      q1,
      median,
      q3,
      max: values[n - 1],
      outliers,
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
    };
  }

  /**
   * Generate area chart data
   */
  private generateAreaChartData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    return {
      series: [{
        data: values,
        label: column,
        fillOpacity: 0.3,
      }],
      xAxis: {
        data: values.map((_, index) => index),
        scaleType: 'linear' as const,
      }
    };
  }

  /**
   * Generate time series data
   */
  private generateTimeSeriesData(data: Record<string, any>[], columns: string[]) {
    const [timeColumn, valueColumn] = columns;
    const points = data
      .filter(row => 
        row[timeColumn] !== null && row[timeColumn] !== undefined && 
        row[valueColumn] !== null && row[valueColumn] !== undefined
      )
      .map(row => ({
        x: row[timeColumn],
        y: Number(row[valueColumn])
      }));

    return {
      series: [{
        data: points,
        label: valueColumn,
      }]
    };
  }

  /**
   * Generate heatmap data
   */
  private generateHeatmapData(data: Record<string, any>[], columns: string[], profile: DatasetProfile) {
    const numericColumns = profile.numericColumns.filter(col => columns.includes(col));
    if (numericColumns.length < 2) return { data: [], xLabels: [], yLabels: [], colorScale: { min: 0, max: 1, type: 'sequential' as const } };

    const matrix: Array<{ x: string; y: string; value: number }> = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = 0; j < numericColumns.length; j++) {
        if (i !== j) {
          const correlation = this.calculateCorrelation(
            data.map(row => Number(row[numericColumns[i]])).filter(n => !isNaN(n)),
            data.map(row => Number(row[numericColumns[j]])).filter(n => !isNaN(n))
          );
          matrix.push({
            x: numericColumns[i],
            y: numericColumns[j],
            value: correlation
          });
        }
      }
    }

    const values = matrix.map(item => item.value);
    return {
      data: matrix,
      xLabels: numericColumns,
      yLabels: numericColumns,
      colorScale: {
        min: Math.min(...values),
        max: Math.max(...values),
        type: 'diverging' as const
      }
    };
  }

  /**
   * Generate stacked bar data
   */
  private generateStackedBarData(data: Record<string, any>[], columns: string[]) {
    // Simplified implementation - would need more complex logic for real stacked bars
    return this.generateBarChartData(data, columns);
  }

  /**
   * Generate radar data
   */
  private generateRadarData(data: Record<string, any>[], columns: string[]) {
    const numericColumns = columns.filter(col => 
      data.every(row => typeof row[col] === 'number' || !isNaN(Number(row[col])))
    );

    if (numericColumns.length === 0) return { series: [] };

    const values = numericColumns.map(col => {
      const colValues = data.map(row => Number(row[col])).filter(n => !isNaN(n));
      return {
        value: colValues.reduce((sum, val) => sum + val, 0) / colValues.length,
        label: col
      };
    });

    return {
      series: [{
        data: values,
        label: 'Average Values'
      }]
    };
  }

  /**
   * Generate treemap data
   */
  private generateTreemapData(data: Record<string, any>[], columns: string[]) {
    const column = columns[0];
    const valueCounts = new Map<any, number>();
    
    data.forEach(row => {
      const value = row[column];
      if (value !== null && value !== undefined && value !== '') {
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      }
    });

    const sortedEntries = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      data: sortedEntries.map(([value, count], index) => ({
        id: `item-${index}`,
        value: count,
        label: String(value),
      }))
    };
  }

  /**
   * Generate missing data chart
   */
  private generateMissingDataChart(data: Record<string, any>[], profile: DatasetProfile) {
    return profile.missingDataPattern.map(item => ({
      column: item.column,
      missingCount: item.missingCount,
      missingPercentage: item.missingPercentage,
      totalCount: item.totalCount,
    }));
  }

  /**
   * Generate enhanced insights for a specific chart
   */
  private async generateChartInsights(
    recommendation: AIVisualizationRecommendation,
    data: Record<string, any>[],
    profile: DatasetProfile
  ): Promise<VisualizationInsight[]> {
    try {
      const result = await geminiService.generateChartInsights({
        chartType: recommendation.chartType,
        data: data.slice(0, 10), // Sample data for analysis
        columns: recommendation.dataColumns,
        userQuery: 'Generate insights for this visualization'
      });

      if (result.success && result.insights) {
        return result.insights.map(insight => ({
          type: 'trending-up' as const, // Default type
          message: insight,
          confidence: 0.8,
          severity: 'medium' as const,
          actionable: true
        }));
      }
    } catch (error) {
      console.error('[VisualizationOrchestrator] Failed to generate chart insights:', error);
    }

    // Fallback insights
    return [{
      type: 'trending-up',
      message: `Visualization shows ${recommendation.insightType} patterns`,
      confidence: 0.7,
      severity: 'low',
      actionable: false
    }];
  }

  /**
   * Apply appropriate color scheme to chart
   */
  private applyColorScheme(recommendation: AIVisualizationRecommendation, chartData: any): string[] {
    const { chartType, insightType } = recommendation;
    
    // Get color recommendations based on chart type and insight type
    const colorRecommendations = CHART_COLOR_RECOMMENDATIONS[chartType as keyof typeof CHART_COLOR_RECOMMENDATIONS];
    
    if (colorRecommendations) {
      if (typeof colorRecommendations === 'object' && 'single' in colorRecommendations) {
        return colorRecommendations.single;
      } else if (Array.isArray(colorRecommendations)) {
        return colorRecommendations;
      }
    }

    // Fallback based on insight type
    switch (insightType) {
      case 'correlation':
        return DIVERGING_PALETTES.blueRed;
      case 'distribution':
        return SEQUENTIAL_PALETTES.blue;
      case 'trend':
        return SEQUENTIAL_PALETTES.green;
      case 'anomaly':
        return SEQUENTIAL_PALETTES.red;
      default:
        return CATEGORICAL_PALETTES.primary;
    }
  }

  /**
   * Sort charts by priority and apply limits
   */
  private sortAndFilterCharts(charts: ChartRenderData[], maxCharts: number): ChartRenderData[] {
    return charts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxCharts);
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Export singleton instance
export const visualizationOrchestrator = new VisualizationOrchestrator();
