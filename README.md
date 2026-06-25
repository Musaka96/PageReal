# PageReal

A read-only, creator-controlled audit tool for OnlyFans/Fansly creators. See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for the full product plan and [CLAUDE.md](CLAUDE.md) / [agent_docs/](agent_docs) for build specs.

## Current status

MVP in progress: `apps/web` is a Next.js app with a demo-mode earnings reconciliation dashboard (synthetic seed data, no real database or scraper yet).

## Run locally

```bash
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000 and click into the demo dashboard.
