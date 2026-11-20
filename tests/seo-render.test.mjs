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
  const r = await renderSeo('home', 'https://x.test'); // no settings table rows + fake works; force a broken shell fetch below
  assert.ok(r.status === 200);
  globalThis.fetch = async () => { throw new Error('down'); };
  const r2 = await renderSeo('about', 'https://x.test');
  assert.equal(r2.status, 503);
  globalThis.fetch = async () => new Response(SHELL);
  assert.equal((await renderSeo('nope', 'https://x.test')).status, 404);
});
await test('markdown: raw HTML dropped, links limited to http(s) and relative', async () => {
  const h = markdownToHtml('[ok](https://a.b) [bad](javascript:alert(1)) <img src=x onerror=alert(1)>');
  assert.match(h, /<a href="https:\/\/a\.b">ok<\/a>/); assert.doesNotMatch(h, /href="javascript|<img/);
});
console.log(`\n${n} SEO render tests passed`);
