# Data model

## Core tables
```
users            (creator account, auth, 2FA secret)
linked_accounts  (platform, session/proxy ref, status, source: 'live' | 'demo')
contracts        (commission %, deductions config, payout schedule, start date)
snapshots        (raw earnings/subscriber data per scrape/seed cycle, per account)
audit_chain      (append-only hash-chained records) — UPDATE/DELETE blocked
messages_meta    (timestamp, length, latency; content only if opted in)
style_baseline   (reference samples + computed feature vector)
boundary_docs    (versioned consent docs, each hashed)
payments_logged  (creator-reported payouts for reconciliation)
subscriptions    (the creator's ClearLedger plan/tier + Stripe refs)
```

## Immutability rules
- IMPORTANT: `audit_chain` is append-only. NEVER generate UPDATE or DELETE statements against it. A DB trigger enforces this at the database level — application code must not try to work around it.
- Each `audit_chain` row: `{id, timestamp, data_json, prev_hash, hash}` where `hash = sha256(timestamp + data_json + prev_hash)`.
- `snapshots` rows are also write-once in practice (corrections are new rows, not edits) — reconciliation must always be able to replay history from immutable snapshots.

## `linked_accounts.source`
- Enum: `'live' | 'demo'`. Set at creation, never changed in place — if a creator wants to go from demo to live, that's a new `linked_accounts` row with a real session, not a flip of the flag.
- `source` is the only field application code should ever branch on to distinguish demo from real, and only at the data-ingestion boundary (worker scraper vs. seed job). Everything downstream (reconciliation, dashboard, export, audit_chain) reads `snapshots`/`payments_logged`/etc. with no awareness of `source`.

## PII rules
- IMPORTANT: NEVER store fan PII beyond audit necessity. `messages_meta` defaults to metadata only (timestamp, length, latency). Message *content* storage requires explicit creator opt-in, stored separately, and is excluded from demo seed data entirely (demo data is always synthetic, never derived from any real fan).
