"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, Plug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DatasetDetail {
  id: string;
  dataset_name: string;
  created_at: string;
  prompt_used?: string;
  num_rows: number;
  schema_json: Array<{ name: string; type: string }>|null;
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
        let schemaArr: {name: string; type: string}[] = Array.isArray(d.schema_json) ? (d.schema_json as any) : [];
        if (csv) {
          const lines = csv.split("\n").filter(Boolean);
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold">{dataset?.dataset_name || 'Dataset'}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{dataset ? new Date(dataset.created_at).toLocaleString() : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onDownload} disabled={!dataset || loading}><Download className="h-4 w-4 mr-2"/>Download CSV</Button>
            <Button onClick={onIntegrate} disabled={!dataset || loading}><Plug className="h-4 w-4 mr-2"/>Integrate</Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>First 100 rows</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin"/> Loading...</div>
          ) : rows.length ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {schema.map((c) => (
                      <TableHead key={c.name} className="whitespace-nowrap">{c.name} <span className="text-xs text-muted-foreground">({c.type})</span></TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      {schema.map((c) => (
                        <TableCell key={c.name} className="max-w-[220px] truncate">{String(r[c.name] ?? '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">No rows available to preview.</div>
          )}
        </CardContent>
      </Card>

      {dataset && (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Rows</span><Badge variant="outline">{dataset.num_rows}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Columns</span><Badge variant="secondary">{Array.isArray(dataset.schema_json) ? dataset.schema_json.length : schema.length}</Badge></div>
            {dataset.prompt_used ? (
              <div>
                <div className="text-muted-foreground mb-1">Prompt</div>
                <div className="rounded-md border p-3 text-xs text-muted-foreground whitespace-pre-wrap">{dataset.prompt_used}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
