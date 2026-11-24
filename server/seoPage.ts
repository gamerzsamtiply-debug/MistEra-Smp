// Server-rendered, crawler- and AI-friendly output for the PUBLIC website only:
//   /  /staff  /about  /information  /rules  /terms  /privacy   → the normal app shell + real text (headings, staff list, page text, JSON-LD)
//   /partners  /announcements  /updates  /album  /album/<id>    → the normal app shell + the real list / post text (no empty #root)
//   any other URL                                               → a real HTTP 404 (the app shell still loads and shows its own 404 page)
//   /sitemap.xml                                                → only pages that are actually published
//   /llms.txt  /llms-full.txt                                   → plain-text summary of the site for AI assistants
//
// What this file may read: published pages, public site settings, the public staff list, join steps, published posts.
// What it never reads: admin endpoints, users/emails, logs, suggestions, feedback, maintenance text or anything else
// from the admin panel. Visitors, search engines and AI crawlers all get exactly the same content.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db, mustOr, isUuid } from './db.js';
import { buildStaffList, getSettingsRow, settingsOut, PAGE_SLUGS, PAGE_TITLES, type PageSlug, type StaffOut } from './lib.js';
import { PEOPLE, SERVER_SUMMARY, KEYWORDS, allQuestions } from './knowledge.js';
import type { AlbumRow, ContentPageRow, JoinStepRow, PartnerRow, PostRow, SettingsRow } from './types.js';

const SITE_URL = (process.env.SITE_URL?.trim() || 'https://misterasmp.fun').replace(/\/+$/, '');
const SITE_NAME = 'MistEra SMP';
// Keep in sync with src/lib/brand.ts
const LOGO_FULL = 'https://images.fillout.com/orgid-872088/flowpublicid-default/widgetid-default/izC6Y3nYkqxHzT27wKMwCZ/pasted-image-1794900117962-8prmhkmt.png';
const LOGO_MARK = 'https://images.fillout.com/orgid-872088/flowpublicid-default/widgetid-default/xjP4jVuf1pyXaa8YHDiC6N/pasted-image-1794900117871-q8mwoogl.png';

const DEFAULT_HERO_TITLE = "Bangladesh's Bedrock SMP. Online 24/7.";
const DEFAULT_ABOUT_HEADING = 'Private by design. Built together.';
const DEFAULT_ABOUT_TAGLINE = 'Eras End. MistEra Never Fades.';
const DEFAULT_ABOUT_TEXT = [
  'MistEra SMP is a private, whitelist-only Minecraft Bedrock Edition survival server, running 24/7 on dedicated hosting for a smooth and reliable gameplay experience.',
  'Access is managed through our official Discord community. To join the server, simply join our Discord, visit the Gamer Tag channel, and submit your Minecraft Bedrock Gamertag for whitelist approval.',
  "Once approved, you're ready to enter MistEra and become part of the community.",
];
const HOME_TITLE = 'MistEra SMP – Official Minecraft Bedrock SMP, Bangladesh'; // keep in sync with src/lib/seo-config.ts
const HOME_DESCRIPTION = 'MistEra SMP is a private, whitelisted Minecraft Bedrock survival server based in Bangladesh and online 24/7. Join our Discord to get approved and play.';

const PAGE_DESCRIPTION: Record<PageSlug, string> = {
  information: 'Everything to know about the MistEra Minecraft server, a private whitelisted Bedrock SMP in Bangladesh, including how to get approved to join.',
  about: 'About MistEra SMP: who we are, how the private whitelisted Minecraft Bedrock survival server in Bangladesh works and what the community stands for.',
  rules: 'The official rules of the MistEra SMP Minecraft Bedrock server in Bangladesh. Read them before you apply for the whitelist and play.',
  terms: 'The terms of service for the MistEra SMP Minecraft Bedrock server and its community.',
  privacy: 'How MistEra SMP, a Minecraft Bedrock server and community from Bangladesh, handles account data, profiles and what you share on the website.',
};
/** Listing pages (server-rendered from the database). Keep titles/descriptions in sync with src/lib/seo-config.ts. */
const LIST_PATHS = ['/partners', '/announcements', '/updates', '/album'];
const LIST_META: Record<string, { title: string; description: string; h1: string; intro: string }> = {
  partners: { title: 'Partners | MistEra SMP', description: 'Communities, hosts and creators that MistEra SMP, a Minecraft Bedrock SMP from Bangladesh, proudly works with.', h1: 'Partners', intro: 'Communities, hosts and creators we proudly work with.' },
  announcements: { title: 'Announcements and News | MistEra SMP', description: 'Official news, events and announcements from the MistEra SMP Minecraft Bedrock server team.', h1: 'Announcements', intro: 'Official news and events from the MistEra SMP team.' },
  updates: { title: 'Server Updates and Changelog | MistEra SMP', description: 'Patch notes, new features and server changes for the MistEra SMP Bedrock survival server.', h1: 'Updates', intro: 'Server changes, new features and patch notes.' },
  album: { title: 'Community Album | MistEra SMP', description: 'Screenshots and builds shared by MistEra SMP players from our Minecraft Bedrock survival world.', h1: 'Community Album', intro: 'Screenshots, builds and videos shared by our players.' },
};
/** Only used when the database can't be read, so the pages still contain the real server details instead of an empty shell. */
const FALLBACK_SERVER = { address: 'play.misterasmp.fun', port: 5673 };

// ───────────── small helpers ─────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
const httpUrl = (u: string | null | undefined) => (u && /^https?:\/\/\S+$/i.test(u) ? u : '');

function inline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_m, t: string, u: string) => `<a href="${u}">${t}</a>`);
}

/** Tiny, safe Markdown → HTML (headings, lists, quotes, bold/italic, links). Raw HTML in the source is dropped. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/<[^>]*>/g, '').replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(esc(para.join(' ')))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(esc(i))}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (!line) { flushPara(); flushList(); continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { flushPara(); flushList(); const lvl = Math.min(6, Math.max(2, m[1].length + 1)); out.push(`<h${lvl}>${inline(esc(m[2]))}</h${lvl}>`); continue; }
    if (/^([-*_])\1{2,}$/.test(line)) { flushPara(); flushList(); out.push('<hr />'); continue; }
    if ((m = /^[-*+]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^>\s?(.*)$/.exec(line))) { flushPara(); flushList(); out.push(`<blockquote><p>${inline(esc(m[1]))}</p></blockquote>`); continue; }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}

/** Markdown → plain text (for descriptions and llms-full.txt). */
export function markdownToText(md: string): string {
  return md.replace(/<[^>]*>/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/[*_`>]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

// ───────────── data (public only) ─────────────
interface Site {
  s: ReturnType<typeof settingsOut>;
  pages: Map<PageSlug, ContentPageRow>;
  staff: StaffOut[];
  steps: { title: string; instructions: string }[];
}

async function loadSite(): Promise<Site> {
  const row = await getSettingsRow();
  const [pagesR, stepsR, staff] = await Promise.all([
    db().from('content_pages').select('*').eq('published', true).limit(20),
    db().from('join_steps').select('*').limit(20),
    buildStaffList().catch((e) => { console.error('[seo] staff failed:', e); return [] as StaffOut[]; }),
  ]);
  const pages = new Map<PageSlug, ContentPageRow>();
  for (const p of mustOr(pagesR, 'seo.pages', []) as ContentPageRow[]) {
    if ((PAGE_SLUGS as readonly string[]).includes(p.slug) && (p.content ?? '').trim()) pages.set(p.slug as PageSlug, p);
  }
  const steps = (mustOr(stepsR, 'seo.steps', []) as JoinStepRow[])
    .filter((r) => r.slot === 1 || (r.enabled && (r.title ?? '').trim() && (r.instructions ?? '').trim()))
    .sort((a, b) => (a.slot === 1 ? -1 : b.slot === 1 ? 1 : (a.sort_order ?? 9) - (b.sort_order ?? 9)))
    .map((r) => ({ title: r.title ?? '', instructions: r.instructions ?? '' }))
    .filter((r) => r.title.trim() || r.instructions.trim());
  return { s: settingsOut(row), pages, staff, steps };
}

const aboutParagraphs = (s: Site['s']) => {
  const p = (s.aboutText ?? '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  return p.length ? p : DEFAULT_ABOUT_TEXT;
};
const heroTitle = (s: Site['s']) => s.heroTitle?.trim() || DEFAULT_HERO_TITLE;
const homeDescription = (s: Site['s']) => clip(oneLine(s.seoDescription?.trim() || HOME_DESCRIPTION), 200);

function staffSentence(staff: StaffOut[]): string {
  if (!staff.length) return '';
  return staff.map((m) => `${m.name} (${m.position})`).join(', ');
}
function staffDescription(_staff: StaffOut[]): string {
  return clip('Meet the MistEra SMP staff: Omar Faruk (MrKidzz) owner, kelausking and Zenko Playz admins, greamyboyyy and Abidvaiya moderators. Bedrock SMP, Bangladesh.', 160);
}

// ───────────── page bodies ─────────────
const NAV: [string, string][] = [['/', 'Home'], ['/about', 'About'], ['/information', 'Information'], ['/rules', 'Rules'], ['/staff', 'Staff'], ['/partners', 'Partners'], ['/announcements', 'Announcements'], ['/updates', 'Updates'], ['/album', 'Album'], ['/terms', 'Terms'], ['/privacy', 'Privacy']];

function shellBody(site: Site, h1: string, inner: string): string {
  const nav = NAV.filter(([p]) => {
    const slug = p.slice(1) as PageSlug;
    return !(PAGE_SLUGS as readonly string[]).includes(slug) || site.pages.has(slug);
  }).map(([p, l]) => `<a href="${p}">${esc(l)}</a>`).join(' · ');
  return `<main data-ssr="1" style="max-width:760px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6"><header><nav aria-label="Main">${nav}</nav></header><h1>${esc(h1)}</h1>${inner}</main>`;
}

function homeBody(site: Site): string {
  const { s } = site;
  const parts: string[] = [];
  if (s.heroTagline?.trim()) parts.push(`<p>${esc(s.heroTagline.trim())}</p>`);
  parts.push(`<p>${esc(SITE_NAME)} is a private, whitelist-only ${esc(s.platform || 'Minecraft Bedrock Edition')} survival server based in Bangladesh. Server status: ${esc(s.serverStatus)}.</p>`);
  parts.push(`<h2>Server address</h2><p>IP: <strong>${esc(s.serverAddress)}</strong>${s.serverPort ? ` · Port: <strong>${s.serverPort}</strong>` : ''}</p>`);
  const links: string[] = [];
  if (httpUrl(s.discordUrl)) links.push(`<a href="${esc(s.discordUrl)}">Join our Discord</a>`);
  if (httpUrl(s.voteUrl)) links.push(`<a href="${esc(s.voteUrl)}">Vote for the server</a>`);
  if (links.length) parts.push(`<p>${links.join(' · ')}</p>`);
  parts.push(`<h2>${esc(s.aboutHeading?.trim() || DEFAULT_ABOUT_HEADING)}</h2>${aboutParagraphs(s).map((t) => `<p>${esc(t)}</p>`).join('')}<p><strong>${esc(s.aboutTagline?.trim() || DEFAULT_ABOUT_TAGLINE)}</strong></p>`);
  if (site.steps.length) {
    parts.push(`<h2>How to join (whitelist)</h2><ol>${site.steps.map((st) => `<li><strong>${esc(st.title)}</strong> ${esc(oneLine(markdownToText(st.instructions)))}</li>`).join('')}</ol>`);
  }
  if (site.staff.length) parts.push(`<h2>Staff</h2><p>${esc(staffSentence(site.staff))}. <a href="/staff">Meet the full team</a>.</p>`);
  return shellBody(site, heroTitle(s), parts.join('\n'));
}

function staffBody(site: Site): string {
  const groups = new Map<string, StaffOut[]>();
  for (const m of site.staff) groups.set(m.position, [...(groups.get(m.position) ?? []), m]);
  const inner = site.staff.length
    ? [...groups.entries()].map(([pos, list]) => `<h2>${esc(pos)}${pos === 'Owner' || pos === 'Staff' ? '' : 's'}</h2><ul>${list.map((m) => `<li>${esc(m.name)} – ${esc(m.position)}</li>`).join('')}</ul>`).join('')
    : '<p>The staff list will appear here soon.</p>';
  const bios = `<h2>Who is who</h2>${PEOPLE.map((p) => `<p><strong>${esc(p.name)}</strong>: ${esc(p.description)}</p>`).join('')}`;
  return shellBody(site, 'Staff', `<p>The people who run and moderate ${esc(SITE_NAME)}, the Bangladesh-based Minecraft Bedrock survival server.</p>${inner}${bios}`);
}

function pageBody(site: Site, slug: PageSlug, p: ContentPageRow): string {
  return shellBody(site, p.title?.trim() || PAGE_TITLES[slug], markdownToHtml(p.content ?? ''));
}


function notFoundBody(site: Site): string {
  return shellBody(site, 'Page not found', `<p>This page does not exist on ${esc(SITE_NAME)}. Try one of the pages above, or go back to the <a href="/">homepage</a>.</p>`);
}

function partnersBody(site: Site, rows: PartnerRow[]): string {
  const m = LIST_META.partners;
  const inner = rows.length
    ? `<ul>${rows.map((p) => `<li><strong>${esc(p.name ?? '')}</strong> (${esc(p.category ?? 'Community')})${p.description ? ` – ${esc(oneLine(p.description))}` : ''}${httpUrl(p.website_url) ? ` <a href="${esc(httpUrl(p.website_url))}" rel="noopener">Visit</a>` : ''}</li>`).join('')}</ul>`
    : '<p>Our partners will be listed here soon.</p>';
  return shellBody(site, m.h1, `<p>${esc(m.intro)}</p>${inner}`);
}

function postsBody(site: Site, key: 'announcements' | 'updates', rows: PostRow[]): string {
  const m = LIST_META[key];
  const inner = rows.length
    ? rows.map((p) => `<article><h2>${esc(p.title ?? '')}</h2>${p.published_at ? `<p><time datetime="${esc(String(p.published_at))}">${esc(String(p.published_at).slice(0, 10))}</time></p>` : ''}<p>${esc(clip(oneLine(markdownToText(p.body ?? '')), 500))}</p></article>`).join('')
    : '<p>Check back soon - new posts will appear here.</p>';
  return shellBody(site, m.h1, `<p>${esc(m.intro)}</p>${inner}`);
}

interface AlbumView extends AlbumRow { uploaderName: string }
const albumTitle = (a: AlbumView) => `${a.media_type === 'video' ? 'Video' : 'Photo'} by ${a.uploaderName}`;

function albumBody(site: Site, rows: AlbumView[]): string {
  const m = LIST_META.album;
  const inner = rows.length
    ? `<ul>${rows.map((a) => `<li><a href="/album/${esc(a.id)}">${esc(albumTitle(a))}</a>${a.caption ? ` – ${esc(clip(oneLine(a.caption), 160))}` : ''}</li>`).join('')}</ul>`
    : '<p>No posts yet. Be the first to share a screenshot or video from MistEra SMP!</p>';
  return shellBody(site, m.h1, `<p>${esc(m.intro)}</p>${inner}`);
}

function albumPostBody(site: Site, a: AlbumView): string {
  const media = a.media_type === 'video'
    ? (httpUrl(a.image_url) ? `<p><a href="${esc(httpUrl(a.image_url))}">Watch the video</a></p>` : '')
    : (httpUrl(a.image_url) ? `<p><img src="${esc(httpUrl(a.image_url))}" alt="${esc(a.caption ? clip(oneLine(a.caption), 120) : albumTitle(a))}" style="max-width:100%;height:auto" /></p>` : '');
  return shellBody(site, albumTitle(a), `${a.caption ? `<p>${esc(oneLine(a.caption))}</p>` : ''}${media}<p><a href="/album">Back to the Community Album</a></p>`);
}

/** Site data used when the database can't be read: the facts that never change, so crawlers still get real text. */
function fallbackSite(): Site {
  const s = settingsOut({ server_address: FALLBACK_SERVER.address, server_port: FALLBACK_SERVER.port, platform: 'Minecraft Bedrock Edition', server_status: 'Online' } as unknown as SettingsRow);
  const staff = PEOPLE.map((p, i) => ({ id: `known-${i}`, name: p.name, avatarUrl: '', position: p.role, profileId: null, username: null })) as unknown as StaffOut[];
  return { s, pages: new Map(), staff, steps: [] };
}

// ───────────── tags ─────────────
interface Meta { title: string; description: string; canonical: string; robots: string; jsonLd?: unknown; image?: string; video?: string }

function tagsHtml(m: Meta): string {
  const t = (name: string, content: string, kind: 'name' | 'property' = 'name') => `<meta ${kind}="${name}" content="${esc(content)}" data-seo="${kind}:${name}" />`;
  return [
    `<title data-seo="title">${esc(m.title)}</title>`,
    t('description', m.description),
    t('robots', m.robots),
    t('keywords', KEYWORDS.join(', ')),
    t('author', SITE_NAME),
    t('application-name', SITE_NAME),
    t('geo.region', 'BD'),
    t('geo.placename', 'Bangladesh'),
    `<link rel="canonical" href="${esc(m.canonical)}" data-seo="rel:canonical" />`,
    t('og:type', m.video ? 'video.other' : 'website', 'property'), t('og:site_name', SITE_NAME, 'property'), t('og:locale', 'en_US', 'property'),
    t('og:title', m.title, 'property'), t('og:description', m.description, 'property'), t('og:url', m.canonical, 'property'),
    t('og:image', m.image || LOGO_FULL, 'property'), t('og:image:alt', m.image ? m.title : 'MistEra SMP logo', 'property'),
    m.video ? t('og:video', m.video, 'property') : '',
    t('twitter:card', 'summary_large_image'), t('twitter:title', m.title), t('twitter:description', m.description), t('twitter:image', m.image || LOGO_FULL),
    m.jsonLd ? `<script type="application/ld+json" data-seo="jsonld">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).map((x) => `    ${x}`).join('\n');
}

function structuredData(site: Site, home: boolean) {
  const { s } = site;
  const sameAs = [httpUrl(s.discordUrl)].filter(Boolean);
  const personId = (n: string) => `${SITE_URL}/#person-${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const people = PEOPLE.map((p) => ({
    '@type': 'Person', '@id': personId(p.name), name: p.name, ...(p.aliases.length ? { alternateName: p.aliases } : {}),
    jobTitle: `${p.role} of ${SITE_NAME}`, description: p.description, worksFor: { '@id': `${SITE_URL}/#organization` },
    url: `${SITE_URL}/staff`,
  }));
  const owner = PEOPLE.find((p) => p.role === 'Owner');
  const graph: unknown[] = [
    {
      '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, alternateName: ['MistEra', 'MistEra SMP Season 2', 'Mistera SMP'], url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: LOGO_MARK }, image: LOGO_FULL, description: `${SERVER_SUMMARY} ${homeDescription(s)}`,
      slogan: s.aboutTagline?.trim() || DEFAULT_ABOUT_TAGLINE, keywords: KEYWORDS.join(', '),
      areaServed: { '@type': 'Country', name: 'Bangladesh' },
      ...(owner ? { founder: { '@id': personId(owner.name) } } : {}),
      member: people.map((p) => ({ '@id': p['@id'] })),
      ...(sameAs.length ? { sameAs } : {}),
    },
    ...people,
  ];
  if (home) {
    graph.push(
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, alternateName: 'MistEra', description: homeDescription(s), inLanguage: 'en', publisher: { '@id': `${SITE_URL}/#organization` } },
      {
        '@type': 'GameServer', '@id': `${SITE_URL}/#server`, name: SITE_NAME, url: `${SITE_URL}/`, game: { '@type': 'VideoGame', name: s.platform || 'Minecraft Bedrock Edition' }, serverStatus: s.serverStatus, publisher: { '@id': `${SITE_URL}/#organization` },
        description: `${SITE_NAME} server address: ${s.serverAddress}${s.serverPort ? `, port ${s.serverPort}` : ''}. ${homeDescription(s)}`,
        identifier: [
          ...(s.serverAddress ? [{ '@type': 'PropertyValue', name: 'Server IP', value: s.serverAddress }] : []),
          ...(s.serverPort ? [{ '@type': 'PropertyValue', name: 'Port', value: String(s.serverPort) }] : []),
        ],
        areaServed: { '@type': 'Country', name: 'Bangladesh' },
      },
    );
  }
  // One question/answer list for the whole site, attached to the pages that also show the staff.
  graph.push({
    '@type': 'FAQPage', '@id': `${SITE_URL}/#faq`, mainEntity: allQuestions().map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

// ───────────── response building ─────────────
export interface SeoResponse { status: number; type: string; body: string; cache: string; /** Debug header X-Seo-Render: where the page shell came from. */ via?: string; retryAfter?: number }
const HTML = 'text/html; charset=utf-8';
const CACHE = 'public, s-maxage=300, stale-while-revalidate=86400';
const SHELL_OK = (h: string) => h.includes('<div id="root">');
/** Last-resort shell (no app bundle): crawlers still get the full tags + text; people get the plain text until the real shell is back. */
const BARE_SHELL = '<!doctype html>\n<html lang="en" class="dark">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n';

let shellCache: { html: string; at: number } | null = null;

/** The built app shell is bundled with the function (vercel.json includeFiles), so no HTTP round trip is needed. */
async function readShellFile(): Promise<string | null> {
  for (const p of [join(process.cwd(), 'dist', 'app-shell.html'), join(process.cwd(), 'app-shell.html')]) {
    try { const h = await readFile(p, 'utf8'); if (SHELL_OK(h)) return h; } catch { /* try the next place */ }
  }
  return null;
}

/**
 * Gets the app shell: bundled file first, then the last good copy, then an HTTP fetch (deployment URL, then the public
 * host) as a fallback. Every failure is logged with the URL and HTTP status so Vercel -> Logs shows the exact cause.
 */
async function getShell(origin: string): Promise<{ html: string; via: string }> {
  const f = await readShellFile();
  if (f) { shellCache = { html: f, at: Date.now() }; return { html: f, via: 'file' }; }
  if (shellCache && Date.now() - shellCache.at < 3_600_000) return { html: shellCache.html, via: 'memory' };
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const origins = [...new Set([vercelUrl, origin].filter(Boolean))];
  let last: unknown = new Error('no origin');
  for (const o of origins) {
    try {
      const r = await fetch(`${o}/app-shell`, { signal: AbortSignal.timeout(3000), headers: { 'x-seo-internal': '1', 'user-agent': 'MistEra-SEO-internal/1.0' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const html = await r.text();
      if (!SHELL_OK(html)) throw new Error('shell has no #root');
      shellCache = { html, at: Date.now() };
      return { html, via: 'fetch' };
    } catch (e) {
      last = e;
      console.error(`[seo] app-shell fetch from ${o} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw last;
}

/** Removes the generic noindex tags the shell was built with, then writes this page's tags and text. */
function fillShell(shell: string, meta: Meta | null, body: string, plainTitle?: string): string {
  let html = shell
    .replace(/[ \t]*<(title|script|noscript)\b[^>]*\bdata-seo="[^"]*"[^>]*>[\s\S]*?<\/\1>\n?/g, '')
    .replace(/[ \t]*<(meta|link)\b[^>]*\bdata-seo="[^"]*"[^>]*>\n?/g, '');
  if (meta) html = html.replace(/[ \t]*<\/head>/, `${tagsHtml(meta)}\n  </head>`);
  else html = html.replace(/[ \t]*<\/head>/, `    <title data-seo="title">${esc(plainTitle ?? SITE_NAME)}</title>\n    <meta name="robots" content="noindex, follow" data-seo="name:robots" />\n  </head>`);
  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

const abs = (p: string) => (p === '/' ? `${SITE_URL}/` : `${SITE_URL}${p}`);

function sitemap(site: Site): string {
  const urls: { loc: string; lastmod?: string }[] = [{ loc: abs('/') }, { loc: abs('/staff') }];
  for (const slug of PAGE_SLUGS) { const p = site.pages.get(slug); if (p) urls.push({ loc: abs(`/${slug}`), lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined }); }
  for (const p of LIST_PATHS) urls.push({ loc: abs(p) });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}\n</urlset>\n`;
}

/** Used only when the database can't be read: the always-public pages, no dates. */
function fallbackSitemap(): string {
  const paths = ['/', '/information', '/about', '/rules', '/staff', '/partners', '/announcements', '/updates', '/album', '/terms', '/privacy'];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url>\n    <loc>${abs(p)}</loc>\n  </url>`).join('\n')}\n</urlset>\n`;
}

async function llms(site: Site, full: boolean): Promise<string> {
  const { s } = site;
  const L: string[] = [];
  L.push(`# ${SITE_NAME}`, '', `> ${homeDescription(s)}`, '');
  L.push('## Server', `- Name: ${SITE_NAME}`, `- Type: Private, whitelist-only ${s.platform || 'Minecraft Bedrock Edition'} survival server (SMP) from Bangladesh, online 24/7`, `- Status: ${s.serverStatus}`, `- Server IP: ${s.serverAddress}`, ...(s.serverPort ? [`- Port: ${s.serverPort}`] : []));
  if (httpUrl(s.discordUrl)) L.push(`- Discord (join here to get whitelisted): ${s.discordUrl}`);
  if (httpUrl(s.voteUrl)) L.push(`- Vote link: ${s.voteUrl}`);
  L.push(`- Website: ${SITE_URL}/`, '');
  L.push(`## ${s.aboutHeading?.trim() || DEFAULT_ABOUT_HEADING}`, '', ...aboutParagraphs(s).flatMap((t) => [t, '']), s.aboutTagline?.trim() || DEFAULT_ABOUT_TAGLINE, '');
  if (site.steps.length) L.push('## How to join (whitelist)', ...site.steps.map((st, i) => `${i + 1}. ${st.title}${st.instructions.trim() ? `: ${oneLine(markdownToText(st.instructions))}` : ''}`), '');
  L.push('## Who is who at MistEra SMP', ...PEOPLE.map((p) => `- ${p.name}${p.aliases.length ? ` (also: ${p.aliases.join(', ')})` : ''} – ${p.role}. ${p.description}`), '');
  L.push('## Frequently asked questions', ...allQuestions().flatMap((x) => [`Q: ${x.q}`, `A: ${x.a}`, '']));
  L.push('## Staff team', ...(site.staff.length ? site.staff.map((m) => `- ${m.name}: ${m.position}`) : ['- (not listed yet)']), `- Full list: ${abs('/staff')}`, '');
  L.push('## Pages');
  for (const slug of PAGE_SLUGS) { const p = site.pages.get(slug); if (p) L.push(`- [${p.title?.trim() || PAGE_TITLES[slug]}](${abs(`/${slug}`)}): ${clip(oneLine(markdownToText(p.content ?? '')), 140)}`); }
  L.push(`- [Staff](${abs('/staff')}): the people who run the server`, `- [Announcements](${abs('/announcements')})`, `- [Updates](${abs('/updates')})`, `- [Partners](${abs('/partners')})`, `- [Community album](${abs('/album')})`, '');
  if (full) {
    for (const slug of PAGE_SLUGS) { const p = site.pages.get(slug); if (p) L.push(`## ${p.title?.trim() || PAGE_TITLES[slug]} (${abs(`/${slug}`)})`, '', markdownToText(p.content ?? ''), ''); }
    const postsR = await db().from('posts').select('*').eq('published', true).order('published_at', { ascending: false, nullsFirst: false }).limit(15);
    const posts = mustOr(postsR, 'seo.posts', []) as PostRow[];
    if (posts.length) L.push('## Latest announcements and updates', ...posts.map((p) => `- [${p.kind}] ${p.title ?? ''}${p.published_at ? ` (${String(p.published_at).slice(0, 10)})` : ''}: ${clip(oneLine(markdownToText(p.body ?? '')), 300)}`), '');
  }
  return `${L.join('\n').trim()}\n`;
}

export const SEO_KEYS = ['home', 'staff', 'sitemap', 'llms', 'llms-full', 'partners', 'announcements', 'updates', 'album', 'albumpost', 'notfound', ...PAGE_SLUGS] as const;

/** Never throws. A page that can't be fully pre-rendered degrades step by step; 503 is only used when nothing at all can be served. */
export async function renderSeo(key: string, origin: string, id?: string): Promise<SeoResponse> {
  if (!(SEO_KEYS as readonly string[]).includes(key)) return { status: 404, type: 'text/plain; charset=utf-8', body: 'Not found', cache: 'no-store' };
  const isFile = key === 'sitemap' || key === 'llms' || key === 'llms-full';

  let site: Site | null = null;
  try { site = await loadSite(); } catch (e) { console.error(`[seo] ${key}: site data unavailable:`, e); }

  if (isFile) {
    if (key === 'sitemap') return { status: 200, type: 'application/xml; charset=utf-8', body: site ? sitemap(site) : fallbackSitemap(), cache: site ? CACHE : 'public, s-maxage=60' };
    try {
      if (!site) throw new Error('no site data');
      return { status: 200, type: 'text/plain; charset=utf-8', body: await llms(site, key === 'llms-full'), cache: CACHE };
    } catch (e) {
      console.error(`[seo] ${key} failed:`, e);
      return { status: 503, type: 'text/plain; charset=utf-8', body: 'MistEra SMP llms.txt is temporarily unavailable. Please try again in a minute.\n', cache: 'no-store', retryAfter: 60 };
    }
  }

  let shell: { html: string; via: string } | null = null;
  try { shell = await getShell(origin); } catch (e) { console.error(`[seo] ${key}: no app shell:`, e); }

  const html = shell?.html ?? BARE_SHELL;
  const via = shell?.via ?? 'bare';
  const degraded = !site; // database unreadable: serve the facts that never change instead of an empty shell
  const st: Site = site ?? fallbackSite();
  const cache = degraded ? 'no-store' : shell ? CACHE : 'public, s-maxage=30';
  const INDEX = 'index, follow, max-image-preview:large';
  const unavailable = (): SeoResponse => ({ status: 503, type: HTML, body: fillShell(html, null, homeBody(st), 'MistEra SMP – temporarily unavailable'), cache: 'no-store', via: `${via}-degraded`, retryAfter: 60 });

  try {
    if (key === 'notfound') return { status: 404, type: HTML, body: fillShell(html, null, notFoundBody(st), `Page not found | ${SITE_NAME}`), cache: 'public, s-maxage=60', via };

    if (key === 'home') {
      const meta: Meta = { title: HOME_TITLE, description: homeDescription(st.s), canonical: abs('/'), robots: INDEX, jsonLd: structuredData(st, true) };
      return { status: 200, type: HTML, body: fillShell(html, meta, homeBody(st)), cache, via: degraded ? `${via}-degraded` : via };
    }
    if (key === 'staff') {
      const meta: Meta = { title: 'Staff Team | MistEra SMP', description: staffDescription(st.staff), canonical: abs('/staff'), robots: INDEX, jsonLd: structuredData(st, false) };
      return { status: 200, type: HTML, body: fillShell(html, meta, staffBody(st)), cache, via: degraded ? `${via}-degraded` : via };
    }
    // Everything below needs live data. If the database is down a crawler gets 503 + Retry-After (it comes back later and keeps the page indexed).
    if (degraded) return unavailable();

    if (key === 'partners' || key === 'announcements' || key === 'updates' || key === 'album') {
      const m = LIST_META[key];
      const meta: Meta = { title: m.title, description: m.description, canonical: abs(`/${key}`), robots: INDEX };
      let body: string;
      if (key === 'partners') {
        const rows = mustOr(await db().from('partners').select('*').order('name', { ascending: true }).limit(200), 'seo.partners', [] as PartnerRow[]) as PartnerRow[];
        body = partnersBody(st, rows);
      } else if (key === 'album') {
        body = albumBody(st, await loadAlbum(60));
      } else {
        const rows = mustOr(await db().from('posts').select('*').eq('published', true).eq('kind', key === 'announcements' ? 'Announcement' : 'Update').order('published_at', { ascending: false, nullsFirst: false }).limit(30), 'seo.posts', [] as PostRow[]) as PostRow[];
        body = postsBody(st, key, rows);
      }
      return { status: 200, type: HTML, body: fillShell(html, meta, body), cache, via };
    }

    if (key === 'albumpost') {
      const a = id && isUuid(id) ? (await loadAlbum(1, id))[0] : undefined;
      if (!a) return { status: 404, type: HTML, body: fillShell(html, null, notFoundBody(st), `Post not found | ${SITE_NAME}`), cache: 'public, s-maxage=60', via };
      const caption = oneLine(a.caption ?? '');
      const title = clip(`${albumTitle(a)} | ${SITE_NAME}`, 60);
      const description = clip(caption || `${albumTitle(a)} in the ${SITE_NAME} Community Album, a Minecraft Bedrock survival server from Bangladesh.`, 160);
      // User-generated and thin, so it stays out of search results (noindex) - but it renders real text, and chat apps get a proper link preview.
      const meta: Meta = { title, description, canonical: abs(`/album/${a.id}`), robots: 'noindex, follow', ...(a.media_type === 'video' ? { video: httpUrl(a.image_url) } : { image: httpUrl(a.image_url) }) };
      return { status: 200, type: HTML, body: fillShell(html, meta, albumPostBody(st, a)), cache, via };
    }

    const slug = key as PageSlug;
    const page = st.pages.get(slug);
    // Not published (or empty): the app still shows its "not published yet" message, but it is a 404 and out of the index.
    if (!page) return { status: 404, type: HTML, body: fillShell(html, null, notFoundBody(st), `Page not found | ${SITE_NAME}`), cache: 'public, s-maxage=60', via };
    const title = clip(`${page.title?.trim() || PAGE_TITLES[slug]} | ${SITE_NAME}`, 60);
    const text = oneLine(markdownToText(page.content ?? ''));
    const description = text.length >= 60 ? clip(text, 160) : PAGE_DESCRIPTION[slug];
    const meta: Meta = { title, description, canonical: abs(`/${slug}`), robots: INDEX, jsonLd: slug === 'about' ? structuredData(st, false) : undefined };
    return { status: 200, type: HTML, body: fillShell(html, meta, pageBody(st, slug, page)), cache, via };
  } catch (e) {
    console.error(`[seo] ${key} render failed:`, e);
    return unavailable();
  }
}

/** Approved album posts (newest first) with the uploader's @name. With `id`, just that one post. */
async function loadAlbum(limit: number, id?: string): Promise<AlbumView[]> {
  let q = db().from('album_submissions').select('*').eq('status', 'Approved');
  q = id ? q.eq('id', id) : q.order('submitted_at', { ascending: false }).limit(limit);
  const rows = mustOr(await q, 'seo.album', [] as AlbumRow[]) as AlbumRow[];
  const ids = [...new Set(rows.map((a) => a.uploader).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (ids.length) for (const p of (mustOr(await db().from('profiles').select('user_id,username').in('user_id', ids), 'seo.albumNames', [] as { user_id: string; username: string | null }[]) as { user_id: string; username: string | null }[])) names.set(p.user_id, p.username ?? 'a member');
  return rows.map((a) => ({ ...a, uploaderName: (a.uploader && names.get(a.uploader) ? `@${names.get(a.uploader)}` : 'a former member') }));
}
