import { useState, useMemo, useCallback } from "react";
import {
  ShieldCheck, Upload, Loader2, X, RotateCcw, Trash2,
  Camera, Eye, BarChart3, FileSearch, Gauge,
  Layers, Film
} from "lucide-react";
import VideoFramePlayer, { type VideoFrame } from "./components/VideoFramePlayer";
import UploadPanel from "./components/UploadPanel";
import PipelineTracker from "./components/PipelineTracker";
import AnnotatedPreview from "./components/AnnotatedPreview";
import MetadataPanel from "./components/MetadataPanel";
import RecordsTable from "./components/RecordsTable";
import AnalyticsCharts from "./components/AnalyticsCharts";
import EvaluationCards from "./components/EvaluationCards";

// Individual mode components
import HelmetDetection from "./components/HelmetDetection";
import TripleRiderDetection from "./components/TripleRiderDetection";
import LicensePlateDetection from "./components/LicensePlateDetection";
import PipelineDemo from "./components/PipelineDemo";
import SeatbeltMobileDetection from "./components/SeatbeltMobileDetection";

import type {
  PipelineStage, Prediction, PreprocessResult,
  InferenceResult, ViolationRecord, EvaluationMetrics,
} from "./types";
import { loadRecords, appendRecords, computeAnalytics, clearRecords, loadEvaluationMetrics } from "./store";

// ── Roboflow API config ────────────────────────────────────────────
const RF_KEY = "8uvtxZId3oOxVg80LO8f";
const MODELS = {
  helmet: "helmet-detection-zktr7/5",
  triple: "3riders/2",
  seatbelt: "seat_belt-and-mobile-vbve5/1",
};

// ── Helpers ────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function classifyViolation(cls: string): { type: string; label: string; vehicle: string } {
  const k = cls.toLowerCase().replace(/_/g, " ").replace(/-/g, " ");
  if (k.includes("no helmet") || k.includes("nohelmet") || k.includes("without helmet"))
    return { type: "helmet_violation", label: "No Helmet", vehicle: "Motorcycle" };
  if (k.includes("helmet"))
    return { type: "other", label: "Helmet (compliant)", vehicle: "Motorcycle" };
  if (k.includes("triple") || k.includes("more than two") || k.includes("more_than_two"))
    return { type: "triple_riding", label: "Triple Riding", vehicle: "Motorcycle" };
  if (k.includes("phone") || k.includes("mobile") || k.includes("using phone"))
    return { type: "phone_usage", label: "Phone Usage", vehicle: "Vehicle" };
  if (k.includes("no seatbelt") || k.includes("noseatbelt") || k.includes("without seatbelt"))
    return { type: "no_seatbelt", label: "No Seatbelt", vehicle: "Car" };
  if (k.includes("seatbelt"))
    return { type: "other", label: "Seatbelt (compliant)", vehicle: "Car" };
  if (k.includes("windshield"))
    return { type: "other", label: "Windshield detected", vehicle: "Car" };
  if (k.includes("rider"))
    return { type: "other", label: "Rider detected", vehicle: "Motorcycle" };
  return { type: "other", label: cls, vehicle: "Vehicle" };
}

/** Returns true only for actual violations (not compliant detections) */
function isActualViolation(cls: string): boolean {
  const k = cls.toLowerCase().replace(/_/g, " ").replace(/-/g, " ");
  return (
    k.includes("no helmet") || k.includes("nohelmet") || k.includes("without helmet") ||
    k.includes("triple") || k.includes("more than two") || k.includes("more_than_two") ||
    k.includes("phone") || k.includes("mobile") || k.includes("using phone") ||
    k.includes("no seatbelt") || k.includes("noseatbelt") || k.includes("without seatbelt")
  );
}

async function callRoboflow(modelId: string, base64: string): Promise<InferenceResult> {
  const res = await fetch(`https://serverless.roboflow.com/${modelId}?api_key=${RF_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64,
  });
  if (!res.ok) throw new Error(`Roboflow ${modelId} failed`);
  return res.json();
}

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  // Video pipeline state
  const [videoFrames, setVideoFrames] = useState<VideoFrame[]>([]);
  const [videoTotalFrames, setVideoTotalFrames] = useState(0);
  const [videoComplete, setVideoComplete] = useState(false);
  const [videoProgress, setVideoProgress] = useState<string>("");
  const [extractFps, setExtractFps] = useState<number>(1);

  // Pipeline state
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [preprocessResult, setPreprocessResult] = useState<PreprocessResult | null>(null);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [imageSize, setImageSize] = useState({ width: 640, height: 640 });
  const [currentRecords, setCurrentRecords] = useState<ViolationRecord[]>([]);
  const [processingStages, setProcessingStages] = useState<{ stage: string; ms: number }[]>([]);
  const [imageId, setImageId] = useState("");
  const [annotatedSrc, setAnnotatedSrc] = useState<string | null>(null);
  const [plateResults, setPlateResults] = useState<InferenceResult | null>(null);

  // Global records
  const [allRecords, setAllRecords] = useState<ViolationRecord[]>(loadRecords());
  const analytics = useMemo(() => computeAnalytics(allRecords), [allRecords]);
  const evalMetrics = useMemo(() => loadEvaluationMetrics(), [allRecords]);

  // Active section for scroll navigation
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleFileSelected = useCallback((f: File, prev: string, vid: boolean) => {
    setFile(f);
    setPreview(prev);
    setIsVideo(vid);
    setPipelineComplete(false);
    setAllPredictions([]);
    setCurrentRecords([]);
    setPreprocessResult(null);
    setAnnotatedSrc(null);
    setPlateResults(null);
    setStages([]);
    setError(null);
    setProcessingStages([]);
    setVideoFrames([]);
    setVideoTotalFrames(0);
    setVideoComplete(false);
    setVideoProgress("");
    setExtractFps(1);
  }, []);

  function updateStage(id: string, updates: Partial<PipelineStage>) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  // ── Run the full pipeline ────────────────────────────────────────
  async function runPipeline() {
    if (!file || !preview) return;
    setIsRunning(true);
    setError(null);
    setPipelineComplete(false);
    setAllPredictions([]);
    setCurrentRecords([]);
    setAnnotatedSrc(null);
    setPlateResults(null);

    const imgId = uid();
    setImageId(imgId);

    const base64 = preview.split(",")[1];
    const timings: { stage: string; ms: number }[] = [];

    const initialStages: PipelineStage[] = [
      { id: "upload", label: "Image Upload", status: "completed" },
      { id: "preprocess", label: "Preprocessing", status: "pending" },
      { id: "helmet", label: "Helmet Detection", status: "pending" },
      { id: "triple", label: "Triple Rider & Phone Detection", status: "pending" },
      { id: "seatbelt", label: "Seatbelt & Mobile Detection", status: "pending" },
      { id: "license", label: "License Plate OCR", status: "pending" },
      { id: "evidence", label: "Evidence Generation", status: "pending" },
      { id: "save", label: "Record Saving", status: "pending" },
    ];
    setStages(initialStages);

    let mergedPredictions: Prediction[] = [];
    let finalImageSrc = preview;
    let imgW = 640, imgH = 640;
    let preprocessData: PreprocessResult | null = null;

    // Stage 1: Preprocessing
    try {
      updateStage("preprocess", { status: "processing" });
      const t0 = performance.now();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/preprocess", { method: "POST", body: formData });
      const dt = Math.round(performance.now() - t0);
      timings.push({ stage: "Preprocessing", ms: dt });
      if (res.ok) {
        preprocessData = await res.json();
        setPreprocessResult(preprocessData);
        finalImageSrc = preprocessData!.denoised;
        updateStage("preprocess", { status: "completed", durationMs: dt });
      } else {
        updateStage("preprocess", { status: "failed", durationMs: dt, error: "Backend unavailable" });
      }
    } catch {
      updateStage("preprocess", { status: "failed", error: "Backend unavailable" });
    }

    // Stage 2-4: Detection models (run in parallel)
    const detectionModels = [
      { id: "helmet", model: MODELS.helmet },
      { id: "triple", model: MODELS.triple },
      { id: "seatbelt", model: MODELS.seatbelt },
    ];

    for (const dm of detectionModels) {
      updateStage(dm.id, { status: "processing" });
    }

    const detectionResults = await Promise.allSettled(
      detectionModels.map(async (dm) => {
        const t0 = performance.now();
        try {
          const result = await callRoboflow(dm.model, base64);
          const dt = Math.round(performance.now() - t0);
          timings.push({ stage: dm.id.charAt(0).toUpperCase() + dm.id.slice(1) + " Detection", ms: dt });
          updateStage(dm.id, { status: "completed", durationMs: dt });
          if (result.image) {
            imgW = result.image.width;
            imgH = result.image.height;
          }
          return result;
        } catch (err) {
          const dt = Math.round(performance.now() - t0);
          timings.push({ stage: dm.id.charAt(0).toUpperCase() + dm.id.slice(1) + " Detection", ms: dt });
          updateStage(dm.id, { status: "failed", durationMs: dt, error: String(err) });
          return null;
        }
      })
    );

    // Merge predictions and discard low confidence mobile phone detections
    detectionResults.forEach(r => {
      if (r.status === "fulfilled" && r.value) {
        const filtered = r.value.predictions.filter(p => {
          const isPhone = p.class.toLowerCase().includes("phone") || p.class.toLowerCase().includes("mobile");
          return !(isPhone && p.confidence < 0.45);
        });
        mergedPredictions = [...mergedPredictions, ...filtered];
      }
    });

    const hasHelmet = mergedPredictions.some(p => p.class.toLowerCase().includes("helmet") && !p.class.toLowerCase().includes("no"));
    if (!hasHelmet) {
      const persons = mergedPredictions.filter(p => p.class.toLowerCase() === "person" || p.class.toLowerCase() === "rider" || p.class.toLowerCase() === "motorcyclist");
      persons.forEach(personPred => {
        mergedPredictions.push({
          class: "no helmet",
          confidence: personPred.confidence,
          x: personPred.x,
          y: personPred.y,
          width: personPred.width,
          height: personPred.height,
        });
      });
    }

    // Stage 5: License plate OCR
    try {
      updateStage("license", { status: "processing" });
      const t0 = performance.now();
      const lpFormData = new FormData();
      lpFormData.append("file", file);
      const lpRes = await fetch("/api/license-plate/detect", { method: "POST", body: lpFormData });
      const dt = Math.round(performance.now() - t0);
      timings.push({ stage: "License Plate OCR", ms: dt });
      if (lpRes.ok) {
        const lpData: InferenceResult = await lpRes.json();
        setPlateResults(lpData);
        lpData.predictions.forEach(p => {
          mergedPredictions.push({ ...p, class: p.class || "license_plate" });
        });
        if (lpData.image) { imgW = lpData.image.width; imgH = lpData.image.height; }
        updateStage("license", { status: "completed", durationMs: dt });
      } else {
        updateStage("license", { status: "failed", durationMs: dt });
      }
    } catch {
      updateStage("license", { status: "failed", error: "Backend unavailable" });
    }

    setImageSize({ width: imgW, height: imgH });
    setAllPredictions(mergedPredictions);
    setAnnotatedSrc(finalImageSrc);

    // Stage 6: Evidence generation
    updateStage("evidence", { status: "processing" });
    const t6 = performance.now();
    // The AnnotatedPreview component handles canvas drawing of bounding boxes
    const evidenceDt = Math.round(performance.now() - t6);
    timings.push({ stage: "Evidence Generation", ms: evidenceDt });
    updateStage("evidence", { status: "completed", durationMs: evidenceDt });

    // Stage 7: Record saving
    updateStage("save", { status: "processing" });
    const t7 = performance.now();
    const now = new Date().toISOString();
    const totalPipelineMs = timings.reduce((s, t) => s + t.ms, 0);

    // Find plate numbers from all predictions
    const plates = mergedPredictions
      .map(p => p.ocr_text)
      .filter(Boolean);

    const violationPreds = mergedPredictions.filter(p => isActualViolation(p.class));

    // If no violations detected, still save a record noting the analysis
    const records: ViolationRecord[] = violationPreds.length > 0
      ? violationPreds.map(p => {
          const { label, vehicle } = classifyViolation(p.class);
          return {
            id: uid(),
            timestamp: now,
            violationType: classifyViolation(p.class).type as any,
            violationLabel: label,
            confidence: Math.round(p.confidence * 100),
            vehicleType: vehicle,
            plateNumber: plates[0] ?? "",
            imageId: imgId,
            processingTimeMs: totalPipelineMs,
            status: "Completed" as const,
            boundingBox: { x: p.x, y: p.y, width: p.width, height: p.height },
          };
        })
      : [];

    setCurrentRecords(records);
    if (records.length > 0) {
      const updated = appendRecords(records);
      setAllRecords(updated);
    }

    const saveDt = Math.round(performance.now() - t7);
    timings.push({ stage: "Record Saving", ms: saveDt });
    updateStage("save", { status: "completed", durationMs: saveDt });

    setProcessingStages(timings);
    setPipelineComplete(true);
    setIsRunning(false);
  }

  async function runVideoPipeline() {
    if (!file) return;
    setIsRunning(true);
    setError(null);
    setVideoComplete(false);
    setVideoFrames([]);
    setVideoProgress("Extracting frames from video…");

    const initialStages: PipelineStage[] = [
      { id: "upload", label: "Video Upload", status: "completed" },
      { id: "extract", label: `Frame Extraction (${extractFps}fps)`, status: "processing" },
      { id: "detect", label: "Violation Detection (per frame)", status: "pending" },
      { id: "save", label: "Record Saving", status: "pending" },
    ];
    setStages(initialStages);

    let framesB64: string[] = [];
    let totalExtracted = 0;
    let cameraId = "";

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fps", String(extractFps));
      const res = await fetch("/api/video-pipeline/extract-frames", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Frame extraction failed");
      }
      const data = await res.json();
      framesB64 = data.frames as string[];
      totalExtracted = data.total_frames_extracted as number;
      cameraId = data.camera_id as string;
      setVideoTotalFrames(totalExtracted);
      updateStage("extract", { status: "completed", durationMs: Math.round(performance.now()) });
    } catch (e) {
      updateStage("extract", { status: "failed", error: String(e) });
      setError(`Frame extraction failed: ${String(e)}`);
      setIsRunning(false);
      return;
    }

    updateStage("detect", { status: "processing" });
    setVideoProgress(`Running violation detection on ${framesB64.length} frames…`);

    const imgId = uid();
    setImageId(imgId);
    const allSavedRecords: ViolationRecord[] = [];
    const builtFrames: VideoFrame[] = [];

    for (let i = 0; i < framesB64.length; i++) {
      const src = framesB64[i];
      const base64 = src.split(",")[1];
      // Timestamp in video = frame index / extraction fps
      const videoTimeSec = Math.round(i / extractFps);
      const videoTimeLabel = `${String(Math.floor(videoTimeSec / 60)).padStart(2,"0")}:${String(videoTimeSec % 60).padStart(2,"0")}`;
      setVideoProgress(`Analyzing frame ${i + 1} / ${framesB64.length} (${videoTimeLabel})…`);

      let framePredictions: Prediction[] = [];
      let frameImgSize = { width: 640, height: 640 };

      try {
        // Run the same three detection models as the image pipeline
        const results = await Promise.allSettled([
          callRoboflow(MODELS.helmet, base64),
          callRoboflow(MODELS.triple, base64),
          callRoboflow(MODELS.seatbelt, base64),
        ]);
        results.forEach(r => {
          if (r.status === "fulfilled" && r.value) {
            if (r.value.image?.width && r.value.image?.height) {
              frameImgSize = { width: r.value.image.width, height: r.value.image.height };
            }
            const filtered = r.value.predictions.filter((p: Prediction) => {
              // Filter low-confidence phone detections (same threshold as image pipeline)
              const isPhone = p.class.toLowerCase().includes("phone") || p.class.toLowerCase().includes("mobile");
              return !(isPhone && p.confidence < 0.45);
            });
            framePredictions = [...framePredictions, ...filtered];
          }
        });
      } catch { /* skip frame on error */ }

      const frameHasHelmet = framePredictions.some(p => p.class.toLowerCase().includes("helmet") && !p.class.toLowerCase().includes("no"));
      if (!frameHasHelmet) {
        const persons = framePredictions.filter(p => p.class.toLowerCase() === "person" || p.class.toLowerCase() === "rider" || p.class.toLowerCase() === "motorcyclist");
        persons.forEach(personPred => {
          framePredictions.push({
            class: "no helmet",
            confidence: personPred.confidence,
            x: personPred.x,
            y: personPred.y,
            width: personPred.width,
            height: personPred.height,
          });
        });
      }

      // License plate OCR — same as the image pipeline
      let plateTxt = "";
      try {
        // Convert base64 data-URI back to a Blob to POST to the backend
        const byteStr = atob(base64);
        const arr = new Uint8Array(byteStr.length);
        for (let b = 0; b < byteStr.length; b++) arr[b] = byteStr.charCodeAt(b);
        const blob = new Blob([arr], { type: "image/jpeg" });
        const lpForm = new FormData();
        lpForm.append("file", blob, `frame_${i}.jpg`);
        const lpRes = await fetch("/api/license-plate/detect", { method: "POST", body: lpForm });
        if (lpRes.ok) {
          const lpData = await lpRes.json();
          // Pull OCR text from any plate prediction
          const plateTexts = (lpData.predictions as Prediction[]).map(p => p.ocr_text).filter(Boolean);
          plateTxt = plateTexts[0] ?? "";
          // Add plate predictions to frame predictions
          (lpData.predictions as Prediction[]).forEach((p: Prediction) => {
            framePredictions.push({ ...p, class: p.class || "license_plate" });
          });
        }
      } catch { /* LP OCR is best-effort */ }

      const now = new Date().toISOString();
      // Only flag actual violations (not compliant helmet/seatbelt detections)
      const violPreds = framePredictions.filter(p => isActualViolation(p.class));

      const frameRecords: ViolationRecord[] = violPreds.map(p => {
        const { label, vehicle } = classifyViolation(p.class);
        return {
          id: uid(),
          // Use video timestamp (MM:SS) embedded in the ISO timestamp comment
          timestamp: now,
          violationType: classifyViolation(p.class).type as any,
          // Append video timestamp to label for the timeline
          violationLabel: label,
          confidence: Math.round(p.confidence * 100),
          vehicleType: vehicle,
          plateNumber: plateTxt,
          imageId: imgId,
          processingTimeMs: 0,
          status: "Completed" as const,
          boundingBox: { x: p.x, y: p.y, width: p.width, height: p.height },
          // Store video time for the timeline display
          videoTime: videoTimeLabel,
        } as ViolationRecord & { videoTime: string };
      });

      allSavedRecords.push(...frameRecords);
      builtFrames.push({
        src,
        index: i,
        predictions: framePredictions,
        records: frameRecords,
        hasViolation: violPreds.length > 0,
        imageSize: frameImgSize,
        // Store the video timestamp for display
        videoTime: videoTimeLabel,
      });

      setVideoFrames([...builtFrames]);
    }

    updateStage("detect", { status: "completed" });
    updateStage("save", { status: "processing" });

    if (allSavedRecords.length > 0) {
      const updated = appendRecords(allSavedRecords);
      setAllRecords(updated);
    }
    setCurrentRecords(allSavedRecords);
    updateStage("save", { status: "completed" });

    setVideoComplete(true);
    setVideoProgress("");
    setIsRunning(false);
  }

  function resetPipeline() {
    setFile(null);
    setPreview(null);
    setIsVideo(false);
    setStages([]);
    setPipelineComplete(false);
    setAllPredictions([]);
    setCurrentRecords([]);
    setPreprocessResult(null);
    setAnnotatedSrc(null);
    setPlateResults(null);
    setError(null);
    setProcessingStages([]);
    setIsRunning(false);
    setVideoFrames([]);
    setVideoTotalFrames(0);
    setVideoComplete(false);
    setVideoProgress("");
  }

  function handleClearHistory() {
    clearRecords();
    setAllRecords([]);
  }

  const sections = [
    { id: "pipeline", label: "Pipeline" },
    { id: "evidence", label: "Evidence" },
    { id: "analytics", label: "Analytics" },
    { id: "records", label: "Records" },
    { id: "evaluation", label: "Evaluation" },
  ];

  const [activeTab, setActiveTab] = useState("Unified Pipeline");
  const tabNames = [
    "Unified Pipeline",
    "Pipeline Demo",
    "Helmet Detection",
    "Triple Rider",
    "Seatbelt & Mobile",
    "License Plate"
  ];

  return (
    <main className="min-h-screen bg-[#fafbfc] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-5 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-slate-900">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  Traffic Violation AI
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Computer Vision Pipeline · Proof of Concept
                </p>
              </div>
            </div>
            {activeTab === "Unified Pipeline" && (
              <nav className="hidden sm:flex items-center gap-1">
                {sections.map(s => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            <Layers className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            {tabNames.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${activeTab === tab 
                    ? "bg-slate-900 text-white" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 space-y-12">
        {activeTab === "Unified Pipeline" ? (
          <>

        {/* ── Section 1: Pipeline ──────────────────────────────────── */}
        <section id="pipeline">
          <SectionHeader
            icon={Upload}
            title="Upload & Analyze"
            subtitle="Upload a traffic image or video to run the full violation detection pipeline."
          />

          {!file ? (
            <UploadPanel
              onFileSelected={handleFileSelected}
              disabled={isRunning}
              isProcessing={isRunning}
            />
          ) : isVideo ? (
            /* ── VIDEO MODE ─────────────────────────────── */
            <div className="space-y-6">
              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="space-y-4">
                  {/* Video preview */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                    <video
                      src={preview!}
                      className="w-full object-contain max-h-[400px]"
                      controls={false}
                      muted
                    />
                    {!isRunning && !videoComplete && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-[2px] px-6">
                        {/* FPS selector */}
                        <div className="bg-white/95 rounded-2xl px-5 py-4 shadow-xl w-full max-w-xs">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Extraction Rate</p>
                          <div className="flex items-center gap-2 justify-center flex-wrap">
                            {[0.5, 1, 2, 4].map(v => (
                              <button
                                key={v}
                                onClick={() => setExtractFps(v)}
                                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                                  extractFps === v
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400"
                                }`}
                              >
                                {v} fps
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2.5 text-center">
                            {extractFps === 0.5 && "1 frame every 2 seconds — fastest, best for long clips"}
                            {extractFps === 1  && "1 frame per second — recommended balance"}
                            {extractFps === 2  && "2 frames per second — more detail, slower analysis"}
                            {extractFps === 4  && "4 frames per second — high detail, use for short clips"}
                          </p>
                        </div>
                        <button
                          onClick={runVideoPipeline}
                          className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-transform"
                        >
                          <Film className="h-4 w-4" />
                          Analyze Video
                        </button>
                      </div>
                    )}
                    {isRunning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-[2px]">
                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                        <span className="text-sm font-medium text-white text-center px-4">{videoProgress || "Processing…"}</span>
                        {videoFrames.length > 0 && (
                          <span className="text-xs text-indigo-300">{videoFrames.length} frames analyzed so far…</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* File info */}
                  <div className="flex items-center justify-between text-sm bg-white rounded-lg border border-slate-100 px-4 py-2.5">
                    <div className="flex items-center gap-2 truncate">
                      <Film className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate text-slate-600 font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button onClick={resetPipeline} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Pipeline tracker */}
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  {stages.length > 0 ? (
                    <PipelineTracker stages={stages} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <Film className="h-8 w-8 text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Click "Analyze Video" to start the pipeline</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── IMAGE MODE (unchanged) ─────────────────── */
            <div className="space-y-6">
              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={preview!}
                      alt="Uploaded traffic image"
                      className="w-full object-contain max-h-[400px]"
                    />
                    {!isRunning && !pipelineComplete && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                        <button
                          onClick={runPipeline}
                          className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-transform"
                        >
                          <Upload className="h-4 w-4" />
                          Upload & Analyze Image
                        </button>
                      </div>
                    )}
                    {isRunning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="flex items-center gap-3 bg-white/90 px-5 py-3 rounded-xl shadow-lg">
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                          <span className="text-sm font-medium text-slate-800">Processing…</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm bg-white rounded-lg border border-slate-100 px-4 py-2.5">
                    <span className="truncate text-slate-600 font-medium">{file.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                      <button onClick={resetPipeline} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  {stages.length > 0 ? (
                    <PipelineTracker stages={stages} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <Camera className="h-8 w-8 text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Click "Upload & Analyze Image" to start the pipeline</p>
                    </div>
                  )}
                </div>
              </div>
              {preprocessResult && (
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">Preprocessing Stages</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Original", src: preprocessResult.original },
                      { label: "Normalized", src: preprocessResult.normalized },
                      { label: "Enhanced", src: preprocessResult.enhanced },
                      { label: "Denoised", src: preprocessResult.denoised },
                    ].map(step => (
                      <div key={step.label} className="space-y-2">
                        <img src={step.src} alt={step.label} className="w-full rounded-lg border border-slate-200 object-contain h-36" />
                        <p className="text-xs font-medium text-slate-600 text-center">{step.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <MetricBar label="Brightness" value={preprocessResult.metrics.brightness} color="bg-amber-400" />
                    <MetricBar label="Sharpness" value={preprocessResult.metrics.sharpness} color="bg-emerald-400" />
                    <MetricBar label="Contrast" value={preprocessResult.metrics.contrast} color="bg-indigo-500" />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Section 2a: Video Results ─────────────────────────────── */}
        {isVideo && videoFrames.length > 0 && (
          <section id="evidence">
            <SectionHeader
              icon={Film}
              title="Video Analysis Results"
              subtitle="Frame-by-frame playback with violation detection overlay and timeline."
            />
            <VideoFramePlayer
              frames={videoFrames}
              totalExtractedFrames={videoTotalFrames}
              videoFileName={file?.name ?? "video"}
              extractFps={extractFps}
            />
            <div className="mt-6 flex justify-center">
              <button onClick={resetPipeline} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <RotateCcw className="h-4 w-4" /> Analyze Another File
              </button>
            </div>
          </section>
        )}

        {/* ── Section 2b: Image Evidence ───────────────────────────── */}
        {!isVideo && pipelineComplete && (
          <section id="evidence">
            <SectionHeader
              icon={Eye}
              title="Evidence Generation"
              subtitle="Annotated output with bounding boxes, labels, confidence scores, and violation tags."
            />
            <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
              <div className="space-y-4">
                {annotatedSrc && (
                  <AnnotatedPreview
                    imageSrc={annotatedSrc}
                    predictions={allPredictions}
                    imageSize={imageSize}
                  />
                )}
                {/* Detection summary chips */}
                {currentRecords.length === 0 ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    No violations detected
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allPredictions.map((p, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${isViolation(p.class) ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isViolation(p.class) ? "bg-red-500" : "bg-slate-400"}`} />
                        {p.ocr_text || p.class} — {Math.round(p.confidence * 100)}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <MetadataPanel
                records={currentRecords}
                processingStages={processingStages}
                imageId={imageId}
                isComplete={pipelineComplete}
              />
            </div>

            {/* Reset button */}
            <div className="mt-6 flex justify-center">
              <button onClick={resetPipeline} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <RotateCcw className="h-4 w-4" /> Analyze Another Image
              </button>
            </div>
          </section>
        )}

        {/* ── Section 3: Analytics ─────────────────────────────────── */}
        <section id="analytics">
          <SectionHeader
            icon={BarChart3}
            title="Analytics & Reporting"
            subtitle="Charts and summaries derived from stored violation records."
          />
          <AnalyticsCharts analytics={analytics} />
        </section>

        {/* ── Section 4: Records ───────────────────────────────────── */}
        <section id="records">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              icon={FileSearch}
              title="Violation History"
              subtitle="Searchable records with filters and CSV export."
              inline
            />
            {allRecords.length > 0 && (
              <button onClick={handleClearHistory} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Clear History
              </button>
            )}
          </div>
          <RecordsTable records={allRecords} />
        </section>

        {/* ── Section 5: Evaluation ────────────────────────────────── */}
        <section id="evaluation">
          <SectionHeader
            icon={Gauge}
            title="Model Performance Evaluation"
            subtitle="Real evaluation metrics from model validation runs."
          />
          <EvaluationCards metrics={evalMetrics} />
        </section>
          </>
        ) : activeTab === "Pipeline Demo" ? (
          <PipelineDemo />
        ) : activeTab === "Helmet Detection" ? (
          <HelmetDetection />
        ) : activeTab === "Triple Rider" ? (
          <TripleRiderDetection />
        ) : activeTab === "Seatbelt & Mobile" ? (
          <SeatbeltMobileDetection />
        ) : activeTab === "License Plate" ? (
          <LicensePlateDetection />
        ) : null}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-16">
        <div className="mx-auto max-w-6xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Traffic Violation AI · Computer Vision Proof of Concept
          </p>
          <p className="text-xs text-slate-400">
            YOLOv8 · Roboflow · EasyOCR · OpenCV
          </p>
        </div>
      </footer>
    </main>
  );
}

// ── Utility components ─────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, inline }: {
  icon: typeof Upload; title: string; subtitle: string; inline?: boolean;
}) {
  return (
    <div className={inline ? "" : "mb-6"}>
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <p className="text-sm text-slate-500 mt-1 ml-9">{subtitle}</p>
    </div>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-900 font-semibold tabular-nums">{value}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function isViolation(cls: string): boolean {
  const k = cls.toLowerCase();
  return k.includes("no-helmet") || k.includes("no helmet") ||
    k.includes("triple") || k.includes("more_than_two") ||
    k.includes("phone") || k.includes("mobile") || k.includes("seatbelt");
}
