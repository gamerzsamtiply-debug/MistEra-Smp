import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { requireAdmin } from '../lib.js';
import type { PostRow } from '../types.js';

// Lists all announcements or updates, including drafts
export default authEndpoint(z.object({ kind: z.enum(['Announcement', 'Update']) }), async ({ input, user }) => {
  await requireAdmin(user);
  const r = await db().from('posts').select('*').eq('kind', input.kind).order('published_at', { ascending: false, nullsFirst: false }).limit(500);
  const rows = (must(r, 'posts.adminList') ?? []) as PostRow[];
  return { posts: rows.map((p) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.image_url ?? '', published: !!p.published, publishedAt: p.published_at ?? '' })) };
});
