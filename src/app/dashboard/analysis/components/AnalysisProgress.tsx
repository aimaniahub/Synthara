'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Database, BarChart3, Brain, Sparkles } from 'lucide-react';
import { type AnalysisProgress as AnalysisProgressType } from '@/services/analysis-service';

interface AnalysisProgressProps {
  progress: AnalysisProgressType;
  className?: string;
}

const stageConfig = {
  structure: {
    icon: Database,
    label: 'Analyzing data structure',
    color: 'bg-muted',
    description: 'Detecting data types and column structure'
  },
  statistics: {
    icon: BarChart3,
    label: 'Computing statistics',
    color: 'bg-muted',
    description: 'Calculating statistical measures and correlations'
  },
  visualizations: {
    icon: BarChart3,
    label: 'Generating visualizations',
    color: 'bg-muted',
    description: 'Creating charts and data visualizations'
  },
  'ai-insights': {
    icon: Brain,
    label: 'Creating AI insights',
    color: 'bg-muted',
    description: 'Generating AI-powered analysis and recommendations'
  },
  complete: {
    icon: CheckCircle,
    label: 'Analysis complete',
    color: 'bg-muted',
    description: 'All analysis components have been generated'
  }
};

export function AnalysisProgress({ progress, className }: AnalysisProgressProps) {
  const currentStage = stageConfig[progress.stage];
  const IconComponent = currentStage.icon;
  const isComplete = progress.stage === 'complete';

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentStage.color}`}>
              {isComplete ? (
                <IconComponent className="h-5 w-5" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{currentStage.label}</h3>
              <p className="text-sm text-muted-foreground">
                {currentStage.description}
              </p>
            </div>
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {progress.percentage}%
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress 
              value={progress.percentage} 
              className="h-2"
            />
          </div>

          {/* Stage Indicators */}
          <div className="flex justify-between items-center">
            {Object.entries(stageConfig).map(([stage, config], index) => {
              const isActive = progress.stage === stage;
              const isCompleted = Object.keys(stageConfig).indexOf(progress.stage) > index;
              const StageIcon = config.icon;
              
              return (
                <div
                  key={stage}
                  className={`flex flex-col items-center gap-2 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  <div className={`p-2 rounded-full ${
                    isActive ? config.color :
                    isCompleted ? 'bg-muted' :
                    'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <StageIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs text-center max-w-20">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current Message */}
          {progress.message && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">{progress.message}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
