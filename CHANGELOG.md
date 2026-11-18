# Changelog — production-readiness audit

## Fixed
**Security**
- Markdown XSS: `<mark onmouseover=…>` (attributes were allowed) could execute script. Now two-pass sanitiser (bare `<mark>` only, then allow-list of tags/attributes/URL schemes).
- Public `logClientError` had no abuse protection: added DB-backed rate limits (per IP + global), size limits, stronger scrubbing (JWTs, Bearer tokens, emails, key=value secrets, control chars); the endpoint never errors back to the browser.
- Uploads, album and suggestion submissions are rate limited per user (429).
- Members can no longer attach arbitrary third-party image URLs to avatars/album (must be from the project's own `uploads` bucket).
- Optional `OWNER_USER_ID` pins the Owner role to one exact account (defends against pre-registration of the owner email if "Confirm email" is turned off).
- Strict input length limits on every endpoint; admin image settings are now validated as http(s) links; `cleanUrl` length-capped and parsed.
- Security headers + Content-Security-Policy, Permissions-Policy in `vercel.json`.

**Reliability**
- Non-UUID ids on `adminSavePost` / `adminSavePartner` returned HTTP 500 (Postgres cast error); now a clean 404.
- A failed audit-log insert turned an already-successful admin action into a 500; logging is now best-effort.
- Maintenance-mode exemption (`/admin`, `/login`) was only evaluated on full page loads; now follows client-side navigation.
- `sessionStorage` access could crash the app in private/blocked-storage browsers; guarded.
- Client error reporter is throttled/deduplicated (cannot spam the API from a render loop).
- Rate limiter failure never blocks users (uploads/submissions fail open; error logs fail closed).

**Deployment / tooling**
- `package.json`: Node pinned to `22.x`; new `test`, `test:markdown`, `ci`, `assets:localize` scripts.
- GitHub Actions CI (typecheck, tests, build). Migration `0002` (rate limits, log retention, constraints, indexes).
- `scripts/localize-assets.mjs` to self-host the Zite-CDN images; preconnect hints for fonts; `.env.example` and README updated.

## Tested (audit environment, offline)
- 29 API tests (21 original + 8 new) against the real server code and an in-memory Supabase fake — pass.
- 7 markdown sanitiser tests (script/iframe/svg removal, event handlers, obfuscated `javascript:` URLs, legit markdown preserved) — pass.
- Strict TypeScript check of `server/` + `api/` (Supabase types stubbed) — 0 errors. `sanitize.ts` strict-null check — 0 errors.
- All 157 TS/TSX files parse. Import list matches `package.json` (nothing missing).
- Asset-localizer logic exercised with a stubbed `fetch`.

## NOT verified (could not be done offline) — do these first
1. `npm install` (creates the missing **package-lock.json** — commit it), then `npm run ci`. Frontend type-check and `npm run build` were NOT run here.
2. SQL migrations were not executed on a real Postgres/Supabase.
3. Real Supabase Auth/Storage, Vercel deployment and the CSP in a real browser (check the console once after deploying).
