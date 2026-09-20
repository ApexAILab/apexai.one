# APEXAI

APEXAI is a product shell for focused tools. Its first product, ApexMind, is a calm, high-frequency space for capturing thoughts on desktop and mobile.

## What is included

- Public username-and-password registration and database-backed sessions
- Thought capture with tags and up to nine images
- Full editing of content, time, tags, and images
- Keyword search and tag filtering
- Monthly binary activity calendar, current streak, total thoughts, total words, and month/year/all-time semantic word cloud
- Responsive desktop/iPhone UI, dark mode, and an installable web-app manifest
- Permanent deletion with explicit confirmation

The product intentionally has no AI features, offline mode, recycle bin, longest-streak metric, monthly word trend, or tag-usage chart.

## Stack

- Next.js 16, React 19, TypeScript
- PostgreSQL and Prisma
- Vercel Blob for image storage
- Vitest and Playwright
- Geist, served from the npm package rather than Google Fonts

## Local development

Use Node.js 22.

```bash
npm ci
copy .env.example .env
npm run db:migrate
npm run dev
```

Required environment variables are documented in `.env.example`. `DATABASE_URL` should be a pooled runtime connection and `DIRECT_URL` a direct connection used by migrations. `BLOB_READ_WRITE_TOKEN` is required for image uploads.

Useful commands:

```bash
npm run check
npm run test:e2e
npm run db:seed
npm run data:import -- --source "C:\path\to\每日思考.md"
```

`db:seed` requires `SEED_PASSWORD` and is for local development only. The data importer is a dry run unless `--apply` is explicitly passed.

## Project boundaries

- Product and system decisions: [`docs/architecture.md`](docs/architecture.md)
- Authoritative-data migration: [`docs/data-import.md`](docs/data-import.md)
- Production release runbook: [`docs/deployment.md`](docs/deployment.md)

The application uses only dependencies and assets that are directly reachable from mainland China. There are no Google login, Google Fonts, or runtime CDN dependencies.
