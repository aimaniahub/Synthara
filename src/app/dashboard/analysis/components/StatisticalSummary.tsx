'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Hash,
  Calendar,
  Type,
  FileText
} from 'lucide-react';
import { type DatasetProfile } from '@/services/analysis-service';

interface StatisticalSummaryProps {
  profile: DatasetProfile;
  className?: string;
}

export function StatisticalSummary({ profile, className }: StatisticalSummaryProps) {
  const getQualityBadgeVariant = (quality: number): "default" | "secondary" | "destructive" | "outline" => {
    if (quality > 90) return 'default';
    if (quality > 70) return 'secondary';
    return 'destructive';
  };

  const numericColumns = profile.columns.filter(col => col.type === 'numeric');
  const categoricalColumns = profile.columns.filter(col => col.type === 'categorical');

  return (
    <div className={`space-y-10 ${className || ''}`}>
      {/* Dynamic Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Numeric Columns Card */}
        {numericColumns.length > 0 && (
          <Card className="modern-card border-none shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em] text-foreground">
                <Hash className="size-4 text-primary" />
                Numeric Features
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Deep profiling of quantitative metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numericColumns.map((col) => (
                <div key={col.name} className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-border/50 group hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm uppercase tracking-tight">{col.name}</span>
                    <Badge variant={getQualityBadgeVariant(100 - col.missingPercentage)} className="font-black text-xs uppercase px-2 py-0.5 h-5 min-w-[80px] justify-center">
                      {(100 - col.missingPercentage).toFixed(1)}% Fill
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="flex justify-between border-b border-border/5 pb-1">
                      <span>Mean</span>
                      <span className="text-foreground">{col.mean?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/5 pb-1">
                      <span>Median</span>
                      <span className="text-foreground">{col.median?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/5 pb-1">
                      <span>Std Dev</span>
                      <span className="text-foreground">{col.std?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/5 pb-1">
                      <span>Bounds</span>
                      <span className="text-foreground">
                        {col.min !== undefined && col.max !== undefined ? `${col.min.toFixed(1)}-${col.max.toFixed(1)}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  {col.outliers && col.outliers.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 text-xs font-black text-orange-500 uppercase">
                      <div className="size-1 rounded-full bg-orange-500 animate-pulse" />
                      {col.outliers.length} Anomaly Detections
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Categorical Columns Card */}
        {categoricalColumns.length > 0 && (
          <Card className="modern-card border-none shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em] text-foreground">
                <BarChart3 className="size-4 text-primary" />
                Classification Hub
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Distribution analysis for categorical fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoricalColumns.map((col) => (
                <div key={col.name} className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/50 hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm uppercase tracking-tight">{col.name}</span>
                    <Badge variant={getQualityBadgeVariant(100 - col.missingPercentage)} className="font-black text-xs uppercase px-2 py-0.5 h-5 min-w-[80px] justify-center">
                      {(100 - col.missingPercentage).toFixed(1)}% Fill
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/5 pb-3">
                    <div>
                      <p className="mb-0.5 opacity-50">Unique</p>
                      <p className="text-sm font-black text-foreground">{col.unique}</p>
                    </div>
                    <div>
                      <p className="mb-0.5 opacity-50">Top Class</p>
                      <p className="text-sm font-black text-foreground truncate">{col.mode !== undefined ? String(col.mode) : 'N/A'}</p>
                    </div>
                  </div>
                  {col.topValues && col.topValues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">Density Distribution</p>
                      {col.topValues.slice(0, 3).map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="truncate max-w-[150px]">{String(item.value)}</span>
                            <span>{item.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={item.percentage} className="h-1 bg-secondary shadow-none" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Missing Data Card */}
        {profile.missingDataPattern.length > 0 && (
          <Card className="modern-card border-none shadow-sm bg-orange-500/5 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em] text-orange-500">
                <FileText className="size-4" />
                Intelligence Gaps
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Identified voids in dataset protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.missingDataPattern.map((item) => (
                  <div key={item.column} className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs uppercase tracking-tight">{item.column}</span>
                      <Badge variant="destructive" className="font-black text-xs uppercase h-5 px-2">
                        {item.missingCount} Missing
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-black uppercase opacity-60">
                        <span>Health</span>
                        <span>{(100 - item.missingPercentage).toFixed(1)}%</span>
                      </div>
                      <Progress value={100 - item.missingPercentage} className="h-1.5 bg-secondary shadow-none" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
