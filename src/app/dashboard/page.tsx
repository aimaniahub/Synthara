
// src/app/dashboard/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, FileText, PlusCircle, BarChart, Brain, Clock, AlertCircle, DatabaseZap, Wand2, BarChartBig, Save, Eye, TrendingUp, Globe } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import Link from "next/link";
import { getUserActivities, getUserDatasets, type ActivityLog, type SavedDataset } from '@/lib/supabase/actions';
import { format, formatDistanceToNow } from 'date-fns';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const quickActions = [
  { title: "Generate New Dataset", Icon: PlusCircle, href: "/dashboard/generate", description: "Start generating a new synthetic dataset.", cta: "Generate Data" },
  { title: "View Activity History", Icon: Clock, href: "/dashboard/history", description: "Review your past activities and logs.", cta: "View History"},
  { title: "Train New Model", Icon: Brain, href: "/dashboard/train", description: "Train a machine learning model with your data.", cta: "Train Model" },
  { title: "Analyze Dataset", Icon: BarChart, href: "/dashboard/analysis", description: "Explore insights from your datasets with AI.", cta: "Analyze Data"},
  { title: "Browse Dataset Market", Icon: Globe, href: "/dashboard/market", description: "Discover public datasets shared by the community.", cta: "Open Market"},
];

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
  async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timeout: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeout = setTimeout(() => resolve(fallback), ms);
    });
    p.catch(() => null);
    return Promise.race([p, timeoutPromise]).finally(() => clearTimeout(timeout)) as Promise<T>;
  }

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Welcome back, {userName}</h1>
          <p className="text-sm text-muted-foreground">Overview and recent activity</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/generate">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Dataset
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/analysis">
              <BarChart className="mr-2 h-4 w-4" /> View Analytics
            </Link>
          </Button>
          <Button size="sm" variant="default" asChild>
            <Link href="/dashboard/market">
              <Globe className="mr-2 h-4 w-4" /> Dataset Market
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Datasets"
          value={datasets?.length || 0}
          icon={DatabaseZap}
          color="blue"
        />
        <StatsCard
          title="AI Generations"
          value={recentActivities?.length || 0}
          icon={Brain}
          color="emerald"
        />
        <StatsCard
          title="Total Records"
          value={datasets?.reduce((acc, dataset) => acc + (dataset.num_rows || 0), 0) || 0}
          icon={BarChartBig}
          color="purple"
        />
        <StatsCard
          title="Today's Activity"
          value={recentActivities?.filter(a => {
            const activityDate = new Date(a.created_at);
            const today = new Date();
            return activityDate.toDateString() === today.toDateString();
          }).length || 0}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions.map(action => ({
        ...action,
        color: action.title.includes('Generate') ? 'blue' :
               action.title.includes('View') ? 'emerald' :
               action.title.includes('Train') ? 'purple' :
               'orange'
      }))} />

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <section className="lg:col-span-2">
          <ActivityFeed activities={recentActivities || []} />
        </section>

        {/* Last Generated Dataset */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Latest Dataset</h2>
          <Card className="border rounded-lg bg-background">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold text-foreground truncate">
                    {lastSavedDataset ? lastSavedDataset.dataset_name : "No Dataset Yet"}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastSavedDataset ? `Created ${formatDistanceToNow(new Date(lastSavedDataset.created_at), { addSuffix: true })}` : "Your latest dataset will appear here"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Rows</span>
                    <p className="font-semibold text-foreground">
                      {lastSavedDataset ? lastSavedDataset.num_rows.toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Columns</span>
                    <p className="font-semibold text-foreground">
                      {lastSavedDataset && Array.isArray(lastSavedDataset.schema_json) ? lastSavedDataset.schema_json.length : "—"}
                    </p>
                  </div>
                </div>
                {lastSavedDataset && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Prompt Preview</span>
                    <p className="text-xs bg-muted p-3 rounded-lg text-muted-foreground">
                      {lastSavedDataset.prompt_used.substring(0, 120)}...
                    </p>
                  </div>
                )}
                <Progress value={lastSavedDataset ? 100 : 0} className="h-2" />
              </div>
            </CardContent>
            <CardFooter className="border-t">
              <Button className="w-full" variant="outline" disabled={!lastSavedDataset} asChild>
                <Link href={lastSavedDataset ? `/dashboard/preview?datasetId=${lastSavedDataset.id}` : "#"}>
                  View Dataset <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  );
}
