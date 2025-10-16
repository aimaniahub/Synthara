# PDF Export Service Documentation

## Overview

The PDF Export Service provides comprehensive data analysis report generation in PDF format. It includes detailed statistical analysis, data quality metrics, AI insights, visualizations, and sample data.

## Features

### 📊 Comprehensive Report Sections

1. **Executive Summary** - High-level overview of the dataset
2. **Dataset Overview** - Basic statistics and metrics
3. **Statistical Summary** - Detailed column statistics
4. **Data Quality Analysis** - Missing data patterns and quality scores
5. **Column Analysis** - In-depth analysis of each column
6. **Correlation Analysis** - Relationships between numeric variables
7. **AI Insights & Recommendations** - AI-powered insights and suggestions
8. **Data Visualizations** - Charts and graphs (when available)
9. **Sample Data** - First 20 rows of the dataset

### 🎨 Professional Styling

- Clean, professional layout with consistent typography
- Color-coded sections and tables
- Responsive table layouts
- Page numbering and branding
- Grid-based table themes

### 📈 Chart Support

- Automatic chart conversion to images
- Support for various chart types (bar, line, pie, scatter, histogram)
- Fallback placeholders for unsupported charts
- High-quality image rendering

## Usage

### Basic Usage

```typescript
import { pdfExportService } from '@/services/pdf-export-service';

const pdfBlob = await pdfExportService.generateReport({
  datasetName: 'My Dataset',
  analysisDate: '2024-01-15',
  profile: datasetProfile,
  insights: aiInsights,
  rawData: sampleData,
  charts: chartData // Optional
});
```

### Advanced Usage with Charts

```typescript
import { ChartData } from '@/lib/chart-to-image';

const charts: ChartData[] = [
  {
    title: 'Age Distribution',
    type: 'histogram',
    data: ageData,
    element: document.getElementById('age-chart')
  }
];

const pdfBlob = await pdfExportService.generateReport({
  datasetName: 'Employee Dataset',
  analysisDate: new Date().toLocaleDateString(),
  profile: analysisResult.profile,
  insights: analysisResult.insights,
  rawData: selectedData,
  charts: charts
});
```

## Data Structure Requirements

### Dataset Profile

```typescript
interface DatasetProfile {
  totalRows: number;
  totalColumns: number;
  columns: ColumnStatistics[];
  overallQuality: number;
  missingDataPattern: MissingDataPattern[];
  correlationMatrix?: number[][];
  numericColumns: string[];
  categoricalColumns: string[];
}
```

### Column Statistics

```typescript
interface ColumnStatistics {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  count: number;
  missing: number;
  missingPercentage: number;
  unique: number;
  // Numeric specific
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  // Categorical specific
  topValues?: Array<{value: any; count: number; percentage: number}>;
}
```

## Chart Integration

### Supported Chart Types

- Bar Charts
- Line Charts
- Pie Charts
- Scatter Plots
- Histograms

### Chart Conversion Process

1. Charts are converted to base64 images using html2canvas
2. Images are embedded directly in the PDF
3. Fallback placeholders are created for failed conversions
4. Charts are automatically sized and positioned

### Chart Data Structure

```typescript
interface ChartData {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  data: any;
  element?: HTMLElement;
  imageData?: string;
}
```

## Dependencies

- `jspdf` - PDF generation
- `jspdf-autotable` - Table generation
- `html2canvas` - Chart to image conversion

## Error Handling

The service includes comprehensive error handling:

- Graceful fallbacks for chart conversion failures
- Data validation and sanitization
- Memory management for large datasets
- Progress tracking for long operations

## Performance Considerations

- Large datasets are automatically paginated
- Charts are processed asynchronously
- Memory usage is optimized for large files
- Sample data is limited to first 20 rows

## Customization

### Styling

The service uses a consistent color scheme:
- Primary: Blue (#3B82F6)
- Success: Green (#22C55E)
- Warning: Orange (#F59E0B)
- Error: Red (#EF4444)
- Purple: Purple (#A855F7)

### Layout

- Standard A4 page size
- 20px margins
- Consistent spacing and typography
- Professional table layouts

## Troubleshooting

### Common Issues

1. **Charts not appearing**: Ensure html2canvas is properly installed
2. **Large file sizes**: Consider reducing chart quality or sample data
3. **Memory issues**: Process smaller datasets or reduce chart resolution

### Debug Mode

Enable debug logging by setting:
```typescript
console.log('PDF Export Debug Mode');
```

## Examples

See `test-pdf-export.js` for a complete working example.

## License

MIT License - See LICENSE file for details.
