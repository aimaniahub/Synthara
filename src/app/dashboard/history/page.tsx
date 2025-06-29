
// src/app/dashboard/history/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatabaseZap, Brain, FileText, Search, Download, CalendarDays, Filter, Info, Wand2, BarChartBig, Save, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { getUserActivities, type ActivityLog } from '@/lib/supabase/actions';
import { format } from 'date-fns';

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case "DATA_GENERATION": return <DatabaseZap className="h-5 w-5 text-muted-foreground" />;
    case "PROMPT_ENHANCEMENT": return <Wand2 className="h-5 w-5 text-muted-foreground" />;
    case "DATA_ANALYSIS_SNIPPET": return <BarChartBig className="h-5 w-5 text-muted-foreground" />;
    case "DATASET_SAVED": return <Save className="h-5 w-5 text-muted-foreground" />;
    case "MODEL_TRAINING": return <Brain className="h-5 w-5 text-muted-foreground" />; // Placeholder
    default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    if (status.startsWith("COMPLETED")) return "default";
    if (status === "FAILED") return "destructive";
    if (status === "IN_PROGRESS") return "secondary";
    return "outline";
}

function getActivityTypeBadgeVariant(activityType: string): "default" | "secondary" | "destructive" | "outline" {
    switch (activityType) {
        case "DATA_GENERATION": return "default";
        case "PROMPT_ENHANCEMENT": return "secondary";
        case "DATA_ANALYSIS_SNIPPET": return "outline";
        case "DATASET_SAVED": return "default"; // Or another color
        default: return "outline";
    }
}


export default function HistoryPage() {
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      try {
        const activities = await getUserActivities();
        setActivityLog(activities);
      } catch (error) {
        console.error('Error fetching user activities:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivities();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">History &amp; Activity Logs</h1>
          <p className="text-muted-foreground">Review your past activities, generated datasets, and trained models.</p>
        </div>
        <Card className="shadow-xl">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading activities...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">History &amp; Activity Logs</h1>
        <p className="text-muted-foreground">Review your past activities, generated datasets, and trained models.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="font-headline text-2xl">Activity Timeline</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search activities..." className="pl-8 w-full sm:w-auto" disabled />
              </div>
              <Select disabled>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DATA_GENERATION">Data Generation</SelectItem>
                  <SelectItem value="PROMPT_ENHANCEMENT">Prompt Enhancement</SelectItem>
                  <SelectItem value="DATA_ANALYSIS_SNIPPET">Snippet Analysis</SelectItem>
                  <SelectItem value="DATASET_SAVED">Dataset Saved</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full sm:w-auto" disabled>
                <CalendarDays className="mr-2 h-4 w-4" /> Date Range
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activityLog && activityLog.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] hidden md:table-cell"></TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLog.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="hidden md:table-cell">
                      {getActivityIcon(log.activity_type)}
                    </TableCell>
                    <TableCell>
                       <Badge variant={getActivityTypeBadgeVariant(log.activity_type)}>{log.activity_type.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                       <Badge variant={getStatusBadgeVariant(log.status)} className="capitalize">
                            {log.status.toLowerCase().replace(/_/g, ' ')}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild disabled={!log.related_resource_id && log.activity_type !== 'DATASET_SAVED'}>
                        {log.activity_type === 'DATASET_SAVED' && log.related_resource_id ? (
                           <Link href={`/dashboard/preview?datasetId=${log.related_resource_id}`}>View Dataset</Link>
                        ) : (
                           <span>Details</span> // Or specific link based on type
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground">No Activities Yet</h3>
              <p className="text-muted-foreground">Your activities will be logged here as you use the platform.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/generate">Generate Your First Dataset</Link>
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t pt-4">
            <p className="text-sm text-muted-foreground">Showing {activityLog.length} activities.</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
                 <Button variant="secondary" disabled>
                    <Download className="mr-2 h-4 w-4" /> Export Logs
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
