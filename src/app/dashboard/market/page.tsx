"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Globe,
  Download,
  Eye,
  Plus,
  Database,
  Calendar,
  LayoutGrid,
  Search,
  ChevronRight,
  TrendingUp,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredItems = items.filter(item =>
    item.dataset_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-4">
              <Globe className="h-3 w-3" />
              <span>COMMUNITY HUB</span>
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
              Dataset <span className="text-gradient-primary">Market</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Discover and integrate high-quality synthetic datasets shared by the Synthara community.
              Power your models with curated intelligence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="h-14 px-8 rounded-2xl shadow-lg shadow-primary/20">
              <Link href="/dashboard/generate">
                <Plus className="h-5 w-5 mr-2" /> Share Your Data
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-2">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets..."
            className="pl-12 h-12 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          <span>{filteredItems.length} Datasets Available</span>
        </div>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="modern-card h-[280px] animate-pulse">
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <div className="pt-10 flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                  <Skeleton className="h-10 flex-1 rounded-xl" />
                </div>
              </div>
            </Card>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">No datasets found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              {searchQuery ? `No public datasets match "${searchQuery}"` : "The market is currently quiet. Be the first to share!"}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          filteredItems.map((it) => (
            <div
              key={it.id}
              className="modern-card group border border-border/50 bg-background/40 hover:bg-background/80 transition-all duration-500 overflow-hidden"
            >
              <div className="p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Database className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 font-bold text-primary">
                      {it.num_rows.toLocaleString()} Rows
                    </Badge>
                  </div>

                  <h3 className="font-headline text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                    {it.dataset_name}
                  </h3>

                  <div className="flex flex-col gap-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(it.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Verified Quality</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-border/10">
                  <div className="flex items-center gap-3">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-12 rounded-xl group/btn"
                    >
                      <Link href={`/dashboard/market/${it.id}`}>
                        <Eye className="h-4 w-4 mr-2" /> Details
                      </Link>
                    </Button>
                    <Button
                      onClick={() => onIntegrate(it.id, it.dataset_name)}
                      className="flex-1 h-12 rounded-xl bg-primary shadow-lg shadow-primary/10 hover:shadow-primary/20"
                    >
                      Integrate <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 text-xs font-bold text-muted-foreground hover:text-primary"
                    onClick={async () => {
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
                        toast({ title: "Ready for download", description: "CSV file prepared successfully." });
                      } catch (e: any) {
                        toast({ title: "Download failed", description: e?.message || "Unable to download CSV", variant: "destructive" });
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" /> Download Source CSV
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
