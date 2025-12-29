export type ColumnInfo = {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
};

export type ChartSpec = {
  id: string;
  title: string;
  description?: string;
  mlInsight?: string; // 1-point ML summary
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'radar' | 'histogram' | 'box';
  xField?: string;
  yField?: string;
  aggregation?: 'sum' | 'mean' | 'count';
  geo?: {
    mode: 'name' | 'latlon';
    locationField?: string;
    countryField?: string;
    latField?: string;
    lonField?: string;
  };
};

export type SuggestChartsRequest = {
  datasetName?: string;
  columns: ColumnInfo[];
  userGoal?: string;
  availableTypes?: Array<'bar' | 'line' | 'scatter' | 'pie' | 'radar'>;
};

export type SuggestChartsResponse = {
  charts: ChartSpec[];
  meta?: {
    aiUsed: boolean;
    model?: string | null;
  };
};
