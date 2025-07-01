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
import { Lightbulb, Loader2, Sparkles, TableIcon, CheckCircle, Wand2, FileSpreadsheet, Download, Save, Globe, Brain } from 'lucide-react';
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
  const [isProcessingFinalData, setIsProcessingFinalData] = useState(false);
  const [isGenerationInProgress, setIsGenerationInProgress] = useState(false);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState<string>("Describe the type of data you want to generate...");
  const [smartDefaults, setSmartDefaults] = useState<Record<string, any>>({});

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
      // Use live web data generation
      setShowLiveLogger(true);
      setCurrentRequestData(data);

      toast({
        title: "Starting Web Data Generation...",
        description: "Searching the web and extracting real-time data for your request."
      });

      return; // The live logger will handle the rest
    } else {
      // Use traditional flow for AI generation
      toast({
        title: "Generating Data...",
        description: `Please wait while we generate your dataset using ${generationMode}.`
      });
    }

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
        <Card className="shadow-xl">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="font-headline text-xl sm:text-2xl lg:text-3xl">Describe Your Data Needs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-2">
                <Label htmlFor="prompt" className="text-base sm:text-lg font-semibold">
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
                  {isEnhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                  Enhance with AI
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
                <Label htmlFor="numRows" className="text-base sm:text-lg font-semibold">Number of Rows</Label>
                <Input
                  id="numRows"
                  type="number"
                  {...form.register("numRows")}
                  className="mt-2 text-sm sm:text-base shadow-sm"
                  disabled={isGenerating}
                  min={1}
                  max={100}
                />
                {form.formState.errors.numRows && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.numRows.message}</p>
                )}
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <div className="flex items-center space-x-2 mb-2">
                    <Switch
                      id="useWebData"
                      checked={form.watch("useWebData")}
                      onCheckedChange={(checked) => form.setValue("useWebData", checked)}
                      disabled={isGenerating}
                    />
                    <Label htmlFor="useWebData" className="text-sm sm:text-base font-semibold">
                      Use Live Web Data
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                    const currentPrompt = form.getValues("prompt");
                    if (!currentPrompt || currentPrompt.trim().length < 10) {
                      toast({
                        title: "Prompt Required",
                        description: "Please enter a prompt first to get AI suggestions.",
                        variant: "destructive"
                      });
                      return;
                    }

                    setIsSuggesting(true);
                    try {
                      const input: RecommendModelInput = { prompt: currentPrompt };
                      const result = await recommendModel(input);
                      setSuggestedModel(result);
                      toast({
                        title: "AI Suggestion Ready!",
                        description: "Check the sidebar for model recommendations.",
                        variant: "default"
                      });
                    } catch (error: any) {
                      toast({
                        title: "Suggestion Failed",
                        description: error.message || "Could not get AI suggestions.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsSuggesting(false);
                    }
                  }}
                  disabled={isGenerating || isSuggesting}
                  className="w-full sm:w-auto"
                >
                  {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Brain className="mr-2 h-4 w-4" />}
                  Get AI Suggestion
                </Button>

              <Button type="submit" disabled={isGenerating || isGenerationInProgress} className="w-full sm:flex-1">
                {(isGenerating || isGenerationInProgress) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGenerationInProgress ? 'Processing...' : isGenerating ? 'Generating...' : 'Generate Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Logger */}
        {showLiveLogger && currentRequestData && (
          <Card className="shadow-xl border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <Globe className="mr-2.5 h-6 w-6 text-blue-600" /> Live Web Data Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveLogger
                isActive={showLiveLogger}
                requestData={memoizedRequestData || undefined}
                onComplete={handleLiveLoggerComplete}
                onError={handleLiveLoggerError}
              />
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {generationResult && generationResult.generatedRows.length > 0 && (
          <Card className="shadow-xl border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <CheckCircle className="mr-2.5 h-6 w-6 text-green-600" /> Generated Dataset
              </CardTitle>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Rows ({generationResult.generatedRows?.length || 0})
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ CSV ({generationResult.generatedCsv?.length || 0} chars)
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Schema ({generationResult.detectedSchema?.length || 0} cols)
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (generationResult?.generatedCsv) {
                      downloadFile(generationResult.generatedCsv, `${form.getValues("datasetName") || "generated_data"}.csv`, "text/csv;charset=utf-8;");
                    } else if (generationResult?.generatedRows) {
                       downloadFile(JSON.stringify(generationResult.generatedRows, null, 2), `${form.getValues("datasetName") || "generated_data"}.json`, "application/json;charset=utf-8;");
                    } else {
                      toast({ title: "No Data to Download", description: "Cannot download, data is not available.", variant: "destructive"});
                    }
                  }}
                  disabled={isSaving || isGenerating}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download {generationResult?.generatedCsv ? 'CSV' : 'JSON'}
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="datasetNameResult" className="text-base font-semibold">Dataset Name (for saving)</Label>
                <div className="flex gap-2">
                    <Input
                        id="datasetNameResult"
                        value={datasetName}
                        onChange={(e) => {
                            setDatasetName(e.target.value);
                            form.setValue("datasetName", e.target.value);
                        }}
                        placeholder={smartDefaults.datasetName || "Enter a name for this dataset"}
                        className="flex-grow text-base shadow-sm"
                        disabled={isSaving || isGenerating}
                    />
                    <Button type="button" onClick={handleSaveDataset} disabled={isSaving || isGenerating || !generationResult || !datasetName.trim()}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Save Dataset
                    </Button>
                </div>
                 {form.formState.errors.datasetName && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.datasetName.message}</p>
                 )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="table" className="py-2.5 text-base">
                    <TableIcon className="mr-2 h-5 w-5" />Table Preview
                  </TabsTrigger>
                  <TabsTrigger value="csv" className="py-2.5 text-base">
                    <FileSpreadsheet className="mr-2 h-5 w-5" />CSV
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="table" className="mt-4">
                  {generationResult.generatedRows && generationResult.generatedRows.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border max-h-[400px] shadow-inner bg-background">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/70 sticky top-0">
                          <tr>
                            {generationResult.detectedSchema?.map(col =>
                              <th key={col.name} className="px-5 py-3.5 text-left text-sm font-semibold text-muted-foreground whitespace-nowrap">
                                {col.name} ({col.type})
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {generationResult.generatedRows.slice(0, 10).map((row, index) => (
                            <tr key={index} className="hover:bg-muted/50 transition-colors">
                              {generationResult.detectedSchema?.map(col =>
                                <td key={col.name} className="px-5 py-3 whitespace-nowrap text-sm text-foreground">
                                  {String(row[col.name])}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {generationResult.generatedRows.length > 10 &&
                        <p className="text-xs text-muted-foreground p-3 bg-muted/30 text-center">
                          Showing first 10 rows in table preview.
                        </p>
                      }
                    </div>
                  ) : (
                    <p className="text-muted-foreground p-6 text-center text-lg">No data available for table view.</p>
                  )}
                </TabsContent>
                <TabsContent value="csv" className="mt-4">
                  {generationResult.generatedCsv ? (
                    <Textarea
                      readOnly
                      value={generationResult.generatedCsv}
                      rows={15}
                      className="font-mono text-sm w-full max-h-[400px] shadow-inner bg-background/70"
                      placeholder="CSV data will appear here..."
                    />
                  ) : (
                    <p className="text-muted-foreground p-6 text-center text-lg">No CSV data generated.</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </form>

      <div className="lg:col-span-1 space-y-8">
        {/* Dynamic Examples */}
        <DynamicExamples
          userPrompt={currentPrompt || ""}
          onExampleSelect={handleExampleSelect}
          className="sticky top-20"
        />

        {(isSuggesting || suggestedModel) &&
        <Card className="bg-accent/10 border-accent/50 shadow-lg sticky top-20">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-accent-foreground flex items-center">
              <Lightbulb className="mr-2.5 h-6 w-6 text-accent" /> AI Model Suggestion
              {isSuggesting && <Loader2 className="ml-auto h-5 w-5 animate-spin text-accent" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestedModel ? (
              <div>
                <p className="font-semibold text-md">Recommended Type: <span className="text-primary">{suggestedModel.modelName}</span></p>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{suggestedModel.reason}</p>
                 <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSuggestedModel(null)}>
                    <Wand2 className="mr-2 h-3.5 w-3.5"/> Get New Suggestion
                 </Button>
              </div>
            ) : isSuggesting ? (
              <p className="text-sm text-muted-foreground">Analyzing your prompt for suggestions...</p>
            ) : null}
          </CardContent>
        </Card>
        }

        <Card className="shadow-xl sticky top-20">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <TableIcon className="mr-2.5 h-6 w-6 text-primary" /> Generated Data Schema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generationResult && generationResult.detectedSchema && generationResult.detectedSchema.length > 0 ? (
              <ul className="space-y-2.5 text-sm max-h-80 overflow-y-auto pr-2">
                {generationResult.detectedSchema.map((col, index) => (
                  <li key={index} className="flex justify-between items-center p-3 rounded-md bg-muted/60 hover:bg-muted transition-colors shadow-sm">
                    <span className="font-medium text-foreground">{col.name}</span>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full font-semibold">{col.type}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-md text-muted-foreground py-4 text-center">Schema will be shown after data generation.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
