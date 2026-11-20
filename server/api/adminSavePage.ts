import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { logActivity, requireAdmin, PAGE_SLUGS, PAGE_TITLES } from '../lib.js';

// Saves and publishes an editable page (Information, About, Rules, Terms, Privacy)
export default authEndpoint(z.object({ slug: z.enum(PAGE_SLUGS), title: z.string().max(300), content: z.string().max(200000), published: z.boolean() }), async ({ input, user }) => {
  await requireAdmin(user);
  if (!input.title.trim()) throw fail('BAD_REQUEST', 'Page title is required.');
  if (input.published && !input.content.trim()) throw fail('BAD_REQUEST', "You can't publish an empty page.");
  must(await db().from('content_pages').upsert({ slug: input.slug, title: input.title.trim(), content: input.content, published: input.published }, { onConflict: 'slug' }), 'content_pages.upsert');
  await logActivity(user, `Edited ${PAGE_TITLES[input.slug]} page`, 'Website Content', input.published ? 'Published' : 'Unpublished');
  return { ok: true };
});
