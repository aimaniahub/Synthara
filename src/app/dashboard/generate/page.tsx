
import { DataGenerationClient } from './components/DataGenerationClient';

export default function DataGenerationPage() {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-headline font-bold text-foreground">Generate Synthetic Data</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Create custom datasets using natural language prompts and AI-powered suggestions.</p>
      </div>
      <DataGenerationClient />
    </div>
  );
}
