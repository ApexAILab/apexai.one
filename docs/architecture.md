# Architecture

## Product structure

The root site is the APEXAI product shell. Products are first-class links in the shared header; ApexMind is not hidden under a product dropdown. Product pages own their own focused navigation, so the landing-page navigation does not remain above the writing experience.

The current code is intentionally a single Next.js application. Product-specific UI lives under `components/apexmind`, shared primitives under `components/ui`, and server concerns under `lib`. A future product can add its own route and component directory without coupling to ApexMind.

## Request and data flow

1. Server pages resolve the current session from an opaque, HTTP-only cookie.
2. Client interactions call same-origin route handlers under `app/api`.
3. Zod validates all external input before Prisma writes to PostgreSQL.
4. Images use scoped client-upload tokens to go directly to Vercel Blob, then Sharp verifies the stored file before an owned database row is created. This avoids the Vercel Function request-body limit without trusting client metadata.
5. Every thought, tag, and image query is scoped by `userId`.

The new models live in the PostgreSQL schema `apex_v2`. This isolates the rebuilt product from the legacy tables during verification and makes the cutover reversible.

## Authentication and security

- Usernames are Unicode-normalized and compared case-insensitively.
- Passwords are hashed with bcrypt cost 12.
- Raw session tokens never enter the database; only SHA-256 hashes are stored.
- Session cookies are HTTP-only, SameSite=Lax, Secure in production, and expire after 30 days.
- Authentication endpoints use persistent database rate limits.
- Every mutation rejects cross-origin requests.
- Upload tokens are restricted to the signed-in user's path, supported image types, and 10MB. Uploaded files are fetched and decoded server-side before their metadata is accepted.
- Security headers deny framing, MIME sniffing, camera, microphone, and geolocation access.

Because accounts do not use email, there is intentionally no email recovery path in v1. A future recovery design must be added before password reset is offered.

## Time and statistics

User-facing time is consistently interpreted in Asia/Shanghai. Editing supports seconds. The activity calendar is binary: a date is active when at least one thought exists, with no intensity scale. Streaks remain active through yesterday when the current day has no entry yet.

Word totals count CJK characters and Latin words. Word-cloud terms are computed from thought content only and can be scoped to the selected month, year, or all time. Chinese word segmentation, repeated-phrase merging, numeric exclusion, and stop-word filtering keep the result focused on meaningful themes; tag frequency is not presented as a statistic.

## Online-only PWA

The manifest and Apple touch icons allow ApexMind to be added to an iPhone home screen. No service worker or offline write queue is registered, matching the online-only product decision and avoiding misleading offline states.
