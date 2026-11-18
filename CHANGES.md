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
