
import { DataGenerationClient } from './components/DataGenerationClient';

export default function DataGenerationPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Generate Synthetic Data</h1>
        <p className="text-sm text-muted-foreground">Create datasets using prompts and AI-powered generation.</p>
      </div>
      <DataGenerationClient />
    </div>
  );
}
