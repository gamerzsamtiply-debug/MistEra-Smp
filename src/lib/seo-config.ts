// Single source of truth for everything SEO: titles, descriptions, canonical URLs, social tags, JSON-LD and the
// sitemap. It is used in three places so they can never drift apart:
//   1. seo/vite-plugin-seo.ts  – writes the tags into the static HTML at build time (what crawlers and social
//                                 scrapers read before any JavaScript runs) and generates sitemap.xml
//   2. src/lib/seo-dom.ts      – keeps the tags correct after client-side navigation
//   3. tests/seo.test.mjs      – guards length limits, uniqueness and sitemap coverage
// Keep this file free of browser/React imports: it is also loaded by Node (vite.config.ts and the tests).
import { LOGO_FULL, LOGO_MARK } from './brand.ts';

export const SITE_URL = 'https://misterasmp.fun';
export const SITE_NAME = 'MistEra SMP';
export const LOCALE = 'en_US';
export const THEME_COLOR = '#080f19';

/** Absolute URL for a path or an already-absolute URL (social scrapers and JSON-LD need absolute URLs). */
export function abs(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return SITE_URL + (urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`);
}

// Social preview image. The logo is what the site used before. For the best result in Discord/X/Facebook
// previews, drop a 1200x630 branded image at public/og-image.png and set OG_IMAGE to '/og-image.png'.
export const OG_IMAGE = abs(LOGO_FULL);
export const OG_IMAGE_ALT = 'MistEra SMP logo';
export const LOGO_SQUARE = abs(LOGO_MARK);

export interface SeoRoute {
  /** Canonical path. '/' is the homepage. */
  path: string;
  /** <title>. Keep ≤ 60 characters so it is not truncated in results. */
  title: string;
  /** Meta description. Keep ≤ 160 characters. */
  description: string;
  /** Plain H1 used in the <noscript> fallback (matches the visible page heading). */
  h1: string;
}

export const HOME_DESCRIPTION =
  'MistEra SMP is a private, whitelisted Minecraft Bedrock survival server based in Bangladesh and online 24/7. Join our Discord to get approved and play.';

/** Every public, indexable page. Order = sitemap order. */
export const ROUTES: SeoRoute[] = [
  {
    path: '/',
    title: 'MistEra SMP – Minecraft Bedrock SMP Server in Bangladesh',
    description: HOME_DESCRIPTION,
    h1: "MistEra SMP — Bangladesh's Bedrock SMP. Online 24/7.",
  },
  {
    path: '/information',
    title: 'Server Information | MistEra SMP',
    description:
      'Everything to know about the MistEra Minecraft server, a private whitelisted Bedrock SMP in Bangladesh, including how to get approved to join.',
    h1: 'Information',
  },
  {
    path: '/staff',
    title: 'Staff Team | MistEra SMP',
    description:
      'Meet the staff who run MistEra SMP, the Bangladesh-based Minecraft Bedrock survival server: owners, admins, moderators, builders and helpers.',
    h1: 'Staff',
  },
  {
    path: '/partners',
    title: 'Partners | MistEra SMP',
    description: 'Communities, hosts and creators that MistEra SMP, a Minecraft Bedrock SMP from Bangladesh, proudly works with.',
    h1: 'Partners',
  },
  {
    path: '/announcements',
    title: 'Announcements and News | MistEra SMP',
    description: 'Official news, events and announcements from the MistEra SMP Minecraft Bedrock server team.',
    h1: 'Announcements',
  },
  {
    path: '/updates',
    title: 'Server Updates and Changelog | MistEra SMP',
    description: 'Patch notes, new features and server changes for the MistEra SMP Bedrock survival server.',
    h1: 'Updates',
  },
  {
    path: '/album',
    title: 'Community Album | MistEra SMP',
    description: 'Screenshots and builds shared by MistEra SMP players from our Minecraft Bedrock survival world.',
    h1: 'Community Album',
  },
  {
    path: '/terms',
    title: 'Terms of Service | MistEra SMP',
    description: 'The terms of service for the MistEra SMP Minecraft Bedrock server and its community.',
    h1: 'Terms of Service',
  },
];

/** Pages that exist but must stay out of search results (accounts, admin, errors, user-generated profiles). */
const PRIVATE_TITLES: Record<string, string> = {
  '/login': 'Log in | MistEra SMP',
  '/reset-password': 'Reset password | MistEra SMP',
  '/profile': 'Your profile | MistEra SMP',
  '/suggestions': 'Suggestions | MistEra SMP',
  '/admin': 'Admin panel | MistEra SMP',
  '/401': 'Authentication required | MistEra SMP',
  '/403': 'Access forbidden | MistEra SMP',
  '/500': 'Something went wrong | MistEra SMP',
  '/503': 'Service unavailable | MistEra SMP',
};
export const NOT_FOUND_TITLE = 'Page not found | MistEra SMP';
export const PROFILE_TITLE = 'Player profile | MistEra SMP';
/** Title used by the generic app shell (served for every URL that has no pre-rendered page). */
export const SHELL_TITLE = SITE_NAME;

export interface ResolvedSeo {
  title: string;
  /** undefined → no description / canonical tags are emitted (non-indexable pages). */
  description?: string;
  canonical?: string;
  robots: string;
  /** Organization + WebSite structured data is attached to the homepage only. */
  jsonLd: boolean;
  route?: SeoRoute;
}

/** Lower-cases and strips the trailing slash so /Staff/ and /staff resolve (and canonicalise) to the same page. */
export function normalizePath(pathname: string): string {
  const p = (pathname.split(/[?#]/)[0] || '/').toLowerCase().replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function canonicalFor(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function resolveSeo(pathname: string): ResolvedSeo {
  const path = normalizePath(pathname);
  const route = ROUTES.find((r) => r.path === path);
  if (route) {
    return { title: route.title, description: route.description, canonical: canonicalFor(route.path), robots: 'index, follow, max-image-preview:large', jsonLd: route.path === '/', route };
  }
  const title = PRIVATE_TITLES[path] ?? (path.startsWith('/u/') ? PROFILE_TITLE : NOT_FOUND_TITLE);
  return { title, robots: 'noindex, follow', jsonLd: false };
}

/** The shell is what Vercel serves for any path without a pre-rendered file (unknown URLs, /login, /u/:id …). */
export const SHELL_SEO: ResolvedSeo = { title: SHELL_TITLE, robots: 'noindex, follow', jsonLd: false };

// ───────────────────────── tags ─────────────────────────

export interface Tag {
  tag: 'title' | 'meta' | 'link' | 'script';
  /** Identity used to find/replace the tag at runtime, e.g. "name:description". */
  key: string;
  attrs: Record<string, string>;
  /** Text content for <title> and the JSON-LD <script>. */
  text?: string;
}

export function organizationJsonLd(sameAs: string[] = []) {
  const org: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: 'MistEra',
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: LOGO_SQUARE, caption: OG_IMAGE_ALT },
    image: OG_IMAGE,
    description: HOME_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Bangladesh' },
  };
  if (sameAs.length) org.sameAs = sameAs;
  return org;
}

export function structuredData(sameAs: string[] = []) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationJsonLd(sameAs),
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: HOME_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

export function buildTags(seo: ResolvedSeo, opts: { sameAs?: string[] } = {}): Tag[] {
  const t: Tag[] = [];
  const meta = (kind: 'name' | 'property', name: string, content: string): Tag => ({ tag: 'meta', key: `${kind}:${name}`, attrs: { [kind]: name, content } });

  t.push({ tag: 'title', key: 'title', attrs: {}, text: seo.title });
  if (seo.description) t.push(meta('name', 'description', seo.description));
  t.push(meta('name', 'robots', seo.robots));
  if (seo.canonical) t.push({ tag: 'link', key: 'rel:canonical', attrs: { rel: 'canonical', href: seo.canonical } });

  t.push(meta('property', 'og:type', 'website'));
  t.push(meta('property', 'og:site_name', SITE_NAME));
  t.push(meta('property', 'og:locale', LOCALE));
  t.push(meta('property', 'og:title', seo.title));
  if (seo.description) t.push(meta('property', 'og:description', seo.description));
  if (seo.canonical) t.push(meta('property', 'og:url', seo.canonical));
  t.push(meta('property', 'og:image', OG_IMAGE));
  t.push(meta('property', 'og:image:alt', OG_IMAGE_ALT));

  t.push(meta('name', 'twitter:card', 'summary_large_image'));
  t.push(meta('name', 'twitter:title', seo.title));
  if (seo.description) t.push(meta('name', 'twitter:description', seo.description));
  t.push(meta('name', 'twitter:image', OG_IMAGE));
  t.push(meta('name', 'twitter:image:alt', OG_IMAGE_ALT));

  if (seo.jsonLd) {
    t.push({ tag: 'script', key: 'jsonld', attrs: { type: 'application/ld+json' }, text: JSON.stringify(structuredData(opts.sameAs)) });
  }
  return t;
}

// ───────────────────────── sitemap ─────────────────────────

export function sitemapXml(): string {
  const urls = ROUTES.map((r) => `  <url>\n    <loc>${canonicalFor(r.path)}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
