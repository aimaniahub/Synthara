/**
 * AI Visualization Intelligence Service
 * Analyzes datasets and recommends optimal chart types with rationale
 */

import { geminiService } from './gemini-service';
import { type DatasetProfile } from './analysis-service';
import { 
  type AIVisualizationRecommendation, 
  type VisualizationInsight, 
  type AIVisualizationAnalysis,
  type ChartType 
} from '@/types/charts';
import { 
  CATEGORICAL_PALETTES, 
  SEQUENTIAL_PALETTES, 
  DIVERGING_PALETTES,
  SEMANTIC_COLORS,
  CHART_COLOR_RECOMMENDATIONS,
  colorUtils 
} from '@/lib/visualization-colors';

export interface VisualizationAnalysisInput {
  data: Record<string, any>[];
  profile: DatasetProfile;
  userQuery?: string;
  maxCharts?: number;
}

export class VisualizationAIService {
  /**
   * Analyze dataset and generate visualization recommendations
   */
  async analyzeVisualizationNeeds(input: VisualizationAnalysisInput): Promise<AIVisualizationAnalysis> {
    const { data, profile, userQuery, maxCharts = 8 } = input;

    try {
      // Analyze data characteristics
      const characteristics = this.analyzeDataCharacteristics(data, profile);
      
      // Generate AI recommendations
      const recommendations = await this.generateChartRecommendations(data, profile, characteristics, userQuery, maxCharts);
      
      // Generate insights
      const insights = this.generateVisualizationInsights(profile, characteristics);
      
      // Determine layout
      const suggestedLayout = this.determineLayout(recommendations, characteristics);

      return {
        recommendations,
        insights,
        dataCharacteristics: characteristics,
        suggestedLayout
      };
    } catch (error) {
      console.error('[VisualizationAI] Analysis failed:', error);
      return this.getFallbackAnalysis(data, profile);
    }
  }

  /**
   * Analyze data characteristics for visualization decisions
   */
  private analyzeDataCharacteristics(data: Record<string, any>[], profile: DatasetProfile) {
    const numericColumns = profile.columns.filter(col => col.type === 'numeric');
    const categoricalColumns = profile.columns.filter(col => col.type === 'categorical');
    
    // Check for temporal data
    const hasTemporalData = this.detectTemporalData(data, profile);
    
    // Check for correlations
    const hasCorrelations = this.detectCorrelations(profile);
    
    // Check for outliers
    const hasOutliers = numericColumns.some(col => col.outliers && col.outliers.length > 0);
    
    // Check for seasonality (simplified)
    const hasSeasonality = hasTemporalData && this.detectSeasonality(data, profile);
    
    // Calculate data quality
    const dataQuality = profile.overallQuality;
    
    // Determine complexity
    const complexity = this.determineComplexity(profile);

    return {
      hasTemporalData,
      hasCorrelations,
      hasOutliers,
      hasSeasonality,
      dataQuality,
      complexity
    };
  }

  /**
   * Detect temporal data patterns
   */
  private detectTemporalData(data: Record<string, any>[], profile: DatasetProfile): boolean {
    const dateColumns = profile.columns.filter(col => col.type === 'date');
    if (dateColumns.length > 0) return true;

    // Check for numeric columns that might be time series
    const numericColumns = profile.columns.filter(col => col.type === 'numeric');
    for (const col of numericColumns) {
      const values = data.map(row => row[col.name]).filter(v => v !== null && v !== undefined);
      if (values.length > 10) {
        // Check if values are sequential (potential time series)
        const sortedValues = [...values].sort((a, b) => a - b);
        const isSequential = sortedValues.every((val, i) => 
          i === 0 || val - sortedValues[i - 1] <= (sortedValues[sortedValues.length - 1] - sortedValues[0]) / 10
        );
        if (isSequential) return true;
      }
    }

    return false;
  }

  /**
   * Detect correlation patterns
   */
  private detectCorrelations(profile: DatasetProfile): boolean {
    if (!profile.correlationMatrix || profile.numericColumns.length < 2) return false;
    
    // Check for strong correlations (|r| > 0.5)
    for (let i = 0; i < profile.correlationMatrix.length; i++) {
      for (let j = i + 1; j < profile.correlationMatrix[i].length; j++) {
        const correlation = Math.abs(profile.correlationMatrix[i][j]);
        if (correlation > 0.5) return true;
      }
    }
    
    return false;
  }

  /**
   * Detect seasonality patterns (simplified)
   */
  private detectSeasonality(data: Record<string, any>[], profile: DatasetProfile): boolean {
    // This is a simplified check - in production, use proper seasonality detection
    const numericColumns = profile.columns.filter(col => col.type === 'numeric');
    if (numericColumns.length === 0) return false;

    // Check if data has enough points for seasonality analysis
    return data.length > 12; // Minimum for monthly seasonality
  }

  /**
   * Determine data complexity
   */
  private determineComplexity(profile: DatasetProfile): 'low' | 'medium' | 'high' {
    const totalColumns = profile.totalColumns;
    const numericColumns = profile.numericColumns.length;
    const categoricalColumns = profile.categoricalColumns.length;
    const dataQuality = profile.overallQuality;

    let complexity = 0;
    
    // Column count factor
    if (totalColumns > 20) complexity += 2;
    else if (totalColumns > 10) complexity += 1;
    
    // Data type diversity
    if (numericColumns > 5 && categoricalColumns > 5) complexity += 2;
    else if (numericColumns > 3 || categoricalColumns > 3) complexity += 1;
    
    // Data quality factor
    if (dataQuality < 70) complexity += 2;
    else if (dataQuality < 85) complexity += 1;

    if (complexity >= 4) return 'high';
    if (complexity >= 2) return 'medium';
    return 'low';
  }

  /**
   * Generate chart recommendations using AI
   */
  private async generateChartRecommendations(
    data: Record<string, any>[],
    profile: DatasetProfile,
    characteristics: any,
    userQuery?: string,
    maxCharts: number = 8
  ): Promise<AIVisualizationRecommendation[]> {
    try {
      // Use Gemini to analyze and recommend charts
      const analysisResult = await geminiService.analyzeVisualizationNeeds({
        data,
        profile,
        characteristics,
        userQuery,
        maxCharts
      });

      if (analysisResult.success && analysisResult.recommendations) {
        return analysisResult.recommendations;
      }
    } catch (error) {
      console.error('[VisualizationAI] Gemini analysis failed:', error);
    }

    // Fallback to rule-based recommendations
    return this.generateRuleBasedRecommendations(data, profile, characteristics, maxCharts);
  }

  /**
   * Generate rule-based chart recommendations
   */
  private generateRuleBasedRecommendations(
    data: Record<string, any>[],
    profile: DatasetProfile,
    characteristics: any,
    maxCharts: number
  ): AIVisualizationRecommendation[] {
    const recommendations: AIVisualizationRecommendation[] = [];
    let chartId = 0;

    const dateColumns = profile.columns.filter(col => col.type === 'date').map(c => c.name);
    // 1. Distribution charts for numeric columns
    const numericColumns = profile.columns.filter(col => col.type === 'numeric');
    for (const col of numericColumns.slice(0, 3)) {
      if (recommendations.length >= maxCharts) break;
      
      recommendations.push({
        id: `dist-${chartId++}`,
        chartType: 'histogram',
        title: `${col.name} Distribution Analysis`,
        description: `Shows the distribution pattern of ${col.name} values`,
        rationale: `Numeric column with ${col.count} values, mean: ${col.mean?.toFixed(2)}, std: ${col.std?.toFixed(2)}`,
        priority: 8,
        confidence: 0.9,
        dataColumns: [col.name],
        colorScheme: SEQUENTIAL_PALETTES.blue,
        insightType: 'distribution',
        config: {
          title: `${col.name} Distribution`,
          height: 300,
          showLegend: false,
          showTooltip: true,
          showGrid: true,
          xAxisLabel: col.name,
          yAxisLabel: 'Count',
        }
      });
    }

    // 2. Categorical frequency charts
    const categoricalColumns = profile.columns.filter(col => col.type === 'categorical');
    for (const col of categoricalColumns.slice(0, 2)) {
      if (recommendations.length >= maxCharts) break;
      
      const uniqueCount = col.unique || 0;
      // Skip overly granular categories
      if (uniqueCount > 50) continue;
      const chartType: ChartType = uniqueCount <= 8 ? 'pie' : 'bar';
      
      recommendations.push({
        id: `cat-${chartId++}`,
        chartType,
        title: `${col.name} Category Breakdown`,
        description: `Distribution of ${col.name} categories`,
        rationale: `Categorical column with ${uniqueCount} unique values`,
        priority: 7,
        confidence: 0.85,
        dataColumns: [col.name],
        colorScheme: CATEGORICAL_PALETTES.primary,
        insightType: 'distribution',
        config: {
          title: `${col.name} Categories`,
          height: 300,
          showLegend: true,
          showTooltip: true,
          xAxisLabel: chartType === 'bar' ? col.name : undefined,
          yAxisLabel: chartType === 'bar' ? 'Count' : undefined,
        }
      });
    }

    // 2b. Time series if temporal data exists
    if (characteristics.hasTemporalData && dateColumns.length > 0 && numericColumns.length > 0) {
      // pick first date column and a numeric column with highest variance
      const timeCol = dateColumns[0];
      const numericWithStats = numericColumns
        .map(c => ({ name: c.name, std: c.std ?? 0, mean: c.mean ?? 0 }))
        .sort((a, b) => (b.std || 0) - (a.std || 0));
      const valueCol = (numericWithStats[0]?.name) || numericColumns[0].name;
      if (recommendations.length < maxCharts) {
        recommendations.push({
          id: `ts-${chartId++}`,
          chartType: 'timeseries',
          title: `${valueCol} over Time`,
          description: `Trend of ${valueCol} by ${timeCol}`,
          rationale: `Temporal data detected with numeric variable ${valueCol}`,
          priority: 9,
          confidence: 0.85,
          dataColumns: [timeCol, valueCol],
          colorScheme: SEQUENTIAL_PALETTES.green,
          insightType: 'trend',
          config: {
            title: `${valueCol} over Time`,
            height: 340,
            showLegend: false,
            showTooltip: true,
            xAxisLabel: timeCol,
            yAxisLabel: valueCol,
          }
        });
      }
    }

    // 3. Correlation heatmap if multiple numeric columns
    if (characteristics.hasCorrelations && numericColumns.length >= 2) {
      if (recommendations.length < maxCharts) {
        recommendations.push({
          id: `corr-${chartId++}`,
          chartType: 'heatmap',
          title: 'Variable Correlation Matrix',
          description: 'Shows relationships between numeric variables',
          rationale: `Strong correlations detected between ${numericColumns.length} numeric variables`,
          priority: 9,
          confidence: 0.8,
          dataColumns: numericColumns.map(col => col.name),
          colorScheme: DIVERGING_PALETTES.blueRed,
          insightType: 'correlation',
          config: {
            title: 'Correlation Heatmap',
            height: 400,
            showLegend: true,
            showTooltip: true,
            xAxisLabel: 'Variables',
            yAxisLabel: 'Variables',
          }
        });
      }
    }

    // 4. Scatter plot for strongest correlation pair
    if (characteristics.hasCorrelations && numericColumns.length >= 2) {
      const strongestPair = this.findStrongestCorrelationPair(profile);
      if (strongestPair && recommendations.length < maxCharts) {
        recommendations.push({
          id: `scatter-${chartId++}`,
          chartType: 'scatter-advanced',
          title: `${strongestPair.x} vs ${strongestPair.y} Relationship`,
          description: `Scatter plot showing correlation between ${strongestPair.x} and ${strongestPair.y}`,
          rationale: `Strong correlation (r=${strongestPair.correlation.toFixed(2)}) between these variables`,
          priority: 8,
          confidence: 0.85,
          dataColumns: [strongestPair.x, strongestPair.y],
          colorScheme: CATEGORICAL_PALETTES.primary,
          insightType: 'correlation',
          config: {
            title: `${strongestPair.x} vs ${strongestPair.y}`,
            height: 300,
            showLegend: false,
            showTooltip: true,
            showGrid: true,
            xAxisLabel: strongestPair.x,
            yAxisLabel: strongestPair.y,
          }
        });
      }
    }

    // 5. Missing data visualization
    if (profile.missingDataPattern.length > 0) {
      if (recommendations.length < maxCharts) {
        recommendations.push({
          id: `missing-${chartId++}`,
          chartType: 'missing-data',
          title: 'Data Completeness Overview',
          description: 'Shows missing data patterns across columns',
          rationale: `${profile.missingDataPattern.length} columns have missing data`,
          priority: 6,
          confidence: 0.9,
          dataColumns: profile.missingDataPattern.map(item => item.column),
          colorScheme: SEQUENTIAL_PALETTES.blue,
          insightType: 'pattern',
          config: {
            title: 'Missing Data by Column',
            height: 300,
            showLegend: false,
            showTooltip: true,
            xAxisLabel: 'Column',
            yAxisLabel: 'Missing %',
          }
        });
      }
    }

    // 6. Box plots for outlier detection
    if (characteristics.hasOutliers) {
      const outlierColumns = numericColumns.filter(col => col.outliers && col.outliers.length > 0);
      for (const col of outlierColumns.slice(0, 2)) {
        if (recommendations.length >= maxCharts) break;
        
        recommendations.push({
          id: `box-${chartId++}`,
          chartType: 'boxplot',
          title: `${col.name} Outlier Analysis`,
          description: `Box plot showing outliers in ${col.name}`,
          rationale: `${col.outliers?.length || 0} outliers detected in this variable`,
          priority: 7,
          confidence: 0.8,
          dataColumns: [col.name],
          colorScheme: SEQUENTIAL_PALETTES.red,
          insightType: 'anomaly',
          config: {
            title: `${col.name} Box Plot`,
            height: 300,
            showLegend: false,
            showTooltip: true,
            xAxisLabel: col.name,
            yAxisLabel: 'Value',
          }
        });
      }
    }

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxCharts);
  }

  /**
   * Find strongest correlation pair
   */
  private findStrongestCorrelationPair(profile: DatasetProfile): { x: string; y: string; correlation: number } | null {
    if (!profile.correlationMatrix || profile.numericColumns.length < 2) return null;

    let strongest = { x: '', y: '', correlation: 0 };

    for (let i = 0; i < profile.correlationMatrix.length; i++) {
      for (let j = i + 1; j < profile.correlationMatrix[i].length; j++) {
        const correlation = Math.abs(profile.correlationMatrix[i][j]);
        if (correlation > strongest.correlation) {
          strongest = {
            x: profile.numericColumns[i],
            y: profile.numericColumns[j],
            correlation: profile.correlationMatrix[i][j]
          };
        }
      }
    }

    return strongest.correlation > 0.3 ? strongest : null;
  }

  /**
   * Generate visualization insights
   */
  private generateVisualizationInsights(profile: DatasetProfile, characteristics: any): VisualizationInsight[] {
    const insights: VisualizationInsight[] = [];

    // Data quality insights
    if (characteristics.dataQuality < 80) {
      insights.push({
        type: 'low-quality',
        message: `Data completeness is ${characteristics.dataQuality.toFixed(1)}%`,
        confidence: 0.9,
        severity: 'high',
        actionable: true,
        recommendation: 'Consider data cleaning to improve quality'
      });
    }

    // Correlation insights
    if (characteristics.hasCorrelations) {
      insights.push({
        type: 'strong-correlation',
        message: 'Strong correlations detected between variables',
        confidence: 0.8,
        severity: 'medium',
        actionable: true,
        recommendation: 'Use scatter plots and heatmaps to explore relationships'
      });
    }

    // Outlier insights
    if (characteristics.hasOutliers) {
      insights.push({
        type: 'outliers-detected',
        message: 'Outliers detected in numeric variables',
        confidence: 0.85,
        severity: 'medium',
        actionable: true,
        recommendation: 'Review outliers for data quality or interesting patterns'
      });
    }

    // Temporal data insights
    if (characteristics.hasTemporalData) {
      insights.push({
        type: 'trending-up',
        message: 'Temporal data detected - consider time series analysis',
        confidence: 0.7,
        severity: 'low',
        actionable: true,
        recommendation: 'Use line charts or area charts for temporal trends'
      });
    }

    return insights;
  }

  /**
   * Determine optimal layout
   */
  private determineLayout(recommendations: AIVisualizationRecommendation[], characteristics: any): 'grid' | 'dashboard' | 'story' {
    if (characteristics.complexity === 'high' || recommendations.length > 6) {
      return 'dashboard';
    }
    
    if (characteristics.hasTemporalData && characteristics.hasCorrelations) {
      return 'story';
    }
    
    return 'grid';
  }

  /**
   * Get fallback analysis when AI fails
   */
  private getFallbackAnalysis(data: Record<string, any>[], profile: DatasetProfile): AIVisualizationAnalysis {
    return {
      recommendations: this.generateRuleBasedRecommendations(data, profile, {
        hasTemporalData: false,
        hasCorrelations: false,
        hasOutliers: false,
        hasSeasonality: false,
        dataQuality: profile.overallQuality,
        complexity: 'low'
      }, 4),
      insights: [],
      dataCharacteristics: {
        hasTemporalData: false,
        hasCorrelations: false,
        hasOutliers: false,
        hasSeasonality: false,
        dataQuality: profile.overallQuality,
        complexity: 'low'
      },
      suggestedLayout: 'grid'
    };
  }
}

// Export singleton instance
export const visualizationAIService = new VisualizationAIService();
