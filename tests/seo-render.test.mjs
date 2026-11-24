// Server-rendered SEO output (/, /staff, pages, sitemap.xml, llms.txt) against the in-memory Supabase fake.
//   npm run test:seo-render
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'mistera-seo-')), 'seo.mjs');
await build({
  entryPoints: [path.join(root, 'server/seoPage.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
  alias: { '@supabase/supabase-js': path.join(root, 'tests/fake-supabase.mjs') }, absWorkingDir: root,
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret';
const fake = await import(pathToFileURL(path.join(root, 'tests/fake-supabase.mjs')).href);
const { renderSeo, markdownToHtml } = await import(pathToFileURL(out).href);

const SHELL = '<!doctype html><html><head><title data-seo="title">MistEra SMP</title><meta name="robots" content="noindex, follow" data-seo="name:robots" /></head><body><div id="root"></div></body></html>';
globalThis.fetch = async () => new Response(SHELL);
let n = 0;
const test = async (name, fn) => { fake.reset(); await fn(); n++; console.log('ok -', name); };
const seed = () => {
  fake.rows('site_settings').push({ id: 's1', key: 'main', server_address: 'play.example.com', server_port: 19132, platform: 'Minecraft Bedrock Edition', server_status: 'Online', discord_url: 'https://discord.gg/x', vote_url: '', hero_title: 'My <i>hero</i>', hero_tagline: 'Tagline', about_text: 'One.\n\nTwo.', seo_description: 'A custom description written in the admin panel.' });
  fake.rows('staff_members').push({ id: 'a', name: 'Rafi', avatar_url: '', position: 'Moderator', profile_id: null, created_at: '2026-01-01' });
  fake.rows('content_pages').push({ id: 'p', slug: 'about', title: 'About Us', content: '# Hi\n\nWe are **MistEra** and we run a private Bedrock server from Bangladesh.\n\n<script>alert(1)</script>', published: true, updated_at: '2026-11-01T00:00:00Z' });
  fake.rows('content_pages').push({ id: 'q', slug: 'rules', title: 'Rules', content: 'secret draft', published: false });
  fake.rows('activity_logs').push({ id: 'l', action: 'ADMIN-ONLY-LOG-ENTRY', admin_email: 'owner@example.com' });
  fake.rows('suggestions').push({ id: 'g', title: 'PRIVATE-SUGGESTION' });
};

await test('homepage: edited hero/about/SEO text and the staff list are in the HTML; tags are indexable', async () => {
  seed();
  const r = await renderSeo('home', 'https://x.test');
  assert.equal(r.status, 200);
  assert.match(r.body, /<h1>My &lt;i&gt;hero&lt;\/i&gt;<\/h1>/);
  assert.match(r.body, /content="A custom description written in the admin panel\."/);
  assert.match(r.body, /Rafi \(Moderator\)/);
  assert.match(r.body, /<p>One\.<\/p><p>Two\.<\/p>/);
  assert.match(r.body, /name="robots" content="index, follow/);
  assert.equal((r.body.match(/<title/g) ?? []).length, 1);
  assert.match(r.body, /application\/ld\+json/);
});
await test('staff page lists everyone; unpublished pages are 404 + noindex; published pages render Markdown safely', async () => {
  seed();
  assert.match((await renderSeo('staff', 'https://x.test')).body, /<li>Rafi – Moderator<\/li>/);
  const rules = await renderSeo('rules', 'https://x.test');
  assert.equal(rules.status, 404); assert.match(rules.body, /noindex/); assert.doesNotMatch(rules.body, /secret draft/);
  const about = await renderSeo('about', 'https://x.test');
  assert.equal(about.status, 200); assert.match(about.body, /<strong>MistEra<\/strong>/); assert.doesNotMatch(about.body, /<script>alert/);
});
await test('sitemap lists only published pages; llms.txt carries server + staff info and nothing from the admin panel', async () => {
  seed();
  const sm = (await renderSeo('sitemap', 'https://x.test')).body;
  assert.match(sm, /misterasmp\.fun\/about/); assert.doesNotMatch(sm, /\/rules/); assert.match(sm, /misterasmp\.fun\/staff/);
  for (const key of ['llms', 'llms-full']) {
    const t = (await renderSeo(key, 'https://x.test')).body;
    assert.match(t, /Server IP: play\.example\.com/); assert.match(t, /- Rafi: Moderator/);
    assert.doesNotMatch(t, /ADMIN-ONLY-LOG-ENTRY|owner@example\.com|PRIVATE-SUGGESTION|secret draft/);
  }
});
await test('failures degrade to the plain app shell (never a 500); unknown keys are 404', async () => {
  seed();
  assert.equal((await renderSeo('home', 'https://x.test')).status, 200);
  globalThis.fetch = async () => { throw new Error('down'); };
  const r2 = await renderSeo('about', 'https://x.test'); // shell fetch is down: still a 200 with the full text (last good shell or bare shell), never a 503
  assert.equal(r2.status, 200); assert.match(r2.body, /<h1>/); assert.match(r2.body, /rel="canonical"/); assert.ok(r2.via);
  globalThis.fetch = async () => new Response(SHELL);
  assert.equal((await renderSeo('nope', 'https://x.test')).status, 404);
});
await test('listing pages (partners, announcements, updates, album) contain real text - never an empty #root', async () => {
  seed();
  fake.rows('partners').push({ id: 'pt1', name: 'Dhaka Hosting', category: 'Hosting', description: 'Fast hosting for SMPs.', logo_url: '', website_url: 'https://example.com' });
  fake.rows('posts').push({ id: 'po1', kind: 'Announcement', title: 'Season 2 is live', body: 'The **new season** starts today.', image_url: '', published: true, published_at: '2026-11-01T00:00:00Z' });
  fake.rows('posts').push({ id: 'po2', kind: 'Update', title: 'Patch 1.2', body: 'Bug fixes.', image_url: '', published: true, published_at: '2026-11-02T00:00:00Z' });
  fake.rows('posts').push({ id: 'po3', kind: 'Update', title: 'DRAFT-UPDATE', body: 'hidden', image_url: '', published: false, published_at: null });
  fake.rows('profiles').push({ id: 'pr1', user_id: 'u1', username: 'steve' });
  fake.rows('album_submissions').push({ id: '11111111-1111-4111-8111-111111111111', caption: 'My base', image_url: 'https://img.test/a.png', uploader: 'u1', status: 'Approved', submitted_at: '2026-11-03T00:00:00Z', media_type: 'image' });
  fake.rows('album_submissions').push({ id: '22222222-2222-4222-8222-222222222222', caption: 'PENDING-POST', image_url: 'https://img.test/b.png', uploader: 'u1', status: 'Pending', submitted_at: '2026-11-04T00:00:00Z', media_type: 'image' });
  const expect = { partners: /Dhaka Hosting/, announcements: /Season 2 is live/, updates: /Patch 1\.2/, album: /Photo by @steve/ };
  for (const [key, re] of Object.entries(expect)) {
    const r = await renderSeo(key, 'https://x.test');
    assert.equal(r.status, 200, key);
    assert.match(r.body, /<main data-ssr="1"/, key); assert.match(r.body, re, key);
    assert.match(r.body, /name="robots" content="index, follow/, key); assert.match(r.body, new RegExp(`rel="canonical" href="https://misterasmp.fun/${key}"`), key);
    assert.doesNotMatch(r.body, /<div id="root"><\/div>/, key);
  }
  assert.doesNotMatch((await renderSeo('updates', 'https://x.test')).body, /DRAFT-UPDATE/);
  assert.doesNotMatch((await renderSeo('album', 'https://x.test')).body, /PENDING-POST/);
});
await test('shared album post: renders the post, noindex, link-preview image; unknown or unapproved id is a real 404', async () => {
  seed();
  fake.rows('profiles').push({ id: 'pr1', user_id: 'u1', username: 'steve' });
  fake.rows('album_submissions').push({ id: '11111111-1111-4111-8111-111111111111', caption: 'My base', image_url: 'https://img.test/a.png', uploader: 'u1', status: 'Approved', submitted_at: '2026-11-03T00:00:00Z', media_type: 'image' });
  fake.rows('album_submissions').push({ id: '33333333-3333-4333-8333-333333333333', caption: 'Clip', image_url: 'https://img.test/c.mp4', uploader: 'u1', status: 'Approved', submitted_at: '2026-11-03T00:00:00Z', media_type: 'video' });
  fake.rows('album_submissions').push({ id: '22222222-2222-4222-8222-222222222222', caption: 'PENDING-POST', image_url: 'https://img.test/b.png', uploader: 'u1', status: 'Pending', submitted_at: '2026-11-04T00:00:00Z', media_type: 'image' });
  const ok = await renderSeo('albumpost', 'https://x.test', '11111111-1111-4111-8111-111111111111');
  assert.equal(ok.status, 200); assert.match(ok.body, /<h1>Photo by @steve<\/h1>/); assert.match(ok.body, /My base/);
  assert.match(ok.body, /name="robots" content="noindex/); assert.match(ok.body, /property="og:image" content="https:\/\/img\.test\/a\.png"/);
  const vid = await renderSeo('albumpost', 'https://x.test', '33333333-3333-4333-8333-333333333333');
  assert.match(vid.body, /property="og:video" content="https:\/\/img\.test\/c\.mp4"/);
  for (const id of ['22222222-2222-4222-8222-222222222222', '99999999-9999-4999-8999-999999999999', 'not-a-uuid', undefined]) {
    const r = await renderSeo('albumpost', 'https://x.test', id);
    assert.equal(r.status, 404, String(id)); assert.match(r.body, /Page not found/); assert.doesNotMatch(r.body, /PENDING-POST/);
  }
});
await test('unknown URLs: HTTP 404 with real text and noindex (not an empty 200 shell)', async () => {
  seed();
  const r = await renderSeo('notfound', 'https://x.test');
  assert.equal(r.status, 404); assert.match(r.body, /<h1>Page not found<\/h1>/); assert.match(r.body, /noindex/); assert.doesNotMatch(r.body, /<div id="root"><\/div>/);
});
await test('database down: home/staff still carry the real server IP, port and team; other pages answer 503 + Retry-After with text', async () => {
  fake.rows('site_settings').push({ id: 'a', key: 'main' }, { id: 'b', key: 'main' }); // two "main" rows = the settings read fails, like an outage
  const home = await renderSeo('home', 'https://x.test');
  assert.equal(home.status, 200); assert.equal(home.cache, 'no-store');
  assert.match(home.body, /play\.misterasmp\.fun/); assert.match(home.body, /5673/); assert.match(home.body, /Omar Faruk/);
  assert.doesNotMatch(home.body, /<div id="root"><\/div>/);
  assert.match((await renderSeo('staff', 'https://x.test')).body, /<li>kelausking – Admin<\/li>/);
  for (const key of ['about', 'partners', 'album']) {
    const r = await renderSeo(key, 'https://x.test');
    assert.equal(r.status, 503, key); assert.equal(r.retryAfter, 60, key); assert.match(r.body, /play\.misterasmp\.fun/, key);
  }
});
await test('markdown: raw HTML dropped, links limited to http(s) and relative', async () => {
  const h = markdownToHtml('[ok](https://a.b) [bad](javascript:alert(1)) <img src=x onerror=alert(1)>');
  assert.match(h, /<a href="https:\/\/a\.b">ok<\/a>/); assert.doesNotMatch(h, /href="javascript|<img/);
});
console.log(`\n${n} SEO render tests passed`);
