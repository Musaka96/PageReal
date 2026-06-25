"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { buildAuditChain, verifyAuditChain } from "@/lib/audit-chain";
import { useDemoStore } from "@/lib/store";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AuditLogPage() {
  const { snapshots } = useDemoStore();
  const chain = useMemo(
    () => buildAuditChain(snapshots.map((s) => ({ timestamp: s.date, data: s }))),
    [snapshots]
  );
  const isValid = useMemo(() => verifyAuditChain(chain), [chain]);

  return (
    <main className="px-6 py-8 sm:px-10">
      <PageHeader title="Audit Log" subtitle="Tamper-evident, append-only history of every earnings snapshot." />

      <div
        className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
          isValid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {isValid
          ? "✓ Chain verified — every hash re-derives correctly from the previous entry."
          : "✗ Chain integrity check failed."}
      </div>

      <div className="space-y-2">
        {chain.map((entry) => {
          const snapshot = entry.data as { subscriptions: number; tips: number; ppv: number; customs: number };
          const total = snapshot.subscriptions + snapshot.tips + snapshot.ppv + snapshot.customs;
          return (
            <div key={entry.index} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{entry.timestamp}</p>
                <p className="text-sm text-slate-500">Cumulative: {money(total)}</p>
              </div>
              <p className="mt-2 font-mono text-xs text-slate-400">prev: {entry.prevHash.slice(0, 12)}…</p>
              <p className="font-mono text-xs text-slate-600">hash: {entry.hash.slice(0, 12)}…</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
