# Demo mode spec

## Purpose
Let the MVP be shown to prospective creators (and used for screenshots, sales calls, investor demos) without any real OnlyFans/Fansly account, while proving the exact code path a real creator will use. A demo that runs through different logic than production is worthless as a proof — so demo mode is strictly a data-source choice, never a UI or logic fork.

## What "demo mode" means concretely
- A `linked_accounts` row with `source = 'demo'`.
- A creator (or prospect) can sign up and choose "Try a demo account" instead of "Connect my account." This creates a `users` row + a demo `linked_accounts` row, pre-populated with a seed scenario.
- The dashboard, reconciliation view, audit log, and export all render from this row exactly as they would for a live account.

## Seeding
- A seed job (script in `apps/worker` or a one-off CLI in `packages/core`) generates `snapshots` rows covering a plausible history (e.g., 90 days) for a demo account: subscriptions, tips, PPV unlocks, customs, pending balance, with realistic day-to-day variance — not flat/fake-looking numbers.
- At least one seed scenario should include a deliberate reconciliation **gap** (expected vs. paid mismatch) so the dashboard's core value prop — finding a shortfall — is visible in the demo without the creator having to manufacture one.
- Seed data also populates `contracts` (a representative commission/deduction setup) and a few `payments_logged` rows (some matching, at least one short) so the reconciliation delta renders immediately.
- Demo `messages_meta` and `style_baseline` (Phase 2) and `boundary_docs` (Phase 3) use the same seeding approach once those features are built — synthetic data only, never real fan data repurposed as a demo.
- Demo `audit_chain` entries are real hash-chain rows (not faked) — this proves the immutability mechanism works, it's just chained over synthetic snapshots.

## Constraints
- IMPORTANT: Demo seed data must never be derived from or resemble any real creator's or real fan's actual data.
- Demo accounts must be visibly labeled in the UI (e.g. a "Demo Mode" badge in the header/nav) at all times — never let a screenshot or export be mistaken for a real creator's numbers without that label.
- A demo account must be resettable (re-run the seed job to regenerate a fresh history) without needing a new user signup — useful for repeated sales demos.
- Demo accounts are excluded from billing — no Stripe customer/subscription is created for `source = 'demo'` accounts (or they're hard-pinned to the Free tier with no card requirement).
- The worker's real scraper code must never run against a `source = 'demo'` account, and the seed job must never run against a `source = 'live'` account — this is the one place a `source` check belongs (at the job-dispatch boundary), not inside reconciliation/dashboard/export code.

## Build order note
Build demo mode alongside the MVP, not after — see `CLAUDE.md` "Current goal: MVP". The seed job should be one of the first things written once the data model and reconciliation engine exist, because it's also how you'll write reconciliation unit tests (synthetic snapshots are test fixtures too).
