
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; 
import { UploadCloud, Brain, Settings, PlayCircle, Download, Lightbulb, CheckCircle } from "lucide-react";

const modelAlgorithms = [
  { value: "linear_regression", label: "Linear Regression" },
  { value: "logistic_regression", label: "Logistic Regression" },
  { value: "decision_tree", label: "Decision Tree Classifier/Regressor" },
  { value: "random_forest", label: "Random Forest Classifier/Regressor" },
  { value: "svm", label: "Support Vector Machine (SVM)" },
  { value: "gradient_boosting", label: "Gradient Boosting Machines (GBM)" },
  { value: "neural_network", label: "Neural Network (Basic MLP)" },
];

// Define a type for the keys of hyperparameterTemplates
type HyperparameterTemplatesKey = keyof typeof hyperparameterTemplates;

const hyperparameterTemplates: Record<string, {name: string, label: string, type: string, defaultValue?: any, description: string, options?: string[]}[]> = {
  random_forest: [
    { name: "n_estimators", label: "Number of Trees", type: "number", defaultValue: 100, description: "The number of trees in the forest." },
    { name: "max_depth", label: "Max Depth", type: "number", defaultValue: null, description: "Maximum depth of the tree. Null for unlimited." },
    { name: "min_samples_split", label: "Min Samples Split", type: "number", defaultValue: 2, description: "Minimum samples required to split an internal node." },
  ],
  svm: [
     { name: "C", label: "Regularization (C)", type: "number", defaultValue: 1.0, description: "Regularization parameter." },
     { name: "kernel", label: "Kernel Type", type: "select", options: ["linear", "poly", "rbf", "sigmoid"], defaultValue: "rbf", description: "Specifies the kernel type to be used." },
     { name: "gamma", label: "Kernel Coefficient (gamma)", type: "select", options: ["scale", "auto"], defaultValue: "scale", description: "Kernel coefficient for 'rbf', 'poly' and 'sigmoid'." },
  ]
  // Add more templates as needed
};


// Evaluation metrics will be populated from real training results
const initialEvaluationMetrics: Record<string, number | string> = {
  accuracy: "N/A",
  precision: "N/A",
  recall: "N/A",
  f1_score: "N/A",
  auc_roc: "N/A",
};

export default function MlTrainingPage() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<HyperparameterTemplatesKey | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState("[INFO] Training session not started.\n[INFO] Select dataset and algorithm, then click 'Start Training'.");
  const [evaluationMetrics, setEvaluationMetrics] = useState(initialEvaluationMetrics);
  const [isTraining, setIsTraining] = useState(false);

  // Training function - will be implemented with real ML training
  const handleStartTraining = () => {
    // TODO: Implement real ML training workflow
    setTrainingLogs("[INFO] Training functionality will be implemented with real ML pipeline.\n[INFO] Please configure your training parameters and try again.");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Machine Learning Training &amp; Evaluation</h1>
        <p className="text-muted-foreground">Train, evaluate, and export your machine learning models.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center"><UploadCloud className="mr-2 text-primary"/> Dataset Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Select disabled={isTraining}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Dataset options will be populated from user's saved datasets */}
                  <SelectItem value="no_datasets">No datasets available - Generate data first</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">Or, <Button variant="link" className="p-0 h-auto text-xs" disabled={isTraining}>upload a new dataset</Button>.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center"><Brain className="mr-2 text-primary"/> Model Algorithm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select onValueChange={(value) => setSelectedAlgorithm(value as HyperparameterTemplatesKey)} disabled={isTraining}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an algorithm..." />
                </SelectTrigger>
                <SelectContent>
                  {modelAlgorithms.map(algo => (
                    <SelectItem key={algo.value} value={algo.value}>{algo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="p-3 bg-accent/20 border border-accent rounded-md text-sm">
                <p className="flex items-center text-accent-foreground"><Lightbulb className="mr-2 h-4 w-4"/> AI Recommendation: For this dataset type, <strong>Random Forest</strong> or <strong>Gradient Boosting</strong> might perform well.</p>
              </div>
            </CardContent>
          </Card>

          {selectedAlgorithm && hyperparameterTemplates[selectedAlgorithm] && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center"><Settings className="mr-2 text-primary"/> Hyperparameters</CardTitle>
                <CardDescription>Adjust model parameters. Defaults are auto-filled.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hyperparameterTemplates[selectedAlgorithm]?.map(param => (
                  <div key={param.name}>
                    <Label htmlFor={param.name} className="text-sm font-medium">{param.label}</Label>
                    {param.type === "number" && <Input id={param.name} type="number" placeholder={String(param.defaultValue ?? "")} className="mt-1" disabled={isTraining}/>}
                    {param.type === "select" && param.options && (
                       <Select defaultValue={String(param.defaultValue)} disabled={isTraining}>
                          <SelectTrigger id={param.name} className="mt-1">
                             <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                             {param.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{param.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
           <Button className="w-full" size="lg" onClick={handleStartTraining} disabled={isTraining || !selectedAlgorithm}>
            {isTraining ? <Progress value={trainingProgress} className="h-2 w-1/2 mr-2"/> : <PlayCircle className="mr-2 h-5 w-5"/>}
            {isTraining ? `Training... ${trainingProgress}%` : "Start Training"}
          </Button>
        </div>
        
        {/* Training & Evaluation Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Training Progress &amp; Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={trainingProgress} className="mb-4 h-3" aria-label="Training progress" />
              <div className="h-48 bg-muted rounded-md p-3 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {trainingLogs}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center"><CheckCircle className="mr-2 text-green-500"/> Model Evaluation Summary</CardTitle>
              <CardDescription>Performance metrics for the trained model will appear here.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(evaluationMetrics).map(([key, value]) => (
                    <div key={key} className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary">{typeof value === 'number' ? value.toFixed(2) : value}</p>
                        <p className="text-xs text-muted-foreground uppercase">{key.replace('_', ' ')}</p>
                    </div>
                ))}
            </CardContent>
             <CardFooter>
                 <Button variant="outline" disabled={isTraining || evaluationMetrics.accuracy === "N/A"}>View Detailed Evaluation Report</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center"><Download className="mr-2 text-primary"/> Export Model</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-grow">
                <Label htmlFor="modelFormat">Export Format</Label>
                <Select defaultValue="gguf" disabled={isTraining || evaluationMetrics.accuracy === "N/A"}>
                  <SelectTrigger id="modelFormat">
                    <SelectValue placeholder="Select format..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gguf">GGUF (.gguf)</SelectItem>
                    <SelectItem value="onnx">ONNX (.onnx)</SelectItem>
                    <SelectItem value="pytorch">PyTorch (.pt)</SelectItem>
                    <SelectItem value="tensorflow_savedmodel">TensorFlow SavedModel (.pb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={isTraining || evaluationMetrics.accuracy === "N/A"}>Export Model</Button>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">
                  {evaluationMetrics.accuracy === "N/A" ? "Train a model to enable export." : "Model ready for export."}
                </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
