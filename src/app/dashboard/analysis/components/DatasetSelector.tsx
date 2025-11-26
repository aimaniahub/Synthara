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
  X
} from 'lucide-react';
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Select Dataset for Analysis
        </CardTitle>
        <CardDescription>
          Choose from your saved datasets or upload a new CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saved Datasets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Saved Datasets</Label>
          {isLoadingDatasets ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading datasets...
            </div>
          ) : (
            <Select value={selectedDatasetId} onValueChange={handleSavedDatasetSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a saved dataset" />
              </SelectTrigger>
              <SelectContent>
                {savedDatasets.length === 0 ? (
                  <SelectItem value="__no_saved__" disabled>
                    No saved datasets found
                  </SelectItem>
                ) : (
                  savedDatasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{dataset.dataset_name}</span>
                        <Badge variant="secondary" className="ml-2">
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Upload CSV File</Label>
          <div className="flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isParsingFile}
              className="flex-1"
            />
            {isParsingFile && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Data Preview */}
        {hasData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Data Preview</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium">
                {selectedDatasetId ? 'Saved Dataset' : 'Uploaded File'}: {previewData.length > 0 ? Object.keys(previewData[0]).length : 0} columns, {parsedData.length} rows
              </div>
              <div className="max-h-32 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium truncate max-w-32">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t">
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 truncate max-w-32">
                            {value === null || value === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analyze Button (hidden in some contexts) */}
        {!hideAnalyzeButton && (
          <div className="flex justify-end">
            <Button 
              onClick={handleAnalyze}
              disabled={!hasData}
              className="min-w-32"
            >
              {hasData ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Analyze Dataset
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Select Dataset First
                </>
              )}
            </Button>
          </div>
        )}

        {/* Help Text */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Supported formats:</strong> CSV files with headers. 
            <br />
            <strong>Data types:</strong> Numeric, categorical, date, and text columns will be automatically detected.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
