# Soft 404 fix (V15)

Cause: `/partners`, `/announcements`, `/updates`, `/album` were static copies of the empty app shell (`<div id="root"></div>`),
and every unknown URL (plus shared `/album/<id>` links) also got that empty shell with HTTP 200 -> Google: "Soft 404".

What changed (no UI/CSS/layout change):
- `server/seoPage.ts`: these pages are now server-rendered with the real text (partners, posts, album list) inside `#root`.
  `/album/<id>` renders that post (noindex, with og:image / og:video so chat apps show a preview).
- Unknown URLs now return a real **HTTP 404** (`/api/seo?p=notfound`) with real text + noindex; the React app still shows its own 404 page.
- `vercel.json`: explicit rewrites. Account/admin/profile routes (`/login`, `/admin`, `/u/...`) keep the app shell (200, noindex).
- If the database is unreachable: `/` and `/staff` still contain server IP, port and team; other pages answer **503 + Retry-After** (never an empty 200).
- Home title: "MistEra SMP – Official Minecraft Bedrock SMP, Bangladesh". GameServer JSON-LD now carries IP + port.
- React: lists use `<ul>/<li>` (li = `display: contents`) and partner cards `<article>/<header>`; classes untouched.
- Tests: `npm run test:seo`, `npm run test:seo-render` (new cases for all of the above).

After deploying: Search Console -> URL Inspection -> "Test live URL" on /partners, /album, then "Validate fix".
Check:  `curl -s -o /dev/null -w "%{http_code}\n" https://misterasmp.fun/not-a-page`  -> 404
