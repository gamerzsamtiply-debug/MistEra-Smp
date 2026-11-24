# Guest likes/comments, share links, phone push — setup

1. Supabase -> SQL Editor: run `supabase/migrations/0010_guest_social_push.sql`.
2. Generate VAPID keys once (on your PC): `npx web-push generate-vapid-keys`
3. Vercel -> Settings -> Environment Variables, add:
   - `VAPID_PUBLIC_KEY`  (public key)
   - `VAPID_PRIVATE_KEY` (private key - keep secret)
   - `VAPID_SUBJECT`      (e.g. `mailto:you@gmail.com`)
4. `npm install` (adds `web-push`), then redeploy.

Without step 2-3 everything else still works; only the phone push (site closed) is off.
