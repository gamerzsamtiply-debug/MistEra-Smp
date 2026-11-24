// GET /api/seo?p=<key>  (reached through the rewrites in vercel.json, never linked directly)
// Serves the pre-rendered public pages, sitemap.xml, llms.txt and llms-full.txt. Logic: server/seoPage.ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import { renderSeo } from '../server/seoPage.js';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end('Method not allowed'); return; }
  const q = new URL(req.url ?? '/', 'http://localhost').searchParams;
  const key = q.get('p') || 'home';
  const id = (q.get('id') ?? '').slice(0, 64) || undefined;
  const h = (n: string) => { const v = req.headers[n]; return (Array.isArray(v) ? v[0] : v)?.split(',')[0].trim(); };
  const host = h('x-forwarded-host') || h('host') || 'misterasmp.fun';
  const out = await renderSeo(key, `https://${host}`, id);
  res.statusCode = out.status;
  res.setHeader('Content-Type', out.type);
  res.setHeader('Cache-Control', out.cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (out.via) res.setHeader('X-Seo-Render', out.via);
  if (out.retryAfter) res.setHeader('Retry-After', String(out.retryAfter));
  res.end(method === 'HEAD' ? undefined : out.body);
}
