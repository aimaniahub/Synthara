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
    <div className="py-2">
      <ModelTrainingClient />
    </div>
  );
}
