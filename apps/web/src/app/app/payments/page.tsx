"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useDemoStore } from "@/lib/store";
import { reconcile } from "@/lib/reconciliation";
import { buildCheckpoints, GRANULARITY_LABELS, type Granularity } from "@/lib/periods";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type Status = "matched" | "short" | "over";

type Row = {
  periodStart: string;
  periodEnd: string;
  grossEarned: number;
  expectedPayout: number;
  actualReceived: number;
  delta: number;
  status: Status;
};

type SortKey = "date" | "sales" | "delta";

function statusOf(delta: number): Status {
  if (Math.abs(delta) < 0.01) return "matched";
  return delta > 0 ? "short" : "over";
}

const STATUS_STYLES: Record<Status, string> = {
  matched: "bg-emerald-100 text-emerald-700",
  short: "bg-red-100 text-red-700",
  over: "bg-blue-100 text-blue-700",
};

export default function PaymentsPage() {
  const { dailySnapshots, contracts, payments, addPayment } = useDemoStore();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("biweek");
  const [customDays, setCustomDays] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", amount: "", note: "" });

  const checkpoints = useMemo(
    () => buildCheckpoints(dailySnapshots, granularity, customDays),
    [dailySnapshots, granularity, customDays]
  );

  const rows: Row[] = useMemo(() => {
    const start = checkpoints[0]?.date;
    const end = checkpoints[checkpoints.length - 1]?.date;
    const result = reconcile(checkpoints, contracts, payments, start, end);
    return result.lineItems.map((item) => ({
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      grossEarned: item.grossEarned,
      expectedPayout: item.expectedPayout,
      actualReceived: item.actualReceived,
      delta: item.delta,
      status: statusOf(item.delta),
    }));
  }, [checkpoints, contracts, payments]);

  const filtered = rows
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => !fromDate || r.periodStart >= fromDate)
    .filter((r) => !toDate || r.periodEnd <= toDate);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") cmp = a.periodStart.localeCompare(b.periodStart);
    if (sortKey === "sales") cmp = a.grossEarned - b.grossEarned;
    if (sortKey === "delta") cmp = a.delta - b.delta;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    addPayment({ date: form.date, amount: Number(form.amount), note: form.note || undefined });
    setForm({ date: "", amount: "", note: "" });
    setShowForm(false);
  }

  return (
    <main className="px-6 py-8 sm:px-10">
      <PageHeader
        title="Payments"
        subtitle="Per-period sales vs. what you were actually paid."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Log a payment
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={submitPayment}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4"
        >
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            required
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save payment
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "matched", "short", "over"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              statusFilter === s ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {s}
          </button>
        ))}
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
          >
            {Object.entries(GRANULARITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {granularity === "custom" && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              every
              <input
                type="number"
                min={1}
                value={customDays}
                onChange={(e) => setCustomDays(Math.max(Number(e.target.value), 1))}
                className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
              days
            </span>
          )}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <Th label="Period" onClick={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir} />
              <Th label="Sales" onClick={() => toggleSort("sales")} active={sortKey === "sales"} dir={sortDir} />
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Received</th>
              <Th label="Delta" onClick={() => toggleSort("delta")} active={sortKey === "delta"} dir={sortDir} />
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.periodStart} className="border-t border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.periodStart} → {row.periodEnd}
                </td>
                <td className="px-3 py-2">{money(row.grossEarned)}</td>
                <td className="px-3 py-2">{money(row.expectedPayout)}</td>
                <td className="px-3 py-2">{money(row.actualReceived)}</td>
                <td className="px-3 py-2">{money(row.delta)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No periods match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900">Logged payments</h2>
      <div className="space-y-2">
        {[...payments]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2">
            <span className="text-sm text-slate-700">{p.date}</span>
            <span className="text-sm text-slate-500">{p.note}</span>
            <span className="text-sm font-medium text-slate-900">{money(p.amount)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function Th({
  label,
  onClick,
  active,
  dir,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="px-3 py-2">
      <button onClick={onClick} className="flex items-center gap-1 font-medium hover:text-slate-900">
        {label}
        {active && <span className="text-slate-400">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
