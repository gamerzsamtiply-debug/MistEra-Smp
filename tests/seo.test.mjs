// SEO guard-rails: run with `npm run test:seo` (needs Node ≥ 22.18, which can import .ts files directly).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES, SITE_URL, resolveSeo, buildTags, sitemapXml, normalizePath, SHELL_SEO } from '../src/lib/seo-config.ts';
import { applyRoute, stripManaged } from '../seo/vite-plugin-seo.ts';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

test('titles and descriptions are within SERP limits', () => {
  for (const r of ROUTES) {
    assert.ok(r.title.length >= 15 && r.title.length <= 60, `${r.path} title is ${r.title.length} chars`);
    assert.ok(r.description.length >= 60 && r.description.length <= 160, `${r.path} description is ${r.description.length} chars`);
  }
});

test('no duplicate titles, descriptions, H1s or paths', () => {
  for (const k of ['title', 'description', 'h1', 'path']) assert.equal(new Set(ROUTES.map((r) => r[k])).size, ROUTES.length, `duplicate ${k}`);
});

test('homepage targets the brand and the Bangladesh Bedrock SMP query', () => {
  const home = resolveSeo('/');
  assert.match(home.title, /MistEra SMP/);
  assert.match(home.title, /Bedrock SMP/);
  assert.match(home.title, /Bangladesh/);
  assert.match(home.description, /MistEra SMP/);
  assert.equal(home.canonical, `${SITE_URL}/`);
});

test('every public route declared in App.tsx is indexable (in ROUTES) or deliberately private', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const paths = [...app.matchAll(/<Route path="(\/[^":*]*)"/g)].map((m) => m[1]);
  const privatePaths = new Set(['/profile', '/welcome', '/suggestions', '/feedback', '/admin', '/login', '/reset-password', '/401', '/403', '/500', '/503', '/u']);
  for (const p of paths) {
    if (p === '/u/' || p === '/album/') continue; // /album/:id = shared post link (server-rendered, noindex)
    assert.ok(ROUTES.some((r) => r.path === p) || privatePaths.has(p) || p.startsWith('/u'), `route ${p} is neither in ROUTES (sitemap) nor marked private`);
  }
  for (const r of ROUTES) assert.ok(r.path === '/' || paths.includes(r.path), `${r.path} is in ROUTES but not routed in App.tsx`);
});

test('private/unknown pages are noindex and carry no canonical or description', () => {
  for (const p of ['/login', '/admin', '/profile', '/welcome', '/suggestions', '/feedback', '/reset-password', '/u/abc', '/nope', '/403']) {
    const s = resolveSeo(p);
    assert.match(s.robots, /noindex/, p);
    assert.equal(s.canonical, undefined, p);
    assert.equal(s.description, undefined, p);
    assert.equal(s.jsonLd, false, p);
  }
});

test('path normalisation: case and trailing slash resolve to the same canonical', () => {
  assert.equal(normalizePath('/Staff/'), '/staff');
  assert.equal(resolveSeo('/STAFF/').canonical, `${SITE_URL}/staff`);
  assert.equal(normalizePath(''), '/');
});

test('Open Graph, Twitter and canonical tags are complete and unique', () => {
  for (const r of ROUTES) {
    const tags = buildTags(resolveSeo(r.path));
    const keys = tags.map((t) => t.key);
    assert.equal(new Set(keys).size, keys.length, `${r.path} emits duplicate tags`);
    for (const k of ['title', 'name:description', 'rel:canonical', 'property:og:title', 'property:og:description', 'property:og:url', 'property:og:image', 'name:twitter:card', 'name:twitter:title', 'name:twitter:image']) {
      assert.ok(keys.includes(k), `${r.path} is missing ${k}`);
    }
    const og = tags.find((t) => t.key === 'property:og:image').attrs.content;
    assert.match(og, /^https?:\/\//, 'og:image must be absolute');
  }
});

test('homepage JSON-LD has Organization + WebSite and is valid JSON; other pages have none', () => {
  const ld = buildTags(resolveSeo('/'), { sameAs: ['https://discord.gg/x'] }).find((t) => t.key === 'jsonld');
  const data = JSON.parse(ld.text);
  const types = data['@graph'].map((g) => g['@type']);
  assert.deepEqual(types.sort(), ['Organization', 'WebSite']);
  assert.deepEqual(data['@graph'].find((g) => g['@type'] === 'Organization').sameAs, ['https://discord.gg/x']);
  for (const r of ROUTES.filter((r) => r.path !== '/')) assert.ok(!buildTags(resolveSeo(r.path)).some((t) => t.key === 'jsonld'));
});

test('sitemap lists every indexable page exactly once, with canonical URLs', () => {
  const xml = sitemapXml();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ROUTES.map((r) => resolveSeo(r.path).canonical));
  assert.ok(!/login|admin|profile|suggestions/.test(xml));
});

test('robots.txt points at the sitemap and keeps assets crawlable', () => {
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/misterasmp\.fun\/sitemap\.xml$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.ok(!/^Disallow: \/(assets|images)?\s*$/m.test(robots), 'must not block the site or its assets');
});

test('plugin: per-route HTML has exactly one title/canonical/description and re-tagging is idempotent', () => {
  const base = '<!doctype html><html><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>';
  for (const r of ROUTES) {
    const html = applyRoute(base, resolveSeo(r.path));
    assert.equal(html.match(/<title/g).length, 1);
    assert.equal(html.match(/rel="canonical"/g).length, 1);
    assert.equal(html.match(/name="description"/g).length, 1);
    assert.ok(html.includes(`<noscript data-seo="noscript">`) && html.includes('<h1>'));
    assert.equal(stripManaged(html).replace(/\s+/g, ''), base.replace(/\s+/g, ''), `${r.path}: strip must restore the base page`);
  }
  const shell = applyRoute(base, SHELL_SEO);
  assert.ok(/noindex/.test(shell) && !/canonical/.test(shell));
});

console.log(`\n${n} SEO tests passed`);
