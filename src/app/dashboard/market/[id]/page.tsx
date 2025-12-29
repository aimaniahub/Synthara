"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Download,
  Plug,
  ChevronLeft,
  Database,
  Columns,
  Rows,
  Calendar,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface DatasetDetail {
  id: string;
  dataset_name: string;
  created_at: string;
  prompt_used?: string;
  num_rows: number;
  schema_json: Array<{ name: string; type: string }> | null;
  data_csv?: string;
}

export default function PublicDatasetDetailPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [schema, setSchema] = useState<{ name: string; type: string }[]>([]);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/public-datasets/${params.id}`);
        const payload = await res.json();
        if (!res.ok || !payload?.success || !payload?.dataset) throw new Error(payload?.error || "Not found");
        const d = payload.dataset as DatasetDetail;
        setDataset(d);
        const csv = d.data_csv || "";
        let parsedRows: Record<string, any>[] = [];
        let schemaArr: { name: string; type: string }[] = Array.isArray(d.schema_json) ? (d.schema_json as any) : [];
        if (csv) {
          const lines = csv.split("\n").filter(Boolean);
          if (lines.length > 0) {
            const headers = lines[0]?.split(",") || [];
            if (!schemaArr.length) {
              schemaArr = headers.map((h) => ({ name: h, type: "string" }));
            }
            for (let i = 1; i < Math.min(lines.length, 101); i++) {
              const values = lines[i].split(",");
              const row: Record<string, any> = {};
              headers.forEach((h, idx) => { row[h] = values[idx]; });
              parsedRows.push(row);
            }
          }
        }
        setRows(parsedRows);
        setSchema(schemaArr);
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to load dataset", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    });
  }, [params?.id, toast]);

  const onDownload = async () => {
    if (!dataset?.data_csv) return;
    try {
      const blob = new Blob([dataset.data_csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(dataset.dataset_name || 'dataset').replace(/[^a-z0-9-_]+/gi, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Ready", description: "CSV started downloading." });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Unable to download CSV", variant: "destructive" });
    }
  };

  const onIntegrate = async () => {
    try {
      const res = await fetch("/api/public-datasets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: params.id, newName: `Imported - ${dataset?.dataset_name || 'dataset'}` }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error || "Failed to import");
      toast({ title: "Imported", description: "Dataset copied to your workspace" });
      router.push(`/dashboard/analysis?datasetId=${payload.datasetId}`);
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "Unable to import this dataset", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-32 bg-muted rounded-xl" />
        <div className="h-24 w-full bg-muted rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
        </div>
        <div className="h-[400px] bg-muted rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <Link
          href="/dashboard/market"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
        >
          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Back to Market
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={onDownload}
            className="h-12 px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-all font-bold"
          >
            <Download className="h-4 w-4 mr-2" /> Download CSV
          </Button>
          <Button
            size="lg"
            onClick={onIntegrate}
            className="h-12 px-6 rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all font-bold"
          >
            <Plug className="h-4 w-4 mr-2" /> Integrate Dataset
          </Button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl opacity-50" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Database className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-foreground">
                {dataset?.dataset_name || 'Dataset Details'}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground font-medium">
                <Calendar className="h-4 w-4" />
                <span>Published on {dataset ? new Date(dataset.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="modern-card p-6 flex items-center gap-4 bg-background/40">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <Rows className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Rows</div>
            <div className="text-2xl font-black text-foreground">{dataset?.num_rows.toLocaleString() || '0'}</div>
          </div>
        </div>

        <div className="modern-card p-6 flex items-center gap-4 bg-background/40">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <Columns className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Dimensions</div>
            <div className="text-2xl font-black text-foreground">{schema.length} Columns</div>
          </div>
        </div>

        <div className="modern-card p-6 flex items-center gap-4 bg-background/40">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Validation</div>
            <div className="text-2xl font-black text-foreground">Verified</div>
          </div>
        </div>

        <div className="modern-card p-6 flex items-center gap-4 bg-background/40">
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Visibility</div>
            <div className="text-2xl font-black text-foreground">Public</div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <Card className="modern-card border-none bg-background/40 overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black">Data Preview</CardTitle>
              <CardDescription className="text-base">Showing the first 100 sample records from this collection</CardDescription>
            </div>
            <Badge variant="outline" className="h-8 rounded-lg px-4 font-bold border-primary/20 text-primary">
              Live Sample
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length ? (
            <div className="relative">
              <ScrollArea className="h-[500px] w-full border-t">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-20">
                    <TableRow className="hover:bg-transparent border-b-border/10">
                      {schema.map((c) => (
                        <TableHead key={c.name} className="h-14 font-black text-foreground uppercase tracking-tight px-6 first:pl-8 last:pr-8">
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            <span className="text-[10px] text-primary/60 font-medium tracking-normal lowercase -mt-1">{c.type}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className="group border-b-border/5 hover:bg-primary/5 transition-colors">
                        {schema.map((c) => (
                          <TableCell key={c.name} className="px-6 py-4 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[250px] truncate first:pl-8 last:pr-8">
                            {String(r[c.name] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-bold">No data records available for preview</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {dataset?.prompt_used && (
          <Card className="modern-card border-none bg-background/40">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-black">Generation Intelligence</CardTitle>
              </div>
              <CardDescription>The logic used to synthesize this dataset</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="rounded-2xl border border-border/10 bg-black/20 p-6">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {dataset.prompt_used}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="modern-card border-none bg-background/40">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-black">Schema Definition</CardTitle>
            </div>
            <CardDescription>Structured field mappings and types</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {schema.map((field) => (
                <div key={field.name} className="flex items-center justify-between p-4 rounded-xl border border-border/5 bg-background/20 hover:border-primary/20 transition-all">
                  <span className="font-bold text-sm">{field.name}</span>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">
                    {field.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
