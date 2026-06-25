# Payment tiers

## Principles
Flat subscription, paid by the creator only — never a revenue cut, never paid by an agency. The pricing model itself is a trust signal. Use Stripe (Billing + Customer Portal) for cards, tax, dunning, and self-serve cancel.

## Tiers
| Tier | Price | What's included | Who it's for |
|---|---|---|---|
| **Free** | $0 | Earnings mirror (current period only), manual payment log, basic reconciliation, 7-day history. | Curious creators, trust-building, top-of-funnel. |
| **Audit** | $19/mo | Full earnings history, full reconciliation, hash-chain audit log + PDF/JSON export, anomaly email alerts. | The core paying creator — the MVP monetization. |
| **Audit+** | $39/mo | Everything in Audit + Activity Audit (heatmaps, latency, style-drift) + Consent Ledger + push alerts. | Creators actively in dispute or actively managed by an agency. |
| **Multi** | $29/mo per extra platform, or $59/mo flat | Multi-platform unified view + everything in Audit+. | Diversified creators across platforms. |

- Annual billing at ~2 months free (e.g. Audit $190/yr).
- Free → Audit is the key conversion. Free tier is genuinely useful but caps *history* and *export* — the two things a creator in a dispute needs most, which is the natural upgrade trigger.
- No agency/team plan, ever. Agency visibility only happens via a creator-initiated read-only consent link share (Phase 3).

## Demo accounts and billing
- IMPORTANT: demo accounts (`linked_accounts.source = 'demo'`) never create a Stripe customer or subscription. Either gate them entirely outside the billing system, or hard-pin them to Free-tier feature access with no card requirement and no Stripe API calls at all.
- Tier-gating logic (whatever feature-flag/entitlement check decides what a user can see) must treat "demo account" as orthogonal to tier — a demo account should be able to showcase Audit+/Multi features for sales-demo purposes without an actual paid subscription existing. Implement this as a separate "demo accounts get full feature access for free" rule, not by faking a fake paid subscription record in Stripe-shaped tables.

## Payment-provider risk
- Frame the business accurately to Stripe and any processor as financial record-keeping / audit SaaS — not adult content, not payment processing for content. Have a backup high-risk-friendly processor researched before launch in case of account review issues.
