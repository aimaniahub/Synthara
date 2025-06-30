
// src/app/dashboard/analysis/page.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, TrendingUp, ActivityIcon, AlertTriangle, Wand2, ListChecks, SearchCheck, BarChartHorizontalBig, FileJson, Info, CheckCircle, Lightbulb, BrainCircuit, LineChart } from "lucide-react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { analyzeDatasetSnippet, type AnalyzeDatasetSnippetInput, type AnalyzeDatasetSnippetOutput } from '@/ai/flows/analyze-dataset-snippet-flow';
import { logActivity, getUserDatasets, getDatasetById, type SavedDataset } from '@/lib/supabase/actions';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';

interface ChartMetric {
  name: string;
  value: number;
  label: string; // For display in stat blocks
}

export default function DataAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeDatasetSnippetOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSnippetJsonForAnalysis, setCurrentSnippetJsonForAnalysis] = useState<string | null>(null);
  const [savedDatasetsList, setSavedDatasetsList] = useState<SavedDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(""); 
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingSelectedContent, setIsLoadingSelectedContent] = useState(false);

  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [chartData, setChartData] = useState<ChartMetric[]>([]);
  const [statBlockMetrics, setStatBlockMetrics] = useState<ChartMetric[]>([]);


  useEffect(() => {
    setIsLoadingDatasets(true);
    startTransition(async () => {
      try {
        const datasets = await getUserDatasets();
        setSavedDatasetsList(datasets);
      } catch (error) {
        console.error("Error fetching datasets:", error);
        toast({ title: "Error", description: "Could not fetch your saved datasets.", variant: "destructive" });
      } finally {
        setIsLoadingDatasets(false);
      }
    });
  }, [toast]);

  const handleDatasetSelection = async (datasetId: string) => {
    if (!datasetId) {
      setSelectedDatasetId("");
      setCurrentSnippetJsonForAnalysis(null);
      return;
    }
    setSelectedDatasetId(datasetId);
    setIsLoadingSelectedContent(true);
    setCurrentSnippetJsonForAnalysis(null); 
    setAnalysisResult(null); 
    toast({ title: "Loading Dataset Snippet...", description: "Fetching data for analysis."});
    try {
      const dataset = await getDatasetById(datasetId);
      if (dataset && dataset.data_csv) {
        const rows = dataset.data_csv.split('\n');
        const headers = rows[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
        const dataRows = rows.slice(1, Math.min(rows.length, 11)); 
        
        const snippetArray = dataRows
            .filter(rowStr => rowStr.trim() !== '')
            .map(rowStr => {
                const values = [];
                let currentVal = '';
                let inQuotes = false;
                for (let i = 0; i < rowStr.length; i++) {
                    const char = rowStr[i];
                    if (char === '"' && (i === 0 || rowStr[i-1] !== '\\')) { 
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(currentVal.trim().replace(/^"|"$/g, '')); 
                        currentVal = '';
                    } else {
                        currentVal += char;
                    }
                }
                values.push(currentVal.trim().replace(/^"|"$/g, ''));

                return headers.reduce((obj, header, index) => {
                    const val = values[index];
                    if (val === "true" || val === "false") obj[header] = val === "true";
                    else if (!isNaN(parseFloat(val)) && isFinite(Number(val))) obj[header] = parseFloat(val);
                    else obj[header] = val !== undefined ? val : "";
                    return obj;
                }, {} as Record<string, any>);
            });
        
        const snippetJson = JSON.stringify(snippetArray, null, 2);
        setCurrentSnippetJsonForAnalysis(snippetJson);
        toast({ title: "Snippet Ready", description: `Data from "${dataset.dataset_name}" is ready for analysis.` });
      } else {
        toast({ title: "Error Loading Dataset", description: "Could not retrieve dataset content.", variant: "destructive" });
        setCurrentSnippetJsonForAnalysis(null);
      }
    } catch (error) {
      console.error("Error loading selected dataset content:", error);
      toast({ title: "Error", description: "Failed to load snippet from selected dataset.", variant: "destructive" });
      setCurrentSnippetJsonForAnalysis(null);
    } finally {
      setIsLoadingSelectedContent(false);
    }
  };

  useEffect(() => {
    if (analysisResult?.dataQualitySummary) {
      const { featureSuitability = 0, structuralIntegrity = 0, valueConsistency = 0 } = analysisResult.dataQualitySummary;
      const newChartData = [
          { name: 'Feature Suitability', value: featureSuitability || 0, label: 'Feature Suitability' },
          { name: 'Structural Integrity', value: structuralIntegrity || 0, label: 'Structural Integrity' },
          { name: 'Value Consistency', value: valueConsistency || 0, label: 'Value Consistency' },
        ];
      setChartData(newChartData);
      setStatBlockMetrics(newChartData); // Use the same data for stat blocks
    } else {
      setChartData([]);
      setStatBlockMetrics([]);
    }
  }, [analysisResult]);

  const handleAnalyzeData = async () => {
    if (!currentSnippetJsonForAnalysis) {
      toast({ title: "No Data Snippet", description: "Please select a dataset to prepare its snippet for analysis.", variant: "destructive" });
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    toast({ title: "Analyzing Data Snippet for ML Readiness...", description: "The AI is inspecting your data. This may take a moment." });

    startTransition(async () => {
      try {
        const input: AnalyzeDatasetSnippetInput = { dataSnippetJson: currentSnippetJsonForAnalysis };
        const result = await analyzeDatasetSnippet(input);
        setAnalysisResult(result);
        if ((result.overallMlReadiness?.score || 0) > 0 || (result.keyObservationsForML?.length || 0) > 0) {
            toast({ title: "ML Analysis Complete", description: "AI insights are ready for review.", variant: "default" });
        } else {
             toast({ title: "Analysis Limited", description: result.overallMlReadiness?.summary || "AI could not extract detailed insights. Check data or try a different snippet.", variant: "default" });
        }

        await logActivity({
            activityType: 'DATA_ANALYSIS_SNIPPET',
            description: `Performed AI ML analysis on data snippet (from dataset ID: ${selectedDatasetId ? selectedDatasetId.substring(0,8) + '...' : 'unknown'})`,
            details: { 
                snippetLength: currentSnippetJsonForAnalysis.length, 
                mlReadinessScore: result.overallMlReadiness.score,
                observationsCount: result.keyObservationsForML.length,
                issuesCount: result.potentialMlIssues?.length || 0,
                qualityScore: result.dataQualitySummary.overallScore,
                source: `dataset:${selectedDatasetId}`
            },
            status: result.overallMlReadiness.score > 0 ? "COMPLETED" : "COMPLETED_LIMITED_INSIGHT"
        });

      } catch (error: any) {
        console.error("Error analyzing data snippet:", error);
        toast({
          title: "Analysis Failed",
          description: error.message || "An unexpected error occurred during analysis.",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    });
  };
  
  return (
    <div className="space-y-10 md:space-y-12">
      <Card className="shadow-lg bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
        <CardHeader>
            <CardTitle className="font-headline text-3xl sm:text-4xl text-foreground flex items-center"><LineChart className="mr-3 h-8 w-8 text-primary"/>AI-Powered ML Data Readiness Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-lg text-muted-foreground">
            <p>
                Unlock the full potential of your datasets with our advanced AI analysis. This tool evaluates a snippet of your selected data for its suitability and readiness for Machine Learning tasks.
            </p>
            <p>
                <strong>How it Works:</strong> Our AI examines the data snippet for structure, quality, identifiable patterns, potential features, common issues that can impact ML model training, and suggests appropriate ML models.
            </p>
            <p>
                <strong>Key Benefits:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Identify data quality problems and inconsistencies early.</li>
                <li>Receive actionable suggestions for data preprocessing and feature engineering.</li>
                <li>Get recommendations for suitable ML models based on data characteristics.</li>
                <li>Understand potential biases or limitations in your data snippet.</li>
                <li>Accelerate your ML development lifecycle by starting with better-prepared data.</li>
            </ul>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><FileJson className="mr-3 h-7 w-7 text-primary"/>Select Dataset for Analysis</CardTitle>
          <CardDescription className="text-md">Choose one of your saved datasets. A snippet (first ~10 rows) will be automatically prepared for AI analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="datasetSelect" className="text-lg font-semibold block mb-2">Select Saved Dataset</Label>
            <Select 
              onValueChange={handleDatasetSelection} 
              disabled={isLoadingDatasets || isLoadingSelectedContent || isAnalyzing}
              value={selectedDatasetId}
            >
              <SelectTrigger id="datasetSelect" className="shadow-sm text-base py-3 h-auto">
                <SelectValue placeholder={isLoadingDatasets ? "Loading datasets..." : "Choose a dataset to analyze its ML readiness..."} />
              </SelectTrigger>
              <SelectContent>
                {savedDatasetsList.length === 0 && !isLoadingDatasets ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No datasets found. Please generate and save a dataset first.</div>
                ) : (
                    savedDatasetsList.map(ds => (
                    <SelectItem key={ds.id} value={ds.id}>
                        {ds.dataset_name} ({ds.num_rows} rows)
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            {isLoadingSelectedContent && <p className="text-sm text-muted-foreground mt-2 flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading dataset snippet...</p>}
          </div>
          <Button type="button" onClick={handleAnalyzeData} disabled={isAnalyzing || isPending || isLoadingSelectedContent || !currentSnippetJsonForAnalysis} size="lg" className="text-lg py-3 px-6">
            {isAnalyzing || isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Analyze for ML Readiness
          </Button>
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-center">AI Analysis in Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">The AI is thoroughly examining your data snippet...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments.</p>
            </CardContent>
        </Card>
      )}

      {analysisResult && !isAnalyzing && (
        <Tabs defaultValue="overview" className="w-full mt-12">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 h-auto py-1.5 px-1.5 rounded-lg shadow-sm">
                <TabsTrigger value="overview" className="py-2.5 text-base sm:text-lg"><ActivityIcon className="mr-2 h-5 w-5"/>Overview</TabsTrigger>
                <TabsTrigger value="insights" className="py-2.5 text-base sm:text-lg"><SearchCheck className="mr-2 h-5 w-5"/>Detailed Insights</TabsTrigger>
                <TabsTrigger value="recommendations" className="py-2.5 text-base sm:text-lg"><Wand2 className="mr-2 h-5 w-5"/>AI Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
                <Card className="shadow-2xl border-primary/30">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="font-headline text-2xl flex items-center">
                           <ActivityIcon className="mr-3 h-7 w-7 text-primary" /> ML Readiness &amp; Quality
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-8 items-start">
                        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg shadow-md border border-primary/20">
                            <Label className="text-sm font-medium text-muted-foreground mb-1 block text-center">Overall ML Readiness Score</Label>
                            <div className="text-center">
                                <p className="text-7xl font-bold text-primary my-2">{analysisResult.overallMlReadiness?.score || 0}%</p>
                            </div>
                            <Progress value={analysisResult.overallMlReadiness?.score || 0} className="w-full h-3 mb-4" />
                            <p className="text-center text-muted-foreground mt-3 max-w-3xl mx-auto leading-relaxed">{analysisResult.overallMlReadiness?.summary || 'Analysis completed'}</p>
                        </div>
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="font-headline text-xl">Snippet Quality Snapshot</CardTitle>
                                <CardDescription>Key ML-focused quality metrics for the provided data snippet.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 bg-muted/30 rounded-lg text-center shadow">
                                        <p className="text-3xl font-bold text-foreground">{analysisResult.dataQualitySummary?.overallScore || 0}%</p>
                                        <p className="text-sm text-muted-foreground">Overall Quality</p>
                                    </div>
                                    {statBlockMetrics.map(metric => (
                                        <div key={metric.name} className="p-4 bg-muted/30 rounded-lg text-center shadow">
                                            <p className="text-3xl font-bold text-foreground">
                                            {metric.value}%
                                            </p>
                                            <p className="text-sm text-muted-foreground">{metric.label}</p>
                                        </div>
                                    ))}
                                </div>
                                {chartData.length > 0 && (
                                    <div className="h-[250px] w-full mt-4 p-4 border rounded-lg bg-muted/20 shadow-inner">
                                        <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 25, right: 20, top: 5, bottom: 5 }}>
                                            <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${value}%`}/>
                                            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: 'hsl(var(--popover))', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))'}} 
                                                labelStyle={{color: 'hsl(var(--popover-foreground))', fontWeight: 'bold'}}
                                                itemStyle={{color: 'hsl(var(--popover-foreground))'}}
                                                formatter={(value: number) => [`${value}%`, 'Score']}
                                            />
                                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                        </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-8">
                 {(analysisResult.keyObservationsForML?.length || 0) > 0 && (
                    <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center"><SearchCheck className="mr-2.5 text-primary h-6 w-6"/>Key Observations for ML</CardTitle>
                        <CardDescription>Noteworthy points from the data snippet relevant to machine learning.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(analysisResult.keyObservationsForML || []).map((item, index) => (
                        <div key={index} className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-md shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-foreground mb-1 flex items-center"><Lightbulb className="w-4 h-4 mr-2 text-primary/80"/>{item.observation}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed pl-6"><strong>Implication:</strong> {item.implication}</p>
                        </div>
                        ))}
                    </CardContent>
                    </Card>
                )}

                {(analysisResult.potentialMlIssues?.length || 0) > 0 && (
                    <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center"><AlertTriangle className="mr-2.5 text-destructive h-6 w-6"/>Potential ML Issues</CardTitle>
                        <CardDescription>Identified issues that might affect model training and how to address them.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(analysisResult.potentialMlIssues || []).map((item, index) => (
                        <div key={index} className="p-4 border-l-4 border-destructive bg-destructive/5 rounded-r-md shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-destructive mb-1 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/>Issue: {item.issue}</h4>
                            <p className="text-sm text-foreground/90 leading-relaxed pl-6"><strong>Recommendation:</strong> {item.recommendation}</p>
                        </div>
                        ))}
                    </CardContent>
                    </Card>
                )}
                {(analysisResult.keyObservationsForML?.length || 0) === 0 && (analysisResult.potentialMlIssues?.length || 0) === 0 && (
                     <Card className="shadow-xl">
                        <CardContent className="text-center py-10">
                            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No specific ML observations or issues were identified for this snippet.</p>
                            <p className="text-xs text-muted-foreground mt-1">This could be due to the data's nature or the AI's assessment.</p>
                        </CardContent>
                     </Card>
                )}
            </TabsContent>

            <TabsContent value="recommendations">
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center"><Sparkles className="mr-2.5 text-primary h-6 w-6"/>AI-Powered Next Steps</CardTitle>
                        <CardDescription>Suggestions from the AI to enhance your data for ML.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {(analysisResult.suggestedMlModels?.length || 0) > 0 && (
                            <Card className="shadow-lg border-primary/20">
                                <CardHeader>
                                    <CardTitle className="font-headline text-lg flex items-center"><BrainCircuit className="mr-2 text-primary h-5 w-5"/>Suggested ML Models</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(analysisResult.suggestedMlModels || []).map((model, index) => (
                                        <div key={index} className="p-3 border rounded-md bg-muted/40 shadow-sm">
                                            <h5 className="font-semibold text-primary">{model.modelName}</h5>
                                            <p className="text-sm text-muted-foreground">{model.suitabilityReason}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {((analysisResult.featureEngineeringSuggestions?.length || 0) > 0 || (analysisResult.preprocessingRecommendations?.length || 0) > 0 || (analysisResult.visualizationSuggestions?.length || 0) > 0) ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                                {(analysisResult.featureEngineeringSuggestions?.length || 0) > 0 && (
                                    <Card className="shadow-lg h-full">
                                    <CardHeader>
                                        <CardTitle className="font-headline text-lg flex items-center"><Wand2 className="mr-2 text-primary h-5 w-5"/>Feature Engineering</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2.5 list-disc list-inside text-sm text-muted-foreground">
                                        {(analysisResult.featureEngineeringSuggestions || []).map((suggestion, index) => (
                                            <li key={index}>{suggestion}</li>
                                        ))}
                                        </ul>
                                    </CardContent>
                                    </Card>
                                )}

                                {(analysisResult.preprocessingRecommendations?.length || 0) > 0 && (
                                    <Card className="shadow-lg h-full">
                                    <CardHeader>
                                        <CardTitle className="font-headline text-lg flex items-center"><ListChecks className="mr-2 text-primary h-5 w-5"/>Preprocessing Steps</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2.5 list-disc list-inside text-sm text-muted-foreground">
                                        {(analysisResult.preprocessingRecommendations || []).map((rec, index) => (
                                            <li key={index}>{rec}</li>
                                        ))}
                                        </ul>
                                    </CardContent>
                                    </Card>
                                )}

                                {(analysisResult.visualizationSuggestions?.length || 0) > 0 && (
                                    <Card className="shadow-lg h-full">
                                    <CardHeader>
                                        <CardTitle className="font-headline text-lg flex items-center"><BarChartHorizontalBig className="mr-2 text-primary h-5 w-5"/>Visualization Ideas</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2.5 list-disc list-inside text-sm text-muted-foreground">
                                        {(analysisResult.visualizationSuggestions || []).map((vis, index) => (
                                            <li key={index}>{vis}</li>
                                        ))}
                                        </ul>
                                    </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                             (analysisResult.suggestedMlModels?.length || 0) === 0 && (
                            <div className="text-center py-8">
                                <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No specific AI recommendations were generated for this snippet.</p>
                                <p className="text-xs text-muted-foreground mt-1">This might be due to the nature of the data or the AI's assessment.</p>
                            </div>
                           )
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

    
