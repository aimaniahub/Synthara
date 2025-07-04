// src/app/dashboard/generate/components/DataGenerationClient.tsx
"use client";

import React, { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Lightbulb, Loader2, Sparkles, TableIcon, CheckCircle, Wand2, FileSpreadsheet, Download, Save, Globe, Brain, Search, Edit3, Eye, Shield, AlertTriangle, ThumbsUp, Info } from 'lucide-react';
import { recommendModel, type RecommendModelInput, type RecommendModelOutput } from '@/ai/flows/recommend-model';
import { generateData, type GenerateDataInput, type GenerateDataOutput } from '@/ai/flows/generate-data-flow';
import { generateFromWeb, type GenerateFromWebInput, type GenerateFromWebOutput } from '@/ai/flows/generate-from-web-flow';
import { enhancePrompt, type EnhancePromptInput, type EnhancePromptOutput } from '@/ai/flows/enhance-prompt-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logActivity, saveDataset } from '@/lib/supabase/actions';
import { LiveLogger } from '@/components/ui/live-logger';
import { dynamicContent, type ContentContext, type DynamicExample } from '@/services/dynamic-content-service';
import DynamicExamples from '@/components/ui/dynamic-examples';

const dataGenerationSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters long." }).max(2000, {message: "Prompt must be 2000 characters or less."}),
  numRows: z.coerce.number().min(1, "Must generate at least 1 row.").max(100, "Maximum 100 rows for current generation.").optional().default(10),
  datasetName: z.string().optional(),
  useWebData: z.boolean().optional().default(false),
});

type DataGenerationFormValues = z.infer<typeof dataGenerationSchema>;

export function DataGenerationClient() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedModel, setSuggestedModel] = useState<RecommendModelOutput | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerateDataOutput | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string>("");
  const [showLiveLogger, setShowLiveLogger] = useState(false);
  const [currentRequestData, setCurrentRequestData] = useState<any>(null);
  const [isGenerationInProgress, setIsGenerationInProgress] = useState(false);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState<string>("Describe the type of data you want to generate...");
  const [smartDefaults, setSmartDefaults] = useState<Record<string, any>>({});

  // Search query refinement states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchQueryReasoning, setSearchQueryReasoning] = useState<string>("");
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  const [isRefiningQuery, setIsRefiningQuery] = useState(false);
  const [isEditingSearchQuery, setIsEditingSearchQuery] = useState(false);
  const [editableSearchQuery, setEditableSearchQuery] = useState<string>("");
  const [searchTargetType, setSearchTargetType] = useState<string>("general");
  const [searchQualityScore, setSearchQualityScore] = useState<number>(7);

  // Content quality and transparency states
  const [scrapedContent, setScrapedContent] = useState<string>("");
  const [contentQuality, setContentQuality] = useState<any>(null);
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [dataSourceType, setDataSourceType] = useState<'real' | 'synthetic' | 'hybrid'>('synthetic');
  const [showDataSourceWarning, setShowDataSourceWarning] = useState(false);
  const [userChoice, setUserChoice] = useState<'auto' | 'extract' | 'generate'>('auto');

  // Additional ref-based guard to prevent any possibility of duplicate requests
  const isRequestActiveRef = useRef(false);
  const lastSubmissionTimeRef = useRef(0);

  // Memoize requestData to prevent unnecessary re-renders and multiple requests
  const memoizedRequestData = useMemo(() => {
    if (!currentRequestData) return null;
    return {
      prompt: currentRequestData.prompt,
      numRows: currentRequestData.numRows,
      useWebData: currentRequestData.useWebData || true,
    };
  }, [currentRequestData?.prompt, currentRequestData?.numRows, currentRequestData?.useWebData]);

  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<DataGenerationFormValues>({
    resolver: zodResolver(dataGenerationSchema),
    defaultValues: {
      prompt: "",
      numRows: 10,
      datasetName: "",
      useWebData: false,
    },
  });

  // Watch for prompt changes to update dynamic content
  const currentPrompt = form.watch("prompt");

  // Function to validate content quality
  const validateContentQuality = async (content: string, prompt: string, query?: string) => {
    try {
      const response = await fetch('/api/validate-content-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrapedContent: content,
          userPrompt: prompt,
          searchQuery: query
        })
      });

      if (!response.ok) {
        throw new Error('Failed to validate content quality');
      }

      const validation = await response.json();
      setContentQuality(validation);

      // Update data source type based on validation
      if (validation.extractionRecommendation === 'extract') {
        setDataSourceType('real');
      } else if (validation.extractionRecommendation === 'hybrid') {
        setDataSourceType('hybrid');
      } else {
        setDataSourceType('synthetic');
      }

      return validation;
    } catch (error) {
      console.error('Content quality validation failed:', error);
      return null;
    }
  };

  // Function to refine search query
  const refineSearchQuery = async (prompt: string) => {
    if (!prompt || prompt.trim().length < 13) {
      setShowSearchPreview(false);
      return;
    }

    setIsRefiningQuery(true);
    try {
      const response = await fetch('/api/refine-search-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userPrompt: prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to refine search query');
      }

      const result = await response.json();
      setSearchQuery(result.searchQuery);
      setSearchQueryReasoning(result.reasoning);
      setSearchTargetType(result.targetType || 'general');
      setSearchQualityScore(result.qualityScore || 7);
      setEditableSearchQuery(result.searchQuery);
      setShowSearchPreview(true);

      // Show warning if quality score is low
      if (result.qualityScore < 6) {
        setShowDataSourceWarning(true);
      }
    } catch (error: any) {
      console.error('Search query refinement failed:', error);
      // Don't show error to user, just don't show preview
      setShowSearchPreview(false);
    } finally {
      setIsRefiningQuery(false);
    }
  };

  // Update dynamic content based on user input
  useEffect(() => {
    const context: ContentContext = {
      userPrompt: currentPrompt,
    };

    // Update placeholder text
    const placeholderData = dynamicContent.generatePlaceholder(context);
    setDynamicPlaceholder(placeholderData.text);

    // Update smart defaults
    const defaults = dynamicContent.generateSmartDefaults(context);
    setSmartDefaults(defaults);

    // Trigger search query refinement if prompt is long enough and web data is enabled
    if (currentPrompt && currentPrompt.trim().length >= 13 && form.watch("useWebData")) {
      const timeoutId = setTimeout(() => {
        refineSearchQuery(currentPrompt);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    } else {
      setShowSearchPreview(false);
    }

    // Auto-update form defaults if user hasn't manually changed them
    if (currentPrompt && currentPrompt.length > 20) {
      const currentNumRows = form.getValues("numRows");
      const currentUseWebData = form.getValues("useWebData");
      const currentDatasetName = form.getValues("datasetName");

      // Only update if user hasn't manually changed from defaults
      if (currentNumRows === 10 || currentNumRows === smartDefaults.numRows) {
        form.setValue("numRows", defaults.numRows);
      }

      if (!currentUseWebData && defaults.useWebData) {
        form.setValue("useWebData", defaults.useWebData);
      }

      if (!currentDatasetName && defaults.datasetName) {
        form.setValue("datasetName", defaults.datasetName);
      }
    }
  }, [currentPrompt, form]);

  // Handle example selection
  const handleExampleSelect = (example: DynamicExample) => {
    form.setValue("prompt", example.prompt);

    // Apply smart defaults for the example
    const context: ContentContext = {
      userPrompt: example.prompt,
    };
    const defaults = dynamicContent.generateSmartDefaults(context);

    form.setValue("numRows", defaults.numRows);
    form.setValue("useWebData", defaults.useWebData);
    if (defaults.datasetName) {
      form.setValue("datasetName", defaults.datasetName);
    }
  };

  // Handle live logger completion
  const handleLiveLoggerComplete = async (result: GenerateDataOutput) => {
    console.log('[DataGeneration] Generation completed, clearing guards');
    setIsGenerating(false);
    setIsGenerationInProgress(false);
    isRequestActiveRef.current = false;
    setShowLiveLogger(false);
    setCurrentRequestData(null);

    if (!result || !result.generatedRows || result.generatedRows.length === 0) {
      toast({
        title: "Generation Failed",
        description: "No data was generated. Please try a different prompt.",
        variant: "destructive",
      });
      return;
    }

    setGenerationResult(result);

    // Auto-generate dataset name
    const autoName = `Dataset for "${currentRequestData?.prompt?.substring(0, 30)}${currentRequestData?.prompt?.length > 30 ? '...' : ''}" - ${new Date().toLocaleDateString()}`;
    setDatasetName(autoName);
    form.setValue("datasetName", autoName);

    toast({
      title: "Data Generated Successfully!",
      description: `Your dataset with ${result.generatedRows.length} rows is ready.`,
      variant: "default",
    });

    await logActivity({
      activityType: 'DATA_GENERATION',
      description: `Generated ${result.generatedRows.length} rows for: "${currentRequestData?.prompt?.substring(0, 50)}${currentRequestData?.prompt?.length > 50 ? '...' : ''}"`,
      details: {
        prompt: currentRequestData?.prompt,
        numRows: result.generatedRows.length,
        feedback: result.feedback,
        columns: result.detectedSchema.length,
        dataSourcePreference: 'web_scraping',
        generationMode: 'Live Web Data',
      },
      status: result.generatedRows.length > 0 ? "COMPLETED" : "COMPLETED_EMPTY"
    });
  };

  // Handle scraped content from live logger
  const handleScrapedContent = async (content: string) => {
    setScrapedContent(content);

    // Validate content quality
    const validation = await validateContentQuality(content, currentRequestData?.prompt || '', searchQuery);
    if (validation) {
      console.log('Content quality validation:', validation);
    }
  };

  // Handle live logger error
  const handleLiveLoggerError = (error: string) => {
    // Only handle critical errors that actually stop the process
    const isCriticalError = error && (
      error.includes('API key') ||
      error.includes('authentication') ||
      error.includes('Failed during web search') ||
      error.includes('No relevant search results found')
    );

    if (isCriticalError) {
      console.log('[DataGeneration] Critical error occurred, clearing guards');
      setIsGenerating(false);
      setIsGenerationInProgress(false);
      isRequestActiveRef.current = false;
      setShowLiveLogger(false);
      setCurrentRequestData(null);
      setGenerationError(error);
      toast({
        title: "Generation Failed",
        description: error,
        variant: "destructive",
        duration: 9000,
      });
    } else {
      // For non-critical errors, just log them but don't stop the process
      console.log('Non-critical error (process continues):', error);
      // Don't show error toast or stop the generation
    }
  };

  const onSubmit: SubmitHandler<DataGenerationFormValues> = async (data) => {
    const now = Date.now();
    console.log('[DataGeneration] onSubmit called', {
      prompt: data.prompt.substring(0, 30),
      numRows: data.numRows,
      isGenerationInProgress,
      isRequestActiveRef: isRequestActiveRef.current,
      timeSinceLastSubmission: now - lastSubmissionTimeRef.current,
      timestamp: new Date().toISOString()
    });

    // CRITICAL: Prevent multiple concurrent requests to save API quotas
    // Add debounce: ignore requests within 1 second of each other
    if (isGenerationInProgress || isRequestActiveRef.current || (now - lastSubmissionTimeRef.current < 1000)) {
      console.log('[DataGeneration] Request already in progress, ignoring duplicate submission', {
        isGenerationInProgress,
        isRequestActiveRef: isRequestActiveRef.current
      });
      toast({
        title: "Generation in Progress",
        description: "Please wait for the current generation to complete.",
        variant: "default"
      });
      return;
    }

    console.log('[DataGeneration] Starting new generation request');
    lastSubmissionTimeRef.current = now;
    setIsGenerationInProgress(true);
    isRequestActiveRef.current = true;
    setIsGenerating(true);
    setGenerationResult(null);
    setGenerationError(null);
    setSuggestedModel(null);

    const generationMode = data.useWebData ? "Live Web Data" : "AI Knowledge";

    if (data.useWebData) {
      // Use live web data generation with refined search query
      const requestDataWithSearch = {
        ...data,
        refinedSearchQuery: searchQuery || data.prompt // Use refined query if available, fallback to original prompt
      };

      setShowLiveLogger(true);
      setCurrentRequestData(requestDataWithSearch);

      toast({
        title: "Starting Web Data Generation...",
        description: searchQuery
          ? `Searching the web for: "${searchQuery}"`
          : "Searching the web and extracting real-time data for your request."
      });

      return; // The live logger will handle the rest
    }

    // Use traditional flow for AI generation
    toast({
      title: "Generating Data...",
      description: `Please wait while we generate your dataset using ${generationMode}.`
    });

    startTransition(async () => {
      try {
        const result = await generateData({
          prompt: data.prompt,
          numRows: data.numRows || 10,
        });

        setGenerationResult(result);

        // Auto-generate dataset name from prompt
        const words = data.prompt.split(' ').slice(0, 3);
        const autoName = words.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '') + '_dataset';
        setDatasetName(autoName);
        form.setValue("datasetName", autoName);

        toast({
          title: "Data Generated Successfully!",
          description: `Generated ${result.generatedRows.length} rows using ${generationMode}.`,
          variant: "default"
        });

        await logActivity({
          activityType: 'DATA_GENERATION',
          description: `Generated ${result.generatedRows.length} rows using ${generationMode}`,
          details: {
            prompt: data.prompt,
            numRows: result.generatedRows.length,
            feedback: result.feedback,
            columns: result.detectedSchema.length,
            dataSourcePreference: 'synthetic',
            generationMode,
          },
          status: result.generatedRows.length > 0 ? "COMPLETED" : "COMPLETED_EMPTY"
        });

      } catch (error: any) {
        setGenerationError(error.message);
        toast({
          title: "Generation Failed",
          description: error.message || "An unexpected error occurred during data generation.",
          variant: "destructive",
          duration: 9000,
        });
      } finally {
        console.log('[DataGeneration] Generation process finished, clearing guards');
        setIsGenerating(false);
        setIsGenerationInProgress(false);
        isRequestActiveRef.current = false;
      }
    });
  };

  const handleSaveDataset = async () => {
    if (!generationResult || !generationResult.generatedRows || generationResult.generatedRows.length === 0) {
      toast({
        title: "No Data to Save",
        description: "Please generate data first before saving.",
        variant: "destructive"
      });
      return;
    }

    if (!datasetName.trim()) {
      toast({
        title: "Dataset Name Required",
        description: "Please enter a name for your dataset.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    startTransition(async () => {
      try {
        await saveDataset({
          datasetName: datasetName.trim(),
          generationResult: generationResult,
          prompt: form.getValues("prompt") || "",
          numRows: form.getValues("numRows") || 10,
        });

        toast({
          title: "Dataset Saved Successfully!",
          description: `"${datasetName}" has been saved to your datasets.`,
          variant: "default"
        });

        await logActivity({
          activityType: 'DATASET_SAVED',
          description: `Saved dataset "${datasetName}" with ${generationResult.generatedRows.length} rows`,
          details: {
            datasetName: datasetName,
            prompt: form.getValues("prompt"),
            numRows: generationResult.generatedRows.length,
            columns: generationResult.detectedSchema.length,
          },
          status: "COMPLETED"
        });

      } catch (error: any) {
        console.error("Error saving dataset:", error);
        toast({ title: "Save Failed", description: error.message || "An unexpected error occurred while saving.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started", description: `${filename} is being downloaded.`, variant: "default"});
  };

  // Main component render
  return (
    <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-3 items-start">
      <form
        onSubmit={(e) => {
          if (isGenerationInProgress || isRequestActiveRef.current) {
            console.log('[DataGeneration] Form submission prevented - request in progress');
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
          return form.handleSubmit(onSubmit)(e);
        }}
        className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8"
        style={{ pointerEvents: isGenerationInProgress ? 'none' : 'auto' }}
      >
        <div className="glass-card p-6">
          <div className="mb-6">
            <h2 className="font-headline text-xl sm:text-2xl lg:text-3xl text-white mb-2">Describe Your Data Needs</h2>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-2">
                <Label htmlFor="prompt" className="text-base sm:text-lg font-semibold text-white">
                  What data do you want to generate?
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    const currentPrompt = form.getValues("prompt");
                    if (!currentPrompt || currentPrompt.trim().length < 10) {
                      toast({
                        title: "Prompt Too Short",
                        description: "Please enter at least 10 characters before enhancing.",
                        variant: "destructive"
                      });
                      return;
                    }

                    setIsEnhancing(true);
                    try {
                      const input: EnhancePromptInput = { currentPrompt: currentPrompt };
                      const result = await enhancePrompt(input);
                      form.setValue("prompt", result.enhancedPrompt);
                      toast({
                        title: "Prompt Enhanced!",
                        description: "Your prompt has been improved with AI suggestions.",
                        variant: "default"
                      });
                    } catch (error: any) {
                      toast({
                        title: "Enhancement Failed",
                        description: error.message || "Could not enhance the prompt.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsEnhancing(false);
                    }
                  }}
                  disabled={isGenerating || isEnhancing}
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Enhance Prompt
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="prompt"
                {...form.register("prompt")}
                placeholder={dynamicPlaceholder}
                rows={4}
                className="mt-2 text-sm sm:text-base shadow-sm"
                disabled={isGenerating}
              />
              {form.formState.errors.prompt && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.prompt.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Label htmlFor="numRows" className="text-base font-semibold text-white">Number of Rows</Label>
                <Input
                  id="numRows"
                  type="number"
                  {...form.register("numRows", { valueAsNumber: true })}
                  min={1}
                  max={100}
                  className="mt-2 shadow-sm"
                  disabled={isGenerating}
                />
                {form.formState.errors.numRows && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.numRows.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="datasetName" className="text-base font-semibold text-white">Dataset Name (Optional)</Label>
                <Input
                  id="datasetName"
                  {...form.register("datasetName")}
                  placeholder="my_dataset"
                  className="mt-2 shadow-sm"
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="useWebData"
                  {...form.register("useWebData")}
                  disabled={isGenerating}
                />
                <Label htmlFor="useWebData" className="text-base font-semibold text-white cursor-pointer">
                  Use Live Web Data
                </Label>
                <div className="flex items-center space-x-1">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Real-time data extraction</span>
                </div>
              </div>

              {/* Search Query Preview */}
              {showSearchPreview && searchQuery && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Optimized Search Query
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          Quality: {searchQualityScore}/10
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingSearchQuery(!isEditingSearchQuery)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      {isEditingSearchQuery ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    </Button>
                  </div>

                  {isEditingSearchQuery ? (
                    <div className="space-y-2">
                      <Input
                        value={editableSearchQuery}
                        onChange={(e) => setEditableSearchQuery(e.target.value)}
                        className="text-sm"
                        placeholder="Edit search query..."
                      />
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSearchQuery(editableSearchQuery);
                            setIsEditingSearchQuery(false);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Apply
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditableSearchQuery(searchQuery);
                            setIsEditingSearchQuery(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-800 dark:text-blue-200 font-mono bg-white dark:bg-slate-800 p-2 rounded border">
                        "{searchQuery}"
                      </p>
                      {searchQueryReasoning && (
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <Info className="inline h-3 w-3 mr-1" />
                          {searchQueryReasoning}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isRefiningQuery && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Optimizing search query for better results...</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isGenerating || isGenerationInProgress}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Data
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-6 lg:space-y-8">
        {/* Dynamic Examples */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
              Quick Start Examples
            </CardTitle>
            <CardDescription>Get inspired with these example prompts</CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicExamples
              context={{ userPrompt: currentPrompt }}
              onExampleSelect={handleExampleSelect}
              disabled={isGenerating}
            />
          </CardContent>
        </Card>

        {/* Model Recommendation */}
        {!isGenerating && currentPrompt && currentPrompt.length > 20 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                <Brain className="mr-2 h-5 w-5 text-purple-500" />
                AI Recommendations
              </CardTitle>
              <CardDescription>Get personalized suggestions for your data generation</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  setIsSuggesting(true);
                  try {
                    const input: RecommendModelInput = { prompt: currentPrompt };
                    const result = await recommendModel(input);
                    setSuggestedModel(result);
                    toast({
                      title: "Recommendations Ready!",
                      description: "AI has analyzed your prompt and provided suggestions.",
                      variant: "default"
                    });
                  } catch (error: any) {
                    toast({
                      title: "Recommendation Failed",
                      description: error.message || "Could not get AI recommendations.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsSuggesting(false);
                  }
                }}
                disabled={isSuggesting}
              >
                {isSuggesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get AI Suggestions
                  </>
                )}
              </Button>

              {suggestedModel && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Recommended Approach
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                      {suggestedModel.reasoning}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedModel.suggestedColumns.map((col, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Live Logger Modal */}
      {showLiveLogger && memoizedRequestData && (
        <LiveLogger
          requestData={memoizedRequestData}
          onComplete={handleLiveLoggerComplete}
          onError={handleLiveLoggerError}
          onScrapedContent={handleScrapedContent}
        />
      )}
    </div>
  );
}
