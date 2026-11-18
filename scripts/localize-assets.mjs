// One-off helper: copies the images that are still hot-linked from Zite's CDN (images.fillout.com)
// into /public/images and rewrites the references, so the site no longer depends on that host.
//
//   npm run assets:localize -- https://your-domain.vercel.app      (the domain is used for the og:image tag)
//   npm run assets:localize -- --dry-run                           (only lists what would change)
//
// Requires internet access. Safe to re-run: files already rewritten no longer match.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const siteUrl = (args.find((a) => /^https?:\/\//.test(a)) ?? '').replace(/\/+$/, '');
const FILES = ['index.html', 'src/lib/brand.ts', 'src/pages/Home.tsx'];
const URL_RE = /https:\/\/images\.fillout\.com\/[^\s'"<>)]+/g;
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

const cache = new Map();
async function localize(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
  const ext = EXT[type] ?? path.extname(new URL(url).pathname).slice(1) || 'img';
  const buf = Buffer.from(await res.arrayBuffer());
  const name = `${createHash('sha256').update(buf).digest('hex').slice(0, 12)}.${ext}`;
  await mkdir(path.join(root, 'public/images'), { recursive: true });
  await writeFile(path.join(root, 'public/images', name), buf);
  cache.set(url, `/images/${name}`);
  return cache.get(url);
}

for (const rel of FILES) {
  const file = path.join(root, rel);
  let text = await readFile(file, 'utf8');
  const urls = [...new Set(text.match(URL_RE) ?? [])];
  if (!urls.length) continue;
  for (const url of urls) {
    console.log(`${dry ? '[dry-run] ' : ''}${rel}: ${url}`);
    if (dry) continue;
    const local = await localize(url);
    // Social-media crawlers need an absolute og:image URL.
    const og = new RegExp(`(property="og:image"\\s+content=")${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
    text = og.test(text) && siteUrl ? text.replace(og, `$1${siteUrl}${local}"`) : text.split(url).join(local);
  }
  if (!dry) await writeFile(file, text);
}
console.log(dry ? '\nDry run only — nothing was written.' : '\nDone. Review `git diff`, then commit public/images and the changed files.');
