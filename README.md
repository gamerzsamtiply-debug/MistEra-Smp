# MistEra SMP — standalone website (GitHub + Vercel + Supabase)

Migrated from a Zite export. Same pages, design, animations and admin panel; the Zite runtime, database,
auth and file upload were replaced by:

| Was (Zite)              | Now                                                    |
|-------------------------|--------------------------------------------------------|
| `zitejs/db` tables      | Supabase Postgres (`supabase/migrations/0001_initial_schema.sql`) |
| `zitejs/auth`           | Supabase Auth (email + password, optional Google) + new `/login` page |
| `zitejs/backend` endpoints | `server/api/*.ts`, served by one Vercel function `api/[name].ts` |
| `zitejs/upload`         | Supabase Storage via server-issued signed upload URLs  |

## Folder layout
```
api/[name].ts            Vercel serverless entry (all /api/* calls)
server/                  endpoints (server/api), auth, db, authorization (lib.ts)
src/                     React + Vite frontend (src/project-components = former packages/components)
supabase/migrations/     SQL schema, RLS lock-down, storage bucket, default settings row
tests/                   API logic tests (fake database)
original-zite-export/    original endpoint sources + schema, for reference only (safe to delete)
```

## 1. Supabase setup
1. Create a project at supabase.com.
2. **SQL Editor → New query**, run `supabase/migrations/0001_initial_schema.sql`, then (new query) `supabase/migrations/0002_rate_limits_and_hardening.sql`.
   0001 creates the 10 tables, locks them with RLS, creates the public `uploads` bucket (5 MB, PNG/JPG/WEBP/GIF) and the default settings row.
   0002 adds the rate-limit table/function (used by the public error log and by uploads), 30-day error-log retention and a few safety constraints.
   **Without 0002, error reports are silently not stored and uploads/submissions are not rate limited** (the API logs `check_rate_limit failed` in Vercel logs).
3. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.
4. **Authentication → Providers → Email**: enabled. "Confirm email" can be ON or OFF: sign-up goes through the server (`/api/register`), which creates accounts that need no confirmation either way.
5. **Authentication → URL Configuration**: set Site URL to your Vercel domain and add `https://YOUR-DOMAIN/**` and `http://localhost:8080/**` to Redirect URLs.
6. **Google login** (the buttons are always shown): Supabase → Authentication → Providers → Google → enable it with a Google OAuth client ID/secret, and add `https://YOUR-DOMAIN/**` (and `http://localhost:5173/**`) under Authentication → URL Configuration → Redirect URLs. See `CHANGES.md`.

## 2. Environment variables
Copy `.env.example` to `.env.local` and fill it in (same names in Vercel → Settings → Environment Variables):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret, server only), `OWNER_EMAIL`, optional `SUPABASE_URL`, `VITE_ENABLE_GOOGLE_AUTH`, and the recommended `OWNER_USER_ID` (the owner's Supabase *User UID*; pins the Owner role to that exact account).
`SUPABASE_URL` / `VITE_SUPABASE_URL` must be the same project: the API only accepts member-submitted images that live in that project's `uploads` bucket.
The service-role key is only read in `server/db.ts`; nothing in `src/` can reach it.

## 3. Run locally
```bash
npm install        # first time only: this creates package-lock.json -> COMMIT IT
npm run dev        # http://localhost:8080 — /api/* runs the same code as production
npm test           # API logic tests + markdown sanitiser tests
npm run typecheck  # frontend + server type-check
npm run ci         # typecheck + tests + build (what GitHub Actions runs)
npm run build      # production build -> dist/
```

## 4. Upload to GitHub
```bash
git init && git add . && git commit -m "MistEra SMP standalone"
git branch -M main
git remote add origin https://github.com/YOU/mistera-smp.git
git push -u origin main
```
`.env.local` is git-ignored; never commit keys.

## 5. Deploy on Vercel
1. vercel.com → Add New → Project → import the repo (framework auto-detects Vite; `vercel.json` is included).
2. Add the environment variables above, Deploy.
3. Sign in **with Google** using the `OWNER_EMAIL` address (or keep your existing account) → you get full admin access and are shown as **Admin**. Then set `OWNER_USER_ID` (see `.env.example`).
4. In Admin → Settings set server IP/port/status, links and images; Admin → Steps for the join guide; Pages for Information/Terms.

## Behaviour notes
- All data access goes through `/api/*`; tables have RLS enabled with no policies, so the browser (anon key) cannot read or write them.
- Admin endpoints call `requireAdmin` server-side; role-change rules (only Owner grants Admin, Owner/self locked) are enforced in `server/api/adminSetRole.ts`.
- Maintenance mode shows the maintenance page to non-admins (same as the original, a UI gate); `/login` and `/admin` stay reachable.

## Security notes
- **Rate limiting** is stored in Postgres (`check_rate_limit`, migration 0002), because serverless instances share no memory. `logClientError`: 10 reports / 10 min per IP and 300 / hour overall; uploads: 30 / hour per user; album and suggestion submissions: 20–30 / hour per user. IPs are HMAC-hashed before storage.
- **Markdown** is rendered through a two-pass allow-list sanitiser (`src/project-components/markdown/sanitize.ts`): only a bare `<mark>` raw tag survives; scripts, event handlers, styles and `javascript:` URLs are removed.
- **Owner account** (`OWNER_EMAIL`): full admin access, displayed publicly as **Admin**. Because sign-up needs no e-mail confirmation, it requires `OWNER_USER_ID`, a Google-verified login, or an existing owner account. "Owner" is a separate display-only staff position.
- **Content-Security-Policy** is set in `vercel.json`. If you add a custom Supabase domain, another script/CDN or an embed, extend `connect-src` / `script-src` / `img-src` there.
- Maintenance mode is a UI gate only: public content endpoints keep answering (same as the original).
- Members can only attach images uploaded through the site (own `uploads` bucket); admins may still enter any http(s) image link.

## Self-hosting the remaining external assets
Logos/hero images are still hot-linked from Zite's CDN. With internet access run `npm run assets:localize -- https://YOUR-DOMAIN` (or `-- --dry-run` first); it downloads them to `public/images/` and rewrites `index.html`, `src/lib/brand.ts` and `src/pages/Home.tsx`. Fonts are loaded from Google Fonts (allowed in the CSP).

## Things you must know (not recoverable / changed)
- **No data in the export.** It contained schema and code only: existing posts, partners, settings, users, album and suggestions are NOT included. Export them from Zite separately; users must register again (Zite passwords can't be migrated).
- **Images hosted on Zite's CDN** (`images.fillout.com`: logos, favicon, any uploaded pictures) are still hotlinked. Download them and re-upload (logos → `public/` + `src/lib/brand.ts`, `index.html`; content images → Admin panel).
- **Owner role fix:** the original code gave the owner email `Admin`, which contradicted its own UI/comments (Owner-only Admin management could never work). It now gives `Owner`, only for a verified email.
- **New pages:** `/login` and `/reset-password` (Zite had a hosted login screen).
- Usernames are now unique at the database level; auto-generated ones get a numeric suffix on collision.
- Unused Zite-template deps (Stripe, AWS, etc.) were dropped; the unused UI library components were kept.

## Verification status
See `CHANGELOG.md` for exactly what was and was not verified in the audit environment (no internet: no `npm install`, no Vite build, no real Supabase/Vercel).
Run `npm install && npm run ci` once on your machine / in GitHub Actions before the first deploy.

## SEO

All SEO copy and rules live in **`src/lib/seo-config.ts`** (titles, descriptions, canonical URLs, social image, JSON-LD, sitemap).

- `npm run build` runs `seo/vite-plugin-seo.ts`, which writes a static HTML file per public page (`dist/staff.html`, …) with that page's
  `<title>`, description, canonical, Open Graph/Twitter tags (homepage also gets Organization + WebSite JSON-LD), plus `dist/sitemap.xml`
  and a generic `noindex` `dist/app-shell.html` that `vercel.json` serves for every other URL. `src/lib/seo-dom.ts` keeps the tags right after client-side navigation.
- **Adding a public page:** add the `<Route>` in `App.tsx` *and* an entry in `ROUTES` (it then appears in the sitemap and gets its own tags). `npm run test:seo` fails if a route is in neither `ROUTES` nor the private list.
- Account/admin/error pages and `/u/:id` profiles are `noindex` (meta tag + `X-Robots-Tag` header in `vercel.json`). `/api/` and `/admin` are also disallowed in `public/robots.txt`.
- Social preview image: replace `OG_IMAGE` in `seo-config.ts` with a 1200×630 branded image (e.g. `/og-image.png` in `public/`).
- Run `npm run assets:localize -- https://misterasmp.fun` once (needs internet) to self-host the images that are still hot-linked from `images.fillout.com`; it is the biggest remaining Core Web Vitals win.
