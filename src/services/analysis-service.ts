/**
 * Data Analysis Service
 * Statistical computation engine for dataset analysis
 */

export interface ColumnStatistics {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  count: number;
  missing: number;
  missingPercentage: number;
  unique: number;
  // Numeric specific
  mean?: number;
  median?: number;
  mode?: any;
  std?: number;
  min?: number;
  max?: number;
  q1?: number;
  q3?: number;
  outliers?: number[];
  // Categorical specific
  topValues?: Array<{ value: any; count: number; percentage: number }>;
}

export interface DatasetProfile {
  totalRows: number;
  totalColumns: number;
  columns: ColumnStatistics[];
  overallQuality: number;
  missingDataPattern: Array<{ column: string; missingCount: number; missingPercentage: number }>;
  correlationMatrix?: Array<Array<number>>;
  numericColumns: string[];
  categoricalColumns: string[];
}

export interface AnalysisResult {
  profile: DatasetProfile;
  insights: {
    dataQuality: string[];
    patterns: string[];
    anomalies: string[];
    recommendations: string[];
  };
  aiInsights?: {
    columnInsights: ColumnInsight[];
    deepInsights: DeepInsight;
  };
}

export interface ColumnInsight {
  column: string;
  semanticMeaning: string;
  dataQuality: number;
}

export interface DeepInsight {
  summary: string;
  correlations: Array<{
    columnA: string;
    columnB: string;
    strength: string;
    insight: string;
  }>;
  recommendations: string[];
}

export interface AnalysisProgress {
  stage: 'structure' | 'statistics' | 'visualizations' | 'ai-insights' | 'complete';
  percentage: number;
  message: string;
}

export class AnalysisService {
  /**
   * Detect data types for each column
   */
  detectDataTypes(data: Record<string, any>[]): Record<string, 'numeric' | 'categorical' | 'date' | 'text'> {
    if (!data.length) return {};

    const columnTypes: Record<string, 'numeric' | 'categorical' | 'date' | 'text'> = {};
    const columns = Object.keys(data[0]);

    for (const column of columns) {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');

      if (values.length === 0) {
        columnTypes[column] = 'text';
        continue;
      }

      // Check if it's a date
      if (this.isDateColumn(values)) {
        columnTypes[column] = 'date';
        continue;
      }

      // Check if it's numeric
      if (this.isNumericColumn(values)) {
        columnTypes[column] = 'numeric';
        continue;
      }

      // Check if it's categorical (limited unique values)
      const uniqueValues = new Set(values).size;
      const totalValues = values.length;
      const uniqueRatio = uniqueValues / totalValues;

      if (uniqueRatio < 0.1 || uniqueValues < 20) {
        columnTypes[column] = 'categorical';
      } else {
        columnTypes[column] = 'text';
      }
    }

    return columnTypes;
  }

  /**
   * Check if column contains date values
   */
  private isDateColumn(values: any[]): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    ];

    let dateCount = 0;
    for (const value of values.slice(0, Math.min(10, values.length))) {
      const str = String(value).trim();
      if (datePatterns.some(pattern => pattern.test(str)) || !isNaN(Date.parse(str))) {
        dateCount++;
      }
    }

    return dateCount / Math.min(10, values.length) > 0.7;
  }

  /**
   * Check if column contains numeric values
   */
  private isNumericColumn(values: any[]): boolean {
    let numericCount = 0;
    for (const value of values.slice(0, Math.min(20, values.length))) {
      if (typeof value === 'number' || !isNaN(Number(value))) {
        numericCount++;
      }
    }

    return numericCount / Math.min(20, values.length) > 0.8;
  }

  /**
   * Calculate statistics for a single column
   */
  calculateColumnStatistics(
    data: Record<string, any>[],
    columnName: string,
    type: 'numeric' | 'categorical' | 'date' | 'text'
  ): ColumnStatistics {
    const values = data.map(row => row[columnName]);
    const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');

    const stats: ColumnStatistics = {
      name: columnName,
      type,
      count: nonNullValues.length,
      missing: values.length - nonNullValues.length,
      missingPercentage: ((values.length - nonNullValues.length) / values.length) * 100,
      unique: new Set(nonNullValues).size,
    };

    if (type === 'numeric') {
      const numericValues = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));

      if (numericValues.length > 0) {
        stats.mean = this.calculateMean(numericValues);
        stats.median = this.calculateMedian(numericValues);
        stats.std = this.calculateStandardDeviation(numericValues);
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);

        const sorted = [...numericValues].sort((a, b) => a - b);
        stats.q1 = this.calculatePercentile(sorted, 25);
        stats.q3 = this.calculatePercentile(sorted, 75);

        // Detect outliers using IQR method
        const iqr = stats.q3! - stats.q1!;
        const lowerBound = stats.q1! - 1.5 * iqr;
        const upperBound = stats.q3! + 1.5 * iqr;
        stats.outliers = numericValues.filter(v => v < lowerBound || v > upperBound);
      }
    } else if (type === 'categorical') {
      const valueCounts = new Map<any, number>();
      nonNullValues.forEach(val => {
        valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
      });

      const total = nonNullValues.length;
      stats.topValues = Array.from(valueCounts.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / total) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Mode is the most frequent value
      if (stats.topValues.length > 0) {
        stats.mode = stats.topValues[0].value;
      }
    }

    return stats;
  }

  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedValues.length) return sortedValues[sortedValues.length - 1];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Calculate correlation matrix for numeric columns
   */
  calculateCorrelationMatrix(data: Record<string, any>[], numericColumns: string[]): number[][] {
    if (numericColumns.length === 0) return [];

    const matrix: number[][] = Array(numericColumns.length).fill(null).map(() => Array(numericColumns.length).fill(0));

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = 0; j < numericColumns.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.calculateCorrelation(
            data.map(row => Number(row[numericColumns[i]])).filter(n => !isNaN(n)),
            data.map(row => Number(row[numericColumns[j]])).filter(n => !isNaN(n))
          );
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate Pearson correlation coefficient
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

  /**
   * Analyze complete dataset
   */
  analyzeDataset(data: Record<string, any>[]): AnalysisResult {
    if (!data.length) {
      throw new Error('Dataset is empty');
    }

    const columnTypes = this.detectDataTypes(data);
    const columns = Object.keys(data[0]);
    const columnStats: ColumnStatistics[] = [];

    // Calculate statistics for each column
    for (const column of columns) {
      const stats = this.calculateColumnStatistics(data, column, columnTypes[column]);
      columnStats.push(stats);
    }

    const numericColumns = columnStats.filter(col => col.type === 'numeric').map(col => col.name);
    const categoricalColumns = columnStats.filter(col => col.type === 'categorical').map(col => col.name);

    // Calculate correlation matrix for numeric columns
    const correlationMatrix = this.calculateCorrelationMatrix(data, numericColumns);

    // Calculate overall data quality score
    const totalCells = data.length * columns.length;
    const missingCells = columnStats.reduce((sum, col) => sum + col.missing, 0);
    const overallQuality = ((totalCells - missingCells) / totalCells) * 100;

    // Missing data pattern
    const missingDataPattern = columnStats
      .filter(col => col.missing > 0)
      .map(col => ({
        column: col.name,
        missingCount: col.missing,
        missingPercentage: col.missingPercentage
      }))
      .sort((a, b) => b.missingPercentage - a.missingPercentage);

    const profile: DatasetProfile = {
      totalRows: data.length,
      totalColumns: columns.length,
      columns: columnStats,
      overallQuality,
      missingDataPattern,
      correlationMatrix,
      numericColumns,
      categoricalColumns
    };

    // Generate insights
    const insights = this.generateInsights(profile);

    return {
      profile,
      insights
    };
  }

  /**
   * Generate data insights
   */
  private generateInsights(profile: DatasetProfile): {
    dataQuality: string[];
    patterns: string[];
    anomalies: string[];
    recommendations: string[];
  } {
    const insights = {
      dataQuality: [] as string[],
      patterns: [] as string[],
      anomalies: [] as string[],
      recommendations: [] as string[]
    };

    // Data quality insights
    if (profile.overallQuality < 80) {
      insights.dataQuality.push(`Data completeness is ${profile.overallQuality.toFixed(1)}% - consider addressing missing values`);
    }

    const highMissingColumns = profile.missingDataPattern.filter(col => col.missingPercentage > 20);
    if (highMissingColumns.length > 0) {
      insights.dataQuality.push(`High missing data in: ${highMissingColumns.map(col => col.column).join(', ')}`);
    }

    // Pattern insights
    const numericCols = profile.columns.filter(col => col.type === 'numeric');
    for (const col of numericCols) {
      if (col.std && col.mean) {
        const cv = col.std / col.mean; // Coefficient of variation
        if (cv > 1) {
          insights.patterns.push(`${col.name} shows high variability (CV: ${cv.toFixed(2)})`);
        }
      }
    }

    // Anomaly insights
    for (const col of profile.columns) {
      if (col.type === 'numeric' && col.outliers && col.outliers.length > 0) {
        insights.anomalies.push(`${col.name} has ${col.outliers.length} outliers`);
      }
    }

    // Recommendations
    if (profile.numericColumns.length > 1) {
      insights.recommendations.push('Consider correlation analysis for numeric variables');
    }

    if (profile.categoricalColumns.length > 0) {
      insights.recommendations.push('Categorical variables could benefit from encoding for ML models');
    }

    if (profile.overallQuality < 95) {
      insights.recommendations.push('Data cleaning recommended to improve quality');
    }

    return insights;
  }

  /**
   * Parse CSV data
   */
  parseCSV(csvText: string): Record<string, any>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          const value = values[index];
          // Try to convert to number if possible
          if (value && !isNaN(Number(value)) && value !== '') {
            row[header] = Number(value);
          } else {
            row[header] = value === '' ? null : value;
          }
        });
        data.push(row);
      }
    }

    return data;
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();
