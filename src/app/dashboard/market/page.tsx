"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Globe, Download, Eye, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublicDatasetItem {
  id: string;
  dataset_name: string;
  created_at: string;
  num_rows: number;
  user_id: string;
}

export default function DatasetMarketPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PublicDatasetItem[]>([]);

  useEffect(() => {
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/public-datasets");
        const payload = await res.json();
        if (!res.ok || !payload?.success) throw new Error(payload?.error || "Failed to load public datasets");
        setItems(payload.datasets || []);
      } catch (e: any) {
        toast({ title: "Failed to load", description: e?.message || "Error loading dataset market", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    });
  }, [toast]);

  const onIntegrate = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/public-datasets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: id, newName: `Imported - ${name}` })
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
            <h1 className="text-2xl lg:text-3xl font-semibold flex items-center gap-2">
              <Globe className="h-6 w-6"/> Dataset Market
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Browse public datasets shared by the community. Download or integrate into your workflow.</p>
          </div>
          <Button asChild variant="outline"><Link href="/dashboard/generate"><Plus className="h-4 w-4 mr-2"/>Create Dataset</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Datasets</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin"/> Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No public datasets yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((it) => (
                <div key={it.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.dataset_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
                    </div>
                    <Badge variant="secondary">{it.num_rows} rows</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm" variant="outline"><Link href={`/dashboard/market/${it.id}`}><Eye className="h-4 w-4 mr-2"/>View</Link></Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        const res = await fetch(`/api/public-datasets/${it.id}`);
                        const payload = await res.json();
                        if (!res.ok || !payload?.success) throw new Error(payload?.error || "Failed to fetch dataset");
                        const csv: string = payload.dataset?.data_csv || "";
                        if (!csv) throw new Error("No CSV available");
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${it.dataset_name.replace(/[^a-z0-9-_]+/gi, '-')}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (e: any) {
                        toast({ title: "Download failed", description: e?.message || "Unable to download CSV", variant: "destructive" });
                      }
                    }}><Download className="h-4 w-4 mr-2"/>Download CSV</Button>
                    <Button size="sm" onClick={() => onIntegrate(it.id, it.dataset_name)}>Integrate</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
