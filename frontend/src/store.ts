// ── Simple in-memory store for violation records & analytics ──
// Designed so a real backend can replace the local storage trivially.

import type {
  ViolationRecord,
  AnalyticsSummary,
  EvaluationMetrics,
} from "./types";

const STORAGE_KEY = "tvai_violation_records";

/** Load records from localStorage (persists across refreshes) */
export function loadRecords(): ViolationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save records to localStorage */
export function saveRecords(records: ViolationRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** Append new records and persist */
export function appendRecords(newRecords: ViolationRecord[]): ViolationRecord[] {
  const existing = loadRecords();
  const merged = [...newRecords, ...existing];
  saveRecords(merged);
  return merged;
}

/** Clear all stored records */
export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Compute analytics summary from actual stored records */
export function computeAnalytics(records: ViolationRecord[]): AnalyticsSummary {
  if (records.length === 0) {
    return {
      totalProcessed: 0,
      totalViolations: 0,
      violationsByClass: {},
      confidenceDistribution: [],
      averageInferenceMs: 0,
      processingTimeByStage: [],
      recordsByDate: [],
    };
  }

  // Violations by class
  const byClass: Record<string, number> = {};
  records.forEach((r) => {
    byClass[r.violationLabel] = (byClass[r.violationLabel] ?? 0) + 1;
  });

  // Confidence distribution in 10% buckets
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    count: 0,
  }));
  records.forEach((r) => {
    const idx = Math.min(Math.floor(r.confidence / 10), 9);
    buckets[idx].count++;
  });
  const confidenceDistribution = buckets.filter((b) => b.count > 0);

  // Average inference time
  const totalTime = records.reduce((s, r) => s + r.processingTimeMs, 0);
  const averageInferenceMs = Math.round(totalTime / records.length);

  // Unique image IDs = total processed
  const uniqueImages = new Set(records.map((r) => r.imageId));

  // Records by date (last 30 days)
  const dateCounts: Record<string, number> = {};
  records.forEach((r) => {
    const day = r.timestamp.slice(0, 10);
    dateCounts[day] = (dateCounts[day] ?? 0) + 1;
  });
  const recordsByDate = Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalProcessed: uniqueImages.size,
    totalViolations: records.length,
    violationsByClass: byClass,
    confidenceDistribution,
    averageInferenceMs,
    processingTimeByStage: [], // populated per-run
    recordsByDate,
  };
}

/**
 * Load evaluation metrics.
 * Returns null when no evaluation data exists — the UI should
 * show a clear empty state in this case.
 */
export function loadEvaluationMetrics(): EvaluationMetrics {
  try {
    const raw = localStorage.getItem("tvai_eval_metrics");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveEvaluationMetrics(metrics: EvaluationMetrics): void {
  localStorage.setItem("tvai_eval_metrics", JSON.stringify(metrics));
}
