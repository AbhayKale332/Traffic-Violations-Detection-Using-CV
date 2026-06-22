import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, AlertTriangle,
  CheckCircle, Film, ChevronRight, Download
} from "lucide-react";
import type { Prediction, ViolationRecord } from "../types";

// ── Types ──────────────────────────────────────────────────────────
export type VideoFrame = {
  /** base64 data-URI of the (already-preprocessed) frame image */
  src: string;
  /** Frame index (0-based) */
  index: number;
  /** Roboflow predictions for this frame */
  predictions: Prediction[];
  /** Derived violation records for this frame */
  records: ViolationRecord[];
  /** True if any violation was found on this frame */
  hasViolation: boolean;
};

type Props = {
  frames: VideoFrame[];
  imageSize: { width: number; height: number };
  totalExtractedFrames: number;
  videoFileName: string;
};

// ── Color helpers ──────────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {
  helmet: "#22c55e",
  "no-helmet": "#ef4444",
  "no helmet": "#ef4444",
  phone: "#f97316",
  "using phone": "#f97316",
  mobile: "#f97316",
  using_mobile: "#f97316",
  "triple riding": "#eab308",
  triple: "#eab308",
  more_than_two_persons: "#eab308",
  rider: "#3b82f6",
  seatbelt: "#22c55e",
  windshield: "#6366f1",
  license_plate: "#facc15",
  default: "#8b5cf6",
};

function getColor(cls: string): string {
  const key = cls.toLowerCase();
  for (const c in CLASS_COLORS) {
    if (key.includes(c)) return CLASS_COLORS[c];
  }
  return CLASS_COLORS.default;
}

function isViolationClass(cls: string): boolean {
  const k = cls.toLowerCase();
  return (
    k.includes("no-helmet") || k.includes("no helmet") ||
    k.includes("triple") || k.includes("more_than_two") ||
    k.includes("phone") || k.includes("mobile") ||
    k.includes("seatbelt")
  );
}

// ── Violation Badge ────────────────────────────────────────────────
function ViolationBadge({ record }: { record: ViolationRecord }) {
  const colorMap: Record<string, string> = {
    helmet_violation: "bg-red-50 border-red-200 text-red-700",
    triple_riding: "bg-amber-50 border-amber-200 text-amber-700",
    phone_usage: "bg-orange-50 border-orange-200 text-orange-700",
    no_seatbelt: "bg-purple-50 border-purple-200 text-purple-700",
    other: "bg-slate-50 border-slate-200 text-slate-700",
  };
  const dotMap: Record<string, string> = {
    helmet_violation: "bg-red-500",
    triple_riding: "bg-amber-500",
    phone_usage: "bg-orange-500",
    no_seatbelt: "bg-purple-500",
    other: "bg-slate-400",
  };
  const cls = colorMap[record.violationType] ?? colorMap.other;
  const dot = dotMap[record.violationType] ?? dotMap.other;

  return (
    <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 ${cls}`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-none truncate">{record.violationLabel}</p>
        <p className="text-[10px] opacity-70 mt-0.5">{record.confidence}% confidence</p>
      </div>
    </div>
  );
}

// ── Frame Canvas (draws bounding boxes over the frame image) ───────
function FrameCanvas({
  frame,
  imageSize,
}: {
  frame: VideoFrame;
  imageSize: { width: number; height: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = img.clientWidth / img.clientHeight;

    let renderWidth = img.clientWidth;
    let renderHeight = img.clientHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > containerRatio) {
      renderHeight = img.clientWidth / imgRatio;
      offsetY = (img.clientHeight - renderHeight) / 2;
    } else {
      renderWidth = img.clientHeight * imgRatio;
      offsetX = (img.clientWidth - renderWidth) / 2;
    }

    const scaleX = renderWidth / imageSize.width;
    const scaleY = renderHeight / imageSize.height;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frame.predictions.forEach((p) => {
      const color = getColor(p.class);
      const x = offsetX + (p.x - p.width / 2) * scaleX;
      const y = offsetY + (p.y - p.height / 2) * scaleY;
      const w = p.width * scaleX;
      const h = p.height * scaleY;

      ctx.fillStyle = color + "15";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      const conf = Math.round(p.confidence * 100);
      const label = `${p.ocr_text || p.class} ${conf}%`;
      ctx.font = "bold 11px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, tw + 10, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 5, y - 5);
    });

    // Frame watermark
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    const wmText = `Frame ${frame.index + 1} • Traffic Violation AI`;
    const tw2 = ctx.measureText(wmText).width;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(canvas.width - tw2 - 28, canvas.height - 30, tw2 + 18, 22);
    ctx.fillStyle = "#fff";
    ctx.fillText(wmText, canvas.width - tw2 - 19, canvas.height - 13);
  }, [frame, imageSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
      <img
        ref={imgRef}
        src={frame.src}
        alt={`Frame ${frame.index + 1}`}
        className="w-full object-contain max-h-[420px]"
        onLoad={draw}
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
      {frame.hasViolation && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" />
          Violation Detected
        </div>
      )}
      {frame.predictions.length > 0 && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
          {frame.predictions.length} detection{frame.predictions.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ── Main VideoFramePlayer ──────────────────────────────────────────
export default function VideoFramePlayer({
  frames,
  imageSize,
  totalExtractedFrames,
  videoFileName,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2); // fps
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeViolationId, setActiveViolationId] = useState<string | null>(null);

  const currentFrame = frames[currentIndex];

  // Playback controller
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((i) => {
          if (i >= frames.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, frames.length]);

  // Jump to frame when clicking a violation in the timeline
  function jumpToViolationFrame(frameIndex: number, violationId: string) {
    setCurrentIndex(frameIndex);
    setIsPlaying(false);
    setActiveViolationId(violationId);
  }

  // All violations across all frames for the timeline
  const allViolations = frames.flatMap((f) =>
    f.records.map((r) => ({ ...r, frameIndex: f.index }))
  );

  // Scrubber change
  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    setCurrentIndex(Number(e.target.value));
    setIsPlaying(false);
  }

  // Download current frame
  function downloadFrame() {
    const link = document.createElement("a");
    link.download = `evidence_frame_${currentIndex + 1}_${Date.now()}.jpg`;
    link.href = currentFrame.src;
    link.click();
  }

  return (
    <div className="space-y-6">
      {/* ── Video Stats bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-3 py-1.5">
          <Film className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold truncate max-w-[180px]">{videoFileName}</span>
        </div>
        <span className="text-xs text-slate-500 bg-white border border-slate-100 rounded-full px-3 py-1.5">
          {frames.length} frames analyzed
        </span>
        <span className="text-xs text-slate-500 bg-white border border-slate-100 rounded-full px-3 py-1.5">
          {totalExtractedFrames} total extracted @ 1fps
        </span>
        {allViolations.length > 0 ? (
          <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            {allViolations.length} violation{allViolations.length !== 1 ? "s" : ""} found
          </span>
        ) : (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3" />
            No violations detected
          </span>
        )}
      </div>

      {/* ── Main layout: player + violation sidebar ───────────────── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* ── Left: Frame canvas + controls ─────────────────────── */}
        <div className="space-y-4">
          <FrameCanvas frame={currentFrame} imageSize={imageSize} />

          {/* Controls */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
            {/* Scrubber */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Frame {currentIndex + 1}</span>
                <span>{frames.length} frames</span>
              </div>
              {/* Timeline with violation markers */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={frames.length - 1}
                  value={currentIndex}
                  onChange={handleScrub}
                  className="w-full h-2 appearance-none bg-slate-100 rounded-full cursor-pointer accent-indigo-600"
                />
                {/* Violation tick marks */}
                <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
                  {frames.map((f, i) =>
                    f.hasViolation ? (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-1 bg-red-500 rounded-full opacity-70"
                        style={{ left: `${(i / (frames.length - 1)) * 100}%` }}
                      />
                    ) : null
                  )}
                </div>
              </div>
            </div>

            {/* Playback buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Go to start"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => { setCurrentIndex(frames.length - 1); setIsPlaying(false); }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Go to end"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Speed:</span>
                {[1, 2, 4, 8].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                      playbackSpeed === s
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
                <button
                  onClick={downloadFrame}
                  className="ml-2 p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Download current frame"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Current frame detections */}
          {currentFrame.predictions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Frame {currentIndex + 1} Detections
              </p>
              <div className="flex flex-wrap gap-2">
                {currentFrame.predictions.map((p, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                      isViolationClass(p.class)
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isViolationClass(p.class) ? "bg-red-500" : "bg-slate-400"
                      }`}
                    />
                    {p.ocr_text || p.class} — {Math.round(p.confidence * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Violation Timeline sidebar ─────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Violation Timeline
              </h3>
              <span className="text-xs text-slate-400">{allViolations.length} events</span>
            </div>

            {allViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-3" />
                <p className="text-sm font-semibold text-slate-700">All clear</p>
                <p className="text-xs text-slate-400 mt-1">
                  No traffic violations were detected across any of the analyzed frames.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                {allViolations.map((v) => {
                  const isActive = activeViolationId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => jumpToViolationFrame(v.frameIndex, v.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-slate-50 ${
                        isActive ? "bg-indigo-50" : ""
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          F{v.frameIndex + 1}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{v.violationLabel}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{v.confidence}% confidence</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-500">~{v.frameIndex}s</span>
                        </div>
                        {v.plateNumber && (
                          <p className="text-xs text-indigo-600 font-mono mt-0.5">{v.plateNumber}</p>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 mt-1 transition-transform ${isActive ? "text-indigo-500 translate-x-0.5" : ""}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Frame-level violation summary cards */}
          {frames.filter((f) => f.hasViolation).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Violation Frames
              </p>
              <div className="flex flex-wrap gap-2">
                {frames
                  .filter((f) => f.hasViolation)
                  .map((f) => (
                    <button
                      key={f.index}
                      onClick={() => {
                        setCurrentIndex(f.index);
                        setIsPlaying(false);
                      }}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                        currentIndex === f.index
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      Frame {f.index + 1}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
