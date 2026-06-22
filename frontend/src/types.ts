// ── Shared type definitions for the Traffic Violation AI pipeline ──

/** Roboflow-style prediction from any detection model */
export type Prediction = {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  ocr_text?: string;
};

/** Inference result from a detection model */
export type InferenceResult = {
  predictions: Prediction[];
  image: { width: number; height: number };
  is_video?: boolean;
};

/** Preprocessing metrics from the backend */
export type PreprocessMetrics = {
  brightness: number;
  sharpness: number;
  contrast: number;
};

/** Full preprocess result from /api/preprocess */
export type PreprocessResult = {
  original: string;
  normalized: string;
  enhanced: string;
  denoised: string;
  metrics: PreprocessMetrics;
};

/** Status of a single pipeline stage */
export type StageStatus = "pending" | "processing" | "completed" | "failed";

/** A single pipeline stage descriptor */
export type PipelineStage = {
  id: string;
  label: string;
  status: StageStatus;
  durationMs?: number;
  error?: string;
};

/** Classification of a detected violation */
export type ViolationClass =
  | "helmet_violation"
  | "no_seatbelt"
  | "triple_riding"
  | "phone_usage"
  | "tinted_window"
  | "mobile_use"
  | "license_plate"
  | "other";

/** A single violation record stored after analysis */
export type ViolationRecord = {
  id: string;
  timestamp: string; // ISO date string
  violationType: ViolationClass;
  violationLabel: string;
  confidence: number;
  vehicleType: string;
  plateNumber: string;
  imageId: string;
  processingTimeMs: number;
  status: "Pending" | "Processing" | "Completed" | "Failed" | "Reviewed";
  boundingBox?: { x: number; y: number; width: number; height: number };
};

/** Summary report card derived from actual records */
export type AnalyticsSummary = {
  totalProcessed: number;
  totalViolations: number;
  violationsByClass: Record<string, number>;
  confidenceDistribution: { range: string; count: number }[];
  averageInferenceMs: number;
  processingTimeByStage: { stage: string; avgMs: number }[];
  recordsByDate: { date: string; count: number }[];
};

/** Model evaluation metrics — only from real evaluation runs */
export type EvaluationMetrics = {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mAP?: number;
  avgInferenceLatencyMs?: number;
  throughputFPS?: number;
  memoryUsageMB?: number;
} | null;

/** Filter state for the records table */
export type RecordFilters = {
  search: string;
  violationType: string;
  dateFrom: string;
  dateTo: string;
  vehicleType: string;
  confidenceMin: number;
  confidenceMax: number;
};
