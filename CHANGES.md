# Changes in this update

## Setup (do these in order)
1. **Database:** Supabase → SQL Editor → run `supabase/migrations/0003_staff_members.sql` (safe to re-run; keeps all data and copies your current Admin/Moderator/Staff people into the new staff list). Until you run it, the Staff page still works and shows the owner entry only.
2. **Google sign-in:** Supabase → Authentication → Providers → Google → enable, paste a Google OAuth client ID/secret (Google Cloud Console → Credentials → OAuth client, type Web; add the callback URL Supabase shows you as an authorised redirect URI). Then Authentication → URL Configuration: set Site URL to your domain and add `https://YOUR-DOMAIN/**` to Redirect URLs.
3. **Vercel env:** `OWNER_USER_ID` = your user UID (Supabase → Authentication → Users). Redeploy. (`VITE_ENABLE_GOOGLE_AUTH` is no longer used.)
4. **Optional:** let accounts that never confirmed their email sign in: see the commented SQL at the bottom of the migration.
5. `npm install` (commit the new `package-lock.json`), then `npm run build`.

## What changed
1. **Staff:** new Admin → *Staff* tab (add/edit/remove: name, avatar, position Owner/Admin/Moderator/Developer/Builder/Helper/Staff). Entries show publicly with no account. Link an account either by username or by a one-time code (hashed, 48 h, single use, rate-limited) the person enters on their Profile page. Linking never grants permissions. Only the owner account can assign/edit Owner or Admin positions.
2. **Admin role:** the `OWNER_EMAIL` account keeps full access and appears everywhere as **Admin** (including the Staff page, automatically). *Owner* is a separate display-only position.
3. **500 errors:** reads retry on transient Supabase failures and every call has a timeout; constraint/duplicate/invalid-id database errors return 4xx instead of 500; an auth-service hiccup is no longer reported as "logged out"; page sections degrade independently (one failing query no longer blanks the home page); the client no longer auto-retries real server errors. Server logs now carry the exact failing query name (`[db] <name>`): check Vercel → Logs if one still appears.
4. **Google:** *Continue with Google* on Sign in and Sign up.
5. **No email confirmation:** sign-up uses `/api/register` (admin API, account pre-confirmed) and signs in immediately. Password reset still uses email.
6. **Password eye** on all password fields.
7. **Performance:** removed the 2.3 s splash and page-transition delays, route code-splitting (admin/editor no longer in the first load), cached public pages (stale-while-revalidate), cached site settings for instant repeat visits, one font family via `<link>`, removed framer-motion and react-query.
8. **UI:** removed glow/blur/hover-lift effects, extra-heavy headings and mono labels; one icon set (lucide) with consistent badges.

## Security note
Without email confirmation anyone can register any address. The owner address therefore can't be registered with a password (`/api/register` refuses it) and owner access requires `OWNER_USER_ID`, a Google-verified login, or an already-existing owner account. Set `OWNER_USER_ID`.

## Not verified here
This environment had no network, so `npm install`, `npm run build`, the tests and a real Supabase/Vercel run could not be executed. Files were syntax-checked and all imports resolved, and tests were updated, but run `npm run ci` first and report anything that fails.

---
# Update 2 (design + fixes)

**Run `supabase/migrations/0003_staff_members.sql` and `0004_feedback.sql` in the Supabase SQL Editor.** A missing 0003 is the most likely reason "Add staff" fails.

- 500 errors now say *why*: missing env var / missing migration / wrong key come back as a readable "Setup needed" message (HTTP 503). Admin > Overview shows a Setup check card (uses new `health` endpoint).
- Font: Milky Moringa everywhere (personal-use licence: see README in the font zip).
- Glass cards on both themes, Apple white (#f5f5f7) light mode, logos no longer sit on a dark tile, images fade at their edges.
- Notifications bell (new announcements/updates), Feedback page (/feedback) + Admin > Feedback tab.
- Home page reduced to the essentials (staff, announcements, updates and album sections removed; their own pages remain).


---
# Update 3 (500 page, fonts, navigation, home, album)

**Run `supabase/migrations/0005_album_social.sql` in the Supabase SQL Editor** (video, likes, comments, replies; also raises the upload limit to 50 MB for videos). Until it is run the album still works, only likes/comments/video need it. Then redeploy.

## The 500 page
- The 500 / "Try again" page now prints the real error text under the message, and "Try again" re-renders in place first (a full reload only if the same error returns). If you still get it, send a screenshot of that text.
- A failed site-settings load no longer shows a bare "503": it says why (for example *Setup needed: SUPABASE_SERVICE_ROLE_KEY missing / run migration*) and where to look (`/api/health`).
- Defensive fixes for things that could crash a render: odd/old cached settings are discarded (cache key bumped), missing status/profile/notification data no longer throws.
- Check quickly: open the site, press F12, Console, and run `fetch('/api/health',{method:'POST'}).then(r=>r.text()).then(console.log)`. It lists missing env vars and tables.

## Look and feel
- Fonts: headlines, buttons, labels and every bold bit use Milky Moringa. The small description paragraphs under headlines use a normal font (Inter, self-hosted) instead.
- Glass cards removed everywhere: plain solid cards, no blur.
- Navigation like YouTube: sidebar on desktop (icon + small label, full labels on wide screens); on phones/tablets a row of section chips under the top bar. No hamburger menu. Album, Staff, Updates and the rest are separate pages one tap away.
- Animations are back: page fade-in, scroll reveal, staggered hero, button press, live status pulse, like pop (all off for "reduce motion").
- Home is now light: hero (IP/port, Discord, vote), "Private by design. Built together." with your text and "Eras End. MistEra Never Fades.", and How to join.
- After creating an account (email or Google) you land on the Home page.

## Album
- Posts: author avatar + name on top, then the photo or video, like button, comment button, caption.
- Caption up to 30 characters shows in full; longer ones are cut with "show more" / "show less" (max 300 characters).
- Like (instant), comments and replies (one level), delete your own comment (moderators/admins can delete any).
- Photo or video upload: images up to 5 MB, videos MP4/WEBM/MOV up to 50 MB (Supabase free plan maximum). Videos still go through staff approval.
- CSP updated (`media-src`) so videos from Supabase storage can play.

## Not verified here
No network in the build environment: `npm install`, `npm run ci` and a real Vercel/Supabase run were not possible. All 191 TS/TSX files pass a syntax check and the server code type-checks apart from pre-existing implicit-any notes caused by missing packages. Please run `npm run ci` and tell me anything that fails.


---
# Update 4 (editable content, 500 hardening, SEO for people and AI)

**Run `supabase/migrations/0006_site_content.sql` in the Supabase SQL Editor, then redeploy.** Until it is run, "Save settings" still works (the new text fields just are not stored, and you get a warning telling you so).

## Everything is editable in Admin
- **Admin > Server & Help Settings**: *Hero title* (the big H1), *Hero description*, the homepage **About** section (heading, text, highlighted closing line) and the *Search & AI description*. Empty field = the old built-in text, so nothing changes until you edit.
- **Admin > Pages**: Information, **About us**, **Rules**, Terms and **Privacy** (each has its own address: /information /about /rules /terms /privacy). A page appears on the site, in the sitemap and for AI only when it is *Published* and has text. Footer links were added.
- Staff already had its own tab (Admin > Staff).

## 500 errors
- `getSite` no longer fails the whole website when only the How-to-join read fails (this showed up as a site-wide error page).
- A bad / expired / malformed login token is now always **401** (was sometimes **500**), so a stale session can no longer produce server errors.
- Every unexpected 500 now carries a **ref code** (`ref ABC123`) that is also printed in Vercel > Logs (`[api:<name>] ref=ABC123`), so the exact failing call can be found in one search.
- "Save settings" no longer breaks if a migration is missing; it saves what it can and says what to run.
- Still the fastest diagnosis: open Admin > Overview > *Setup check* (or POST `/api/health`). Missing env vars / migrations are reported there.

## SEO + AI
- `/`, `/staff`, `/about`, `/information`, `/rules`, `/terms`, `/privacy` are now **rendered on the server from the live database** (`api/seo.ts`, `server/seoPage.ts`): real heading, hero text, About text, server IP/port, how-to-join steps, **the staff list (names + positions)** and the page text are in the HTML itself, plus JSON-LD (Organization with staff members, WebSite, GameServer). Crawlers and AI tools that do not run JavaScript see everything. The React app still loads on top and behaves exactly as before.
- `/sitemap.xml` is generated live and lists only published pages. `/llms.txt` and `/llms-full.txt` give AI assistants a clean text summary (server details, staff, pages, latest posts).
- **Only public content is ever used.** The renderer cannot read admin data (logs, users, emails, suggestions, feedback, drafts, maintenance text). `robots.txt` disallows `/admin` and `/api/` for all bots (AI bots included) and `/admin` also sends `noindex`.
- Public pages are cached at the edge for 5 minutes, so an edit can take up to 5 minutes to show for crawlers (visitors see edits immediately in the app).
- If the renderer ever fails it serves the normal app shell, never an error page.
- Build now removes `dist/index.html` on purpose (the homepage comes from `api/seo.ts`); do not add static files for the dynamic routes.

## Tests
`npm test` now also runs `tests/seo-render.test.mjs`. 32 API tests, 7 markdown tests, 11 SEO tests and 5 render tests pass here. Three older tests were failing before this update (a stale caption limit, a fake-database NULL rule, and the 401 case above); they are fixed. `npm install`, `vite build` and a live Vercel/Supabase run were **not** possible in this environment: run `npm run ci` first.

## v6 - Pinterest-style navigation, profiles, views & sounds
- Bottom bar (Home / Album / Profile) on every page; Home and Album removed from the top menu, everything else unchanged.
- Profile redesigned (round photo everywhere, Edit profile dialog, Albums / Suggestions tabs, no follow / followers).
- Round profile-photo upload (centre-cropped square, shown as a circle).
- Live password strength meter (Weak / Medium / Strong / Extreme) with sound + pop animation on sign-up and password reset.
- Soft synthesized sound effects (toggle in the top bar), pop animation on buttons and page changes.
- Admin > "Visitors & Logins": total / unique / daily views, top pages, login log (admins only).
- Album posts show view counts (one view per person per post).
- Production build strips console output; DevTools / view-source shortcuts blocked for non-admins.
- NEW SQL: supabase/migrations/0007_views_logins_navigation.sql (run it in the Supabase SQL Editor).

## v7 - colours, icons, error hardening
- Dark theme background #1D1D1D (neutral greys for cards/borders). Main buttons / Join Discord: #FDDC56 -> #FCA834 gradient. Default buttons and cyan text: #68C3DE -> #49F1FF gradient.
- Calmer, consistent icon set (Newspaper, History, Building2, MessageSquare, CircleHelp, role icons) and a lighter icon stroke.
- "x is not a function" 500 hardening: effects never return a value, a render error is retried once silently, and Navbar / Footer / bottom bar can no longer take the whole page down.
