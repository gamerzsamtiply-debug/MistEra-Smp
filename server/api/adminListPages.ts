import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { requireAdmin } from '../lib.js';
import type { ContentPageRow } from '../types.js';

// Lists Information and Terms pages for editing
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const rows = (must(await db().from('content_pages').select('*').limit(10), 'content_pages.list') ?? []) as ContentPageRow[];
  return {
    pages: (['information', 'terms'] as const).map((slug) => {
      const p = rows.find((r) => r.slug === slug);
      return { slug, title: p?.title ?? (slug === 'terms' ? 'Terms of Service' : 'Server Information'), content: p?.content ?? '', published: !!p?.published, updatedAt: p?.updated_at ?? '' };
    }),
  };
});
