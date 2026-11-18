import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import type { ContentPageRow } from '../types.js';

// Returns a published content page (information or terms)
export default publicEndpoint(z.object({ slug: z.enum(['information', 'terms']) }), async ({ input }) => {
  const r = await db().from('content_pages').select('*').eq('slug', input.slug).eq('published', true).maybeSingle();
  const p = must(r, 'content_pages.get') as ContentPageRow | null;
  if (!p) throw fail('NOT_FOUND', 'This page has not been published yet.');
  return { title: p.title ?? '', content: p.content ?? '', updatedAt: p.updated_at ?? '' };
});
