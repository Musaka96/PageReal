import type { ContractVersion, LoggedPayment, Snapshot } from "./types";

/**
 * Synthetic demo seed scenario. See agent_docs/demo_mode_spec.md.
 * Numbers are entirely fabricated — not derived from any real creator or fan data.
 * Includes a deliberate underpayment gap in the most recent period so the
 * reconciliation delta is visible without the visitor manufacturing one.
 */

export const demoCreatorName = "Demo Creator";

export const demoSnapshots: Snapshot[] = [
  { date: "2026-04-01", subscriptions: 0, tips: 0, ppv: 0, customs: 0 },
  { date: "2026-04-15", subscriptions: 4200, tips: 1100, ppv: 2300, customs: 800 },
  { date: "2026-05-01", subscriptions: 8900, tips: 2600, ppv: 5100, customs: 1900 },
  { date: "2026-05-15", subscriptions: 13400, tips: 4300, ppv: 7600, customs: 3100 },
  { date: "2026-06-01", subscriptions: 18100, tips: 6700, ppv: 10800, customs: 4400 },
  { date: "2026-06-15", subscriptions: 23000, tips: 9200, ppv: 14200, customs: 5900 },
];

export const demoContracts: ContractVersion[] = [
  {
    effectiveFrom: "2026-04-01",
    effectiveTo: "2026-05-15",
    commissionPct: 0.4,
    flatDeduction: 50,
    payoutLagDays: 7,
  },
  {
    effectiveFrom: "2026-05-15",
    effectiveTo: null,
    commissionPct: 0.35,
    flatDeduction: 50,
    payoutLagDays: 7,
  },
];

// Deliberately short on the final period to demonstrate the reconciliation gap.
export const demoPayments: LoggedPayment[] = [
  { date: "2026-04-22", amount: 4470, note: "Apr 1-15 payout" },
  { date: "2026-05-08", amount: 7820, note: "Apr 15-May 1 payout" },
  { date: "2026-05-22", amount: 7180, note: "May 1-15 payout" },
  { date: "2026-06-08", amount: 7600, note: "May 15-Jun 1 payout (short)" },
];

export const demoPeriod = {
  start: demoSnapshots[0].date,
  end: demoSnapshots[demoSnapshots.length - 1].date,
};
