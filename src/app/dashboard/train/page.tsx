"use client";

import React, { Suspense } from "react";
import { ModelTrainingClient } from "./components/ModelTrainingClient";

export default function TrainPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading training module...</div>}>
      <div className="space-y-6">
        <ModelTrainingClient />
      </div>
    </Suspense>
  );
}
