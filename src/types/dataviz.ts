export type ColumnInfo = {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
};

export type ChartSpec = {
  id: string;
  title: string;
  description?: string;
  type: 'line' | 'bar' | 'scatter';
  xField?: string; // optional for maps
  yField?: string; // optional for maps
  aggregation?: 'sum' | 'mean' | 'count';
  geo?: {
    mode: 'name' | 'latlon';
    locationField?: string; // e.g., city or address text
    countryField?: string; // optional country text
    latField?: string; // if mode=latlon
    lonField?: string; // if mode=latlon
  };
};

export type SuggestChartsRequest = {
  datasetName?: string;
  columns: ColumnInfo[];
  userGoal?: string;
  availableTypes?: Array<'bar' | 'line' | 'scatter'>;
};

export type SuggestChartsResponse = {
  charts: ChartSpec[];
  meta?: {
    aiUsed: boolean;
    model?: string | null;
  };
};
