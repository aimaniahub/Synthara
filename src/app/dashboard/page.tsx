
// src/app/dashboard/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, FileText, PlusCircle, BarChart, Brain, Clock, AlertCircle, DatabaseZap, Wand2, BarChartBig, Save, Eye, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import Link from "next/link";
import { getUserActivities, getUserDatasets, type ActivityLog, type SavedDataset } from '@/lib/supabase/actions';
import { format, formatDistanceToNow } from 'date-fns';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const quickActions = [
  { title: "Generate New Dataset", Icon: PlusCircle, href: "/dashboard/generate", description: "Start generating a new synthetic dataset.", cta: "Generate Data" },
  { title: "View Activity History", Icon: Clock, href: "/dashboard/history", description: "Review your past activities and logs.", cta: "View History"},
  { title: "Train New Model", Icon: Brain, href: "/dashboard/train", description: "Train a machine learning model with your data.", cta: "Train Model" },
  { title: "Analyze Dataset", Icon: BarChart, href: "/dashboard/analysis", description: "Explore insights from your datasets with AI.", cta: "Analyze Data"},
];

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case "DATA_GENERATION": return <DatabaseZap className="h-5 w-5 text-emerald-400" />;
    case "PROMPT_ENHANCEMENT": return <Wand2 className="h-5 w-5 text-purple-400" />;
    case "DATA_ANALYSIS_SNIPPET": return <BarChartBig className="h-5 w-5 text-cyan-400" />;
    case "DATASET_SAVED": return <Save className="h-5 w-5 text-emerald-400" />;
    default: return <AlertCircle className="h-5 w-5 text-white/60" />;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-headline font-bold text-slate-900 dark:text-slate-100">
            Welcome Back, {userName}!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Here's your Synthara analytics overview and recent activity.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
            <Link href="/dashboard/generate">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Dataset
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border-slate-300 dark:border-slate-600">
            <Link href="/dashboard/analysis">
              <BarChart className="mr-2 h-5 w-5" /> View Analytics
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
          <h2 className="text-2xl font-headline font-bold text-slate-900 dark:text-slate-100 mb-6">Latest Dataset</h2>
          <Card className="modern-card h-full">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {lastSavedDataset ? lastSavedDataset.dataset_name : "No Dataset Yet"}
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {lastSavedDataset ? `Created ${formatDistanceToNow(new Date(lastSavedDataset.created_at), { addSuffix: true })}` : "Your latest dataset will appear here"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400">Rows</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {lastSavedDataset ? lastSavedDataset.num_rows.toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400">Columns</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {lastSavedDataset && Array.isArray(lastSavedDataset.schema_json) ? lastSavedDataset.schema_json.length : "—"}
                    </p>
                  </div>
                </div>
                {lastSavedDataset && (
                  <div className="space-y-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Prompt Preview</span>
                    <p className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-700 dark:text-slate-300">
                      {lastSavedDataset.prompt_used.substring(0, 120)}...
                    </p>
                  </div>
                )}
                <Progress value={lastSavedDataset ? 100 : 0} className="h-2" />
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-200 dark:border-slate-700">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!lastSavedDataset} asChild>
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
