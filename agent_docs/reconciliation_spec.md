# Reconciliation spec

## Purpose
This is the heart of the product: "Account earned $X → you should receive $Y → you were paid $Z → difference $W." Every number here can end up in a dispute or legal proceeding, so correctness and testability matter more than anywhere else in the codebase.

## Inputs
- `snapshots` — periodic raw earnings data per account (subscriptions, tips, PPV unlocks, customs, pending balance). Same shape whether `source` is `'live'` or `'demo'`.
- `contracts` — commission %, deductions config, payout schedule, contract start date. A creator may have multiple contract versions over time (e.g. a renegotiated rate) — each with an effective date range.
- `payments_logged` — creator-reported actual payouts received (date, amount, optional note/reference).

## Core formula (v1)
For a given period `[start, end]`:
1. **Gross earned** = sum of all `snapshots` line items (subscriptions + tips + PPV + customs) attributable to that period, taken from the snapshot closest to/at period end minus the snapshot at period start (delta, not absolute, since OnlyFans balances are cumulative).
2. **Legitimate deductions** = gross earned × commission % (per the contract version effective during that period) + any flat/itemized deductions defined in `contracts` for that period.
3. **Expected payout (Y)** = Gross earned − Legitimate deductions.
4. **Actual received (Z)** = sum of `payments_logged` amounts dated within the period (or attributable to it — see "Payment timing" below).
5. **Delta (W)** = Expected payout (Y) − Actual received (Z). Positive W = creator was underpaid; negative W = creator was overpaid (rare, but must be representable, not clamped to zero).

## Mid-period contract changes
- If a contract's commission % or deduction config changes mid-period, split the period at the change's effective date and apply each contract version to its own sub-range, then sum the sub-range results. Never apply a single blended rate across a period that had two different contract terms in effect.
- This rule must be encoded in the pure function, not handled ad hoc in the UI layer.

## Payment timing
- Payouts are typically delayed relative to when earnings occur (e.g., a payout schedule of "earnings from period N are paid in period N+1"). The reconciliation engine must accept a `payoutLagDays` (or `payoutSchedule`) parameter from `contracts` and attribute a logged payment to the earning period it pays out, not the calendar period it was logged in.
- Until the creator logs a payment for a given period, that period's `Z` is `0` and the delta is fully outstanding — this is intentional; an unpaid gap should be visible, not hidden as "pending."

## Refunds and chargebacks (placeholder — needs your input)
- v1 treats a refund/chargeback as a negative line item in the snapshot delta for the period it occurred in (reduces gross earned for that period, not retroactively restated into the period the original sale occurred).
- IMPORTANT: this is a placeholder rule. The exact handling of chargebacks, refunds, and disputed transactions is a business/legal decision per `PROJECT_GUIDE.md` Part 6.6 ("decisions Claude shouldn't make for you") — confirm before relying on this in a real dispute export.

## Function shape
- `packages/core` reconciliation functions must be pure: `(snapshots, contracts, paymentsLogged, periodRange) => ReconciliationResult`. No I/O, no DB calls, no `Date.now()` inside the function — pass "now" in if needed, for testability.
- `ReconciliationResult` should include the four headline numbers (gross, deductions, expected, received) plus `delta`, plus enough line-item detail to render a breakdown, not just the totals — disputes need the "why," not just the number.

## Testing requirement
- YOU MUST write unit tests for every reconciliation function, covering: a clean matching period, an underpay gap, an overpay (should not be clamped), a mid-period contract change, a period with zero logged payments, and at least one refund/chargeback case.
- Use the demo seed scenarios from `demo_mode_spec.md` as one of your test fixture sources — they're already designed to include a deliberate gap.
- Show passing tests and a worked example (concrete numbers in, concrete `ReconciliationResult` out) before considering any reconciliation function done.
