
// src/app/dashboard/page.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, Clock, AlertCircle, DatabaseZap, Wand2, BarChartBig, Save, Sparkles } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { ViewDatasetButton } from "@/components/dashboard/ViewDatasetButton";
import { Button } from "@/components/ui/button";
import { getUserActivities, getUserDatasets, type ActivityLog, type SavedDataset } from '@/lib/supabase/actions';
import { formatDistanceToNow } from 'date-fns';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/utils/timeout';

// Quick actions are now defined inside the QuickActions component

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case "DATA_GENERATION": return <DatabaseZap className="h-5 w-5 text-foreground" />;
    case "PROMPT_ENHANCEMENT": return <Wand2 className="h-5 w-5 text-foreground" />;
    case "DATA_ANALYSIS_SNIPPET": return <BarChartBig className="h-5 w-5 text-foreground" />;
    case "DATASET_SAVED": return <Save className="h-5 w-5 text-foreground" />;
    default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } = { user: null } } = supabase
    ? await withTimeout<any>(supabase.auth.getUser(), 2000, { data: { user: null } })
    : ({ data: { user: null } } as any);
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

  // Fetch activities and datasets only if user is available
  // To prevent errors if middleware hasn't fully processed or if user becomes null
  let recentActivities: ActivityLog[] = [];
  let datasets: SavedDataset[] = [];
  let lastSavedDataset: (SavedDataset & { data_csv?: string }) | null = null; // Ensure type matches

  if (user) {
    try {
      const [activities, ds] = await Promise.all([
        getUserActivities(5),
        getUserDatasets(),
      ]);
      recentActivities = activities;
      datasets = ds;
      lastSavedDataset = datasets.length > 0 ? datasets[0] : null;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Continue with empty arrays to prevent page crash
    }
  }


  return (
    <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Refined Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-5 text-primary animate-pulse" />
            Synthara <span className="text-muted-foreground/50 font-light">/</span> Dashboard
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Welcome, <span className="text-foreground font-semibold">{userName}</span>. You have <span className="text-primary font-semibold">{datasets.length} active datasets</span> ready for analysis.
          </p>
        </div>
        <DashboardActions />
      </div>

      {/* Structured Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Datasets", value: datasets?.length || 0, icon: DatabaseZap, color: "text-blue-500", trend: "+12%" },
          { label: "Syntheses", value: recentActivities?.length || 0, icon: Brain, color: "text-emerald-500", trend: "Stable" },
          { label: "Data Nodes", value: datasets?.reduce((acc, dataset) => acc + (dataset.num_rows || 0), 0).toLocaleString() || 0, icon: BarChartBig, color: "text-purple-500", trend: "+5.2k" },
          { label: "Uptime", value: "99.9%", icon: Clock, color: "text-orange-500", trend: "Online" }
        ].map((stat, i) => (
          <div key={i} className="modern-card p-4 flex items-center gap-4 group transition-all duration-300">
            <div className={`p-2.5 rounded-xl bg-secondary/50 ${stat.color} group-hover:scale-105 transition-transform`}>
              <stat.icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-0.5">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <span className="text-[9px] font-semibold text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">{stat.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Core Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Quick Actions (Compact) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Quick Access</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <QuickActions />
        </div>

        {/* Dataset Focus (Refined) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Active Context</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="modern-card overflow-hidden group border-primary/10">
            <div className="h-24 bg-muted/30 relative overflow-hidden border-b">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
              <div className="p-4 relative z-10 flex items-center justify-between">
                <div className="p-2 rounded-lg bg-background border shadow-sm text-foreground">
                  <FileText className="size-5" />
                </div>
                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                  Latest Dataset
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-md font-bold text-foreground tracking-tight truncate">
                  {lastSavedDataset ? lastSavedDataset.dataset_name : "Initializing..."}
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                  <Clock className="size-3" />
                  {lastSavedDataset ? `Updated ${formatDistanceToNow(new Date(lastSavedDataset.created_at), { addSuffix: true })}` : "Waiting for data..."}
                </p>
              </div>

              {lastSavedDataset ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Entries</p>
                    <p className="text-xs font-bold text-foreground">{lastSavedDataset.num_rows.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Fields</p>
                    <p className="text-xs font-bold text-foreground">
                      {Array.isArray(lastSavedDataset.schema_json) ? lastSavedDataset.schema_json.length : "0"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground italic">Start by generating your first dataset.</p>
                </div>
              )}

              <ViewDatasetButton datasetId={lastSavedDataset?.id} disabled={!lastSavedDataset} />
            </div>
          </div>
        </div>

        {/* AI Recommendations (Refined) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Intelligence Engine</h2>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="modern-card relative overflow-hidden p-6 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary shadow-inner">
                    <Sparkles className="size-4 animate-pulse" />
                  </div>
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">AI Intelligence</h4>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary bg-primary/5 uppercase px-2">
                  High Impact
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-foreground/90 leading-relaxed font-bold tracking-tight">
                  Structural Drift Detected
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Recent analysis of <span className="text-foreground font-semibold">Cluster Sigma</span> suggests a 12% drift in schema consistency.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-black text-primary/80 uppercase tracking-tighter">
                    <span>Reliability Index</span>
                    <span>94%</span>
                  </div>
                  <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full w-[94%] bg-primary rounded-full" />
                  </div>
                </div>
              </div>

              <Button className="w-full h-11 bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all font-black text-[10px] uppercase tracking-widest rounded-xl">
                Execute Context Repair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
