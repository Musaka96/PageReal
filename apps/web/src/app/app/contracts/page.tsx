"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useDemoStore } from "@/lib/store";

export default function ContractsPage() {
  const { contracts, updateContract, resetDemo } = useDemoStore();
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  return (
    <main className="px-6 py-8 sm:px-10">
      <PageHeader
        title="Contract Terms"
        subtitle="Edit commission and deduction rules — reconciliation updates everywhere immediately."
        action={
          <button
            onClick={resetDemo}
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reset demo data
          </button>
        }
      />

      <div className="space-y-4">
        {contracts.map((contract, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {contract.effectiveFrom} → {contract.effectiveTo ?? "present"}
              </p>
              {savedIndex === index && <span className="text-xs font-medium text-emerald-600">Saved</span>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Commission %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(contract.commissionPct * 100)}
                  onChange={(e) => {
                    updateContract(index, { commissionPct: Number(e.target.value) / 100 });
                    setSavedIndex(index);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </Field>

              <Field label="Flat deduction ($/period)">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={contract.flatDeduction}
                  onChange={(e) => {
                    updateContract(index, { flatDeduction: Number(e.target.value) });
                    setSavedIndex(index);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </Field>

              <Field label="Payout lag (days)">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={contract.payoutLagDays}
                  onChange={(e) => {
                    updateContract(index, { payoutLagDays: Number(e.target.value) });
                    setSavedIndex(index);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Mid-period contract changes are applied to their own sub-range — see{" "}
        <code>agent_docs/reconciliation_spec.md</code>.
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
