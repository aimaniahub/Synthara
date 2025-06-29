
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, PlayCircle, FileText, Code, Settings2, ShieldCheck, MoreHorizontal, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Removed mock trainedModels

export default function ModelExportPage() {
  const trainedModels: any[] = []; // Initialize as empty, to be populated by real data later

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Model Export &amp; Deployment</h1>
        <p className="text-muted-foreground">Manage, export, and deploy your trained machine learning models.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Trained Models</CardTitle>
          <CardDescription>List of all models you have trained on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {trainedModels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Dataset Used</TableHead>
                  <TableHead>Trained At</TableHead>
                  <TableHead>Key Metric</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainedModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell className="text-muted-foreground">{model.dataset}</TableCell>
                    <TableCell className="text-muted-foreground">{model.trainedAt}</TableCell>
                    <TableCell>{model.accuracy}</TableCell>
                    <TableCell>
                      <Badge variant={model.status === "Active" ? "default" : "secondary"}>{model.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             <DropdownMenuItem disabled><Download className="mr-2 h-4 w-4"/>Export Model</DropdownMenuItem>
                             <DropdownMenuItem disabled><PlayCircle className="mr-2 h-4 w-4"/>Test Output</DropdownMenuItem>
                             <DropdownMenuItem disabled><Code className="mr-2 h-4 w-4"/>View Deployment Instructions</DropdownMenuItem>
                             <DropdownMenuSeparator/>
                             <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" disabled><ShieldCheck className="mr-2 h-4 w-4"/>Archive Model</DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground">No Trained Models Yet</h3>
                <p className="text-muted-foreground">Train your first model to see it listed here.</p>
                <Button asChild className="mt-4" variant="outline">
                    <a href="/dashboard/train">Go to Model Training</a>
                </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-sm text-muted-foreground">Showing {trainedModels.length} models.</p>
        </CardFooter>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center"><Code className="mr-2"/>Deployment Instructions</CardTitle>
                <CardDescription>Generic instructions for deploying an exported model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p>1. Export your model in the desired format (e.g., ONNX, GGUF).</p>
                <p>2. Choose your deployment target (e.g., Cloud Function, Docker Container, Edge Device).</p>
                <p>3. Set up the appropriate serving environment (e.g., TensorFlow Serving, ONNX Runtime).</p>
                <p>4. Load the model into your serving environment.</p>
                <p>5. Expose an API endpoint for inference.</p>
                <p>6. Monitor performance and logs.</p>
                <Button variant="link" className="p-0 h-auto" disabled>Download Full Deployment Guide (Soon)</Button>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center"><Settings2 className="mr-2"/>Integration Panel</CardTitle>
                 <CardDescription>Connect with external services and APIs (Feature coming soon).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                    <p className="font-medium">AWS SageMaker</p>
                    <Button variant="outline" size="sm" disabled>Connect</Button>
                </div>
                 <div className="flex items-center justify-between p-3 border rounded-md">
                    <p className="font-medium">Google Vertex AI</p>
                    <Button variant="outline" size="sm" disabled>Connect</Button>
                </div>
                 <div className="flex items-center justify-between p-3 border rounded-md">
                    <p className="font-medium">Hugging Face Hub</p>
                    <Button variant="outline" size="sm" disabled>Connect</Button>
                </div>
            </CardContent>
        </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center"><PlayCircle className="mr-2"/> Test Model Output</CardTitle>
                <CardDescription>Test your trained model with sample input data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                 <Select disabled>
                    <SelectTrigger><SelectValue placeholder="Select a trained model to test..."/></SelectTrigger>
                </Select>
                <Textarea placeholder="Enter input data for model testing..." rows={4} disabled/>
                <Button disabled>Run Test</Button>
                <div className="p-3 bg-muted rounded-md min-h-[50px]">
                    <p className="text-sm text-muted-foreground">Output will appear here...</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
