import { Header, Nav } from "@/components/Header";
import { buildAuditChain, verifyAuditChain } from "@/lib/audit-chain";
import { demoSnapshots } from "@/lib/demo-data";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AuditLogPage() {
  const chain = buildAuditChain(demoSnapshots.map((s) => ({ timestamp: s.date, data: s })));
  const isValid = verifyAuditChain(chain);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Nav active="audit-log" />
        <Header active="audit-log" />

        <div
          className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
            isValid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {isValid ? "✓ Chain verified — every hash re-derives correctly from the previous entry." : "✗ Chain integrity check failed."}
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Each row below is an append-only record of an earnings snapshot. Every hash is computed
          from the snapshot data and the previous row&apos;s hash — changing any past entry would
          break every hash after it, which is what makes this tamper-evident.
        </p>

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
                <p className="mt-2 font-mono text-xs text-slate-400">
                  prev: {entry.prevHash.slice(0, 12)}…
                </p>
                <p className="font-mono text-xs text-slate-600">hash: {entry.hash.slice(0, 12)}…</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
