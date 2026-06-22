import { useRef, useEffect, useState } from "react";
import { Download, Camera } from "lucide-react";
import type { Prediction } from "../types";

type AnnotatedPreviewProps = {
  imageSrc: string;
  predictions: Prediction[];
  imageSize: { width: number; height: number };
};

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

export default function AnnotatedPreview({
  imageSrc,
  predictions,
  imageSize,
}: AnnotatedPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [plateCrops, setPlateCrops] = useState<string[]>([]);

  function drawBoxesAndWatermark() {
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

    // Identify license plates to generate crops
    const plates = predictions.filter(
      p => p.class === "license_plate" || p.ocr_text
    );
    const newCrops: string[] = [];

    // Draw bounding boxes
    predictions.forEach((p) => {
      const color = getColor(p.class);
      const x = offsetX + (p.x - p.width / 2) * scaleX;
      const y = offsetY + (p.y - p.height / 2) * scaleY;
      const w = p.width * scaleX;
      const h = p.height * scaleY;

      // Semi-transparent fill
      ctx.fillStyle = color + "15";
      ctx.fillRect(x, y, w, h);

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      // Label
      const conf = Math.round(p.confidence * 100);
      const label = `${p.ocr_text || p.class} ${conf}%`;
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 22, tw + 10, 22);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 5, y - 6);

      // Extract plate crops using the original image scale
      if (p.class === "license_plate" || p.ocr_text) {
        // Create an offscreen canvas to crop from the original unscaled image
        const cropCanvas = document.createElement("canvas");
        const naturalScaleX = img.naturalWidth / imageSize.width;
        const naturalScaleY = img.naturalHeight / imageSize.height;

        const origX = (p.x - p.width / 2) * naturalScaleX;
        const origY = (p.y - p.height / 2) * naturalScaleY;
        const origW = p.width * naturalScaleX;
        const origH = p.height * naturalScaleY;
        
        // Add some padding to the crop
        const padX = origW * 0.1;
        const padY = origH * 0.1;
        
        const sx = Math.max(0, origX - padX);
        const sy = Math.max(0, origY - padY);
        const sw = Math.min(img.naturalWidth - sx, origW + padX * 2);
        const sh = Math.min(img.naturalHeight - sy, origH + padY * 2);

        cropCanvas.width = sw;
        cropCanvas.height = sh;
        const cCtx = cropCanvas.getContext("2d");
        if (cCtx) {
          cCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          newCrops.push(cropCanvas.toDataURL("image/jpeg", 0.9));
        }
      }
    });

    setPlateCrops(newCrops);

    // Draw Watermark (Time & Date)
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    const watermarkText = `Traffic Violation AI - ${dateStr} ${timeStr}`;
    
    ctx.font = "bold 14px Inter, system-ui, sans-serif";
    const textWidth = ctx.measureText(watermarkText).width;
    
    // Background for watermark
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(canvas.width - textWidth - 30, canvas.height - 35, textWidth + 20, 25);
    
    // Watermark text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(watermarkText, canvas.width - textWidth - 20, canvas.height - 18);
  }

  useEffect(() => {
    drawBoxesAndWatermark();
  }, [predictions, imageSize]);

  // Merge the image and the canvas to download the final evidence
  const handleDownload = () => {
    const img = imgRef.current;
    const overlay = canvasRef.current;
    if (!img || !overlay) return;

    // Create a composite canvas
    const downloadCanvas = document.createElement("canvas");
    downloadCanvas.width = img.naturalWidth;
    downloadCanvas.height = img.naturalHeight;
    const ctx = downloadCanvas.getContext("2d");
    if (!ctx) return;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Draw the overlay (bounding boxes + watermark), scaled up to natural size
    ctx.drawImage(overlay, 0, 0, overlay.width, overlay.height, 0, 0, img.naturalWidth, img.naturalHeight);

    // Trigger download
    const link = document.createElement("a");
    link.download = `evidence_${Date.now()}.jpg`;
    link.href = downloadCanvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Main image with bounding boxes */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Annotated evidence"
          className="w-full object-contain max-h-[500px]"
          onLoad={drawBoxesAndWatermark}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />
        {predictions.length > 0 && (
          <div className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {predictions.length} detection{predictions.length !== 1 ? "s" : ""}
          </div>
        )}
        
        {/* Download Overlay Button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-lg font-semibold text-sm shadow-xl hover:scale-105 transition-transform"
          >
            <Download className="h-4 w-4" />
            Save Evidence Image
          </button>
        </div>
      </div>

      {/* Plate Close-ups */}
      {plateCrops.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-slate-500" />
            License Plate Close-ups
          </h4>
          <div className="flex flex-wrap gap-4">
            {plateCrops.map((crop, i) => (
              <div key={i} className="rounded-lg overflow-hidden border-2 border-yellow-400 shadow-sm">
                <img src={crop} alt={`Plate crop ${i + 1}`} className="h-24 object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
