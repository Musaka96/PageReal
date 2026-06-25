import type {
  ContractVersion,
  LoggedPayment,
  ReconciliationLineItem,
  ReconciliationResult,
  Snapshot,
} from "./types";

function grossAt(snapshot: Snapshot): number {
  return snapshot.subscriptions + snapshot.tips + snapshot.ppv + snapshot.customs;
}

function contractFor(contracts: ContractVersion[], date: string): ContractVersion {
  const match = contracts.find(
    (c) => date >= c.effectiveFrom && (c.effectiveTo === null || date < c.effectiveTo)
  );
  if (!match) throw new Error(`No contract version covers ${date}`);
  return match;
}

function paymentsAttributedTo(
  payments: LoggedPayment[],
  periodStart: string,
  periodEnd: string,
  payoutLagDays: number
): number {
  const lagMs = payoutLagDays * 24 * 60 * 60 * 1000;
  const start = new Date(periodStart).getTime() + lagMs;
  const end = new Date(periodEnd).getTime() + lagMs;
  return payments
    .filter((p) => {
      const t = new Date(p.date).getTime();
      return t >= start && t < end;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Pure reconciliation function: snapshots + contract terms + logged payments -> expected vs received.
 * See agent_docs/reconciliation_spec.md for the formula this implements.
 */
export function reconcile(
  snapshots: Snapshot[],
  contracts: ContractVersion[],
  payments: LoggedPayment[],
  periodStart: string,
  periodEnd: string
): ReconciliationResult {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const inRange = sorted.filter((s) => s.date >= periodStart && s.date <= periodEnd);

  const lineItems: ReconciliationLineItem[] = [];
  for (let i = 1; i < inRange.length; i++) {
    const prev = inRange[i - 1];
    const curr = inRange[i];
    const grossDelta = grossAt(curr) - grossAt(prev);
    const contract = contractFor(contracts, curr.date);
    const deductions = grossDelta * contract.commissionPct + contract.flatDeduction;
    const expected = grossDelta - deductions;
    const actual = paymentsAttributedTo(payments, prev.date, curr.date, contract.payoutLagDays);
    lineItems.push({
      periodStart: prev.date,
      periodEnd: curr.date,
      grossEarned: grossDelta,
      deductions,
      expectedPayout: expected,
      actualReceived: actual,
      delta: expected - actual,
    });
  }

  return {
    periodStart,
    periodEnd,
    grossEarned: sum(lineItems, "grossEarned"),
    deductions: sum(lineItems, "deductions"),
    expectedPayout: sum(lineItems, "expectedPayout"),
    actualReceived: sum(lineItems, "actualReceived"),
    delta: sum(lineItems, "delta"),
    lineItems,
  };
}

function sum(items: ReconciliationLineItem[], key: keyof ReconciliationLineItem): number {
  return items.reduce((total, item) => total + (item[key] as number), 0);
}
