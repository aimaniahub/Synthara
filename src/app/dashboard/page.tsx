
// src/app/dashboard/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, FileText, PlusCircle, BarChart, Brain, Clock, AlertCircle, DatabaseZap, Wand2, BarChartBig, Save } from "lucide-react";
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
    case "DATA_GENERATION": return <DatabaseZap className="h-5 w-5 text-primary" />;
    case "PROMPT_ENHANCEMENT": return <Wand2 className="h-5 w-5 text-accent" />;
    case "DATA_ANALYSIS_SNIPPET": return <BarChartBig className="h-5 w-5 text-secondary-foreground" />;
    case "DATASET_SAVED": return <Save className="h-5 w-5 text-green-500" />;
    default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
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
  let lastSavedDataset: (SavedDataset & { data_csv?: string }) | null = null; // Ensure type matches

  if (user) {
    recentActivities = await getUserActivities(5); 
    const savedDatasets = await getUserDatasets(1); 
    lastSavedDataset = savedDatasets.length > 0 ? savedDatasets[0] : null;
  }


  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 xl:space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-foreground">Welcome Back, {userName}!</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">Here's what's happening with your Synthara projects.</p>
        </div>
        <Button size="lg" asChild className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">
          <Link href="/dashboard/generate">
            <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> New Dataset
          </Link>
        </Button>
      </div>

      {/* Quick Action Cards */}
      <section>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-headline font-semibold mb-4 sm:mb-6 text-foreground">Quick Actions</h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 bg-card flex flex-col">
              <CardHeader className="pb-3">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg inline-block mb-2 sm:mb-3 self-start">
                    <action.Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-headline">{action.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{action.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="default" className="w-full group text-sm" asChild>
                  <Link href={action.href}>
                    {action.cta} <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform"/>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <section className="lg:col-span-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-headline font-semibold mb-4 sm:mb-6 text-foreground">Recent Activity</h2>
          <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="text-xl font-headline">Activity Feed</CardTitle>
                <CardDescription>Your latest actions and events.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities && recentActivities.length > 0 ? (
                <ul className="divide-y divide-border">
                  {recentActivities.map(activity => (
                    <li key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-full mt-0.5">
                           {getActivityIcon(activity.activity_type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                         {activity.related_resource_id && activity.activity_type === 'DATASET_SAVED' && (
                            <Button variant="outline" size="sm" className="ml-auto" asChild>
                                <Link href={`/dashboard/preview?datasetId=${activity.related_resource_id}`}>View Dataset</Link>
                            </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-muted-foreground p-6 min-h-[200px] flex flex-col items-center justify-center">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No recent activity to display.</p>
                  <p className="text-sm">Start using the platform to see your activity log populate.</p>
                </div>
              )}
            </CardContent>
             <CardFooter className="py-4 border-t">
                <Button variant="outline" size="sm" className="ml-auto" asChild>
                   <Link href="/dashboard/history">View All Activity</Link>
                </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Last Generated Dataset */}
        <section>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-headline font-semibold mb-4 sm:mb-6 text-foreground">Last Dataset</h2>
          <Card className="shadow-xl hover:shadow-heavy-lg transition-shadow flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-primary/10 rounded-lg">
                    <FileText className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl font-headline truncate">
                  {lastSavedDataset ? lastSavedDataset.dataset_name : "No Dataset Saved Yet"}
                </CardTitle>
              </div>
              <CardDescription>
                {lastSavedDataset ? `Saved ${formatDistanceToNow(new Date(lastSavedDataset.created_at), { addSuffix: true })}` : "Details of your last saved dataset will show here."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Rows:</strong> {lastSavedDataset ? lastSavedDataset.num_rows.toLocaleString() : "N/A"}</p>
                <p><strong>Columns:</strong> {lastSavedDataset && Array.isArray(lastSavedDataset.schema_json) ? lastSavedDataset.schema_json.length : "N/A"}</p>
                <p><strong>Prompt:</strong> {lastSavedDataset ? `${lastSavedDataset.prompt_used.substring(0, 50)}...` : "N/A"}</p>
              </div>
              <Progress value={lastSavedDataset ? 100 : 0} aria-label="Dataset information available" className="h-2.5" />
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button className="w-full" disabled={!lastSavedDataset} asChild>
                <Link href={lastSavedDataset ? `/dashboard/preview?datasetId=${lastSavedDataset.id}` : "#"}>View Dataset Details</Link>
              </Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  );
}
