"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DatasetSelector } from "@/app/dashboard/analysis/components/DatasetSelector";
import { Download, Play, Database, Loader2, Sparkles, SlidersHorizontal, Brain, FileText, TrendingUp, CheckCircle, Activity, Maximize2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DatasetMeta {
  id?: string;
  name: string;
  source: "saved" | "uploaded";
}

type ModelType = "classification" | "regression";

export function ModelTrainingClient() {
  const { toast } = useToast();

  const tfRef = useRef<any>(null);

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [datasetMeta, setDatasetMeta] = useState<DatasetMeta | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [colTypes, setColTypes] = useState<Record<string, "number" | "string">>({});

  const [target, setTarget] = useState<string>("");
  const [features, setFeatures] = useState<string[]>([]);
  const [modelType, setModelType] = useState<ModelType>("classification");
  const [testSplit, setTestSplit] = useState<number>(0.2);
  const [epochs, setEpochs] = useState<number>(20);
  const [batchSize, setBatchSize] = useState<number>(32);

  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanedOnce, setCleanedOnce] = useState<boolean>(false);

  const [isTraining, setIsTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);

  // Training job persistence
  const [jobId, setJobId] = useState<string | null>(null);
  const [artifactPathState, setArtifactPathState] = useState<string | null>(null);
  const [showTrainDialog, setShowTrainDialog] = useState<boolean>(false);
  const [epochEvents, setEpochEvents] = useState<Array<{ epoch: number; progress: number; metrics?: Record<string, number>; message?: string; ts: string }>>([]);

  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [labelCardinality, setLabelCardinality] = useState<number>(0);

  const [autoConfigure, setAutoConfigure] = useState<boolean>(true);
  const [isAutoConfigRunning, setIsAutoConfigRunning] = useState<boolean>(false);
  const [autoConfigMsg, setAutoConfigMsg] = useState<string>("");

  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [planDialogOpen, setPlanDialogOpen] = useState<boolean>(false);
  const [plan, setPlan] = useState<null | {
    targetColumn: string;
    modelType: ModelType;
    features: string[];
    params: { testSplit: number; epochs: number; batchSize: number };
    scriptLanguage: "python";
    script: string;
    rationale?: string;
    constraintsUsed?: string[];
  }>(null);
  const [planError, setPlanError] = useState<string>("");
  const [isPipeline, setIsPipeline] = useState<boolean>(false);

  const logsPollRef = useRef<any>(null);
  const statusPollRef = useRef<any>(null);
  const lastEpochRef = useRef<number>(0);

  const featureColumns = useMemo(() => features.filter((c) => c !== target), [features, target]);

  const onDatasetSelect = useCallback(
    (data: Record<string, any>[], meta: DatasetMeta) => {
      const limited = data.slice(0, 5000);
      setRows(limited);
      setDatasetMeta(meta);

      const cols = limited.length ? Object.keys(limited[0]) : [];
      setColumns(cols);

      const types: Record<string, "number" | "string"> = {};
      for (const c of cols) {
        // detect by first non-null value
        const val = limited.find((r) => r[c] !== null && r[c] !== undefined)?.[c];
        let t: "number" | "string" = typeof val === "number" ? "number" : "string";
        if (t === "string" && typeof val === "string" && val !== "") {
          const n = Number(val);
          if (!Number.isNaN(n)) t = "number";
        }
        types[c] = t;
      }
      setColTypes(types);

      const defaultTarget = cols[cols.length - 1] || "";
      setTarget(defaultTarget);
      setFeatures(cols.filter((c) => c !== defaultTarget));

      const uniq = new Set(limited.map((r) => r[defaultTarget])).size;
      setLabelCardinality(uniq);
      setModelType(uniq > 0 && uniq <= 20 ? "classification" : "regression");

      // Trigger auto-config if enabled
      if (autoConfigure) {
        runAutoConfigure(limited, cols, types);
      }
    },
    [autoConfigure]
  );

  const convertToCSV = useCallback((data: Array<Record<string, any>>, orderedColumns: string[]) => {
    if (!data || data.length === 0) return "";
    const headers = orderedColumns.length ? orderedColumns : Object.keys(data[0] || {});
    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const s = String(value);
          if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
            return `"${s.replace(/\"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    );
    return [headers.join(","), ...csvRows].join("\n");
  }, []);

  const stopPolling = useCallback(() => {
    if (logsPollRef.current) {
      clearInterval(logsPollRef.current);
      logsPollRef.current = null;
    }
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const doBackendTrain = useCallback(async () => {
    try {
      if (!rows.length || !target || featureColumns.length === 0) {
        toast({ title: "Missing inputs", description: "Select dataset, target, and features", variant: "destructive" });
        return false;
      }

      const trainingConfig = {
        target,
        features: featureColumns,
        modelType,
        testSplit,
        epochs,
        batchSize,
        columns,
        datasetName: datasetMeta?.name || "",
      };

      const csv = convertToCSV(rows, columns);

      setIsTraining(true);
      setTrainProgress(0);
      setMetrics(null);
      setArtifactPathState(null);
      setEpochEvents([]);
      setShowTrainDialog(true);
      lastEpochRef.current = 0;

      const res = await fetch("/api/train/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: trainingConfig, datasetName: datasetMeta?.name || "", csv })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success || !payload?.jobId) {
        throw new Error(payload?.error || "Failed to start backend training");
      }
      const createdJobId = payload.jobId as string;
      setJobId(createdJobId);

      logsPollRef.current = setInterval(async () => {
        try {
          const lr = await fetch(`/api/train/job-logs?jobId=${createdJobId}&sinceEpoch=${Math.max(1, lastEpochRef.current)}`);
          const lp = await lr.json().catch(() => null);
          if (lr.ok && lp?.success && Array.isArray(lp.logs)) {
            const newEvents = lp.logs
              .filter((l: any) => typeof l.epoch === "number")
              .map((l: any) => ({ epoch: l.epoch, progress: l.progress || 0, metrics: l.metrics || undefined, message: l.message || undefined, ts: l.created_at || new Date().toISOString() }));
            if (newEvents.length) {
              const maxEpoch = newEvents[newEvents.length - 1].epoch;
              lastEpochRef.current = Math.max(lastEpochRef.current, maxEpoch);
              setEpochEvents((prev) => {
                const merged = [...prev, ...newEvents];
                const uniq = new Map<string, any>();
                for (const e of merged) uniq.set(`${e.epoch}-${e.ts}`, e);
                return Array.from(uniq.values()).sort((a, b) => a.epoch - b.epoch);
              });
              const last = newEvents[newEvents.length - 1];
              setTrainProgress(last.progress || 0);
            }
          }
        } catch { }
      }, 1000);

      statusPollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/api/train/job-status?jobId=${createdJobId}`);
          const sp = await sr.json().catch(() => null);
          if (sr.ok && sp?.success && sp.job) {
            const j = sp.job;
            setTrainProgress(typeof j.progress === "number" ? j.progress : 0);
            if (j.last_metrics) setMetrics(j.last_metrics);
            if (j.artifact_path) setArtifactPathState(j.artifact_path);
            if (j.status === "COMPLETED" || j.status === "FAILED") {
              stopPolling();
              setIsTraining(false);
            }
          }
        } catch { }
      }, 1500);

      return true;
    } catch (e: any) {
      toast({ title: "Backend training failed", description: e?.message || "Unknown error", variant: "destructive" });
      stopPolling();
      setIsTraining(false);
      return false;
    }
  }, [rows, target, featureColumns, modelType, testSplit, epochs, batchSize, columns, datasetMeta, toast, stopPolling, convertToCSV]);

  const onAnalysisStart = useCallback(() => { }, []);

  const ensureTf = useCallback(async () => {
    if (!tfRef.current) {
      tfRef.current = await import("@tensorflow/tfjs");
    }
    return tfRef.current;
  }, []);

  const onCleanDataset = useCallback(async (): Promise<boolean> => {
    try {
      if (!rows.length || columns.length === 0) {
        toast({ title: "No dataset", description: "Select a dataset first", variant: "destructive" });
        return false;
      }
      setIsCleaning(true);
      const schema = columns.map((name) => ({ name, type: (colTypes[name] || "string") as "number" | "string" }));
      const res = await fetch("/api/train/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, rows, target })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success || !Array.isArray(payload.cleanedRows)) {
        throw new Error(payload?.error || "Failed to clean dataset");
      }
      const newRows: Record<string, any>[] = payload.cleanedRows;
      setRows(newRows);
      const cols = newRows.length ? Object.keys(newRows[0]) : columns;
      setColumns(cols);
      const types: Record<string, "number" | "string"> = {};
      for (const c of cols) {
        const val = newRows.find((r) => r[c] !== null && r[c] !== undefined)?.[c];
        let t: "number" | "string" = typeof val === "number" ? "number" : "string";
        if (t === "string" && typeof val === "string" && val !== "") {
          const n = Number(val);
          if (!Number.isNaN(n)) t = "number";
        }
        types[c] = t;
      }
      setColTypes(types);
      const uniq = new Set(newRows.map((r) => r[target])).size;
      setLabelCardinality(uniq);
      setModelType(uniq > 0 && uniq <= 20 ? "classification" : "regression");
      setFeatures(cols.filter((c) => c !== target));
      setCleanedOnce(true);
      toast({ title: "Dataset cleaned", description: `Rows: ${newRows.length}` });
      return true;
    } catch (e: any) {
      toast({ title: "Cleaning failed", description: e?.message || "Unknown error", variant: "destructive" });
      return false;
    } finally {
      setIsCleaning(false);
    }
  }, [rows, columns, colTypes, target, toast]);

  const onGeneratePlan = useCallback(async () => {
    try {
      if (!rows.length || columns.length === 0) {
        toast({ title: "No dataset", description: "Select a dataset first", variant: "destructive" });
        return;
      }
      setIsGeneratingPlan(true);
      setPlanError("");
      const schema = columns.map((name) => ({ name, type: colTypes[name] || "string" }));
      const sampleRows = rows.slice(0, 100);
      const res = await fetch("/api/train/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, sampleRows, preferences: { scriptLanguage: "python" } }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success || !payload?.plan) {
        throw new Error(payload?.error || "Failed to generate plan");
      }
      setPlan(payload.plan);
      setPlanDialogOpen(true);
    } catch (e: any) {
      setPlan(null);
      setPlanError(e?.message || "Plan generation failed");
      toast({ title: "Plan generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [rows, columns, colTypes, toast]);

  const buildEncoders = useCallback(
    (data: Record<string, any>[], feats: string[], tgt: string) => {
      const catMaps: Record<string, string[]> = {};
      for (const c of feats) {
        if (colTypes[c] === "string") {
          const cats = Array.from(new Set(data.map((r) => (r[c] ?? "").toString())));
          catMaps[c] = cats;
        }
      }
      let labelCats: string[] = [];
      if (modelType === "classification") {
        labelCats = Array.from(new Set(data.map((r) => (r[tgt] ?? "").toString())));
      }
      return { catMaps, labelCats };
    },
    [colTypes, modelType]
  );

  const vectorize = useCallback(
    (
      data: Record<string, any>[],
      feats: string[],
      tgt: string,
      catMaps: Record<string, string[]>,
      labelCats: string[]
    ) => {
      const X: number[][] = [];
      const y: number[][] = [];
      for (const row of data) {
        const featVec: number[] = [];
        for (const c of feats) {
          const v = row[c];
          if (colTypes[c] === "number") {
            featVec.push(typeof v === "number" ? v : Number(v) || 0);
          } else {
            const cats = catMaps[c] || [];
            const idx = cats.indexOf((v ?? "").toString());
            for (let i = 0; i < cats.length; i++) featVec.push(i === idx ? 1 : 0);
          }
        }
        X.push(featVec);

        const lv = row[tgt];
        if (modelType === "classification") {
          const idx = labelCats.indexOf((lv ?? "").toString());
          const onehot = new Array(labelCats.length).fill(0);
          if (idx >= 0) onehot[idx] = 1;
          y.push(onehot);
        } else {
          const num = typeof lv === "number" ? lv : Number(lv) || 0;
          y.push([num]);
        }
      }
      return { X, y };
    },
    [colTypes, modelType]
  );

  const standardize = useCallback((X: number[][]) => {
    const cols = X[0]?.length || 0;
    const means = new Array(cols).fill(0);
    const stds = new Array(cols).fill(0);
    const n = X.length;
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += X[i][j];
      means[j] = s / Math.max(1, n);
      let v = 0;
      for (let i = 0; i < n; i++) v += (X[i][j] - means[j]) ** 2;
      stds[j] = Math.sqrt(v / Math.max(1, n)) || 1;
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < cols; j++) X[i][j] = (X[i][j] - means[j]) / stds[j];
    }
    return { X, means, stds };
  }, []);

  const doTrain = useCallback(async () => {
    try {
      if (!rows.length || !target || featureColumns.length === 0) {
        toast({ title: "Missing inputs", description: "Select dataset, target, and features", variant: "destructive" });
        return;
      }
      const tf = await ensureTf();

      // Prepare job config
      const trainingConfig = {
        target,
        features: featureColumns,
        modelType,
        testSplit,
        epochs,
        batchSize,
        columns,
        datasetName: datasetMeta?.name || "",
      };

      // Create Supabase client and user (optional; skip persistence if unauthenticated or client not configured)
      const sb = createSupabaseBrowserClient();
      let userId: string | null = null;
      if (sb) {
        const { data: { user } } = await sb.auth.getUser();
        userId = user?.id || null;
      }

      // Create training job in backend (if authenticated)
      let createdJobId: string | null = null;
      try {
        if (userId) {
          const res = await fetch("/api/train/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datasetName: datasetMeta?.name || null, config: trainingConfig })
          });
          const payload = await res.json().catch(() => null);
          if (res.ok && payload?.success && payload?.jobId) {
            createdJobId = payload.jobId;
            setJobId(createdJobId);
          }
        }
      } catch { }

      const { catMaps, labelCats } = buildEncoders(rows, featureColumns, target);
      const { X, y } = vectorize(rows, featureColumns, target, catMaps, labelCats);
      if (!X.length) throw new Error("Empty data after vectorization");

      const { X: Xs } = standardize(X);

      const N = Xs.length;
      const idx = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - 0.5);
      const testN = Math.max(1, Math.floor(N * testSplit));
      const testIdx = new Set(idx.slice(0, testN));

      const Xtrain: number[][] = [], ytrain: number[][] = [];
      const Xtest: number[][] = [], ytest: number[][] = [];
      for (let i = 0; i < N; i++) {
        if (testIdx.has(i)) {
          Xtest.push(Xs[i]);
          ytest.push(y[i]);
        } else {
          Xtrain.push(Xs[i]);
          ytrain.push(y[i]);
        }
      }

      const xTrainT = tf.tensor2d(Xtrain);
      const yTrainT = tf.tensor2d(ytrain);
      const xTestT = tf.tensor2d(Xtest);
      const yTestT = tf.tensor2d(ytest);

      const inputDim = Xtrain[0].length;
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 64, activation: "relu", inputShape: [inputDim] }));
      model.add(tf.layers.dense({ units: modelType === "classification" ? Math.max(2, labelCats.length) : 1, activation: modelType === "classification" ? "softmax" : "linear" }));

      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: modelType === "classification" ? "categoricalCrossentropy" : "meanSquaredError",
        metrics: modelType === "classification" ? ["accuracy"] : ["mae"],
      });

      setIsTraining(true);
      setTrainProgress(0);
      setMetrics(null);
      setArtifactPathState(null);
      setEpochEvents([]);
      setShowTrainDialog(true);

      await model.fit(xTrainT, yTrainT, {
        epochs,
        batchSize,
        validationData: [xTestT, yTestT],
        callbacks: {
          onEpochEnd: async (epoch: number, logs?: Record<string, number>) => {
            setTrainProgress(Math.round(((epoch + 1) / epochs) * 100));
            setEpochEvents((prev) => [
              ...prev,
              { epoch: epoch + 1, progress: Math.round(((epoch + 1) / epochs) * 100), metrics: logs || undefined, message: `Epoch ${epoch + 1}/${epochs}`, ts: new Date().toISOString() }
            ]);

            // Persist per-epoch event to backend (best-effort)
            if (createdJobId) {
              try {
                await fetch("/api/train/events", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jobId: createdJobId,
                    epoch: epoch + 1,
                    progress: Math.round(((epoch + 1) / epochs) * 100),
                    metrics: logs || null,
                    message: `Epoch ${epoch + 1}/${epochs}`,
                  })
                });
              } catch { }
            }
          },
        },
      });

      const preds = model.predict(xTestT) as any;
      let outMetrics: Record<string, number> = {};
      if (modelType === "classification") {
        const yTrue = yTestT.argMax(-1);
        const yPred = preds.argMax(-1);
        const acc = yTrue.equal(yPred).sum().arraySync() / yTrue.shape[0];
        outMetrics = { accuracy: Number(acc.toFixed(4)) };
        yTrue.dispose();
        yPred.dispose();
      } else {
        const mse = tf.losses.meanSquaredError(yTestT, preds).mean().arraySync();
        const rmse = Math.sqrt(Number(mse));
        const mae = tf.losses.absoluteDifference(yTestT, preds).mean().arraySync();
        outMetrics = { rmse: Number(rmse.toFixed(4)), mae: Number(mae.toFixed(4)) };
      }

      setMetrics(outMetrics);

      // attach to ref for export
      (window as any).__synthara_model__ = model;
      (window as any).__synthara_preproc__ = { target, featureColumns, colTypes, encoders: { labelCats, catMaps: Object.fromEntries(Object.entries(catMaps).map(([k, v]) => [k, Array.from(v)])) } };

      // Upload artifacts to Supabase Storage and finalize job (best-effort)
      let artifactPath: string | null = null;
      try {
        if (sb && userId && createdJobId) {
          // Serialize TFJS model artifacts (model.json + weights.bin)
          const artifacts = await new Promise<any>(async (resolve, reject) => {
            try {
              const handler = tf.io.withSaveHandler(async (art: any) => {
                resolve(art);
                return {
                  modelArtifactsInfo: {
                    dateSaved: new Date(),
                    modelTopologyType: "JSON",
                    modelTopologyBytes: 0,
                    weightSpecsBytes: 0,
                    weightDataBytes: art?.weightData?.byteLength || 0,
                  },
                };
              });
              await model.save(handler);
            } catch (e) {
              reject(e);
            }
          });

          const weightsBin = new Blob([artifacts.weightData], { type: "application/octet-stream" });
          const modelJsonContent = JSON.stringify({
            modelTopology: artifacts.modelTopology,
            weightsManifest: [
              {
                paths: ["weights.bin"],
                weights: artifacts.weightSpecs || [],
              },
            ],
          });
          const modelJson = new Blob([modelJsonContent], { type: "application/json" });

          // Also upload preprocessing metadata
          const meta = {
            preproc: (window as any).__synthara_preproc__,
            config: trainingConfig,
            metrics: outMetrics,
            createdAt: new Date().toISOString(),
          };
          const metadataJson = new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" });

          const basePath = `${userId}/${createdJobId}`;
          const up1 = await sb.storage.from("models").upload(`${basePath}/model.json`, modelJson, { upsert: true, contentType: "application/json" });
          const up2 = await sb.storage.from("models").upload(`${basePath}/weights.bin`, weightsBin, { upsert: true, contentType: "application/octet-stream" });
          const up3 = await sb.storage.from("models").upload(`${basePath}/metadata.json`, metadataJson, { upsert: true, contentType: "application/json" });
          if (!up1.error && !up2.error && !up3.error) {
            artifactPath = `${basePath}/model.json`;
          }
          setArtifactPathState(artifactPath);

          // Finalize job
          await fetch("/api/train/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: createdJobId, status: "COMPLETED", metrics: outMetrics, artifactPath, message: "Training completed" })
          });
        }
      } catch {
        // Finalize as completed even if artifact upload fails
        if (createdJobId) {
          try {
            await fetch("/api/train/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: createdJobId, status: "COMPLETED", metrics: outMetrics, artifactPath: null, message: "Training completed (artifact upload failed)" })
            });
          } catch { }
        }
      }

      toast({ title: "Training complete", description: `Metrics: ${Object.entries(outMetrics).map(([k, v]) => `${k}=${v}`).join(", ")}` });

      xTrainT.dispose();
      yTrainT.dispose();
      xTestT.dispose();
      yTestT.dispose();
      preds.dispose && preds.dispose();
    } catch (e: any) {
      // Mark job as failed if created
      try {
        if (jobId) {
          await fetch("/api/train/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, status: "FAILED", message: e?.message || "Training failed" })
          });
        }
      } catch { }
      toast({ title: "Training failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsTraining(false);
    }
  }, [rows, target, featureColumns, toast, ensureTf, buildEncoders, vectorize, standardize, modelType, testSplit, epochs, batchSize, colTypes]);

  const onRunPipeline = useCallback(async () => {
    try {
      if (!rows.length || columns.length === 0) {
        toast({ title: "No dataset", description: "Select a dataset first", variant: "destructive" });
        return;
      }
      setIsPipeline(true);
      setShowTrainDialog(true);
      setEpochEvents((prev) => [...prev, { epoch: 0, progress: 0, message: "Starting pipeline...", ts: new Date().toISOString() }]);

      if (!cleanedOnce) {
        setEpochEvents((prev) => [...prev, { epoch: 0, progress: 0, message: "Cleaning dataset (AI)...", ts: new Date().toISOString() }]);
        const ok = await onCleanDataset();
        if (!ok) throw new Error("Cleaning failed");
        setEpochEvents((prev) => [...prev, { epoch: 0, progress: 0, message: "Cleaning completed", ts: new Date().toISOString() }]);
      }

      setEpochEvents((prev) => [...prev, { epoch: 0, progress: 0, message: "Generating training plan...", ts: new Date().toISOString() }]);
      const schema = columns.map((name) => ({ name, type: colTypes[name] || "string" }));
      const sampleRows = rows.slice(0, 100);
      const res = await fetch("/api/train/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, sampleRows, preferences: { scriptLanguage: "python" } }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success || !payload?.plan) {
        throw new Error(payload?.error || "Failed to generate plan");
      }
      const p = payload.plan as NonNullable<typeof plan>;
      setPlan(p);
      // apply plan settings
      setTarget(p.targetColumn || target);
      setModelType(p.modelType || modelType);
      setFeatures(Array.isArray(p.features) && p.features.length ? p.features : columns.filter((c) => c !== (p.targetColumn || target)));
      setTestSplit(p.params?.testSplit ?? testSplit);
      setEpochs(p.params?.epochs ?? epochs);
      setBatchSize(p.params?.batchSize ?? batchSize);
      setEpochEvents((prev) => [...prev, { epoch: 0, progress: 0, message: "Plan ready. Starting training...", ts: new Date().toISOString() }]);

      const ok = await doBackendTrain();
      if (!ok) {
        await doTrain();
      }
    } catch (e: any) {
      setEpochEvents((prev) => [...prev, { epoch: 0, progress: 0, message: `Pipeline failed: ${e?.message || 'Unknown error'}`, ts: new Date().toISOString() }]);
      toast({ title: "Pipeline failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsPipeline(false);
    }
  }, [rows, columns, colTypes, cleanedOnce, onCleanDataset, doBackendTrain, doTrain, toast, target, modelType, testSplit, epochs, batchSize]);

  const downloadWeightsBin = useCallback(async () => {
    try {
      const tf = await ensureTf();
      const model = (window as any).__synthara_model__;
      if (!model) throw new Error("No model trained yet");
      const name = (datasetMeta?.name || "synthara").replace(/[^a-z0-9-_]+/gi, "-");
      const handler = tf.io.withSaveHandler(async (artifacts: any) => {
        const weightData: ArrayBuffer = artifacts.weightData;
        const blob = new Blob([weightData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name}-${modelType}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: "JSON",
            modelTopologyBytes: 0,
            weightSpecsBytes: 0,
            weightDataBytes: weightData.byteLength,
          },
        };
      });
      await model.save(handler);
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Unable to download model", variant: "destructive" });
    }
  }, [ensureTf, modelType, datasetMeta, toast]);

  const runAutoConfigure = useCallback(
    (data: Record<string, any>[], cols: string[], types: Record<string, "number" | "string">) => {
      setIsAutoConfigRunning(true);
      setAutoConfigMsg("Model is selecting best params for this dataset...");

      // Simulate async work and allow UI to show loading
      setTimeout(() => {
        try {
          // Heuristics: drop id-like columns and low-variance columns
          const isIdLike = (name: string) => /^(id|uuid|index|row|timestamp)$/i.test(name);
          const uniqueCount = (k: string) => new Set(data.map((r) => r[k])).size;
          const n = data.length;

          const candidateCols = cols.filter((c) => !isIdLike(c) && uniqueCount(c) > 1);

          // Pick target: prefer low-cardinality categorical for classification
          let suggestedTarget = target;
          let suggestedModel: ModelType = modelType;
          let bestScore = -Infinity;
          for (const c of candidateCols) {
            const u = uniqueCount(c);
            const t = types[c];
            const ratio = u / Math.max(1, n);
            // Score: categorical with small cardinality wins, else numeric with higher variance proxy
            let score = -1;
            if (t === "string") {
              if (u >= 2 && u <= 20 && ratio <= 0.7) score = 100 - u; // prefer fewer classes but not 1
            } else {
              if (u > 10) score = 50 + Math.min(50, u / 10); // treat unique-count as variance proxy
            }
            if (score > bestScore) {
              bestScore = score;
              suggestedTarget = c;
              suggestedModel = t === "string" && u <= 20 ? "classification" : "regression";
            }
          }

          // Features: exclude target; include numeric and categorical with <= 50 classes
          const featSet: string[] = [];
          for (const c of candidateCols) {
            if (c === suggestedTarget) continue;
            if (types[c] === "number") {
              featSet.push(c);
            } else if (uniqueCount(c) <= 50) {
              featSet.push(c);
            }
          }

          // Reasonable defaults for training size
          let suggestedSplit = 0.2;
          if (n < 500) suggestedSplit = 0.3;
          else if (n > 3000) suggestedSplit = 0.15;

          let suggestedEpochs = Math.max(8, Math.min(20, Math.round(8000 / Math.max(200, n))))
          let suggestedBatch = n < 1000 ? 32 : n < 4000 ? 64 : 128;

          setTarget(suggestedTarget || target);
          setModelType(suggestedModel);
          setFeatures(featSet.length ? featSet : cols.filter((c) => c !== suggestedTarget));
          setTestSplit(suggestedSplit);
          setEpochs(suggestedEpochs);
          setBatchSize(suggestedBatch);

          setLabelCardinality(uniqueCount(suggestedTarget));

          toast({ title: "Configuration updated", description: "Best-effort parameters selected for this dataset" });
        } catch (e: any) {
          toast({ title: "Auto-config failed", description: e?.message || "Could not select parameters", variant: "destructive" });
        } finally {
          setIsAutoConfigRunning(false);
          setAutoConfigMsg("");
        }
      }, 600);
    },
    [toast, modelType, target]
  );

  const disableTrain = !rows.length || !target || featureColumns.length === 0;

  const onAcceptPlanAndTrain = useCallback(async () => {
    if (!plan) return;
    setTarget(plan.targetColumn || target);
    setModelType(plan.modelType || modelType);
    setFeatures(Array.isArray(plan.features) && plan.features.length ? plan.features : features);
    setTestSplit(plan.params?.testSplit ?? testSplit);
    setEpochs(plan.params?.epochs ?? epochs);
    setBatchSize(plan.params?.batchSize ?? batchSize);
    setPlanDialogOpen(false);
    setTimeout(async () => {
      const ok = await doBackendTrain();
      if (!ok) {
        await doTrain();
      }
    }, 0);
  }, [plan, doBackendTrain, doTrain, target, modelType, features, testSplit, epochs, batchSize]);

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            AI Model <span className="text-primary">Intelligence</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Neural training workflow for predictive synthesis.
          </p>
        </div>

        <div className="flex-1 max-w-3xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { step: "01", label: "Dataset", icon: Database },
              { step: "02", label: "Target", icon: FileText },
              { step: "03", label: "Neural", icon: Brain },
              { step: "04", label: "Execute", icon: Play },
              { step: "05", label: "Export", icon: Download }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5 group">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black font-mono text-primary/40 group-hover:text-primary transition-colors">{item.step}</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                <div className="flex items-center gap-1.5">
                  <item.icon className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 group-hover:text-foreground">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1 & 2: Configuration (Full Width) */}
        <div className="space-y-4">
          <div className="modern-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2">
                <Database className="size-3.5 text-primary" />
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-foreground">Dataset Selection</h3>
              </div>
            </div>
            <div className="p-3">
              <DatasetSelector onDatasetSelect={onDatasetSelect} onAnalysisStart={onAnalysisStart} />
            </div>
          </div>

          {rows.length > 0 && (
            <div className="modern-card overflow-hidden animate-in slide-in-from-top-2 duration-300">
              <div className="px-4 py-2 border-b border-border/30 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-blue-500" />
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-foreground">Training Parameters</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary/70 uppercase">Auto-Pilot</span>
                  <Switch checked={autoConfigure} onCheckedChange={setAutoConfigure} className="scale-75" />
                </div>
              </div>
              <div className="p-4 space-y-4">
                {isAutoConfigRunning && (
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <p className="text-[10px] font-bold text-primary uppercase">{autoConfigMsg || "Optimizing Settings..."}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Predict (Target)</Label>
                      <Select value={target} onValueChange={(v) => {
                        setTarget(v);
                        const uniq = new Set(rows.map((r) => r[v])).size;
                        setLabelCardinality(uniq);
                        setModelType(uniq > 0 && uniq <= 20 ? "classification" : "regression");
                        setFeatures(columns.filter((c) => c !== v));
                      }}>
                        <SelectTrigger className="h-9 rounded-lg bg-secondary/30 border-border/50 font-bold text-xs">
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Model Type</Label>
                        <Select value={modelType} onValueChange={(v: ModelType) => setModelType(v)} disabled={autoConfigure}>
                          <SelectTrigger className="h-9 rounded-lg bg-secondary/30 border-border/50 font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classification">Classification</SelectItem>
                            <SelectItem value="regression">Regression</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Validation Split</Label>
                        <Input type="number" min={0.05} max={0.5} step={0.05} value={testSplit}
                          className="h-9 rounded-lg bg-secondary/30 border-border/50 font-bold text-xs"
                          onChange={(e) => setTestSplit(Math.min(0.5, Math.max(0.05, Number(e.target.value) || 0.2)))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Iterations</Label>
                        <Input type="number" min={1} max={100} value={epochs} className="h-9 rounded-lg bg-secondary/30 border-border/50 font-bold text-xs" onChange={(e) => setEpochs(Math.min(100, Math.max(1, Number(e.target.value) || 20)))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Batch Size</Label>
                        <Input type="number" min={8} max={256} step={8} value={batchSize} className="h-9 rounded-lg bg-secondary/30 border-border/50 font-bold text-xs" onChange={(e) => setBatchSize(Math.min(256, Math.max(8, Number(e.target.value) || 32)))} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Feature Columns</Label>
                      <div className="flex flex-wrap gap-1 h-[140px] overflow-y-auto p-2 rounded-lg bg-secondary/20 border border-border/20 content-start">
                        {columns.filter((c) => c !== target).map((c) => {
                          const active = featureColumns.includes(c);
                          return (
                            <Badge
                              key={c}
                              variant={active ? "default" : "outline"}
                              className={`cursor-pointer h-6 px-2 text-[10px] font-bold uppercase tracking-tight transition-all ${active ? 'bg-primary' : 'bg-transparent text-muted-foreground hover:bg-muted/50'}`}
                              onClick={() => {
                                setFeatures((prev) => active ? prev.filter((x) => x !== c) : [...prev, c]);
                              }}
                            >
                              {c}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      {isGeneratingPlan ? (
                        <div className="p-8 modern-card bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-3 animate-pulse">
                          <Loader2 className="size-8 text-primary animate-spin" />
                          <div className="space-y-1 text-center">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Architecting Strategy</p>
                            <p className="text-[10px] text-muted-foreground font-medium italic">Synthesizing neural training logic...</p>
                          </div>
                        </div>
                      ) : plan ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Button
                            className="w-full h-10 rounded-lg font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs uppercase tracking-wide"
                            onClick={onRunPipeline}
                            disabled={disableTrain || isTraining || isGeneratingPlan || isCleaning || isPipeline}
                          >
                            {isPipeline ? <Loader2 className="size-4 animate-spin mr-2" /> : <Play className="size-4 mr-2" />}
                            Execute Accepted Strategy
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-9 rounded-lg font-bold text-[10px] uppercase tracking-wide border border-primary/20 bg-primary/5 text-primary"
                              onClick={onCleanDataset}
                              disabled={disableTrain || isTraining || isGeneratingPlan || isCleaning}
                            >
                              {isCleaning ? <Loader2 className="size-3 animate-spin mr-2" /> : <Sparkles className="size-3 mr-2" />} Optimize Data
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-lg font-bold text-[10px] uppercase tracking-wide border-border/50"
                              onClick={() => setPlanDialogOpen(true)}
                            >
                              Review Strategy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full h-10 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs uppercase tracking-wide"
                          onClick={onGeneratePlan}
                          disabled={disableTrain || isTraining || isGeneratingPlan}
                        >
                          <Brain className="size-4 mr-2" />
                          Generate Training Strategy
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Training Monitor (Sequential Trigger) */}
        {(isTraining || metrics || isPipeline) && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="size-1 bg-emerald-500 rounded-full animate-pulse" />
                Live Execution Stage
              </h2>
              <div className="h-px flex-1 bg-border/20" />
            </div>

            <div className="modern-card overflow-hidden">
              <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <Brain className="size-4 text-primary" />
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-foreground">Model Metrics & Activity</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`size-1.5 rounded-full ${isTraining ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">{isTraining ? 'Training...' : 'Standby'}</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {isTraining || isPipeline ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Overall Progress</p>
                      <p className="text-lg font-bold font-mono text-primary">{trainProgress}%</p>
                    </div>
                    <Progress value={trainProgress} className="h-2 rounded-full bg-secondary/50" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="modern-card p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Metrics</p>
                        <div className="flex flex-wrap gap-2">
                          {metrics ? (
                            Object.entries(metrics).map(([k, v]) => (
                              <div key={k} className="p-3 rounded-lg bg-secondary/50 border border-border/50 flex-1 min-w-[100px]">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">{k}</p>
                                <p className="text-md font-bold text-foreground">{v}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-lg border border-dashed text-[9px] font-bold text-muted-foreground/30 uppercase italic text-center w-full">Computation in progress...</div>
                          )}
                        </div>
                      </div>
                      <div className="modern-card overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-border/10 bg-muted/10">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Epoch Lifecycle</p>
                        </div>
                        <ScrollArea className="h-[100px] p-3 font-mono text-[9px] leading-relaxed">
                          {epochEvents.map((e, idx) => (
                            <div key={idx} className="flex gap-3 border-b border-border/5 py-1">
                              <span className="text-primary/70 shrink-0">[{new Date(e.ts).toLocaleTimeString()}]</span>
                              <span className="font-bold shrink-0">E:{e.epoch}</span>
                              <span className="text-muted-foreground truncate">{e.message || 'Processing...'}</span>
                            </div>
                          ))}
                          {epochEvents.length === 0 && <div className="text-muted-foreground/30 italic">Initializing neural nodes...</div>}
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                ) : metrics ? (
                  <div className="modern-card border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4 animate-in zoom-in-95 duration-500">
                    <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="size-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Training Completed</h3>
                      <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">The model has finished training successfully.</p>
                    </div>
                    <div className="flex justify-center flex-wrap gap-3 pt-2">
                      {Object.entries(metrics).map(([k, v]) => (
                        <div key={k} className="px-6 py-3 rounded-xl bg-white/5 border border-emerald-500/20">
                          <p className="text-[9px] font-bold text-emerald-600/70 uppercase mb-0.5">{k}</p>
                          <p className="text-xl font-bold text-foreground tracking-tight">{v}</p>
                        </div>
                      ))}
                    </div>
                    {artifactPathState && (
                      <div className="pt-4">
                        <Button onClick={downloadWeightsBin} className="bg-emerald-600 hover:bg-emerald-700 h-10 px-8 rounded-lg font-bold shadow-xl shadow-emerald-600/20 transition-all text-xs">
                          <Download className="mr-2 size-4" /> Download Model (.bin)
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Training Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: "Predict (Target)", desc: "The column being synthesized.", icon: FileText },
                { title: "Neural Architecture", desc: "Layers optimized for model type.", icon: Brain },
                { title: "Optimization", desc: "Monitored via loss & accuracy.", icon: TrendingUp }
              ].map((item, i) => (
                <div key={i} className="modern-card p-4 flex gap-3 items-start border-none bg-muted/5 group hover:bg-muted/10 transition-all">
                  <div className="p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
                    <item.icon className="size-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-foreground uppercase tracking-tight">{item.title}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-2xl modern-card border-none shadow-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
            <DialogTitle className="text-lg font-bold text-foreground tracking-tight">Model Training Plan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">Review the proposed model structure and parameters.</DialogDescription>
          </div>
          {isGeneratingPlan ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
              <div className="relative">
                <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Brain className="size-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-sm font-bold text-foreground">Architecting Strategy</h3>
                <p className="text-xs text-muted-foreground font-medium">Analyzing patterns and selecting optimal neural pathways...</p>
              </div>
            </div>
          ) : plan && (
            <div className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">Architecture</h4>
                  <div className="p-4 rounded-xl bg-secondary/30 space-y-2 border border-border/50">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Mode</span><Badge variant="secondary" className="font-bold text-primary uppercase h-5 text-[9px]">{plan.modelType}</Badge></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Target</span><span className="text-[10px] font-bold">{plan.targetColumn}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Epochs</span><span className="text-[10px] font-bold">{plan.params.epochs}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Rationale</h4>
                  <div className="p-4 h-full rounded-xl bg-secondary/20 border border-border/30">
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">"{plan.rationale || "Automated strategy optimized for this dataset."}"</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Logic ({plan.scriptLanguage})</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      const win = window.open("", "_blank");
                      if (win) {
                        win.document.write(`<html><body style="background:#0d1117;color:#8b949e;padding:40px;font-family:monospace;white-space:pre-wrap;">${plan.script}</body></html>`);
                        win.document.close();
                      }
                    }}
                  >
                    <Maximize2 className="size-3" />
                  </Button>
                </div>
                <div className="relative">
                  <ScrollArea className="h-48 rounded-xl bg-[#0d1117] border border-border/30 p-4">
                    <pre className="font-mono text-[10px] text-blue-300/90 leading-relaxed overflow-x-auto whitespace-pre-wrap">{plan.script}</pre>
                  </ScrollArea>
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none rounded-b-xl" />
                  <div className="flex gap-2 absolute bottom-2 right-2">
                    <Button
                      variant="link"
                      className="text-[10px] font-bold text-primary px-2 h-6"
                      onClick={() => {
                        const blob = new Blob([plan.script], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `training_script.py`;
                        a.click();
                      }}
                    >
                      Download .py
                    </Button>
                    <Button
                      variant="link"
                      className="text-[10px] font-bold text-emerald-500 px-2 h-6 hover:text-emerald-400"
                      onClick={() => {
                        const notebook = {
                          cells: [
                            {
                              cell_type: "markdown",
                              metadata: {},
                              source: [
                                `# Synthara AI Training Strategy\n`,
                                `**Target:** ${plan.targetColumn} | **Mode:** ${plan.modelType}\n`,
                                `\n`,
                                `### Rationale\n`,
                                `${plan.rationale || "Automated strategy optimized for this dataset."}`
                              ]
                            },
                            {
                              cell_type: "code",
                              execution_count: null,
                              metadata: {},
                              outputs: [],
                              source: plan.script.split('\n').map(line => line + '\n')
                            }
                          ],
                          metadata: {
                            kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
                            language_info: { name: "python", version: "3.8" }
                          },
                          nbformat: 4,
                          nbformat_minor: 0
                        };
                        const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/x-ipynb+json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `synthara_colab_strategy.ipynb`;
                        a.click();
                      }}
                    >
                      Launch in Colab (.ipynb)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border/30">
            <div className="w-full flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setPlanDialogOpen(false)} className="h-9 rounded-lg font-bold text-[10px] uppercase tracking-wider">Decline</Button>
              <Button variant="outline" onClick={onGeneratePlan} disabled={isGeneratingPlan} className="h-9 rounded-lg font-bold text-[10px] uppercase tracking-wider border-border/50">
                {isGeneratingPlan ? <Loader2 className="size-3 animate-spin mr-2" /> : null} New
              </Button>
              <Button onClick={onAcceptPlanAndTrain} disabled={!plan} className="h-9 px-6 rounded-lg font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 uppercase tracking-wider text-[10px]">Accept & Start</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
