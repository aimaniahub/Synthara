// Export all chart components
export { BarChart } from './BarChart';
export { LineChart } from './LineChart';
export { PieChart } from './PieChart';
export { ScatterChart } from './ScatterChart';
export { HistogramChart } from './HistogramChart';
export { BoxPlotChart } from './BoxPlotChart';
export { MissingDataChart } from './MissingDataChart';
export { ChartWrapper, ChartLoading, ChartError } from './ChartWrapper';

// Export chart components
export { AreaChart } from './AreaChart';
export { TimeSeriesChart } from './TimeSeriesChart';
export { HeatmapChart } from './HeatmapChart';
export { ScatterPlotAdvanced } from './ScatterPlotAdvanced';
export { StackedBarChart } from './StackedBarChart';
export { RadarChart } from './RadarChart';
export { TreemapChart } from './TreemapChart';

// Export types
export type {
  ChartDataPoint,
  BarChartData,
  LineChartData,
  PieChartData,
  ScatterChartData,
  HistogramData,
  BoxPlotData,
  CorrelationData,
  MissingDataItem,
  ChartType,
  ChartConfig,
  ChartProps,
  BarChartProps,
  LineChartProps,
  PieChartProps,
  ScatterChartProps,
  HistogramProps,
  BoxPlotProps,
  CorrelationHeatmapProps,
  MissingDataChartProps,
  // AI-driven visualization types
  AIVisualizationRecommendation,
  VisualizationInsight,
  AIVisualizationAnalysis,
  // New chart data types
  AreaChartData,
  TimeSeriesData,
  HeatmapData,
  ScatterAdvancedData,
  StackedBarData,
  RadarData,
  TreemapData,
  // New chart component props
  AreaChartProps,
  TimeSeriesProps,
  HeatmapProps,
  ScatterAdvancedProps,
  StackedBarProps,
  RadarProps,
  TreemapProps,
} from '@/types/charts';
