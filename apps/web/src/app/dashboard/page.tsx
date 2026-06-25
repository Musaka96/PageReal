import { Header, Nav } from "@/components/Header";
import { ExportButton } from "@/components/ExportButton";
import { buildAuditChain } from "@/lib/audit-chain";
import { demoContracts, demoPayments, demoPeriod, demoSnapshots } from "@/lib/demo-data";
import { reconcile } from "@/lib/reconciliation";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function DashboardPage() {
  const result = reconcile(demoSnapshots, demoContracts, demoPayments, demoPeriod.start, demoPeriod.end);
  const isShort = result.delta > 0;

  const chain = buildAuditChain(demoSnapshots.map((s) => ({ timestamp: s.date, data: s })));
  const chainHead = chain[chain.length - 1]?.hash ?? null;

  const exportPayload = {
    creator: "Demo Creator",
    source: "demo",
    generatedAt: new Date().toISOString(),
    period: demoPeriod,
    reconciliation: result,
    auditChainHead: chainHead,
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Nav active="dashboard" />
        <Header active="dashboard" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Period breakdown</h2>
          <ExportButton data={exportPayload} filename="clearledger-demo-reconciliation.json" />
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
              {result.lineItems.map((item) => (
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
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Audit chain head: <span className="font-mono">{chainHead?.slice(0, 16)}…</span> — see the{" "}
          <a href="/audit-log" className="underline">
            Audit Log
          </a>{" "}
          for the full tamper-evident history.
        </p>
      </div>
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
