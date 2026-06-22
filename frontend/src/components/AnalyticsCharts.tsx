import { useMemo } from "react";
import { BarChart3, TrendingUp, Clock, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import type { AnalyticsSummary } from "../types";

type Props = { analytics: AnalyticsSummary };

const COLORS = ["#2563eb", "#dc2626", "#f59e0b", "#22c55e", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

export default function AnalyticsCharts({ analytics }: Props) {
  const { totalProcessed, totalViolations, violationsByClass, confidenceDistribution, averageInferenceMs, recordsByDate } = analytics;

  const classPieData = useMemo(() =>
    Object.entries(violationsByClass).map(([name, value], i) => ({
      name, value, color: COLORS[i % COLORS.length],
    })), [violationsByClass]);

  if (totalProcessed === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
        <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No analytics data yet. Process images to populate charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Images Processed" value={totalProcessed} />
        <StatCard icon={BarChart3} label="Total Violations" value={totalViolations} />
        <StatCard icon={TrendingUp} label="Violation Types" value={Object.keys(violationsByClass).length} />
        <StatCard icon={Clock} label="Avg Inference" value={`${averageInferenceMs}ms`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Violations by class bar chart */}
        {classPieData.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Violations by Class</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classPieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {classPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Confidence distribution */}
        {confidenceDistribution.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Confidence Distribution</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Violation type pie */}
        {classPieData.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Violation Type Share</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={classPieData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                    {classPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Records by date */}
        {recordsByDate.length > 1 && (
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Records by Date</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recordsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <Icon className="h-4 w-4 text-slate-400 mb-2" />
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
