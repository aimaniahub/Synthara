"use client";

import React from "react";
import dynamic from "next/dynamic";

const ModelTrainingClient = dynamic(
  () =>
    import("./components/ModelTrainingClient").then((mod) => ({
      default: mod.ModelTrainingClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-sm text-muted-foreground">
        Loading training module...
      </div>
    ),
  }
);

import { Brain } from "lucide-react";

export default function TrainPage() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="glass-modern p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden group">
        <div className="space-y-2 relative z-10 flex-1">
          <h1 className="text-3xl font-black text-foreground tracking-tighter leading-none">
            Model <span className="text-gradient-primary">Training</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Train and optimize machine learning models on your synthesized datasets for custom predictions.
          </p>
        </div>
      </div>

      <ModelTrainingClient />
    </div>
  );
}
