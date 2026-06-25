# Creator Trust Platform — Build Guide

A neutral, creator-side transparency layer for OnlyFans/Fansly models. It independently verifies earnings, audits chatter activity, and records content-boundary consent — without depending on the agency's CRM. This document is the master plan: architecture, feature set, payment tiers, deployment, and a practical guide to building it with Claude Code.

> **Working name used throughout:** `ClearLedger` (swap for your real brand). The product's whole value proposition is independence and verifiability, so the brand should signal "audit / record / proof," not "fan management."

---

## Part 1 — Product definition

### The one-sentence pitch
A read-only financial-and-activity audit tool that a creator controls, giving them tamper-evident proof of what their own account earned and how it was operated — so they can never again be told "the account isn't making money" without evidence.

### Who it's for (and who it is NOT for)
- **For:** individual creators, especially those signed to management agencies, who cannot independently see their own numbers.
- **Not for:** agencies. The product is structurally adversarial to the agency CRM. Agencies are never the customer and never pay. This is a deliberate trust signal.

### Why it can exist technically
OnlyFans allows multiple concurrent sessions per account. The creator authenticates to ClearLedger with their *own* credentials/session, and ClearLedger reads the same ground-truth data OnlyFans' own backend exposes — entirely separate from the agency's session. It's the same scraping approach the CRMs use, pointed at different data and owned by a different party.

### The three pillars (everything maps to one of these)
1. **Earnings mirror** — what the account actually earned, independent of agency reporting.
2. **Activity audit** — message volume, timing, and writing-style drift, to surface chatter behaviour.
3. **Consent ledger** — versioned, hashed boundary documents proving what the creator agreed to and when.

---

## Part 2 — Feature set

### MVP (build this first — it must be shippable alone)
The MVP is the **Earnings Mirror + Reconciliation**. Nothing else. If this works and creators trust it, everything else follows.

- Secure creator onboarding & session capture (creator connects their own account).
- Independent periodic scrape of earnings data: subscriptions, tips, PPV unlocks, customs, pending balance.
- Earnings dashboard: this period / trailing 90 days / since-contract-start.
- Contract terms entry: commission %, legitimate deductions, payout schedule.
- **Reconciliation view:** "Account earned $X → you should receive $Y → you were paid $Z → difference $W." The delta is the entire point.
- Manual payment logging (creator records what they actually received).
- Tamper-evident audit log (hash-chained snapshots) running underneath from day one.
- One-tap export: PDF + signed JSON, for use in disputes.

### Phase 2 — Activity Audit
- Raw message-stream metadata capture (timestamp, length, response latency — NOT full message content storage unless creator opts in).
- Activity heatmap: volume by hour/day.
- Response-latency analysis (human variance vs bot-like consistency).
- Writing-style baseline: creator records reference samples at onboarding.
- Style-drift score: TF-IDF + cosine similarity vs baseline, flagged per period.
- "Off-hours activity" flags (messages sent when creator marked themselves unavailable).

### Phase 3 — Consent Ledger
- Structured boundary document editor (content allowed/disallowed, vault media categories, approved persona facts, hard limits).
- Full version history, each version hashed + timestamped.
- Exportable consent record for legal/dispute use.
- Optional: shareable read-only consent link the creator can give the agency (so the agreed scope is on record for both sides).

### Phase 4 — Trust & network features
- Multi-platform support (Fansly, Fanvue, MYM) — unified earnings across platforms.
- Anomaly alerts (sudden earnings drop, payout shortfall, style-drift spike) via email/push.
- Public ledger anchoring (periodically checkpoint the hash-chain head to a public anchor so neither party can deny history).
- Community-sourced agency reputation signals (carefully — legal review required).

### Explicitly OUT of scope (say no to these)
- No fan messaging / sending features (that makes you a CRM and an agency tool).
- No revenue optimization advice (that's the agency's job; you're the auditor).
- No storing of fan PII beyond what's strictly needed for the audit.
- Never sell or share creator data. This is the product's core promise.

---

## Part 3 — Technical architecture

### Stack (chosen for Claude Code productivity + a solo/small builder)
A **TypeScript monorepo** is the recommendation. Monorepos give Claude Code full context in one place (schema, API, frontend all readable), which materially improves output quality.

```
clearledger/                  (monorepo root, pnpm workspaces or Turborepo)
├── apps/
│   ├── web/                  Next.js (App Router) — responsive web app, mobile-first
│   └── worker/               Scraper + audit workers (Node/TS, or a Go service — see note)
├── packages/
│   ├── db/                   Prisma schema + client (shared)
│   ├── core/                 reconciliation engine, hash-chain, shared types
│   └── analysis/             style-drift service client (calls Python sidecar)
├── services/
│   └── style-analysis/       Python FastAPI sidecar (scikit-learn TF-IDF/cosine)
├── CLAUDE.md                 root context (lean)
├── agent_docs/               detailed specs Claude reads on demand
└── .claude/                  rules, skills, commands
```

**Note on the worker language:** Start in TypeScript for everything (one language = less context-switching for Claude and you). Only move the scraper to Go if you hit real concurrency limits at scale (thousands of concurrent sessions). Don't pre-optimize.

### Component breakdown

**Frontend — Next.js + React, responsive (NOT a separate mobile app)**
- App Router, server components where sensible.
- Tailwind CSS for styling. Mobile-first responsive design — creators are phone-native; the web app must be fully usable on a phone browser. Test every screen at 380px width.
- Consider making it a **PWA** (installable, push notifications, home-screen icon) — gives you 90% of "an app" without app-store friction or Apple/Google adult-content policy risk. This is a real advantage for your category.
- Design language: financial/legal tool, not a CRM. Think bank app or document vault. This is deliberate trust signalling.

**Backend API**
- Next.js Route Handlers (or tRPC for end-to-end TS types) for the app API.
- Auth: email + strong password + mandatory 2FA (TOTP). Sessions via secure httpOnly cookies.

**Scraper / session worker**
- One persistent OnlyFans session per creator, on a dedicated residential proxy IP per account.
- Polling with jitter: earnings every 15–30 min; message metadata every ~5 min (±30–60s random offset). Fixed intervals are detectable.
- Realistic user-agent; human-like pacing. Never hammer endpoints.
- Job scheduling: BullMQ on Redis (one repeatable job per creator).

**Reconciliation engine** (`packages/core`)
- Pure functions: given snapshots + contract terms + logged payments → computes expected vs received deltas. Pure = trivially unit-testable, which matters enormously (see verification below).

**Hash-chain audit log**
- Append-only Postgres table. Each row: `{timestamp, data_json, prev_hash, hash}` where `hash = sha256(timestamp + data_json + prev_hash)`.
- DB trigger blocks UPDATE/DELETE on this table — software-level immutability.
- Phase 4: checkpoint the head hash to a public anchor (e.g., a cheap chain or even a public timestamping service) for external non-repudiation.

**Style-analysis sidecar** (`services/style-analysis`)
- Python + FastAPI. scikit-learn TF-IDF vectorizer + cosine similarity. Features: term vectors, avg sentence length, punctuation density, emoji frequency, question ratio, response-length distribution.
- No LLM needed for v1. A small classifier (DistilBERT-scale) is a later upgrade, not a starting point.

### Data model (core tables)
```
users            (creator account, auth, 2FA secret)
linked_accounts  (platform, session/proxy ref, status)  — secrets in a vault, not raw in DB
contracts        (commission %, deductions config, payout schedule, start date)
snapshots        (raw earnings/subscriber data per scrape cycle, per account)
audit_chain      (append-only hash-chained records)   — UPDATE/DELETE blocked
messages_meta    (timestamp, length, latency; content only if opted in)
style_baseline   (reference samples + computed feature vector)
boundary_docs    (versioned consent docs, each hashed)
payments_logged  (creator-reported payouts for reconciliation)
subscriptions    (the creator's ClearLedger plan/tier + Stripe refs)
```

### Security & secrets (non-negotiable, this is an adult-finance product)
- Encrypt session tokens / credentials at rest (use a secrets manager or libsodium sealed boxes; never plaintext in DB).
- Field-level encryption for anything sensitive.
- Full audit logging of every access to a creator's data.
- 2FA mandatory. Rate-limit auth aggressively.
- Strict CSP, no third-party trackers (privacy is the product).

---

## Part 4 — Payment strategy & tiers

**Principles:** flat subscription, paid by the creator only, never a revenue cut, never paid by an agency. The pricing itself signals independence. Use **Stripe** (Billing + Customer Portal); it handles cards, tax, dunning, and self-serve cancel.

| Tier | Price | What's included | Who it's for |
|---|---|---|---|
| **Free** | $0 | Earnings mirror (current period only), manual payment log, basic reconciliation, 7-day history. | Curious creators, trust-building, top-of-funnel. |
| **Audit** | **$19/mo** | Full earnings history, full reconciliation, hash-chain audit log + PDF/JSON export, anomaly email alerts. | The core paying creator — the MVP monetization. |
| **Audit+** | **$39/mo** | Everything in Audit + Activity Audit (heatmaps, latency, style-drift) + Consent Ledger + push alerts. | Creators actively in dispute or actively managed by an agency. |
| **Multi** | **$29/mo per extra platform** add-on, OR **$59/mo** flat | Multi-platform unified view (Fansly/Fanvue/MYM) + everything in Audit+. | Diversified creators across platforms. |

Supporting choices:
- **Annual billing** at ~2 months free (e.g., Audit $190/yr). Improves cash flow and retention.
- **Free → Audit** is the key conversion. Make the free tier genuinely useful but cap *history* and *export* — the two things someone in a dispute desperately needs.
- **No agency/team plan, ever.** If agencies want visibility, that's the creator's choice to share a read-only consent link.
- Accept cards via Stripe; consider crypto (USDT/USDC) later for creators with banking friction — but launch on Stripe only to keep compliance simple.
- **Payment-provider risk:** adult-adjacent businesses get scrutiny. You are a SaaS audit tool, NOT processing adult content or payments for content — frame it accurately to Stripe as financial record-keeping software. Have a backup processor researched (e.g., a high-risk-friendly provider) before you need it.

---

## Part 5 — Deployment strategy

### Phase 0 → MVP hosting (cheap, fast, scales later)
- **Web app:** Vercel (Next.js native; preview deploys per branch; great DX with Claude Code).
- **Database:** managed Postgres — Neon or Supabase (Supabase also gives you auth primitives + storage if you want them).
- **Redis (queues):** Upstash (serverless Redis, pairs well with Vercel).
- **Workers / scrapers:** these are long-running and need persistent IPs, so they DON'T belong on serverless. Put them on a small always-on VM — Fly.io, Railway, or a Hetzner/DigitalOcean box. This is also where proxy egress lives.
- **Proxies:** residential proxy provider (Bright Data, Oxylabs, SmartProxy), one sticky IP per creator account.
- **Style sidecar:** small container on the same VM platform (Fly.io / Railway).
- **Secrets:** Doppler or the host's secret manager. Never commit secrets (enforce with a hook — see Part 6).

### Environments
- `dev` (local), `preview` (per-PR on Vercel), `production`. Separate databases per environment.

### CI/CD
- GitHub Actions: on PR → typecheck, lint, run unit tests (especially the reconciliation engine), build. Block merge on failure.
- Migrations via Prisma Migrate, run on deploy.

### Scaling path (don't build this until you need it)
- Workers: one process handles many creators initially. When concurrency hurts, shard creators across worker instances; this is when a Go scraper service may earn its place.
- Move hot time-series reads to a Postgres hypertable (TimescaleDB) if reconciliation queries slow down.

### Compliance / legal (do this in parallel, not after)
- ToS + Privacy Policy written by someone who understands data-processing law (GDPR — you have EU creators; the legal framing is "the creator accesses their own account data in read-only mode for personal financial record-keeping").
- Data Processing Agreement, clear data-deletion flow, data export (GDPR right to portability — which you're literally built to provide).
- Get the "accessing your own data" framing reviewed by a lawyer before launch. This is your shield against both OnlyFans ToS claims and agency pushback.

---

## Part 6 — How to build this with Claude Code (the practical playbook)

This is the part you do hands-on. Claude Code is a CLI agent that reads your repo, plans, edits files, runs commands, and verifies its own work. Your domain expertise is the bottleneck, not the tool — so your job is to **scope, provide context, and verify**.

### 6.1 Setup
1. Install Node.js (LTS) and pnpm. Install Claude Code: `npm install -g @anthropic-ai/claude-code` (check the npm package page for the current command).
2. Create the empty monorepo folder, `cd` into it, run `claude`.
3. Run `/init` — it scans the project and generates a starter `CLAUDE.md`. (On an empty repo, you'll build this up as you go.)
4. Initialize git immediately. Claude Code works best with frequent commits and the ability to `/rewind`.

### 6.2 Write a LEAN CLAUDE.md
The single biggest mistake is an over-stuffed CLAUDE.md — if it's too long, Claude ignores half of it. Rule of thumb: keep it under ~150–200 lines. For each line ask "would removing this cause a mistake?" If not, cut it.

What belongs in CLAUDE.md:
- **WHAT:** the stack and a map of the monorepo (what each app/package/service is for).
- **WHY:** one paragraph on the product's purpose and the independence principle.
- **HOW:** how to run, test, typecheck; that you use pnpm not npm; the verification commands.
- A short list of hard rules (`IMPORTANT:` / `YOU MUST:` for the few that really matter — e.g., "NEVER commit secrets," "the audit_chain table is append-only — never write UPDATE/DELETE against it").
- Pointers (not contents) to `agent_docs/*.md` for detailed specs.

What does NOT belong: code-style rules (use a linter/formatter + a Stop hook instead — never send an LLM to do a linter's job), long code snippets (they go stale), anything Claude already does right.

### 6.3 Use agent_docs/ for the detailed specs
Put the heavy detail in separate, self-describing files Claude reads on demand:
```
agent_docs/
├── architecture.md           (Part 3 of this guide, expanded)
├── data_model.md             (full schema + the immutability rules)
├── reconciliation_spec.md    (exact formulas + edge cases — see below)
├── scraper_spec.md           (endpoints, polling cadence, jitter, proxy rules)
├── style_analysis_spec.md    (features, thresholds)
├── security_requirements.md  (encryption, 2FA, audit logging)
└── payment_tiers.md          (Part 4)
```
In CLAUDE.md, list these with one-line descriptions and tell Claude to read the relevant one before working on that area. This keeps every session's context lean.

### 6.4 The workflow that actually works
- **Plan before code.** Use Claude Code's plan mode for any non-trivial feature. Ask it to produce a written plan; review it; then let it implement. "Vibe coding" is fine for throwaway spikes, ruinous for a product handling money and legal evidence.
- **One feature per session.** Scope each `claude` session to a single feature (e.g., "the reconciliation engine"). When done, `/clear` and start fresh. Context degradation is the #1 failure mode.
- **Branch per feature.** Never work on `main`. The moment Claude goes down a bad path, use `/rewind` instead of trying to fix the mess.
- **Always verify.** This is critical for *this* product: a plausible-looking reconciliation that's subtly wrong is worse than useless in a dispute. For every money-touching function, have Claude write unit tests first (or alongside) and run them. If you can't verify it, don't ship it. Tell Claude: "prove this works — show me the passing tests and a worked example."
- **Use a Stop hook** to auto-run your formatter/linter (and ideally `tsc`) at the end of each turn, so Claude fixes its own lint/type errors before you ever see them.
- **Commit often, small commits.** Easier to review and revert.

### 6.5 Suggested build order (each is roughly one focused session or a few)
1. Monorepo scaffold + Prisma schema + `/init` + lean CLAUDE.md.
2. Auth (email + password + TOTP 2FA).
3. The hash-chain audit log + the append-only DB trigger + its tests. (Build the trust primitive early.)
4. Reconciliation engine in `packages/core` — pure functions + exhaustive unit tests. **This is the heart; spend real time here.**
5. Scraper worker against earnings endpoints (write it defensively — endpoints change).
6. Earnings dashboard + reconciliation UI (mobile-first, test at 380px).
7. Stripe billing + tier gating (free vs Audit).
8. Export (PDF + signed JSON).
9. **Ship the MVP. Get real creators on it.** Then Phase 2/3.

### 6.6 Things only YOU can provide (Claude Code can't do these for you)
- **An OnlyFans test account + the reverse-engineered endpoint knowledge.** Claude can write the scraper, but you must supply how the data is actually fetched (capture it from your own browser's network tab on a real account). This is the single hardest external dependency.
- **Residential proxy provider account** + credentials.
- **Stripe account** + product/price IDs.
- **Hosting accounts:** Vercel, Neon/Supabase, Upstash, Fly.io/Railway.
- **The legal review** of the "own-data" framing, ToS, and privacy policy.
- **Domain + brand.**
- **Decisions Claude shouldn't make for you:** exact reconciliation rules for edge cases (chargebacks, refunds, mid-period contract changes), which deductions count as legitimate, data-retention periods. Write these into `reconciliation_spec.md` yourself.
- **Verification judgement:** you decide what "correct" means for the numbers. Test against your real account's known figures.

### 6.7 Use subagents & skills for repeat work
- Create a **skill** for anything repetitive (e.g., "add a new scraper endpoint following our defensive pattern," "add a new Stripe-gated feature"). Skills load on demand and keep CLAUDE.md lean.
- Use **subagents** to scope investigations so exploration doesn't eat your main context ("investigate how X library handles Y" → subagent).
- Consider the community **frontend-design** skill/plugin for UI polish.

### 6.8 Guardrails specific to this project (put these in CLAUDE.md or a rule)
- `IMPORTANT: never store fan PII beyond audit necessity; message content is opt-in only.`
- `IMPORTANT: audit_chain is append-only. Never generate UPDATE or DELETE against it.`
- `IMPORTANT: never commit secrets; all credentials come from env/secret manager.`
- `YOU MUST write and run unit tests for any function that computes money.`

---

## Part 7 — Marketing strategy

The distribution insight: **you do not go through agencies.** You go directly to creators, through the communities where burned creators already gather and talk.

### Positioning
"Know your own numbers." A creator-rights / financial-transparency tool. Never frame it as anti-agency in marketing copy (legal risk + alienates good agencies); frame it as **pro-creator-control**. The tagline does the work: independence, proof, your own data.

### Channels (in priority order)
1. **Creator communities & word of mouth.** Reddit (creator/advice subs), creator Twitter/X, Telegram groups, Discord. One credible recovery story ("I found a $40K payout gap and got it resolved") spreads faster than any ad. Seed these honestly — be a useful community member, not a spammer.
2. **Content / SEO.** Publish genuinely useful guides: "How to read your OnlyFans statement," "Agency contract red flags," "What your CRM isn't showing you." These rank, build trust, and pull in exactly your audience. (The discourse research you already have is raw material.)
3. **Creator-rights & legal angle.** The Hagens Berman class action, Ofcom fines, EU platform regulation, FTC AI-disclosure rules — all create a narrative hook. Partner with or get cited by creator-advocacy voices and the lawyers already working these cases.
4. **Affiliate / referral.** Creators refer creators; a referral discount (not a revenue cut) fits the brand.
5. **Comparison/listing presence.** Get listed in the OFM tool directories — but always as the *creator-side* tool, the category none of the CRMs occupy.

### Trust-building (the entire funnel is trust)
- Be radically transparent: public privacy policy, a clear "we never sell your data / agencies never pay us" statement on the homepage.
- Free tier that genuinely helps proves the product before asking for money.
- Show the export/proof artifact in marketing — the signed PDF is the "wow."
- Testimonials from real creators (anonymized) about disputes resolved.

### Launch sequence
1. Build MVP, onboard 10–20 creators you can talk to directly. Fix what breaks. Collect proof stories.
2. Soft-launch in 1–2 communities where you're already trusted.
3. Publish the cornerstone SEO guides.
4. Lean into any news cycle about agency disputes / platform regulation — that's when demand spikes.

### Metrics to watch
- Free → Audit conversion rate (the core funnel).
- Time-to-first-reconciliation (activation).
- Retention of Audit+ (dispute users may churn after resolving — that's OK; design for it with annual plans and "keep monitoring" messaging).
- Referral coefficient.

---

## Part 8 — Risk register (know these going in)
- **OnlyFans ToS / detection.** Same scraping risk as CRMs. Mitigate with realistic session behaviour, the "own-data" legal framing, and a long-term ambition to pressure OnlyFans toward a native verified-earnings endpoint.
- **Agency pushback.** Contracts may try to ban third-party tools. Your defense: the creator accesses their own account, read-only — no different from logging in themselves. Get this lawyer-reviewed.
- **Payment processor risk.** Adult-adjacent. Frame accurately as audit SaaS; have a backup processor researched.
- **Endpoint fragility.** OnlyFans changes its internal API; the scraper will break periodically. Build defensively, monitor, and budget ongoing maintenance time.
- **Maintenance burden is the moat.** The funded CRMs survive because they keep up with OnlyFans changes. You'll need to too — but you only track a narrower slice of endpoints (earnings/messages/subs), which is more tractable for a solo builder.

---

### TL;DR for your first week with Claude Code
1. Scaffold the TS monorepo, `git init`, `claude`, `/init`, write a lean CLAUDE.md + `agent_docs/`.
2. Build, in order: hash-chain audit log → reconciliation engine (with tests) → auth → earnings scraper → dashboard → Stripe.
3. One feature per session, plan before code, branch per feature, verify everything that touches money.
4. You provide: OnlyFans endpoint knowledge, proxies, Stripe, hosting, legal review, and the reconciliation edge-case rules.
5. Ship the free + $19 Audit MVP to 10–20 real creators before building Phase 2.
