"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { useDemoStore } from "@/lib/store";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function moneyTooltip(value: unknown): string {
  return money(typeof value === "number" ? value : Number(value ?? 0));
}

function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

type EarningsGranularity = "day" | "week" | "month";

type DailyDelta = {
  date: string;
  subscriptions: number;
  tips: number;
  ppv: number;
  customs: number;
  total: number;
};

/** Buckets daily deltas into day/week/month totals for the earnings-over-time chart. */
function bucketEarnings(daily: DailyDelta[], granularity: EarningsGranularity) {
  if (granularity === "day") return daily.map((d) => ({ label: d.date, total: d.total }));

  const buckets = new Map<string, number>();
  for (const d of daily) {
    const key = granularity === "month" ? d.date.slice(0, 7) : weekStart(d.date);
    buckets.set(key, (buckets.get(key) ?? 0) + d.total);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, total]) => ({ label, total }));
}

function weekStart(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dayOfWeek);
  return d.toISOString().slice(0, 10);
}

const CATEGORY_COLORS = {
  subscriptions: "#0f172a",
  tips: "#f59e0b",
  ppv: "#0ea5e9",
  customs: "#10b981",
};

export default function TrendsPage() {
  const { dailySnapshots } = useDemoStore();
  const [earningsGranularity, setEarningsGranularity] = useState<EarningsGranularity>("week");

  const sorted = useMemo(
    () => [...dailySnapshots].sort((a, b) => a.date.localeCompare(b.date)),
    [dailySnapshots]
  );

  const periodSeries = useMemo(() => {
    const out: { date: string; subscriptions: number; tips: number; ppv: number; customs: number; total: number }[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const subscriptions = curr.subscriptions - prev.subscriptions;
      const tips = curr.tips - prev.tips;
      const ppv = curr.ppv - prev.ppv;
      const customs = curr.customs - prev.customs;
      out.push({ date: curr.date, subscriptions, tips, ppv, customs, total: subscriptions + tips + ppv + customs });
    }
    return out;
  }, [sorted]);

  const totals = useMemo(() => {
    const last = sorted[sorted.length - 1];
    const first = sorted[0];
    return {
      subscriptions: (last?.subscriptions ?? 0) - (first?.subscriptions ?? 0),
      tips: (last?.tips ?? 0) - (first?.tips ?? 0),
      ppv: (last?.ppv ?? 0) - (first?.ppv ?? 0),
      customs: (last?.customs ?? 0) - (first?.customs ?? 0),
    };
  }, [sorted]);

  const grandTotal = totals.subscriptions + totals.tips + totals.ppv + totals.customs;
  const pieData = [
    { name: "Subscriptions", key: "subscriptions", value: totals.subscriptions },
    { name: "Tips", key: "tips", value: totals.tips },
    { name: "PPV", key: "ppv", value: totals.ppv },
    { name: "Customs", key: "customs", value: totals.customs },
  ];

  const avgPerDay = periodSeries.length ? grandTotal / periodSeries.length : 0;
  const bestDay = periodSeries.reduce((best, p) => (p.total > (best?.total ?? -Infinity) ? p : best), periodSeries[0]);

  // 7-day rolling buckets, purely for the stacked category chart's readability —
  // 180+ individual daily bars would be unreadable at this width.
  const weeklySeries = useMemo(() => {
    const out: { week: string; subscriptions: number; tips: number; ppv: number; customs: number }[] = [];
    for (let i = 0; i < periodSeries.length; i += 7) {
      const chunk = periodSeries.slice(i, i + 7);
      out.push({
        week: chunk[0].date,
        subscriptions: chunk.reduce((s, d) => s + d.subscriptions, 0),
        tips: chunk.reduce((s, d) => s + d.tips, 0),
        ppv: chunk.reduce((s, d) => s + d.ppv, 0),
        customs: chunk.reduce((s, d) => s + d.customs, 0),
      });
    }
    return out;
  }, [periodSeries]);

  const growth =
    periodSeries.length > 7
      ? ((average(periodSeries.slice(-7).map((p) => p.total)) - average(periodSeries.slice(0, 7).map((p) => p.total))) /
          Math.max(average(periodSeries.slice(0, 7).map((p) => p.total)), 1)) *
        100
      : 0;

  const earningsSeries = useMemo(
    () => bucketEarnings(periodSeries, earningsGranularity),
    [periodSeries, earningsGranularity]
  );

  return (
    <main className="px-6 py-8 sm:px-10">
      <PageHeader title="Sales Trends" subtitle="Revenue mix and growth across the account history." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total earned (6mo)" value={money(grandTotal)} />
        <Metric label="Avg per day" value={money(avgPerDay)} />
        <Metric label="Best day" value={bestDay ? money(bestDay.total) : "—"} sub={bestDay?.date} />
        <Metric label="Growth (first wk → last wk)" value={`${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Earnings over time</h2>
            <select
              value={earningsGranularity}
              onChange={(e) => setEarningsGranularity(e.target.value as EarningsGranularity)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={earningsSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                interval={Math.max(Math.floor(earningsSeries.length / 7), 0)}
              />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip formatter={moneyTooltip} />
              <Area type="natural" dataKey="total" stroke="#0f172a" fill="#0f172a" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue mix</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key as keyof typeof CATEGORY_COLORS]} />
                ))}
              </Pie>
              <Tooltip formatter={moneyTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue by category, per week</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={weeklySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip formatter={moneyTooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="subscriptions" stackId="a" fill={CATEGORY_COLORS.subscriptions} />
            <Bar dataKey="tips" stackId="a" fill={CATEGORY_COLORS.tips} />
            <Bar dataKey="ppv" stackId="a" fill={CATEGORY_COLORS.ppv} />
            <Bar dataKey="customs" stackId="a" fill={CATEGORY_COLORS.customs} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
