# Authoritative data import

`每日思考.md` is the authoritative historical source. Legacy database content is used only for comparison and must never override the file.

## Audit result

The current source was structurally audited without logging private thought text:

- 1,109 records
- Date range: 2022-01-31 through 2026-09-19 (Asia/Shanghai)
- 59 images across 38 records
- 41 tagged records
- All images are HTTPS assets in the existing Vercel Blob store
- The legacy database contains only 11 `mind_ideas` rows, so it is not a complete source

The importer understands the export structure, including exact-second timestamps, multiline Markdown, standalone backticked tags such as `` `#精华` ``, and Markdown images. Every imported thought receives a stable source fingerprint, making repeat runs idempotent.

## Dry run

Dry run is the default and performs no database writes:

```bash
npm run data:import -- --source "C:\Users\Chh\Desktop\Workspace\personal\每日思考.md"
```

Review the counts, date bounds, and maximum content length before applying.

## Apply

The target account must exist. When production shares the legacy database, `--adopt-legacy-user` can copy the matching legacy username and bcrypt password hash into the isolated `apex_v2` schema.

```bash
npm run data:import -- --source "C:\Users\Chh\Desktop\Workspace\personal\每日思考.md" --username "USERNAME" --adopt-legacy-user --apply
```

The importer adopts existing Blob URLs after reading each image to verify its dimensions and media type. Do not remove the legacy Blob store before the production account has been visually checked.

## Cutover rule

Legacy rows may be deleted only after all of the following are true:

1. Production migrations have completed.
2. The authoritative import reports 1,109 thoughts and 59 images.
3. The owner can sign in and spot-check old, middle, and recent records.
4. Search, tag filtering, statistics, image opening, editing, and deletion work in production.
5. A recoverable database backup exists.

Deletion of legacy tables is deliberately not part of the deployment command.
