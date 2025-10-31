// Chart data types for MUI X Charts integration

export interface ChartDataPoint {
  id?: string | number;
  label: string;
  value: number;
  color?: string;
  [key: string]: any;
}

export interface BarChartData {
  series: Array<{
    data: number[];
    label?: string;
    color?: string;
  }>;
  xAxis?: {
    data: string[];
    scaleType?: 'band' | 'point' | 'linear' | 'log' | 'time' | 'utc';
  };
}

export interface LineChartData {
  series: Array<{
    data: number[];
    label?: string;
    color?: string;
    curve?: 'linear' | 'step' | 'stepBefore' | 'stepAfter';
  }>;
  xAxis?: {
    data: string[] | number[];
    scaleType?: 'band' | 'point' | 'linear' | 'log' | 'time' | 'utc';
  };
}

export interface PieChartData {
  data: ChartDataPoint[];
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  startAngle?: number;
  endAngle?: number;
}

export interface ScatterChartData {
  series: Array<{
    data: Array<{ x: number; y: number; id?: string | number }>;
    label?: string;
    color?: string;
  }>;
}

export interface ChartConfig {
  title?: string;
  description?: string;
  height?: number;
  width?: number;
  responsive?: boolean;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  showAxis?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface HistogramData {
  bins: Array<{
    start: number;
    end: number;
    count: number;
  }>;
  totalCount: number;
}

export interface BoxPlotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  mean?: number;
}

export interface CorrelationData {
  matrix: number[][];
  labels: string[];
  minValue: number;
  maxValue: number;
}

export interface MissingDataItem {
  column: string;
  missingCount: number;
  missingPercentage: number;
  totalCount: number;
}

export type ChartType = 
  | 'bar'
  | 'line' 
  | 'pie'
  | 'scatter'
  | 'histogram'
  | 'boxplot'
  | 'correlation'
  | 'missing-data'
  | 'area'
  | 'timeseries'
  | 'heatmap'
  | 'scatter-advanced'
  | 'stacked-bar'
  | 'radar'
  | 'treemap';

export interface ChartProps {
  data: any;
  config?: ChartConfig;
  className?: string;
  loading?: boolean;
  error?: string | null;
  onDataPointClick?: (data: any) => void;
  metrics?: string[];
  onDataPointHover?: (data: any) => void;
}

// Chart component props
export interface BarChartProps extends ChartProps {
  data: BarChartData;
}

export interface LineChartProps extends ChartProps {
  data: LineChartData;
}

export interface PieChartProps extends ChartProps {
  data: PieChartData;
}

export interface ScatterChartProps extends ChartProps {
  data: ScatterChartData;
}

export interface HistogramProps extends ChartProps {
  data: HistogramData;
}

export interface BoxPlotProps extends ChartProps {
  data: BoxPlotData;
}

export interface CorrelationHeatmapProps extends ChartProps {
  data: CorrelationData;
}

export interface MissingDataChartProps extends ChartProps {
  data: MissingDataItem[];
}

// AI-driven visualization types
export interface AIVisualizationRecommendation {
  id: string;
  chartType: ChartType;
  title: string;
  description: string;
  rationale: string;
  priority: number; // 1-10, higher is more important
  confidence: number; // 0-1, how confident the AI is in this recommendation
  dataColumns: string[];
  colorScheme: string[];
  insightType: 'distribution' | 'correlation' | 'trend' | 'anomaly' | 'comparison' | 'pattern';
  config: ChartConfig;
}

export interface VisualizationInsight {
  type: 'strong-correlation' | 'outliers-detected' | 'seasonal-pattern' | 'trending-up' | 'trending-down' | 'high-variance' | 'low-quality' | 'anomaly';
  message: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendation?: string;
}

export interface AIVisualizationAnalysis {
  recommendations: AIVisualizationRecommendation[];
  insights: VisualizationInsight[];
  dataCharacteristics: {
    hasTemporalData: boolean;
    hasCorrelations: boolean;
    hasOutliers: boolean;
    hasSeasonality: boolean;
    dataQuality: number;
    complexity: 'low' | 'medium' | 'high';
  };
  suggestedLayout: 'grid' | 'dashboard' | 'story';
}

// New chart data types
export interface AreaChartData {
  series: Array<{
    data: number[];
    label: string;
    color?: string;
    fillOpacity?: number;
  }>;
  xAxis?: {
    data: string[] | number[];
    scaleType?: 'band' | 'point' | 'linear' | 'log' | 'time' | 'utc';
  };
}

export interface TimeSeriesData {
  series: Array<{
    data: Array<{ x: string | number; y: number }>;
    label: string;
    color?: string;
    curve?: 'linear' | 'step' | 'stepBefore' | 'stepAfter';
  }>;
  timeFormat?: string;
}

export interface HeatmapData {
  data: Array<{
    x: string;
    y: string;
    value: number;
  }>;
  xLabels: string[];
  yLabels: string[];
  colorScale: {
    min: number;
    max: number;
    type: 'sequential' | 'diverging';
  };
}

export interface ScatterAdvancedData {
  series: Array<{
    data: Array<{ x: number; y: number; size?: number; label?: string }>;
    label: string;
    color?: string;
    showTrendLine?: boolean;
    showClusters?: boolean;
  }>;
  xAxis?: {
    label: string;
    scaleType?: 'linear' | 'log';
  };
  yAxis?: {
    label: string;
    scaleType?: 'linear' | 'log';
  };
}

export interface StackedBarData {
  series: Array<{
    data: number[];
    label: string;
    color?: string;
  }>;
  xAxis: {
    data: string[];
    scaleType?: 'band';
  };
  stackOrder?: 'ascending' | 'descending' | 'none';
}

export interface RadarData {
  series: Array<{
    data: Array<{ value: number; label: string }>;
    label: string;
    color?: string;
  }>;
  maxValue?: number;
  minValue?: number;
}

export interface TreemapData {
  data: Array<{
    id: string;
    value: number;
    label: string;
    color?: string;
    children?: Array<{
      id: string;
      value: number;
      label: string;
      color?: string;
    }>;
  }>;
  colorScale?: 'value' | 'category' | 'depth';
}

// New chart component props
export interface AreaChartProps extends ChartProps {
  data: AreaChartData;
}

export interface TimeSeriesProps extends ChartProps {
  data: TimeSeriesData;
}

export interface HeatmapProps extends ChartProps {
  data: HeatmapData;
}

export interface ScatterAdvancedProps extends ChartProps {
  data: ScatterAdvancedData;
}

export interface StackedBarProps extends ChartProps {
  data: StackedBarData;
}

export interface RadarProps extends ChartProps {
  data: RadarData;
}

export interface TreemapProps extends ChartProps {
  data: TreemapData;
}
