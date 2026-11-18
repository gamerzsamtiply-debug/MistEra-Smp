import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import type { PostRow } from '../types.js';

// Lists published announcements or updates
export default publicEndpoint(z.object({ kind: z.enum(['Announcement', 'Update']) }), async ({ input }) => {
  const r = await db().from('posts').select('*').eq('published', true).eq('kind', input.kind).order('published_at', { ascending: false, nullsFirst: false }).limit(200);
  const rows = (must(r, 'posts.list') ?? []) as PostRow[];
  return { posts: rows.map((p) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.image_url ?? '', publishedAt: p.published_at ?? '' })) };
});
