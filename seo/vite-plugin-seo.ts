// Vite plugin: puts per-page SEO tags into the STATIC html, so crawlers and social scrapers that do not run
// JavaScript still get the right title, description, canonical, Open Graph / Twitter tags, JSON-LD and a
// crawlable list of internal links.
//
//   dev / build   index.html            → homepage tags are injected (data-seo="…" on every managed tag)
//   build         dist/<page>.html      → one copy of the built index.html per public route, with that route's tags
//   build         dist/app-shell.html   → generic noindex shell, used by vercel.json for every other URL
//   build         dynamic routes        → NOT written; api/seo.ts renders them with live data (sitemap.xml and llms.txt too)
//
// The pages are still the normal React app: the same scripts/styles are referenced and nothing is rendered
// differently for visitors. Vercel serves dist/<page>.html at /<page> (cleanUrls) before applying rewrites.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { ROUTES, SHELL_SEO, DYNAMIC_PATHS, buildTags, resolveSeo, canonicalFor, type ResolvedSeo, type Tag } from '../src/lib/seo-config.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function serialize(t: Tag): string {
  const attrs = Object.entries({ ...t.attrs, 'data-seo': t.key }).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
  if (t.tag === 'title') return `<title ${attrs}>${esc(t.text ?? '')}</title>`;
  if (t.tag === 'script') return `<script ${attrs}>${(t.text ?? '').replace(/</g, '\\u003c')}</script>`;
  return `<${t.tag} ${attrs} />`;
}

function noscriptFor(seo: ResolvedSeo): string {
  if (!seo.route) return '';
  const links = ROUTES.map((r) => `<li><a href="${r.path}">${esc(r.path === '/' ? 'Home' : r.h1)}</a></li>`).join('');
  return `<noscript data-seo="noscript"><div style="max-width:720px;margin:0 auto;padding:24px"><h1>${esc(seo.route.h1)}</h1><p>${esc(seo.route.description)}</p><nav aria-label="Main"><ul>${links}</ul></nav><p>This website needs JavaScript enabled to show live server status, news and the whitelist guide.</p></div></noscript>`;
}

/** Removes everything this plugin injected, so the base HTML can be re-tagged for another route. */
export function stripManaged(html: string): string {
  return html
    .replace(/[ \t]*<(title|script|noscript)\b[^>]*\bdata-seo="[^"]*"[^>]*>[\s\S]*?<\/\1>\n?/g, '')
    .replace(/[ \t]*<(meta|link)\b[^>]*\bdata-seo="[^"]*"[^>]*>\n?/g, '');
}

export function applyRoute(html: string, seo: ResolvedSeo): string {
  const head = buildTags(seo).map((t) => `    ${serialize(t)}`).join('\n');
  let out = html.replace(/[ \t]*<\/head>/, `${head}\n  </head>`);
  const ns = noscriptFor(seo);
  if (ns) out = out.replace('<div id="root"></div>', `<div id="root"></div>\n    ${ns}`);
  return out;
}

function assertSound(file: string, html: string, seo: ResolvedSeo) {
  const titles = html.match(/<title[\s>]/g)?.length ?? 0;
  const canon = html.match(/rel="canonical"/g)?.length ?? 0;
  const desc = html.match(/name="description"/g)?.length ?? 0;
  const expectIndexed = !!seo.canonical;
  if (titles !== 1 || canon !== (expectIndexed ? 1 : 0) || desc !== (expectIndexed ? 1 : 0)) {
    throw new Error(`[seo] ${file}: expected 1 title and ${expectIndexed ? 1 : 0} canonical/description, got ${titles}/${canon}/${desc}`);
  }
}

export function seoPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'mistera-seo',
    configResolved(c) { config = c; },
    transformIndexHtml: {
      order: 'pre',
      handler(html) { return applyRoute(stripManaged(html), resolveSeo('/')); },
    },
    closeBundle() {
      if (config.command !== 'build' || config.build.ssr) return;
      const dist = path.resolve(config.root, config.build.outDir);
      const indexFile = path.join(dist, 'index.html');
      if (!fs.existsSync(indexFile)) return;
      const base = stripManaged(fs.readFileSync(indexFile, 'utf8'));

      // Dynamic pages (/, /staff, /about, /information, /rules, /terms, /privacy), /sitemap.xml and /llms.txt are rendered
      // by api/seo.ts with live database content (see vercel.json rewrites). They must NOT exist as static files, because
      // Vercel serves static files before rewrites. So dist/index.html is removed here (its content lives on in app-shell.html).
      let staticCount = 0;
      for (const r of ROUTES) {
        if (DYNAMIC_PATHS.includes(r.path)) continue;
        const seo = resolveSeo(r.path);
        const html = applyRoute(base, seo);
        assertSound(`${r.path}.html`, html, seo);
        fs.writeFileSync(path.join(dist, `${r.path.slice(1)}.html`), html);
        staticCount++;
      }
      fs.rmSync(indexFile, { force: true });

      const shell = applyRoute(base, SHELL_SEO);
      assertSound('app-shell.html', shell, SHELL_SEO);
      fs.writeFileSync(path.join(dist, 'app-shell.html'), shell);
      config.logger.info(`[seo] wrote ${staticCount} static pages + app-shell.html; ${DYNAMIC_PATHS.length} pages + sitemap.xml + llms.txt are rendered by api/seo.ts (${canonicalFor('/')})`);
    },
  };
}
