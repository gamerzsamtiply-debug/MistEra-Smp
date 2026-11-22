import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { requireAdmin, PAGE_SLUGS, PAGE_TITLES } from '../lib.js';
import type { ContentPageRow } from '../types.js';

// Lists every editable page for the Admin > Pages tab
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const rows = (must(await db().from('content_pages').select('*').limit(10), 'content_pages.list') ?? []) as ContentPageRow[];
  return {
    pages: PAGE_SLUGS.map((slug) => {
      const p = rows.find((r) => r.slug === slug);
      return { slug, title: p?.title ?? PAGE_TITLES[slug], content: p?.content ?? '', published: !!p?.published, updatedAt: p?.updated_at ?? '' };
    }),
  };
});
