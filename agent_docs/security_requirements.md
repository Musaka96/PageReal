# Security requirements

This is an adult-finance product handling account credentials, earnings data, and legally significant audit records. Security is not optional polish here.

## Secrets & credentials
- IMPORTANT: NEVER commit secrets. All credentials come from env vars / a secret manager (e.g. Doppler or the host's manager) — enforce this with a pre-commit hook, not just discipline.
- Session tokens/credentials for linked accounts are encrypted at rest (libsodium sealed boxes or equivalent, or a dedicated secrets manager) — never plaintext in the DB, never in logs.
- Field-level encryption for any other sensitive field (e.g., anything that could re-identify a fan, if content storage is ever opted into).

## Authentication
- Email + strong password + **mandatory** TOTP 2FA — not optional, not skippable, for every creator account (demo accounts can use a lighter flow since they hold no real credentials, but the live-account path always requires 2FA before a real session can be linked).
- Sessions via secure, httpOnly, SameSite cookies. No tokens in localStorage.
- Aggressive rate-limiting on auth endpoints (login, 2FA verify, password reset) to blunt credential-stuffing/brute-force attempts.

## Audit logging
- Full audit logging of every access to a creator's data — who/what accessed which account's data and when, separate from the `audit_chain` financial hash-chain (this is access logging, not the financial record).
- Access logs themselves should be append-only in spirit, even if not enforced with a DB trigger like `audit_chain`.

## Network & app-level
- Strict CSP. No third-party trackers — privacy is part of the product's trust promise, not just a nice-to-have.
- Proxy egress for the scraper worker is per-creator and isolated (see `scraper_spec.md`) — a compromised proxy/session for one creator must not expose others.

## Data minimization
- IMPORTANT: never store fan PII beyond audit necessity (see `data_model.md`). Default to metadata; message content is opt-in only and stored separately from metadata so the default path never touches it.
- Demo/seed data must never be derived from real creator or fan data (see `demo_mode_spec.md`) — synthetic only, so a security or privacy incident in demo data is structurally impossible.

## Compliance posture
- GDPR-aware from the start: data export (the product is literally built to provide this — see export spec under reconciliation) and a clear data-deletion flow are MVP-relevant, not later add-ons.
- The "creator accesses their own account data, read-only, for personal record-keeping" framing is the legal shield against both platform-ToS claims and agency pushback — get it lawyer-reviewed before relying on it in marketing or support copy (see `PROJECT_GUIDE.md` Part 8).
