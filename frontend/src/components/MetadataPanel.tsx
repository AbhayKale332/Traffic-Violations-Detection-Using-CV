import type { ViolationRecord } from "../types";
import { Clock, Hash, Shield, Car, Camera, Timer, Percent } from "lucide-react";

type Props = {
  records: ViolationRecord[];
  processingStages?: { stage: string; ms: number }[];
  imageId?: string;
  isComplete?: boolean;
};

function MiniStat({ icon: Icon, label, value, color }: {
  icon: typeof Shield; label: string; value: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className={`inline-flex p-1.5 rounded-lg ${color} mb-2`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-lg font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function MetadataPanel({ records, processingStages, imageId, isComplete }: Props) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
        <Shield className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-800">No violations detected</p>
        <p className="text-xs text-slate-500 mt-1">The AI pipeline successfully processed the media and found 0 violations.</p>
        
        {processingStages && processingStages.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4 text-left">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Processing Time by Stage</h4>
            <div className="divide-y divide-slate-50">
              {processingStages.map((s) => (
                <div key={s.stage} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700">{s.stage}</span>
                  <span className="text-sm font-mono text-slate-500">{s.ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const totalTime = records.reduce((s, r) => s + r.processingTimeMs, 0);
  const avgConf = Math.round(records.reduce((s, r) => s + r.confidence, 0) / records.length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat icon={Shield} label="Violations" value={String(records.length)} color="text-red-600 bg-red-50" />
        <MiniStat icon={Percent} label="Avg Confidence" value={`${avgConf}%`} color="text-blue-600 bg-blue-50" />
        <MiniStat icon={Timer} label="Total Time" value={`${totalTime}ms`} color="text-emerald-600 bg-emerald-50" />
        <MiniStat icon={Hash} label="Image ID" value={imageId?.slice(0, 8) ?? "—"} color="text-slate-600 bg-slate-50" />
      </div>

      {processingStages && processingStages.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Processing Time by Stage</h4>
          </div>
          <div className="divide-y divide-slate-50">
            {processingStages.map((s) => (
              <div key={s.stage} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-slate-700">{s.stage}</span>
                <span className="text-sm font-mono text-slate-500">{s.ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Evidence Records</h4>
        </div>
        <div className="divide-y divide-slate-50">
          {records.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{r.violationLabel}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Car className="h-3 w-3" />{r.vehicleType}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Camera className="h-3 w-3" />{r.plateNumber || "—"}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" />{new Date(r.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">{r.confidence}%</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "Completed" ? "bg-emerald-50 text-emerald-700" : r.status === "Failed" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"}`}>{r.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
