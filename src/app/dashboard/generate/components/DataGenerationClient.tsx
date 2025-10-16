"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { SimpleTerminalLogger } from '@/components/ui/simple-terminal-logger';
import { 
  Play, 
  Download, 
  Save, 
  RefreshCw, 
  Database, 
  Globe, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Form validation schema
const dataGenerationSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters long'),
  numRows: z.number().min(1).max(1000),
  useWebData: z.boolean(),
  datasetName: z.string().min(1, 'Dataset name is required'),
});

type DataGenerationFormData = z.infer<typeof dataGenerationSchema>;

interface GenerationResult {
  data: Array<Record<string, any>>;
  csv: string;
  schema: Array<{ name: string; type: string; description?: string }>;
  feedback?: string;
  error?: string;
}

interface ScrapedContent {
  content: string;
  timestamp: string;
}

export function DataGenerationClient() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [scrapedContent, setScrapedContent] = useState<ScrapedContent[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  const form = useForm<DataGenerationFormData>({
    resolver: zodResolver(dataGenerationSchema),
    defaultValues: {
      prompt: '',
      numRows: 25,
      useWebData: false,
      datasetName: '',
    },
  });

  const { watch, setValue } = form;
  const watchedValues = watch();

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Reset state when component unmounts
      setIsGenerating(false);
      setProgress(0);
      setProgressLabel('');
    };
  }, []);

  // Robust JSON parsing with multiple fallback strategies
  const parseJsonSafely = useCallback((jsonString: string): any => {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    const trimmed = jsonString.trim();
    if (!trimmed) {
      return null;
    }

    // Strategy 1: Direct parsing
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.log('[Client] Direct JSON parsing failed:', error);
    }

    // Strategy 2: Clean and parse
    try {
      const cleaned = cleanJsonString(trimmed);
      return JSON.parse(cleaned);
    } catch (error) {
      console.log('[Client] Cleaned JSON parsing failed:', error);
    }

    // Strategy 3: Try to extract valid JSON from malformed string
    try {
      const extracted = extractValidJson(trimmed);
      if (extracted) {
        return JSON.parse(extracted);
      }
    } catch (error) {
      console.log('[Client] Extracted JSON parsing failed:', error);
    }

    // Strategy 4: Try to complete truncated JSON
    try {
      const completed = completeTruncatedJson(trimmed);
      const cleaned = cleanJsonString(completed);
      return JSON.parse(cleaned);
    } catch (error) {
      console.log('[Client] Completed JSON parsing failed:', error);
    }

    // Strategy 5: Return a safe fallback object
    console.warn('[Client] All JSON parsing strategies failed, using fallback');
    return {
      type: 'error',
      message: 'Failed to parse server response',
      timestamp: new Date().toISOString()
    };
  }, []);

  // Helper function to clean JSON string
  const cleanJsonString = useCallback((jsonString: string): string => {
    let cleaned = jsonString.trim();
    
    // Remove any leading/trailing whitespace and newlines
    cleaned = cleaned.replace(/^\s+|\s+$/g, '');
    
    // Fix common issues step by step:
    
    // 1. Fix single quotes to double quotes (but be careful with apostrophes in text)
    cleaned = cleaned.replace(/([{,]\s*)'([^']*)'(\s*:)/g, '$1"$2"$3'); // Property names
    cleaned = cleaned.replace(/:\s*'([^']*)'(\s*[,}])/g, ': "$1"$2'); // String values
    
    // 2. Fix unescaped quotes in string values
    cleaned = cleaned.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":'); // Property names with quotes
    cleaned = cleaned.replace(/:\s*"([^"]*)"([^"]*)"([^"]*)"/g, ': "$1\\"$2\\"$3"'); // String values with quotes
    
    // 3. Fix trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // 4. Fix missing commas between properties
    cleaned = cleaned.replace(/"\s*\n\s*"/g, '",\n"');
    cleaned = cleaned.replace(/}\s*\n\s*{/g, '},\n{');
    cleaned = cleaned.replace(/]\s*\n\s*\[/g, '],\n[');
    
    // 5. Fix unescaped newlines in strings
    cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
    
    // 6. Fix unescaped backslashes
    cleaned = cleaned.replace(/\\(?!["\\/bfnrt])/g, '\\\\');
    
    return cleaned;
  }, []);

  // Helper function to extract valid JSON from malformed string
  const extractValidJson = useCallback((text: string): string | null => {
    // Look for JSON objects/arrays
    const patterns = [
      /\{[\s\S]*\}/g,
      /\[[\s\S]*\]/g
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          try {
            // Test if it's valid JSON without cleaning first
            JSON.parse(match);
            return match;
          } catch {
            // Try with basic cleaning
            try {
              const cleaned = match.trim().replace(/,(\s*[}\]])/g, '$1');
              JSON.parse(cleaned);
              return cleaned;
            } catch {
              continue;
            }
          }
        }
      }
    }
    
    return null;
  }, []);

  // Helper function to complete truncated JSON
  const completeTruncatedJson = useCallback((jsonString: string): string => {
    let completed = jsonString.trim();
    
    // Count opening and closing braces/brackets
    const openBraces = (completed.match(/\{/g) || []).length;
    const closeBraces = (completed.match(/\}/g) || []).length;
    const openBrackets = (completed.match(/\[/g) || []).length;
    const closeBrackets = (completed.match(/\]/g) || []).length;
    
    // If we're in the middle of a string, try to close it
    if (completed.match(/"[^"]*$/)) {
      completed += '"';
    }
    
    // Add missing closing brackets/braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      completed += ']';
    }
    
    for (let i = 0; i < openBraces - closeBraces; i++) {
      completed += '}';
    }
    
    return completed;
  }, []);

  // Handle form submission - live AI generation
  const onSubmit = useCallback(async (data: DataGenerationFormData) => {
    if (isGenerating || isSubmitting) return;

    setIsSubmitting(true);
    setIsGenerating(true);
    setGenerationResult(null);
    setScrapedContent([]);
    setProgress(0);
    setProgressLabel('');
    setShowTerminal(true);

    try {
      // Scroll to terminal
      if (terminalRef.current) {
        terminalRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Create request data
      const requestData = {
        prompt: data.prompt,
        numRows: data.numRows,
        useWebData: data.useWebData,
        datasetName: data.datasetName,
      };

      // Start the generation process
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      let hasCompleted = false;
      const startTime = Date.now();
      const timeout = 300000; // 5 minutes timeout
      let lastDataTime = startTime;
      const maxSilenceTime = 60000; // 1 minute of silence before considering it failed

      while (true) {
        // Check for timeout
        if (Date.now() - startTime > timeout) {
          throw new Error('Generation timed out after 5 minutes');
        }

        // Check for silence timeout
        if (Date.now() - lastDataTime > maxSilenceTime) {
          throw new Error('Generation appears to have stopped responding');
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        lastDataTime = Date.now(); // Update last data time

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonString = line.substring(6);
              const parsedData = parseJsonSafely(jsonString);
              
              // Check if parsing failed and returned fallback error
              if (!parsedData || (parsedData.type === 'error' && parsedData.message === 'Failed to parse server response')) {
                console.warn('[Client] Skipping malformed JSON line:', line.substring(0, 100) + '...');
                continue; // Skip this line and continue processing
              }
              
              if (parsedData.type === 'progress') {
                setProgress(parsedData.percentage || 0);
                setProgressLabel(parsedData.message || '');
              } else if (parsedData.type === 'log' || parsedData.type === 'info') {
                // Log messages are handled by the terminal logger
                console.log('Generation log:', parsedData.message);
              } else if (parsedData.type === 'scraped_content') {
                if (parsedData.content) {
                  try {
                    const content = JSON.parse(parsedData.content);
                    setScrapedContent(prev => [...prev, {
                      content: content.content || content,
                      timestamp: new Date().toISOString()
                    }]);
                  } catch (e) {
                    setScrapedContent(prev => [...prev, {
                      content: parsedData.content,
                      timestamp: new Date().toISOString()
                    }]);
                  }
                }
              } else if (parsedData.type === 'complete') {
                if (parsedData.result && Array.isArray(parsedData.result.data)) {
                  setGenerationResult(parsedData.result);
                  setIsGenerating(false);
                  setIsSubmitting(false);
                  setProgress(100);
                  setProgressLabel('Generation complete!');
                  hasCompleted = true;
                  
                  toast({
                    title: "Data generation complete!",
                    description: `Successfully generated ${parsedData.result.data.length} rows of data.`,
                  });
                } else {
                  console.error('Invalid result data structure:', parsedData.result);
                  throw new Error('Invalid result data received from server');
                }
              } else if (parsedData.type === 'error') {
                throw new Error(parsedData.message || parsedData.error || 'Unknown error occurred');
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError, 'Line:', line);
              // Continue processing other lines even if one fails
            }
          }
        }
      }

      // If we didn't receive a complete signal, something went wrong
      if (!hasCompleted && !isGenerating) {
        throw new Error('Generation process ended unexpectedly');
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setIsSubmitting(false);
      setProgress(0);
      setProgressLabel('');
      
      toast({
        title: "Generation failed",
        description: error.message || "An error occurred during data generation.",
        variant: "destructive",
      });
    }
  }, [isGenerating, isSubmitting, toast, parseJsonSafely]);

  // Generate sample data based on prompt
  const generateSampleData = useCallback((prompt: string, numRows: number) => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Determine data type based on prompt keywords
    let schema: Array<{ name: string; type: string; description?: string }> = [];
    let data: Array<Record<string, any>> = [];

    if (lowerPrompt.includes('company') || lowerPrompt.includes('business')) {
      schema = [
        { name: 'name', type: 'string', description: 'Company name' },
        { name: 'industry', type: 'string', description: 'Industry sector' },
        { name: 'employees', type: 'number', description: 'Number of employees' },
        { name: 'revenue', type: 'number', description: 'Annual revenue in millions' },
        { name: 'location', type: 'string', description: 'Headquarters location' },
        { name: 'founded', type: 'number', description: 'Year founded' }
      ];

      const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Energy', 'Transportation'];
      const locations = ['New York', 'San Francisco', 'London', 'Tokyo', 'Berlin', 'Toronto', 'Sydney', 'Singapore'];
      const companyNames = ['TechCorp', 'DataFlow', 'CloudSync', 'InnovateLab', 'FutureSoft', 'QuantumTech', 'AISolutions', 'NextGen'];

      data = Array.from({ length: numRows }, (_, i) => ({
        name: `${companyNames[i % companyNames.length]} ${i + 1}`,
        industry: industries[Math.floor(Math.random() * industries.length)],
        employees: Math.floor(Math.random() * 10000) + 50,
        revenue: Math.floor(Math.random() * 1000) + 10,
        location: locations[Math.floor(Math.random() * locations.length)],
        founded: Math.floor(Math.random() * 30) + 1990
      }));
    } else if (lowerPrompt.includes('car') || lowerPrompt.includes('vehicle') || lowerPrompt.includes('automobile')) {
      schema = [
        { name: 'model', type: 'string', description: 'Car model' },
        { name: 'brand', type: 'string', description: 'Car brand' },
        { name: 'year', type: 'number', description: 'Model year' },
        { name: 'price', type: 'number', description: 'Price in thousands' },
        { name: 'fuel_type', type: 'string', description: 'Fuel type' },
        { name: 'horsepower', type: 'number', description: 'Engine horsepower' }
      ];

      const brands = ['Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Chevrolet', 'Nissan'];
      const models = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Crossover', 'Sports Car'];
      const fuelTypes = ['Gasoline', 'Electric', 'Hybrid', 'Diesel'];

      data = Array.from({ length: numRows }, (_, i) => ({
        model: `${models[i % models.length]} ${i + 1}`,
        brand: brands[Math.floor(Math.random() * brands.length)],
        year: Math.floor(Math.random() * 10) + 2015,
        price: Math.floor(Math.random() * 50) + 20,
        fuel_type: fuelTypes[Math.floor(Math.random() * fuelTypes.length)],
        horsepower: Math.floor(Math.random() * 300) + 100
      }));
    } else {
      // Generic data structure
      schema = [
        { name: 'id', type: 'number', description: 'Unique identifier' },
        { name: 'name', type: 'string', description: 'Item name' },
        { name: 'category', type: 'string', description: 'Item category' },
        { name: 'value', type: 'number', description: 'Numeric value' },
        { name: 'description', type: 'string', description: 'Item description' }
      ];

      const categories = ['Type A', 'Type B', 'Type C', 'Type D', 'Type E'];
      const descriptions = ['High quality', 'Standard grade', 'Premium', 'Basic', 'Professional'];

      data = Array.from({ length: numRows }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        value: Math.floor(Math.random() * 1000) + 10,
        description: descriptions[Math.floor(Math.random() * descriptions.length)]
      }));
    }

    return { data, schema };
  }, []);

  // Convert data to CSV format
  const convertToCSV = useCallback((data: Array<Record<string, any>>, schema: Array<{ name: string; type: string }>) => {
    if (!data || data.length === 0) return '';
    
    const headers = schema.map(col => col.name);
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape CSV values properly
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );
    
    return [headers.join(','), ...csvRows].join('\n');
  }, []);

  // Handle dataset saving
  const handleSaveDataset = useCallback(async () => {
    if (!generationResult || !watchedValues.datasetName) {
      toast({
        title: "Cannot save dataset",
        description: "Please ensure you have generated data and provided a dataset name.",
        variant: "destructive",
      });
      return;
    }

    // Validate generation result structure
    if (!generationResult.data || !Array.isArray(generationResult.data)) {
      toast({
        title: "Invalid data",
        description: "Generated data is not in the expected format.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/save-dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetName: watchedValues.datasetName,
          generationResult: generationResult,
          prompt: watchedValues.prompt,
          numRows: watchedValues.numRows,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const saveMessage = result.supabaseSave 
          ? `Dataset "${watchedValues.datasetName}" saved to both local storage and Supabase!`
          : `Dataset "${watchedValues.datasetName}" saved to local storage${result.supabaseError ? ` (Supabase: ${result.supabaseError})` : ''}`;
        
        toast({
          title: "Dataset saved!",
          description: saveMessage,
        });
        
        console.log('[Save Dataset] Result:', {
          localSave: result.localSave,
          supabaseSave: result.supabaseSave,
          supabaseError: result.supabaseError,
          filename: result.filename
        });
      } else {
        throw new Error(result.error || 'Failed to save dataset');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: error.message || "An error occurred while saving the dataset.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [generationResult, watchedValues, toast]);

  // Handle CSV download
  const handleDownloadCSV = useCallback(() => {
    if (!generationResult?.csv) {
      toast({
        title: "No data to download",
        description: "Please generate data first before downloading.",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = new Blob([generationResult.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${watchedValues.datasetName || 'dataset'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: "CSV file download has started.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the CSV file.",
        variant: "destructive",
      });
    }
  }, [generationResult, watchedValues.datasetName, toast]);

  // Reset form
  const handleReset = useCallback(() => {
    form.reset();
    setGenerationResult(null);
    setScrapedContent([]);
    setProgress(0);
    setProgressLabel('');
    setShowTerminal(false);
    setIsGenerating(false);
    setIsSubmitting(false);
  }, [form]);

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Dataset Name */}
            <div className="space-y-2">
              <Label htmlFor="datasetName">Dataset Name</Label>
              <Input
                id="datasetName"
                placeholder="Enter a name for your dataset"
                {...form.register('datasetName')}
                disabled={isGenerating}
              />
              {form.formState.errors.datasetName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.datasetName.message}
                </p>
              )}
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Data Description</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the data you want to generate (e.g., 'Generate a dataset of 100 tech companies with their names, locations, employee counts, and revenue')"
                className="min-h-[100px]"
                {...form.register('prompt')}
                disabled={isGenerating}
              />
              {form.formState.errors.prompt && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.prompt.message}
                </p>
              )}
            </div>

            {/* Number of Rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="numRows">Number of Rows: {watchedValues.numRows}</Label>
                <Badge variant="outline">{watchedValues.numRows} rows</Badge>
              </div>
              <Slider
                id="numRows"
                min={1}
                max={1000}
                step={1}
                value={[watchedValues.numRows]}
                onValueChange={([value]) => setValue('numRows', value)}
                disabled={isGenerating}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>1000</span>
              </div>
            </div>

            {/* Web Data Toggle */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="useWebData" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Use Web Data
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable to scrape real data from the web instead of generating synthetic data
                </p>
              </div>
              <Switch
                id="useWebData"
                checked={watchedValues.useWebData}
                onCheckedChange={(checked) => setValue('useWebData', checked)}
                disabled={isGenerating}
              />
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isGenerating || isSubmitting || !form.formState.isValid || !watchedValues.prompt.trim()}
              className="flex-1"
            >
              {isGenerating || isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSubmitting ? 'Starting...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate Data
                </>
              )}
            </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isGenerating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progressLabel}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terminal Logger */}
      {showTerminal && (
        <div ref={terminalRef}>
          <SimpleTerminalLogger
            isActive={isGenerating}
            requestData={{
              prompt: watchedValues.prompt,
              numRows: watchedValues.numRows,
              useWebData: watchedValues.useWebData,
            }}
            onComplete={(result) => {
              setGenerationResult(result);
              setIsGenerating(false);
            }}
            onError={(error) => {
              console.error('Generation error:', error);
              setIsGenerating(false);
            }}
            onScrapedContent={(content) => {
              setScrapedContent(prev => [...prev, {
                content,
                timestamp: new Date().toISOString()
              }]);
            }}
            onClose={() => setShowTerminal(false)}
          />
        </div>
      )}

      {/* Results Display */}
      {generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Data Preview</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {generationResult.data?.length || 0} rows
                    </Badge>
                    <Badge variant="outline">
                      {generationResult.schema?.length || 0} columns
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCSV}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDataset}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Dataset
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-[400px] w-full border rounded-md">
                  {generationResult.data && generationResult.data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {generationResult.schema?.map((column) => (
                              <TableHead key={column.name} className="whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-medium">{column.name}</span>
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {column.type}
                                  </span>
                                </div>
                              </TableHead>
                            )) || Object.keys(generationResult.data[0] || {}).map((key) => (
                              <TableHead key={key} className="whitespace-nowrap">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generationResult.data.slice(0, 50).map((row, index) => (
                            <TableRow key={index}>
                              {generationResult.schema?.map((column) => (
                                <TableCell key={column.name} className="max-w-[200px] truncate">
                                  <div className="truncate" title={String(row[column.name] || '')}>
                                    {String(row[column.name] || '')}
                                  </div>
                                </TableCell>
                              )) || Object.keys(generationResult.data[0] || {}).map((key) => (
                                <TableCell key={key} className="max-w-[200px] truncate">
                                  <div className="truncate" title={String(row[key] || '')}>
                                    {String(row[key] || '')}
                                  </div>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No data available to display
                    </div>
                  )}
                </ScrollArea>
                
                {generationResult.data && generationResult.data.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing first 50 rows of {generationResult.data.length} total rows
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="schema" className="space-y-4">
                <div className="space-y-2">
                  {generationResult.schema && generationResult.schema.length > 0 ? (
                    generationResult.schema.map((column, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <span className="font-medium">{column.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({column.type})
                          </span>
                        </div>
                        {column.description && (
                          <span className="text-sm text-muted-foreground">
                            {column.description}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No schema information available
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="raw" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CSV Data</span>
                    <Badge variant="outline">
                      {generationResult.csv ? `${generationResult.csv.split('\n').length - 1} lines` : '0 lines'}
                    </Badge>
                  </div>
                  <ScrollArea className="h-[400px] w-full border rounded-md">
                    {generationResult.csv ? (
                      <div className="p-4">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {generationResult.csv}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        No CSV data available
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
            
            {generationResult.feedback && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>AI Feedback:</strong> {generationResult.feedback}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scraped Content Display */}
      {scrapedContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Scraped Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full">
              <div className="space-y-3">
                {scrapedContent.map((item, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">Content {index + 1}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

