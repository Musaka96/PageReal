export type Snapshot = {
  date: string; // ISO date, cumulative balances as of this date
  subscriptions: number;
  tips: number;
  ppv: number;
  customs: number;
};

export type ContractVersion = {
  effectiveFrom: string; // ISO date, inclusive
  effectiveTo: string | null; // ISO date, exclusive, null = open-ended
  commissionPct: number; // 0-1
  flatDeduction: number; // per-period flat deduction, e.g. software fee
  payoutLagDays: number;
};

export type LoggedPayment = {
  date: string; // ISO date the creator actually received the money
  amount: number;
  note?: string;
};

export type ReconciliationLineItem = {
  periodStart: string;
  periodEnd: string;
  grossEarned: number;
  deductions: number;
  expectedPayout: number;
  actualReceived: number;
  delta: number; // expected - actual. positive = underpaid
};

export type ReconciliationResult = {
  periodStart: string;
  periodEnd: string;
  grossEarned: number;
  deductions: number;
  expectedPayout: number;
  actualReceived: number;
  delta: number;
  lineItems: ReconciliationLineItem[];
};
