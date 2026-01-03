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
  Loader2,
  Wand2,
  Brain,
  Settings2,
  Sparkles,
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
  const [isAnalyzingScraped, setIsAnalyzingScraped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementInfo, setEnhancementInfo] = useState<{ enhancedPrompt: string; reasoning?: string } | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [hasMirroredToBackend, setHasMirroredToBackend] = useState(false);

  const terminalLoggerRef = useRef<any>(null);
  const jobStartAtRef = useRef<number | null>(null);
  const streamedRowCountRef = useRef<number>(0);

  const isBackendCsvPhase = hasMirroredToBackend && isGenerating;

  const form = useForm<DataGenerationFormData>({
    resolver: zodResolver(dataGenerationSchema),
    defaultValues: {
      prompt: '',
      numRows: 25,
      useWebData: false,
      datasetName: '',
    },
  });

  const { watch, setValue, getValues, trigger } = form;
  const watchedValues = watch();

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Reset state when component unmounts
      setIsGenerating(false);
      setProgress(0);
      setProgressLabel('');
      setIsAnalyzingScraped(false);
    };
  }, []);

  useEffect(() => {
    if (enhancementInfo && watchedValues.prompt !== enhancementInfo.enhancedPrompt) {
      setEnhancementInfo(null);
    }
  }, [watchedValues.prompt, enhancementInfo]);

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

  const handleEnhancePrompt = useCallback(async () => {
    if (isEnhancing) return;

    const currentPrompt = (getValues('prompt') || '').trim();

    if (!currentPrompt || currentPrompt.length < 5) {
      toast({
        title: 'Enter more details',
        description: 'Provide at least 5 characters so the AI can enhance your prompt.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsEnhancing(true);

      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload.enhancedPrompt) {
        const errorMessage = payload?.error || `Failed to enhance prompt (status ${response.status})`;
        throw new Error(errorMessage);
      }

      setValue('prompt', payload.enhancedPrompt, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      await trigger('prompt');

      setEnhancementInfo({
        enhancedPrompt: payload.enhancedPrompt,
        reasoning: payload.reasoning,
      });

      toast({
        title: 'Prompt enhanced',
        description: 'We refined your data description for better results.',
      });
    } catch (error: any) {
      console.error('Enhance prompt error:', error);
      toast({
        title: 'Enhancement failed',
        description: error?.message || 'Unable to enhance the prompt right now.',
        variant: 'destructive',
      });
    } finally {
      setIsEnhancing(false);
    }
  }, [getValues, isEnhancing, setValue, toast, trigger]);

  const handlePrepareSyntharaJob = useCallback(async () => {
    return;
  }, []);

  // Handle form submission - live AI generation
  const onSubmit = useCallback(async (data: DataGenerationFormData) => {
    if (isGenerating || isSubmitting) return;

    setIsSubmitting(true);
    setIsGenerating(true);
    setHasMirroredToBackend(false);
    setGenerationResult(null);
    setScrapedContent([]);
    setProgress(0);
    setProgressLabel('');
    setIsAnalyzingScraped(false);
    setShowTerminal(true);
    streamedRowCountRef.current = 0;

    try {
      // Scroll to terminal with a slight delay to ensure it's rendered
      setTimeout(() => {
        if (terminalLoggerRef.current?.scrollIntoView) {
          terminalLoggerRef.current.scrollIntoView();
        }
      }, 100);

      // Create request data for internal generation pipeline
      const requestData = {
        prompt: data.prompt,
        numRows: data.numRows,
        useWebData: data.useWebData,
        datasetName: data.datasetName,
      };

      // Start the generation process using internal pipeline
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
      const timeout = 900000; // 15 minutes timeout
      let lastDataTime = startTime;
      const maxSilenceTime = 300000; // 5 minutes of silence before considering it failed

      while (true) {
        // Check for timeout
        if (Date.now() - startTime > timeout) {
          throw new Error('Generation timed out after 15 minutes');
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

              // Skip empty lines or lines with just whitespace
              if (!jsonString.trim()) {
                continue;
              }

              const parsedData = parseJsonSafely(jsonString);

              // Check if parsing failed and returned fallback error
              if (!parsedData || (parsedData.type === 'error' && parsedData.message === 'Failed to parse server response')) {
                console.warn('[Client] Skipping malformed JSON line:', line.substring(0, 100) + '...');
                continue; // Skip this line and continue processing
              }

              // Forward all stream events to the terminal logger
              if (terminalLoggerRef.current) {
                terminalLoggerRef.current.handleStreamEvent(parsedData);
              }

              if (parsedData.type === 'progress') {
                setProgress(parsedData.percentage || 0);
                if (!hasMirroredToBackend) {
                  setProgressLabel(parsedData.message || '');
                }

                if (parsedData.step === 'Scraped Analysis') {
                  setIsAnalyzingScraped(true);
                }
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
              } else if (parsedData.type === 'rows_chunk') {
                // Receiving structured rows means analysis phase is over
                setIsAnalyzingScraped(false);

                const rowsArray = Array.isArray(parsedData.rows) ? parsedData.rows : [];
                const rowsInChunk = rowsArray.length;
                const requestedRows = typeof parsedData.requestedRows === 'number' && parsedData.requestedRows > 0
                  ? parsedData.requestedRows
                  : data.numRows;

                if (rowsInChunk > 0 && requestedRows > 0) {
                  streamedRowCountRef.current += rowsInChunk;
                  const safeTotal = Math.max(requestedRows, streamedRowCountRef.current);
                  const percentage = Math.min(100, Math.round((streamedRowCountRef.current / safeTotal) * 100));

                  setProgress(percentage);
                  setProgressLabel(
                    `Received ${streamedRowCountRef.current}/${requestedRows} rows (chunk size ${rowsInChunk})`
                  );

                  console.log('[Client] rows_chunk event', {
                    offset: parsedData.offset,
                    rowsInChunk,
                    streamedSoFar: streamedRowCountRef.current,
                    requestedRows,
                    totalRows: parsedData.totalRows,
                  });
                }
              } else if (parsedData.type === 'complete') {
                setIsAnalyzingScraped(false);

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
                  // Handle cases where result is undefined or doesn't have the expected structure
                  console.warn('Complete message received but result data is missing or invalid:', {
                    hasResult: !!parsedData.result,
                    resultType: typeof parsedData.result,
                    resultKeys: parsedData.result ? Object.keys(parsedData.result) : 'N/A',
                    message: parsedData.message || 'No message'
                  });

                  // If this is just a stream completion message without data, don't treat it as an error
                  if (parsedData.message === 'Stream completed' || !parsedData.result) {
                    console.log('Stream completed without data - this is normal for some completion messages');
                    // Don't throw an error, just log and continue
                  } else {
                    throw new Error('Invalid result data received from server');
                  }
                }
              } else if (parsedData.type === 'error') {
                // Treat as non-fatal to avoid aborting the entire stream on recoverable errors
                const msg = parsedData.message || parsedData.error || 'An issue occurred during generation';
                console.warn('[Client] Non-fatal error event:', msg);
                toast({
                  title: 'Generation warning',
                  description: msg,
                  variant: 'destructive',
                });
                // Continue processing subsequent events
                continue;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError, 'Line:', line);
              // Continue processing other lines even if one fails
              // Don't throw here as it would stop the entire stream processing
            }
          }
        }
      }

      // If we didn't receive a complete signal, treat the end of the stream as
      // a graceful finish but log a warning and clear loading state.
      if (!hasCompleted) {
        console.warn('[Client] Stream ended without explicit completion event');
        setIsGenerating(false);
        setIsSubmitting(false);
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setIsSubmitting(false);
      setProgress(0);
      setProgressLabel('');
      setIsAnalyzingScraped(false);

      toast({
        title: "Generation failed",
        description: error.message || "An error occurred during data generation.",
        variant: "destructive",
      });
    }
  }, [isGenerating, isSubmitting, toast, parseJsonSafely, hasMirroredToBackend]);



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
          isPublic,
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
  }, [generationResult, watchedValues, toast, isPublic]);

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
    setEnhancementInfo(null);
    setHasMirroredToBackend(false);
    setIsAnalyzingScraped(false);
  }, [form]);

  return (
    <div className="space-y-10 w-full animate-in fade-in duration-700">
      {/* Full-Width Configuration Form */}
      <Card className="modern-card border-none shadow-sm overflow-hidden bg-background/40 backdrop-blur-sm">
        <CardHeader className="pb-6 pt-8 px-8 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Synthesis Protocol</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {/* Left Column in Form: Name & Scope */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="datasetName" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Dataset Identity</Label>
                  <Input
                    id="datasetName"
                    placeholder="e.g., Global Financial Matrix 2025"
                    className="h-14 rounded-xl bg-secondary/20 border-border/50 focus:ring-primary/20 transition-all text-sm font-bold px-5"
                    {...form.register('datasetName')}
                    disabled={isGenerating}
                  />
                  {form.formState.errors.datasetName && (
                    <p className="text-[10px] font-bold text-destructive px-1">{form.formState.errors.datasetName.message}</p>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Node Count</Label>
                    <span className="text-xs font-black text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 tracking-widest">
                      {watchedValues.numRows.toLocaleString()} RECORDS
                    </span>
                  </div>
                  <div className="px-1">
                    <Slider
                      value={[watchedValues.numRows]}
                      onValueChange={([val]) => setValue('numRows', val)}
                      max={250}
                      min={1}
                      step={1}
                      disabled={isGenerating}
                      className="py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-secondary/10 border border-border/50 group hover:border-primary/20 transition-all duration-300">
                  <div className="space-y-1">
                    <Label htmlFor="useWebData" className="text-sm font-black text-foreground cursor-pointer flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" /> Web Intelligence
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Ground synthesis in empirical data</p>
                  </div>
                  <Switch
                    id="useWebData"
                    checked={watchedValues.useWebData}
                    onCheckedChange={(val) => setValue('useWebData', val)}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Middle & Right Column: Prompt / Intelligence Scope */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <Label htmlFor="prompt" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Intelligence Scope</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={isGenerating || isEnhancing || !watchedValues.prompt?.trim()}
                    className="h-8 px-4 text-[10px] text-primary font-black uppercase tracking-widest hover:bg-primary/10 rounded-lg transition-all"
                  >
                    {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Wand2 className="h-3 w-3 mr-2" />}
                    Optimise Engine
                  </Button>
                </div>
                <div className="relative group">
                  <Textarea
                    id="prompt"
                    placeholder="Describe the architectural metadata and domain patterns you require..."
                    className="min-h-[220px] text-base leading-relaxed resize-none rounded-2xl bg-secondary/20 border-border/50 focus:ring-primary/20 transition-all scrollbar-hide p-6 font-medium"
                    {...form.register('prompt')}
                    disabled={isGenerating}
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] font-black text-muted-foreground/40 pointer-events-none uppercase tracking-widest">
                    {(watchedValues.prompt || '').length} Bytes
                  </div>
                </div>
                {form.formState.errors.prompt && (
                  <p className="text-[10px] font-bold text-destructive flex items-center gap-2 px-1">
                    <AlertCircle className="w-4 h-4" /> {form.formState.errors.prompt.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 px-1">
              <Button
                type="submit"
                disabled={isGenerating || isSubmitting || !form.formState.isValid || !watchedValues.prompt.trim()}
                className="flex-1 h-14 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary"
              >
                {isGenerating ? (
                  <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Forge Active</>
                ) : (
                  <><Play className="mr-3 h-5 w-5 fill-current" /> Initiate Data Flow</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isGenerating}
                className="h-14 w-14 rounded-2xl border-border/50 p-0 hover:bg-secondary/50 transition-all"
                title="Reset Forge"
              >
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section (Only visible during/after generation) */}
      <div className="space-y-6">
        {/* Compact Progress Card */}
        {isGenerating && (
          <Card className="modern-card border-none shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    {progressLabel || "Synthesis in progress..."}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Globe className={`w-3 h-3 ${watchedValues.useWebData ? 'text-primary' : ''}`} />
                    {streamedRowCountRef.current} / {watchedValues.numRows} Rows Generated
                  </div>
                </div>
                <div className="text-2xl font-black text-primary tabular-nums">{progress}%</div>
              </div>
              <Progress value={progress} className="h-2 bg-secondary rounded-full" />
            </CardContent>
          </Card>
        )}

        {/* Operational Logs Terminal */}
        {showTerminal && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational Logs
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowTerminal(false)} className="h-5 text-[9px] font-bold hover:bg-secondary">HIDE LOGS</Button>
            </div>
            <div className="rounded-xl overflow-hidden border border-border/50">
              <SimpleTerminalLogger
                ref={terminalLoggerRef}
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
                  setIsSubmitting(false);
                }}
                onScrapedContent={(content) => {
                  setScrapedContent(prev => [...prev, {
                    content,
                    timestamp: new Date().toISOString()
                  }]);
                }}
              />
            </div>
          </div>
        )}

        {/* Well-Structured Results Matrix */}
        {generationResult && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
            {/* AI Analysis Commentary */}
            {generationResult.feedback && (
              <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 space-y-3 relative overflow-hidden group">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Brain className="size-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Intelligence Synopsis</h4>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed italic font-bold relative z-10 pl-11">
                  "{generationResult.feedback}"
                </p>
                <Sparkles className="absolute -right-4 -bottom-4 size-32 text-primary/5 group-hover:text-primary/10 transition-colors duration-700" />
              </div>
            )}

            <Card className="modern-card border-none shadow-sm overflow-hidden bg-background/40 backdrop-blur-md">
              <CardHeader className="bg-muted/20 border-b border-border/10 px-8 py-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-2xl font-black tracking-tight text-foreground uppercase">Synthesis Manifest</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-500 bg-emerald-500/5 h-6 px-3">
                        {generationResult.data?.length || 0} RECORDS
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-blue-500/20 text-blue-500 bg-blue-500/5 h-6 px-3">
                        {generationResult.schema?.length || 0} ATTRIBUTES
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleDownloadCSV} className="h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest border-border/50 hover:bg-secondary/50 transition-all">
                      <Download className="mr-3 h-4 w-4" /> Download CSV
                    </Button>
                    <Button onClick={handleSaveDataset} disabled={isSaving} className="h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 transition-all">
                      {isSaving ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Save className="mr-3 h-4 w-4" />}
                      Vault Records
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="preview" className="w-full">
                  <div className="flex items-center justify-between border-b border-border/10 bg-muted/10 px-8">
                    <TabsList className="h-14 bg-transparent rounded-none p-0 gap-8">
                      <TabsTrigger value="preview" className="text-xs font-black uppercase tracking-widest h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground bg-transparent transition-all px-0">Data Matrix</TabsTrigger>
                      <TabsTrigger value="schema" className="text-xs font-black uppercase tracking-widest h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground bg-transparent transition-all px-0">Architecture Map</TabsTrigger>
                      <TabsTrigger value="raw" className="text-xs font-black uppercase tracking-widest h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground bg-transparent transition-all px-0">Raw Protocol</TabsTrigger>
                    </TabsList>

                    <div className="hidden sm:flex items-center gap-2 p-2 px-4 rounded-xl bg-secondary/30 border border-border/30">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Immutable</span>
                    </div>
                  </div>

                  <TabsContent value="preview" className="m-0">
                    <ScrollArea className="h-[600px] w-full custom-scrollbar">
                      {generationResult.data && generationResult.data.length > 0 ? (
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="border-border/30 hover:bg-transparent">
                              {generationResult.schema?.map((column: { name: string, type: string }) => (
                                <TableHead key={column.name} className="px-8 py-5 h-16 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-[0.1em] text-foreground">{column.name}</span>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/20 text-primary h-5 px-1.5 bg-primary/5">{column.type}</Badge>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generationResult.data.slice(0, 100).map((row: Record<string, any>, index: number) => (
                              <TableRow key={index} className="border-border/10 hover:bg-primary/[0.02] transition-colors group">
                                {generationResult.schema?.map((column: { name: string, type: string }) => (
                                  <TableCell key={column.name} className="px-8 py-5 text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors max-w-[300px] truncate">
                                    {row[column.name] === null || row[column.name] === undefined || String(row[column.name]).trim() === '' ? (
                                      <span className="opacity-30 italic font-medium">null</span>
                                    ) : (
                                      String(row[column.name])
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/20 italic">No Matrix Data Found</div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="schema" className="p-10 m-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {generationResult.schema?.map((column: any, index: number) => (
                        <div key={index} className="p-6 rounded-2xl bg-secondary/20 border border-border/50 group hover:border-primary/40 transition-all duration-300 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black uppercase tracking-wider text-foreground">{column.name}</p>
                            <Badge variant="secondary" className="text-[10px] font-black tracking-widest bg-primary/10 text-primary border-none">{column.type}</Badge>
                          </div>
                          {column.description && <p className="text-sm text-muted-foreground leading-relaxed font-bold group-hover:text-foreground/80 transition-colors uppercase tracking-tight text-[10px]">{column.description}</p>}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="raw" className="m-0">
                    <ScrollArea className="h-[600px] w-full bg-black/40 p-10 custom-scrollbar">
                      <pre className="text-xs font-mono text-emerald-400/80 leading-loose">
                        {generationResult.csv}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
