# Latest: error page, IP/port, fonts, themes

- **No more auto-retry.** `ErrorBoundary` shows the error page immediately (no hidden re-mounting, no spinner flicker); `lazyRetry` is gone (plain `React.lazy`), the background pre-download of every page is gone, and read requests no longer retry on their own. The real error is logged to the console and to Admin > Logs (operation "Render").
- Staff, Partners, Announcements/Updates, Album and Login are now part of the main bundle (they were effectively already, via Home), so they cannot fail to download. Only Information/Terms, Profile, Suggestions, Public profile, Reset password and Admin are lazy; their loader only shows after 300 ms.
- **IP and port:** new `CopyField` (label on top, value below, copy button). Hero and "Server details" show Server IP and Port as two separate tap-to-copy fields.
- **Fonts:** removed characters the Minecraft fonts do not have (arrows, ellipsis, middle dot, dashes, curly quote, copyright) from visible text; `font-mono` now uses the Minecraft font; negative/extra letter-spacing removed; text sizes moved to multiples of 8px (sm 16, 3xl 32, 4xl 40, 6xl 64).
- **Themes:** Dark (default) and Light (Apple-style soft white, #f5f5f7 page with white cards). Sun/moon button in the navbar, choice saved in `localStorage` (`mistera-theme`), applied before first paint by `public/theme-init.js`. Text/primary colours are darker in light mode for contrast; logos sit on a dark tile in light mode (`.logo-plate`).

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

## SEO & performance pass
- Per-page title/description/canonical/Open Graph/Twitter tags (static HTML at build + runtime updates); Organization + WebSite JSON-LD on the homepage.
- `sitemap.xml` (generated), `robots.txt`, `X-Robots-Tag: noindex` for account/admin/error/profile pages, `app-shell.html` fallback instead of serving the homepage HTML for unknown URLs.
- One `<h1>` per page (CMS `# Heading` is demoted on Information/Terms), no skipped heading levels on Partners/Announcements/Updates, footer column titles no longer headings.
- Descriptive alt text for logos, album screenshots, partner logos and how-to-join step images; decorative images keep `alt=""`.
- Hero image/logo marked high priority; `decoding="async"` on lazy images; long-lived cache headers for hashed assets.

## Fonts
- Body text: Minecraft; headlines (h1–h4, `.font-display`, navbar brand): Minecraft Bold. Self-hosted in `public/fonts`; Google Fonts removed (CSP tightened). Colours unchanged.
- Check the licences of both font files (Minecraft Bold's readme says to) if the server earns money.

## Routing fix
- `vercel.json` rewrites unknown/app URLs to `/app-shell` (extension-less, because `cleanUrls` is on). Pointing at `/app-shell.html` made Vercel return its own 404 for /admin, /login, etc.

## Resilience
- Pages' JS is loaded with `lazyRetry` (5 silent retries, then one automatic reload) and the other pages are pre-downloaded in the background.
- `ErrorBoundary` re-mounts a crashed section up to 5 times before showing the 500 page; the 500 page is only reached if all tries fail.
- Read-only requests (`retries` option) now also retry on server (5xx) errors, up to 5 times.
- The loading indicator for page changes and the first load is only shown on a visitor's first visit (`mistera-visited` in localStorage).
