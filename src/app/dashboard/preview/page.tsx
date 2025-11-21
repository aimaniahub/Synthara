
// src/app/dashboard/preview/page.tsx
"use client";

import { useEffect, useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, UploadCloud, FileText, Settings2, Filter, ChevronsUpDown, Info, Eye, Loader2 } from "lucide-react";
import Link from 'next/link';
import { getUserDatasets, type SavedDataset, getDatasetById } from '@/lib/supabase/actions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


function DataPreviewContent() {
  const searchParams = useSearchParams();
  const datasetIdToLoad = searchParams.get('datasetId');
  
  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>([]);
  const [loadedDataset, setLoadedDataset] = useState<(SavedDataset & { data_csv: string }) | null>(null);
  const [loadedDataRows, setLoadedDataRows] = useState<Record<string, any>[]>([]);
  const [loadedSchema, setLoadedSchema] = useState<{name: string, type: string}[]>([]);
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
            toast({ title: "Error", description: "Could not fetch dataset list.", variant: "destructive"});
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
                setLoadedSchema(dataset.schema_json as {name: string, type: string}[]);
              } else if (parsedRows.length > 0 && headers.length > 0) {
                setLoadedSchema(headers.map(key => ({name: key, type: 'String'}))); // Basic inference
              }
            } else {
                setLoadedDataRows([]);
                setLoadedSchema([]);
            }
          } else {
             toast({ title: "Not Found", description: "The requested dataset could not be found.", variant: "destructive"});
          }
        } catch (error: any) {
          console.error("Error fetching dataset:", error);
          toast({ title: "Error", description: `Could not fetch dataset: ${error.message}`, variant: "destructive"});
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
      toast({ title: "Download Started", description: `${loadedDataset.dataset_name}.csv is downloading.`});
    } else {
      toast({ title: "Error", description: "No data available to download.", variant: "destructive"});
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
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-headline font-bold text-foreground">
            {isLoadingDataset && datasetIdToLoad ? "Loading Dataset..." : loadedDataset ? `Preview: ${loadedDataset.dataset_name}` : "Dataset Preview & Management"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {loadedDataset ? `Generated from: ${loadedDataset.prompt_used.substring(0,120)}${loadedDataset.prompt_used.length > 120 ? '...' : ''}` : "Select a saved dataset to preview its content and statistics."}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" disabled>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload (Soon)
          </Button>
          <Button
            disabled={!loadedDataset || !loadedDataset.data_csv || isLoadingDataset}
            onClick={handleDownloadCsv}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <Card className="lg:col-span-1 order-2 lg:order-1">
            <CardHeader className="border-b">
                <CardTitle className="font-headline text-lg sm:text-xl text-foreground">Saved Datasets</CardTitle>
                <CardDescription className="text-muted-foreground">Select a dataset to view its details</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingList ? (
                    <div className="flex justify-center items-center py-4"><Loader2 className="h-8 w-8 animate-spin"/></div>
                ) : savedDatasets.length > 0 ? (
                    <ul className="space-y-2 max-h-96 overflow-y-auto">
                        {savedDatasets.map(ds => (
                            <li key={ds.id}>
                                <Link href={`/dashboard/preview?datasetId=${ds.id}`}>
                                      <Button 
                                        variant={datasetIdToLoad === ds.id ? "default" : "outline"} 
                                        className={`w-full justify-start text-left h-auto py-2.5`}
                                        disabled={isLoadingDataset && datasetIdToLoad === ds.id}
                                      >
                                        <div className="flex-grow">
                                          <p className="font-semibold truncate">{ds.dataset_name}</p>
                                          <p className="text-xs text-muted-foreground">{format(new Date(ds.created_at), "MMM dd, yyyy HH:mm")}</p>
                                          <p className="text-xs text-muted-foreground">{ds.num_rows} rows</p>
                                        </div>
                                        {isLoadingDataset && datasetIdToLoad === ds.id ? <Loader2 className="h-4 w-4 ml-2 animate-spin"/> : <Eye className="h-4 w-4 ml-2 opacity-70"/>}
                                      </Button>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No datasets saved yet. <Link href="/dashboard/generate" className="underline">Generate one now.</Link></p>
                )}
            </CardContent>
        </Card>

        <div className="lg:col-span-3 order-1 lg:order-2">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="preview" className="py-2 sm:py-2.5 text-sm sm:text-base"><FileText className="mr-1 sm:mr-2 h-4 w-4" />Preview</TabsTrigger>
              <TabsTrigger value="statistics" className="py-2 sm:py-2.5 text-sm sm:text-base"><FileText className="mr-1 sm:mr-2 h-4 w-4" />Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Data Table Preview</CardTitle>
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" disabled><Filter className="mr-2 h-3 w-3" />Filter</Button>
                    <p className="text-sm text-muted-foreground">
                      {isLoadingDataset ? "Loading data..." : loadedDataRows.length > 0 ? `Showing 1-${Math.min(20, loadedDataRows.length)} of ${loadedDataRows.length} rows.` : "No data loaded for preview."}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingDataset ? (
                     <div className="flex justify-center items-center h-40"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
                  ) : loadedDataset && loadedDataRows.length > 0 && loadedSchema.length > 0 ? (
                    <div className="w-full">
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-4">
                        {loadedDataRows.slice(0, 10).map((row, rowIndex) => (
                          <Card key={rowIndex} className="p-4">
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground mb-2">Row {rowIndex + 1}</div>
                              {loadedSchema.map((col) => (
                                <div key={col.name} className="flex justify-between items-start gap-2">
                                  <span className="text-xs font-medium text-muted-foreground min-w-0 flex-1">
                                    {col.name}:
                                  </span>
                                  <span className="text-xs text-right break-words max-w-[60%]">
                                    {String(row[col.name])}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto rounded-md border max-h-96">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/70">
                            <TableRow>
                              {loadedSchema.map(col => (
                                <TableHead key={col.name} className="min-w-[120px]">
                                  <Button variant="ghost" size="sm" className="px-1 py-0.5 -ml-1 h-auto text-xs md:text-sm">
                                    {col.name} ({col.type})
                                    <ChevronsUpDown className="ml-1 h-3 w-3" />
                                  </Button>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadedDataRows.slice(0, 20).map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {loadedSchema.map((col) => (
                                  <TableCell key={col.name} className="whitespace-nowrap text-xs md:text-sm max-w-[200px] truncate">
                                    {String(row[col.name])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : renderEmptyState("Select a dataset from the list to see a preview, or generate a new one.", !datasetIdToLoad && !isLoadingDataset)}
                </CardContent>
                {loadedDataRows.length > 20 && (
                  <CardFooter className="justify-end space-x-2 border-t pt-4">
                      <Button variant="outline" size="sm" disabled>Previous</Button>
                      <Button variant="outline" size="sm" disabled>Next</Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Overall Dataset Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                        {isLoadingDataset && datasetIdToLoad ? <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
                        : loadedDataset ? (
                            <>
                            <p><strong>Total Rows:</strong> {loadedDataset.num_rows.toLocaleString()}</p>
                            <p><strong>Total Columns:</strong> {Array.isArray(loadedDataset.schema_json) ? loadedDataset.schema_json.length : 'N/A'}</p>
                            <p><strong>Created:</strong> {format(new Date(loadedDataset.created_at), "MMM dd, yyyy HH:mm")}</p>
                            <p><strong>Feedback:</strong> {loadedDataset.feedback || "N/A"}</p>
                            </>
                        ) : renderEmptyState("Statistics will appear here once a dataset is selected.")}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Column Statistics Example</CardTitle>
                            <CardDescription>Detailed statistics for selected columns (Placeholder).</CardDescription>
                        </CardHeader>
                        <CardContent>
                        {isLoadingDataset && datasetIdToLoad ? <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
                        : loadedDataset ? (
                            <div className="overflow-x-auto">
                            <p className="text-muted-foreground">Column-specific statistics will be shown here after detailed analysis (Feature coming soon).</p>
                            </div>
                        ) : renderEmptyState("Column statistics will appear here.")}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            
          </Tabs>
        </div>
      </div>

      {loadedDataset && !isLoadingDataset && (
        <Card>
            <CardHeader>
            <CardTitle className="font-headline flex items-center"><Settings2 className="mr-2"/> Export &amp; Versioning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                <h4 className="font-medium mb-1">Export Logs</h4>
                <p className="text-sm text-muted-foreground">Timestamp: {format(new Date(loadedDataset.created_at), "MMM dd, yyyy HH:mm:ss")} | Version: v1.0.0 (example) | Source: Generated</p>
                </div>
            <Button variant="outline" size="sm" disabled>Download Export Log (Soon)</Button>
            </CardContent>
        </Card>
      )}
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
