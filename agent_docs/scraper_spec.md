# Scraper spec

## Purpose
The worker maintains one persistent, creator-owned session per linked account and periodically pulls earnings and message-metadata, independent of any agency session on the same account.

## Scope (v1)
- Earnings: subscriptions, tips, PPV unlocks, customs, pending balance.
- Message metadata only (Phase 2): timestamp, length, response latency. Never message content unless the creator has explicitly opted in (see `data_model.md` PII rules).

## Session & proxy rules
- One persistent OnlyFans/Fansly session per creator account, authenticated with the creator's own credentials — never the agency's.
- One dedicated residential proxy IP per linked account, sticky for the life of the session. Never share a proxy IP across creators.
- Realistic user-agent matching a real browser/OS combination; keep it stable per session rather than rotating per request.
- Session tokens/credentials are encrypted at rest per `security_requirements.md` — never written to logs or the DB in plaintext.

## Polling cadence
- Earnings: every 15–30 minutes, randomized within that window per cycle (not a fixed interval).
- Message metadata: every ~5 minutes, ±30–60 seconds random jitter.
- IMPORTANT: never poll on a fixed, predictable interval — that's a detection signature. Jitter is not optional.
- Back off (exponential, capped) on errors or rate-limit signals from the platform; never retry-hammer an endpoint.

## Defensive coding requirements
- Endpoints are reverse-engineered and will change without notice. Every scraper call must:
  - Validate the response shape before writing to `snapshots`; on shape mismatch, log and skip the write rather than writing malformed data.
  - Fail a single creator's poll cycle in isolation — one creator's broken session/endpoint must never crash the worker process or block other creators' jobs.
  - Surface failures (e.g., session expired, endpoint shape changed) to a monitoring/alerting path so they get fixed promptly, not silently.
- Job scheduling: one repeatable BullMQ job per creator per data type (earnings, messages), not one big batch job for all creators.

## Demo accounts
- IMPORTANT: the real scraper must never run against a `linked_accounts` row with `source = 'demo'`. Job dispatch must check `source` and route demo accounts to the seed job instead (see `demo_mode_spec.md`). This is the one place in the system a `source` check belongs.

## Endpoint knowledge
- The actual request/response shapes for OnlyFans/Fansly internal endpoints are external knowledge the project owner supplies (captured from a real account's browser network tab) — see `PROJECT_GUIDE.md` Part 6.6. This file should be updated with concrete endpoint details once that capture work is done; until then, the worker should be built against a stable interface (`fetchEarningsSnapshot(session)`, `fetchMessageMetadata(session)`) so the integration can be swapped in without touching scheduling/storage code.
