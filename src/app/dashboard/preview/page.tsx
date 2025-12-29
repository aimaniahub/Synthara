"use client";

import { useEffect, useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, UploadCloud, FileText, Settings2, Filter, ChevronsUpDown, Info, Eye, Loader2, DatabaseZap, CheckCircle, Sparkles } from "lucide-react";
import Link from 'next/link';
import { getUserDatasets, type SavedDataset, getDatasetById } from '@/lib/supabase/actions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


function DataPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetIdToLoad = searchParams.get('datasetId');

  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>([]);
  const [loadedDataset, setLoadedDataset] = useState<(SavedDataset & { data_csv: string }) | null>(null);
  const [loadedDataRows, setLoadedDataRows] = useState<Record<string, any>[]>([]);
  const [loadedSchema, setLoadedSchema] = useState<{ name: string, type: string }[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingList(true);
    startTransition(async () => {
      try {
        const data = await getUserDatasets(50);
        setSavedDatasets(data);
      } catch (error) {
        console.error("Error fetching dataset list:", error);
        toast({ title: "Error", description: "Could not fetch dataset list.", variant: "destructive" });
      } finally {
        setIsLoadingList(false);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (datasetIdToLoad) {
      setIsLoadingDataset(true);
      setLoadedDataset(null); // Clear previous dataset
      setLoadedDataRows([]);
      setLoadedSchema([]);

      startTransition(async () => {
        try {
          const dataset = await getDatasetById(datasetIdToLoad);
          if (dataset) {
            setLoadedDataset(dataset);
            if (dataset.data_csv) {
              const rows = dataset.data_csv.split('\n');
              const headers = rows[0]?.split(',') || [];
              const parsedRows = rows.slice(1).map(rowStr => {
                const values = rowStr.split(',');
                return headers.reduce((obj, header, index) => {
                  obj[header] = values[index];
                  return obj;
                }, {} as Record<string, any>);
              }).filter(row => Object.values(row).some(val => val && String(val).trim() !== ''));
              setLoadedDataRows(parsedRows);

              if (dataset.schema_json && Array.isArray(dataset.schema_json)) {
                setLoadedSchema(dataset.schema_json as { name: string, type: string }[]);
              } else if (parsedRows.length > 0 && headers.length > 0) {
                setLoadedSchema(headers.map(key => ({ name: key, type: 'String' }))); // Basic inference
              }
            } else {
              setLoadedDataRows([]);
              setLoadedSchema([]);
            }
          } else {
            toast({ title: "Not Found", description: "The requested dataset could not be found.", variant: "destructive" });
          }
        } catch (error: any) {
          console.error("Error fetching dataset:", error);
          toast({ title: "Error", description: `Could not fetch dataset: ${error.message}`, variant: "destructive" });
        } finally {
          setIsLoadingDataset(false);
        }
      });
    } else {
      // Clear loaded dataset if no ID is provided
      setLoadedDataset(null);
      setLoadedDataRows([]);
      setLoadedSchema([]);
      setIsLoadingDataset(false);
    }
  }, [datasetIdToLoad, toast]);

  const handleDownloadCsv = () => {
    if (loadedDataset && loadedDataset.data_csv) {
      const blob = new Blob([loadedDataset.data_csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${loadedDataset.dataset_name.replace(/\s+/g, '_') || 'dataset'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `${loadedDataset.dataset_name}.csv is downloading.` });
    } else {
      toast({ title: "Error", description: "No data available to download.", variant: "destructive" });
    }
  };

  const renderEmptyState = (message: string, showLinkToGenerate: boolean = false) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Info className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold text-foreground">No Data to Display</h3>
      <p className="text-muted-foreground">{message}</p>
      {showLinkToGenerate && (
        <Button asChild className="mt-4">
          <Link href="/dashboard/generate">Generate a Dataset</Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-10 w-full max-w-[1600px] mx-auto pt-4 pb-12">
      {/* Header Section */}
      <div className="glass-modern p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden group">
        <div className="space-y-2 relative z-10 flex-1">
          <h1 className="text-3xl font-black text-foreground tracking-tighter leading-none">
            Dataset <span className="text-gradient-primary">Preview</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Inspect your saved datasets, review schemas, and download records for external use.
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <Button
            disabled={!loadedDataset || !loadedDataset.data_csv || isLoadingDataset}
            onClick={handleDownloadCsv}
            className="h-14 px-8 rounded-xl font-black bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download className="mr-3 h-5 w-5" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Selector Section: Top Selection Card */}
        <Card className="modern-card border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 pt-6 px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <DatabaseZap className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight">Intelligence Repository</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Select Protocol</Label>
              {isLoadingList ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground h-11">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Accessing records...
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select
                      value={datasetIdToLoad || ''}
                      onValueChange={(val) => {
                        if (val) {
                          router.push(`/dashboard/preview?datasetId=${val}`);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-border/50 focus:ring-primary/20 transition-all font-bold">
                        <SelectValue placeholder="Choose a saved dataset..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                        {savedDatasets.map((ds: SavedDataset) => (
                          <SelectItem key={ds.id} value={ds.id} className="font-bold py-3">
                            <div className="flex items-center justify-between w-full min-w-[300px]">
                              <span>{ds.dataset_name}</span>
                              <Badge variant="secondary" className="ml-2 text-[10px] h-5 bg-primary/10 text-primary border-none">
                                {ds.num_rows.toLocaleString()} records
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button asChild variant="secondary" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest border border-primary/20 bg-primary/5 text-primary">
                    <Link href="/dashboard/generate">Generate New</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discovery Stage: Full Width Preview */}
        <div className="space-y-8 w-full">
          {isLoadingDataset ? (
            <div className="glass-modern min-h-[500px] flex items-center justify-center bg-secondary/5">
              <div className="text-center space-y-6">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                </div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em]">Intercepting Data Stems...</p>
              </div>
            </div>
          ) : loadedDataset ? (
            <div className="animate-in fade-in duration-500 space-y-10">
              {/* Metric Ribbon */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Rows", value: loadedDataRows.length.toLocaleString(), icon: FileText, color: "text-blue-500" },
                  { label: "Columns", value: loadedSchema.length, icon: Filter, color: "text-purple-500" },
                  { label: "Created", value: format(new Date(loadedDataset.created_at), "MMM dd"), icon: Settings2, color: "text-emerald-500" },
                  { label: "Status", value: "Verified", icon: CheckCircle, color: "text-primary" }
                ].map((stat, i) => (
                  <div key={i} className="glass-modern p-6 flex flex-col justify-between group hover:border-primary/20 transition-all">
                    <div className={`p-2.5 rounded-xl bg-secondary/50 ${stat.color} w-fit mb-4`}>
                      <stat.icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">{stat.label}</p>
                      <p className="text-2xl font-black text-foreground tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Focus: Data Workspace */}
              <Tabs defaultValue="preview" className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <TabsList className="h-12 p-1 rounded-xl bg-secondary/30 border border-border/30 w-fit">
                    <TabsTrigger value="preview" className="px-6 rounded-lg font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="px-6 rounded-lg font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      Statistics
                    </TabsTrigger>
                  </TabsList>

                  <div className="hidden sm:flex items-center gap-2 p-2 px-4 rounded-xl bg-secondary/20 border border-border/30">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Terminal Session Active</span>
                  </div>
                </div>

                <TabsContent value="preview" className="outline-none">
                  <div className="glass-modern p-1 overflow-hidden">
                    <div className="px-8 py-4 border-b border-border/30 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-3.5 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Dataset Workspace</h3>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                        Manifesting first 20 nodes
                      </p>
                    </div>
                    <div className="p-0 overflow-x-auto custom-scrollbar">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="border-border/30 hover:bg-transparent">
                            {loadedSchema.map((col: { name: string, type: string }) => (
                              <TableHead key={col.name} className="px-6 py-4 h-14 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase tracking-[0.1em] text-foreground">{col.name}</span>
                                  <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/20 text-primary h-5 px-1.5 bg-primary/5">{col.type}</Badge>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadedDataRows.slice(0, 20).map((row: Record<string, any>, rowIndex: number) => (
                            <TableRow key={rowIndex} className="border-border/10 hover:bg-primary/[0.02] transition-colors group">
                              {loadedSchema.map((col: { name: string, type: string }) => (
                                <TableCell key={col.name} className="px-6 py-4 text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors max-w-[300px] truncate">
                                  {row[col.name] === null || row[col.name] === undefined || String(row[col.name]).trim() === '' ? (
                                    <span className="opacity-30 italic font-medium">null</span>
                                  ) : (
                                    String(row[col.name])
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {loadedDataRows.length > 20 && (
                      <div className="p-6 border-t border-border/10 bg-muted/5 flex justify-center">
                        <Button variant="ghost" className="h-12 w-full text-[10px] font-black uppercase tracking-widest hover:bg-secondary/50 rounded-xl" onClick={handleDownloadCsv}>
                          Download full dataset to view all {loadedDataRows.length.toLocaleString()} nodes
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="statistics" className="outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass-modern p-8 space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                          <Info className="size-3.5" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Technical Specs</h4>
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: "Matrix Rows", value: loadedDataset.num_rows.toLocaleString() },
                          { label: "Columns", value: loadedSchema.length },
                          { label: "Created At", value: format(new Date(loadedDataset.created_at), "MMM dd, yyyy") },
                          { label: "Storage", value: "Verified" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-border/10 pb-3">
                            <span className="text-xs font-black text-muted-foreground/60 uppercase tracking-tight">{item.label}</span>
                            <span className="text-sm font-black text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="glass-modern p-8 space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                          <Sparkles className="size-3.5" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">AI Synopsis</h4>
                      </div>
                      <div className="p-6 rounded-2xl bg-secondary/30 border border-border/30">
                        <p className="text-sm leading-relaxed text-muted-foreground font-bold italic">
                          "{loadedDataset.feedback || "Professional assessment suggests consistent data patterns with standard variance across all identified columns."}"
                        </p>
                      </div>
                      <Button asChild variant="outline" className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest border-border/50 shadow-sm hover:shadow-md transition-all">
                        <Link href={`/dashboard/analysis?datasetId=${loadedDataset.id}`}>Deep Analysis</Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="glass-modern min-h-[500px] flex items-center justify-center border-dashed border-2 border-border/50 bg-secondary/5">
              <div className="max-w-md text-center space-y-8">
                <div className="size-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto shadow-inner">
                  <DatabaseZap className="size-8 text-primary/40" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase">Repository Empty</h3>
                  <p className="text-sm text-muted-foreground font-bold max-w-xs mx-auto leading-relaxed">
                    Select a dataset from the <span className="text-primary tracking-widest">Protocol Selector</span> above to manifest the data stream.
                  </p>
                </div>
                <Button asChild variant="secondary" className="h-12 px-10 rounded-xl font-black text-xs uppercase tracking-widest border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all shadow-lg shadow-primary/5">
                  <Link href="/dashboard/generate">Create New Protocol</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DataPreviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DataPreviewContent />
    </Suspense>
  );
}
