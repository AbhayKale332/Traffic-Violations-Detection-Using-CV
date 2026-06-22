import { useState, useMemo } from "react";
import { Search, Filter, Download, ChevronDown, ChevronUp } from "lucide-react";
import type { ViolationRecord, RecordFilters } from "../types";

type Props = { records: ViolationRecord[] };

const VIOLATION_LABELS = [
  "All", "Helmet violation", "No seatbelt", "Triple riding",
  "Phone usage", "Mobile use", "Tinted window", "License plate", "Other",
];

export default function RecordsTable({ records }: Props) {
  const [filters, setFilters] = useState<RecordFilters>({
    search: "", violationType: "All", dateFrom: "", dateTo: "",
    vehicleType: "", confidenceMin: 0, confidenceMax: 100,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"timestamp" | "confidence">("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let result = [...records];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(r =>
        r.violationLabel.toLowerCase().includes(q) ||
        r.plateNumber.toLowerCase().includes(q) ||
        r.vehicleType.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    if (filters.violationType !== "All") {
      result = result.filter(r => r.violationLabel === filters.violationType);
    }
    if (filters.vehicleType) {
      result = result.filter(r => r.vehicleType.toLowerCase().includes(filters.vehicleType.toLowerCase()));
    }
    result = result.filter(r => r.confidence >= filters.confidenceMin && r.confidence <= filters.confidenceMax);
    if (filters.dateFrom) result = result.filter(r => r.timestamp >= filters.dateFrom);
    if (filters.dateTo) result = result.filter(r => r.timestamp <= filters.dateTo + "T23:59:59");

    result.sort((a, b) => {
      const aVal = sortField === "timestamp" ? a.timestamp : a.confidence;
      const bVal = sortField === "timestamp" ? b.timestamp : b.confidence;
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [records, filters, sortField, sortDir]);

  function exportCSV() {
    const headers = ["ID", "Timestamp", "Violation", "Confidence", "Vehicle", "Plate", "Status"];
    const rows = filtered.map(r => [r.id, r.timestamp, r.violationLabel, r.confidence, r.vehicleType, r.plateNumber, r.status]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "violation_records.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(field: "timestamp" | "confidence") {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  const SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown;

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
        <p className="text-sm text-slate-500">No violation records yet. Run analysis to populate this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" placeholder="Search violations, plates, vehicles…"
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Filter className="h-4 w-4" /> Filters {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Violation Type</label>
            <select value={filters.violationType} onChange={e => setFilters(f => ({ ...f, violationType: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              {VIOLATION_LABELS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Vehicle Type</label>
            <input type="text" placeholder="e.g. Motorcycle" value={filters.vehicleType} onChange={e => setFilters(f => ({ ...f, vehicleType: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Confidence Min</label>
            <input type="number" min={0} max={100} value={filters.confidenceMin} onChange={e => setFilters(f => ({ ...f, confidenceMin: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Confidence Max</label>
            <input type="number" min={0} max={100} value={filters.confidenceMax} onChange={e => setFilters(f => ({ ...f, confidenceMax: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-slate-500">{filtered.length} of {records.length} records</p>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Violation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("confidence")}>
                  <span className="inline-flex items-center gap-1">Confidence {sortField === "confidence" && <SortIcon className="h-3 w-3" />}</span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("timestamp")}>
                  <span className="inline-flex items-center gap-1">Time {sortField === "timestamp" && <SortIcon className="h-3 w-3" />}</span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.slice(0, 50).map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.violationLabel}</td>
                  <td className="px-4 py-3 tabular-nums">{r.confidence}%</td>
                  <td className="px-4 py-3 text-slate-600">{r.vehicleType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.plateNumber || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "Completed" ? "bg-emerald-50 text-emerald-700" : r.status === "Failed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && <p className="text-xs text-slate-400 text-center py-3">Showing first 50 of {filtered.length} records</p>}
      </div>
    </div>
  );
}
