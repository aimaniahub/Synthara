
import { DataGenerationClient } from './components/DataGenerationClient';

export default function DataGenerationPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl lg:text-4xl font-headline font-bold text-slate-900 dark:text-slate-100">
          Generate Synthetic Data
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Create custom datasets using natural language prompts and AI-powered generation.
        </p>
      </div>
      <DataGenerationClient />
    </div>
  );
}
