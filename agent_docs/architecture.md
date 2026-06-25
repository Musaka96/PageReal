# Architecture

## Monorepo layout
```
clearledger/
├── apps/
│   ├── web/                  Next.js (App Router) — responsive web app, mobile-first
│   └── worker/                Scraper + audit workers (Node/TS)
├── packages/
│   ├── db/                   Prisma schema + client (shared)
│   ├── core/                  reconciliation engine, hash-chain, shared types
│   └── analysis/               style-drift service client (calls Python sidecar)
├── services/
│   └── style-analysis/       Python FastAPI sidecar (scikit-learn TF-IDF/cosine)
```

## Component breakdown
- **Frontend** — Next.js + React, Tailwind. Mobile-first; every screen must work at 380px width. PWA-capable. Design language: bank app / document vault, not a CRM.
- **Backend API** — Next.js Route Handlers (or tRPC). Auth: email + password + mandatory TOTP 2FA. Sessions via secure httpOnly cookies.
- **Scraper / session worker** — one persistent session per creator on a dedicated proxy IP. Polling with jitter: earnings every 15–30 min, message metadata every ~5 min (±30–60s offset). Job scheduling via BullMQ on Redis.
- **Reconciliation engine** (`packages/core`) — pure functions: snapshots + contract terms + logged payments → expected vs received deltas. Pure functions are unit-tested exhaustively (see `reconciliation_spec.md`).
- **Hash-chain audit log** — append-only Postgres table, `hash = sha256(timestamp + data_json + prev_hash)`. DB trigger blocks UPDATE/DELETE.
- **Style-analysis sidecar** — Python FastAPI, scikit-learn TF-IDF + cosine similarity. No LLM in v1.

## Data sources: real vs. demo
The platform has exactly one data path through the reconciliation engine, dashboard, and export — it must not know or care whether the underlying account is real or demo. This is enforced at the boundary, not scattered through business logic.

- Every `linked_accounts` row has a `source` field: `"live"` or `"demo"`.
- For `source = "live"`, the worker's scraper writes real `snapshots` rows from the actual OnlyFans/Fansly session.
- For `source = "demo"`, a **seed job** (not the scraper) writes synthetic `snapshots` rows on the same schema, with the same cadence semantics (it can run instantly/backfilled rather than waiting on real polling intervals).
- The reconciliation engine, dashboard queries, exports, and audit-chain writes all read/write through the same tables and pure functions regardless of `source`. No `if (isDemo)` branching inside `packages/core` or in dashboard components.
- Demo accounts are clearly labeled in the UI (e.g., a persistent "Demo Mode" badge) so nobody mistakes synthetic numbers for real ones — but the underlying code path is identical.
- See `data_model.md` for the `source` field and seeding rules, and `demo_mode_spec.md` for how a demo account is generated and reset.

## Hosting (MVP)
- Web: Vercel. DB: Neon/Supabase Postgres. Redis: Upstash. Workers: small always-on VM (Fly.io/Railway) — not serverless, needs persistent IP. Style sidecar: same VM platform.
