import { reconcile } from "./reconciliation";
import type { ContractVersion, LoggedPayment, Snapshot } from "./types";

/**
 * Synthetic demo seed scenario. See agent_docs/demo_mode_spec.md.
 * Numbers are entirely fabricated — not derived from any real creator or fan data.
 *
 * Generates 6 months of daily tip/PPV sales (individual purchases $5-$200,
 * averaging $100-$3000 of combined tip+PPV revenue per day), plus steady
 * subscription revenue and occasional custom-content sales. Cumulative daily
 * snapshots feed the Sales Trends chart; a biweekly subset of those same
 * snapshots is used for reconciliation periods (matching the contract's
 * payout schedule), with a deliberate underpayment gap in the final period.
 */

const DAYS_OF_HISTORY = 182; // ~6 months

// Deterministic PRNG (mulberry32) so the demo dataset is stable across reloads.
function mulberry32(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function randBetween(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

function generateDailyDeltas(rng: () => number) {
  const days: { subscriptions: number; tips: number; ppv: number; customs: number }[] = [];

  for (let i = 0; i < DAYS_OF_HISTORY; i++) {
    const dailyTarget = randBetween(rng, 100, 3000);
    let tips = 0;
    let ppv = 0;
    let remaining = dailyTarget;

    while (remaining >= 5) {
      const purchase = Math.min(randBetween(rng, 5, 200), remaining);
      if (rng() < 0.55) {
        ppv += purchase;
      } else {
        tips += purchase;
      }
      remaining -= purchase;
      if (remaining < 5) break;
    }

    const subscriptions = randBetween(rng, 20, 80);
    const customs = rng() < 0.15 ? randBetween(rng, 30, 180) : 0;

    days.push({
      subscriptions: Math.round(subscriptions * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      ppv: Math.round(ppv * 100) / 100,
      customs: Math.round(customs * 100) / 100,
    });
  }

  return days;
}

function buildDailySnapshots(): Snapshot[] {
  const rng = mulberry32(20260625);
  const deltas = generateDailyDeltas(rng);

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (DAYS_OF_HISTORY - 1));

  let cumulative = { subscriptions: 0, tips: 0, ppv: 0, customs: 0 };
  const snapshots: Snapshot[] = [];

  // Leading zero snapshot so the very first day has a delta to compute against.
  snapshots.push({ date: toISODate(new Date(start.getTime() - 86400000)), ...cumulative });

  for (let i = 0; i < deltas.length; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    cumulative = {
      subscriptions: cumulative.subscriptions + deltas[i].subscriptions,
      tips: cumulative.tips + deltas[i].tips,
      ppv: cumulative.ppv + deltas[i].ppv,
      customs: cumulative.customs + deltas[i].customs,
    };
    snapshots.push({ date: toISODate(day), ...cumulative });
  }

  return snapshots;
}

function buildBiweeklyCheckpoints(daily: Snapshot[]): Snapshot[] {
  const checkpoints = daily.filter((_, i) => i % 14 === 0);
  const last = daily[daily.length - 1];
  if (checkpoints[checkpoints.length - 1]?.date !== last.date) checkpoints.push(last);
  return checkpoints;
}

export const demoCreatorName = "Demo Creator";

export const demoDailySnapshots: Snapshot[] = buildDailySnapshots();
export const demoSnapshots: Snapshot[] = buildBiweeklyCheckpoints(demoDailySnapshots);

const midpointIndex = Math.floor(demoSnapshots.length / 2);

export const demoContracts: ContractVersion[] = [
  {
    effectiveFrom: demoSnapshots[0].date,
    effectiveTo: demoSnapshots[midpointIndex].date,
    commissionPct: 0.4,
    flatDeduction: 50,
    payoutLagDays: 7,
  },
  {
    effectiveFrom: demoSnapshots[midpointIndex].date,
    effectiveTo: null,
    commissionPct: 0.35,
    flatDeduction: 50,
    payoutLagDays: 7,
  },
];

function buildDemoPayments(): LoggedPayment[] {
  const start = demoSnapshots[0].date;
  const end = demoSnapshots[demoSnapshots.length - 1].date;
  const { lineItems } = reconcile(demoSnapshots, demoContracts, [], start, end);

  return lineItems.map((item, i) => {
    const isLast = i === lineItems.length - 1;
    const lagDays = demoContracts[demoContracts.length - 1].payoutLagDays;
    const paidOn = new Date(item.periodEnd);
    paidOn.setUTCDate(paidOn.getUTCDate() + lagDays);
    // Final period is deliberately short, so the dashboard shows a real gap.
    const amount = isLast ? item.expectedPayout * 0.82 : item.expectedPayout;
    return {
      date: toISODate(paidOn),
      amount: Math.round(amount * 100) / 100,
      note: `${item.periodStart} → ${item.periodEnd} payout${isLast ? " (short)" : ""}`,
    };
  });
}

export const demoPayments: LoggedPayment[] = buildDemoPayments();

export const demoPeriod = {
  start: demoSnapshots[0].date,
  end: demoSnapshots[demoSnapshots.length - 1].date,
};
