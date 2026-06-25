# Style analysis spec (Phase 2)

## Purpose
Detect when a chatter's writing style drifts from the creator's own established voice — a signal that someone other than the creator (or an inconsistent rotation of chatters) is operating the account outside agreed boundaries.

## Approach (v1 — no LLM)
- Python FastAPI sidecar (`services/style-analysis`), called from `packages/analysis` over HTTP.
- scikit-learn TF-IDF vectorizer + cosine similarity against a creator-supplied baseline. A small classifier (DistilBERT-scale) is a later upgrade, not a v1 requirement — don't reach for an LLM here.

## Baseline
- At onboarding (or whenever the creator opts into Phase 2 features), the creator supplies reference writing samples — their own real messages/captions, written by them.
- The sidecar computes a feature vector from the baseline and stores it in `style_baseline`.

## Features
- TF-IDF term vectors.
- Average sentence length.
- Punctuation density.
- Emoji frequency.
- Question ratio (questions / total sentences).
- Response-length distribution (mean + variance, not just mean — a chatter writing suspiciously uniform-length replies is itself a signal).

## Drift score
- Per period (e.g., daily or weekly), compute the same feature vector over that period's messages and cosine-similarity it against the baseline vector.
- Score is `1 - cosine_similarity`, so higher = more drift. Threshold for flagging is configurable, not hardcoded — store it per-account so it can be tuned without a redeploy (default placeholder: flag periods scoring above 0.35, pending real-world calibration once there's actual data to tune against).
- Drift score is computed over `messages_meta` content only when the creator has opted into content storage; if they haven't opted in, this feature is unavailable for their account and the UI should say so plainly rather than silently showing nothing.

## Demo mode
- Demo accounts need a synthetic baseline + a few periods of synthetic message content with at least one deliberately drifted period, so the drift chart has something real to show. This is the one feature area where demo seed data must include synthetic message *content* (not just metadata) — generate it programmatically (e.g., template + word-substitution), never copy real text from any real creator or fan.

## Out of scope (v1)
- No real-time/streaming analysis — batched per period is sufficient.
- No cross-creator comparison or benchmarking — this is a personal baseline tool, not a leaderboard.
