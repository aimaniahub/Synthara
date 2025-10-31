'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
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
  const getQualityColor = (quality: number) => {
    return 'text-foreground';
  };

  const getQualityBadgeVariant = (quality: number): "default" | "secondary" | "destructive" | "outline" => {
    return 'outline';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="h-4 w-4" />;
      case 'categorical': return <BarChart3 className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const numericColumns = profile.columns.filter(col => col.type === 'numeric');
  const categoricalColumns = profile.columns.filter(col => col.type === 'categorical');
  const dateColumns = profile.columns.filter(col => col.type === 'date');
  const textColumns = profile.columns.filter(col => col.type === 'text');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.totalRows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Data points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Columns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.totalColumns}</div>
            <p className="text-xs text-muted-foreground">
              Features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.overallQuality.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={profile.overallQuality} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completeness score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Data</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile.missingDataPattern.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Columns with gaps
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Column Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Column Types Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of data types in your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              {getTypeIcon('numeric')}
              <div>
                <div className="text-sm font-medium">Numeric</div>
                <div className="text-xs text-muted-foreground">{numericColumns.length} columns</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getTypeIcon('categorical')}
              <div>
                <div className="text-sm font-medium">Categorical</div>
                <div className="text-xs text-muted-foreground">{categoricalColumns.length} columns</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getTypeIcon('date')}
              <div>
                <div className="text-sm font-medium">Date</div>
                <div className="text-xs text-muted-foreground">{dateColumns.length} columns</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getTypeIcon('text')}
              <div>
                <div className="text-sm font-medium">Text</div>
                <div className="text-xs text-muted-foreground">{textColumns.length} columns</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Numeric Columns */}
        {numericColumns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Numeric Columns
              </CardTitle>
              <CardDescription>
                Statistical summary for numeric data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numericColumns.map((col) => (
                <div key={col.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{col.name}</span>
                    <Badge variant={getQualityBadgeVariant(100 - col.missingPercentage)}>
                      {col.missingPercentage.toFixed(1)}% complete
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Mean: {col.mean?.toFixed(2) || 'N/A'}</div>
                    <div>Median: {col.median?.toFixed(2) || 'N/A'}</div>
                    <div>Std Dev: {col.std?.toFixed(2) || 'N/A'}</div>
                    <div>Range: {col.min !== undefined && col.max !== undefined ? `${col.min.toFixed(2)} - ${col.max.toFixed(2)}` : 'N/A'}</div>
                  </div>
                  {col.outliers && col.outliers.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {col.outliers.length} outliers detected
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Categorical Columns */}
        {categoricalColumns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Categorical Columns
              </CardTitle>
              <CardDescription>
                Distribution summary for categorical data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoricalColumns.map((col) => (
                <div key={col.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{col.name}</span>
                    <Badge variant={getQualityBadgeVariant(100 - col.missingPercentage)}>
                      {col.missingPercentage.toFixed(1)}% complete
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>Unique values: {col.unique}</div>
                    <div>Most common: {col.mode !== undefined ? String(col.mode) : 'N/A'}</div>
                  </div>
                  {col.topValues && col.topValues.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium">Top values:</div>
                      {col.topValues.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="truncate max-w-32">{String(item.value)}</span>
                          <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Missing Data Details */}
      {profile.missingDataPattern.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Missing Data Analysis
            </CardTitle>
            <CardDescription>
              Columns with missing values and their impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.missingDataPattern.map((item) => (
                <div key={item.column} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{item.column}</span>
                    <Badge variant="destructive" className="text-xs">
                      {item.missingCount} missing
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24">
                      <Progress value={100 - item.missingPercentage} className="h-2" />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.missingPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
