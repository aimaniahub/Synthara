'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
// Removed eager Papa import to reduce bundle size
// Papa Parse will be dynamically imported when needed
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Database,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUserDatasets, type SavedDataset } from '@/lib/supabase/actions';

interface DatasetSelectorProps {
  onDatasetSelect: (data: Record<string, any>[], metadata: { id?: string; name: string; source: 'saved' | 'uploaded' }) => void;
  onAnalysisStart: () => void;
  hideAnalyzeButton?: boolean;
}

const parseCSV = async (csvText: string): Promise<Record<string, any>[]> => {
  // Dynamically import Papa Parse only when we actually need to parse
  const Papa = (await import('papaparse')).default;

  const result = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: 'greedy',
  });
  const rows = Array.isArray(result.data) ? (result.data as Record<string, any>[]) : [];
  // Normalize empty strings to null for consistency with previous behavior
  for (const row of rows) {
    for (const key in row) {
      if (row[key] === '') row[key] = null;
    }
  }
  return rows;
};

export function DatasetSelector({ onDatasetSelect, onAnalysisStart, hideAnalyzeButton = false }: DatasetSelectorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const autoLoadedRef = useRef(false);

  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);

  // Load saved datasets on mount
  useEffect(() => {
    loadSavedDatasets();
  }, []);

  useEffect(() => {
    const pid = searchParams?.get('datasetId');
    if (pid && !autoLoadedRef.current) {
      autoLoadedRef.current = true;
      handleSavedDatasetSelect(pid);
    }
  }, [searchParams]);

  const loadSavedDatasets = async () => {
    try {
      setIsLoadingDatasets(true);
      const datasets = await getUserDatasets(50);
      setSavedDatasets(datasets);
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast({
        title: "Error",
        description: "Failed to load saved datasets",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    setIsParsingFile(true);

    try {
      const text = await file.text();
      const data = await parseCSV(text);

      if (data.length === 0) {
        throw new Error('No data found in CSV file');
      }

      setParsedData(data);
      setPreviewData(data.slice(0, 5)); // Show first 5 rows for preview
      setSelectedDatasetId(''); // Clear saved dataset selection

      toast({
        title: "File Uploaded",
        description: `Successfully parsed ${data.length} rows from ${file.name}`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive"
      });
      setUploadedFile(null);
      setParsedData([]);
      setPreviewData([]);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleSavedDatasetSelect = async (datasetId: string) => {
    if (!datasetId) return;

    setSelectedDatasetId(datasetId);
    setUploadedFile(null);
    setParsedData([]);
    setPreviewData([]);

    try {
      // Fetch the full dataset
      const response = await fetch(`/api/datasets/${datasetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }

      const dataset = await response.json();
      const csvData = await parseCSV(dataset.data_csv);

      setParsedData(csvData);
      setPreviewData(csvData.slice(0, 5));

      toast({
        title: "Dataset Loaded",
        description: `Loaded ${csvData.length} rows from ${dataset.dataset_name}`,
      });
    } catch (error) {
      console.error('Error loading dataset:', error);
      toast({
        title: "Load Error",
        description: "Failed to load selected dataset",
        variant: "destructive"
      });
    }
  };

  const handleAnalyze = () => {
    if (parsedData.length === 0) {
      toast({
        title: "No Data",
        description: "Please select a dataset or upload a file first",
        variant: "destructive"
      });
      return;
    }

    const metadata = {
      id: selectedDatasetId || undefined,
      name: selectedDatasetId
        ? savedDatasets.find(ds => ds.id === selectedDatasetId)?.dataset_name || 'Unknown Dataset'
        : uploadedFile?.name || 'Uploaded Dataset',
      source: selectedDatasetId ? 'saved' as const : 'uploaded' as const
    };

    onDatasetSelect(parsedData, metadata);
    onAnalysisStart();
  };

  const clearSelection = () => {
    setSelectedDatasetId('');
    setUploadedFile(null);
    setParsedData([]);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasData = parsedData.length > 0;

  return (
    <Card className="modern-card border-none shadow-sm overflow-hidden">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Database className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">Dataset Selection</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Saved Datasets */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Saved Intelligence</Label>
            {isLoadingDatasets ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-10">
                <Loader2 className="h-3 w-3 animate-spin" />
                Retrieving...
              </div>
            ) : (
              <Select value={selectedDatasetId} onValueChange={handleSavedDatasetSelect}>
                <SelectTrigger className="h-10 rounded-lg bg-secondary/30 border-border/50 focus:ring-primary/20 transition-all text-sm">
                  <SelectValue placeholder="Chose a saved dataset" />
                </SelectTrigger>
                <SelectContent>
                  {savedDatasets.length === 0 ? (
                    <SelectItem value="__no_saved__" disabled>
                      No saved datasets
                    </SelectItem>
                  ) : (
                    savedDatasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{dataset.dataset_name}</span>
                          <Badge variant="secondary" className="ml-2 text-[8px] h-4">
                            {dataset.num_rows} rows
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">External Protocol (CSV)</Label>
            <div className="relative group">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isParsingFile}
                className="h-10 rounded-lg bg-secondary/30 border-border/50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-xs transition-all cursor-pointer"
              />
              {isParsingFile && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Preview */}
        {hasData && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Payload Preview</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 px-2 text-[10px] font-bold text-destructive hover:bg-destructive/5"
              >
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>

            <div className="border border-border/50 rounded-xl overflow-hidden bg-secondary/10">
              <div className="bg-secondary/20 px-4 py-2 text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>{selectedDatasetId ? 'REPOSITORY SOURCE' : 'UPLOADED STREAM'}</span>
                <span className="text-primary">{previewData.length > 0 ? Object.keys(previewData[0]).length : 0} FIELDS | {parsedData.length} RECORDS</span>
              </div>
              <ScrollArea className="h-64 w-full">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/10 sticky top-0">
                    <tr>
                      {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="px-4 py-3 text-left font-bold text-muted-foreground/70 truncate max-w-48 border-b border-border/30">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-border/20 last:border-0 hover:bg-white/5 transition-colors">
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 truncate max-w-48 text-muted-foreground font-medium">
                            {value === null || value === undefined ? (
                              <span className="opacity-30 italic">null</span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          {!hideAnalyzeButton && (
            <Button
              onClick={handleAnalyze}
              disabled={!hasData}
              className="w-full sm:w-auto min-w-40 h-11 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 hover:translate-y-[-1px] transition-all active:translate-y-0"
              variant={hasData ? "default" : "secondary"}
            >
              {hasData ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Dataset
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Select Dataset
                </>
              )}
            </Button>
          )}

          <div className="flex-1 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
              <FileText className="h-3 w-3" />
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight font-medium">
              <strong className="text-blue-600">Automatic Detection:</strong> CSV headers, numeric ranges, categorical patterns, and missing values are identified instantly.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
