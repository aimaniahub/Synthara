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
  related_resource_id?: string | null;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'DATASET_SAVED':
      return <Database className="h-4 w-4 text-foreground" />;
    case 'DATA_GENERATION':
      return <Brain className="h-4 w-4 text-foreground" />;
    case 'DATA_ANALYSIS_SNIPPET':
      return <FileText className="h-4 w-4 text-foreground" />;
    default:
      return <Settings className="h-4 w-4 text-foreground" />;
  }
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="border rounded-lg bg-background">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground">Recent Activity</CardTitle>
          <CardDescription className="text-muted-foreground">Loading your latest actions...</CardDescription>
        </CardHeader>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border rounded-lg bg-background overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Clock className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Your latest actions and events</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activities && activities.length > 0 ? (
          <div className="divide-y">
            {activities.map(activity => (
              <div key={activity.id} className="p-4 sm:p-6 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2.5 bg-muted rounded-md mt-1 flex-shrink-0">
                     {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground break-words leading-relaxed">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <p className="text-xs">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
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
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
              <Clock className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-2 text-lg">No recent activity</p>
            <p className="text-sm text-muted-foreground">Start using the platform to see your activity here</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <Link href="/dashboard/history">View All Activity</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
