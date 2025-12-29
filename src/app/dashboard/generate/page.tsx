"use client";

import dynamic from "next/dynamic";
import { DataGenerationSkeleton } from "@/components/ui/DataGenerationSkeleton";

const DataGenerationClient = dynamic(
  () =>
    import("./components/DataGenerationClient").then((mod) => ({
      default: mod.DataGenerationClient,
    })),
  {
    loading: () => <DataGenerationSkeleton />,
    ssr: false,
  }
);

import { DatabaseZap, Sparkles } from "lucide-react";

export default function DataGenerationPage() {
  return (
    <div className="space-y-10 w-full max-w-[1600px] mx-auto pt-4 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <DataGenerationClient />
    </div>
  );
}
