"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Copy, Sparkles } from 'lucide-react';
import { dynamicContent, type ContentContext, type DynamicExample } from '@/services/dynamic-content-service';
import { useToast } from '@/hooks/use-toast';

interface DynamicExamplesProps {
  userPrompt: string;
  onExampleSelect: (example: DynamicExample) => void;
  className?: string;
}

export function DynamicExamples({ userPrompt, onExampleSelect, className }: DynamicExamplesProps) {
  const [examples, setExamples] = useState<DynamicExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const updateExamples = async () => {
      setIsLoading(true);
      
      const context: ContentContext = {
        userPrompt,
      };

      // Get dynamic examples based on context
      const dynamicExamples = dynamicContent.generateExamples(context);
      setExamples(dynamicExamples);
      
      setIsLoading(false);
    };

    updateExamples();
  }, [userPrompt]);

  const handleExampleSelect = (example: DynamicExample) => {
    onExampleSelect(example);
    toast({
      title: "Example Applied",
      description: `Applied "${example.title}" example to your prompt.`,
    });
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Copied to Clipboard",
      description: "Example prompt copied to clipboard.",
    });
  };

  if (examples.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className={`bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Lightbulb className="mr-2 h-5 w-5 text-primary" />
          Smart Examples
          {isLoading && <Sparkles className="ml-2 h-4 w-4 animate-pulse text-accent" />}
        </CardTitle>
        <CardDescription>
          Contextual examples based on your data needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {examples.map((example, index) => (
          <div
            key={index}
            className="p-4 bg-background/60 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground mb-1">
                  {example.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {example.description}
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyPrompt(example.prompt)}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleSelect(example)}
                  className="h-7 px-2 text-xs"
                >
                  Use
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-foreground/80 bg-muted/50 p-2 rounded border mb-2 font-mono">
              {example.prompt.length > 100 
                ? `${example.prompt.substring(0, 100)}...` 
                : example.prompt
              }
            </div>
            
            {example.expectedColumns && example.expectedColumns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">Expected columns:</span>
                {example.expectedColumns.slice(0, 4).map((column, colIndex) => (
                  <Badge key={colIndex} variant="secondary" className="text-xs px-1 py-0">
                    {column}
                  </Badge>
                ))}
                {example.expectedColumns.length > 4 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{example.expectedColumns.length - 4} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
        
        {examples.length === 0 && isLoading && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Generating contextual examples...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DynamicExamples;
