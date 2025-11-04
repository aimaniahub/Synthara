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
import { Download, Play, Pause, Database, Loader2, Sparkles } from "lucide-react";
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
  const [epochEvents, setEpochEvents] = useState<Array<{epoch:number;progress:number;metrics?:Record<string,number>;message?:string;ts:string}>>([]);

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
        } catch {}
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
        } catch {}
      }, 1500);

      return true;
    } catch (e: any) {
      toast({ title: "Backend training failed", description: e?.message || "Unknown error", variant: "destructive" });
      stopPolling();
      setIsTraining(false);
      return false;
    }
  }, [rows, target, featureColumns, modelType, testSplit, epochs, batchSize, columns, datasetMeta, toast, stopPolling, convertToCSV]);

  const onAnalysisStart = useCallback(() => {}, []);

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
      } catch {}

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
              } catch {}
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
          } catch {}
        }
      }

      toast({ title: "Training complete", description: `Metrics: ${Object.entries(outMetrics).map(([k,v]) => `${k}=${v}`).join(", ")}` });

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
      } catch {}
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5"/> Select Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <DatasetSelector onDatasetSelect={onDatasetSelect} onAnalysisStart={onAnalysisStart} />
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
        <CardHeader>
          <CardTitle>Configure Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4"/> AI Auto-Configure</Label>
                <div className="text-xs text-muted-foreground">Automatically selects target, features, and training params based on the dataset.</div>
              </div>
              <Switch checked={autoConfigure} onCheckedChange={setAutoConfigure} />
            </div>

            {isAutoConfigRunning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {autoConfigMsg || "Model is selecting best params for this dataset..."}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Target Column</Label>
                <Select value={target} onValueChange={(v) => {
                  setTarget(v);
                  const uniq = new Set(rows.map((r) => r[v])).size;
                  setLabelCardinality(uniq);
                  setModelType(uniq > 0 && uniq <= 20 ? "classification" : "regression");
                  setFeatures(columns.filter((c) => c !== v));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Unique values: {labelCardinality}</div>
              </div>

              <div className="space-y-2">
                <Label>Model Type</Label>
                <Select value={modelType} onValueChange={(v: ModelType) => setModelType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Test Split (0.05 - 0.5)</Label>
                <Input type="number" min={0.05} max={0.5} step={0.05} value={testSplit}
                  onChange={(e) => setTestSplit(Math.min(0.5, Math.max(0.05, Number(e.target.value) || 0.2)))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Feature Columns</Label>
              <div className="flex flex-wrap gap-2">
                {columns.filter((c) => c !== target).map((c) => {
                  const active = featureColumns.includes(c);
                  return (
                    <Button key={c} variant={active ? "default" : "secondary"} size="sm" onClick={() => {
                      setFeatures((prev) => active ? prev.filter((x) => x !== c) : [...prev, c]);
                    }}>
                      {c}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Epochs</Label>
                <Input type="number" min={1} max={100} value={epochs} onChange={(e) => setEpochs(Math.min(100, Math.max(1, Number(e.target.value) || 20)))} />
              </div>
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input type="number" min={8} max={256} step={8} value={batchSize} onChange={(e) => setBatchSize(Math.min(256, Math.max(8, Number(e.target.value) || 32)))} />
              </div>
              <div className="space-y-2">
                <Label>Rows Used</Label>
                <div className="h-10 flex items-center"><Badge variant="outline">{rows.length}</Badge></div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <Button className="flex-1" onClick={onRunPipeline} disabled={disableTrain || isTraining || isGeneratingPlan || isCleaning || isPipeline}>
                {isPipeline ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Run Full Pipeline
              </Button>
              <Button variant="secondary" onClick={onCleanDataset} disabled={disableTrain || isTraining || isGeneratingPlan || isCleaning}>
                {isCleaning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Clean Dataset (AI)
              </Button>
              <Button variant="outline" onClick={onGeneratePlan} disabled={disableTrain || isTraining || isGeneratingPlan}>
                {isGeneratingPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Generate Training Plan
              </Button>
              <Button variant="outline" disabled={disableTrain || isTraining} onClick={async () => {
                await doBackendTrain();
              }}>
                {isTraining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Start Training
              </Button>
            </div>

            {isTraining && (
              <div className="space-y-2">
                <Label>Training Progress</Label>
                <div className="text-sm font-medium">Metrics</div>
                <div className="flex flex-wrap gap-2">
                  {metrics ? (
                    Object.entries(metrics).map(([k, v]) => (
                      <Badge key={k} variant="secondary">{k}: {v}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Waiting for first metrics...</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showTrainDialog} onOpenChange={setShowTrainDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Model Training</DialogTitle>
            <DialogDescription>
              {isTraining ? "Live epoch logs and progress" : "Training finished. Summary below."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Progress</Label>
              <Progress value={trainProgress} />
            </div>
            <div>
              <Label>Live Logs</Label>
              <ScrollArea className="h-48 w-full rounded-md border p-3">
                <div className="space-y-2 text-sm">
                  {epochEvents.length === 0 && <div className="text-muted-foreground">Waiting for first epoch...</div>}
                  {epochEvents.map((e) => (
                    <div key={`${e.epoch}-${e.ts}`} className="flex justify-between">
                      <div>
                        <span className="font-medium">Epoch {e.epoch}</span>
                        {e.message ? <span className="text-muted-foreground"> — {e.message}</span> : null}
                      </div>
                      <div className="text-muted-foreground">{e.progress}%</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {metrics && (
              <div className="space-y-2">
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Parameters</div>
                    <div className="text-sm text-muted-foreground">Dataset: {datasetMeta?.name || "-"}</div>
                    <div className="text-sm text-muted-foreground">Model: {modelType}</div>
                    <div className="text-sm text-muted-foreground">Target: {target || "-"}</div>
                    <div className="text-sm text-muted-foreground">Features: {featureColumns.join(", ") || "-"}</div>
                    <div className="text-sm text-muted-foreground">Epochs: {epochs} • Batch: {batchSize} • Test split: {testSplit}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Metrics</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(metrics).map(([k, v]) => (
                        <Badge key={k} variant="secondary">{k}: {v}</Badge>
                      ))}
                    </div>
                    {artifactPathState && (
                      <div className="text-xs text-muted-foreground break-all">Artifact: {artifactPathState}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTrainDialog(false)} disabled={isTraining}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Training Plan</DialogTitle>
            <DialogDescription>{plan ? "Review the proposed parameters and script" : planError || "Unable to load plan"}</DialogDescription>
          </DialogHeader>
          {plan && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Parameters</div>
                  <div className="text-muted-foreground">Target: {plan.targetColumn}</div>
                  <div className="text-muted-foreground">Model: {plan.modelType}</div>
                  <div className="text-muted-foreground">Features: {plan.features.join(", ")}</div>
                  <div className="text-muted-foreground">Epochs: {plan.params.epochs} • Batch: {plan.params.batchSize} • Test split: {plan.params.testSplit}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Notes</div>
                  <div className="text-muted-foreground break-words">{plan.rationale || ""}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Script ({plan.scriptLanguage})</Label>
                <ScrollArea className="h-64 w-full rounded-md border p-3">
                  <pre className="font-mono text-xs whitespace-pre-wrap">{plan.script}</pre>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="w-full flex gap-2 justify-end">
              {!plan && !isGeneratingPlan && (
                <Button variant="secondary" onClick={() => { setPlanDialogOpen(false); setTimeout(() => { doTrain(); }, 0); }}>
                  Train with Auto-Config
                </Button>
              )}
              <Button variant="secondary" onClick={onGeneratePlan} disabled={isGeneratingPlan}>
                {isGeneratingPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Regenerate
              </Button>
              <Button onClick={onAcceptPlanAndTrain} disabled={!plan}>Accept & Train</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
