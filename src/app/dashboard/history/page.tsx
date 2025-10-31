
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
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          History &amp; Activity Logs
        </h1>
        <p className="text-sm text-muted-foreground">Review your past activities, generated datasets, and trained models.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="pb-4 sm:pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
            <CardTitle className="font-headline text-lg sm:text-xl lg:text-2xl">Activity Timeline</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search activities..." className="pl-8 w-full sm:w-auto text-sm" disabled />
              </div>
              <Select disabled>
                <SelectTrigger className="w-full sm:w-[180px] text-sm">
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
              <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm" disabled>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Date Range</span>
                <span className="sm:hidden">Date</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activityLog && activityLog.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] hidden md:table-cell"></TableHead>
                    <TableHead className="text-xs sm:text-sm">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Description</TableHead>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {activityLog.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="hidden md:table-cell">
                      {getActivityIcon(log.activity_type)}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                       <Badge variant={getActivityTypeBadgeVariant(log.activity_type)} className="text-xs">
                         <span className="hidden sm:inline">{log.activity_type.replace(/_/g, ' ')}</span>
                         <span className="sm:hidden">{log.activity_type.split('_')[0]}</span>
                       </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">
                      <span className="hidden sm:inline">{format(new Date(log.created_at), "MMM dd, yyyy 'at' hh:mm a")}</span>
                      <span className="sm:hidden">{format(new Date(log.created_at), "MMM dd")}</span>
                    </TableCell>
                    <TableCell className="text-right px-2 sm:px-4 py-2 sm:py-3">
                       <Badge variant={getStatusBadgeVariant(log.status)} className="capitalize text-xs">
                            <span className="hidden sm:inline">{log.status.toLowerCase().replace(/_/g, ' ')}</span>
                            <span className="sm:hidden">{log.status === 'COMPLETED' ? '✓' : log.status === 'FAILED' ? '✗' : '...'}</span>
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3">
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
            </div>
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
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center border-t pt-3 sm:pt-4 gap-3 sm:gap-0">
            <p className="text-xs sm:text-sm text-muted-foreground">Showing {activityLog.length} activities.</p>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" disabled className="flex-1 sm:flex-initial text-xs sm:text-sm">Previous</Button>
                <Button variant="outline" size="sm" disabled className="flex-1 sm:flex-initial text-xs sm:text-sm">Next</Button>
                 <Button variant="secondary" size="sm" disabled className="flex-1 sm:flex-initial text-xs sm:text-sm">
                    <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Export Logs</span>
                    <span className="sm:hidden">Export</span>
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
