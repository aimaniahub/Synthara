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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Saved Datasets */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Repository</Label>
          {isLoadingDatasets ? (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground h-9">
              <Loader2 className="h-3 w-3 animate-spin" />
              Retrieving...
            </div>
          ) : (
            <Select value={selectedDatasetId} onValueChange={handleSavedDatasetSelect}>
              <SelectTrigger className="h-9 rounded-lg bg-secondary/30 border-border/50 focus:ring-primary/20 transition-all text-xs">
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
                          {dataset.num_rows}
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
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">External Stream (CSV)</Label>
          <div className="relative group">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isParsingFile}
              className="h-9 rounded-lg bg-secondary/30 border-border/50 file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-[10px] transition-all cursor-pointer flex items-center"
            />
            {isParsingFile && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      {hasData && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Ingested Payload</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-5 px-1.5 text-[9px] font-bold text-destructive hover:bg-destructive/5"
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>

          <div className="border border-border/30 rounded-lg overflow-hidden bg-secondary/5">
            <div className="bg-secondary/10 px-3 py-1 text-[9px] font-bold text-muted-foreground/70 flex items-center justify-between border-b border-border/10">
              <span className="flex items-center gap-1.5"><CheckCircle className="size-2.5 text-emerald-500" /> ACTIVE CONTEXT</span>
              <span className="text-[8px]">{previewData.length > 0 ? Object.keys(previewData[0]).length : 0} FIELDS | {parsedData.length} RECORDS</span>
            </div>
            <ScrollArea className="h-32 w-full">
              <table className="w-full text-[10px]">
                <thead className="bg-secondary/5 sticky top-0">
                  <tr>
                    {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-3 py-1.5 text-left font-bold text-muted-foreground/50 truncate max-w-32 border-b border-border/10">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b border-border/5 last:border-0 hover:bg-white/5 transition-colors">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-1.5 truncate max-w-32 text-muted-foreground/80 font-medium">
                          {value === null || value === undefined ? (
                            <span className="opacity-20 italic">null</span>
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

      <div className="pt-1">
        {!hideAnalyzeButton && (
          <Button
            onClick={handleAnalyze}
            disabled={!hasData}
            className="w-full h-10 rounded-lg text-xs font-bold shadow-lg shadow-primary/10 hover:translate-y-[-1px] transition-all active:translate-y-0"
            variant={hasData ? "default" : "secondary"}
          >
            {hasData ? (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Initialize Context
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 mr-2" />
                Select Dataset
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
