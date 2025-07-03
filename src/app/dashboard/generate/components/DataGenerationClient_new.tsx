"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const dataGenerationSchema = z.object({
  prompt: z.string().min(10, { message: "Prompt must be at least 10 characters long." }),
  numRows: z.coerce.number().min(1, "Must generate at least 1 row.").max(100, "Maximum 100 rows.").optional().default(10),
  datasetName: z.string().optional(),
  useWebData: z.boolean().optional().default(false),
});

type DataGenerationFormValues = z.infer<typeof dataGenerationSchema>;

export function DataGenerationClient() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<DataGenerationFormValues>({
    resolver: zodResolver(dataGenerationSchema),
    defaultValues: {
      prompt: "",
      numRows: 10,
      datasetName: "",
      useWebData: false,
    },
  });

  const onSubmit: SubmitHandler<DataGenerationFormValues> = async (data) => {
    setIsGenerating(true);
    try {
      toast({
        title: "Generation Started",
        description: "This is a test implementation.",
        variant: "default"
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Generation Complete",
        description: "Test data generated successfully.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-3 items-start">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8"
      >
        <div className="glass-card p-6">
          <div className="mb-6">
            <h2 className="font-headline text-xl sm:text-2xl lg:text-3xl text-white mb-2">Describe Your Data Needs</h2>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="prompt" className="text-base sm:text-lg font-semibold text-white">
                What data do you want to generate?
              </Label>
              <Textarea
                id="prompt"
                {...form.register("prompt")}
                placeholder="Describe the type of data you want to generate..."
                rows={4}
                className="mt-2 text-sm sm:text-base shadow-sm"
                disabled={isGenerating}
              />
              {form.formState.errors.prompt && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.prompt.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Label htmlFor="numRows" className="text-base font-semibold text-white">Number of Rows</Label>
                <Input
                  id="numRows"
                  type="number"
                  {...form.register("numRows", { valueAsNumber: true })}
                  min={1}
                  max={100}
                  className="mt-2 shadow-sm"
                  disabled={isGenerating}
                />
                {form.formState.errors.numRows && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.numRows.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="datasetName" className="text-base font-semibold text-white">Dataset Name (Optional)</Label>
                <Input
                  id="datasetName"
                  {...form.register("datasetName")}
                  placeholder="my_dataset"
                  className="mt-2 shadow-sm"
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="useWebData"
                {...form.register("useWebData")}
                disabled={isGenerating}
              />
              <Label htmlFor="useWebData" className="text-base font-semibold text-white cursor-pointer">
                Use Live Web Data
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Data
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div className="lg:col-span-1 space-y-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline">Quick Start</CardTitle>
            <CardDescription>Get started with these example prompts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a simplified test version of the data generation component.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
