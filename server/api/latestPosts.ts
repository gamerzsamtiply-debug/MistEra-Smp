import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import type { PostRow } from '../types.js';

// Newest published announcements AND updates in one list: powers the notification bell.
export default publicEndpoint(z.object({}), async () => {
  const r = await db().from('posts').select('*').eq('published', true).order('published_at', { ascending: false, nullsFirst: false }).limit(15);
  const rows = mustOr(r, 'posts.latest', [] as PostRow[]) as PostRow[];
  return { posts: rows.map((p) => ({ id: p.id, kind: p.kind, title: p.title ?? '', body: (p.body ?? '').slice(0, 200), imageUrl: p.image_url ?? '', publishedAt: p.published_at ?? '' })) };
});
