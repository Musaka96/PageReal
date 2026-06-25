"use client";

import { useMemo } from "react";
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

const CATEGORY_COLORS = {
  subscriptions: "#0f172a",
  tips: "#f59e0b",
  ppv: "#0ea5e9",
  customs: "#10b981",
};

export default function TrendsPage() {
  const { snapshots } = useDemoStore();

  const sorted = useMemo(() => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)), [snapshots]);

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

  const avgPerPeriod = periodSeries.length ? grandTotal / periodSeries.length : 0;
  const bestPeriod = periodSeries.reduce((best, p) => (p.total > (best?.total ?? -Infinity) ? p : best), periodSeries[0]);
  const growth =
    periodSeries.length > 1
      ? ((periodSeries[periodSeries.length - 1].total - periodSeries[0].total) / Math.max(periodSeries[0].total, 1)) * 100
      : 0;

  return (
    <main className="px-6 py-8 sm:px-10">
      <PageHeader title="Sales Trends" subtitle="Revenue mix and growth across the account history." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total earned" value={money(grandTotal)} />
        <Metric label="Avg per period" value={money(avgPerPeriod)} />
        <Metric label="Best period" value={bestPeriod ? money(bestPeriod.total) : "—"} sub={bestPeriod?.date} />
        <Metric label="Growth (first → last)" value={`${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Earnings over time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={periodSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip formatter={moneyTooltip} />
              <Area type="monotone" dataKey="total" stroke="#0f172a" fill="#0f172a" fillOpacity={0.08} strokeWidth={2} />
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
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue by category, per period</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={periodSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
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
