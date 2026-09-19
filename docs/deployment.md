# Production release runbook

## 1. Infrastructure

Create or select a production PostgreSQL database and Vercel Blob store. Keep the application functions and database in compatible nearby regions where practical. The database user needs permission to create and use the `apex_v2` schema.

Configure these Vercel production variables:

- `DATABASE_URL`: pooled PostgreSQL connection
- `DIRECT_URL`: direct PostgreSQL connection
- `BLOB_READ_WRITE_TOKEN`: read/write token for the selected Blob store
- `NEXT_PUBLIC_APP_URL=https://www.apexai.one`

Do not reuse a Prisma shadow database as production.

## 2. Database

Vercel runs migrations against its configured production database before compiling the application:

```bash
npm run vercel-build
```

This is intentionally separate from the regular `npm run build`, so GitHub CI can compile without a live database. Keep production deployments serialized when a release contains schema migrations. For manual or non-Vercel releases, run `npx prisma migrate deploy` before starting the new application version.

## 3. Build and deploy

```bash
npm ci
npm run check
npx vercel --prod
```

The GitHub `main` branch runs the same lint, type, unit-test, dependency-audit, and production-build checks.

## 4. Smoke test

- `/api/health` returns success.
- A new public account can register and sign in.
- A thought with text, a tag, and an image can be created, edited, found, and permanently deleted.
- Monthly statistics open and switch months.
- Desktop and iPhone layouts have no horizontal overflow.
- The iPhone Add to Home Screen result opens at `/apexmind` in standalone display.

## 5. Historical import and DNS

Run the authoritative import only after the owner account exists in production. Follow `docs/data-import.md`, validate the imported totals, then direct `www.apexai.one` to the verified production deployment. Keep the previous database and deployment recoverable through the verification window.
