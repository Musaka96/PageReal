import type { Snapshot } from "./types";

export type Granularity = "day" | "week" | "biweek" | "month" | "custom";

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Daily",
  week: "Weekly",
  biweek: "Biweekly",
  month: "Monthly",
  custom: "Custom",
};

/**
 * Reduces a daily snapshot series down to checkpoints spaced by the chosen
 * granularity, so reconcile() (which produces one line item per consecutive
 * snapshot pair) yields periods of that length instead of always daily.
 * `customDays` is only used when granularity === "custom".
 */
export function buildCheckpoints(daily: Snapshot[], granularity: Granularity, customDays = 14): Snapshot[] {
  if (daily.length === 0) return [];
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));

  if (granularity === "month") {
    const checkpoints: Snapshot[] = [];
    let lastMonth = "";
    for (const snap of sorted) {
      const month = snap.date.slice(0, 7);
      if (month !== lastMonth) {
        checkpoints.push(snap);
        lastMonth = month;
      }
    }
    const last = sorted[sorted.length - 1];
    if (checkpoints[checkpoints.length - 1]?.date !== last.date) checkpoints.push(last);
    return checkpoints;
  }

  const stepDays = granularity === "day" ? 1 : granularity === "week" ? 7 : granularity === "biweek" ? 14 : Math.max(customDays, 1);
  const checkpoints = sorted.filter((_, i) => i % stepDays === 0);
  const last = sorted[sorted.length - 1];
  if (checkpoints[checkpoints.length - 1]?.date !== last.date) checkpoints.push(last);
  return checkpoints;
}
