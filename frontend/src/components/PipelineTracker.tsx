import { CheckCircle2, Loader2, CircleDashed, XCircle } from "lucide-react";
import type { PipelineStage } from "../types";

type PipelineTrackerProps = {
  stages: PipelineStage[];
};

const statusConfig = {
  pending: {
    icon: CircleDashed,
    color: "text-slate-300",
    bg: "bg-slate-50",
    border: "border-slate-100",
    label: "Pending",
  },
  processing: {
    icon: Loader2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "Processing",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Failed",
  },
};

export default function PipelineTracker({ stages }: PipelineTrackerProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Pipeline Progress
        </h3>
      </div>

      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200" />

        <div className="space-y-1">
          {stages.map((stage) => {
            const config = statusConfig[stage.status];
            const Icon = config.icon;

            return (
              <div
                key={stage.id}
                className={`
                  relative flex items-center gap-3.5 
                  rounded-lg px-3 py-2.5
                  border transition-all duration-300
                  ${config.bg} ${config.border}
                `}
              >
                <div className="relative z-10 shrink-0">
                  <Icon
                    className={`h-5 w-5 ${config.color} ${
                      stage.status === "processing" ? "animate-spin" : ""
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {stage.label}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {stage.durationMs !== undefined && (
                    <span className="text-xs font-mono text-slate-500">
                      {stage.durationMs}ms
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
