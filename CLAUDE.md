# ClearLedger — Creator Trust Platform

## What this is
A read-only, creator-controlled audit tool for OnlyFans/Fansly creators. It independently verifies earnings, audits chatter activity, and records boundary consent — WITHOUT depending on any agency CRM. Core principle: **independence and verifiability**. The creator is always the customer; agencies never pay and are never the user.

## Current goal: MVP
The immediate goal is shipping the MVP (Earnings Mirror + Reconciliation — see `PROJECT_GUIDE.md` Part 2). Every feature must support **demo mode**: seeded fake creator accounts with realistic synthetic data so the product can be showcased without a real OnlyFans/Fansly session. Demo mode is a data source switch, not a separate code path — the same UI, API, and reconciliation logic must work identically against a real linked account or a demo/seed account. Never hardcode demo-only behavior into components or routes; gate it by account/data source instead.

## Monorepo map
- `apps/web` — Next.js (App Router) responsive web app. Mobile-first; must work at 380px width. PWA.
- `apps/worker` — long-running scraper + audit jobs (BullMQ on Redis). Persistent proxy IP per creator.
- `packages/db` — Prisma schema + client (shared).
- `packages/core` — reconciliation engine (pure functions) + hash-chain logic + shared types.
- `packages/analysis` — client to the Python style-drift sidecar.
- `services/style-analysis` — Python FastAPI, scikit-learn TF-IDF/cosine. No LLM in v1.

## How to work here
- Package manager is **pnpm** (not npm).
- Typecheck: `pnpm typecheck`. Test: `pnpm test`. Lint: `pnpm lint`. Dev: `pnpm dev`.
- Migrations: Prisma Migrate. Separate DB per environment (dev/preview/prod).
- Prefer running single tests over the whole suite while iterating.

## Detailed specs — read the relevant file before working on that area
- `agent_docs/architecture.md` — system design.
- `agent_docs/data_model.md` — schema + immutability rules.
- `agent_docs/demo_mode_spec.md` — how demo/seed accounts work and how they stay on the same code path as real accounts.
- `agent_docs/reconciliation_spec.md` — exact money formulas + edge cases.
- `agent_docs/scraper_spec.md` — endpoints, polling cadence, jitter, proxy rules.
- `agent_docs/style_analysis_spec.md` — drift features + thresholds.
- `agent_docs/security_requirements.md` — encryption, 2FA, audit logging.
- `agent_docs/payment_tiers.md` — Stripe tiers + gating.

## Hard rules
- IMPORTANT: NEVER commit secrets. All credentials come from env / secret manager.
- IMPORTANT: The `audit_chain` table is append-only. NEVER generate UPDATE or DELETE against it; a DB trigger enforces this.
- IMPORTANT: NEVER store fan PII beyond audit necessity. Message *content* storage is opt-in only; default to metadata (timestamp, length, latency).
- YOU MUST write and run unit tests for ANY function that computes money. Show the passing tests and a worked example before considering it done.
- NEVER add fan-messaging or revenue-optimization features — that turns us into a CRM. We are the auditor, not the operator.
