import { AlertCircle, Gauge, Zap, Target, BarChart3, Cpu, Timer, Activity } from "lucide-react";
import type { EvaluationMetrics } from "../types";

type Props = { metrics: EvaluationMetrics };

export default function EvaluationCards({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center">
        <AlertCircle className="h-7 w-7 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-amber-800">Evaluation metrics not available yet.</p>
        <p className="text-xs text-amber-600 mt-1">Run model validation to populate this section.</p>
      </div>
    );
  }

  const cards = [
    metrics.accuracy != null && { icon: Target, label: "Accuracy", value: `${(metrics.accuracy * 100).toFixed(1)}%`, color: "text-blue-600 bg-blue-50" },
    metrics.precision != null && { icon: Zap, label: "Precision", value: `${(metrics.precision * 100).toFixed(1)}%`, color: "text-emerald-600 bg-emerald-50" },
    metrics.recall != null && { icon: BarChart3, label: "Recall", value: `${(metrics.recall * 100).toFixed(1)}%`, color: "text-amber-600 bg-amber-50" },
    metrics.f1Score != null && { icon: Activity, label: "F1-Score", value: `${(metrics.f1Score * 100).toFixed(1)}%`, color: "text-purple-600 bg-purple-50" },
    metrics.mAP != null && { icon: Gauge, label: "mAP", value: `${(metrics.mAP * 100).toFixed(1)}%`, color: "text-indigo-600 bg-indigo-50" },
    metrics.avgInferenceLatencyMs != null && { icon: Timer, label: "Avg Latency", value: `${metrics.avgInferenceLatencyMs}ms`, color: "text-cyan-600 bg-cyan-50" },
    metrics.throughputFPS != null && { icon: Zap, label: "Throughput", value: `${metrics.throughputFPS} FPS`, color: "text-rose-600 bg-rose-50" },
    metrics.memoryUsageMB != null && { icon: Cpu, label: "Memory", value: `${metrics.memoryUsageMB} MB`, color: "text-slate-600 bg-slate-50" },
  ].filter(Boolean) as { icon: typeof Target; label: string; value: string; color: string }[];

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center">
        <AlertCircle className="h-7 w-7 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-amber-800">Evaluation metrics not available yet.</p>
        <p className="text-xs text-amber-600 mt-1">Run model validation to populate this section.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="rounded-xl border border-slate-100 bg-white p-4">
          <div className={`inline-flex p-1.5 rounded-lg ${color} mb-2`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
