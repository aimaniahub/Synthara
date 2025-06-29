
import { DataGenerationClient } from './components/DataGenerationClient';

export default function DataGenerationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Generate Synthetic Data</h1>
        <p className="text-muted-foreground">Create custom datasets using natural language prompts and AI-powered suggestions.</p>
      </div>
      <DataGenerationClient />
    </div>
  );
}
