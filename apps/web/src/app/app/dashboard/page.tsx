"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { ExportButton } from "@/components/ExportButton";
import { PdfExportButton } from "@/components/PdfExportButton";
import { buildAuditChain } from "@/lib/audit-chain";
import { useDemoStore } from "@/lib/store";
import { reconcile } from "@/lib/reconciliation";
import type { Snapshot } from "@/lib/types";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function moneyTooltip(value: unknown): string {
  return money(typeof value === "number" ? value : Number(value ?? 0));
}

type Granularity = "day" | "week" | "month";
type Category = "subscriptions" | "tips" | "ppv" | "customs";

const ALL_CATEGORIES: Category[] = ["subscriptions", "tips", "ppv", "customs"];
const CATEGORY_LABELS: Record<Category, string> = {
  subscriptions: "Subscriptions",
  tips: "Tips",
  ppv: "PPV unlocks",
  customs: "Customs",
};

function dailyDeltas(daily: Snapshot[]) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const out: { date: string; subscriptions: number; tips: number; ppv: number; customs: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    out.push({
      date: curr.date,
      subscriptions: curr.subscriptions - prev.subscriptions,
      tips: curr.tips - prev.tips,
      ppv: curr.ppv - prev.ppv,
      customs: curr.customs - prev.customs,
    });
  }
  return out;
}

function bucketKey(date: string, granularity: Granularity): string {
  if (granularity === "month") return date.slice(0, 7);
  if (granularity === "day") return date;
  // week: label by the Monday-anchored ISO week start
  const d = new Date(date + "T00:00:00Z");
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dayOfWeek);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { snapshots, dailySnapshots, contracts, payments } = useDemoStore();

  const fullStart = snapshots[0]?.date ?? "";
  const fullEnd = snapshots[snapshots.length - 1]?.date ?? "";

  const [dateFrom, setDateFrom] = useState(fullStart);
  const [dateTo, setDateTo] = useState(fullEnd);
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Category[]>(ALL_CATEGORIES);
  const [breakdownSortDir, setBreakdownSortDir] = useState<"desc" | "asc">("desc");

  function toggleCategory(cat: Category) {
    setActiveCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  const result = useMemo(
    () => reconcile(snapshots, contracts, payments, dateFrom, dateTo),
    [snapshots, contracts, payments, dateFrom, dateTo]
  );

  // reconcile() always returns periods oldest -> newest; reverse only for display.
  const displayedLineItems = breakdownSortDir === "desc" ? [...result.lineItems].reverse() : result.lineItems;

  const chain = useMemo(
    () => buildAuditChain(snapshots.map((s) => ({ timestamp: s.date, data: s }))),
    [snapshots]
  );
  const chainHead = chain[chain.length - 1]?.hash ?? null;
  const isShort = result.delta > 0;

  const chartData = useMemo(() => {
    const deltas = dailyDeltas(dailySnapshots).filter((d) => d.date >= dateFrom && d.date <= dateTo);
    const buckets = new Map<string, number>();
    for (const d of deltas) {
      const key = bucketKey(d.date, granularity);
      const value = activeCategories.reduce((sum, cat) => sum + d[cat], 0);
      buckets.set(key, (buckets.get(key) ?? 0) + value);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, total]) => ({ bucket, total }));
  }, [dailySnapshots, dateFrom, dateTo, granularity, activeCategories]);

  const exportPayload = {
    creator: "Demo Creator",
    source: "demo",
    generatedAt: new Date().toISOString(),
    period: { start: dateFrom, end: dateTo },
    reconciliation: result,
    auditChainHead: chainHead,
  };

  return (
    <main className="px-6 py-8 sm:px-10">
      <PageHeader
        title="Earnings Reconciliation"
        subtitle="What the account earned vs. what you were actually paid."
        action={
          <div className="flex gap-2">
            <PdfExportButton
              creatorName="Demo Creator"
              source="demo"
              result={result}
              auditChainHead={chainHead}
              filename="pagereal-reconciliation.pdf"
            />
            <ExportButton data={exportPayload} filename="pagereal-reconciliation.json" />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          min={fullStart}
          max={dateTo}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        />
        <span className="text-xs text-slate-400">→</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          max={fullEnd}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        />

        <select
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as Granularity)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="day">Shown by day</option>
          <option value="week">Shown by week</option>
          <option value="month">Shown by month</option>
        </select>

        <div className="relative">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Filters {activeCategories.length < ALL_CATEGORIES.length && `(${activeCategories.length})`}
          </button>
          {filtersOpen && (
            <div className="absolute z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-slate-500">Revenue categories</p>
              {ALL_CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={activeCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  {CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setDateFrom(fullStart);
            setDateTo(fullEnd);
            setGranularity("week");
            setActiveCategories(ALL_CATEGORIES);
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
        >
          Reset filters
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Sales</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip formatter={moneyTooltip} />
            <Bar dataKey="total" fill="#0f172a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Gross earned" value={money(result.grossEarned)} />
        <Stat label="Deductions" value={money(result.deductions)} />
        <Stat label="You should have received" value={money(result.expectedPayout)} />
        <Stat label="You were paid" value={money(result.actualReceived)} />
      </div>

      <div
        className={`mt-4 rounded-xl border p-5 ${
          isShort ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <p className="text-sm font-medium text-slate-600">Difference</p>
        <p className={`text-3xl font-bold ${isShort ? "text-red-700" : "text-emerald-700"}`}>
          {money(Math.abs(result.delta))} {isShort ? "underpaid" : "matched / overpaid"}
        </p>
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Period breakdown</h2>
        <button
          onClick={() => setBreakdownSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {breakdownSortDir === "desc" ? "Newest first" : "Oldest first"}
          <span className="text-slate-400">{breakdownSortDir === "desc" ? "↓" : "↑"}</span>
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Received</th>
              <th className="px-3 py-2">Delta</th>
            </tr>
          </thead>
          <tbody>
            {displayedLineItems.map((item) => (
              <tr key={item.periodStart} className="border-t border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">
                  {item.periodStart} → {item.periodEnd}
                </td>
                <td className="px-3 py-2">{money(item.grossEarned)}</td>
                <td className="px-3 py-2">{money(item.expectedPayout)}</td>
                <td className="px-3 py-2">{money(item.actualReceived)}</td>
                <td className={`px-3 py-2 font-medium ${item.delta > 0.01 ? "text-red-600" : "text-emerald-600"}`}>
                  {money(item.delta)}
                </td>
              </tr>
            ))}
            {result.lineItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No periods in this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Audit chain head: <span className="font-mono">{chainHead?.slice(0, 16)}…</span>
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
