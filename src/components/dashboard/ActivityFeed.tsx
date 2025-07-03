import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Brain, Database, Settings } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  related_resource_id?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'DATASET_SAVED':
      return <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case 'DATA_GENERATION':
      return <Brain className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'DATA_ANALYSIS_SNIPPET':
      return <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    default:
      return <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
  }
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="modern-card">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recent Activity</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">Loading your latest actions...</CardDescription>
        </CardHeader>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="modern-card">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recent Activity</CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">Your latest actions and events</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {activities && activities.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {activities.map(activity => (
              <div key={activity.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mt-1 flex-shrink-0">
                     {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">{activity.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                    {activity.related_resource_id && activity.activity_type === 'DATASET_SAVED' && (
                      <div className="mt-3 sm:hidden">
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <Link href={`/dashboard/preview?datasetId=${activity.related_resource_id}`}>View Dataset</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                   {activity.related_resource_id && activity.activity_type === 'DATASET_SAVED' && (
                      <Button variant="outline" size="sm" className="ml-auto hidden sm:flex flex-shrink-0" asChild>
                          <Link href={`/dashboard/preview?datasetId=${activity.related_resource_id}`}>View Dataset</Link>
                      </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12">
            <Clock className="mx-auto h-12 w-12 mb-4 text-slate-400" />
            <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">No recent activity</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Start using the platform to see your activity here</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-slate-200 dark:border-slate-700">
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <Link href="/dashboard/history">View All Activity</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
