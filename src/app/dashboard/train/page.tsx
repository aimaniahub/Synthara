"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelTrainingClient } from "./components/ModelTrainingClient";

export default function TrainPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Train a Model</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelTrainingClient />
        </CardContent>
      </Card>
    </div>
  );
}
